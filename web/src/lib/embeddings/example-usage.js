/**
 * Example usage of the embedding and RAG services
 * Demonstrates how to integrate browser-based embeddings with the Cora application
 */

import { embeddingService, ragService } from './index.js';
import dbService from '../database/db-service.js';

/**
 * Example: Initialize and use embedding service
 */
export async function embeddingExample() {
  try {
    console.log('🚀 Initializing embedding service...');
    
    // Initialize with progress tracking
    await embeddingService.initialize((progress) => {
      console.log(`Loading progress: ${Math.round(progress.progress * 100)}% - ${progress.message}`);
    });

    console.log('✅ Embedding service ready');

    // Generate embedding for a single text
    const text = "Machine learning is transforming how we process information";
    const embedding = await embeddingService.generateEmbeddings(text);
    
    console.log(`📊 Generated embedding with ${embedding.length} dimensions`);
    console.log(`First 5 values: [${embedding.slice(0, 5).map(n => n.toFixed(4)).join(', ')}...]`);

    // Generate embeddings for multiple texts
    const texts = [
      "Natural language processing enables computers to understand human language",
      "Computer vision helps machines interpret visual information",
      "Deep learning uses neural networks with multiple layers"
    ];

    const embeddings = await embeddingService.generateEmbeddings(texts);
    console.log(`📚 Generated ${embeddings.length} embeddings`);

    // Calculate similarity between texts
    const similarity = embeddingService.cosineSimilarity(embeddings[0], embeddings[2]);
    console.log(`🔍 Similarity between first and third text: ${(similarity * 100).toFixed(1)}%`);

    // Demonstrate text chunking
    const longText = `
      Artificial Intelligence (AI) represents one of the most significant technological advances of our time. 
      It encompasses various subfields including machine learning, natural language processing, computer vision, 
      and robotics. Machine learning enables systems to learn from data without explicit programming. 
      Deep learning, a subset of machine learning, uses neural networks with multiple layers to model complex patterns.
      Natural language processing focuses on enabling computers to understand, interpret, and generate human language.
      Computer vision allows machines to interpret and understand visual information from images and videos.
      These technologies are transforming industries from healthcare to finance to transportation.
    `;

    const chunks = embeddingService.chunkText(longText, {
      chunkSize: 200,
      overlap: 50,
      minChunkSize: 50
    });

    console.log(`📄 Split text into ${chunks.length} chunks:`);
    chunks.forEach((chunk, index) => {
      console.log(`  Chunk ${index + 1}: ${chunk.text.substring(0, 50)}... (${chunk.tokenCount} tokens)`);
    });

  } catch (error) {
    console.error('❌ Embedding example failed:', error);
  }
}

/**
 * Example: Use RAG service for document indexing and search
 */
export async function ragExample() {
  try {
    console.log('🚀 Initializing RAG service...');
    
    // Initialize RAG service (includes database and embeddings)
    await ragService.initialize((progress) => {
      console.log(`RAG loading: ${Math.round(progress.progress * 100)}% - ${progress.message}`);
    });

    console.log('✅ RAG service ready');

    // Create sample documents
    const documents = [
      {
        title: "Introduction to Machine Learning",
        content: `Machine learning is a method of data analysis that automates analytical model building. 
                 It is a branch of artificial intelligence based on the idea that systems can learn from data, 
                 identify patterns and make decisions with minimal human intervention. Common applications include 
                 recommendation systems, fraud detection, and image recognition.`,
        contentType: "text/plain",
        metadata: {
          source: "ml-guide.txt",
          tags: ["machine-learning", "ai", "tutorial"],
          language: "en"
        }
      },
      {
        title: "Natural Language Processing Basics",
        content: `Natural Language Processing (NLP) is a field of artificial intelligence that focuses on 
                 the interaction between computers and humans using natural language. The ultimate objective 
                 of NLP is to read, decipher, understand, and make sense of the human languages in a manner 
                 that is valuable. Key techniques include tokenization, sentiment analysis, and language translation.`,
        contentType: "text/plain",
        metadata: {
          source: "nlp-basics.txt",
          tags: ["nlp", "language", "processing"],
          language: "en"
        }
      }
    ];

    console.log('📚 Creating and indexing documents...');

    // Create documents in database
    const createdDocs = [];
    for (const docData of documents) {
      const doc = await dbService.createDocument(docData);
      createdDocs.push(doc);
      console.log(`Created document: ${doc.title}`);
    }

    // Index documents for search
    for (const doc of createdDocs) {
      await ragService.indexDocument(doc, {
        chunkSize: 500,
        overlap: 50
      });
      console.log(`✅ Indexed: ${doc.title}`);
    }

    // Perform semantic search
    const queries = [
      "What is machine learning?",
      "How do computers understand language?",
      "Applications of AI"
    ];

    console.log('🔍 Performing semantic search...');

    for (const query of queries) {
      console.log(`\nQuery: "${query}"`);
      
      const results = await ragService.search(query, {
        limit: 3,
        threshold: 0.5,
        contextSize: 100
      });

      if (results.length > 0) {
        results.forEach((result, index) => {
          console.log(`  ${index + 1}. ${result.document.title} (${(result.score * 100).toFixed(1)}% match)`);
          console.log(`     "${result.text.substring(0, 100)}..."`);
        });
      } else {
        console.log('  No relevant results found');
      }
    }

    // Get RAG context for a query (useful for LLM prompts)
    const context = await ragService.getSearchContext("machine learning applications", {
      limit: 2,
      threshold: 0.4
    });

    console.log('\n📝 RAG Context Example:');
    console.log(context);

    // Show service statistics
    const stats = await ragService.getStats();
    console.log('\n📊 RAG Service Statistics:');
    console.log(`  Documents: ${stats.documents || 0}`);
    console.log(`  Embeddings: ${stats.embeddings || 0}`);
    console.log(`  Queue length: ${stats.queueLength}`);
    console.log(`  Model loaded: ${stats.embeddingService.initialized}`);

  } catch (error) {
    console.error('❌ RAG example failed:', error);
  }
}

/**
 * Example: Performance and fallback testing
 */
export async function performanceExample() {
  try {
    console.log('🚀 Testing embedding service performance...');

    // Test batch processing
    const batchTexts = Array.from({ length: 20 }, (_, i) => 
      `This is test text number ${i + 1} for batch processing evaluation.`
    );

    console.time('Batch Embedding Generation');
    const batchEmbeddings = await embeddingService.generateEmbeddings(batchTexts, {
      batchSize: 5
    });
    console.timeEnd('Batch Embedding Generation');

    console.log(`✅ Generated ${batchEmbeddings.length} embeddings in batch`);

    // Test caching
    console.time('Cached Embedding Generation');
    const cachedEmbeddings = await embeddingService.generateEmbeddings(batchTexts.slice(0, 5));
    console.timeEnd('Cached Embedding Generation');

    console.log('✅ Cached embeddings retrieved faster');

    // Test fallback mode
    console.log('🔄 Testing fallback mode...');
    
    const fallbackEmbeddings = await embeddingService.generateEmbeddings([
      "Test fallback embedding generation"
    ], {
      fallback: true,
      autoInitialize: false // This should trigger fallback if model not loaded
    });

    console.log(`✅ Fallback generated ${fallbackEmbeddings[0].length}D vector`);

    // Test service status
    const status = embeddingService.getStatus();
    console.log('\n📊 Service Status:');
    console.log(`  Model: ${status.modelName}`);
    console.log(`  Dimensions: ${status.dimensions}`);
    console.log(`  Cache sizes: ${status.cacheSize.embeddings} embeddings, ${status.cacheSize.texts} texts`);

  } catch (error) {
    console.error('❌ Performance example failed:', error);
  }
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('🎯 Running embedding service examples...\n');
  
  await embeddingExample();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await ragExample();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await performanceExample();
  
  console.log('\n✅ All examples completed!');
}

// Auto-run examples if this file is executed directly
if (typeof window !== 'undefined' && window.location) {
  // Browser environment - examples can be run manually
  window.embeddingExamples = {
    runAll: runAllExamples,
    embedding: embeddingExample,
    rag: ragExample,
    performance: performanceExample
  };
  
  console.log('🔧 Embedding examples available at: window.embeddingExamples');
}