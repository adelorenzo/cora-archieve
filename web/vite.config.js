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
    minify: false,
    rollupOptions: {
      output: {
        format: 'es',
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
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