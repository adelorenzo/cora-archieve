# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a modern React-based browser LLM application that runs entirely client-side. It uses WebLLM with WebGPU as the primary runtime, with automatic fallback to WASM (via wllama) when WebGPU is unavailable.

## Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Access development server at: http://localhost:8000
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

4. **sw.js** - Service Worker (updated for Vite)
   - Caches built assets and model shards
   - Offline-first PWA functionality

5. **src/fallback/wllama.js** - WASM fallback module
   - Loads when WebGPU unavailable
   - Uses tiny GGUF model (stories260K) for quick demo

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