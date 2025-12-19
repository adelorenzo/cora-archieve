/**
 * Database service for Cora RAG system
 * Provides offline-first data persistence with PouchDB
 */

// Browser-optimized PouchDB initialization - use only necessary modules
let PouchDB = null;
let initialized = false;

// Function to initialize PouchDB with browser-specific optimizations
async function initPouchDB() {
  if (initialized) {
    console.log('[DB] Using localStorage fallback (PouchDB disabled)');
    return null;
  }

  // DISABLED: PouchDB causing import errors and crashes
  // Force use of localStorage fallback for stability
  console.log('[DB] PouchDB disabled - using localStorage fallback for stability');
  initialized = true;
  return null;

  // Original PouchDB code commented out to prevent crashes:
  /*
  try {
    // Import only essential modules for browser compatibility
    console.log('[DB] Importing PouchDB modules...');
    const PouchDBCore = await import('pouchdb-core');
    const IdbAdapter = await import('pouchdb-adapter-idb');
    const FindPlugin = await import('pouchdb-find');

    // Use default exports properly
    const Core = PouchDBCore.default || PouchDBCore;
    const Idb = IdbAdapter.default || IdbAdapter;
    const Find = FindPlugin.default || FindPlugin;

    // Configure PouchDB with minimal required plugins
    PouchDB = Core
      .plugin(Idb)
      .plugin(Find);

    initialized = true;
    const elapsed = Date.now() - startTime;
    console.log(`[DB] PouchDB configured successfully in ${elapsed}ms (browser-optimized)`);
    return PouchDB;
  } catch (error) {
    console.warn('[DB] PouchDB import failed, will use localStorage fallback:', error);
    console.error('[DB] Error details:', error.message);
    initialized = true; // Prevent retries
    return null;
  }
  */
}

// Simple fallback class for localStorage if PouchDB fails
class StorageFallback {
  constructor(name) {
    this.name = name;
    // Browser environment check
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      throw new Error('StorageFallback requires browser environment with localStorage');
    }
    this.storage = localStorage;
    this.prefix = `cora_${name}_`;
  }

  async allDocs(options = {}) {
    const docs = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key.startsWith(this.prefix)) {
        try {
          const doc = JSON.parse(this.storage.getItem(key));
          const id = key.replace(this.prefix, '');
          docs.push(options.include_docs ? { id, doc } : { id });
        } catch (e) {
          console.warn(`Failed to parse document ${key}:`, e);
        }
      }
    }
    return { rows: docs };
  }

  async get(id) {
    const data = this.storage.getItem(this.prefix + id);
    if (!data) {
      const error = new Error('missing');
      error.status = 404;
      error.name = 'not_found';
      throw error;
    }
    try {
      return JSON.parse(data);
    } catch (parseError) {
      console.warn(`Failed to parse document ${id}, removing corrupted data`);
      this.storage.removeItem(this.prefix + id);
      const error = new Error('missing');
      error.status = 404;
      error.name = 'not_found';
      throw error;
    }
  }

  async put(doc) {
    const id = doc._id || doc.id || Date.now().toString();
    const existingData = this.storage.getItem(this.prefix + id);
    let rev = '1-' + Date.now().toString();
    
    if (existingData) {
      const existing = JSON.parse(existingData);
      if (existing._rev && !doc._rev) {
        const error = new Error('Document update conflict');
        error.status = 409;
        throw error;
      }
      const revNum = parseInt(existing._rev?.split('-')[0] || '0') + 1;
      rev = `${revNum}-${Date.now()}`;
    }
    
    const finalDoc = { ...doc, _id: id, _rev: rev };
    this.storage.setItem(this.prefix + id, JSON.stringify(finalDoc));
    return { ok: true, id, rev };
  }

  async remove(doc) {
    const id = typeof doc === 'string' ? doc : doc._id;
    const key = this.prefix + id;
    if (!this.storage.getItem(key)) {
      const error = new Error('missing');
      error.status = 404;
      throw error;
    }
    this.storage.removeItem(key);
    return { ok: true };
  }

  async find(query) {
    const allDocs = await this.allDocs({ include_docs: true });
    let docs = allDocs.rows.map(row => row.doc);
    
    // Apply selector filtering
    if (query.selector) {
      docs = docs.filter(doc => this._matchesSelector(doc, query.selector));
    }
    
    // Apply sorting
    if (query.sort) {
      docs.sort((a, b) => this._compareSort(a, b, query.sort));
    }
    
    // Apply pagination
    if (query.skip) {
      docs = docs.slice(query.skip);
    }
    if (query.limit) {
      docs = docs.slice(0, query.limit);
    }
    
    return { docs };
  }

  _matchesSelector(doc, selector) {
    for (const [field, condition] of Object.entries(selector)) {
      const value = this._getNestedValue(doc, field);
      if (typeof condition === 'object' && condition !== null) {
        // Handle operators (not implemented for simplicity)
        continue;
      } else {
        if (value !== condition) return false;
      }
    }
    return true;
  }

  _getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  _compareSort(a, b, sortArray) {
    for (const sortField of sortArray) {
      const field = typeof sortField === 'string' ? sortField : Object.keys(sortField)[0];
      const direction = typeof sortField === 'string' ? 'asc' : sortField[field];
      
      const aVal = this._getNestedValue(a, field);
      const bVal = this._getNestedValue(b, field);
      
      if (aVal < bVal) return direction === 'desc' ? 1 : -1;
      if (aVal > bVal) return direction === 'desc' ? -1 : 1;
    }
    return 0;
  }

  async createIndex() {
    return { result: 'created' };
  }

  async info() {
    const allDocs = await this.allDocs();
    let totalSize = 0;
    
    // Calculate approximate storage size for this database
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key.startsWith(this.prefix)) {
        const value = this.storage.getItem(key);
        totalSize += (key.length + (value ? value.length : 0)) * 2; // Rough UTF-16 estimate
      }
    }
    
    return {
      doc_count: allDocs.rows.length,
      data_size: totalSize,
      db_name: this.name,
      adapter: 'localstorage-fallback'
    };
  }

  async compact() {
    return { ok: true };
  }

  async close() {
    return { ok: true };
  }
}

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
import vectorIndex from './vector-index.js';

/**
 * Database service class for managing all data operations
 */
class DatabaseService {
  constructor() {
    this.dbs = new Map();
    this.initialized = false;
    this.storageQuota = null;
    this.usingFallback = false;
    this.vectorIndex = null;
  }

  /**
   * Initialize all database collections with proper indexing
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      console.log('[DB Service] Already initialized, skipping');
      return;
    }

    console.log('[DB Service] Starting initialization...');
    const startTime = Date.now();

    // Browser environment check
    if (typeof window === 'undefined') {
      throw new Error('Database service requires browser environment');
    }

    try {
      // Check storage quota
      console.log('[DB Service] Checking storage quota...');
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        this.storageQuota = await navigator.storage.estimate();
        const usedMB = Math.round(this.storageQuota.usage / 1024 / 1024);
        const quotaMB = Math.round(this.storageQuota.quota / 1024 / 1024);
        console.log(`[DB Service] Storage: ${usedMB}MB used of ${quotaMB}MB quota`);
      }

      // Try to initialize PouchDB first
      console.log('[DB Service] Initializing PouchDB...');
      await this._initializePouchDB();

      // Set initialized flag AFTER collections are created but BEFORE vector index
      // This prevents getDb() from throwing in initializeVectorIndex()
      this.initialized = true;

      // Initialize default settings if not exists
      await this.initializeSettings();

      // Initialize vector index for fast similarity search
      await this.initializeVectorIndex();

      const elapsed = Date.now() - startTime;
      const storageType = this.usingFallback ? 'localStorage fallback' : 'IndexedDB';
      console.log(`[DB Service] Initialization completed in ${elapsed}ms (using ${storageType})`);
    } catch (error) {
      console.error('[DB Service] Initialization failed:', error);
      console.error('[DB Service] Error stack:', error.stack);
      // Ensure initialized is false on error
      this.initialized = false;
      throw new Error(`Database initialization failed: ${error.message}`);
    }
  }

  /**
   * Initialize PouchDB with fallback to localStorage
   * @private
   */
  async _initializePouchDB() {
    // Try to initialize PouchDB first
    const PouchDBConstructor = await initPouchDB();
    
    // Initialize collections
    for (const [key, name] of Object.entries(COLLECTIONS)) {
      let db;
      
      if (PouchDBConstructor) {
        try {
          // Try PouchDB with IndexedDB adapter first
          db = new PouchDBConstructor(`cora_${name}`, {
            adapter: 'idb',
            auto_compaction: false, // Disable to avoid Node.js dependencies
            revs_limit: 1, // Reduce storage overhead
            size: 10 // Start with small size
          });

          // Test the database by performing a simple operation
          await db.info();
          
          console.log(`Initialized ${name} collection with IndexedDB`);
          
        } catch (pouchError) {
          console.warn(`PouchDB failed for ${name}, falling back to localStorage:`, pouchError);
          
          // Fall back to localStorage implementation
          db = new StorageFallback(name);
          this.usingFallback = true;
        }
      } else {
        // PouchDB not available, use fallback
        console.log(`Using localStorage fallback for ${name} collection`);
        db = new StorageFallback(name);
        this.usingFallback = true;
      }

      this.dbs.set(name, db);
      
      // Create indexes for collection (only if using real PouchDB)
      if (!this.usingFallback && INDEXES[key]) {
        try {
          for (const index of INDEXES[key]) {
            await db.createIndex({
              index: {
                fields: index.fields,
                ...(index.options || {})
              }
            });
          }
        } catch (indexError) {
          console.warn(`Failed to create index for ${name}:`, indexError);
        }
      }
    }

    // Don't initialize settings and vector index here - they will be called after initialized flag is set
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
      if (error.status === 404 || error.message === 'missing') {
        await settingsDb.put({ ...SETTINGS_SCHEMA });
      }
    }
  }

  /**
   * Initialize or rebuild vector index from existing embeddings
   * @private
   */
  async initializeVectorIndex() {
    const db = this.getDb(COLLECTIONS.EMBEDDINGS);

    try {
      console.log('[DB Service] Loading embeddings into vector index...');
      const result = await db.allDocs({ include_docs: true });
      const embeddings = result.rows.map(row => row.doc);

      // Clear existing index
      vectorIndex.clear();

      // Add all embeddings to index
      for (const emb of embeddings) {
        if (emb.vector && emb._id) {
          vectorIndex.add(emb._id, emb.vector, {
            documentId: emb.documentId,
            chunkIndex: emb.chunkIndex,
            text: emb.text
          });
        }
      }

      // Build index for fast search
      if (embeddings.length > 0) {
        vectorIndex.buildIndex();
        console.log(`[DB Service] Vector index built with ${embeddings.length} embeddings`);
      }
    } catch (error) {
      console.error('[DB Service] Failed to initialize vector index:', error);
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
      if (error.status === 404 || error.message === 'missing') {
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
      if (error.status === 404 || error.message === 'missing') {
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
        // Remove from vector index
        vectorIndex.remove(embedding._id);
        // Remove from database
        await embDb.remove(embedding);
      }
    } catch (error) {
      if (error.status === 404 || error.message === 'missing') {
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

      // Add to vector index for fast similarity search
      vectorIndex.add(embeddingDoc._id, embedding.vector, {
        documentId: embedding.documentId,
        chunkIndex: embedding.chunkIndex,
        text: embedding.text
      });

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
      // Use optimized vector index for fast search
      const results = vectorIndex.search(queryVector, limit, threshold);

      // Enhance results with full document data
      const enhancedResults = [];
      for (const result of results) {
        try {
          const doc = await db.get(result.id);
          enhancedResults.push({
            ...doc,
            score: result.score
          });
        } catch (err) {
          // If doc not found in DB, just use index metadata
          enhancedResults.push({
            _id: result.id,
            documentId: result.metadata.documentId,
            chunkIndex: result.metadata.chunkIndex,
            text: result.metadata.text,
            score: result.score
          });
        }
      }

      return enhancedResults;
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