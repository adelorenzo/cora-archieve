# Changelog

## [1.1.0] - 2025-12-18

### Added
- **RAG Loading States**: Visual indicator showing when RAG is searching documents (spinning icon + "Searching..." text)
- **Unit Testing with Vitest**: Complete test infrastructure with 26 passing tests for settings-service
- **Custom Hooks**: Extracted reusable hooks for better code organization
  - `useMessages` - Message management (add, remove, update, clear)
  - `useLLM` - LLM state management (initialization, model switching, generation)
- **AboutModal Component**: Architecture explanation modal for transparency
- **File Parser**: Client-side document parsing for PDF, DOCX, XLSX, CSV, TXT, MD, HTML, JSON
- **Embedding Service**: Local browser-based embeddings using transformers.js
- **Error Utilities**: Standardized error handling utilities
- **Document Upload Modal Tests**: Comprehensive Playwright tests for modal functionality

### Fixed
- **Critical: Document Upload Modal z-index**: Modal now renders correctly above chat interface using React Portal
- **Modal Background**: Fixed white background not showing (HSL variable issue with Tailwind)
- **Clear All Button Visibility**: Button now shows when stats indicate documents exist
- **Console.log Removal**: Production builds now strip all application console.logs (only 1 from third-party libs remains)

### Changed
- **Dialog Component**: Rewrote to use `createPortal` for proper stacking context isolation
- **Vite Config**: Added terser minification with console stripping
- **Package.json**: Added unit test scripts (`test:unit`, `test:unit:watch`, `test:unit:coverage`)

### Improved
- **JSDoc Documentation**: Added comprehensive JSDoc to key LLM service methods
- **Code Organization**: New `/src/hooks` directory for custom React hooks
- **Test Infrastructure**: Vitest setup with jsdom, mocks for localStorage, matchMedia, ResizeObserver

## [1.0.0] - 2024-01-16

### Fixed
- Fixed web search functionality by properly refactoring `setMessages` calls to use conversation manager
- Updated `updateLastMessage` helper to support both callback functions and direct object updates
- Resolved message display issues during web search streaming responses

### Changed
- Removed Qwen 2.5 0.5B model from curated models list (now 5 models total)
- Updated model priorities: DeepSeek moved to priority 2

### Added
- Playwright test suite for web search functionality
- Support for Google Chrome browser in test configuration
- Proper model download progress monitoring in tests

## Sprint 9: RAG Implementation
- Full RAG functionality with txtai backend
- Fixed txtai `/search` endpoint
- Semantic search with sentence-transformers/all-MiniLM-L6-v2
- Document upload and embedding generation

## Sprint 8: Containerization
- Docker multi-stage build
- Docker Compose with SearXNG and txtai services
- Nginx reverse proxy with CSP headers
- Production deployment configuration

## Sprint 5: Chat Management System
- Conversation management with ConversationManager service
- ConversationSwitcher UI with search, archive, and star features
- Export/import functionality for conversations
- Conversation persistence to localStorage

## Sprint 4: Settings Persistence
- Centralized settings service with localStorage
- Full settings persistence across sessions
- Persona settings integration
- Export/import capabilities for settings backup

## Previous Updates
- Web search integration with SearXNG
- RAG system with document upload
- Multiple themes and AI personas
- Curated model selection
- PWA with service worker caching
