import React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Copy, CheckCircle } from 'lucide-react';

class EnhancedErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      errorHistory: [],
      copied: false,
      isRecovering: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
      errorCount: (prevState) => prevState.errorCount + 1
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Log to error tracking service (if configured)
    this.logErrorToService(error, errorInfo);

    // Store error in history
    this.setState(prevState => ({
      errorInfo,
      errorHistory: [...prevState.errorHistory.slice(-4), {
        error: error.toString(),
        stack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      }]
    }));

    // Store error in localStorage for debugging
    try {
      const errorLog = JSON.parse(localStorage.getItem('errorLog') || '[]');
      errorLog.push({
        error: error.toString(),
        stack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
      localStorage.setItem('errorLog', JSON.stringify(errorLog.slice(-10)));
    } catch (e) {
      console.error('Failed to store error log:', e);
    }
  }

  logErrorToService = (error, errorInfo) => {
    // Integration point for error tracking services
    // Could send to Sentry, LogRocket, etc.
    if (window.errorReporter) {
      window.errorReporter.log({
        error: error.toString(),
        stack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href
      });
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: true,
      retryCount: this.state.retryCount + 1
    });

    setTimeout(() => {
      this.setState({ isRecovering: false });
    }, 1000);

    // Clear any problematic state in localStorage
    try {
      const keysToPreserve = ['theme', 'selectedModel', 'temperature', 'conversations'];
      const preserved = {};
      keysToPreserve.forEach(key => {
        preserved[key] = localStorage.getItem(key);
      });

      localStorage.clear();

      Object.entries(preserved).forEach(([key, value]) => {
        if (value) localStorage.setItem(key, value);
      });
    } catch (e) {
      console.error('Failed to clear localStorage:', e);
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = '/';
  };

  copyErrorDetails = () => {
    const errorDetails = `
Error: ${this.state.error?.toString()}
Stack: ${this.state.errorInfo?.componentStack}
Timestamp: ${new Date().toISOString()}
User Agent: ${navigator.userAgent}
URL: ${window.location.href}
    `.trim();

    navigator.clipboard.writeText(errorDetails).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  clearErrorLog = () => {
    localStorage.removeItem('errorLog');
    this.setState({ errorHistory: [] });
  };

  getErrorMessage = () => {
    const errorString = this.state.error?.toString() || '';

    // User-friendly messages for common errors
    if (errorString.includes('Network') || errorString.includes('fetch')) {
      return {
        title: 'Connection Problem',
        message: 'Unable to connect to the AI model. Please check your internet connection.',
        icon: '🌐'
      };
    }

    if (errorString.includes('WebGPU') || errorString.includes('GPU')) {
      return {
        title: 'Graphics Processing Error',
        message: 'There was an issue with WebGPU. Try refreshing or switching to a different model.',
        icon: '🎮'
      };
    }

    if (errorString.includes('memory') || errorString.includes('Memory')) {
      return {
        title: 'Memory Issue',
        message: 'The application ran out of memory. Try reloading the page or using a smaller model.',
        icon: '💾'
      };
    }

    if (errorString.includes('undefined') || errorString.includes('null')) {
      return {
        title: 'Unexpected Error',
        message: 'Something unexpected happened. Try refreshing the page.',
        icon: '❓'
      };
    }

    return {
      title: 'Application Error',
      message: 'The application encountered an error. You can try refreshing or resetting.',
      icon: '⚠️'
    };
  };

  render() {
    if (this.state.hasError && !this.state.isRecovering) {
      const { title, message, icon } = this.getErrorMessage();
      const isDarkMode = document.documentElement.classList.contains('dark');

      return (
        <div className={`min-h-screen flex items-center justify-center p-4 ${
          isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
          <div className={`max-w-2xl w-full rounded-lg shadow-xl p-8 ${
            isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
          }`}>
            {/* Error Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="text-4xl">{icon}</div>
              <div>
                <h1 className={`text-2xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {title}
                </h1>
                <p className={`mt-1 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {message}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={this.handleReset}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDarkMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
                {this.state.retryCount > 0 && ` (${this.state.retryCount})`}
              </button>

              <button
                onClick={this.handleReload}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                <RefreshCw className="h-4 w-4" />
                Reload Page
              </button>

              <button
                onClick={this.handleHome}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                <Home className="h-4 w-4" />
                Go Home
              </button>

              <button
                onClick={this.copyErrorDetails}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                {this.state.copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Error
                  </>
                )}
              </button>
            </div>

            {/* Error Details */}
            <details className={`rounded-lg p-4 ${
              isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
            }`}>
              <summary className={`cursor-pointer font-medium flex items-center gap-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <Bug className="h-4 w-4" />
                Technical Details
              </summary>

              <div className="mt-4 space-y-3">
                <div>
                  <h3 className={`text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Error Message
                  </h3>
                  <pre className={`text-xs p-2 rounded overflow-x-auto ${
                    isDarkMode ? 'bg-gray-800 text-red-400' : 'bg-white text-red-600'
                  }`}>
                    {this.state.error?.toString()}
                  </pre>
                </div>

                {this.state.errorInfo?.componentStack && (
                  <div>
                    <h3 className={`text-sm font-medium mb-1 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Component Stack
                    </h3>
                    <pre className={`text-xs p-2 rounded overflow-x-auto ${
                      isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-600'
                    }`}>
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}

                {this.state.errorHistory.length > 1 && (
                  <div>
                    <h3 className={`text-sm font-medium mb-1 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Error History ({this.state.errorHistory.length} errors)
                    </h3>
                    <div className="space-y-2">
                      {this.state.errorHistory.map((err, idx) => (
                        <div key={idx} className={`text-xs p-2 rounded ${
                          isDarkMode ? 'bg-gray-800' : 'bg-white'
                        }`}>
                          <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                            {new Date(err.timestamp).toLocaleString()}
                          </div>
                          <div className={isDarkMode ? 'text-red-400' : 'text-red-600'}>
                            {err.error}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </details>

            {/* Tips */}
            <div className={`mt-6 p-4 rounded-lg ${
              isDarkMode ? 'bg-blue-900 bg-opacity-30' : 'bg-blue-50'
            }`}>
              <h3 className={`text-sm font-medium mb-2 ${
                isDarkMode ? 'text-blue-300' : 'text-blue-700'
              }`}>
                💡 Tips
              </h3>
              <ul className={`text-sm space-y-1 ${
                isDarkMode ? 'text-blue-200' : 'text-blue-600'
              }`}>
                <li>• If the error persists, try clearing your browser cache</li>
                <li>• Make sure you're using a supported browser (Chrome/Edge for WebGPU)</li>
                <li>• Check if you have enough free memory available</li>
                <li>• Try switching to a smaller AI model if memory is limited</li>
              </ul>
            </div>

            {/* Support Link */}
            <div className={`mt-6 text-center text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Need help?
              <a
                href="https://github.com/your-repo/issues"
                target="_blank"
                rel="noopener noreferrer"
                className={`ml-1 underline ${
                  isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                }`}
              >
                Report this issue
              </a>
            </div>
          </div>
        </div>
      );
    }

    if (this.state.isRecovering) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600 dark:text-gray-400">Recovering...</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default EnhancedErrorBoundary;