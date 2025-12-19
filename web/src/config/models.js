/**
 * Curated Models Configuration
 *
 * These 4 models are carefully selected to provide optimal browser performance:
 *
 * Selection Criteria:
 * - Memory footprint: Must work within browser memory constraints
 * - Inference speed: Fast enough for real-time chat interaction
 * - Model quality: Very good to excellent output quality
 * - Use case diversity: Cover general and advanced scenarios
 * - Browser compatibility: Verified to work with WebLLM/WebGPU
 *
 * Priority system: Lower number = higher priority for auto-selection
 */
export const CURATED_MODELS = [
  {
    // DeepSeek R1 7B - advanced reasoning model
    model_id: 'DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC',
    name: 'DeepSeek R1 (7B)',
    description: 'Advanced reasoning and analysis capabilities',
    size: '~5.1GB',
    speed: 'Moderate',
    quality: 'Excellent',
    useCase: 'Advanced reasoning, complex analysis',
    priority: 1 // Primary model
  },
  {
    // Llama 3.2 3B - efficient and fast with function calling
    model_id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 (3B)',
    description: 'Efficient, fast responses with function calling support',
    size: '~2.3GB',
    speed: 'Fast',
    quality: 'Very Good',
    useCase: 'General purpose, quick responses, function calling',
    priority: 2 // Balanced efficiency model
  },
  {
    // Hermes model with function calling support
    model_id: 'Hermes-3-Llama-3.1-8B-q4f16_1-MLC',
    name: 'Hermes 3 Llama 8B',
    description: 'Advanced with function calling & web search',
    size: '~4.5GB',
    speed: 'Moderate',
    quality: 'Excellent',
    useCase: 'Advanced tasks, function calling',
    priority: 3 // Secondary model
  }
];

// Model categories for filtering/organization
export const MODEL_CATEGORIES = {
  LIGHTWEIGHT: ['Llama-3.2-3B-Instruct-q4f16_1-MLC'],
  BALANCED: ['Llama-3.2-3B-Instruct-q4f16_1-MLC', 'DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC'],
  ADVANCED: ['Hermes-3-Llama-3.1-8B-q4f16_1-MLC', 'DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC']
};

// Recommended models by use case
export const RECOMMENDED_MODELS = {
  LOW_MEMORY: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
  BALANCED: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
  FAST: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
  ADVANCED: 'DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC',
  FUNCTION_CALLING: 'Llama-3.2-3B-Instruct-q4f16_1-MLC'
};