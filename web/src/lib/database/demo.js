/**
 * Database integration demo
 * Shows how to use the RAG database with Cora
 */

import { initializeDatabase, createRAGDatabase } from './index.js';

/**
 * Demo: Complete RAG workflow
 */
export async function ragDemo() {
  console.log('🚀 Initializing RAG Database...');
  
  try {
    // Initialize database
    const ragDb = await createRAGDatabase();
    
    // 1. Add a sample document
    console.log('📄 Adding sample document...');
    const doc = await ragDb.addDocument({
      title: 'JavaScript Closures',
      content: `A closure is the combination of a function bundled together with references to its surrounding state (the lexical environment). In other words, a closure gives you access to an outer function's scope from an inner function. In JavaScript, closures are created every time a function is created, at function creation time.

Closures are useful because they let you associate some data (the lexical environment) with a function that operates on that data. This has obvious parallels to object-oriented programming, where objects allow you to associate some data (the object's properties) with one or more methods.

Here's a simple example:
function outerFunction(x) {
  return function innerFunction(y) {
    return x + y;
  };
}

const add5 = outerFunction(5);
console.log(add5(2)); // 7`,
      contentType: 'text/markdown',
      metadata: {
        source: 'demo',
        tags: ['javascript', 'programming', 'tutorial'],
        language: 'en'
      }
    });
    
    console.log('✅ Document created:', doc._id);
    
    // 2. Simulate embeddings (in real app, these come from embedding model)
    console.log('🧮 Adding mock embeddings...');
    const mockEmbeddings = doc.chunks.map(() => 
      // Generate random 768-dimension vectors (simulate real embeddings)
      Array.from({ length: 768 }, () => Math.random() * 2 - 1)
    );
    
    await ragDb.addEmbeddings(doc._id, mockEmbeddings, 'mock-model-v1');
    console.log('✅ Embeddings created');
    
    // 3. Create sample agent
    console.log('🤖 Creating sample agent...');
    const agent = await ragDb.db.createAgent({
      name: 'JavaScript Tutor',
      description: 'Helps with JavaScript concepts and best practices',
      systemPrompt: 'You are an expert JavaScript tutor. Use the provided context to give clear, accurate explanations with examples.',
      config: {
        temperature: 0.7,
        useRAG: true,
        documentFilters: ['javascript', 'programming'],
        ragPrompt: 'Context: {context}\n\nQuestion: {question}\n\nPlease explain this JavaScript concept clearly with examples:'
      },
      metadata: {
        category: 'education',
        tags: ['javascript', 'programming', 'tutor'],
        icon: 'graduation-cap',
        color: 'yellow'
      }
    });
    
    console.log('✅ Agent created:', agent.name);
    
    // 4. Simulate semantic search
    console.log('🔍 Testing semantic search...');
    const queryVector = Array.from({ length: 768 }, () => Math.random() * 2 - 1);
    const searchResults = await ragDb.semanticSearch(
      'What are closures in JavaScript?',
      queryVector,
      { limit: 3, threshold: 0.5 }
    );
    
    console.log('📊 Search results:', {
      query: searchResults.query,
      resultCount: searchResults.results.length,
      firstResult: searchResults.results[0]?.chunk.text.substring(0, 100) + '...'
    });
    
    // 5. Get RAG context
    const context = await ragDb.getRAGContext(
      'How do closures work?',
      queryVector,
      { limit: 2 }
    );
    
    console.log('📝 Generated context:', context.substring(0, 200) + '...');
    
    // 6. Create conversation
    console.log('💬 Creating conversation...');
    const conversation = await ragDb.db.createConversation({
      title: 'Learning JavaScript Closures',
      agentId: agent._id,
      messages: [
        {
          role: 'user',
          content: 'Can you explain JavaScript closures?',
          sources: [doc._id]
        },
        {
          role: 'assistant', 
          content: 'Based on the documentation, a closure is the combination of a function bundled together with references to its surrounding state...',
          sources: [doc._id]
        }
      ]
    });
    
    console.log('✅ Conversation created:', conversation._id);
    
    // 7. Get storage stats
    const stats = await ragDb.db.getStorageStats();
    console.log('💾 Storage stats:', stats);
    
    console.log('🎉 RAG Demo completed successfully!');
    
    return {
      document: doc,
      agent,
      conversation,
      searchResults,
      stats
    };
    
  } catch (error) {
    console.error('❌ RAG Demo failed:', error);
    throw error;
  }
}

/**
 * Integration helper for existing Cora app
 */
export class CoraRAGIntegration {
  constructor() {
    this.ragDb = null;
    this.initialized = false;
  }
  
  /**
   * Initialize RAG system
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      this.ragDb = await createRAGDatabase();
      this.initialized = true;
      console.log('✅ Cora RAG system initialized');
    } catch (error) {
      console.error('❌ Failed to initialize RAG system:', error);
      throw error;
    }
  }
  
  /**
   * Add document from file upload
   * @param {File} file - Uploaded file
   * @returns {Promise<Object>} Created document
   */
  async addDocumentFromFile(file) {
    if (!this.initialized) await this.initialize();
    
    const content = await this.readFileContent(file);
    return await this.ragDb.addDocument({
      title: file.name,
      content,
      contentType: file.type,
      size: file.size,
      metadata: {
        source: file.name,
        tags: [],
        language: 'en'
      }
    });
  }
  
  /**
   * Enhance chat message with RAG context
   * @param {string} userMessage - User's message
   * @param {Array<number>} queryVector - Message embedding
   * @returns {Promise<string>} Enhanced message with context
   */
  async enhanceWithRAG(userMessage, queryVector) {
    if (!this.initialized) return userMessage;
    
    try {
      const context = await this.ragDb.getRAGContext(userMessage, queryVector);
      
      if (context) {
        return `${context}\n\nUser Question: ${userMessage}`;
      }
      
      return userMessage;
    } catch (error) {
      console.warn('Failed to enhance with RAG:', error);
      return userMessage;
    }
  }
  
  /**
   * Read file content as text
   * @param {File} file - File to read
   * @returns {Promise<string>} File content
   * @private
   */
  async readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
}

// Export singleton
export default new CoraRAGIntegration();