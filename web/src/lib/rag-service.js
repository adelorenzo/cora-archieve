/**
 * RAG Service - Fully Local Document Processing and Vector Search
 * Uses transformers.js for embeddings (runs in browser via WebGPU/WASM)
 * Uses PouchDB/IndexedDB for document and vector storage
 *
 * NO EXTERNAL BACKEND REQUIRED - Everything runs client-side
 */

import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';
import embeddingService from './embedding-service';
import { parseFile, isSupported, getSupportedExtensions } from './file-parser';

// Enable PouchDB plugins
PouchDB.plugin(PouchDBFind);

const DB_PREFIX = 'cora_rag_';

// Status constants
export const RAG_STATUS = {
  INITIALIZING: 'initializing',
  LOADING_MODEL: 'loading_model',
  READY: 'ready',
  PROCESSING: 'processing',
  ERROR: 'error'
};

class RAGService {
  constructor() {
    this.documentsDB = new PouchDB(`${DB_PREFIX}documents`);
    this.chunksDB = new PouchDB(`${DB_PREFIX}chunks`);
    this.initialized = false;
    this.status = RAG_STATUS.INITIALIZING;
    this.statusListeners = [];
    this.modelProgress = 0;
  }

  /**
   * Add a status change listener
   */
  addStatusListener(callback) {
    this.statusListeners.push(callback);
    // Immediately call with current status
    callback(this.status, { modelProgress: this.modelProgress });
  }

  /**
   * Remove a status change listener
   */
  removeStatusListener(callback) {
    this.statusListeners = this.statusListeners.filter(cb => cb !== callback);
  }

  /**
   * Notify all listeners of status change
   */
  notifyStatusChange(newStatus, extra = {}) {
    this.status = newStatus;
    this.statusListeners.forEach(cb => cb(newStatus, { modelProgress: this.modelProgress, ...extra }));
  }

  /**
   * Initialize the RAG service
   * Loads embedding model and sets up databases
   */
  async initialize(progressCallback = null) {
    if (this.initialized) return;

    try {
      this.notifyStatusChange(RAG_STATUS.INITIALIZING);

      // Create database indexes
      await this.documentsDB.createIndex({
        index: { fields: ['created_at'] }
      });

      await this.chunksDB.createIndex({
        index: { fields: ['doc_id', 'chunk_index'] }
      });

      // Initialize embedding model
      this.notifyStatusChange(RAG_STATUS.LOADING_MODEL);

      await embeddingService.initialize((progress) => {
        this.modelProgress = progress;
        this.notifyStatusChange(RAG_STATUS.LOADING_MODEL);
        if (progressCallback) progressCallback(progress);
      });

      this.initialized = true;
      this.notifyStatusChange(RAG_STATUS.READY);
      console.log('[RAGService] Initialized with local embeddings');
    } catch (error) {
      console.error('[RAGService] Initialization failed:', error);
      this.notifyStatusChange(RAG_STATUS.ERROR, { error: error.message });
      throw error;
    }
  }

  /**
   * Get current status info
   */
  getStatusInfo() {
    return {
      status: this.status,
      modelProgress: this.modelProgress,
      modelInfo: embeddingService.getModelInfo(),
      isReady: this.initialized && embeddingService.isReady()
    };
  }

  /**
   * Process and store a text document with embeddings
   */
  async processDocument(content, title, metadata = {}) {
    if (!this.initialized) await this.initialize();

    this.notifyStatusChange(RAG_STATUS.PROCESSING);

    try {
      // Generate document ID
      const docId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Chunk the document
      const chunks = this.chunkText(content);
      console.log(`[RAGService] Processing "${title}" into ${chunks.length} chunks`);

      // Generate embeddings for all chunks
      const embeddings = await embeddingService.embedBatch(chunks, (progress) => {
        this.notifyStatusChange(RAG_STATUS.PROCESSING, { embeddingProgress: progress });
      });

      // Store document metadata
      const doc = {
        _id: docId,
        title,
        content,
        metadata,
        chunk_count: chunks.length,
        created_at: new Date().toISOString()
      };
      await this.documentsDB.put(doc);

      // Store chunks with embeddings
      for (let i = 0; i < chunks.length; i++) {
        await this.chunksDB.put({
          _id: `${docId}_chunk_${i}`,
          doc_id: docId,
          doc_title: title,
          chunk_index: i,
          text: chunks[i],
          // Store embedding as array (PouchDB handles JSON serialization)
          embedding: Array.from(embeddings[i]),
          created_at: new Date().toISOString()
        });
      }

      this.notifyStatusChange(RAG_STATUS.READY);
      return { success: true, docId, chunks: chunks.length };
    } catch (error) {
      console.error('[RAGService] Error processing document:', error);
      this.notifyStatusChange(RAG_STATUS.ERROR, { error: error.message });
      throw error;
    }
  }

  /**
   * Process uploaded file
   * Supports PDF, DOCX, XLSX, CSV, TXT, MD, HTML, JSON
   */
  async processFile(file, progressCallback = null) {
    if (!this.initialized) await this.initialize();

    try {
      // Check if file type is supported
      if (!isSupported(file)) {
        const supported = getSupportedExtensions().join(', ');
        throw new Error(
          `Unsupported file type. Supported formats: ${supported}`
        );
      }

      // Parse file using client-side parser
      console.log(`[RAGService] Parsing file: ${file.name}`);
      this.notifyStatusChange(RAG_STATUS.PROCESSING, { stage: 'parsing' });

      const parseResult = await parseFile(file, (progress) => {
        if (progressCallback) progressCallback(progress * 0.3); // 0-30% for parsing
      });

      if (!parseResult.text || !parseResult.text.trim()) {
        throw new Error('File appears to be empty or could not be read');
      }

      console.log(`[RAGService] Extracted ${parseResult.text.length} characters from ${file.name}`);

      // Process the extracted text
      return await this.processDocument(parseResult.text, file.name, {
        filename: file.name,
        content_type: file.type,
        size: file.size,
        ...parseResult.metadata
      });
    } catch (error) {
      console.error('[RAGService] Error processing file:', error);
      this.notifyStatusChange(RAG_STATUS.ERROR, { error: error.message });
      throw error;
    }
  }

  /**
   * Get list of supported file extensions
   */
  getSupportedExtensions() {
    return getSupportedExtensions();
  }

  /**
   * Search for relevant document chunks using semantic similarity
   */
  async search(query, limit = 5, threshold = 0.3) {
    if (!this.initialized) await this.initialize();

    try {
      // Generate query embedding
      const queryEmbedding = await embeddingService.embed(query);

      // Get all chunks from database
      const allChunks = await this.chunksDB.allDocs({
        include_docs: true
      });

      if (allChunks.rows.length === 0) {
        return [];
      }

      // Prepare candidates with their embeddings
      const candidates = allChunks.rows
        .filter(row => row.doc && row.doc.embedding)
        .map(row => ({
          id: row.doc._id,
          doc_id: row.doc.doc_id,
          doc_title: row.doc.doc_title,
          text: row.doc.text,
          chunk_index: row.doc.chunk_index,
          vector: new Float32Array(row.doc.embedding)
        }));

      // Find similar chunks
      const results = embeddingService.findSimilar(queryEmbedding, candidates, limit, threshold);

      // Format results
      return results.map(r => ({
        text: r.text,
        score: r.score,
        doc_id: r.doc_id,
        title: r.doc_title,
        chunk_index: r.chunk_index
      }));
    } catch (error) {
      console.error('[RAGService] Search error:', error);
      return [];
    }
  }

  /**
   * Get all documents
   */
  async getDocuments() {
    if (!this.initialized) await this.initialize();

    try {
      const result = await this.documentsDB.allDocs({
        include_docs: true,
        descending: true
      });

      return result.rows
        .filter(row => row.doc && !row.doc._id.startsWith('_'))
        .map(row => row.doc);
    } catch (error) {
      console.error('[RAGService] Error fetching documents:', error);
      return [];
    }
  }

  /**
   * Delete a document and its chunks
   */
  async deleteDocument(docId) {
    if (!this.initialized) await this.initialize();

    try {
      // Get document
      const doc = await this.documentsDB.get(docId);

      // Delete all chunks for this document
      const chunks = await this.chunksDB.find({
        selector: { doc_id: docId }
      });

      for (const chunk of chunks.docs) {
        await this.chunksDB.remove(chunk);
      }

      // Delete document
      await this.documentsDB.remove(doc);

      return { success: true };
    } catch (error) {
      console.error('[RAGService] Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Get statistics
   */
  async getStats() {
    try {
      const docsInfo = await this.documentsDB.info();
      const chunksInfo = await this.chunksDB.info();

      return {
        documents: docsInfo.doc_count,
        chunks: chunksInfo.doc_count,
        storage_size: docsInfo.data_size + chunksInfo.data_size,
        model: embeddingService.getModelInfo(),
        status: this.status
      };
    } catch (error) {
      console.error('[RAGService] Error getting stats:', error);
      return {
        documents: 0,
        chunks: 0,
        storage_size: 0,
        model: null,
        status: 'error'
      };
    }
  }

  /**
   * Chunk text into smaller segments for embedding
   */
  chunkText(text, chunkSize = 500, overlap = 50) {
    const chunks = [];

    // Split by sentences first
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();

      if ((currentChunk + ' ' + trimmedSentence).length > chunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());

          // Create overlap from end of current chunk
          const words = currentChunk.split(/\s+/);
          const overlapWordCount = Math.floor(overlap / 5);
          const overlapWords = words.slice(-overlapWordCount);
          currentChunk = overlapWords.join(' ') + ' ' + trimmedSentence;
        } else {
          // Single sentence longer than chunk size - split it
          if (trimmedSentence.length > chunkSize) {
            const words = trimmedSentence.split(/\s+/);
            let tempChunk = '';
            for (const word of words) {
              if ((tempChunk + ' ' + word).length > chunkSize) {
                chunks.push(tempChunk.trim());
                tempChunk = word;
              } else {
                tempChunk = tempChunk ? tempChunk + ' ' + word : word;
              }
            }
            currentChunk = tempChunk;
          } else {
            chunks.push(trimmedSentence);
            currentChunk = '';
          }
        }
      } else {
        currentChunk = currentChunk ? currentChunk + ' ' + trimmedSentence : trimmedSentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(c => c.length > 0);
  }

  /**
   * Clear all RAG data
   */
  async clearAll() {
    try {
      await this.documentsDB.destroy();
      await this.chunksDB.destroy();

      this.documentsDB = new PouchDB(`${DB_PREFIX}documents`);
      this.chunksDB = new PouchDB(`${DB_PREFIX}chunks`);
      this.initialized = false;

      await this.initialize();

      return { success: true };
    } catch (error) {
      console.error('[RAGService] Error clearing data:', error);
      throw error;
    }
  }

  /**
   * Export all RAG data
   */
  async exportData() {
    try {
      const documents = await this.documentsDB.allDocs({
        include_docs: true
      });

      const chunks = await this.chunksDB.allDocs({
        include_docs: true
      });

      return {
        version: '2.0.0',
        type: 'local-embeddings',
        exported_at: new Date().toISOString(),
        documents: documents.rows.filter(r => r.doc).map(r => r.doc),
        chunks: chunks.rows.filter(r => r.doc).map(r => r.doc)
      };
    } catch (error) {
      console.error('[RAGService] Error exporting data:', error);
      throw error;
    }
  }

  /**
   * Import RAG data
   */
  async importData(data) {
    try {
      // Clear existing data
      await this.clearAll();

      // Import documents
      if (data.documents && data.documents.length > 0) {
        for (const doc of data.documents) {
          delete doc._rev; // Remove revision for clean import
          await this.documentsDB.put(doc);
        }
      }

      // Import chunks
      if (data.chunks && data.chunks.length > 0) {
        for (const chunk of data.chunks) {
          delete chunk._rev;
          await this.chunksDB.put(chunk);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('[RAGService] Error importing data:', error);
      throw error;
    }
  }
}

// Create singleton instance
const ragService = new RAGService();

export default ragService;
