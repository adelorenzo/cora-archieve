/**
 * Client-side Embedding Service using transformers.js
 * Runs entirely in the browser using WebGPU/WASM
 */

import { pipeline, env } from '@xenova/transformers';

// Configure transformers.js to use local cache
env.allowLocalModels = false;
env.useBrowserCache = true;

// Embedding model - small but effective for semantic search
const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';

class EmbeddingService {
  constructor() {
    this.extractor = null;
    this.initialized = false;
    this.initializing = false;
    this.modelInfo = {
      name: EMBEDDING_MODEL,
      dimensions: 384,
      maxSequenceLength: 256
    };
    this.statusListeners = [];
  }

  /**
   * Add a status listener
   */
  addStatusListener(callback) {
    this.statusListeners.push(callback);
  }

  /**
   * Remove a status listener
   */
  removeStatusListener(callback) {
    this.statusListeners = this.statusListeners.filter(cb => cb !== callback);
  }

  /**
   * Notify listeners of status change
   */
  notifyStatus(status, progress = null) {
    this.statusListeners.forEach(cb => cb(status, progress));
  }

  /**
   * Initialize the embedding model
   * Downloads and loads the model into memory
   */
  async initialize(progressCallback = null) {
    if (this.initialized) return true;
    if (this.initializing) {
      // Wait for ongoing initialization
      while (this.initializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.initialized;
    }

    this.initializing = true;
    this.notifyStatus('loading', 0);

    try {
      console.log('[EmbeddingService] Loading embedding model:', EMBEDDING_MODEL);

      // Create feature extraction pipeline
      this.extractor = await pipeline('feature-extraction', EMBEDDING_MODEL, {
        progress_callback: (progress) => {
          if (progress.status === 'progress') {
            const pct = Math.round((progress.loaded / progress.total) * 100);
            this.notifyStatus('loading', pct);
            if (progressCallback) progressCallback(pct);
          }
        }
      });

      this.initialized = true;
      this.notifyStatus('ready', 100);
      console.log('[EmbeddingService] Model loaded successfully');
      return true;
    } catch (error) {
      console.error('[EmbeddingService] Failed to load model:', error);
      this.notifyStatus('error', null);
      throw error;
    } finally {
      this.initializing = false;
    }
  }

  /**
   * Generate embeddings for a single text
   * @param {string} text - Text to embed
   * @returns {Float32Array} - Embedding vector
   */
  async embed(text) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Truncate text if too long
      const truncatedText = text.slice(0, this.modelInfo.maxSequenceLength * 4);

      // Generate embedding
      const output = await this.extractor(truncatedText, {
        pooling: 'mean',
        normalize: true
      });

      // Return as Float32Array for efficient storage
      return new Float32Array(output.data);
    } catch (error) {
      console.error('[EmbeddingService] Embedding error:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts
   * @param {string[]} texts - Array of texts to embed
   * @param {Function} progressCallback - Optional progress callback
   * @returns {Float32Array[]} - Array of embedding vectors
   */
  async embedBatch(texts, progressCallback = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    const embeddings = [];
    for (let i = 0; i < texts.length; i++) {
      const embedding = await this.embed(texts[i]);
      embeddings.push(embedding);

      if (progressCallback) {
        progressCallback(Math.round(((i + 1) / texts.length) * 100));
      }
    }

    return embeddings;
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {Float32Array} a - First vector
   * @param {Float32Array} b - Second vector
   * @returns {number} - Similarity score (0-1)
   */
  cosineSimilarity(a, b) {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    if (magnitude === 0) return 0;

    return dotProduct / magnitude;
  }

  /**
   * Find most similar vectors to query
   * @param {Float32Array} queryVector - Query embedding
   * @param {Array<{id: string, vector: Float32Array, ...}>} candidates - Candidate vectors
   * @param {number} topK - Number of results to return
   * @param {number} threshold - Minimum similarity threshold
   * @returns {Array<{id: string, score: number, ...}>} - Ranked results
   */
  findSimilar(queryVector, candidates, topK = 5, threshold = 0.3) {
    const results = candidates.map(candidate => ({
      ...candidate,
      score: this.cosineSimilarity(queryVector, candidate.vector)
    }));

    // Sort by similarity score (descending)
    results.sort((a, b) => b.score - a.score);

    // Filter by threshold and return top K
    return results
      .filter(r => r.score >= threshold)
      .slice(0, topK);
  }

  /**
   * Get model information
   */
  getModelInfo() {
    return {
      ...this.modelInfo,
      initialized: this.initialized,
      initializing: this.initializing
    };
  }

  /**
   * Check if model is ready
   */
  isReady() {
    return this.initialized;
  }
}

// Create singleton instance
const embeddingService = new EmbeddingService();

export default embeddingService;
export { EmbeddingService, EMBEDDING_MODEL };
