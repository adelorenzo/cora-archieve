const WEBLLM_URL = "https://unpkg.com/@mlc-ai/web-llm@0.2.79?module";
const WLLAMA_URL = "https://unpkg.com/@wllama/wllama@2.3.5/esm/wasm-from-cdn.js?module";

class LLMService {
  constructor() {
    this.engine = null;
    this.runtime = "detecting";
    this.currentModel = null;
    this.initCallback = null;
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
      return webllm.prebuiltAppConfig?.model_list || [];
    } catch (error) {
      console.error('Failed to get model list:', error);
      return [];
    }
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
    
    // Get available models from prebuilt config
    const models = webllm.prebuiltAppConfig?.model_list || [];
    console.log('Available WebLLM models:', models.map(m => m.model_id));
    
    // Use the provided model or select a smaller default model
    let selectedModel = model;
    if (!selectedModel && models.length > 0) {
      // Try to find the smallest model available
      const smallModel = models.find(m => 
        m.model_id.includes('SmolLM2-135M') || 
        m.model_id.includes('SmolLM2-360M') ||
        m.model_id.includes('Qwen2.5-0.5B') || 
        m.model_id.includes('Qwen2-0.5B') ||
        m.model_id.includes('TinyLlama')
      );
      selectedModel = smallModel ? smallModel.model_id : models[0].model_id;
    }
    
    if (!selectedModel) {
      selectedModel = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
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

    try {
      this.engine = await webllm.CreateMLCEngine(selectedModel, engineConfig);
      this.currentModel = selectedModel;
      return { runtime: "webgpu", models, selectedModel };
    } catch (error) {
      console.error('Error creating WebLLM engine:', error);
      // If the model fails to load, try with a smaller one
      if (models.length > 0 && selectedModel !== models[0].model_id) {
        console.log('Retrying with first available model:', models[0].model_id);
        this.engine = await webllm.CreateMLCEngine(models[0].model_id, engineConfig);
        this.currentModel = models[0].model_id;
        return { runtime: "webgpu", models, selectedModel: models[0].model_id };
      }
      throw error;
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
      await this.engine?.unload();
      return this.initWebLLM(model);
    }
    return { runtime: this.runtime, models: [], selectedModel: this.currentModel };
  }

  async unload() {
    if (this.engine?.unload) {
      await this.engine.unload();
    }
    this.engine = null;
  }
}

export default new LLMService();