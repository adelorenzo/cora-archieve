# Cora - AI Assistant Development Plan
**Project Codename:** Cora
**Version:** 2.0.0 (from WebLLM v1.1.0)
**Status:** IN PROGRESS - Sprint 9 RAG Implementation
**Date:** September 12, 2024
**Last Updated:** January 18, 2025  

---

## Executive Summary
Transform the current WebLLM chat application into **Cora**, an advanced AI assistant featuring RAG capabilities, intelligent web integration, customizable AI agents, and a curated model selection. Now containerized with microservices architecture for enhanced privacy and scalability.

---

## Core Enhancements

### 1. RAG (Retrieval-Augmented Generation)
- Lightweight embedding model for browser-based vector search
- PouchDB for persistent in-browser storage
- Document management interface
- Knowledge base capabilities

### 2. Model Curation
- Reduce model list from 50+ to 6 carefully selected models
- Focus on diverse use cases and optimal performance
- Clear model descriptions and recommendations

### 3. AI Agent System
- 8 preset AI agents with distinct personalities
- Custom agent builder interface
- Agent configuration and management
- Persistent agent storage in PouchDB

### 4. Smart Web Fetch
- Intelligent decision-making for when to fetch web content
- Browser-compatible HTML parsing (Readability.js)
- Content extraction and summarization
- LLM-driven fetch triggers

### 5. Integrated Web Search
- DuckDuckGo Instant Answer API integration
- SearXNG as fallback option
- Search result processing and ranking
- Privacy-focused implementation

---

## Sprint Schedule

### Sprint 1: Foundation & RAG Implementation ✅ COMPLETED
**Start Date:** September 12, 2025
**End Date:** October 3, 2025

#### Deliverables:
- [x] PouchDB integration with schemas for documents, embeddings, settings
- [x] Embedding generation service using all-MiniLM-L6-v2
- [x] Vector similarity search implementation
- [x] RAG retrieval pipeline
- [x] Document upload and management UI
- [x] RAG-enhanced chat responses

#### Success Metrics:
- ✅ RAG retrieval accuracy achieved
- ✅ PouchDB operations <100ms
- ✅ Document upload success rate >95%

---

### Sprint 2: Model Curation & AI Personas ✅ COMPLETED
**Start Date:** October 4, 2025
**End Date:** October 24, 2025

#### Deliverables:
- [x] Curated list of 5 optimized models:
  - SmolLM2-135M (ultra-light/speed)
  - DeepSeek-1.5B (general purpose)
  - Gemma-2-2B (creative/balanced)
  - Phi-3.5-mini (coding/reasoning)
  - Hermes-3-Llama-8B (advanced/function calling)
- [x] 5 preset AI personas:
  - Assistant (general purpose)
  - Coder (technical)
  - Teacher (educational)
  - Creative Writer (creative)
  - Analyst (analytical)
- [x] Custom persona builder interface
- [x] Persona management and switching

#### Success Metrics:
- ✅ Model loading time optimized
- ✅ Persona distinctiveness validated
- ✅ Custom persona creation functional

---

### Sprint 3: Web Search Integration ✅ COMPLETED
**Start Date:** October 25, 2025
**End Date:** November 14, 2025

#### Deliverables:
- [x] SearXNG integration for web search
- [x] Function calling implementation for web search
- [x] Manual function calling for Hermes model
- [x] Search result processing and display
- [x] Web context integration in chat

#### Success Metrics:
- ✅ Web search functional
- ✅ Search results integrated in responses
- ✅ Function calling working

---

### Sprint 4: Settings Persistence ✅ COMPLETED
**Start Date:** November 15, 2025
**End Date:** November 28, 2025

#### Deliverables:
- [x] Centralized settings service
- [x] Full localStorage persistence
- [x] Settings export/import functionality
- [x] Persona settings integration
- [x] Model preferences persistence
- [x] Theme and UI settings persistence
- [x] Comprehensive test suite

#### Success Metrics:
- ✅ All settings persist across sessions
- ✅ Export/import working
- ✅ Test coverage achieved

---

### Sprint 5: Chat Management System ✅ COMPLETED
**Start Date:** November 29, 2025
**End Date:** December 12, 2025

#### Deliverables:
- [x] ConversationManager service implementation
- [x] Multiple conversation support
- [x] ConversationSwitcher UI component
- [x] Search, archive, and star features
- [x] Export/import conversations
- [x] Conversation persistence
- [x] Fixed web search integration with conversation manager

#### Success Metrics:
- ✅ Multiple conversations working
- ✅ Search and filtering functional
- ✅ Export/import operational
- ✅ Web search fixed and integrated

---

### Sprint 6: Performance & Stability ✅ COMPLETED
**Start Date:** December 13, 2024
**End Date:** January 2, 2025

#### Deliverables:
- [x] Performance optimizations
- [x] Memory usage optimization
- [x] Code cleanup and refactoring
- [x] Removed problematic RAG implementation (causing crashes)

#### Success Metrics:
- ✅ App stability restored (no more crashes)
- ✅ Memory usage reduced
- ✅ Cleaner codebase without experimental features

#### Important Notes:
- RAG feature was removed due to persistent browser memory crashes
- RAG implementation moved to Sprint 9 for complete redesign
- Focus shifted to app stability and performance

---

### Sprint 7: Containerization ✅ COMPLETED
**Start Date:** January 3, 2025
**End Date:** January 10, 2025

#### Deliverables:
- [x] Docker containerization
- [x] Multi-stage build optimization
- [x] nginx serving static files
- [x] Docker Compose setup
- [x] Health checks implementation

#### Success Metrics:
- ✅ Docker image size optimized
- ✅ Container starts in <5s
- ✅ Health checks passing

---

### Sprint 8: Microservices Architecture ✅ COMPLETED
**Start Date:** January 11, 2025
**End Date:** January 17, 2025

#### Deliverables:
- [x] SearXNG integration as separate service
- [x] Docker Compose multi-service orchestration
- [x] Internal network configuration (privacy-first)
- [x] Runtime configuration injection
- [x] Service documentation
- [x] CI/CD with Gitea Actions

#### Success Metrics:
- ✅ SearXNG running internally (no exposed ports)
- ✅ Services communicate via Docker network
- ✅ Zero external data leakage
- ✅ Automated builds working

---

### Future Sprints (Planned)

### Sprint 9: RAG Implementation with txtai 🚀 NEXT (3 weeks)
**Start Date:** January 18, 2025
**End Date:** February 7, 2025

#### Objectives:
- Implement privacy-first RAG using containerized txtai service
- Use IndexedDB + PouchDB for browser storage
- Maintain complete data privacy

#### Deliverables:
- [ ] **txtai Microservice Integration**
  - [ ] Add txtai to Docker Compose stack
  - [ ] Configure for internal-only access
  - [ ] Setup document processing endpoints
  - [ ] Implement embedding generation API
- [ ] **Browser Storage Layer**
  - [ ] PouchDB integration for document metadata
  - [ ] IndexedDB for vector storage
  - [ ] Encryption at rest (Web Crypto API)
  - [ ] Storage quota management
- [ ] **Document Processing Pipeline**
  - [ ] Upload manager with chunking
  - [ ] Support PDF, DOCX, XLSX, TXT, MD
  - [ ] Progress tracking and status
  - [ ] Error handling and retry logic
- [ ] **Vector Search Implementation**
  - [ ] Client-side cosine similarity search
  - [ ] Top-k retrieval optimization
  - [ ] Hybrid search with SearXNG
  - [ ] Result ranking and scoring
- [ ] **UI Components**
  - [ ] Document upload interface
  - [ ] Collection management
  - [ ] RAG toggle per conversation
  - [ ] Source attribution display

#### Success Metrics:
- Document processing <5s for typical PDF
- Vector search latency <100ms
- Storage efficiency: 10MB per 1000 pages
- Zero external data transmission

---

### Sprint 10: Advanced Features & UX (3 weeks)
**Start Date:** February 8, 2025
**End Date:** February 28, 2025

#### Deliverables:
- [ ] **PWA Improvements**
  - [ ] Loading time optimizations (<2s)
  - [ ] Mobile-first responsive design
  - [ ] Offline functionality enhancement
  - [ ] App install prompts
- [ ] **Voice Capabilities**
  - [ ] Voice input (Web Speech API)
  - [ ] Voice output (TTS)
  - [ ] Voice commands
- [ ] **Advanced Templates**
  - [ ] Prompt template library
  - [ ] Custom template builder
  - [ ] Template sharing
- [ ] **Collaboration Features**
  - [ ] Chat sharing via links
  - [ ] Export conversations as markdown/PDF
  - [ ] Multi-user profiles

---

### Sprint 11: Enterprise Features (3 weeks)
**Start Date:** March 1, 2025
**End Date:** March 21, 2025

#### Deliverables:
- [ ] Admin dashboard
- [ ] Usage analytics and metrics
- [ ] Batch processing capabilities
- [ ] API endpoint exposure
- [ ] Advanced security features
- [ ] Multi-tenant support
- [ ] SSO integration options

---

### Sprint 12: Community Platform (3 weeks)
**Start Date:** March 22, 2025
**End Date:** April 11, 2025

#### Deliverables:
- [ ] Agent sharing platform
- [ ] Community agents repository
- [ ] Agent rating and reviews
- [ ] Agent composition and chaining
- [ ] Agent marketplace UI
- [ ] Template marketplace
- [ ] Community forums integration

---

## Technical Architecture

### RAG Stack
- **Embedding Model:** all-MiniLM-L6-v2 (ONNX.js)
- **Vector Database:** In-memory with PouchDB persistence
- **Similarity Search:** Cosine similarity
- **Chunking Strategy:** 500-token overlapping windows

### Web Integration
- **HTML Parsing:** DOMParser + Readability.js
- **Primary Search:** DuckDuckGo Instant Answer API
- **Fallback Search:** SearXNG instance
- **Security:** Content Security Policy compliance

### Storage Architecture
```javascript
// PouchDB Collections
{
  documents: {    // RAG knowledge base
    id: string,
    title: string,
    content: string,
    metadata: object,
    created: timestamp
  },
  embeddings: {   // Vector storage
    id: string,
    doc_id: string,
    vector: float[],
    chunk: string
  },
  settings: {     // User preferences
    theme: string,
    model: string,
    temperature: float,
    features: object
  },
  agents: {       // Custom AI agents
    id: string,
    name: string,
    prompt: string,
    model: string,
    temperature: float,
    avatar: string
  }
}
```

---

## Git Management Protocol

### Commit Structure
```bash
# Format: <type>(<scope>): <message>
# Types: feat, fix, docs, refactor, test, chore
# Scopes: rag, agents, web, ui, core

# Examples:
feat(rag): implement vector similarity search
fix(agents): resolve agent switching memory leak
docs(web): add search API integration guide
```

### Milestone Commits
- End of each day: Progress commit
- Feature complete: Feature commit with tests
- Sprint end: Release candidate tag
- After review: Merge to main branch

### Branch Strategy
```bash
main                 # Production-ready code
├── develop         # Integration branch
│   ├── sprint-1-rag
│   ├── sprint-2-agents
│   ├── sprint-3-web
│   └── sprint-4-polish
```

---

## Risk Mitigation

### Technical Risks
| Risk | Mitigation Strategy |
|------|-------------------|
| Browser storage limits | Implement quota monitoring & automatic cleanup |
| Model loading performance | Progressive loading with cache management |
| CORS restrictions | Proxy server fallback options |
| Memory constraints | Lazy loading & background processing |

### User Experience Risks
| Risk | Mitigation Strategy |
|------|-------------------|
| Feature complexity | Progressive disclosure & guided onboarding |
| Privacy concerns | Local-first approach with clear data policies |
| Performance degradation | Smart defaults & customizable limits |

---

## Performance Targets

### Critical Metrics
- **Initial Load:** <3s on fast connection
- **RAG Query:** <2s for similarity search
- **Model Switch:** <1s for cached models
- **Web Fetch:** <5s for content extraction
- **Search Results:** <3s for API response

### Memory Limits
- **PouchDB:** Max 50MB per collection
- **Model Cache:** Max 2GB total
- **Embeddings:** Max 10,000 vectors in memory

---

## Success Criteria

### Project Success
- ✅ All 5 core enhancements implemented
- ✅ Performance targets achieved
- ✅ Test coverage >80%
- ✅ Zero critical security vulnerabilities
- ✅ User satisfaction >4.5/5

### Sprint Success
- ✅ Sprint deliverables 100% complete
- ✅ Tests passing for all features
- ✅ Documentation up to date
- ✅ Code reviewed and approved
- ✅ Committed and pushed to repository

---

## Project Timeline

**Total Duration:** Extended to 30 weeks
**Start Date:** September 12, 2024
**Sprints Completed:** 8 of 12 planned
**Current Sprint:** Sprint 9 (RAG Implementation)
**Version:** Cora 2.0.0
**Estimated Completion:** April 2025  

---

## Progress Summary

### Completed Sprints (8/12)
- ✅ **Sprint 1:** RAG Implementation - Initial implementation (later removed)
- ✅ **Sprint 2:** Model Curation & Personas - 5 optimized models, 5 personas
- ✅ **Sprint 3:** Web Search - SearXNG integration with function calling
- ✅ **Sprint 4:** Settings Persistence - Complete localStorage implementation
- ✅ **Sprint 5:** Chat Management - Multi-conversation support with export/import
- ✅ **Sprint 6:** Performance & Stability - Removed problematic RAG, improved stability
- ✅ **Sprint 7:** Containerization - Docker, nginx, health checks
- ✅ **Sprint 8:** Microservices Architecture - SearXNG integration, CI/CD

### Current Status
- **Active Sprint:** Sprint 9 - RAG Implementation with txtai
- **Completion Rate:** 67% (8 of 12 planned sprints)
- **Key Achievement:** Containerized microservices architecture with privacy-first design
- **Next Focus:** RAG implementation using txtai + IndexedDB/PouchDB

---

## Approval

**Original Plan Status:** ✅ APPROVED
**Current Status:** 🚀 EXECUTING - Sprint 9
**Progress:** ON TRACK

---

*This document represents the official development plan for Cora. Last updated after Sprint 8 completion - Successfully containerized with microservices architecture. Sprint 9 focuses on RAG implementation using txtai with privacy-first design.*