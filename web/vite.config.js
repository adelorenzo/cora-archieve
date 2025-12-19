import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8000,
  },
  build: {
    outDir: 'dist',
    target: 'es2015',
    // Use terser for minification - more compatible than esbuild for complex module resolution
    // If build fails, set minify: false as fallback
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.info']
      },
      mangle: {
        safari10: true  // Better Safari compatibility
      },
      format: {
        comments: false  // Remove comments
      }
    },
    rollupOptions: {
      output: {
        format: 'es',
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Manual chunks for better caching
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['lucide-react']
        }
      }
    },
    // Report chunk sizes
    chunkSizeWarningLimit: 500  // Warn if chunks exceed 500KB
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client'],
    exclude: ['@mlc-ai/web-llm', '@wllama/wllama']
  },
  define: {
    'process.env.NODE_ENV': '"production"',
    'globalThis': 'window'
  }
})