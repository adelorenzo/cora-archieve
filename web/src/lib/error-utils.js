/**
 * Standardized error handling utilities for Cora AI
 * Provides consistent error types, retry logic, and error formatting
 */

/**
 * Custom error types for different failure scenarios
 */
export class CoraError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'CoraError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

export class NetworkError extends CoraError {
  constructor(message, details = {}) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
    this.retryable = true;
  }
}

export class LLMError extends CoraError {
  constructor(message, details = {}) {
    super(message, 'LLM_ERROR', details);
    this.name = 'LLMError';
    this.retryable = details.retryable ?? false;
  }
}

export class RAGError extends CoraError {
  constructor(message, details = {}) {
    super(message, 'RAG_ERROR', details);
    this.name = 'RAGError';
    this.retryable = details.retryable ?? true;
  }
}

export class ValidationError extends CoraError {
  constructor(message, details = {}) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
    this.retryable = false;
  }
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} - Result of the function
 */
export async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    onRetry = null,
    shouldRetry = (error) => error.retryable !== false
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt >= maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        baseDelay * Math.pow(backoffFactor, attempt) + Math.random() * 100,
        maxDelay
      );

      // Call retry callback if provided
      if (onRetry) {
        onRetry(error, attempt + 1, delay);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Format error for user display
 * @param {Error} error - The error to format
 * @returns {Object} - Formatted error with title and message
 */
export function formatErrorForUser(error) {
  // Network errors
  if (error instanceof NetworkError || error.name === 'TypeError' && error.message.includes('fetch')) {
    return {
      title: 'Connection Error',
      message: 'Unable to connect. Please check your internet connection and try again.',
      action: 'retry'
    };
  }

  // LLM errors
  if (error instanceof LLMError) {
    if (error.details.outOfMemory) {
      return {
        title: 'Out of Memory',
        message: 'The AI model requires more memory than available. Try a smaller model or close other tabs.',
        action: 'switch-model'
      };
    }
    return {
      title: 'AI Error',
      message: 'The AI encountered an error. Please try again or switch to a different model.',
      action: 'retry'
    };
  }

  // RAG errors
  if (error instanceof RAGError) {
    return {
      title: 'Document Search Error',
      message: 'Unable to search documents. The service may be offline.',
      action: 'disable-rag'
    };
  }

  // Validation errors
  if (error instanceof ValidationError) {
    return {
      title: 'Invalid Input',
      message: error.message,
      action: null
    };
  }

  // Generic errors
  return {
    title: 'Error',
    message: error.message || 'An unexpected error occurred. Please try again.',
    action: 'retry'
  };
}

/**
 * Safely execute an async function and return a result tuple
 * @param {Function} fn - Async function to execute
 * @returns {Promise<[Error|null, any]>} - Tuple of [error, result]
 */
export async function safeAsync(fn) {
  try {
    const result = await fn();
    return [null, result];
  } catch (error) {
    return [error, null];
  }
}

/**
 * Check if an error is a specific type
 */
export function isNetworkError(error) {
  return error instanceof NetworkError ||
         (error.name === 'TypeError' && error.message.includes('fetch')) ||
         error.message?.includes('network') ||
         error.message?.includes('CORS');
}

export function isTimeoutError(error) {
  return error.name === 'AbortError' ||
         error.message?.includes('timeout') ||
         error.code === 'ETIMEDOUT';
}

/**
 * Create a timeout wrapper for promises
 * @param {Promise} promise - Promise to wrap
 * @param {number} ms - Timeout in milliseconds
 * @param {string} message - Timeout error message
 * @returns {Promise} - Promise that rejects on timeout
 */
export function withTimeout(promise, ms, message = 'Operation timed out') {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new CoraError(message, 'TIMEOUT'));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

export default {
  CoraError,
  NetworkError,
  LLMError,
  RAGError,
  ValidationError,
  withRetry,
  formatErrorForUser,
  safeAsync,
  isNetworkError,
  isTimeoutError,
  withTimeout
};
