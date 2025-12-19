/**
 * Embedding Demo Component
 * Demonstrates the browser-based embedding service functionality
 */

import React, { useState, useEffect } from 'react';
import { embeddingService, ragService } from '../lib/embeddings/index.js';

const EmbeddingDemo = () => {
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [inputText, setInputText] = useState('Machine learning transforms how we process information');
  const [embedding, setEmbedding] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize services on component mount
  useEffect(() => {
    initializeServices();
  }, []);

  const initializeServices = async () => {
    try {
      setStatus('initializing');
      setMessage('Loading embedding model...');
      
      await embeddingService.initialize((prog) => {
        setProgress(prog.progress);
        setMessage(prog.message);
      });
      
      setStatus('ready');
      setMessage('Embedding service ready');
    } catch (error) {
      console.error('Initialization failed:', error);
      setStatus('error');
      setMessage(`Failed to initialize: ${error.message}`);
    }
  };

  const generateEmbedding = async () => {
    if (!inputText.trim()) return;
    
    try {
      setIsLoading(true);
      const result = await embeddingService.generateEmbeddings(inputText);
      setEmbedding(result);
    } catch (error) {
      console.error('Embedding generation failed:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setIsLoading(true);
      
      // Initialize RAG service if needed
      if (!ragService.initialized) {
        await ragService.initialize();
      }
      
      const results = await ragService.search(searchQuery, {
        limit: 5,
        threshold: 0.3
      });
      
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setMessage(`Search error: ${error.message}`);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'ready': return 'text-green-600';
      case 'initializing': return 'text-blue-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatEmbedding = (vector) => {
    if (!vector) return '';
    const first5 = vector.slice(0, 5).map(n => n.toFixed(4)).join(', ');
    return `[${first5}...] (${vector.length}D)`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Browser Embedding Service Demo</h2>
        
        {/* Service Status */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Service Status:</span>
            <span className={`font-semibold ${getStatusColor()}`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
          
          {status === 'initializing' && (
            <div className="mt-2">
              <div className="bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">{message}</p>
            </div>
          )}
          
          {message && status !== 'initializing' && (
            <p className="text-sm text-gray-600 mt-1">{message}</p>
          )}
        </div>

        {/* Embedding Generation Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3">Generate Embedding</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Input Text:</label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                placeholder="Enter text to generate embeddings..."
              />
            </div>
            
            <button
              onClick={generateEmbedding}
              disabled={status !== 'ready' || isLoading || !inputText.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Generating...
                </>
              ) : (
                'Generate Embedding'
              )}
            </button>
            
            {embedding && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm font-medium mb-1">Generated Embedding:</p>
                <code className="text-xs text-gray-700 break-all">
                  {formatEmbedding(embedding)}
                </code>
              </div>
            )}
          </div>
        </div>

        {/* Semantic Search Section */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Semantic Search</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Search Query:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter search query..."
                  onKeyPress={(e) => e.key === 'Enter' && performSearch()}
                />
                <button
                  onClick={performSearch}
                  disabled={status !== 'ready' || isLoading || !searchQuery.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Searching...
                    </>
                  ) : (
                    'Search'
                  )}
                </button>
              </div>
            </div>
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium">Search Results:</p>
                {searchResults.map((result, index) => (
                  <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-medium text-blue-900">
                        {result.document?.title || 'Untitled'}
                      </h4>
                      <span className="text-sm text-blue-600">
                        {Math.round(result.score * 100)}% match
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">
                      {result.text.length > 150 
                        ? `${result.text.substring(0, 150)}...`
                        : result.text
                      }
                    </p>
                  </div>
                ))}
              </div>
            )}
            
            {searchQuery && searchResults.length === 0 && !isLoading && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  No results found. Try adding some documents first or search for different terms.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Service Info */}
        {status === 'ready' && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Service Information:</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Model:</span> all-MiniLM-L6-v2
              </div>
              <div>
                <span className="font-medium">Dimensions:</span> 384
              </div>
              <div>
                <span className="font-medium">Type:</span> Client-side WebAssembly
              </div>
              <div>
                <span className="font-medium">Fallback:</span> Hash-based similarity
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmbeddingDemo;