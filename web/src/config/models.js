/**
 * Curated Models Configuration
 *
 * These 4 models are carefully selected to provide optimal browser performance:
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
    // DeepSeek's general-purpose model with strong reasoning
    model_id: 'DeepSeek-R1-Distill-Qwen-1.5B-q4f16_1-MLC',
    name: 'DeepSeek 1.5B',
    description: 'Efficient general-purpose model with strong reasoning',
    size: '~900MB',
    speed: 'Fast',
    quality: 'Very Good',
    useCase: 'General chat, reasoning, analysis',
    priority: 2
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
    priority: 3
  },
  {
    // Hermes model with function calling support
    model_id: 'Hermes-3-Llama-3.1-8B-q4f16_1-MLC',
    name: 'Hermes 3 Llama 8B',
    description: 'Advanced with function calling & web search',
    size: '~4.5GB',
    speed: 'Slow',
    quality: 'Excellent',
    useCase: 'Advanced tasks, function calling',
    priority: 4 // Lower priority due to large size
  },
];

// Model categories for filtering/organization
export const MODEL_CATEGORIES = {
  ULTRA_FAST: ['SmolLM2-135M-Instruct-q4f16_1-MLC'],
  GENERAL: ['DeepSeek-R1-Distill-Qwen-1.5B-q4f16_1-MLC'],
  CODING: ['Phi-3.5-mini-instruct-q4f16_1-MLC'],
  ADVANCED: ['Hermes-3-Llama-3.1-8B-q4f16_1-MLC']
};

// Recommended models by use case
export const RECOMMENDED_MODELS = {
  LOW_MEMORY: 'SmolLM2-135M-Instruct-q4f16_1-MLC',
  BALANCED: 'DeepSeek-R1-Distill-Qwen-1.5B-q4f16_1-MLC',
  CODING: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
  ADVANCED: 'Hermes-3-Llama-3.1-8B-q4f16_1-MLC'
};