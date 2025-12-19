# Stable Version Documentation

## Current Stable Release: v1.1.0

Tagged on: 2025-01-11

### Previous Stable: v1.0.0 (2025-01-11)

## Features in v1.1.0

### Core Features
- ✅ WebGPU-accelerated LLM inference
- ✅ WASM fallback for broad compatibility
- ✅ Multiple model support (SmolLM2, Llama, Phi, Qwen, etc.)
- ✅ Real-time streaming responses
- ✅ **NEW: Markdown rendering support for rich text formatting**
- ✅ **NEW: Error boundaries for stable rendering**
- ✅ Local storage for conversation persistence
- ✅ PWA support with service worker
- ✅ Temperature control for response creativity
- ✅ Clean, modern UI with Tailwind CSS

### Improvements in v1.1.0
- **Added markdown rendering** with react-markdown and remark-gfm
- **Fixed text duplication issue** in React 19 by removing StrictMode
- **Removed demo getTime() function** for cleaner UI
- **Added ErrorBoundary component** to prevent app crashes
- **Enhanced message rendering** with support for:
  - Headers (h1, h2, h3)
  - Bold and italic text
  - Code blocks with syntax highlighting
  - Lists (ordered and unordered)
  - Links with styling
  - Blockquotes
  - Tables

### Tech Stack
- React 19.0.0
- Vite 6.0.5
- WebLLM 0.2.79
- wllama 2.1.2
- react-markdown 9.0.3
- remark-gfm 4.0.0
- Tailwind CSS 3.4.17

## Branch Structure
- `main` - Current development
- `develop` - Active development branch
- `stable-v1.1.0` - Frozen stable release v1.1.0
- `stable-v1.0.0` - Previous stable release v1.0.0

## Recovery Instructions

To revert to this stable version if needed:

```bash
# Fetch latest tags
git fetch --tags

# Checkout the stable tag
git checkout v1.1.0-stable

# Or checkout the stable branch
git checkout stable-v1.1.0

# Install dependencies
npm install

# Run the application
npm run dev
```

## Changelog

### v1.1.0 (2025-01-11)
- Added markdown rendering support
- Fixed React 19 text duplication issue
- Removed demo functionality
- Added error boundaries
- Improved UI stability

### v1.0.0 (2025-01-11)
- Initial stable release
- WebGPU/WASM dual runtime
- Multiple model support
- Streaming responses
- PWA support