/**
 * Error logging service for tracking and analyzing application errors
 */

class ErrorLogger {
  constructor() {
    this.errorQueue = [];
    this.maxQueueSize = 50;
    this.sessionId = this.generateSessionId();
    this.errorCounts = new Map();
    this.listeners = new Set();
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log an error with context
   */
  logError(error, context = {}) {
    const errorEntry = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      error: {
        message: error.message || error.toString(),
        stack: error.stack,
        name: error.name || 'Error'
      },
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        memory: this.getMemoryInfo(),
        ...context
      }
    };

    // Add to queue
    this.errorQueue.push(errorEntry);
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }

    // Update error counts
    const errorKey = `${error.name}:${error.message}`;
    this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);

    // Store in localStorage
    this.persistError(errorEntry);

    // Notify listeners
    this.notifyListeners(errorEntry);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Logged: ${error.name}`);
      console.error('Error:', error);
      console.log('Context:', context);
      console.log('Entry:', errorEntry);
      console.groupEnd();
    }

    return errorEntry.id;
  }

  /**
   * Get memory information if available
   */
  getMemoryInfo() {
    if (performance.memory) {
      return {
        usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1048576),
        totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1048576),
        jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
      };
    }
    return null;
  }

  /**
   * Persist error to localStorage
   */
  persistError(errorEntry) {
    try {
      const stored = JSON.parse(localStorage.getItem('errorLog') || '[]');
      stored.push(errorEntry);

      // Keep only last 20 errors
      const trimmed = stored.slice(-20);
      localStorage.setItem('errorLog', JSON.stringify(trimmed));
    } catch (e) {
      console.error('Failed to persist error:', e);
    }
  }

  /**
   * Get all logged errors
   */
  getErrors() {
    return [...this.errorQueue];
  }

  /**
   * Get errors from localStorage
   */
  getPersistedErrors() {
    try {
      return JSON.parse(localStorage.getItem('errorLog') || '[]');
    } catch (e) {
      console.error('Failed to retrieve persisted errors:', e);
      return [];
    }
  }

  /**
   * Get error statistics
   */
  getStatistics() {
    const stats = {
      totalErrors: this.errorQueue.length,
      sessionId: this.sessionId,
      errorTypes: {},
      mostCommon: null,
      recentErrors: this.errorQueue.slice(-5),
      errorRate: this.calculateErrorRate()
    };

    // Count error types
    this.errorQueue.forEach(entry => {
      const type = entry.error.name;
      stats.errorTypes[type] = (stats.errorTypes[type] || 0) + 1;
    });

    // Find most common error
    let maxCount = 0;
    this.errorCounts.forEach((count, error) => {
      if (count > maxCount) {
        maxCount = count;
        stats.mostCommon = { error, count };
      }
    });

    return stats;
  }

  /**
   * Calculate error rate (errors per minute)
   */
  calculateErrorRate() {
    if (this.errorQueue.length < 2) return 0;

    const first = new Date(this.errorQueue[0].timestamp);
    const last = new Date(this.errorQueue[this.errorQueue.length - 1].timestamp);
    const minutes = (last - first) / 60000;

    return minutes > 0 ? (this.errorQueue.length / minutes).toFixed(2) : 0;
  }

  /**
   * Clear all errors
   */
  clearErrors() {
    this.errorQueue = [];
    this.errorCounts.clear();
    try {
      localStorage.removeItem('errorLog');
    } catch (e) {
      console.error('Failed to clear error log:', e);
    }
  }

  /**
   * Subscribe to error events
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners
   */
  notifyListeners(errorEntry) {
    this.listeners.forEach(callback => {
      try {
        callback(errorEntry);
      } catch (e) {
        console.error('Error in error listener:', e);
      }
    });
  }

  /**
   * Generate error report
   */
  generateReport() {
    const stats = this.getStatistics();
    const errors = this.getErrors();

    const report = {
      generated: new Date().toISOString(),
      sessionId: this.sessionId,
      summary: stats,
      errors: errors.map(e => ({
        timestamp: e.timestamp,
        error: e.error.message,
        type: e.error.name,
        url: e.context.url
      })),
      environment: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenResolution: `${screen.width}x${screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`
      }
    };

    return report;
  }

  /**
   * Export report as JSON
   */
  exportReport() {
    const report = this.generateReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `error-report-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Create singleton instance
const errorLogger = new ErrorLogger();

// Set up global error handling
window.addEventListener('error', (event) => {
  errorLogger.logError(event.error || new Error(event.message), {
    source: 'window.error',
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

window.addEventListener('unhandledrejection', (event) => {
  errorLogger.logError(new Error(event.reason), {
    source: 'unhandledrejection',
    promise: true
  });
});

// Expose to window for debugging
if (process.env.NODE_ENV === 'development') {
  window.errorLogger = errorLogger;
}

export default errorLogger;