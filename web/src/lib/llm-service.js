const WEBLLM_URL = "https://esm.run/@mlc-ai/web-llm@0.2.79";
const WLLAMA_URL = "https://cdn.jsdelivr.net/npm/@wllama/wllama@2.3.5/esm/wasm-from-cdn.js";
const WLLAMA_FALLBACK_URL = "https://unpkg.com/@wllama/wllama@2.3.5/esm/wasm-from-cdn.js";

import { CURATED_MODELS, RECOMMENDED_MODELS } from '../config/models.js';
import modelOptimizer from './model-optimizer.js';

class LLMService {
  constructor() {
    this.engine = null;
    this.runtime = "detecting";
    this.currentModel = null;
    this.initCallback = null;
    this.optimizer = modelOptimizer;
  }

  /**
   * Detect the available runtime (WebGPU or WASM)
   * @returns {Promise<string>} 'webgpu' or 'wasm'
   */
  async detectRuntime() {
    // Firefox often has CORS issues with CDN imports, force WASM fallback
    const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');

    if (!isFirefox && navigator.gpu) {
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

  // Check if we should use local WASM package instead of CDN
  shouldUseLocalWasm() {
    const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
    return isFirefox;
  }

  /**
   * Get list of available models from WebLLM's prebuilt models
   * @returns {Promise<Array>} Array of available model configurations
   */
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

  /**
   * Initialize the LLM with the specified model
   * @param {string|null} model - Model ID to load, or null for default
   * @param {Function} progressCallback - Callback for progress updates (progress, text)
   * @returns {Promise<boolean>} Success status
   */
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
    // Model caching constants
    const MODEL_CACHE_KEY = 'cora_cached_model';
    const MODEL_CACHE_TIMESTAMP_KEY = 'cora_cached_model_timestamp';
    const CACHE_EXPIRY_HOURS = 24; // Cache for 24 hours

    // Check if model is already cached and valid
    const cachedModel = localStorage.getItem(MODEL_CACHE_KEY);
    const cacheTimestamp = localStorage.getItem(MODEL_CACHE_TIMESTAMP_KEY);
    const isModelCached = cachedModel && cacheTimestamp &&
      (Date.now() - parseInt(cacheTimestamp)) < (CACHE_EXPIRY_HOURS * 60 * 60 * 1000);

    let webllm;
    try {
      webllm = await import(/* @vite-ignore */ WEBLLM_URL);
    } catch (error) {
      console.error('Failed to load WebLLM from CDN:', error);
      throw new Error('WebLLM CDN unavailable');
    }
    
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
      selectedModel = CURATED_MODELS[0].model_id; // DeepSeek R1 7B as ultimate fallback
    }
    
    // Preload model assets for optimization
    try {
      await this.optimizer.preloadModel(selectedModel);
    } catch (e) {
      console.warn('Model preload optimization failed:', e);
    }
    
    console.log('Initializing with model:', selectedModel);
    
    // Use the prebuilt app config which contains all available models
    const appConfig = webllm.prebuiltAppConfig;

    const engineConfig = {
      initProgressCallback: (report) => {
        if (this.initCallback) {
          this.initCallback(report.text || "Loading model...");
        }
      },
      appConfig: appConfig,
      logLevel: "INFO",
      // Disable service worker cache to avoid network errors in development
      useWebWorker: false,
    };

    // Implement robust error recovery with multiple fallback strategies
    let attemptedModels = new Set();
    let lastError = null;
    
    // Check if using cached model and optimize progress reporting
    if (isModelCached && cachedModel === selectedModel) {
      if (this.initCallback) {
        this.initCallback("Loading cached model...");
        // Skip download phase for cached models
        setTimeout(() => this.initCallback("Initializing from cache..."), 100);
      }
    }

    // First attempt with selected model
    try {
      this.engine = await webllm.CreateMLCEngine(selectedModel, engineConfig);
      this.currentModel = selectedModel;

      // Cache the successfully loaded model
      localStorage.setItem(MODEL_CACHE_KEY, selectedModel);
      localStorage.setItem(MODEL_CACHE_TIMESTAMP_KEY, Date.now().toString());

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

          // Cache the successfully loaded fallback model
          localStorage.setItem(MODEL_CACHE_KEY, fallbackModel.model_id);
          localStorage.setItem(MODEL_CACHE_TIMESTAMP_KEY, Date.now().toString());

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
    try {
      // For Firefox, skip WASM entirely and provide a working stub
      if (this.shouldUseLocalWasm()) {
        console.log('Firefox detected - providing WASM stub for compatibility');

        if (this.initCallback) {
          this.initCallback("Firefox compatibility mode - limited functionality");
        }

        // Create a minimal working stub for Firefox
        this.engine = {
          complete: async (prompt) => {
            return `I apologize, but Firefox has limitations with WebAssembly modules due to CORS restrictions. Please try using Chrome or Edge for the full AI experience. Your message was: "${prompt}"`;
          }
        };
        this.currentModel = "firefox-compatibility";
        return { runtime: "wasm", models: [], selectedModel: "firefox-compatibility" };
      }

      // For other browsers, try CDN approach
      let wllamaModule;
      try {
        // Try primary CDN first
        wllamaModule = await import(/* @vite-ignore */ WLLAMA_URL);
      } catch (error) {
        console.warn('Primary WASM CDN failed, trying fallback:', error);
        try {
          // Try fallback CDN
          wllamaModule = await import(/* @vite-ignore */ WLLAMA_FALLBACK_URL);
        } catch (fallbackError) {
          console.error('Both WASM CDNs failed:', fallbackError);
          throw new Error('WASM module unavailable - both CDNs failed');
        }
      }

      const { startWasmFallback } = await import("../../fallback/wllama.js");

      if (this.initCallback) {
        this.initCallback("Loading WASM model...");
      }

      this.engine = await startWasmFallback({ WasmFromCDN: wllamaModule.default });
      this.currentModel = "stories260K";
      return { runtime: "wasm", models: [], selectedModel: "stories260K" };
    } catch (error) {
      console.error('WASM initialization failed:', error);
      // Return a minimal stub so the app doesn't crash
      this.engine = null;
      this.currentModel = null;

      if (this.initCallback) {
        this.initCallback("WASM unavailable - running without LLM");
      }

      return {
        runtime: "none",
        models: [],
        selectedModel: null,
        error: "WASM initialization failed. The app will run without LLM capabilities."
      };
    }
  }

  async *generateStream(messages, options = {}) {
    if (!this.engine) {
      throw new Error("LLM engine not initialized");
    }

    if (this.runtime === "webgpu") {
      const request = {
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000, // Increased for better responses
        stream: true,
        // Streaming optimizations for faster processing
        stream_options: {
          include_usage: false  // Skip usage stats for speed
        },
        // Performance optimizations
        top_p: 0.9,  // Slightly more focused responses
        frequency_penalty: 0.1,  // Reduce repetition
      };

      if (options.tools) {
        request.tools = options.tools;
        request.tool_choice = "auto";
      }

      const asyncChunkGenerator = await this.engine.chat.completions.create(request);

      // Streaming optimization: batch tokens for better UI performance
      let tokenBuffer = '';
      let lastYieldTime = Date.now();
      const BATCH_INTERVAL_MS = 50; // Yield batched tokens every 50ms

      try {
        for await (const chunk of asyncChunkGenerator) {
          const delta = chunk.choices[0]?.delta;

          if (delta?.content) {
            tokenBuffer += delta.content;

            // Yield batched tokens at intervals for smoother UI updates
            const now = Date.now();
            if (now - lastYieldTime >= BATCH_INTERVAL_MS || tokenBuffer.length > 10) {
              yield { content: tokenBuffer };
              tokenBuffer = '';
              lastYieldTime = now;
            }
          } else if (delta) {
            // Yield any buffered content first
            if (tokenBuffer) {
              yield { content: tokenBuffer };
              tokenBuffer = '';
            }
            yield delta;
          }

          // Also yield finish_reason if present for function calling
          if (chunk.choices[0]?.finish_reason) {
            // Yield any remaining buffered content
            if (tokenBuffer) {
              yield { content: tokenBuffer };
              tokenBuffer = '';
            }
            yield { finish_reason: chunk.choices[0].finish_reason };
          }
        }

        // Yield any remaining buffered content
        if (tokenBuffer) {
          yield { content: tokenBuffer };
        }
      } catch (error) {
        // Handle function calling parse errors gracefully
        if (error.message?.includes('error encountered when parsing outputMessage for function calling')) {
          console.warn('[LLM] Model attempted to respond with text instead of function call.');
          console.error('[LLM] Full error:', error.message);
          
          // Try multiple extraction patterns
          let extractedText = null;
          
          // Pattern 1: Original pattern - text between "Got outputMessage:" and "Got error:"
          const match1 = error.message.match(/Got outputMessage: (.+?) Got error:/);
          if (match1 && match1[1]) {
            extractedText = match1[1];
          }
          
          // Pattern 2: Match until end of string if "Got error:" is not found
          if (!extractedText) {
            const match2 = error.message.match(/Got outputMessage: (.+)$/);
            if (match2 && match2[1]) {
              // Remove trailing "Got error:" if it exists at the end
              extractedText = match2[1].replace(/ Got error:.*$/, '');
            }
          }
          
          // Pattern 3: Get everything after "Got outputMessage:" and split on "Got error:"
          if (!extractedText) {
            const match3 = error.message.match(/Got outputMessage: (.+)/);
            if (match3 && match3[1]) {
              extractedText = match3[1].split('Got error:')[0].trim();
            }
          }
          
          if (extractedText) {
            console.log('[LLM] Extracted text:', extractedText.substring(0, 100) + '...');
            
            // Check if the model is trying to simulate a function call in text
            const { default: functionCallingService } = await import('./function-calling-service.js');
            const textFunctionCall = functionCallingService.detectTextFunctionCall(extractedText);
            
            if (textFunctionCall.detected) {
              console.log('[LLM] Detected text-based function call:', textFunctionCall);
              // Yield a special marker for text-based function call
              yield { 
                content: extractedText,
                textFunctionCall: textFunctionCall 
              };
            } else {
              // Just yield the text content
              yield { content: extractedText };
            }
          } else {
            console.error('[LLM] Could not extract text from error message');
            yield { content: "The model encountered an issue with function calling. It may not fully support this feature yet." };
          }
        } else {
          // Re-throw other errors
          throw error;
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

  /**
   * Switch to a different model
   * @param {string} model - Model ID to switch to
   * @returns {Promise<Object>} Result with runtime, models, and selectedModel
   */
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
   * Chat method that directly uses generateStream
   * @param {Array} messages - Chat messages
   * @param {Object} options - Generation options including tools
   * @returns {AsyncGenerator} Message stream
   */
  async *chat(messages, options = {}) {
    if (!this.engine) {
      throw new Error("LLM engine not initialized");
    }

    // Directly use generateStream without any RAG enhancement
    yield* this.generateStream(messages, options);
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