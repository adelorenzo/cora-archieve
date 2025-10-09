# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a modern React-based browser LLM application that runs entirely client-side. It uses WebLLM with WebGPU as the primary runtime, with automatic fallback to WASM (via wllama) when WebGPU is unavailable.

**Latest Status (Sprint 9 Complete)**:
- ✅ RAG (Library) feature fully functional with txtai backend
- ✅ Fixed txtai `/search` endpoint (replaced old app.py with app_simple.py)
- ✅ Added missing `txtai[api]` dependency to Dockerfile
- ✅ Fixed Python syntax error in global variable declaration
- ✅ Semantic search working with sentence-transformers/all-MiniLM-L6-v2
- ✅ Document upload and embedding generation operational
- ✅ Critical production build fixes implemented (Sprint 8)
- ✅ Stable production deployment achieved

## Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Access development server at: http://localhost:5173
```

## Architecture

### Tech Stack

- **React 19**: Modern UI framework with concurrent features
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Modern, accessible UI components
- **Lucide React**: Icon library

### Core Components

1. **src/App.jsx** - Main React application
   - Chat interface with streaming message display
   - Settings modal with model selector
   - WebGPU/WASM runtime status indicator
   - Function calling demo integration
   - Lazy loading for performance (except MarkdownRenderer)

2. **src/lib/llm-service.js** - LLM abstraction service
   - WebGPU detection and WebLLM initialization
   - WASM fallback orchestration
   - Streaming response handling
   - Model switching capabilities

3. **src/components/** - React components
   - **ui/** - shadcn/ui components (Button, Dialog, etc.)
   - **ModelSelector.jsx** - AI model selection dropdown with WebGPU/WASM support
   - **PersonaSelector.jsx** - AI persona management with custom persona creation
   - **ThemeSwitcher.jsx** - Theme selection with quick light/dark toggle
   - **DropdownPortal.jsx** - Portal-based dropdown rendering for z-index isolation
   - **SimpleMarkdownRenderer.jsx** - Custom lightweight markdown renderer (no deps)
   - **LoadingSkeletons.jsx** - Loading states for lazy components
   - **ConversationSwitcher.jsx** - Multi-conversation management

4. **sw.js** - Service Worker (updated for Vite)
   - Caches built assets and model shards
   - Offline-first PWA functionality

5. **src/fallback/wllama.js** - WASM fallback module
   - Loads when WebGPU unavailable
   - Uses tiny GGUF model (stories260K) for quick demo

6. **src/lib/rag-service.js** - RAG service (Sprint 9)
   - Document processing and chunking
   - txtai backend integration for semantic search
   - PouchDB for local document storage
   - Automatic context injection when Library toggle enabled

7. **txtai/** - Backend RAG service
   - FastAPI service with txtai embeddings
   - Semantic search via sentence-transformers/all-MiniLM-L6-v2
   - Supports PDF, DOCX, XLSX, TXT, MD, HTML, CSV
   - `/search` endpoint for similarity search
   - `/process/file` endpoint for document upload

### External Dependencies (CDN)

- WebLLM: `https://unpkg.com/@mlc-ai/web-llm@0.2.79?module`
- Wllama: `https://unpkg.com/@wllama/wllama@2.3.5/esm/wasm-from-cdn.js?module`

### Key Design Patterns

1. **React Hooks**: State management with useState, useEffect
2. **Component-Based**: Modular UI components with proper separation
3. **Streaming UI**: Real-time message updates during LLM generation
4. **Runtime Detection**: Automatic WebGPU/WASM fallback
5. **Service Integration**: Clean abstraction between UI and LLM logic

### UI Features

- **Theme System**: 8 themes (Light, Dark, Ocean, Forest, Sunset, Midnight, Rose, Monochrome)
- **AI Personas**: Built-in personas (Assistant, Coder, Teacher, Creative Writer, Analyst) + custom personas
- **Model Selection**: Dynamic model picker with WebGPU/WASM runtime detection
- **Portal Dropdowns**: Z-index isolated dropdowns with proper dark theme support
- **Responsive Design**: Desktop and mobile optimized
- **Streaming UI**: Real-time message updates during LLM generation
- **Runtime Status**: WebGPU/WASM indicators with automatic fallback
- **RAG/Library**: Upload documents and ask questions with automatic semantic search context injection

## Testing Considerations

- Test in Chrome/Edge for WebGPU support
- Test fallback by using browsers without WebGPU
- Check responsive design on mobile devices
- Verify streaming message updates
- Test settings modal and model switching

## Model Management

- WebLLM models dynamically loaded from MLC's prebuilt list
- Default WASM fallback uses tiny stories260K.gguf
- Models cached by Service Worker for faster reloads
- Temperature and other parameters configurable via settings

## RAG/Library Feature

**How It Works**:
1. Upload documents via document icon (supports PDF, DOCX, XLSX, TXT, MD, HTML, CSV)
2. Documents are processed by txtai backend into semantic chunks
3. Toggle Library switch ON to enable RAG
4. Ask questions normally - no special syntax required
5. System automatically searches documents for relevant context (similarity threshold 0.3)
6. Top 3 relevant chunks are injected into the prompt
7. LLM responds using document context

**Backend**: txtai FastAPI service on port 8001
- Endpoint: `POST /search` - Semantic similarity search
- Endpoint: `POST /process/file` - Document upload and chunking
- Model: sentence-transformers/all-MiniLM-L6-v2
- Storage: In-memory (resets on container restart)

**Known Issues**:
- Documents must be re-uploaded after container restart (no persistent storage yet)
- IPv6 connection issues - use IPv4 (127.0.0.1) instead of localhost if needed