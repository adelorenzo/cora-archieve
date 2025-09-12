/**
 * Curated Models Configuration
 * 
 * These 6 models are carefully selected to provide optimal browser performance:
 * 
 * Selection Criteria:
 * - Memory footprint: Must work within browser memory constraints (100MB-2GB range)
 * - Inference speed: Fast enough for real-time chat interaction
 * - Model quality: Good to excellent output quality for their size class
 * - Use case diversity: Cover different scenarios (speed, multilingual, coding, creative)
 * - Browser compatibility: Verified to work with WebLLM/WebGPU
 * 
 * Priority system: Lower number = higher priority for auto-selection
 */
export const CURATED_MODELS = [
  {
    // Ultra-lightweight model for instant responses and low-memory devices
    model_id: 'SmolLM2-135M-Instruct-q4f16_1-MLC',
    name: 'SmolLM2 135M',
    description: 'Ultra-fast, minimal resource usage',
    size: '~100MB',
    speed: 'Ultra Fast',
    quality: 'Good',
    useCase: 'Quick tasks, low memory',
    priority: 1 // Default fallback - most compatible
  },
  {
    // Best multilingual support in small package
    model_id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 0.5B',
    description: 'Balanced efficiency with multilingual support',
    size: '~300MB',
    speed: 'Very Fast', 
    quality: 'Good',
    useCase: 'General chat, multilingual',
    priority: 2
  },
  {
    // Sweet spot for general use - reliable Meta model
    model_id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 1B',
    description: 'Quality responses with reasonable speed',
    size: '~650MB',
    speed: 'Fast',
    quality: 'Very Good',
    useCase: 'General purpose, reliable',
    priority: 3
  },
  {
    // Microsoft's specialized model for technical tasks
    model_id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    name: 'Phi 3.5 Mini',
    description: 'Excellent for coding and reasoning tasks',
    size: '~2.1GB',
    speed: 'Moderate',
    quality: 'Very Good',
    useCase: 'Coding, reasoning, analysis',
    priority: 4
  },
  {
    // Google's balanced model with strong creative capabilities
    model_id: 'gemma-2-2b-it-q4f16_1-MLC',
    name: 'Gemma 2 2B',
    description: 'Google\'s balanced model with strong capabilities',
    size: '~1.3GB',
    speed: 'Moderate',
    quality: 'Very Good',
    useCase: 'Creative tasks, general chat',
    priority: 5
  },
  {
    // Fast alternative to larger models
    model_id: 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC',
    name: 'TinyLlama 1.1B',
    description: 'Lightweight yet capable, fast inference',
    size: '~700MB',
    speed: 'Fast',
    quality: 'Good',
    useCase: 'Fast responses, low resource',
    priority: 6
  }
];

// Model categories for filtering/organization
export const MODEL_CATEGORIES = {
  ULTRA_FAST: ['SmolLM2-135M-Instruct-q4f16_1-MLC'],
  MULTILINGUAL: ['Qwen2.5-0.5B-Instruct-q4f16_1-MLC'],
  GENERAL: ['Llama-3.2-1B-Instruct-q4f16_1-MLC', 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC'],
  CODING: ['Phi-3.5-mini-instruct-q4f16_1-MLC'],
  CREATIVE: ['gemma-2-2b-it-q4f16_1-MLC']
};

// Recommended models by use case
export const RECOMMENDED_MODELS = {
  LOW_MEMORY: 'SmolLM2-135M-Instruct-q4f16_1-MLC',
  BALANCED: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  CODING: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
  CREATIVE: 'gemma-2-2b-it-q4f16_1-MLC',
  MULTILINGUAL: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'
};