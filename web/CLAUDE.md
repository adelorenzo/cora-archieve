# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a modern React-based browser LLM application that runs entirely client-side. It uses WebLLM with WebGPU as the primary runtime, with automatic fallback to WASM (via wllama) when WebGPU is unavailable.

**Latest Status (Sprint 10 - Desktop App MVP)**:
- ✅ Tauri desktop app initialization complete
- ✅ DuckDuckGo search integration for desktop (no backend dependency)
- ✅ RAG UI elements hidden in desktop mode
- ✅ Tauri environment detection implemented
- ✅ Local data persistence (TauriStorage abstraction layer)
  - Browser mode: localStorage
  - Desktop mode: file system via Tauri APIs
  - Conversations and settings persist across restarts
- ⏳ App icon update pending
- ⏳ Native menu bar and keyboard shortcuts pending

**Sprint 9 Complete**:
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

7. **src/lib/tauri-storage.js** - Storage abstraction layer (Sprint 10)
   - Cross-platform storage abstraction
   - Browser mode: uses localStorage
   - Desktop mode: uses Tauri file system APIs
   - Transparent async operations for both environments
   - Stores data in `${appDataDir}/data/*.json`

8. **src/lib/search-service.js** - DuckDuckGo search service (Sprint 10)
   - Direct DuckDuckGo Instant Answer API integration
   - Used by desktop app (no backend dependency)
   - Formats results with title, snippet, URL, source

9. **src/lib/web-search-service.js** - Enhanced web search (Sprint 10)
   - Detects Tauri environment automatically
   - Browser mode: uses SearXNG backend
   - Desktop mode: uses DuckDuckGo API directly (no CORS proxy needed)
   - Smart caching and error handling

10. **txtai/** - Backend RAG service
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

## Desktop App (Tauri)

**Sprint 10 - Desktop Application MVP**

Cora AI is now available as a native desktop application built with Tauri 2.8.4. The desktop app runs completely standalone with NO Docker or backend dependencies.

### Desktop vs Browser Differences

**Browser Mode**:
- Full feature set including RAG/Library
- Requires Docker containers for txtai and SearXNG
- Uses localStorage for data persistence
- Web search via SearXNG backend

**Desktop Mode**:
- Simplified feature set (no RAG - deferred to v1.1)
- No Docker required - completely self-contained
- Uses file system for data persistence via Tauri APIs
- Web search via DuckDuckGo API directly

### Environment Detection

The app automatically detects if it's running in Tauri:
```javascript
const isTauri = typeof window !== 'undefined' && window.__TAURI__ !== undefined;
```

This detection enables:
- Conditional UI rendering (hide RAG features in desktop)
- Storage abstraction (localStorage vs file system)
- Search service selection (SearXNG vs DuckDuckGo)

### Data Persistence

**TauriStorage Abstraction** (`src/lib/tauri-storage.js`):
- Provides unified async API for both environments
- Desktop: saves to `${appDataDir}/data/*.json`
- Browser: uses localStorage (existing behavior)
- Files: `cora-settings.json`, `cora-conversations.json`

**What Persists**:
- User settings (model preference, theme, temperature)
- Conversation history with all messages
- Custom personas
- Chat history

### Web Search Implementation

Desktop app uses DuckDuckGo Instant Answer API:
- No CORS proxy needed (Tauri bypasses browser restrictions)
- Direct API access: `https://api.duckduckgo.com/?q={query}&format=json`
- Returns AbstractText, RelatedTopics, and source URLs
- Integrated into function calling system

### Development Commands

**Desktop App**:
```bash
cd web
npm run tauri dev    # Run desktop app in dev mode
npm run tauri build  # Build production desktop app
```

**Browser App** (existing):
```bash
npm run dev          # Vite dev server
npm run build        # Production build
```

### Tauri Configuration

Located in `src-tauri/tauri.conf.json`:
- App identifier: `net.oe74.cora-ai`
- Frontend dist: `../web/dist`
- Dev URL: `http://localhost:5173`
- Window size: 1200x800px

### Known Limitations (Desktop MVP)

1. **No RAG/Library Feature**: Requires txtai backend - deferred to v1.1
2. **App Icon**: Default Tauri icon - custom icon update pending
3. **No Native Menus**: File/Edit/View menus not implemented yet
4. **No Keyboard Shortcuts**: Native shortcuts pending

### Roadmap (Post-MVP)

- [ ] Custom app icon with Cora branding
- [ ] Native menu bar (File, Edit, View, Help)
- [ ] Keyboard shortcuts (Cmd+N for new chat, etc.)
- [ ] RAG feature with local embeddings (v1.1)
- [ ] Auto-update functionality
- [ ] System tray integration
- [ ] Multi-window support