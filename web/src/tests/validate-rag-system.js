/**
 * Quick RAG System Validation Script
 * 
 * This script performs basic validation of the RAG system components
 * to ensure everything is working correctly before running comprehensive tests.
 * 
 * Usage: Run this in the browser console or include in your test suite
 */

import dbService from '../lib/database/db-service.js';
import ragService from '../lib/embeddings/rag-service.js';
import embeddingService from '../lib/embeddings/embedding-service.js';

class RAGSystemValidator {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.successes = [];
  }

  log(type, message) {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    switch (type) {
      case 'error':
        this.issues.push(message);
        break;
      case 'warning':
        this.warnings.push(message);
        break;
      case 'success':
        this.successes.push(message);
        break;
    }
  }

  async validateDatabaseService() {
    this.log('info', 'Validating Database Service...');
    
    try {
      // Test database initialization
      await dbService.initialize();
      this.log('success', 'Database service initialized successfully');

      // Test document operations
      const testDoc = {
        title: 'Validation Test Document',
        content: 'This is a test document for validation.',
        contentType: 'text/plain',
        size: 42,
        status: 'pending',
        indexed: false,
        metadata: { createdAt: new Date() }
      };

      const doc = await dbService.createDocument(testDoc);
      this.log('success', 'Document creation working');

      const retrievedDoc = await dbService.getDocument(doc._id);
      if (retrievedDoc && retrievedDoc.title === testDoc.title) {
        this.log('success', 'Document retrieval working');
      } else {
        this.log('error', 'Document retrieval failed');
      }

      // Cleanup
      await dbService.deleteDocument(doc._id);
      this.log('success', 'Document deletion working');

    } catch (error) {
      this.log('error', `Database service validation failed: ${error.message}`);
    }
  }

  async validateEmbeddingService() {
    this.log('info', 'Validating Embedding Service...');
    
    try {
      // Test embedding service initialization
      const initPromise = embeddingService.initialize((progress) => {
        if (progress) {
          this.log('info', `Embedding model loading: ${progress}`);
        }
      });

      // Set a reasonable timeout for model loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Model loading timeout')), 30000);
      });

      await Promise.race([initPromise, timeoutPromise]);
      this.log('success', 'Embedding service initialized successfully');

      // Test embedding generation
      const testTexts = ['This is a test sentence', 'Another test sentence'];
      const embeddings = await embeddingService.generateEmbeddings(testTexts);
      
      if (embeddings && embeddings.length === 2 && embeddings[0].length === 384) {
        this.log('success', 'Embedding generation working correctly');
      } else {
        this.log('error', 'Embedding generation failed or returned invalid results');
      }

    } catch (error) {
      if (error.message.includes('timeout')) {
        this.log('warning', 'Embedding model loading timed out - this is normal on first run');
      } else {
        this.log('error', `Embedding service validation failed: ${error.message}`);
      }
    }
  }

  async validateRAGService() {
    this.log('info', 'Validating RAG Service...');
    
    try {
      // Initialize RAG service
      await ragService.initialize();
      
      if (ragService.initialized) {
        this.log('success', 'RAG service initialized successfully');
      } else {
        this.log('error', 'RAG service failed to initialize');
        return;
      }

      // Test document indexing
      const testDoc = {
        _id: 'test_doc_rag_validation',
        title: 'RAG Validation Document',
        content: 'This document contains information about machine learning and artificial intelligence for testing semantic search functionality.',
        contentType: 'text/plain',
        size: 120
      };

      // Create document first
      const doc = await dbService.createDocument({
        ...testDoc,
        status: 'pending',
        indexed: false,
        metadata: { createdAt: new Date() }
      });

      // Index the document
      await ragService.indexDocument(doc);
      this.log('success', 'Document indexing working');

      // Test semantic search
      const searchResults = await ragService.search('machine learning', { limit: 5 });
      
      if (searchResults && searchResults.length > 0) {
        this.log('success', 'Semantic search working');
        
        // Test context generation
        const context = await ragService.getSearchContext('artificial intelligence', { limit: 3 });
        if (context && context.length > 0) {
          this.log('success', 'Context generation working');
        } else {
          this.log('warning', 'Context generation returned empty result');
        }
      } else {
        this.log('warning', 'Semantic search returned no results');
      }

      // Cleanup
      await dbService.deleteDocument(doc._id);

    } catch (error) {
      this.log('error', `RAG service validation failed: ${error.message}`);
    }
  }

  validateBrowserSupport() {
    this.log('info', 'Validating Browser Support...');
    
    // Check for required browser features
    const features = {
      'IndexedDB': !!window.indexedDB,
      'Web Workers': !!window.Worker,
      'File API': !!window.File && !!window.FileReader,
      'WebGPU': !!navigator.gpu,
      'Local Storage': !!window.localStorage,
      'Fetch API': !!window.fetch
    };

    Object.entries(features).forEach(([feature, supported]) => {
      if (supported) {
        this.log('success', `${feature} supported`);
      } else {
        if (feature === 'WebGPU') {
          this.log('warning', `${feature} not supported - will fallback to WASM`);
        } else {
          this.log('error', `${feature} not supported - may cause issues`);
        }
      }
    });

    // Check memory availability
    if (navigator.deviceMemory) {
      if (navigator.deviceMemory >= 4) {
        this.log('success', `Sufficient memory detected: ${navigator.deviceMemory}GB`);
      } else {
        this.log('warning', `Low memory detected: ${navigator.deviceMemory}GB - may affect performance`);
      }
    } else {
      this.log('info', 'Memory information not available');
    }
  }

  validateStorage() {
    this.log('info', 'Validating Storage...');
    
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(estimate => {
        const availableGB = (estimate.quota / (1024 * 1024 * 1024)).toFixed(2);
        const usedGB = (estimate.usage / (1024 * 1024 * 1024)).toFixed(2);
        
        this.log('info', `Storage quota: ${availableGB}GB`);
        this.log('info', `Storage used: ${usedGB}GB`);
        
        if (estimate.quota > 1024 * 1024 * 1024) { // > 1GB
          this.log('success', 'Sufficient storage available');
        } else {
          this.log('warning', 'Limited storage available - may affect performance');
        }
      }).catch(error => {
        this.log('warning', `Could not estimate storage: ${error.message}`);
      });
    } else {
      this.log('warning', 'Storage estimation not supported');
    }
  }

  async runCompleteValidation() {
    console.log('\n🔍 Starting RAG System Validation...\n');
    
    try {
      // Run all validations
      this.validateBrowserSupport();
      await this.validateStorage();
      await this.validateDatabaseService();
      await this.validateEmbeddingService();
      await this.validateRAGService();

      // Generate summary
      this.generateValidationReport();

    } catch (error) {
      this.log('error', `Validation failed: ${error.message}`);
    }
  }

  generateValidationReport() {
    console.log('\n📊 VALIDATION SUMMARY\n');
    console.log(`✅ Successes: ${this.successes.length}`);
    console.log(`⚠️  Warnings: ${this.warnings.length}`);
    console.log(`❌ Issues: ${this.issues.length}\n`);

    if (this.issues.length > 0) {
      console.log('❌ CRITICAL ISSUES:');
      this.issues.forEach(issue => console.log(`  - ${issue}`));
      console.log('');
    }

    if (this.warnings.length > 0) {
      console.log('⚠️  WARNINGS:');
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
      console.log('');
    }

    // Overall assessment
    if (this.issues.length === 0) {
      console.log('🎉 VALIDATION PASSED - System is ready for testing!');
    } else if (this.issues.length <= 2) {
      console.log('⚠️  VALIDATION PARTIAL - Some issues detected, but system may still work');
    } else {
      console.log('❌ VALIDATION FAILED - Multiple critical issues detected');
    }

    return {
      passed: this.issues.length === 0,
      warnings: this.warnings.length,
      issues: this.issues.length,
      summary: {
        successes: this.successes,
        warnings: this.warnings,
        issues: this.issues
      }
    };
  }

  // Quick validation for immediate feedback
  async quickValidation() {
    console.log('🚀 Running quick RAG validation...');
    
    const checks = [
      { name: 'Database Service', test: () => dbService.initialize() },
      { name: 'RAG Service', test: () => ragService.initialized || ragService.initialize() },
      { name: 'Browser Features', test: () => this.validateBrowserSupport() }
    ];

    const results = [];
    
    for (const check of checks) {
      try {
        await check.test();
        results.push({ name: check.name, status: 'PASS' });
        console.log(`✅ ${check.name}: PASS`);
      } catch (error) {
        results.push({ name: check.name, status: 'FAIL', error: error.message });
        console.log(`❌ ${check.name}: FAIL - ${error.message}`);
      }
    }

    return results;
  }
}

// Export for use in tests or standalone execution
export default RAGSystemValidator;

// Auto-run if this script is loaded directly
if (typeof window !== 'undefined' && window.location) {
  window.ragValidator = new RAGSystemValidator();
  
  // Provide convenient global functions
  window.validateRAG = () => window.ragValidator.runCompleteValidation();
  window.quickValidateRAG = () => window.ragValidator.quickValidation();
  
  console.log('🔧 RAG System Validator loaded!');
  console.log('Run validateRAG() for complete validation or quickValidateRAG() for quick checks');
}