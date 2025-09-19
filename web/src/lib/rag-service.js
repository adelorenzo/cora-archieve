/**
 * RAG Service - Document processing and vector search
 * Integrates PouchDB for local storage and txtai for embeddings
 */

import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';

// Enable PouchDB plugins
PouchDB.plugin(PouchDBFind);

// Configuration
const TXTAI_URL = window.APP_CONFIG?.TXTAI_URL || '/api/txtai';
const DB_PREFIX = 'cora_rag_';

class RAGService {
  constructor() {
    this.documentsDB = new PouchDB(`${DB_PREFIX}documents`);
    this.embeddingsDB = new PouchDB(`${DB_PREFIX}embeddings`);
    this.initialized = false;
    this.txtaiAvailable = false;
  }

  /**
   * Initialize the RAG service
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Create indexes for efficient querying
      await this.documentsDB.createIndex({
        index: { fields: ['created_at'] }
      });

      await this.embeddingsDB.createIndex({
        index: { fields: ['doc_id', 'chunk_index'] }
      });

      // Check if txtai service is available
      await this.checkTxtaiStatus();

      this.initialized = true;
      console.log('RAG Service initialized');
    } catch (error) {
      console.error('Failed to initialize RAG Service:', error);
      throw error;
    }
  }

  /**
   * Check if txtai service is available
   */
  async checkTxtaiStatus() {
    try {
      const response = await fetch(`${TXTAI_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        this.txtaiAvailable = true;
        console.log('txtai service is available');
      } else {
        this.txtaiAvailable = false;
        console.warn('txtai service returned non-OK status');
      }
    } catch (error) {
      this.txtaiAvailable = false;
      console.warn('txtai service is not available:', error.message);
    }

    return this.txtaiAvailable;
  }

  /**
   * Process and store a text document
   */
  async processDocument(content, title, metadata = {}) {
    if (!this.initialized) await this.initialize();

    try {
      // Generate document ID
      const docId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store document in PouchDB
      const doc = {
        _id: docId,
        title,
        content,
        metadata,
        created_at: new Date().toISOString(),
        processed: false
      };

      await this.documentsDB.put(doc);

      // Process with txtai if available
      if (this.txtaiAvailable) {
        const response = await fetch(`${TXTAI_URL}/process/text`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content,
            title,
            metadata: { ...metadata, local_id: docId }
          })
        });

        if (response.ok) {
          const result = await response.json();

          // Update document with processing info
          doc.processed = true;
          doc.txtai_id = result.doc_id;
          doc.chunks = result.chunks;
          await this.documentsDB.put(doc);

          return { success: true, docId, chunks: result.chunks };
        }
      }

      // Fallback: Basic chunking if txtai not available
      const chunks = this.basicChunking(content);

      // Store chunks locally
      for (let i = 0; i < chunks.length; i++) {
        await this.embeddingsDB.put({
          _id: `${docId}_chunk_${i}`,
          doc_id: docId,
          chunk_index: i,
          text: chunks[i],
          created_at: new Date().toISOString()
        });
      }

      doc.processed = true;
      doc.chunks = chunks.length;
      await this.documentsDB.put(doc);

      return { success: true, docId, chunks: chunks.length };
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }

  /**
   * Process uploaded file
   */
  async processFile(file) {
    if (!this.initialized) await this.initialize();

    try {
      // Use txtai for file processing if available
      if (this.txtaiAvailable) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${TXTAI_URL}/process/file`, {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const result = await response.json();

          // Store document reference locally
          const doc = {
            _id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: file.name,
            filename: file.name,
            content_type: file.type,
            size: file.size,
            txtai_id: result.doc_id,
            chunks: result.chunks,
            processed: true,
            created_at: new Date().toISOString()
          };

          await this.documentsDB.put(doc);

          return { success: true, docId: doc._id, chunks: result.chunks };
        }
      }

      // Fallback: Read text files locally
      if (file.type === 'text/plain' || file.type === 'text/markdown') {
        const content = await file.text();
        return await this.processDocument(content, file.name, {
          filename: file.name,
          content_type: file.type,
          size: file.size
        });
      }

      throw new Error('File processing requires txtai service for this file type');
    } catch (error) {
      console.error('Error processing file:', error);
      throw error;
    }
  }

  /**
   * Search for relevant documents
   */
  async search(query, limit = 5, threshold = 0.5) {
    if (!this.initialized) await this.initialize();

    try {
      // Use txtai for semantic search if available
      if (this.txtaiAvailable) {
        const response = await fetch(`${TXTAI_URL}/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query,
            limit,
            threshold
          })
        });

        if (response.ok) {
          const result = await response.json();
          return result.results || [];
        }
      }

      // Fallback: Basic keyword search in local chunks
      const results = await this.embeddingsDB.find({
        selector: {
          text: { $regex: new RegExp(query, 'i') }
        },
        limit
      });

      return results.docs.map(doc => ({
        text: doc.text,
        score: 0.5, // Default score for keyword matches
        doc_id: doc.doc_id,
        chunk_index: doc.chunk_index
      }));
    } catch (error) {
      console.error('Error searching documents:', error);
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

      return result.rows.map(row => row.doc);
    } catch (error) {
      console.error('Error fetching documents:', error);
      return [];
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(docId) {
    if (!this.initialized) await this.initialize();

    try {
      // Get document
      const doc = await this.documentsDB.get(docId);

      // Delete from txtai if processed there
      if (this.txtaiAvailable && doc.txtai_id) {
        await fetch(`${TXTAI_URL}/documents/${doc.txtai_id}`, {
          method: 'DELETE'
        });
      }

      // Delete local chunks
      const chunks = await this.embeddingsDB.find({
        selector: { doc_id: docId }
      });

      for (const chunk of chunks.docs) {
        await this.embeddingsDB.remove(chunk);
      }

      // Delete document
      await this.documentsDB.remove(doc);

      return { success: true };
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Get statistics
   */
  async getStats() {
    if (!this.initialized) await this.initialize();

    try {
      const docsInfo = await this.documentsDB.info();
      const chunksInfo = await this.embeddingsDB.info();

      let txtaiStats = null;
      if (this.txtaiAvailable) {
        try {
          const response = await fetch(`${TXTAI_URL}/stats`);
          if (response.ok) {
            txtaiStats = await response.json();
          }
        } catch (error) {
          console.warn('Could not fetch txtai stats:', error);
        }
      }

      return {
        documents: docsInfo.doc_count,
        chunks: chunksInfo.doc_count,
        storage_size: docsInfo.data_size + chunksInfo.data_size,
        txtai_available: this.txtaiAvailable,
        txtai_stats: txtaiStats
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        documents: 0,
        chunks: 0,
        storage_size: 0,
        txtai_available: false
      };
    }
  }

  /**
   * Basic text chunking (fallback when txtai not available)
   */
  basicChunking(text, chunkSize = 500, overlap = 50) {
    const chunks = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > chunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          // Add overlap
          const words = currentChunk.split(' ');
          const overlapWords = words.slice(-Math.floor(overlap / 5));
          currentChunk = overlapWords.join(' ') + ' ' + sentence;
        } else {
          // Sentence is longer than chunk size
          chunks.push(sentence.trim());
          currentChunk = '';
        }
      } else {
        currentChunk += ' ' + sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Clear all data
   */
  async clearAll() {
    if (!this.initialized) await this.initialize();

    try {
      await this.documentsDB.destroy();
      await this.embeddingsDB.destroy();

      this.documentsDB = new PouchDB(`${DB_PREFIX}documents`);
      this.embeddingsDB = new PouchDB(`${DB_PREFIX}embeddings`);
      this.initialized = false;

      await this.initialize();

      return { success: true };
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }

  /**
   * Export all data
   */
  async exportData() {
    if (!this.initialized) await this.initialize();

    try {
      const documents = await this.documentsDB.allDocs({
        include_docs: true,
        attachments: true
      });

      const embeddings = await this.embeddingsDB.allDocs({
        include_docs: true
      });

      return {
        version: '1.0.0',
        exported_at: new Date().toISOString(),
        documents: documents.rows.map(row => row.doc),
        embeddings: embeddings.rows.map(row => row.doc)
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  /**
   * Import data
   */
  async importData(data) {
    if (!this.initialized) await this.initialize();

    try {
      // Clear existing data first
      await this.clearAll();

      // Import documents
      if (data.documents && data.documents.length > 0) {
        await this.documentsDB.bulkDocs(data.documents);
      }

      // Import embeddings
      if (data.embeddings && data.embeddings.length > 0) {
        await this.embeddingsDB.bulkDocs(data.embeddings);
      }

      return { success: true };
    } catch (error) {
      console.error('Error importing data:', error);
      throw error;
    }
  }
}

// Create singleton instance
const ragService = new RAGService();

export default ragService;