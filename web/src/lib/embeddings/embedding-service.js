/**
 * Browser-based embedding service using Transformers.js
 * Provides 100% client-side text embeddings with all-MiniLM-L6-v2 model
 */

import { pipeline, env } from '@xenova/transformers';

// Configure Transformers.js for browser environment
env.allowRemoteModels = false;
env.allowLocalModels = true;

/**
 * Embedding service class for generating text embeddings in the browser
 */
class EmbeddingService {
  constructor() {
    this.model = null;
    this.modelName = 'Xenova/all-MiniLM-L6-v2';
    this.dimensions = 384;
    this.isLoading = false;
    this.loadingPromise = null;
    this.maxSequenceLength = 256; // MiniLM max sequence length
    this.batchSize = 8;
    
    // Cache for preprocessed text
    this.textCache = new Map();
    this.embedCache = new Map();
    
    // Progress tracking
    this.loadProgress = 0;
    this.onProgress = null;
  }

  /**
   * Initialize the embedding model with progress tracking
   * @param {function} progressCallback - Callback for loading progress (0-1)
   * @returns {Promise<void>}
   */
  async initialize(progressCallback = null) {
    if (this.model) return;
    if (this.isLoading) return this.loadingPromise;

    this.onProgress = progressCallback;
    this.isLoading = true;
    
    this.loadingPromise = this._loadModel();
    
    try {
      await this.loadingPromise;
      console.log('Embedding model loaded successfully');
    } catch (error) {
      console.error('Failed to load embedding model:', error);
      this.isLoading = false;
      this.loadingPromise = null;
      throw new Error(`Embedding model initialization failed: ${error.message}`);
    }
    
    this.isLoading = false;
    return this.loadingPromise;
  }

  /**
   * Load the embedding model with progress tracking
   * @private
   */
  async _loadModel() {
    try {
      // Report initial progress
      this._reportProgress(0.1, 'Loading embedding model...');

      this.model = await pipeline('feature-extraction', this.modelName, {
        quantized: true, // Use quantized model for better performance
        progress_callback: (data) => {
          if (data.status === 'downloading') {
            const progress = 0.1 + (data.progress || 0) * 0.8;
            this._reportProgress(progress, `Downloading model: ${Math.round(progress * 100)}%`);
          } else if (data.status === 'loading') {
            this._reportProgress(0.9, 'Loading model into memory...');
          }
        }
      });

      // Final progress
      this._reportProgress(1.0, 'Model ready');
      
    } catch (error) {
      throw new Error(`Model loading failed: ${error.message}`);
    }
  }

  /**
   * Report loading progress
   * @param {number} progress - Progress value (0-1)
   * @param {string} message - Status message
   * @private
   */
  _reportProgress(progress, message) {
    this.loadProgress = progress;
    if (this.onProgress) {
      this.onProgress({ progress, message });
    }
  }

  /**
   * Generate embeddings for text or array of texts
   * @param {string|Array<string>} texts - Input text(s)
   * @param {Object} options - Generation options
   * @returns {Promise<Array<number>|Array<Array<number>>>} Embedding vector(s)
   */
  async generateEmbeddings(texts, options = {}) {
    if (!this.model) {
      if (options.autoInitialize !== false) {
        await this.initialize();
      } else {
        throw new Error('Model not initialized. Call initialize() first.');
      }
    }

    const isArray = Array.isArray(texts);
    const textArray = isArray ? texts : [texts];
    
    if (textArray.length === 0) {
      return isArray ? [] : null;
    }

    try {
      // Process texts in batches for memory efficiency
      const embeddings = [];
      const batchSize = options.batchSize || this.batchSize;
      
      for (let i = 0; i < textArray.length; i += batchSize) {
        const batch = textArray.slice(i, i + batchSize);
        const batchEmbeddings = await this._processBatch(batch);
        embeddings.push(...batchEmbeddings);
      }

      return isArray ? embeddings : embeddings[0];
      
    } catch (error) {
      console.error('Embedding generation failed:', error);
      
      // Fallback to hash-based similarity if model fails
      if (options.fallback !== false) {
        console.warn('Falling back to hash-based embeddings');
        return this._generateHashEmbeddings(textArray, isArray);
      }
      
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Process a batch of texts through the model
   * @param {Array<string>} batch - Batch of texts
   * @returns {Promise<Array<Array<number>>>} Batch embeddings
   * @private
   */
  async _processBatch(batch) {
    // Preprocess texts
    const processedTexts = batch.map(text => this._preprocessText(text));
    
    // Check cache first
    const embeddings = [];
    const uncachedTexts = [];
    const uncachedIndices = [];
    
    processedTexts.forEach((text, index) => {
      const cached = this.embedCache.get(text);
      if (cached) {
        embeddings[index] = cached;
      } else {
        uncachedTexts.push(text);
        uncachedIndices.push(index);
      }
    });
    
    // Generate embeddings for uncached texts
    if (uncachedTexts.length > 0) {
      try {
        const outputs = await this.model(uncachedTexts, {
          pooling: 'mean',
          normalize: true
        });
        
        // Extract embeddings and cache them
        uncachedIndices.forEach((originalIndex, batchIndex) => {
          const embedding = Array.from(outputs[batchIndex].data);
          
          // Verify dimensions
          if (embedding.length !== this.dimensions) {
            console.warn(`Unexpected embedding dimensions: ${embedding.length} vs ${this.dimensions}`);
          }
          
          embeddings[originalIndex] = embedding;
          this.embedCache.set(processedTexts[originalIndex], embedding);
        });
        
        // Manage cache size
        if (this.embedCache.size > 1000) {
          this._pruneCache();
        }
        
      } catch (error) {
        throw new Error(`Model inference failed: ${error.message}`);
      }
    }
    
    return embeddings;
  }

  /**
   * Preprocess text for consistent embeddings
   * @param {string} text - Input text
   * @returns {string} Preprocessed text
   * @private
   */
  _preprocessText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    // Check cache first
    const cached = this.textCache.get(text);
    if (cached) return cached;

    let processed = text
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim()
      // Remove excessive punctuation
      .replace(/[.]{3,}/g, '...')
      .replace(/[!]{2,}/g, '!')
      .replace(/[?]{2,}/g, '?')
      // Convert to lowercase for consistency
      .toLowerCase();

    // Truncate if too long (leave room for special tokens)
    if (processed.length > this.maxSequenceLength * 4) {
      processed = processed.substring(0, this.maxSequenceLength * 4) + '...';
    }

    // Cache processed text
    this.textCache.set(text, processed);
    
    // Manage cache size
    if (this.textCache.size > 500) {
      this._pruneTextCache();
    }

    return processed;
  }

  /**
   * Generate hash-based embeddings as fallback
   * @param {Array<string>} texts - Input texts
   * @param {boolean} isArray - Whether input was array
   * @returns {Array<number>|Array<Array<number>>} Hash-based embeddings
   * @private
   */
  _generateHashEmbeddings(texts, isArray) {
    const embeddings = texts.map(text => {
      const processed = this._preprocessText(text);
      return this._textToHashVector(processed);
    });

    return isArray ? embeddings : embeddings[0];
  }

  /**
   * Convert text to hash-based vector
   * @param {string} text - Input text
   * @returns {Array<number>} Hash vector
   * @private
   */
  _textToHashVector(text) {
    const vector = new Array(this.dimensions).fill(0);
    
    // Generate multiple hash values for better distribution
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      const hash1 = (char * 31 + i) % this.dimensions;
      const hash2 = (char * 37 + i * 3) % this.dimensions;
      const hash3 = (char * 41 + i * 7) % this.dimensions;
      
      vector[hash1] += 1;
      vector[hash2] += 0.5;
      vector[hash3] += 0.25;
    }
    
    // Normalize vector
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= norm;
      }
    }
    
    return vector;
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {Array<number>} a - First vector
   * @param {Array<number>} b - Second vector
   * @returns {number} Similarity score (0-1)
   */
  cosineSimilarity(a, b) {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : Math.max(0, dotProduct / denominator);
  }

  /**
   * Process text into chunks suitable for embedding
   * @param {string} text - Input text
   * @param {Object} options - Chunking options
   * @returns {Array<Object>} Text chunks with metadata
   */
  chunkText(text, options = {}) {
    const {
      chunkSize = 1000,
      overlap = 100,
      minChunkSize = 50
    } = options;

    if (!text || text.length < minChunkSize) {
      return [{
        text: text || '',
        index: 0,
        startPos: 0,
        endPos: text ? text.length : 0,
        tokenCount: this._estimateTokens(text || '')
      }];
    }

    const chunks = [];
    let position = 0;
    let chunkIndex = 0;

    while (position < text.length) {
      const endPos = Math.min(position + chunkSize, text.length);
      let chunkText = text.substring(position, endPos);

      // Try to end at a sentence or word boundary if not at end
      if (endPos < text.length) {
        const sentenceEnd = chunkText.lastIndexOf('.');
        const paragraphEnd = chunkText.lastIndexOf('\n\n');
        const wordEnd = chunkText.lastIndexOf(' ');

        const boundary = Math.max(sentenceEnd, paragraphEnd, wordEnd);
        if (boundary > chunkSize * 0.7) {
          chunkText = chunkText.substring(0, boundary + 1);
        }
      }

      if (chunkText.trim().length >= minChunkSize) {
        chunks.push({
          text: chunkText.trim(),
          index: chunkIndex++,
          startPos: position,
          endPos: position + chunkText.length,
          tokenCount: this._estimateTokens(chunkText)
        });
      }

      position += chunkText.length - overlap;
      if (position <= chunks[chunks.length - 1]?.startPos) {
        position += chunkSize;
      }
    }

    return chunks.length > 0 ? chunks : [{
      text: text,
      index: 0,
      startPos: 0,
      endPos: text.length,
      tokenCount: this._estimateTokens(text)
    }];
  }

  /**
   * Estimate token count for text
   * @param {string} text - Input text
   * @returns {number} Estimated token count
   * @private
   */
  _estimateTokens(text) {
    return Math.ceil((text || '').length / 4);
  }

  /**
   * Prune embedding cache to manage memory
   * @private
   */
  _pruneCache() {
    const entries = Array.from(this.embedCache.entries());
    entries.sort(() => Math.random() - 0.5);
    
    const keepCount = Math.floor(entries.length * 0.7);
    this.embedCache.clear();
    
    for (let i = 0; i < keepCount; i++) {
      this.embedCache.set(entries[i][0], entries[i][1]);
    }
  }

  /**
   * Prune text preprocessing cache
   * @private
   */
  _pruneTextCache() {
    const entries = Array.from(this.textCache.entries());
    entries.sort(() => Math.random() - 0.5);
    
    const keepCount = Math.floor(entries.length * 0.7);
    this.textCache.clear();
    
    for (let i = 0; i < keepCount; i++) {
      this.textCache.set(entries[i][0], entries[i][1]);
    }
  }

  /**
   * Get embedding service status
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      initialized: !!this.model,
      loading: this.isLoading,
      progress: this.loadProgress,
      modelName: this.modelName,
      dimensions: this.dimensions,
      cacheSize: {
        embeddings: this.embedCache.size,
        texts: this.textCache.size
      }
    };
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.embedCache.clear();
    this.textCache.clear();
    console.log('Embedding service caches cleared');
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.clearCache();
    this.model = null;
    this.isLoading = false;
    this.loadingPromise = null;
    this.onProgress = null;
  }
}

// Export singleton instance
export default new EmbeddingService();