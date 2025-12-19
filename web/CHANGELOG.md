# Changelog

All notable changes to the Cora AI Assistant project will be documented in this file.

## [Sprint 6] - 2025-01-16

### ✅ Completed
- **Removed RAG feature** - Was causing memory crashes, removed for stability
- **Custom Markdown Renderer** - Replaced react-markdown with SimpleMarkdownRenderer (no external dependencies)
- **Loading Optimizations** - Implemented lazy loading for all components except MarkdownRenderer
- **Bundle Size Reduction** - Reduced vendor bundle from 210KB to 56KB (73% reduction)
- **Performance Improvements** - Added loading skeletons for better perceived performance
- **Stability Fixes** - Fixed critical style-to-js import error that was breaking message rendering

### Technical Changes
- Removed react-markdown dependency (was causing ESM/CJS compatibility issues)
- Created custom lightweight markdown parser with no external dependencies
- Optimized Vite config with manual chunks for better caching
- Fixed preload warnings in index.html
- Added error boundaries for graceful error handling

### Removed Components
- RAG/Embeddings system (causing memory issues)
- react-markdown (replaced with custom solution)
- All RAG-related UI components and database services

## [Sprint 5] - Previous

### Features
- WebGPU detection with WASM fallback
- Multiple AI personas with custom persona creation
- Theme system with 8 built-in themes
- Conversation management
- Settings persistence

## [Sprint 4] - Previous

### Features
- Initial React 19 setup with Vite
- WebLLM integration
- Basic chat interface
- Service Worker for offline support

## [Sprint 3] - Previous

### Features
- Model selection dropdown
- Streaming message display
- Dark/light theme toggle

## [Sprint 2] - Previous

### Features
- Initial UI with shadcn/ui components
- Basic chat functionality
- WebGPU runtime detection

## [Sprint 1] - Previous

### Features
- Project setup
- Basic LLM service abstraction
- Initial proof of concept