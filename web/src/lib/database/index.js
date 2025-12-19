/**
 * Database module entry point
 * Exports all database functionality for Cora RAG system
 */

// Core database service
export { default as dbService } from './db-service.js';

// Schema definitions and validation
export {
  DOCUMENT_SCHEMA,
  EMBEDDING_SCHEMA,
  SETTINGS_SCHEMA,
  AGENT_SCHEMA,
  CONVERSATION_SCHEMA,
  COLLECTIONS,
  VALIDATION_RULES,
  INDEXES
} from './schema.js';

/**
 * Database initialization helper
 * Call this once at app startup
 * @returns {Promise<void>}
 */
export async function initializeDatabase() {
  const { default: dbService } = await import('./db-service.js');
  await dbService.initialize();
  return dbService;
}

/**
 * RAG-specific database operations
 * High-level interface for common RAG workflows
 */
export class RAGDatabase {
  constructor(dbService) {
    this.db = dbService;
  }

  /**
   * Add document to RAG system
   * @param {Object} docData - Document data
   * @returns {Promise<Object>} Created document
   */
  async addDocument(docData) {
    // Create document
    const document = await this.db.createDocument(docData);
    
    // Split into chunks for embedding
    const chunks = this.chunkText(document.content, document.chunkSize);
    document.chunks = chunks;
    
    // Update document with chunks
    return await this.db.updateDocument(document._id, { chunks });
  }

  /**
   * Process document for embeddings
   * @param {string} documentId - Document ID
   * @param {Array<Array<number>>} embeddings - Pre-computed embeddings
   * @param {string} model - Embedding model name
   * @returns {Promise<Array>} Created embeddings
   */
  async addEmbeddings(documentId, embeddings, model) {
    const document = await this.db.getDocument(documentId);
    const results = [];
    
    for (let i = 0; i < embeddings.length; i++) {
      const embedding = {
        documentId,
        chunkIndex: i,
        text: document.chunks[i],
        vector: embeddings[i],
        model,
        metadata: {
          startPos: i * document.chunkSize,
          endPos: Math.min((i + 1) * document.chunkSize, document.content.length),
          tokenCount: Math.ceil(document.chunks[i].length / 4) // Rough token estimate
        }
      };
      
      results.push(await this.db.createEmbedding(embedding));
    }
    
    // Mark document as indexed
    await this.db.updateDocument(documentId, { 
      indexed: true, 
      status: 'completed' 
    });
    
    return results;
  }

  /**
   * Semantic search across documents
   * @param {string} query - Search query
   * @param {Array<number>} queryVector - Query embedding vector
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results with context
   */
  async semanticSearch(query, queryVector, options = {}) {
    const {
      limit = 5,
      threshold = 0.7,
      includeMetadata = true
    } = options;

    // Vector search
    const embeddings = await this.db.vectorSearch(queryVector, {
      limit: limit * 2, // Get more for deduplication
      threshold
    });

    // Group by document and get unique results
    const documentGroups = new Map();
    for (const embedding of embeddings) {
      if (!documentGroups.has(embedding.documentId)) {
        documentGroups.set(embedding.documentId, []);
      }
      documentGroups.get(embedding.documentId).push(embedding);
    }

    // Build results with document context
    const results = [];
    for (const [docId, docEmbeddings] of documentGroups) {
      if (results.length >= limit) break;

      try {
        const document = includeMetadata ? 
          await this.db.getDocument(docId) : 
          { _id: docId };

        // Take best chunk from this document
        const bestChunk = docEmbeddings[0];
        
        results.push({
          documentId: docId,
          document: includeMetadata ? document : undefined,
          chunk: {
            text: bestChunk.text,
            score: bestChunk.score,
            chunkIndex: bestChunk.chunkIndex
          },
          relevantChunks: docEmbeddings.slice(0, 3) // Top 3 chunks
        });
      } catch (error) {
        console.warn(`Failed to load document ${docId}:`, error);
      }
    }

    return {
      query,
      results,
      totalResults: embeddings.length,
      searchTime: Date.now()
    };
  }

  /**
   * Get RAG context for query
   * @param {string} query - User query
   * @param {Array<number>} queryVector - Query embedding
   * @param {Object} options - Context options
   * @returns {Promise<string>} Formatted context string
   */
  async getRAGContext(query, queryVector, options = {}) {
    const searchResults = await this.semanticSearch(query, queryVector, options);
    
    if (searchResults.results.length === 0) {
      return '';
    }

    // Format context from search results
    let context = 'Relevant information:\n\n';
    
    searchResults.results.forEach((result, index) => {
      const source = result.document?.title || result.documentId;
      context += `[${index + 1}] From "${source}":\n`;
      context += `${result.chunk.text}\n\n`;
    });

    return context.trim();
  }

  /**
   * Chunk text for embedding processing
   * @param {string} text - Text to chunk
   * @param {number} chunkSize - Size of each chunk
   * @param {number} overlap - Overlap between chunks
   * @returns {Array<string>} Text chunks
   * @private
   */
  chunkText(text, chunkSize = 1000, overlap = 100) {
    const chunks = [];
    let start = 0;
    
    while (start < text.length) {
      let end = start + chunkSize;
      
      // Try to break at word boundary
      if (end < text.length) {
        const lastSpace = text.lastIndexOf(' ', end);
        if (lastSpace > start + chunkSize / 2) {
          end = lastSpace;
        }
      }
      
      chunks.push(text.slice(start, end).trim());
      start = end - overlap;
    }
    
    return chunks.filter(chunk => chunk.length > 0);
  }
}

/**
 * Create RAG database instance
 * @returns {Promise<RAGDatabase>} RAG database instance
 */
export async function createRAGDatabase() {
  const { default: dbService } = await import('./db-service.js');
  await dbService.initialize();
  return new RAGDatabase(dbService);
}