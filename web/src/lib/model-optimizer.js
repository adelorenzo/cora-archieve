/**
 * Model Optimizer Service
 * Optimizes model loading, caching, and memory management
 */

import { CURATED_MODELS } from '../config/models.js';

class ModelOptimizer {
  constructor() {
    this.cache = new Map();
    this.loadingPromises = new Map();
    this.memoryThreshold = 0.8; // 80% memory usage threshold
    this.performanceMetrics = new Map();
  }

  /**
   * Get optimal model based on device capabilities
   * @returns {string} Recommended model ID
   */
  async getOptimalModel() {
    const capabilities = await this.detectCapabilities();
    
    // Sort models by priority
    const sortedModels = [...CURATED_MODELS].sort((a, b) => a.priority - b.priority);
    
    // Find best model for device
    for (const model of sortedModels) {
      if (this.isModelCompatible(model, capabilities)) {
        console.log(`Optimal model selected: ${model.model_id}`, capabilities);
        return model.model_id;
      }
    }
    
    // Fallback to smallest model
    return sortedModels[0].model_id;
  }

  /**
   * Detect device capabilities
   * @returns {Object} Device capabilities
   */
  async detectCapabilities() {
    const capabilities = {
      memory: this.getAvailableMemory(),
      gpu: false,
      gpuInfo: null,
      cores: navigator.hardwareConcurrency || 4,
      connection: this.getConnectionSpeed(),
      battery: await this.getBatteryLevel()
    };

    // Check WebGPU capabilities
    if (navigator.gpu) {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          capabilities.gpu = true;
          const info = adapter.info || {};
          capabilities.gpuInfo = {
            vendor: info.vendor || 'unknown',
            architecture: info.architecture || 'unknown',
            device: info.device || 'unknown'
          };
        }
      } catch (e) {
        console.warn('GPU detection failed:', e);
      }
    }

    return capabilities;
  }

  /**
   * Check if model is compatible with device
   * @param {Object} model - Model configuration
   * @param {Object} capabilities - Device capabilities
   * @returns {boolean}
   */
  isModelCompatible(model, capabilities) {
    // Parse model size to MB
    const sizeMatch = model.size.match(/~?(\d+(?:\.\d+)?)(MB|GB)/);
    if (!sizeMatch) return false;
    
    const size = parseFloat(sizeMatch[1]) * (sizeMatch[2] === 'GB' ? 1024 : 1);
    const availableMemory = capabilities.memory;
    
    // Conservative memory check (model should use less than 50% of available)
    if (size > availableMemory * 0.5) {
      return false;
    }
    
    // Low battery mode - use smaller models
    if (capabilities.battery && capabilities.battery.level < 0.2 && !capabilities.battery.charging) {
      return model.priority <= 2; // Only ultra-fast models
    }
    
    // Slow connection - prefer smaller models
    if (capabilities.connection === 'slow' && size > 500) {
      return false;
    }
    
    return true;
  }

  /**
   * Get available memory in MB
   * @returns {number}
   */
  getAvailableMemory() {
    if ('deviceMemory' in navigator) {
      // deviceMemory is in GB, convert to MB
      return (navigator.deviceMemory || 4) * 1024;
    }
    
    // Fallback estimation based on platform
    if (/iPhone|iPad/.test(navigator.userAgent)) {
      return 2048; // Conservative iOS estimate
    }
    
    return 4096; // Default 4GB
  }

  /**
   * Get connection speed category
   * @returns {string}
   */
  getConnectionSpeed() {
    if ('connection' in navigator && navigator.connection) {
      const conn = navigator.connection;
      const effectiveType = conn.effectiveType || '4g';
      
      if (effectiveType === 'slow-2g' || effectiveType === '2g') {
        return 'slow';
      }
      if (effectiveType === '3g') {
        return 'medium';
      }
      
      // Check downlink speed if available
      if (conn.downlink && conn.downlink < 1) {
        return 'slow';
      }
      if (conn.downlink && conn.downlink < 5) {
        return 'medium';
      }
    }
    
    return 'fast';
  }

  /**
   * Get battery level
   * @returns {Object|null}
   */
  async getBatteryLevel() {
    if ('getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery();
        return {
          level: battery.level,
          charging: battery.charging
        };
      } catch (e) {
        console.warn('Battery API not available:', e);
      }
    }
    return null;
  }

  /**
   * Preload model assets for faster switching
   * @param {string} modelId - Model to preload
   */
  async preloadModel(modelId) {
    if (this.cache.has(modelId)) {
      return this.cache.get(modelId);
    }

    if (this.loadingPromises.has(modelId)) {
      return this.loadingPromises.get(modelId);
    }

    const loadPromise = this._preloadModelAssets(modelId);
    this.loadingPromises.set(modelId, loadPromise);

    try {
      const result = await loadPromise;
      this.cache.set(modelId, result);
      this.loadingPromises.delete(modelId);
      return result;
    } catch (error) {
      this.loadingPromises.delete(modelId);
      throw error;
    }
  }

  /**
   * Internal method to preload model assets
   * @private
   */
  async _preloadModelAssets(modelId) {
    const startTime = performance.now();
    
    // Simulate preloading (in real implementation, this would fetch model metadata)
    // WebLLM handles actual model loading, this is for optimization hints
    const modelInfo = CURATED_MODELS.find(m => m.model_id === modelId);
    
    if (!modelInfo) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Store performance metrics
    const loadTime = performance.now() - startTime;
    this.performanceMetrics.set(modelId, {
      loadTime,
      timestamp: Date.now()
    });

    return {
      modelId,
      preloaded: true,
      loadTime
    };
  }

  /**
   * Clear model cache to free memory
   * @param {string} modelId - Optional specific model to clear
   */
  clearCache(modelId = null) {
    if (modelId) {
      this.cache.delete(modelId);
      this.performanceMetrics.delete(modelId);
    } else {
      this.cache.clear();
      this.performanceMetrics.clear();
    }
  }

  /**
   * Get performance metrics for models
   * @returns {Object}
   */
  getPerformanceMetrics() {
    const metrics = {};
    
    for (const [modelId, data] of this.performanceMetrics) {
      metrics[modelId] = {
        ...data,
        cached: this.cache.has(modelId)
      };
    }
    
    return metrics;
  }

  /**
   * Monitor memory usage and suggest optimizations
   * @returns {Object}
   */
  async monitorMemoryUsage() {
    const usage = {
      available: this.getAvailableMemory(),
      recommended: null,
      shouldClearCache: false
    };

    if ('memory' in performance && performance.memory) {
      const memInfo = performance.memory;
      const usedMemory = memInfo.usedJSHeapSize / (1024 * 1024); // Convert to MB
      const totalMemory = memInfo.jsHeapSizeLimit / (1024 * 1024);
      
      usage.used = Math.round(usedMemory);
      usage.total = Math.round(totalMemory);
      usage.percentage = (usedMemory / totalMemory);
      
      if (usage.percentage > this.memoryThreshold) {
        usage.shouldClearCache = true;
        usage.recommended = 'clear-cache';
      }
    }

    return usage;
  }

  /**
   * Get loading priority for models
   * @returns {Array}
   */
  getLoadingPriority() {
    return CURATED_MODELS
      .sort((a, b) => a.priority - b.priority)
      .map(model => ({
        modelId: model.model_id,
        priority: model.priority,
        preloaded: this.cache.has(model.model_id),
        metrics: this.performanceMetrics.get(model.model_id)
      }));
  }
}

export default new ModelOptimizer();