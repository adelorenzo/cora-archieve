// Comprehensive polyfills for React 19 and browser compatibility

// Ensure globalThis is defined (more robust check)
(function() {
  if (typeof globalThis === 'undefined') {
    if (typeof window !== 'undefined') {
      window.globalThis = window;
    } else if (typeof global !== 'undefined') {
      global.globalThis = global;
    } else if (typeof self !== 'undefined') {
      self.globalThis = self;
    } else {
      // Create a minimal globalThis
      this.globalThis = this;
    }
  }
})();

// Performance polyfills for React Scheduler
if (!globalThis.performance) {
  globalThis.performance = window.performance || {};
}

if (!globalThis.performance.now) {
  const startTime = Date.now();
  globalThis.performance.now = function() {
    return Date.now() - startTime;
  };
}

// React Scheduler expects these to be defined
if (!globalThis.performance.unstable_now) {
  globalThis.performance.unstable_now = globalThis.performance.now;
}

// CommonJS compatibility for React scheduler in ESM context
if (typeof exports === 'undefined') {
  try {
    if (typeof globalThis !== 'undefined' && globalThis) {
      globalThis.exports = {};
    } else {
      window.exports = {};
    }
  } catch (e) {
    // Final fallback - use window directly
    try {
      window.exports = {};
    } catch (e2) {
      // Last resort - define on current scope
      this.exports = {};
    }
  }
}
if (typeof module === 'undefined') {
  try {
    if (typeof globalThis !== 'undefined' && globalThis) {
      globalThis.module = { exports: globalThis.exports || window.exports || {} };
    } else {
      window.module = { exports: window.exports || {} };
    }
  } catch (e) {
    // Final fallback
    try {
      window.module = { exports: window.exports || {} };
    } catch (e2) {
      // Last resort
      this.module = { exports: this.exports || {} };
    }
  }
}
if (typeof require === 'undefined') {
  globalThis.require = function(id) {
    if (id === 'scheduler') return globalThis.exports;
    return {};
  };
}

// Process polyfill
if (typeof process === 'undefined') {
  globalThis.process = { env: {} };
}

// MessageChannel polyfill for React Scheduler
if (typeof MessageChannel === 'undefined') {
  globalThis.MessageChannel = class {
    constructor() {
      this.port1 = {
        postMessage: () => {},
        onmessage: null
      };
      this.port2 = {
        postMessage: () => {},
        onmessage: null
      };
    }
  };
}

// requestIdleCallback polyfill
if (!window.requestIdleCallback) {
  window.requestIdleCallback = function(callback) {
    const start = Date.now();
    return setTimeout(function() {
      callback({
        didTimeout: false,
        timeRemaining: function() {
          return Math.max(0, 50 - (Date.now() - start));
        }
      });
    }, 1);
  };
}

if (!window.cancelIdleCallback) {
  window.cancelIdleCallback = function(id) {
    clearTimeout(id);
  };
}

// Function naming utility for debugging (prevents "o is not a function" errors)
if (!globalThis.o) {
  globalThis.o = function(fn, name) {
    if (typeof fn === "function" && typeof name === "string") {
      try {
        Object.defineProperty(fn, 'name', { value: name, configurable: true });
      } catch (e) {
        // Ignore errors if name cannot be set (some environments restrict this)
      }
    }
    return fn;
  };
}

// Ensure window.o exists for browser compatibility
if (typeof window !== "undefined" && !window.o) {
  window.o = globalThis.o;
}