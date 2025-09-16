/**
 * RAG service integrating embedding service with database
 * Provides document indexing and semantic search capabilities
 */

// Use embedding service with automatic fallback for semantic embeddings
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
    if (this.initialized) {
      console.log('[RAG Service] Already initialized, skipping');
      return;
    }

    console.log('[RAG Service] Starting initialization...');
    const startTime = Date.now();

    try {
      // Initialize database first
      console.log('[RAG Service] Initializing database...');
      await dbService.initialize();
      console.log('[RAG Service] Database initialized');
      
      // Initialize embedding model
      console.log('[RAG Service] Initializing embedding service...');
      await embeddingService.initialize(progressCallback);
      console.log('[RAG Service] Embedding service initialized');
      
      this.initialized = true;
      const elapsed = Date.now() - startTime;
      console.log(`[RAG Service] Initialization completed in ${elapsed}ms`);
    } catch (error) {
      console.error('[RAG Service] Initialization failed:', error);
      console.error('[RAG Service] Error stack:', error.stack);
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

    // Extract document ID from metadata or document object
    const documentId = document.metadata?.documentId || document._id || document.id;

    if (!documentId) {
      console.error('[RAG Index] Document missing ID:', document);
      throw new Error('Document ID is required for indexing');
    }

    // Prevent indexing if document is too large
    const MAX_DOCUMENT_SIZE = 500000; // 500KB limit
    if (document.content && document.content.length > MAX_DOCUMENT_SIZE) {
      console.error(`[RAG Index] Document too large: ${document.content.length} bytes (max: ${MAX_DOCUMENT_SIZE})`);
      await dbService.updateDocument(documentId, {
        status: 'error',
        indexed: false,
        error: 'Document too large for indexing'
      });
      throw new Error('Document too large for indexing');
    }

    try {
      // Update document status
      await dbService.updateDocument(documentId, {
        status: 'processing',
        indexed: false
      });

      // Chunk the document content with smaller chunks to reduce memory usage
      const chunks = embeddingService.chunkText(document.content, {
        chunkSize: options.chunkSize || 500,  // Reduced from 1000
        overlap: options.overlap || 50  // Reduced from 100
      });

      // Limit the number of chunks to prevent memory issues
      const MAX_CHUNKS = 100;
      if (chunks.length > MAX_CHUNKS) {
        console.warn(`[RAG Index] Document has ${chunks.length} chunks, limiting to ${MAX_CHUNKS}`);
        chunks.length = MAX_CHUNKS;
      }

      console.log(`[RAG Index] Processing ${chunks.length} chunks for document: ${document.metadata?.title || document.title || document.name || documentId}`);

      // Generate embeddings for chunks in batches to reduce memory usage
      const texts = chunks.map(chunk => chunk.text);
      console.log(`[RAG Index] Generating embeddings for ${texts.length} chunks...`);
      
      // Process embeddings in smaller batches
      const embeddings = [];
      const embeddingBatchSize = 20; // Process 20 chunks at a time
      
      for (let i = 0; i < texts.length; i += embeddingBatchSize) {
        const batch = texts.slice(i, i + embeddingBatchSize);
        const batchEmbeddings = await embeddingService.generateEmbeddings(batch);
        embeddings.push(...batchEmbeddings);
        console.log(`[RAG Index] Generated embeddings for ${Math.min(i + embeddingBatchSize, texts.length)}/${texts.length} chunks`);
      }
      
      console.log(`[RAG Index] All embeddings generated successfully`);

      // Store embeddings in database - batch operations for speed
      console.log(`[RAG Index] Storing embeddings in database...`);
      const embeddingPromises = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = embeddings[i];

        // Create promises but don't await immediately
        embeddingPromises.push(
          dbService.createEmbedding({
            documentId: documentId,
            chunkIndex: chunk.index,
            text: chunk.text,
            vector: embedding,
            metadata: {
              startPos: chunk.startPos,
              endPos: chunk.endPos,
              tokenCount: chunk.tokenCount || 0
            },
            model: 'all-MiniLM-L6-v2'
          })
        );
        
        // Process in smaller batches to reduce memory usage
        if (embeddingPromises.length >= 5 || i === chunks.length - 1) {
          await Promise.all(embeddingPromises);
          embeddingPromises.length = 0;
          console.log(`[RAG Index] Stored ${Math.min((i + 1), chunks.length)} / ${chunks.length} embeddings`);
        }
      }

      // Update document as indexed
      await dbService.updateDocument(documentId, {
        status: 'completed',
        indexed: true,
        chunks: texts
      });

      console.log(`Successfully indexed document: ${document.metadata?.title || document.title || documentId}`);

    } catch (error) {
      console.error(`Failed to index document ${document.metadata?.title || document.title || documentId}:`, error);

      // Update document with error status
      try {
        await dbService.updateDocument(documentId, {
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
    // Check if document is already in queue
    const isAlreadyQueued = this.indexingQueue.some(item => 
      item.document._id === document._id
    );
    
    if (isAlreadyQueued) {
      console.log(`[RAG Queue] Document already in queue: ${document.name || document.title}`);
      return;
    }
    
    // Limit queue size to prevent memory issues
    const MAX_QUEUE_SIZE = 10;
    if (this.indexingQueue.length >= MAX_QUEUE_SIZE) {
      console.error(`[RAG Queue] Queue is full (${MAX_QUEUE_SIZE} items). Please wait for processing to complete.`);
      return;
    }
    
    this.indexingQueue.push({ document, options });
    console.log(`[RAG Queue] Document queued: ${document.name || document.title}. Queue size: ${this.indexingQueue.length}`);
    
    // Start processing queue if not already processing
    if (!this.isProcessing) {
      // Add a small delay to prevent immediate processing that might lock the UI
      setTimeout(() => {
        if (!this.isProcessing && this.indexingQueue.length > 0) {
          this._processIndexingQueue();
        }
      }, 100);
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
          console.log(`[RAG Queue] Starting to index: ${document.name || document.title}`);
          const startTime = Date.now();
          
          // Add timeout to prevent hanging - reduced to 15 seconds
          const indexPromise = this.indexDocument(document, options);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Indexing timeout after 15 seconds')), 15000)
          );
          
          await Promise.race([indexPromise, timeoutPromise]);
          
          const elapsed = Date.now() - startTime;
          console.log(`[RAG Queue] Completed indexing ${document.name || document.title} in ${elapsed}ms`);
        } catch (error) {
          console.error(`[RAG Queue] Failed to index document ${document.name || document.title}:`, error);
          // Update document status to error
          try {
            await dbService.updateDocument(document._id, {
              status: 'error',
              indexed: false,
              error: error.message
            });
          } catch (updateError) {
            console.error('[RAG Queue] Failed to update document status:', updateError);
          }
        }
      }
    } finally {
      this.isProcessing = false;
      console.log('[RAG Queue] Queue processing complete');
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
      // Ensure database is initialized before getting stats
      if (!dbService.initialized) {
        await dbService.initialize();
      }
      
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