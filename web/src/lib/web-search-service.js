/**
 * Web Search Service
 * Provides web search and content fetching capabilities
 */

class WebSearchService {
  constructor() {
    this.initialized = false;
    this.searchCache = new Map();
    this.fetchCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache

    // SearXNG instances - local first, then public fallbacks
    // Use configuration from config.js or default to Docker internal network
    const searxngUrl = window.APP_CONFIG?.SEARXNG_URL || window.SEARXNG_URL || 'http://searxng:8080';
    this.searxInstances = [
      searxngUrl,  // Local Docker instance (no CORS proxy needed)
      'https://search.bus-hit.me',
      'https://searx.be',
      'https://searx.tiekoetter.com',
      'https://search.mdosch.de'
    ];
    this.currentInstanceIndex = 0;
    
    // Alternative: Use Wikipedia API for factual searches
    this.wikipediaAPI = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
    
    // Fallback to DuckDuckGo Instant Answer API
    this.duckduckgoAPI = 'https://api.duckduckgo.com/';
    
    // CORS proxy for fetching web content
    this.corsProxy = 'https://corsproxy.io/?';
  }

  /**
   * Initialize the service
   */
  async initialize() {
    if (this.initialized) return;
    
    console.log('[WebSearch] Initializing web search service...');
    this.initialized = true;
    
    // Clean up old cache entries periodically
    setInterval(() => this.cleanCache(), this.cacheTimeout);
  }

  /**
   * Search the web using DuckDuckGo API
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async search(query, options = {}) {
    if (!query) throw new Error('Search query is required');
    
    // Check cache first
    const cacheKey = `search_${query}_${JSON.stringify(options)}`;
    if (this.searchCache.has(cacheKey)) {
      const cached = this.searchCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('[WebSearch] Returning cached search results');
        return cached.data;
      }
    }
    
    console.log(`[WebSearch] Searching for: "${query}"`);
    
    // Try Wikipedia for factual queries
    if (this.isFactualQuery(query)) {
      const wikiResults = await this.searchWikipedia(query);
      if (wikiResults) {
        // Cache results
        this.searchCache.set(cacheKey, {
          data: wikiResults,
          timestamp: Date.now()
        });
        return wikiResults;
      }
    }
    
    // Try SearXNG 
    const searxResults = await this.searchWithSearXNG(query, options);
    if (searxResults) {
      // Cache results
      this.searchCache.set(cacheKey, {
        data: searxResults,
        timestamp: Date.now()
      });
      return searxResults;
    }
    
    // Fallback to DuckDuckGo
    console.log('[WebSearch] Falling back to DuckDuckGo API');
    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        no_html: '1',
        skip_disambig: '1'
      });
      
      const apiUrl = `${this.duckduckgoAPI}?${params}`;
      const proxyUrl = `${this.corsProxy}${apiUrl}`;
      
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        console.error(`[WebSearch] HTTP Error: ${response.status} ${response.statusText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[WebSearch] DuckDuckGo response received');
      
      // Process and format results
      const results = this.formatSearchResults(data, query);
      
      // Cache results
      this.searchCache.set(cacheKey, {
        data: results,
        timestamp: Date.now()
      });
      
      return results;
    } catch (error) {
      console.error('[WebSearch] Search failed:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }
  
  /**
   * Search using SearXNG instances
   * @private
   */
  async searchWithSearXNG(query, options = {}) {
    // Try each SearXNG instance
    for (let attempts = 0; attempts < this.searxInstances.length; attempts++) {
      const instance = this.searxInstances[this.currentInstanceIndex];
      console.log(`[WebSearch] Trying SearXNG instance: ${instance}`);
      
      try {
        // Clean and enhance the query for better results
        const cleanQuery = this.enhanceSearchQuery(query);
        
        const params = new URLSearchParams({
          q: cleanQuery,
          format: 'json',
          engines: 'google,duckduckgo',  // Remove Bing - it returns too many irrelevant results
          lang: 'en',
          safesearch: '0',
          time_range: '',  // Get recent results
          categories: 'general,news'  // Focus on general and news categories
        });
        
        const searchUrl = `${instance}/search?${params}`;
        
        // Use CORS proxy only for external instances
        const isLocal = instance.includes('localhost') || instance.includes('127.0.0.1');
        const finalUrl = isLocal ? searchUrl : `${this.corsProxy}${searchUrl}`;
        
        console.log(`[WebSearch] Fetching from: ${finalUrl}`);
        const response = await fetch(finalUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        console.log(`[WebSearch] Response status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`[WebSearch] SearXNG successful, got ${data.results?.length || 0} results`);
          
          // Format SearXNG results
          const formatted = this.formatSearXNGResults(data, query);
          if (formatted && (formatted.webResults?.length > 0 || formatted.answer || formatted.abstract)) {
            console.log('[WebSearch] Returning formatted results');
            return formatted;
          }
          console.log('[WebSearch] No meaningful results after formatting');
        } else {
          console.warn(`[WebSearch] HTTP ${response.status} from ${instance}`);
        }
      } catch (error) {
        console.error(`[WebSearch] SearXNG instance ${instance} error:`, error);
      }
      
      // Try next instance
      this.currentInstanceIndex = (this.currentInstanceIndex + 1) % this.searxInstances.length;
    }
    
    console.log('[WebSearch] All SearXNG instances failed');
    return null;
  }
  
  /**
   * Enhance search query for better results
   * @private
   */
  enhanceSearchQuery(query) {
    // Remove common filler words that might confuse search
    let enhanced = query
      .replace(/\b(please|can you|could you|would you|tell me|find|search for|look up|research)\b/gi, '')
      .trim();
    
    // Add quotes around specific names or phrases for exact matching
    enhanced = enhanced.replace(/(Jair Bolsonaro|Donald Trump|Joe Biden|[A-Z][a-z]+ [A-Z][a-z]+)/g, '"$1"');
    
    console.log(`[WebSearch] Enhanced query: ${enhanced}`);
    return enhanced;
  }
  
  /**
   * Filter out irrelevant results
   * @private
   */
  filterRelevantResults(results, query) {
    const queryLower = query.toLowerCase();
    const irrelevantPatterns = [
      /lottery/i,
      /lotto/i,
      /powerball/i,
      /mega millions/i,
      /scratch.?off/i,
      /jackpot/i,
      /winning numbers/i
    ];
    
    // Extract key terms from query
    const keyTerms = query.match(/[A-Z][a-z]+|[a-z]+/g) || [];
    const importantTerms = keyTerms.filter(term => term.length > 3);
    
    return results.filter(result => {
      const title = result.title || '';
      const content = result.content || '';
      const combined = `${title} ${content}`.toLowerCase();
      
      // Skip if matches irrelevant patterns (unless query specifically asks for them)
      const isIrrelevant = irrelevantPatterns.some(pattern => 
        pattern.test(combined) && !pattern.test(queryLower)
      );
      
      if (isIrrelevant) {
        console.log(`[WebSearch] Filtering out irrelevant result: ${title}`);
        return false;
      }
      
      // Prefer results that contain important terms from the query
      const relevanceScore = importantTerms.filter(term => 
        combined.includes(term.toLowerCase())
      ).length;
      
      result.relevanceScore = relevanceScore;
      return true;
    });
  }
  
  /**
   * Format SearXNG results
   * @private
   */
  formatSearXNGResults(data, query) {
    console.log(`[WebSearch] Formatting ${data.results?.length || 0} results`);
    
    const results = {
      query,
      instant: null,
      abstract: null,
      related: [],
      infobox: null,
      definition: null,
      answer: null,
      webResults: []
    };
    
    // Process web results
    if (data.results && Array.isArray(data.results) && data.results.length > 0) {
      // First map the results to our format
      let mappedResults = data.results.map(item => ({
        title: item.title || 'No title',
        url: item.url || '',
        content: item.content || item.snippet || '',
        engine: item.engine || item.engines?.join(',') || 'unknown'
      }));
      
      // Filter out irrelevant results
      const filteredResults = this.filterRelevantResults(mappedResults, query);
      
      // Sort by relevance score and take top results
      results.webResults = filteredResults
        .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
        .slice(0, 10);
      
      console.log(`[WebSearch] Filtered ${data.results.length} to ${results.webResults.length} relevant results`);
      
      // Create an abstract from the first result
      if (results.webResults.length > 0) {
        const first = results.webResults[0];
        results.abstract = {
          text: first.content || first.title,
          source: first.engine || 'Web Search',
          url: first.url
        };
      }
      
      // Convert to related topics for compatibility
      results.related = results.webResults.slice(1, 5).map(item => ({
        text: `${item.title}: ${item.content || ''}`.substring(0, 200),
        url: item.url
      }));
    } else {
      console.log('[WebSearch] No results to format');
    }
    
    // Process infobox if available
    if (data.infoboxes && data.infoboxes.length > 0) {
      const infobox = data.infoboxes[0];
      results.infobox = {
        content: infobox.content,
        meta: infobox.attributes
      };
      
      // Use infobox as answer if available
      if (infobox.content) {
        results.answer = {
          text: infobox.content,
          type: 'infobox'
        };
      }
    }
    
    // Process answers if available
    if (data.answers && data.answers.length > 0) {
      results.answer = {
        text: data.answers[0],
        type: 'direct'
      };
    }
    
    return results;
  }

  /**
   * Format DuckDuckGo API results
   * @private
   */
  formatSearchResults(data, query) {
    const results = {
      query,
      instant: null,
      abstract: null,
      related: [],
      infobox: null,
      definition: null,
      answer: null
    };
    
    // Instant answer
    if (data.Answer) {
      results.answer = {
        text: data.Answer,
        type: data.AnswerType
      };
    }
    
    // Abstract/Summary
    if (data.Abstract) {
      results.abstract = {
        text: data.Abstract,
        source: data.AbstractSource,
        url: data.AbstractURL
      };
    }
    
    // Definition
    if (data.Definition) {
      results.definition = {
        text: data.Definition,
        source: data.DefinitionSource,
        url: data.DefinitionURL
      };
    }
    
    // Related topics
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      results.related = data.RelatedTopics.slice(0, 5).map(topic => ({
        text: topic.Text,
        url: topic.FirstURL,
        icon: topic.Icon?.URL
      })).filter(t => t.text);
    }
    
    // Infobox
    if (data.Infobox) {
      results.infobox = {
        content: data.Infobox.content,
        meta: data.Infobox.meta
      };
    }
    
    // If no results from API, provide simulated/fallback results
    if (!results.answer && !results.abstract && !results.definition && results.related.length === 0) {
      console.log('[WebSearch] No API results, generating fallback response for:', query);
      results.fallback = this.generateFallbackResults(query);
    }
    
    return results;
  }
  
  /**
   * Generate fallback results when API returns nothing
   * @private
   */
  generateFallbackResults(query) {
    const lowerQuery = query.toLowerCase();
    const timestamp = new Date().toLocaleString();
    
    // Weather queries
    if (lowerQuery.includes('weather') || lowerQuery.includes('temperature')) {
      const location = this.extractLocation(query) || 'the requested location';
      return {
        type: 'weather',
        text: `Weather information for ${location} (simulated result):
- Current conditions: Unable to fetch real-time data
- Note: Live weather data requires a weather API integration
- Suggestion: For accurate weather, please check weather.com or local weather services
- Timestamp: ${timestamp}`,
        disclaimer: 'Note: This is a simulated response. Real-time weather data is not available through the current API.'
      };
    }
    
    // News/current events queries
    if (lowerQuery.includes('news') || lowerQuery.includes('latest') || 
        lowerQuery.includes('current') || lowerQuery.includes('today') ||
        lowerQuery.includes('election') || lowerQuery.includes('prime minister')) {
      return {
        type: 'news',
        text: `Current information about "${query}" (simulated result):
- Unable to fetch real-time news data
- Note: Live news requires a news API integration
- Suggestion: Check reputable news sources for the latest information
- Timestamp: ${timestamp}`,
        disclaimer: 'Note: This is a simulated response. Real-time news data is not available through the current API.'
      };
    }
    
    // General search fallback
    return {
      type: 'general',
      text: `Search results for "${query}" (simulated):
- The DuckDuckGo Instant Answer API did not return results for this query
- This often happens with real-time data, local information, or specific current events
- For accurate information, please try:
  • Using a full web browser search
  • Checking official sources directly
  • Asking for general information instead of real-time data
- Timestamp: ${timestamp}`,
      disclaimer: 'Note: Limited search API - some queries may not return results.'
    };
  }
  
  /**
   * Extract location from weather query
   * @private
   */
  extractLocation(query) {
    const patterns = [
      /weather (?:in|for|at) (.+)/i,
      /(.+) weather/i,
      /temperature (?:in|for|at) (.+)/i
    ];
    
    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }
  
  /**
   * Check if query is factual (good for Wikipedia)
   * @private
   */
  isFactualQuery(query) {
    const lowerQuery = query.toLowerCase();
    const factualKeywords = ['who is', 'what is', 'where is', 'when was', 'define', 'meaning of', 'history of'];
    return factualKeywords.some(keyword => lowerQuery.includes(keyword));
  }
  
  /**
   * Search Wikipedia for factual information
   * @private
   */
  async searchWikipedia(query) {
    try {
      // Extract the main subject from the query
      const subject = query.replace(/^(who|what|where|when|how|why)\s+(is|was|are|were)\s+/i, '');
      const searchTerm = subject.replace(/\?/g, '').trim();
      
      console.log(`[WebSearch] Trying Wikipedia for: ${searchTerm}`);
      
      const url = `${this.wikipediaAPI}${encodeURIComponent(searchTerm)}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.extract) {
          console.log('[WebSearch] Wikipedia search successful');
          
          return {
            query,
            answer: {
              text: data.extract,
              type: 'wikipedia'
            },
            abstract: {
              text: data.extract,
              source: 'Wikipedia',
              url: data.content_urls?.desktop?.page || ''
            },
            related: []
          };
        }
      }
    } catch (error) {
      console.warn('[WebSearch] Wikipedia search failed:', error.message);
    }
    
    return null;
  }

  /**
   * Fetch and extract content from a URL
   * @param {string} url - URL to fetch
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Extracted content
   */
  async fetchWebContent(url, options = {}) {
    if (!url) throw new Error('URL is required');
    
    // Check cache first
    const cacheKey = `fetch_${url}`;
    if (this.fetchCache.has(cacheKey)) {
      const cached = this.fetchCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('[WebSearch] Returning cached web content');
        return cached.data;
      }
    }
    
    console.log(`[WebSearch] Fetching content from: ${url}`);
    
    try {
      // Use CORS proxy for cross-origin requests
      const proxyUrl = `${this.corsProxy}${url}`;
      console.log(`[WebSearch] Fetching via proxy: ${proxyUrl}`);
      
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      const content = this.extractContent(html, url);
      
      // Cache content
      this.fetchCache.set(cacheKey, {
        data: content,
        timestamp: Date.now()
      });
      
      return content;
    } catch (error) {
      console.error('[WebSearch] Fetch failed:', error);
      throw new Error(`Failed to fetch content: ${error.message}`);
    }
  }

  /**
   * Extract meaningful content from HTML
   * @private
   */
  extractContent(html, url) {
    // Create a DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Remove script and style elements
    const scripts = doc.querySelectorAll('script, style, noscript');
    scripts.forEach(el => el.remove());
    
    // Extract metadata
    const title = doc.querySelector('title')?.textContent || '';
    const description = doc.querySelector('meta[name="description"]')?.content || 
                       doc.querySelector('meta[property="og:description"]')?.content || '';
    
    // Extract main content
    let mainContent = '';
    
    // Try to find main content areas
    const contentSelectors = [
      'main', 
      'article', 
      '[role="main"]',
      '.content',
      '#content',
      '.post',
      '.entry-content'
    ];
    
    for (const selector of contentSelectors) {
      const element = doc.querySelector(selector);
      if (element) {
        mainContent = this.extractTextContent(element);
        break;
      }
    }
    
    // Fallback to body if no main content found
    if (!mainContent) {
      mainContent = this.extractTextContent(doc.body);
    }
    
    // Extract headings for structure
    const headings = Array.from(doc.querySelectorAll('h1, h2, h3'))
      .map(h => h.textContent.trim())
      .filter(h => h.length > 0)
      .slice(0, 10);
    
    // Extract links
    const links = Array.from(doc.querySelectorAll('a[href]'))
      .map(a => ({
        text: a.textContent.trim(),
        href: new URL(a.href, url).href
      }))
      .filter(l => l.text.length > 0)
      .slice(0, 20);
    
    return {
      url,
      title,
      description,
      content: mainContent.slice(0, 5000), // Limit content length
      headings,
      links,
      fetchedAt: new Date().toISOString()
    };
  }

  /**
   * Extract clean text content from an element
   * @private
   */
  extractTextContent(element) {
    // Clone to avoid modifying original
    const clone = element.cloneNode(true);
    
    // Remove unwanted elements
    const unwanted = clone.querySelectorAll('nav, header, footer, aside, .sidebar, .menu, .navigation');
    unwanted.forEach(el => el.remove());
    
    // Get text content
    let text = clone.textContent || '';
    
    // Clean up whitespace
    text = text
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n\n')  // Replace multiple newlines with double newline
      .trim();
    
    return text;
  }

  /**
   * Perform a web search and fetch top results
   * @param {string} query - Search query
   * @param {number} numResults - Number of results to fetch content for
   * @returns {Promise<Object>} Search results with content
   */
  async searchAndFetch(query, numResults = 3) {
    console.log(`[WebSearch] Search and fetch for: "${query}"`);
    
    // First, perform the search
    const searchResults = await this.search(query);
    
    // Collect URLs to fetch
    const urlsToFetch = [];
    
    if (searchResults.abstract?.url) {
      urlsToFetch.push(searchResults.abstract.url);
    }
    
    searchResults.related.forEach(item => {
      if (item.url && urlsToFetch.length < numResults) {
        urlsToFetch.push(item.url);
      }
    });
    
    // Fetch content for each URL
    const fetchedContent = [];
    for (const url of urlsToFetch) {
      try {
        const content = await this.fetchWebContent(url);
        fetchedContent.push(content);
      } catch (error) {
        console.warn(`[WebSearch] Failed to fetch ${url}:`, error);
      }
    }
    
    return {
      ...searchResults,
      fetchedContent
    };
  }

  /**
   * Clean up old cache entries
   * @private
   */
  cleanCache() {
    const now = Date.now();
    
    // Clean search cache
    for (const [key, value] of this.searchCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.searchCache.delete(key);
      }
    }
    
    // Clean fetch cache
    for (const [key, value] of this.fetchCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.fetchCache.delete(key);
      }
    }
    
    console.log(`[WebSearch] Cache cleaned. Search: ${this.searchCache.size}, Fetch: ${this.fetchCache.size}`);
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.searchCache.clear();
    this.fetchCache.clear();
    console.log('[WebSearch] All caches cleared');
  }
}

// Export singleton instance
const webSearchService = new WebSearchService();
export default webSearchService;