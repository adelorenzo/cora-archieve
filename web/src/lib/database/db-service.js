/**
 * Database service for Cora RAG system
 * Provides offline-first data persistence with PouchDB
 */

import PouchDB from 'pouchdb';
import PouchFind from 'pouchdb-find';
import { 
  COLLECTIONS, 
  VALIDATION_RULES, 
  INDEXES,
  DOCUMENT_SCHEMA,
  EMBEDDING_SCHEMA,
  SETTINGS_SCHEMA,
  AGENT_SCHEMA,
  CONVERSATION_SCHEMA
} from './schema.js';

// Enable PouchDB plugins
PouchDB.plugin(PouchFind);

/**
 * Database service class for managing all data operations
 */
class DatabaseService {
  constructor() {
    this.dbs = new Map();
    this.initialized = false;
    this.storageQuota = null;
  }

  /**
   * Initialize all database collections with proper indexing
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Check storage quota
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        this.storageQuota = await navigator.storage.estimate();
      }

      // Initialize collections
      for (const [key, name] of Object.entries(COLLECTIONS)) {
        const db = new PouchDB(`cora_${name}`, {
          adapter: 'idb',
          auto_compaction: true
        });

        this.dbs.set(name, db);
        
        // Create indexes for collection
        if (INDEXES[key]) {
          for (const index of INDEXES[key]) {
            await db.createIndex({
              index: {
                fields: index.fields,
                ...(index.options || {})
              }
            });
          }
        }
      }

      // Initialize default settings if not exists
      await this.initializeSettings();
      
      this.initialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw new Error(`Database initialization failed: ${error.message}`);
    }
  }

  /**
   * Initialize default settings
   * @private
   */
  async initializeSettings() {
    const settingsDb = this.dbs.get(COLLECTIONS.SETTINGS);
    try {
      await settingsDb.get(SETTINGS_SCHEMA._id);
    } catch (error) {
      if (error.status === 404) {
        await settingsDb.put({ ...SETTINGS_SCHEMA });
      }
    }
  }

  /**
   * Get database for collection
   * @param {string} collection - Collection name
   * @returns {PouchDB} Database instance
   * @private
   */
  getDb(collection) {
    if (!this.initialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    
    const db = this.dbs.get(collection);
    if (!db) {
      throw new Error(`Unknown collection: ${collection}`);
    }
    return db;
  }

  // DOCUMENT OPERATIONS

  /**
   * Create or update a document
   * @param {Object} doc - Document data
   * @returns {Promise<Object>} Created document with _id and _rev
   */
  async createDocument(doc) {
    this.validateDocument(doc);
    
    const db = this.getDb(COLLECTIONS.DOCUMENTS);
    const document = {
      ...DOCUMENT_SCHEMA,
      ...doc,
      _id: doc._id || `doc_${Date.now()}_${this.generateHash(doc.content)}`,
      createdAt: doc.createdAt || new Date(),
      updatedAt: new Date()
    };

    try {
      const result = await db.put(document);
      return { ...document, _rev: result.rev };
    } catch (error) {
      if (error.status === 409) {
        throw new Error('Document already exists');
      }
      throw error;
    }
  }

  /**
   * Get document by ID
   * @param {string} id - Document ID
   * @returns {Promise<Object>} Document data
   */
  async getDocument(id) {
    const db = this.getDb(COLLECTIONS.DOCUMENTS);
    try {
      return await db.get(id);
    } catch (error) {
      if (error.status === 404) {
        throw new Error(`Document not found: ${id}`);
      }
      throw error;
    }
  }

  /**
   * Update document
   * @param {string} id - Document ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated document
   */
  async updateDocument(id, updates) {
    const db = this.getDb(COLLECTIONS.DOCUMENTS);
    
    try {
      const doc = await db.get(id);
      const updated = {
        ...doc,
        ...updates,
        updatedAt: new Date()
      };
      
      this.validateDocument(updated);
      const result = await db.put(updated);
      return { ...updated, _rev: result.rev };
    } catch (error) {
      if (error.status === 404) {
        throw new Error(`Document not found: ${id}`);
      }
      throw error;
    }
  }

  /**
   * Delete document and its embeddings
   * @param {string} id - Document ID
   * @returns {Promise<void>}
   */
  async deleteDocument(id) {
    const docDb = this.getDb(COLLECTIONS.DOCUMENTS);
    const embDb = this.getDb(COLLECTIONS.EMBEDDINGS);

    try {
      // Delete document
      const doc = await docDb.get(id);
      await docDb.remove(doc);

      // Delete associated embeddings
      const embeddings = await this.getEmbeddingsByDocument(id);
      for (const embedding of embeddings) {
        await embDb.remove(embedding);
      }
    } catch (error) {
      if (error.status === 404) {
        throw new Error(`Document not found: ${id}`);
      }
      throw error;
    }
  }

  /**
   * Search documents
   * @param {Object} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Search results
   */
  async searchDocuments(query = {}, options = {}) {
    const db = this.getDb(COLLECTIONS.DOCUMENTS);
    
    try {
      const result = await db.find({
        selector: query,
        sort: options.sort || [{ createdAt: 'desc' }],
        limit: options.limit || 50,
        skip: options.skip || 0
      });
      
      return result.docs;
    } catch (error) {
      throw new Error(`Document search failed: ${error.message}`);
    }
  }

  // EMBEDDING OPERATIONS

  /**
   * Create embedding
   * @param {Object} embedding - Embedding data
   * @returns {Promise<Object>} Created embedding
   */
  async createEmbedding(embedding) {
    this.validateEmbedding(embedding);
    
    const db = this.getDb(COLLECTIONS.EMBEDDINGS);
    const embeddingDoc = {
      ...EMBEDDING_SCHEMA,
      ...embedding,
      _id: embedding._id || `emb_${embedding.documentId}_${embedding.chunkIndex}`,
      createdAt: new Date(),
      norm: this.calculateNorm(embedding.vector)
    };

    try {
      const result = await db.put(embeddingDoc);
      return { ...embeddingDoc, _rev: result.rev };
    } catch (error) {
      throw new Error(`Failed to create embedding: ${error.message}`);
    }
  }

  /**
   * Get embeddings for document
   * @param {string} documentId - Document ID
   * @returns {Promise<Array>} Document embeddings
   */
  async getEmbeddingsByDocument(documentId) {
    const db = this.getDb(COLLECTIONS.EMBEDDINGS);
    
    try {
      const result = await db.find({
        selector: { documentId },
        sort: [{ chunkIndex: 'asc' }]
      });
      
      return result.docs;
    } catch (error) {
      throw new Error(`Failed to get embeddings: ${error.message}`);
    }
  }

  /**
   * Vector similarity search
   * @param {Array<number>} queryVector - Query vector
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Similar embeddings with scores
   */
  async vectorSearch(queryVector, options = {}) {
    const db = this.getDb(COLLECTIONS.EMBEDDINGS);
    const limit = options.limit || 10;
    const threshold = options.threshold || 0.7;
    
    try {
      // Get all embeddings (in production, use proper vector search)
      const result = await db.allDocs({ include_docs: true });
      const embeddings = result.rows.map(row => row.doc);
      
      // Calculate similarity scores
      const scored = embeddings
        .map(emb => ({
          ...emb,
          score: this.cosineSimilarity(queryVector, emb.vector)
        }))
        .filter(emb => emb.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      
      return scored;
    } catch (error) {
      throw new Error(`Vector search failed: ${error.message}`);
    }
  }

  // AGENT OPERATIONS

  /**
   * Create agent
   * @param {Object} agent - Agent data
   * @returns {Promise<Object>} Created agent
   */
  async createAgent(agent) {
    this.validateAgent(agent);
    
    const db = this.getDb(COLLECTIONS.AGENTS);
    const agentDoc = {
      ...AGENT_SCHEMA,
      ...agent,
      _id: agent._id || `agent_${agent.name.toLowerCase().replace(/\s+/g, '_')}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      const result = await db.put(agentDoc);
      return { ...agentDoc, _rev: result.rev };
    } catch (error) {
      if (error.status === 409) {
        throw new Error('Agent already exists');
      }
      throw error;
    }
  }

  /**
   * Get all active agents
   * @returns {Promise<Array>} Active agents
   */
  async getActiveAgents() {
    const db = this.getDb(COLLECTIONS.AGENTS);
    
    try {
      const result = await db.find({
        selector: { active: true },
        sort: [{ usage: 'desc' }]
      });
      
      return result.docs;
    } catch (error) {
      throw new Error(`Failed to get agents: ${error.message}`);
    }
  }

  /**
   * Update agent usage
   * @param {string} agentId - Agent ID
   * @returns {Promise<void>}
   */
  async incrementAgentUsage(agentId) {
    const db = this.getDb(COLLECTIONS.AGENTS);
    
    try {
      const agent = await db.get(agentId);
      agent.usage = (agent.usage || 0) + 1;
      agent.updatedAt = new Date();
      await db.put(agent);
    } catch (error) {
      console.warn(`Failed to update agent usage: ${error.message}`);
    }
  }

  // CONVERSATION OPERATIONS

  /**
   * Create conversation
   * @param {Object} conversation - Conversation data
   * @returns {Promise<Object>} Created conversation
   */
  async createConversation(conversation) {
    const db = this.getDb(COLLECTIONS.CONVERSATIONS);
    const convDoc = {
      ...CONVERSATION_SCHEMA,
      ...conversation,
      _id: conversation._id || `conv_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      const result = await db.put(convDoc);
      return { ...convDoc, _rev: result.rev };
    } catch (error) {
      throw new Error(`Failed to create conversation: ${error.message}`);
    }
  }

  /**
   * Add message to conversation
   * @param {string} conversationId - Conversation ID
   * @param {Object} message - Message data
   * @returns {Promise<Object>} Updated conversation
   */
  async addMessage(conversationId, message) {
    const db = this.getDb(COLLECTIONS.CONVERSATIONS);
    
    try {
      const conv = await db.get(conversationId);
      conv.messages.push({
        ...message,
        timestamp: new Date()
      });
      conv.metadata.messageCount = conv.messages.length;
      conv.updatedAt = new Date();
      
      const result = await db.put(conv);
      return { ...conv, _rev: result.rev };
    } catch (error) {
      throw new Error(`Failed to add message: ${error.message}`);
    }
  }

  // SETTINGS OPERATIONS

  /**
   * Get user settings
   * @returns {Promise<Object>} Settings object
   */
  async getSettings() {
    const db = this.getDb(COLLECTIONS.SETTINGS);
    
    try {
      return await db.get(SETTINGS_SCHEMA._id);
    } catch (error) {
      throw new Error(`Failed to get settings: ${error.message}`);
    }
  }

  /**
   * Update settings
   * @param {Object} updates - Settings updates
   * @returns {Promise<Object>} Updated settings
   */
  async updateSettings(updates) {
    const db = this.getDb(COLLECTIONS.SETTINGS);
    
    try {
      const settings = await db.get(SETTINGS_SCHEMA._id);
      const updated = {
        ...settings,
        ...updates,
        updatedAt: new Date()
      };
      
      const result = await db.put(updated);
      return { ...updated, _rev: result.rev };
    } catch (error) {
      throw new Error(`Failed to update settings: ${error.message}`);
    }
  }

  // UTILITY METHODS

  /**
   * Get storage usage statistics
   * @returns {Promise<Object>} Storage stats
   */
  async getStorageStats() {
    const stats = {
      documents: 0,
      embeddings: 0,
      conversations: 0,
      totalSize: 0,
      quota: this.storageQuota
    };

    try {
      for (const [name, db] of this.dbs) {
        const info = await db.info();
        stats[name] = info.doc_count;
        stats.totalSize += info.data_size || 0;
      }
    } catch (error) {
      console.warn('Failed to get storage stats:', error);
    }

    return stats;
  }

  /**
   * Compact all databases
   * @returns {Promise<void>}
   */
  async compact() {
    try {
      for (const db of this.dbs.values()) {
        await db.compact();
      }
    } catch (error) {
      throw new Error(`Database compaction failed: ${error.message}`);
    }
  }

  /**
   * Validate document data
   * @param {Object} doc - Document to validate
   * @throws {Error} Validation error
   * @private
   */
  validateDocument(doc) {
    const rules = VALIDATION_RULES.DOCUMENT;
    
    for (const field of rules.requiredFields) {
      if (!doc[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    if (doc.size > rules.maxSize) {
      throw new Error(`Document size exceeds limit: ${rules.maxSize} bytes`);
    }
    
    if (!rules.supportedTypes.includes(doc.contentType)) {
      throw new Error(`Unsupported content type: ${doc.contentType}`);
    }
  }

  /**
   * Validate embedding data
   * @param {Object} embedding - Embedding to validate
   * @throws {Error} Validation error
   * @private
   */
  validateEmbedding(embedding) {
    const rules = VALIDATION_RULES.EMBEDDING;
    
    for (const field of rules.requiredFields) {
      if (!embedding[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    if (embedding.vector.length !== rules.vectorDimensions) {
      throw new Error(`Invalid vector dimensions: expected ${rules.vectorDimensions}, got ${embedding.vector.length}`);
    }
    
    if (embedding.text.length > rules.maxText) {
      throw new Error(`Text exceeds maximum length: ${rules.maxText}`);
    }
  }

  /**
   * Validate agent data
   * @param {Object} agent - Agent to validate
   * @throws {Error} Validation error
   * @private
   */
  validateAgent(agent) {
    const rules = VALIDATION_RULES.AGENT;
    
    for (const field of rules.requiredFields) {
      if (!agent[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    if (agent.name.length > rules.maxNameLength) {
      throw new Error(`Agent name too long: max ${rules.maxNameLength} characters`);
    }
    
    if (agent.systemPrompt.length > rules.maxPromptLength) {
      throw new Error(`System prompt too long: max ${rules.maxPromptLength} characters`);
    }
  }

  /**
   * Calculate vector norm for optimization
   * @param {Array<number>} vector - Vector array
   * @returns {number} Vector norm
   * @private
   */
  calculateNorm(vector) {
    return Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  }

  /**
   * Calculate cosine similarity between vectors
   * @param {Array<number>} a - First vector
   * @param {Array<number>} b - Second vector
   * @returns {number} Similarity score (-1 to 1)
   * @private
   */
  cosineSimilarity(a, b) {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Generate hash for content deduplication
   * @param {string} content - Content to hash
   * @returns {string} Hash string
   * @private
   */
  generateHash(content) {
    let hash = 0;
    if (content.length === 0) return hash.toString();
    
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString(16);
  }

  /**
   * Clean up and close all database connections
   * @returns {Promise<void>}
   */
  async destroy() {
    try {
      for (const db of this.dbs.values()) {
        await db.close();
      }
      this.dbs.clear();
      this.initialized = false;
    } catch (error) {
      console.error('Error during database cleanup:', error);
    }
  }
}

// Export singleton instance
export default new DatabaseService();