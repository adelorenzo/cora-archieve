const WEBLLM_URL = "https://unpkg.com/@mlc-ai/web-llm@0.2.79?module";
const WLLAMA_URL = "https://unpkg.com/@wllama/wllama@2.3.5/esm/wasm-from-cdn.js?module";

import ragService from './embeddings/rag-service.js';
import { CURATED_MODELS, RECOMMENDED_MODELS } from '../config/models.js';
import modelOptimizer from './model-optimizer.js';

class LLMService {
  constructor() {
    this.engine = null;
    this.runtime = "detecting";
    this.currentModel = null;
    this.initCallback = null;
    this.ragService = ragService;
    this.optimizer = modelOptimizer;
  }

  async detectRuntime() {
    if (navigator.gpu) {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          return "webgpu";
        }
      } catch (e) {
        console.warn("WebGPU not available:", e);
      }
    }
    return "wasm";
  }

  async getAvailableModels() {
    try {
      const webllm = await import(/* @vite-ignore */ WEBLLM_URL);
      const allModels = webllm.prebuiltAppConfig?.model_list || [];
      
      // Filter to only include our curated models that are available in WebLLM
      const availableCuratedModels = CURATED_MODELS.filter(curatedModel => 
        allModels.some(model => model.model_id === curatedModel.model_id)
      ).map(curatedModel => {
        // Find the original WebLLM model config and merge with our metadata
        const originalModel = allModels.find(model => model.model_id === curatedModel.model_id);
        return {
          ...originalModel,
          ...curatedModel
        };
      });
      
      console.log('Available curated models:', availableCuratedModels.map(m => m.model_id));
      return availableCuratedModels;
    } catch (error) {
      console.error('Failed to get curated model list:', error);
      return CURATED_MODELS; // Fallback to curated list without WebLLM validation
    }
  }

  /**
   * Get curated model information by model ID
   * @param {string} modelId - The model ID to look up
   * @returns {Object|null} Model info or null if not found
   */
  getCuratedModelInfo(modelId) {
    return CURATED_MODELS.find(model => model.model_id === modelId) || null;
  }

  /**
   * Get all curated models (for UI display)
   * @returns {Array} Array of curated model configurations
   */
  getCuratedModels() {
    return [...CURATED_MODELS];
  }

  /**
   * Get recommended model ID by use case
   * @param {string} useCase - The use case (LOW_MEMORY, BALANCED, CODING, etc.)
   * @returns {string} Recommended model ID
   */
  getRecommendedModel(useCase = 'BALANCED') {
    return RECOMMENDED_MODELS[useCase] || RECOMMENDED_MODELS.BALANCED;
  }

  async initialize(model = null, progressCallback) {
    this.initCallback = progressCallback;
    const runtime = await this.detectRuntime();
    this.runtime = runtime;

    if (runtime === "webgpu") {
      try {
        return await this.initWebLLM(model);
      } catch (error) {
        console.error('WebGPU initialization failed, falling back to WASM:', error);
        this.runtime = "wasm";
        return await this.initWASM();
      }
    } else {
      return await this.initWASM();
    }
  }

  async initWebLLM(model) {
    const webllm = await import(/* @vite-ignore */ WEBLLM_URL);
    
    // Get our curated models that are available in WebLLM
    const curatedModels = await this.getAvailableModels();
    console.log('Available curated models:', curatedModels.map(m => m.model_id));
    
    // Use the provided model or select optimal model based on device capabilities
    let selectedModel = model;
    if (!selectedModel) {
      // Use optimizer to select best model for device
      selectedModel = await this.optimizer.getOptimalModel();
      console.log('Optimizer selected model:', selectedModel);
      
      // Fallback to priority-based selection if optimizer fails
      if (!selectedModel && curatedModels.length > 0) {
        const sortedModels = curatedModels.sort((a, b) => (a.priority || 999) - (b.priority || 999));
        selectedModel = sortedModels[0].model_id;
        console.log('Fallback to priority model:', selectedModel);
      }
    }
    
    // Final fallback to ensure we have a model
    if (!selectedModel) {
      selectedModel = CURATED_MODELS[0].model_id; // SmolLM2-135M as ultimate fallback
    }
    
    // Preload model assets for optimization
    try {
      await this.optimizer.preloadModel(selectedModel);
    } catch (e) {
      console.warn('Model preload optimization failed:', e);
    }
    
    console.log('Initializing with model:', selectedModel);
    
    const engineConfig = {
      initProgressCallback: (report) => {
        if (this.initCallback) {
          this.initCallback(report.text || "Loading model...");
        }
      },
      appConfig: webllm.prebuiltAppConfig,
      logLevel: "INFO",
      // Disable service worker cache to avoid network errors in development
      useWebWorker: false,
    };

    // Implement robust error recovery with multiple fallback strategies
    let attemptedModels = new Set();
    let lastError = null;
    
    // First attempt with selected model
    try {
      this.engine = await webllm.CreateMLCEngine(selectedModel, engineConfig);
      this.currentModel = selectedModel;
      return { runtime: "webgpu", models: curatedModels, selectedModel };
    } catch (error) {
      console.error('Error creating WebLLM engine with', selectedModel, ':', error);
      lastError = error;
      attemptedModels.add(selectedModel);
      
      // Recovery strategy 1: Try smaller models in priority order
      const sortedModels = curatedModels
        .filter(m => !attemptedModels.has(m.model_id))
        .sort((a, b) => (a.priority || 999) - (b.priority || 999));
      
      for (const fallbackModel of sortedModels.slice(0, 3)) { // Try up to 3 fallback models
        try {
          console.log('Attempting recovery with fallback model:', fallbackModel.model_id);
          
          // Clear any partial state from previous attempt
          if (this.engine?.unload) {
            await this.engine.unload().catch(() => {});
          }
          
          // Add small delay to allow cleanup
          await new Promise(resolve => setTimeout(resolve, 500));
          
          this.engine = await webllm.CreateMLCEngine(fallbackModel.model_id, engineConfig);
          this.currentModel = fallbackModel.model_id;
          
          console.log('Successfully recovered with model:', fallbackModel.model_id);
          return { 
            runtime: "webgpu", 
            models: curatedModels, 
            selectedModel: fallbackModel.model_id,
            recoveryUsed: true,
            originalError: error.message
          };
        } catch (fallbackError) {
          console.error('Fallback model failed:', fallbackModel.model_id, fallbackError);
          lastError = fallbackError;
          attemptedModels.add(fallbackModel.model_id);
        }
      }
      
      // Recovery strategy 2: If all WebGPU models fail, fall back to WASM
      console.error('All WebGPU models failed, falling back to WASM runtime');
      this.runtime = "wasm";
      
      try {
        // Clear WebGPU state
        if (this.engine?.unload) {
          await this.engine.unload().catch(() => {});
        }
        this.engine = null;
        
        // Initialize WASM fallback
        return await this.initWASM();
      } catch (wasmError) {
        console.error('WASM fallback also failed:', wasmError);
        throw new Error(`Failed to initialize any model. WebGPU error: ${lastError?.message}. WASM error: ${wasmError.message}`);
      }
    }
  }

  async initWASM() {
    const wllamaModule = await import(/* @vite-ignore */ WLLAMA_URL);
    const { startWasmFallback } = await import("../../fallback/wllama.js");
    
    if (this.initCallback) {
      this.initCallback("Loading WASM model...");
    }
    
    this.engine = await startWasmFallback({ WasmFromCDN: wllamaModule.default });
    this.currentModel = "stories260K";
    return { runtime: "wasm", models: [], selectedModel: "stories260K" };
  }

  async *generateStream(messages, options = {}) {
    if (!this.engine) {
      throw new Error("LLM engine not initialized");
    }

    if (this.runtime === "webgpu") {
      const request = {
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 512,
        stream: true,
      };

      if (options.tools) {
        request.tools = options.tools;
        request.tool_choice = "auto";
      }

      const asyncChunkGenerator = await this.engine.chat.completions.create(request);
      
      for await (const chunk of asyncChunkGenerator) {
        const delta = chunk.choices[0]?.delta;
        if (delta) {
          yield delta;
        }
      }
    } else {
      // WASM fallback - simple completion
      const lastMessage = messages[messages.length - 1];
      const prompt = lastMessage.content;
      const response = await this.engine.complete(prompt, {
        nPredict: options.maxTokens || 128,
        temp: options.temperature || 0.7,
      });
      yield { content: response };
    }
  }

  async switchModel(model) {
    if (this.runtime === "webgpu" && model !== this.currentModel) {
      try {
        // Store current model as fallback
        const previousModel = this.currentModel;
        const previousEngine = this.engine;
        
        // Attempt to unload current model
        if (this.engine?.unload) {
          await this.engine.unload();
        }
        
        // Try to load new model
        const result = await this.initWebLLM(model);
        
        // Clear memory if switch was successful
        if (result.selectedModel !== model && result.recoveryUsed) {
          console.warn(`Model switch recovered with fallback: ${result.selectedModel}`);
        }
        
        return result;
      } catch (error) {
        console.error('Model switch failed:', error);
        
        // Attempt to restore previous model
        if (this.currentModel !== model) {
          console.log('Model switch successful despite error');
          return { runtime: this.runtime, models: [], selectedModel: this.currentModel };
        }
        
        // If restoration failed, try WASM fallback
        console.error('Unable to restore previous model, falling back to WASM');
        this.runtime = "wasm";
        return await this.initWASM();
      }
    }
    return { runtime: this.runtime, models: [], selectedModel: this.currentModel };
  }

  /**
   * Check if RAG is enabled and initialized
   * @returns {boolean}
   */
  isRAGEnabled() {
    return this.ragService && this.ragService.initialized;
  }

  /**
   * Enhanced chat method with RAG context integration
   * @param {Array} messages - Chat messages
   * @param {Object} options - Generation options
   * @returns {AsyncGenerator} Message stream with RAG context
   */
  async *chat(messages, options = {}) {
    if (!this.engine) {
      throw new Error("LLM engine not initialized");
    }

    let enhancedMessages = [...messages];
    
    // Get RAG context if enabled and user message exists
    if (this.isRAGEnabled() && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      if (lastMessage.role === 'user') {
        try {
          const searchContext = await this.ragService.getSearchContext(lastMessage.content, {
            limit: options.ragLimit || 5,
            threshold: options.ragThreshold || 0.7
          });
          
          if (searchContext) {
            // Insert RAG context before the user message
            const contextMessage = {
              role: 'system',
              content: `Relevant information from knowledge base:\n\n${searchContext}\n\n---\n\nPlease answer the user's question using the above information where relevant. If the information doesn't help answer the question, respond normally. Always cite your sources when using information from the knowledge base.`
            };
            
            // Insert context message before the last user message
            enhancedMessages = [
              ...messages.slice(0, -1),
              contextMessage,
              lastMessage
            ];
          }
        } catch (error) {
          console.warn('RAG context retrieval failed:', error);
          // Continue without RAG context
        }
      }
    }

    // Use existing generateStream method with enhanced messages
    yield* this.generateStream(enhancedMessages, options);
  }

  /**
   * Get device capabilities and optimal model recommendation
   * @returns {Object}
   */
  async getDeviceCapabilities() {
    const capabilities = await this.optimizer.detectCapabilities();
    const optimalModel = await this.optimizer.getOptimalModel();
    const modelInfo = this.getCuratedModelInfo(optimalModel);
    
    return {
      ...capabilities,
      recommendedModel: optimalModel,
      modelInfo
    };
  }

  /**
   * Monitor memory usage and get optimization suggestions
   * @returns {Object}
   */
  async getMemoryStatus() {
    return await this.optimizer.monitorMemoryUsage();
  }

  /**
   * Get model loading performance metrics
   * @returns {Object}
   */
  getPerformanceMetrics() {
    return this.optimizer.getPerformanceMetrics();
  }

  /**
   * Clear model cache to free memory
   * @param {string} modelId - Optional specific model to clear
   */
  clearModelCache(modelId = null) {
    this.optimizer.clearCache(modelId);
  }

  /**
   * Get loading priority for models
   * @returns {Array}
   */
  getModelLoadingPriority() {
    return this.optimizer.getLoadingPriority();
  }

  async unload() {
    if (this.engine?.unload) {
      await this.engine.unload();
    }
    this.engine = null;
    // Clear optimizer cache when unloading
    this.optimizer.clearCache();
  }
}

export default new LLMService();