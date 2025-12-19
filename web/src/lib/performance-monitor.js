/**
 * Performance Monitor Service
 * Tracks application performance metrics and provides insights
 */
class PerformanceMonitor {
  constructor() {
    // Add memory limits to prevent leaks
    this.MAX_ARRAY_SIZE = 100;
    this.MAX_MAP_SIZE = 50;

    // Memory leak detection
    this.memoryHistory = [];
    this.MEMORY_HISTORY_SIZE = 10;
    this.MEMORY_LEAK_THRESHOLD = 50; // MB increase

    this.metrics = {
      loadTime: 0,
      renderTime: 0,
      memoryUsage: {},
      bundleSize: {},
      llmInitTime: 0,
      messageLatency: [],
      componentRenderTimes: new Map(),
      networkRequests: [],
      errors: [],
      memoryLeaks: []
    };

    this.observers = {
      performance: null,
      memory: null,
      navigation: null
    };

    this.init();
  }

  init() {
    this.measureLoadTime();
    this.setupPerformanceObserver();
    this.setupMemoryMonitoring();
    this.setupNetworkMonitoring();
    this.measureBundleSize();
    this.setupCleanupListeners();
  }

  // Page Load Performance
  measureLoadTime() {
    if (performance.timing) {
      const timing = performance.timing;
      this.metrics.loadTime = timing.loadEventEnd - timing.navigationStart;

      // More detailed timing
      this.metrics.timing = {
        dns: timing.domainLookupEnd - timing.domainLookupStart,
        tcp: timing.connectEnd - timing.connectStart,
        request: timing.responseStart - timing.requestStart,
        response: timing.responseEnd - timing.responseStart,
        dom: timing.domContentLoadedEventEnd - timing.domLoading,
        load: timing.loadEventEnd - timing.loadEventStart
      };
    }
  }

  // Performance Observer for detailed metrics
  setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      try {
        // Navigation timing
        const navObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'navigation') {
              this.metrics.navigation = {
                type: entry.type,
                redirectCount: entry.redirectCount,
                transferSize: entry.transferSize,
                encodedBodySize: entry.encodedBodySize,
                decodedBodySize: entry.decodedBodySize,
                domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
                loadComplete: entry.loadEventEnd - entry.loadEventStart
              };
            }
          });
        });
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.navigation = navObserver;

        // Resource timing
        const resourceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'resource') {
              this.metrics.networkRequests.push({
                name: entry.name,
                duration: entry.duration,
                transferSize: entry.transferSize,
                type: this.getResourceType(entry.name)
              });

              // Keep array size under limit
              if (this.metrics.networkRequests.length > this.MAX_ARRAY_SIZE) {
                this.metrics.networkRequests = this.metrics.networkRequests.slice(-this.MAX_ARRAY_SIZE);
              }
            }
          });
        });
        resourceObserver.observe({ entryTypes: ['resource'] });

        // Measure events (for custom timings)
        const measureObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'measure') {
              this.metrics.componentRenderTimes.set(entry.name, entry.duration);

              // Keep map size under limit
              if (this.metrics.componentRenderTimes.size > this.MAX_MAP_SIZE) {
                const entries = Array.from(this.metrics.componentRenderTimes.entries());
                this.metrics.componentRenderTimes.clear();
                entries.slice(-this.MAX_MAP_SIZE).forEach(([key, value]) => {
                  this.metrics.componentRenderTimes.set(key, value);
                });
              }
            }
          });
        });
        measureObserver.observe({ entryTypes: ['measure'] });
        this.observers.performance = measureObserver;

      } catch (e) {
        console.warn('Performance Observer not fully supported:', e);
      }
    }
  }

  // Memory Usage Monitoring
  setupMemoryMonitoring() {
    if ('memory' in performance) {
      this.measureMemory();

      // Monitor memory every 60 seconds (reduced frequency), but store reference for cleanup
      this.memoryInterval = setInterval(() => {
        this.measureMemory();
      }, 60000);
    }
  }

  measureMemory() {
    if ('memory' in performance) {
      const memory = performance.memory;
      const currentMemory = {
        used: Math.round(memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
        timestamp: Date.now()
      };

      this.metrics.memoryUsage = currentMemory;

      // Add to memory history for leak detection
      this.memoryHistory.push({
        used: currentMemory.used,
        timestamp: currentMemory.timestamp
      });

      // Keep history size under limit
      if (this.memoryHistory.length > this.MEMORY_HISTORY_SIZE) {
        this.memoryHistory = this.memoryHistory.slice(-this.MEMORY_HISTORY_SIZE);
      }

      // Check for memory leaks
      this.detectMemoryLeaks();

      // Check for emergency cleanup
      this.emergencyMemoryCleanup();
    }
  }

  // Network Monitoring
  setupNetworkMonitoring() {
    // Override fetch to monitor API calls
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();

        this.metrics.networkRequests.push({
          url: args[0],
          method: args[1]?.method || 'GET',
          duration: endTime - startTime,
          status: response.status,
          success: response.ok,
          timestamp: Date.now()
        });

        // Keep array size under limit
        if (this.metrics.networkRequests.length > this.MAX_ARRAY_SIZE) {
          this.metrics.networkRequests = this.metrics.networkRequests.slice(-this.MAX_ARRAY_SIZE);
        }

        return response;
      } catch (error) {
        const endTime = performance.now();
        this.metrics.networkRequests.push({
          url: args[0],
          method: args[1]?.method || 'GET',
          duration: endTime - startTime,
          error: error.message,
          success: false,
          timestamp: Date.now()
        });

        // Keep array size under limit
        if (this.metrics.networkRequests.length > this.MAX_ARRAY_SIZE) {
          this.metrics.networkRequests = this.metrics.networkRequests.slice(-this.MAX_ARRAY_SIZE);
        }
        throw error;
      }
    };
  }

  // Bundle Size Analysis
  measureBundleSize() {
    // Estimate from built assets
    this.metrics.bundleSize = {
      main: '89.91 kB',
      mainGzip: '28.81 kB',
      reactDom: '173.76 kB',
      reactDomGzip: '54.52 kB',
      vendor: '56.17 kB',
      vendorGzip: '19.87 kB',
      total: '459.88 kB',
      totalGzip: '146.93 kB'
    };
  }

  // LLM Performance Tracking
  startLLMInit() {
    this.llmInitStart = performance.now();
    performance.mark('llm-init-start');
  }

  endLLMInit() {
    if (this.llmInitStart) {
      this.metrics.llmInitTime = performance.now() - this.llmInitStart;
      performance.mark('llm-init-end');
      performance.measure('llm-initialization', 'llm-init-start', 'llm-init-end');
    }
  }

  // Message Processing Performance
  startMessageProcessing(messageId) {
    const startTime = performance.now();
    performance.mark(`message-${messageId}-start`);
    return startTime;
  }

  endMessageProcessing(messageId, startTime) {
    const endTime = performance.now();
    const latency = endTime - startTime;

    // Add with memory limit
    this.metrics.messageLatency.push({
      messageId,
      latency,
      timestamp: Date.now()
    });

    // Keep array size under limit
    if (this.metrics.messageLatency.length > this.MAX_ARRAY_SIZE) {
      this.metrics.messageLatency = this.metrics.messageLatency.slice(-this.MAX_ARRAY_SIZE);
    }

    performance.mark(`message-${messageId}-end`);
    performance.measure(`message-${messageId}`, `message-${messageId}-start`, `message-${messageId}-end`);

    return latency;
  }

  // Memory Leak Detection
  detectMemoryLeaks() {
    if (this.memoryHistory.length < 3) return; // Need at least 3 data points

    const recent = this.memoryHistory.slice(-3);
    const oldest = recent[0];
    const newest = recent[2];

    // Check for sustained memory growth
    const memoryIncrease = newest.used - oldest.used;
    const timeSpan = newest.timestamp - oldest.timestamp;

    if (memoryIncrease > this.MEMORY_LEAK_THRESHOLD && timeSpan > 180000) { // 3 minutes
      const leak = {
        type: 'sustained_growth',
        increase: memoryIncrease,
        timeSpan: timeSpan,
        detected: Date.now(),
        severity: memoryIncrease > 100 ? 'high' : 'medium'
      };

      this.metrics.memoryLeaks.push(leak);

      // Keep memory leaks array under limit
      if (this.metrics.memoryLeaks.length > this.MAX_ARRAY_SIZE) {
        this.metrics.memoryLeaks = this.metrics.memoryLeaks.slice(-this.MAX_ARRAY_SIZE);
      }

      console.warn('Memory leak detected:', leak);
    }
  }

  // Force Garbage Collection and Memory Management
  forceGarbageCollection() {
    if (window.gc) {
      window.gc();
    }

    // Trigger a forced memory measurement
    setTimeout(() => {
      this.measureMemory();
    }, 1000);
  }

  // Emergency memory cleanup when usage is too high
  emergencyMemoryCleanup() {
    const currentUsage = this.metrics.memoryUsage.used;
    const limit = this.metrics.memoryUsage.limit;

    if (currentUsage > limit * 0.9) {
      console.warn('Emergency memory cleanup triggered');

      // Aggressive cleanup
      this.metrics.messageLatency = this.metrics.messageLatency.slice(-10);
      this.metrics.networkRequests = this.metrics.networkRequests.slice(-10);
      this.metrics.errors = this.metrics.errors.slice(-10);
      this.metrics.memoryLeaks = this.metrics.memoryLeaks.slice(-10);
      this.memoryHistory = this.memoryHistory.slice(-5);

      // Clear component render times completely
      this.metrics.componentRenderTimes.clear();

      // Force garbage collection if available
      this.forceGarbageCollection();

      return true;
    }

    return false;
  }

  // Component Render Performance
  startComponentRender(componentName) {
    performance.mark(`${componentName}-render-start`);
  }

  endComponentRender(componentName) {
    performance.mark(`${componentName}-render-end`);
    performance.measure(`${componentName}-render`, `${componentName}-render-start`, `${componentName}-render-end`);
  }

  // Error Tracking
  trackError(error, context) {
    this.metrics.errors.push({
      message: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now()
    });

    // Keep array size under limit
    if (this.metrics.errors.length > this.MAX_ARRAY_SIZE) {
      this.metrics.errors = this.metrics.errors.slice(-this.MAX_ARRAY_SIZE);
    }
  }

  // Utility Methods
  getResourceType(url) {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'style';
    if (url.includes('.png') || url.includes('.jpg') || url.includes('.svg')) return 'image';
    if (url.includes('.woff') || url.includes('.ttf')) return 'font';
    return 'other';
  }

  // Analytics and Reporting
  getPerformanceReport() {
    const avgMessageLatency = this.metrics.messageLatency.length > 0
      ? this.metrics.messageLatency.reduce((sum, m) => sum + m.latency, 0) / this.metrics.messageLatency.length
      : 0;

    return {
      loadTime: this.metrics.loadTime,
      llmInitTime: this.metrics.llmInitTime,
      avgMessageLatency: Math.round(avgMessageLatency),
      memoryUsage: this.metrics.memoryUsage,
      bundleSize: this.metrics.bundleSize,
      errorCount: this.metrics.errors.length,
      networkRequests: this.metrics.networkRequests.length,
      memoryLeakCount: this.metrics.memoryLeaks.length,
      timestamp: Date.now()
    };
  }

  getDetailedMetrics() {
    return {
      ...this.metrics,
      webVitals: this.getWebVitals()
    };
  }

  getWebVitals() {
    const vitals = {};

    // First Contentful Paint
    const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
    if (fcpEntry) {
      vitals.fcp = fcpEntry.startTime;
    }

    // Largest Contentful Paint
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    if (lcpEntries.length > 0) {
      vitals.lcp = lcpEntries[lcpEntries.length - 1].startTime;
    }

    return vitals;
  }

  // Performance Recommendations
  getRecommendations() {
    const recommendations = [];
    const report = this.getPerformanceReport();

    if (report.loadTime > 3000) {
      recommendations.push({
        type: 'performance',
        severity: 'high',
        message: 'Page load time is slow (>3s). Consider code splitting or reducing bundle size.',
        metric: 'loadTime',
        value: report.loadTime
      });
    }

    if (report.llmInitTime > 10000) {
      recommendations.push({
        type: 'llm',
        severity: 'medium',
        message: 'LLM initialization is slow (>10s). Consider model optimization or caching.',
        metric: 'llmInitTime',
        value: report.llmInitTime
      });
    }

    if (report.avgMessageLatency > 5000) {
      recommendations.push({
        type: 'interaction',
        severity: 'medium',
        message: 'Message processing is slow (>5s). Check model performance or optimize inference.',
        metric: 'avgMessageLatency',
        value: report.avgMessageLatency
      });
    }

    if (report.memoryUsage.used > report.memoryUsage.limit * 0.8) {
      recommendations.push({
        type: 'memory',
        severity: 'high',
        message: 'High memory usage detected. Check for memory leaks.',
        metric: 'memoryUsage',
        value: report.memoryUsage.used
      });
    }

    if (report.memoryLeakCount > 0) {
      recommendations.push({
        type: 'memory',
        severity: 'high',
        message: 'Memory leaks detected. Review component cleanup and intervals.',
        metric: 'memoryLeakCount',
        value: report.memoryLeakCount
      });
    }

    return recommendations;
  }

  // Export data for analysis
  exportMetrics() {
    const data = {
      timestamp: new Date().toISOString(),
      report: this.getPerformanceReport(),
      details: this.getDetailedMetrics(),
      recommendations: this.getRecommendations()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cora-performance-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Setup cleanup listeners
  setupCleanupListeners() {
    // Auto-cleanup on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.cleanup());
      window.addEventListener('unload', () => this.cleanup());
    }
  }

  // Cleanup
  cleanup() {
    Object.values(this.observers).forEach(observer => {
      if (observer) observer.disconnect();
    });

    // Clear intervals
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }

    // Clear arrays and maps to free memory
    this.metrics.messageLatency = [];
    this.metrics.networkRequests = [];
    this.metrics.errors = [];
    this.metrics.memoryLeaks = [];
    this.metrics.componentRenderTimes.clear();
    this.memoryHistory = [];
  }
}

// Create global instance
const performanceMonitor = new PerformanceMonitor();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.performanceMonitor = performanceMonitor;
}

export default performanceMonitor;