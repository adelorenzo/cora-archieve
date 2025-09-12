import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8000,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
  optimizeDeps: {
    // Pre-bundle PouchDB modules to avoid CommonJS issues
    include: [
      'pouchdb-core',
      'pouchdb-adapter-idb', 
      'pouchdb-mapreduce',
      'pouchdb-replication',
      'pouchdb-find'
    ]
  },
  define: {
    // Define global for PouchDB compatibility
    global: 'globalThis'
  }
})