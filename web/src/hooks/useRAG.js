import { useState, useEffect, useCallback } from 'react';
import ragService from '../lib/embeddings/rag-service';
import dbService from '../lib/database/db-service';

/**
 * Custom hook for RAG functionality
 * Manages RAG initialization, document operations, and status tracking
 */
export function useRAG() {
  const [ragState, setRAGState] = useState({
    initialized: false,
    initializing: false,
    documentCount: 0,
    indexedCount: 0,
    processingCount: 0,
    stats: null,
    error: null
  });

  /**
   * Initialize RAG service
   */
  const initializeRAG = useCallback(async (progressCallback = null) => {
    setRAGState(prev => {
      if (prev.initialized || prev.initializing) {
        return prev;
      }
      return {
        ...prev,
        initializing: true,
        error: null
      };
    });

    try {
      await ragService.initialize(progressCallback);
      
      // Load initial document stats inline to avoid dependency issues
      try {
        const documents = await dbService.searchDocuments();
        const indexedCount = documents.filter(doc => doc.indexed).length;
        const processingCount = documents.filter(doc => doc.status === 'processing').length;
        const stats = await ragService.getStats();
        
        setRAGState(prev => ({
          ...prev,
          initialized: true,
          initializing: false,
          documentCount: documents.length,
          indexedCount,
          processingCount,
          stats,
          error: null
        }));
      } catch (statsError) {
        // Still mark as initialized even if stats fail
        setRAGState(prev => ({
          ...prev,
          initialized: true,
          initializing: false
        }));
      }
    } catch (error) {
      console.error('RAG initialization failed:', error);
      setRAGState(prev => ({
        ...prev,
        initializing: false,
        error: error.message
      }));
      throw error;
    }
  }, []); // No dependencies to prevent re-creation

  /**
   * Update RAG statistics
   */
  const updateStats = useCallback(async () => {
    try {
      // Get document counts
      const documents = await dbService.searchDocuments();
      const indexedCount = documents.filter(doc => doc.indexed).length;
      const processingCount = documents.filter(doc => doc.status === 'processing').length;

      // Get detailed stats if RAG is initialized
      let stats = null;
      if (ragService.initialized) {
        stats = await ragService.getStats();
      }

      setRAGState(prev => ({
        ...prev,
        documentCount: documents.length,
        indexedCount,
        processingCount,
        stats,
        error: null
      }));
    } catch (error) {
      console.error('Failed to update RAG stats:', error);
      setRAGState(prev => ({
        ...prev,
        error: error.message
      }));
    }
  }, []);

  /**
   * Index a document
   */
  const indexDocument = useCallback(async (document, options = {}) => {
    if (!ragService.initialized) {
      throw new Error('RAG service not initialized');
    }

    try {
      await ragService.indexDocument(document, options);
      await updateStats();
    } catch (error) {
      console.error('Document indexing failed:', error);
      await updateStats(); // Update stats even on failure to reflect error status
      throw error;
    }
  }, [updateStats]);

  /**
   * Queue document for background indexing
   */
  const queueDocument = useCallback((document, options = {}) => {
    if (!ragService.initialized) {
      throw new Error('RAG service not initialized');
    }

    ragService.queueForIndexing(document, options);
    
    // Update stats after a short delay to reflect queued status
    setTimeout(updateStats, 100);
  }, [updateStats]);

  /**
   * Perform semantic search
   */
  const search = useCallback(async (query, options = {}) => {
    if (!ragService.initialized) {
      throw new Error('RAG service not initialized');
    }

    try {
      return await ragService.search(query, options);
    } catch (error) {
      console.error('RAG search failed:', error);
      throw error;
    }
  }, []);

  /**
   * Get search context for a query
   */
  const getSearchContext = useCallback(async (query, options = {}) => {
    if (!ragService.initialized) {
      return '';
    }

    try {
      return await ragService.getSearchContext(query, options);
    } catch (error) {
      console.error('Failed to get search context:', error);
      return '';
    }
  }, []);

  /**
   * Clear the RAG index
   */
  const clearIndex = useCallback(async () => {
    if (!ragService.initialized) {
      throw new Error('RAG service not initialized');
    }

    try {
      await ragService.clearIndex();
      await updateStats();
    } catch (error) {
      console.error('Failed to clear RAG index:', error);
      throw error;
    }
  }, [updateStats]);

  /**
   * Check if RAG is enabled (initialized with indexed documents)
   */
  const isRAGEnabled = useCallback(() => {
    return ragState.initialized && ragState.indexedCount > 0;
  }, [ragState.initialized, ragState.indexedCount]);

  /**
   * Get RAG status for UI indicators
   */
  const getRAGStatus = useCallback(() => {
    return {
      enabled: isRAGEnabled(),
      initialized: ragState.initialized,
      initializing: ragState.initializing,
      documentCount: ragState.documentCount,
      indexedCount: ragState.indexedCount,
      processingCount: ragState.processingCount,
      hasDocuments: ragState.documentCount > 0,
      error: ragState.error
    };
  }, [ragState, isRAGEnabled]);

  // Auto-update stats periodically when initialized
  useEffect(() => {
    if (!ragState.initialized) return;

    const interval = setInterval(updateStats, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [ragState.initialized, updateStats]);

  return {
    // State
    ragState,
    
    // Status methods
    isRAGEnabled,
    getRAGStatus,
    
    // Core operations
    initializeRAG,
    updateStats,
    
    // Document operations
    indexDocument,
    queueDocument,
    clearIndex,
    
    // Search operations
    search,
    getSearchContext
  };
}

export default useRAG;