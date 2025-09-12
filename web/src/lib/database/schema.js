/**
 * Database schemas for Cora RAG system
 * Defines data structures for offline-first document storage
 */

/**
 * Document schema for RAG knowledge base
 * @typedef {Object} DocumentSchema
 * @property {string} _id - Unique document ID (format: doc_{timestamp}_{hash})
 * @property {string} title - Document title
 * @property {string} content - Full document content
 * @property {string} contentType - MIME type (text/plain, text/markdown, application/pdf, etc.)
 * @property {number} size - Content size in bytes
 * @property {Array<string>} chunks - Content split into chunks for embedding
 * @property {number} chunkSize - Size of each chunk in characters
 * @property {string} hash - SHA-256 hash of content for deduplication
 * @property {Object} metadata - Additional document metadata
 * @property {string} metadata.source - Source URL or file path
 * @property {Array<string>} metadata.tags - User-defined tags
 * @property {string} metadata.language - Detected language code
 * @property {Date} createdAt - Document creation timestamp
 * @property {Date} updatedAt - Last modification timestamp
 * @property {boolean} indexed - Whether embeddings have been generated
 * @property {string} status - Processing status: 'pending', 'processing', 'completed', 'error'
 */
export const DOCUMENT_SCHEMA = {
  _id: '',
  title: '',
  content: '',
  contentType: 'text/plain',
  size: 0,
  chunks: [],
  chunkSize: 1000,
  hash: '',
  metadata: {
    source: '',
    tags: [],
    language: 'en'
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  indexed: false,
  status: 'pending'
};

/**
 * Embedding schema for vector storage
 * @typedef {Object} EmbeddingSchema
 * @property {string} _id - Unique embedding ID (format: emb_{docId}_{chunkIndex})
 * @property {string} documentId - Reference to parent document
 * @property {number} chunkIndex - Index of chunk within document
 * @property {string} text - Original text chunk
 * @property {Array<number>} vector - Embedding vector (384 dimensions for all-MiniLM-L6-v2)
 * @property {number} norm - Vector norm for cosine similarity optimization
 * @property {Object} metadata - Chunk-specific metadata
 * @property {number} metadata.startPos - Start position in original document
 * @property {number} metadata.endPos - End position in original document
 * @property {number} metadata.tokenCount - Approximate token count
 * @property {Date} createdAt - Embedding creation timestamp
 * @property {string} model - Embedding model used (e.g., 'all-MiniLM-L6-v2')
 */
export const EMBEDDING_SCHEMA = {
  _id: '',
  documentId: '',
  chunkIndex: 0,
  text: '',
  vector: [],
  norm: 0,
  metadata: {
    startPos: 0,
    endPos: 0,
    tokenCount: 0
  },
  createdAt: new Date(),
  model: ''
};

/**
 * Settings schema for user preferences
 * @typedef {Object} SettingsSchema
 * @property {string} _id - Settings category ID
 * @property {Object} rag - RAG-specific settings
 * @property {number} rag.chunkSize - Text chunk size for embeddings
 * @property {number} rag.chunkOverlap - Overlap between chunks
 * @property {number} rag.maxResults - Max search results to return
 * @property {number} rag.similarityThreshold - Minimum similarity score
 * @property {string} rag.embeddingModel - Default embedding model
 * @property {Object} ui - UI preferences
 * @property {string} ui.theme - Current theme
 * @property {string} ui.language - Interface language
 * @property {boolean} ui.autoSave - Auto-save conversations
 * @property {Object} storage - Storage preferences
 * @property {number} storage.maxDocumentSize - Max document size in MB
 * @property {number} storage.maxTotalSize - Max total storage in MB
 * @property {number} storage.retentionDays - Document retention period
 * @property {boolean} storage.enableSync - Enable remote sync
 * @property {Date} updatedAt - Last settings update
 */
export const SETTINGS_SCHEMA = {
  _id: 'user_settings',
  rag: {
    chunkSize: 1000,
    chunkOverlap: 100,
    maxResults: 10,
    similarityThreshold: 0.7,
    embeddingModel: 'all-MiniLM-L6-v2'
  },
  ui: {
    theme: 'system',
    language: 'en',
    autoSave: true
  },
  storage: {
    maxDocumentSize: 10, // MB
    maxTotalSize: 100,   // MB
    retentionDays: 90,
    enableSync: false
  },
  updatedAt: new Date()
};

/**
 * Agent schema for custom AI agents
 * @typedef {Object} AgentSchema
 * @property {string} _id - Unique agent ID (format: agent_{name})
 * @property {string} name - Agent display name
 * @property {string} description - Agent description
 * @property {string} systemPrompt - System prompt for the agent
 * @property {Object} config - Agent configuration
 * @property {number} config.temperature - Generation temperature
 * @property {number} config.maxTokens - Max response tokens
 * @property {boolean} config.useRAG - Whether to use RAG for this agent
 * @property {Array<string>} config.documentFilters - Filter documents by tags
 * @property {string} config.ragPrompt - RAG-specific prompt template
 * @property {Object} metadata - Agent metadata
 * @property {string} metadata.category - Agent category
 * @property {Array<string>} metadata.tags - Agent tags
 * @property {string} metadata.icon - Agent icon identifier
 * @property {string} metadata.color - Agent color theme
 * @property {Date} createdAt - Agent creation timestamp
 * @property {Date} updatedAt - Last modification timestamp
 * @property {boolean} active - Whether agent is active
 * @property {number} usage - Usage count
 */
export const AGENT_SCHEMA = {
  _id: '',
  name: '',
  description: '',
  systemPrompt: '',
  config: {
    temperature: 0.7,
    maxTokens: 2048,
    useRAG: false,
    documentFilters: [],
    ragPrompt: 'Use the following context to answer the question:\n\nContext: {context}\n\nQuestion: {question}'
  },
  metadata: {
    category: 'general',
    tags: [],
    icon: 'bot',
    color: 'blue'
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  active: true,
  usage: 0
};

/**
 * Conversation schema for chat history
 * @typedef {Object} ConversationSchema
 * @property {string} _id - Unique conversation ID (format: conv_{timestamp})
 * @property {string} title - Conversation title (auto-generated from first message)
 * @property {string} agentId - Associated agent ID
 * @property {Array<Object>} messages - Conversation messages
 * @property {string} messages.role - Message role ('user' | 'assistant' | 'system')
 * @property {string} messages.content - Message content
 * @property {Date} messages.timestamp - Message timestamp
 * @property {Array<string>} messages.sources - Referenced document IDs for RAG
 * @property {Object} metadata - Conversation metadata
 * @property {number} metadata.messageCount - Total message count
 * @property {Array<string>} metadata.topics - Extracted topics/keywords
 * @property {boolean} metadata.pinned - Whether conversation is pinned
 * @property {Date} createdAt - Conversation creation timestamp
 * @property {Date} updatedAt - Last message timestamp
 * @property {boolean} archived - Whether conversation is archived
 */
export const CONVERSATION_SCHEMA = {
  _id: '',
  title: '',
  agentId: '',
  messages: [],
  metadata: {
    messageCount: 0,
    topics: [],
    pinned: false
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  archived: false
};

/**
 * Collection names for database organization
 */
export const COLLECTIONS = {
  DOCUMENTS: 'documents',
  EMBEDDINGS: 'embeddings', 
  SETTINGS: 'settings',
  AGENTS: 'agents',
  CONVERSATIONS: 'conversations'
};

/**
 * Validation rules for data integrity
 */
export const VALIDATION_RULES = {
  DOCUMENT: {
    maxSize: 50 * 1024 * 1024, // 50MB
    maxChunks: 1000,
    requiredFields: ['title', 'content', 'contentType'],
    supportedTypes: ['text/plain', 'text/markdown', 'application/pdf', 'text/html']
  },
  EMBEDDING: {
    vectorDimensions: 384, // all-MiniLM-L6-v2 output dimensions
    maxText: 2000,
    requiredFields: ['documentId', 'text', 'vector']
  },
  AGENT: {
    maxNameLength: 50,
    maxDescLength: 200,
    maxPromptLength: 5000,
    requiredFields: ['name', 'systemPrompt']
  },
  CONVERSATION: {
    maxMessages: 1000,
    maxTitleLength: 100
  }
};

/**
 * Index configurations for query optimization
 */
export const INDEXES = {
  DOCUMENTS: [
    { fields: ['hash'] },
    { fields: ['status'] },
    { fields: ['indexed'] },
    { fields: ['createdAt'] },
    { fields: ['metadata.tags'] }
  ],
  EMBEDDINGS: [
    { fields: ['documentId'] },
    { fields: ['documentId', 'chunkIndex'] },
    { fields: ['model'] }
  ],
  AGENTS: [
    { fields: ['active'] },
    { fields: ['metadata.category'] },
    { fields: ['usage'], options: { descending: true } }
  ],
  CONVERSATIONS: [
    { fields: ['agentId'] },
    { fields: ['archived'] },
    { fields: ['updatedAt'], options: { descending: true } },
    { fields: ['metadata.pinned'] }
  ]
};