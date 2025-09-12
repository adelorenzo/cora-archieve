/**
 * RAG service integrating embedding service with database
 * Provides document indexing and semantic search capabilities
 */

import embeddingService from './embedding-service.js';
import dbService from '../database/db-service.js';

/**
 * RAG service for document indexing and retrieval
 */
class RAGService {
  constructor() {
    this.initialized = false;
    this.indexingQueue = [];
    this.isProcessing = false;
  }

  /**
   * Initialize the RAG service
   * @param {function} progressCallback - Progress callback for model loading
   * @returns {Promise<void>}
   */
  async initialize(progressCallback = null) {
    if (this.initialized) return;

    try {
      // Initialize database first
      await dbService.initialize();
      
      // Initialize embedding model
      await embeddingService.initialize(progressCallback);
      
      this.initialized = true;
      console.log('RAG service initialized successfully');
    } catch (error) {
      console.error('RAG service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Index a document for semantic search
   * @param {Object} document - Document to index
   * @param {Object} options - Indexing options
   * @returns {Promise<void>}
   */
  async indexDocument(document, options = {}) {
    if (!this.initialized) {
      throw new Error('RAG service not initialized');
    }

    try {
      // Update document status
      await dbService.updateDocument(document._id, {
        status: 'processing',
        indexed: false
      });

      // Chunk the document content
      const chunks = embeddingService.chunkText(document.content, {
        chunkSize: options.chunkSize || 1000,
        overlap: options.overlap || 100
      });

      console.log(`Processing ${chunks.length} chunks for document: ${document.title}`);

      // Generate embeddings for chunks
      const texts = chunks.map(chunk => chunk.text);
      const embeddings = await embeddingService.generateEmbeddings(texts);

      // Store embeddings in database
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = embeddings[i];

        await dbService.createEmbedding({
          documentId: document._id,
          chunkIndex: chunk.index,
          text: chunk.text,
          vector: embedding,
          metadata: {
            startPos: chunk.startPos,
            endPos: chunk.endPos,
            tokenCount: chunk.tokenCount
          },
          model: 'all-MiniLM-L6-v2'
        });
      }

      // Update document as indexed
      await dbService.updateDocument(document._id, {
        status: 'completed',
        indexed: true,
        chunks: texts
      });

      console.log(`Successfully indexed document: ${document.title}`);

    } catch (error) {
      console.error(`Failed to index document ${document.title}:`, error);
      
      // Update document with error status
      try {
        await dbService.updateDocument(document._id, {
          status: 'error',
          indexed: false
        });
      } catch (updateError) {
        console.error('Failed to update document status:', updateError);
      }
      
      throw error;
    }
  }

  /**
   * Perform semantic search across indexed documents
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Search results with context
   */
  async search(query, options = {}) {
    if (!this.initialized) {
      throw new Error('RAG service not initialized');
    }

    try {
      // Generate embedding for query
      const queryEmbedding = await embeddingService.generateEmbeddings(query);

      // Search for similar embeddings
      const results = await dbService.vectorSearch(queryEmbedding, {
        limit: options.limit || 10,
        threshold: options.threshold || 0.7
      });

      // Enhance results with document context
      const enhancedResults = await Promise.all(
        results.map(async (result) => {
          try {
            const document = await dbService.getDocument(result.documentId);
            return {
              ...result,
              document: {
                id: document._id,
                title: document.title,
                contentType: document.contentType,
                metadata: document.metadata
              },
              context: this._extractContext(document.content, result.metadata, options.contextSize)
            };
          } catch (error) {
            console.warn(`Failed to get document ${result.documentId}:`, error);
            return result;
          }
        })
      );

      return enhancedResults.filter(result => result.document);

    } catch (error) {
      console.error('Semantic search failed:', error);
      throw error;
    }
  }

  /**
   * Get search context for RAG generation
   * @param {string} query - User query
   * @param {Object} options - Context options
   * @returns {Promise<string>} Formatted context string
   */
  async getSearchContext(query, options = {}) {
    const results = await this.search(query, options);
    
    if (results.length === 0) {
      return '';
    }

    const contextParts = results.map((result, index) => {
      const source = result.document.title || 'Unknown';
      const text = result.context || result.text;
      const score = Math.round(result.score * 100);
      
      return `[${index + 1}] ${source} (${score}% match):\n${text}`;
    });

    return contextParts.join('\n\n');
  }

  /**
   * Queue document for background indexing
   * @param {Object} document - Document to index
   * @param {Object} options - Indexing options
   */
  queueForIndexing(document, options = {}) {
    this.indexingQueue.push({ document, options });
    
    // Start processing queue if not already processing
    if (!this.isProcessing) {
      this._processIndexingQueue();
    }
  }

  /**
   * Process the indexing queue
   * @private
   */
  async _processIndexingQueue() {
    if (this.isProcessing || this.indexingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.indexingQueue.length > 0) {
        const { document, options } = this.indexingQueue.shift();
        
        try {
          await this.indexDocument(document, options);
        } catch (error) {
          console.error(`Failed to index queued document ${document.title}:`, error);
          // Continue processing other documents
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Extract relevant context around a text chunk
   * @param {string} fullText - Full document text
   * @param {Object} metadata - Chunk metadata
   * @param {number} contextSize - Additional context size
   * @returns {string} Extracted context
   * @private
   */
  _extractContext(fullText, metadata, contextSize = 200) {
    if (!metadata || !fullText) return '';

    const start = Math.max(0, metadata.startPos - contextSize);
    const end = Math.min(fullText.length, metadata.endPos + contextSize);
    
    let context = fullText.substring(start, end);
    
    // Add ellipsis if we truncated
    if (start > 0) context = '...' + context;
    if (end < fullText.length) context = context + '...';
    
    return context.trim();
  }

  /**
   * Get indexing statistics
   * @returns {Promise<Object>} Indexing stats
   */
  async getStats() {
    try {
      const stats = await dbService.getStorageStats();
      
      return {
        ...stats,
        queueLength: this.indexingQueue.length,
        processing: this.isProcessing,
        embeddingService: embeddingService.getStatus()
      };
    } catch (error) {
      console.error('Failed to get RAG stats:', error);
      return {
        error: error.message,
        queueLength: this.indexingQueue.length,
        processing: this.isProcessing
      };
    }
  }

  /**
   * Clear all embeddings and reset index
   * @returns {Promise<void>}
   */
  async clearIndex() {
    try {
      // Get all documents
      const documents = await dbService.searchDocuments();
      
      // Reset document indexed status
      for (const doc of documents) {
        await dbService.updateDocument(doc._id, {
          indexed: false,
          status: 'pending'
        });
      }

      // Clear embedding cache
      embeddingService.clearCache();
      
      console.log('RAG index cleared successfully');
    } catch (error) {
      console.error('Failed to clear RAG index:', error);
      throw error;
    }
  }

  /**
   * Cleanup RAG service resources
   */
  destroy() {
    this.indexingQueue = [];
    this.isProcessing = false;
    this.initialized = false;
    embeddingService.destroy();
  }
}

// Export singleton instance
export default new RAGService();