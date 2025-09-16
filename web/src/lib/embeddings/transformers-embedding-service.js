/**
 * Transformers.js Embedding Service
 * Uses all-MiniLM-L6-v2 model for semantic embeddings
 */

class TransformersEmbeddingService {
  constructor() {
    this.pipeline = null;
    this.model = null;
    this.tokenizer = null;
    this.isInitialized = false;
    this.modelId = 'Xenova/all-MiniLM-L6-v2';
    this.dimensions = 384; // all-MiniLM-L6-v2 output dimension
    this.embedCache = new Map();
    this.maxCacheSize = 100; // Reduced cache size for memory optimization
    this.memoryMonitor = null;
  }

  /**
   * Initialize the embedding service with Transformers.js
   * @param {function} progressCallback - Loading progress callback
   * @returns {Promise<void>}
   */
  async initialize(progressCallback = null) {
    if (this.isInitialized) {
      console.log('[TransformersEmbedding] Already initialized');
      return;
    }

    console.log('[TransformersEmbedding] Starting initialization...');
    const startTime = Date.now();

    try {
      // Dynamic import for browser compatibility
      const { pipeline, env } = await import('@xenova/transformers');

      // Configure for browser environment with memory optimization
      env.allowLocalModels = false;
      env.useBrowserCache = true;

      // Safely configure ONNX backend if available
      try {
        if (env.backends && env.backends.onnx) {
          if (env.backends.onnx.wasm) {
            env.backends.onnx.wasm.numThreads = 1; // Reduce thread usage for memory
          }
        }
      } catch (backendError) {
        console.warn('[TransformersEmbedding] Could not configure ONNX backend:', backendError);
        // Continue without thread configuration - not critical for functionality
      }

      // Report progress
      if (progressCallback) {
        progressCallback({ progress: 0.1, message: 'Loading embedding model...' });
      }

      // Create feature extraction pipeline
      this.pipeline = await pipeline(
        'feature-extraction',
        this.modelId,
        {
          progress_callback: (progress) => {
            if (progressCallback && progress.progress) {
              progressCallback({
                progress: 0.1 + (progress.progress * 0.8),
                message: `Loading model: ${Math.round(progress.progress * 100)}%`
              });
            }
          }
        }
      );

      if (progressCallback) {
        progressCallback({ progress: 0.9, message: 'Model loaded, initializing...' });
      }

      this.isInitialized = true;
      const elapsed = Date.now() - startTime;
      console.log(`[TransformersEmbedding] Initialized in ${elapsed}ms`);

      // Start memory monitoring
      this.startMemoryMonitoring();

      if (progressCallback) {
        progressCallback({ progress: 1.0, message: 'Embedding service ready' });
      }

    } catch (error) {
      console.error('[TransformersEmbedding] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for text(s)
   * @param {string|Array<string>} texts - Input text(s)
   * @param {Object} options - Generation options
   * @returns {Promise<Array<number>|Array<Array<number>>>} Embedding vector(s)
   */
  async generateEmbeddings(texts, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const isArray = Array.isArray(texts);
    const textArray = isArray ? texts : [texts];

    if (textArray.length === 0) {
      return isArray ? [] : null;
    }

    const embeddings = [];

    for (const text of textArray) {
      // Check cache first
      const cacheKey = this._getCacheKey(text);
      const cached = this.embedCache.get(cacheKey);

      if (cached) {
        embeddings.push(cached);
        continue;
      }

      // Generate embedding
      const output = await this.pipeline(text, {
        pooling: 'mean',
        normalize: true
      });

      // Convert to array
      const embedding = Array.from(output.data);

      // Cache the result
      this._cacheEmbedding(cacheKey, embedding);
      embeddings.push(embedding);
    }

    return isArray ? embeddings : embeddings[0];
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {Array<number>} vec1 - First vector
   * @param {Array<number>} vec2 - Second vector
   * @returns {number} Similarity score (0-1)
   */
  cosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }

  /**
   * Chunk text with semantic awareness
   * @param {string} text - Text to chunk
   * @param {Object} options - Chunking options
   * @returns {Array<Object>} Text chunks with metadata
   */
  chunkText(text, options = {}) {
    const {
      chunkSize = 512,
      overlap = 128,
      separators = ['\n\n', '\n', '. ', '! ', '? ', '; ', ', ', ' ']
    } = options;

    const chunks = [];
    let currentPos = 0;
    let chunkIndex = 0;

    while (currentPos < text.length) {
      let endPos = Math.min(currentPos + chunkSize, text.length);

      // Try to find a natural break point
      if (endPos < text.length) {
        for (const separator of separators) {
          const lastSep = text.lastIndexOf(separator, endPos);
          if (lastSep > currentPos + chunkSize * 0.5) {
            endPos = lastSep + separator.length;
            break;
          }
        }
      }

      const chunkText = text.slice(currentPos, endPos).trim();

      if (chunkText.length > 0) {
        chunks.push({
          text: chunkText,
          index: chunkIndex++,
          startPos: currentPos,
          endPos: endPos,
          tokenCount: this._estimateTokens(chunkText)
        });
      }

      // Move to next chunk with overlap
      currentPos = endPos - overlap;
      if (currentPos <= 0) currentPos = endPos;
    }

    return chunks;
  }

  /**
   * Estimate token count for text
   * @private
   */
  _estimateTokens(text) {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Get cache key for text
   * @private
   */
  _getCacheKey(text) {
    // Use first 100 chars + length as cache key
    return `${text.slice(0, 100)}_${text.length}`;
  }

  /**
   * Cache embedding with LRU eviction
   * @private
   */
  _cacheEmbedding(key, embedding) {
    this.embedCache.set(key, embedding);

    // LRU eviction
    if (this.embedCache.size > this.maxCacheSize) {
      const firstKey = this.embedCache.keys().next().value;
      this.embedCache.delete(firstKey);
    }
  }

  /**
   * Clear the embedding cache
   */
  clearCache() {
    this.embedCache.clear();
  }

  /**
   * Monitor memory usage and cleanup if needed
   * @private
   */
  async _monitorMemory() {
    if (!performance.memory) return;

    const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;

    // If memory usage > 80%, clear half the cache
    if (memoryUsage > 0.8) {
      console.warn(`[TransformersEmbedding] High memory usage: ${(memoryUsage * 100).toFixed(1)}%`);

      // Clear half the cache entries (oldest first)
      const entriesToRemove = Math.floor(this.embedCache.size / 2);
      const keys = Array.from(this.embedCache.keys());

      for (let i = 0; i < entriesToRemove; i++) {
        this.embedCache.delete(keys[i]);
      }

      console.log(`[TransformersEmbedding] Cleared ${entriesToRemove} cache entries`);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }
  }

  /**
   * Start memory monitoring
   */
  startMemoryMonitoring() {
    if (this.memoryMonitor) return;

    this.memoryMonitor = setInterval(() => {
      this._monitorMemory();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop memory monitoring
   */
  stopMemoryMonitoring() {
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
      this.memoryMonitor = null;
    }
  }

  /**
   * Get service info including memory stats
   */
  getInfo() {
    const info = {
      modelId: this.modelId,
      dimensions: this.dimensions,
      isInitialized: this.isInitialized,
      cacheSize: this.embedCache.size,
      maxCacheSize: this.maxCacheSize
    };

    if (performance.memory) {
      info.memory = {
        usedMB: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        limitMB: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
        usage: ((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100).toFixed(1) + '%'
      };
    }

    return info;
  }

  /**
   * Cleanup and release resources
   */
  async dispose() {
    this.stopMemoryMonitoring();
    this.clearCache();

    if (this.pipeline) {
      // Dispose of model if possible
      if (this.pipeline.dispose) {
        await this.pipeline.dispose();
      }
      this.pipeline = null;
    }

    this.isInitialized = false;
    console.log('[TransformersEmbedding] Service disposed');
  }
}

// Export singleton instance
const transformersEmbeddingService = new TransformersEmbeddingService();
export default transformersEmbeddingService;