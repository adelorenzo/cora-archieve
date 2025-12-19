import React, { useState, useCallback } from 'react';
import { Search, Globe, Loader2, X, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import webSearchService from '../lib/web-search-service';

const WebSearchPanel = ({ onResultSelect, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedResults, setExpandedResults] = useState(new Set());
  const [fetchingContent, setFetchingContent] = useState(new Set());

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      // Initialize service if needed
      if (!webSearchService.initialized) {
        await webSearchService.initialize();
      }

      // Perform search
      const searchResults = await webSearchService.search(query);
      setResults(searchResults);
    } catch (err) {
      console.error('[WebSearch] Search failed:', err);
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchContent = async (url) => {
    setFetchingContent(prev => new Set([...prev, url]));
    
    try {
      const content = await webSearchService.fetchWebContent(url);
      
      // Update results with fetched content
      setResults(prev => ({
        ...prev,
        fetchedContent: [
          ...(prev.fetchedContent || []),
          content
        ]
      }));
      
      // Auto-expand this result
      setExpandedResults(prev => new Set([...prev, url]));
    } catch (err) {
      console.error(`[WebSearch] Failed to fetch ${url}:`, err);
    } finally {
      setFetchingContent(prev => {
        const next = new Set(prev);
        next.delete(url);
        return next;
      });
    }
  };

  const toggleExpanded = (url) => {
    setExpandedResults(prev => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  };

  const insertIntoChat = (text, source) => {
    if (onResultSelect) {
      onResultSelect({
        type: 'web_search',
        content: text,
        source: source,
        query: query
      });
    }
  };

  const formatResultText = (result) => {
    let text = '';
    
    if (result.answer) {
      text = result.answer.text;
    } else if (result.abstract) {
      text = result.abstract.text;
    } else if (result.definition) {
      text = result.definition.text;
    }
    
    return text;
  };

  return (
    <div className="flex flex-col h-full bg-background border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Web Search</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="p-4 border-b border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search the web..."
            className="flex-1 px-3 py-2 bg-background border border-input rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-md mb-4">
            {error}
          </div>
        )}

        {results && (
          <div className="space-y-4">
            {/* Instant Answer */}
            {results.answer && (
              <div className="p-4 bg-primary/10 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-foreground">Answer</h4>
                  <button
                    onClick={() => insertIntoChat(results.answer.text, 'DuckDuckGo Answer')}
                    className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                  >
                    Use in Chat
                  </button>
                </div>
                <p className="text-sm text-foreground">{results.answer.text}</p>
                {results.answer.type && (
                  <span className="text-xs text-muted-foreground mt-2 inline-block">
                    Type: {results.answer.type}
                  </span>
                )}
              </div>
            )}

            {/* Abstract/Summary */}
            {results.abstract && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-foreground">Summary</h4>
                  <div className="flex gap-2">
                    {results.abstract.url && (
                      <button
                        onClick={() => handleFetchContent(results.abstract.url)}
                        disabled={fetchingContent.has(results.abstract.url)}
                        className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
                      >
                        {fetchingContent.has(results.abstract.url) ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          'Fetch Full'
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => insertIntoChat(results.abstract.text, results.abstract.source)}
                      className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                    >
                      Use in Chat
                    </button>
                  </div>
                </div>
                <p className="text-sm text-foreground mb-2">{results.abstract.text}</p>
                {results.abstract.source && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Source: {results.abstract.source}</span>
                    {results.abstract.url && (
                      <a
                        href={results.abstract.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Definition */}
            {results.definition && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-foreground">Definition</h4>
                  <button
                    onClick={() => insertIntoChat(results.definition.text, results.definition.source)}
                    className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                  >
                    Use in Chat
                  </button>
                </div>
                <p className="text-sm text-foreground mb-2">{results.definition.text}</p>
                {results.definition.source && (
                  <span className="text-xs text-muted-foreground">
                    Source: {results.definition.source}
                  </span>
                )}
              </div>
            )}

            {/* Related Topics */}
            {results.related && results.related.length > 0 && (
              <div>
                <h4 className="font-semibold text-foreground mb-3">Related Results</h4>
                <div className="space-y-2">
                  {results.related.map((item, index) => (
                    <div key={index} className="p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-start justify-between">
                        <p className="text-sm text-foreground flex-1">{item.text}</p>
                        <div className="flex gap-2 ml-2">
                          {item.url && (
                            <>
                              <button
                                onClick={() => handleFetchContent(item.url)}
                                disabled={fetchingContent.has(item.url)}
                                className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
                              >
                                {fetchingContent.has(item.url) ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  'Fetch'
                                )}
                              </button>
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded hover:bg-muted/80 flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fetched Content */}
            {results.fetchedContent && results.fetchedContent.length > 0 && (
              <div>
                <h4 className="font-semibold text-foreground mb-3">Fetched Content</h4>
                <div className="space-y-3">
                  {results.fetchedContent.map((content, index) => (
                    <div key={index} className="border border-border rounded-lg overflow-hidden">
                      <div
                        className="p-3 bg-muted/50 flex items-center justify-between cursor-pointer"
                        onClick={() => toggleExpanded(content.url)}
                      >
                        <div className="flex-1">
                          <h5 className="font-medium text-foreground">{content.title}</h5>
                          <p className="text-xs text-muted-foreground mt-1">{content.url}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              insertIntoChat(content.content, content.title);
                            }}
                            className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                          >
                            Use
                          </button>
                          {expandedResults.has(content.url) ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      {expandedResults.has(content.url) && (
                        <div className="p-3 bg-background">
                          {content.description && (
                            <p className="text-sm text-muted-foreground mb-3">{content.description}</p>
                          )}
                          <div className="max-h-64 overflow-y-auto">
                            <p className="text-sm text-foreground whitespace-pre-wrap">
                              {content.content}
                            </p>
                          </div>
                          {content.headings && content.headings.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border">
                              <h6 className="text-xs font-semibold text-muted-foreground mb-2">Headings</h6>
                              <div className="flex flex-wrap gap-1">
                                {content.headings.map((heading, i) => (
                                  <span key={i} className="text-xs px-2 py-1 bg-muted rounded">
                                    {heading}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && !results && !error && (
          <div className="text-center text-muted-foreground py-8">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Search the web for information</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebSearchPanel;