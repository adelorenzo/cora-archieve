import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
import errorLogger from '../lib/error-logger';

/**
 * Error recovery wrapper for individual components
 * Provides graceful degradation and retry mechanisms
 */
export const ErrorRecovery = ({
  children,
  fallback = null,
  onError = null,
  maxRetries = 3,
  retryDelay = 1000,
  componentName = 'Component'
}) => {
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  const handleRetry = async () => {
    setIsRetrying(true);

    await new Promise(resolve => setTimeout(resolve, retryDelay));

    setError(null);
    setRetryCount(prev => prev + 1);
    setIsRetrying(false);
  };

  const handleDismiss = () => {
    setError(null);
    setRetryCount(0);
  };

  if (error) {
    // Log the error
    errorLogger.logError(error, {
      component: componentName,
      retryCount,
      maxRetries
    });

    // If we have a custom fallback, use it
    if (fallback) {
      return fallback;
    }

    // Default error UI
    return (
      <div className="relative p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              {componentName} Error
            </h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">
              {error.message || 'An unexpected error occurred'}
            </p>

            {retryCount < maxRetries && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800/50 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying ? 'Retrying...' : `Retry (${maxRetries - retryCount} left)`}
              </button>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className="text-red-400 hover:text-red-500 dark:text-red-500 dark:hover:text-red-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Error boundary for this component
  return (
    <ErrorBoundaryWrapper
      onError={setError}
      componentName={componentName}
    >
      {children}
    </ErrorBoundaryWrapper>
  );
};

/**
 * Class component for error boundary functionality
 */
class ErrorBoundaryWrapper extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return null; // Parent will handle the error UI
    }

    return this.props.children;
  }
}

/**
 * Hook for error handling in functional components
 */
export const useErrorHandler = (componentName = 'Component') => {
  const [error, setError] = useState(null);
  const [isRecovering, setIsRecovering] = useState(false);

  const handleError = (error, context = {}) => {
    setError(error);
    errorLogger.logError(error, {
      component: componentName,
      ...context
    });
  };

  const recover = async (callback) => {
    setIsRecovering(true);
    setError(null);

    try {
      if (callback) {
        await callback();
      }
    } catch (e) {
      handleError(e, { recoveryFailed: true });
    } finally {
      setIsRecovering(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    error,
    isRecovering,
    handleError,
    recover,
    clearError
  };
};

/**
 * Async error boundary for handling promise rejections
 */
export const AsyncErrorBoundary = ({ children, fallback }) => {
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      setError(new Error(event.reason));
      event.preventDefault();
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (error) {
    return fallback || (
      <div className="p-4 text-center">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-600 dark:text-red-400">Async operation failed</p>
        <button
          onClick={() => setError(null)}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return children;
};

/**
 * Network error handler with retry
 */
export const NetworkErrorHandler = ({ onRetry, error }) => {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    await onRetry();
    setRetrying(false);
  };

  return (
    <div className="p-6 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
        <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
      </div>

      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        Connection Error
      </h3>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-sm mx-auto">
        {error?.message || 'Unable to connect. Please check your internet connection and try again.'}
      </p>

      <button
        onClick={handleRetry}
        disabled={retrying}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        <RefreshCw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
        {retrying ? 'Retrying...' : 'Try Again'}
      </button>
    </div>
  );
};

export default ErrorRecovery;