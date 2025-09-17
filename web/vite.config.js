import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8000,
  },
  build: {
    outDir: 'dist',
    // Optimize bundle size
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 800,
    // Use esbuild for minification (faster than terser and included by default)
    // Address onnxruntime-web eval warnings
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      input: {
        main: './index.html',
      },
      // Manual chunk splitting for better code organization and lazy loading
      output: {
        manualChunks: (id) => {
          // Split WebLLM into its own chunk (loaded on-demand)
          if (id.includes('@mlc-ai/web-llm')) {
            return 'webllm';
          }

          // Split wllama into its own chunk (loaded on-demand for fallback)
          if (id.includes('@wllama/wllama')) {
            return 'wllama';
          }

          // Group PouchDB database modules together
          if (id.includes('pouchdb')) {
            return 'database';
          }

          // Group UI component libraries (lazy loaded)
          if (id.includes('lucide-react') || id.includes('react-markdown') || id.includes('highlight.js')) {
            return 'ui-libs';
          }

          // Keep React separate for better caching
          if (id.includes('node_modules/react-dom')) {
            return 'react-dom';
          }
          if (id.includes('node_modules/react')) {
            return 'react';
          }

          // Shadcn UI components
          if (id.includes('radix-ui') || id.includes('@radix')) {
            return 'radix-ui';
          }

          // Other vendor libraries
          if (id.includes('node_modules')) {
            return 'vendor';
          }

          // Keep main bundle small
          return undefined;
        }
      },
      external: [],
    },
  },
  optimizeDeps: {
    // Pre-bundle only essential modules for browser compatibility
    include: [
      'react',
      'react-dom',
      'clsx',
      'class-variance-authority'
    ],
    // Exclude large libraries for lazy loading
    exclude: [
      '@mlc-ai/web-llm',  // Load on-demand
      '@wllama/wllama',   // Load on-demand
      'react-markdown',   // Lazy loaded
      'highlight.js',     // Lazy loaded
      'lucide-react'      // Lazy loaded
    ]
  },
  define: {
    // Define global for PouchDB compatibility
    global: 'globalThis',
    // Polyfill process for browser compatibility
    'process.env': {},
    'process.nextTick': 'setTimeout',
  },
  resolve: {
    alias: {
      // Provide browser-compatible polyfills for Node.js modules
      events: 'events',
      util: 'util',
      buffer: 'buffer',
      process: 'process/browser',
    }
  }
})