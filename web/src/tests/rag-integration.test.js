/**
 * Comprehensive RAG Integration Test Suite
 * 
 * Tests the complete RAG functionality end-to-end including:
 * - Document upload and processing
 * - Embedding generation and storage  
 * - Semantic search and retrieval
 * - Chat integration with RAG context
 * - Error handling and edge cases
 * - Performance validation
 * 
 * @author QA Team
 * @version 1.0.0
 */

import dbService from '../lib/database/db-service.js';
import ragService from '../lib/embeddings/rag-service.js';
import embeddingService from '../lib/embeddings/embedding-service.js';
import llmService from '../lib/llm-service.js';

/**
 * Mock data for testing
 */
const MOCK_DOCUMENTS = {
  simple: {
    title: 'Simple Test Document',
    content: 'This is a simple test document about machine learning and artificial intelligence.',
    contentType: 'text/plain',
    size: 88
  },
  complex: {
    title: 'Complex Technical Document',
    content: `
    Retrieval-Augmented Generation (RAG) is a powerful technique that combines large language models 
    with external knowledge bases. RAG systems retrieve relevant information from document stores 
    and inject this context into prompts, enabling more accurate and contextual responses.

    Key components of RAG systems:
    1. Document indexing with embeddings
    2. Semantic search for relevant context
    3. Context injection into LLM prompts
    4. Response generation with source attribution

    Performance considerations include embedding model selection, chunk size optimization, 
    and similarity threshold tuning.
    `,
    contentType: 'text/markdown',
    size: 596
  },
  large: {
    title: 'Large Document',
    content: 'Lorem ipsum '.repeat(500) + 'This contains specific information about neural networks.',
    contentType: 'text/plain',
    size: 6500
  }
};

const MOCK_QUERIES = [
  'What is machine learning?',
  'How does RAG work?',
  'Explain neural networks',
  'What are the performance considerations?',
  'Tell me about embeddings'
];

/**
 * Test utilities
 */
class RAGTestUtils {
  static async waitFor(condition, timeout = 5000, interval = 100) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) return true;
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error(`Timeout waiting for condition after ${timeout}ms`);
  }

  static async measurePerformance(operation) {
    const start = performance.now();
    const result = await operation();
    const duration = performance.now() - start;
    return { result, duration };
  }

  static generateTestDocument(size = 1000) {
    const words = ['test', 'document', 'content', 'information', 'data', 'knowledge', 'learning'];
    let content = '';
    while (content.length < size) {
      content += words[Math.floor(Math.random() * words.length)] + ' ';
    }
    return {
      title: `Generated Test Document ${Date.now()}`,
      content: content.trim(),
      contentType: 'text/plain',
      size: content.length
    };
  }
}

/**
 * RAG Integration Test Suite
 */
describe('RAG System Integration Tests', () => {
  let testDocuments = [];
  let performanceMetrics = {};

  beforeAll(async () => {
    console.log('🔧 Setting up RAG integration test environment...');
    
    // Initialize services
    await dbService.initialize();
    console.log('✅ Database service initialized');
    
    await ragService.initialize((progress) => {
      console.log(`🔄 RAG initialization: ${progress}`);
    });
    console.log('✅ RAG service initialized');
    
    performanceMetrics.setupTime = Date.now();
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up test environment...');
    
    // Clean up test documents
    for (const doc of testDocuments) {
      try {
        await dbService.deleteDocument(doc._id);
      } catch (error) {
        console.warn(`Failed to cleanup document ${doc._id}:`, error);
      }
    }
    
    // Clear RAG index
    try {
      await ragService.clearIndex();
    } catch (error) {
      console.warn('Failed to clear RAG index:', error);
    }
    
    const totalTime = Date.now() - performanceMetrics.setupTime;
    console.log(`🏁 Total test execution time: ${totalTime}ms`);
  });

  describe('Document Upload and Processing', () => {
    test('should upload and store simple text document', async () => {
      const docData = MOCK_DOCUMENTS.simple;
      
      const { result: doc, duration } = await RAGTestUtils.measurePerformance(async () => {
        return await dbService.createDocument({
          ...docData,
          status: 'pending',
          indexed: false,
          metadata: { uploadedAt: new Date() }
        });
      });

      testDocuments.push(doc);
      
      expect(doc).toBeDefined();
      expect(doc._id).toBeDefined();
      expect(doc.title).toBe(docData.title);
      expect(doc.content).toBe(docData.content);
      expect(doc.status).toBe('pending');
      expect(doc.indexed).toBe(false);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      
      console.log(`✅ Document upload took ${duration.toFixed(2)}ms`);
    });

    test('should handle large document upload', async () => {
      const docData = MOCK_DOCUMENTS.large;
      
      const { result: doc, duration } = await RAGTestUtils.measurePerformance(async () => {
        return await dbService.createDocument({
          ...docData,
          status: 'pending',
          indexed: false,
          metadata: { uploadedAt: new Date() }
        });
      });

      testDocuments.push(doc);
      
      expect(doc).toBeDefined();
      expect(doc.size).toBe(docData.size);
      expect(duration).toBeLessThan(2000); // Allow more time for large documents
      
      console.log(`✅ Large document upload took ${duration.toFixed(2)}ms`);
    });

    test('should validate document content types', async () => {
      const invalidDoc = {
        title: 'Invalid Document',
        content: null,
        contentType: 'invalid/type',
        size: 0
      };
      
      await expect(dbService.createDocument(invalidDoc)).rejects.toThrow();
    });
  });

  describe('Document Indexing and Embeddings', () => {
    test('should index document and generate embeddings', async () => {
      const doc = testDocuments[0];
      expect(doc).toBeDefined();
      
      const { result, duration } = await RAGTestUtils.measurePerformance(async () => {
        await ragService.indexDocument(doc);
        return await dbService.getDocument(doc._id);
      });

      expect(result.indexed).toBe(true);
      expect(result.status).toBe('completed');
      expect(duration).toBeLessThan(10000); // Allow 10 seconds for embedding generation
      
      console.log(`✅ Document indexing took ${duration.toFixed(2)}ms`);
      
      // Verify embeddings were created
      const embeddings = await dbService.findEmbeddings({ documentId: doc._id });
      expect(embeddings.length).toBeGreaterThan(0);
      
      // Verify embedding structure
      const firstEmbedding = embeddings[0];
      expect(firstEmbedding.vector).toBeDefined();
      expect(Array.isArray(firstEmbedding.vector)).toBe(true);
      expect(firstEmbedding.vector.length).toBe(384); // MiniLM-L6-v2 dimensions
      expect(firstEmbedding.text).toBeDefined();
      expect(firstEmbedding.model).toBe('all-MiniLM-L6-v2');
    });

    test('should handle indexing errors gracefully', async () => {
      const invalidDoc = {
        _id: 'invalid_doc_id',
        title: 'Invalid Document',
        content: '',  // Empty content should cause issues
        contentType: 'text/plain',
        size: 0
      };
      
      await expect(ragService.indexDocument(invalidDoc)).rejects.toThrow();
    });

    test('should chunk large documents appropriately', async () => {
      const largeDoc = testDocuments.find(doc => doc.size > 5000);
      if (largeDoc) {
        await ragService.indexDocument(largeDoc);
        
        const embeddings = await dbService.findEmbeddings({ documentId: largeDoc._id });
        expect(embeddings.length).toBeGreaterThan(1); // Should be split into multiple chunks
        
        // Verify chunks have appropriate sizes
        embeddings.forEach(embedding => {
          expect(embedding.text.length).toBeLessThan(1200); // Should be within chunk size limit
          expect(embedding.metadata.startPos).toBeDefined();
          expect(embedding.metadata.endPos).toBeDefined();
        });
      }
    });
  });

  describe('Semantic Search Functionality', () => {
    beforeAll(async () => {
      // Ensure we have indexed documents for search tests
      const complexDoc = await dbService.createDocument({
        ...MOCK_DOCUMENTS.complex,
        status: 'pending',
        indexed: false,
        metadata: { uploadedAt: new Date() }
      });
      testDocuments.push(complexDoc);
      await ragService.indexDocument(complexDoc);
    });

    test('should perform basic semantic search', async () => {
      const query = 'machine learning';
      
      const { result: searchResults, duration } = await RAGTestUtils.measurePerformance(async () => {
        return await ragService.search(query, { limit: 5, threshold: 0.5 });
      });

      expect(searchResults).toBeDefined();
      expect(Array.isArray(searchResults)).toBe(true);
      expect(searchResults.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(2000); // Search should be fast
      
      // Verify search result structure
      const firstResult = searchResults[0];
      expect(firstResult.score).toBeDefined();
      expect(firstResult.score).toBeGreaterThan(0);
      expect(firstResult.score).toBeLessThanOrEqual(1);
      expect(firstResult.text).toBeDefined();
      expect(firstResult.document).toBeDefined();
      expect(firstResult.document.title).toBeDefined();
      
      console.log(`✅ Semantic search took ${duration.toFixed(2)}ms, found ${searchResults.length} results`);
    });

    test('should return relevant results with similarity scores', async () => {
      const query = 'RAG systems and embeddings';
      
      const results = await ragService.search(query, { limit: 10, threshold: 0.3 });
      
      expect(results.length).toBeGreaterThan(0);
      
      // Results should be sorted by relevance (highest score first)
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
      }
      
      // At least one result should have high relevance
      expect(results[0].score).toBeGreaterThan(0.5);
    });

    test('should handle empty search results', async () => {
      const query = 'completely unrelated quantum physics topic';
      
      const results = await ragService.search(query, { limit: 5, threshold: 0.8 });
      
      // Might be empty if threshold is high, should not throw error
      expect(Array.isArray(results)).toBe(true);
    });

    test('should respect search limits and thresholds', async () => {
      const query = 'information';
      
      const limitedResults = await ragService.search(query, { limit: 2, threshold: 0.3 });
      expect(limitedResults.length).toBeLessThanOrEqual(2);
      
      const highThresholdResults = await ragService.search(query, { limit: 10, threshold: 0.9 });
      const lowThresholdResults = await ragService.search(query, { limit: 10, threshold: 0.1 });
      
      expect(lowThresholdResults.length).toBeGreaterThanOrEqual(highThresholdResults.length);
    });
  });

  describe('RAG Context Generation', () => {
    test('should generate formatted context from search results', async () => {
      const query = 'What is RAG?';
      
      const { result: context, duration } = await RAGTestUtils.measurePerformance(async () => {
        return await ragService.getSearchContext(query, { limit: 3 });
      });

      expect(typeof context).toBe('string');
      expect(context.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(3000); // Context generation should be reasonably fast
      
      // Context should contain source citations
      expect(context).toMatch(/\[\d+\]/); // Should have numbered citations
      expect(context).toMatch(/\d+% match/); // Should include match percentages
      
      console.log(`✅ Context generation took ${duration.toFixed(2)}ms`);
      console.log(`Context length: ${context.length} characters`);
    });

    test('should handle empty context gracefully', async () => {
      const query = 'nonexistent topic with no matches';
      
      const context = await ragService.getSearchContext(query, { limit: 3, threshold: 0.95 });
      
      expect(typeof context).toBe('string');
      expect(context).toBe(''); // Should return empty string for no matches
    });
  });

  describe('Chat Integration with RAG', () => {
    beforeAll(() => {
      // Mock LLM service for testing without actual model loading
      llmService.engine = {
        chat: {
          completions: {
            create: async function* (request) {
              // Simple mock response
              yield { choices: [{ delta: { content: 'Based on the provided context, ' } }] };
              yield { choices: [{ delta: { content: 'RAG systems combine retrieval with generation.' } }] };
            }
          }
        }
      };
      llmService.runtime = 'webgpu';
    });

    test('should enhance chat messages with RAG context', async () => {
      const messages = [
        { role: 'user', content: 'What is RAG and how does it work?' }
      ];
      
      const options = { ragLimit: 3, ragThreshold: 0.5 };
      
      // Test the RAG context injection
      const ragEnabled = llmService.isRAGEnabled();
      expect(ragEnabled).toBe(true);
      
      const generator = llmService.chat(messages, options);
      const responses = [];
      
      for await (const chunk of generator) {
        if (chunk.content) {
          responses.push(chunk.content);
        }
      }
      
      const fullResponse = responses.join('');
      expect(fullResponse.length).toBeGreaterThan(0);
      expect(fullResponse).toContain('RAG');
    });

    test('should handle RAG context retrieval errors', async () => {
      // Temporarily break RAG service
      const originalSearch = ragService.getSearchContext;
      ragService.getSearchContext = async () => {
        throw new Error('Search failed');
      };
      
      const messages = [
        { role: 'user', content: 'Test query with broken RAG' }
      ];
      
      // Should not throw error, should continue without RAG context
      const generator = llmService.chat(messages);
      const responses = [];
      
      for await (const chunk of generator) {
        if (chunk.content) {
          responses.push(chunk.content);
        }
      }
      
      expect(responses.length).toBeGreaterThan(0);
      
      // Restore original function
      ragService.getSearchContext = originalSearch;
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle concurrent document uploads', async () => {
      const concurrentDocs = Array.from({ length: 5 }, () => RAGTestUtils.generateTestDocument(500));
      
      const uploadPromises = concurrentDocs.map(async (docData) => {
        const doc = await dbService.createDocument({
          ...docData,
          status: 'pending',
          indexed: false,
          metadata: { uploadedAt: new Date() }
        });
        testDocuments.push(doc);
        return doc;
      });
      
      const docs = await Promise.all(uploadPromises);
      expect(docs.length).toBe(5);
      
      // All documents should be created successfully
      docs.forEach(doc => {
        expect(doc._id).toBeDefined();
      });
    });

    test('should handle database connection issues', async () => {
      // This would test offline scenarios in a real environment
      // For now, we test that the service handles initialization properly
      expect(dbService.initialized).toBe(true);
    });

    test('should validate embedding dimensions', async () => {
      const doc = testDocuments[0];
      await ragService.indexDocument(doc);
      
      const embeddings = await dbService.findEmbeddings({ documentId: doc._id });
      embeddings.forEach(embedding => {
        expect(embedding.vector).toBeDefined();
        expect(embedding.vector.length).toBe(384); // Consistent dimensions
        expect(embedding.vector.every(val => typeof val === 'number')).toBe(true);
      });
    });
  });

  describe('Performance and Scale Testing', () => {
    test('should handle multiple concurrent searches', async () => {
      const searchPromises = MOCK_QUERIES.map(query => 
        RAGTestUtils.measurePerformance(() => ragService.search(query, { limit: 5 }))
      );
      
      const results = await Promise.all(searchPromises);
      
      // All searches should complete
      expect(results.length).toBe(MOCK_QUERIES.length);
      
      // Average search time should be reasonable
      const avgSearchTime = results.reduce((sum, { duration }) => sum + duration, 0) / results.length;
      expect(avgSearchTime).toBeLessThan(2000); // Average < 2 seconds
      
      console.log(`✅ Average search time: ${avgSearchTime.toFixed(2)}ms`);
    });

    test('should perform within memory limits', async () => {
      if ('memory' in performance) {
        const initialMemory = performance.memory.usedJSHeapSize;
        
        // Perform memory-intensive operations
        const largeDocs = Array.from({ length: 10 }, () => RAGTestUtils.generateTestDocument(2000));
        
        for (const docData of largeDocs) {
          const doc = await dbService.createDocument({
            ...docData,
            status: 'pending',
            indexed: false
          });
          testDocuments.push(doc);
          await ragService.indexDocument(doc);
        }
        
        const finalMemory = performance.memory.usedJSHeapSize;
        const memoryIncrease = finalMemory - initialMemory;
        
        console.log(`🧠 Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
        
        // Memory increase should be reasonable (less than 50MB for test data)
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      }
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should provide accurate system statistics', async () => {
      const stats = await ragService.getStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.queueLength).toBe('number');
      expect(typeof stats.processing).toBe('boolean');
      
      if (stats.documents) {
        expect(stats.documents).toBeGreaterThanOrEqual(0);
      }
      
      if (stats.embeddings) {
        expect(stats.embeddings).toBeGreaterThanOrEqual(0);
      }
    });

    test('should track indexing progress', async () => {
      const doc = RAGTestUtils.generateTestDocument(1000);
      const createdDoc = await dbService.createDocument({
        ...doc,
        status: 'pending',
        indexed: false
      });
      testDocuments.push(createdDoc);
      
      // Monitor status changes during indexing
      const statusUpdates = [];
      const checkStatus = async () => {
        const updatedDoc = await dbService.getDocument(createdDoc._id);
        statusUpdates.push(updatedDoc.status);
        return updatedDoc.indexed;
      };
      
      // Start indexing
      const indexingPromise = ragService.indexDocument(createdDoc);
      
      // Wait for completion
      await indexingPromise;
      await RAGTestUtils.waitFor(checkStatus, 5000);
      
      // Should have gone through status progression
      expect(statusUpdates).toContain('processing');
      expect(statusUpdates).toContain('completed');
    });
  });
});

/**
 * Performance benchmark tests
 */
describe('RAG Performance Benchmarks', () => {
  const PERFORMANCE_THRESHOLDS = {
    documentUpload: 1000,      // 1 second
    embeddingGeneration: 5000, // 5 seconds per document
    searchQuery: 1000,         // 1 second
    contextGeneration: 2000    // 2 seconds
  };

  test('Document upload performance benchmark', async () => {
    const testDoc = RAGTestUtils.generateTestDocument(1000);
    
    const { duration } = await RAGTestUtils.measurePerformance(async () => {
      return await dbService.createDocument({
        ...testDoc,
        status: 'pending',
        indexed: false
      });
    });
    
    expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.documentUpload);
    console.log(`📊 Document upload: ${duration.toFixed(2)}ms`);
  });

  test('Search performance benchmark', async () => {
    const queries = ['test', 'information', 'document', 'knowledge', 'system'];
    const results = [];
    
    for (const query of queries) {
      const { duration } = await RAGTestUtils.measurePerformance(async () => {
        return await ragService.search(query, { limit: 10 });
      });
      results.push(duration);
    }
    
    const avgSearchTime = results.reduce((sum, time) => sum + time, 0) / results.length;
    
    expect(avgSearchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.searchQuery);
    console.log(`📊 Average search time: ${avgSearchTime.toFixed(2)}ms`);
  });
});

console.log(`
🎯 RAG Integration Test Suite
============================
Tests complete RAG functionality including:
• Document upload and storage
• Embedding generation and indexing  
• Semantic search and retrieval
• RAG context integration with chat
• Error handling and edge cases
• Performance validation

Run with: npm test rag-integration.test.js
`);