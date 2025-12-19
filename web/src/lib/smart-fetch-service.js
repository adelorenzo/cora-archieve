/**
 * Smart Web Fetching Service
 * Automatically detects URLs in text and fetches relevant content
 */

import webSearchService from './web-search-service';

class SmartFetchService {
  constructor() {
    this.initialized = false;
    this.fetchedUrls = new Map(); // Cache fetched URLs
    this.urlPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    if (this.initialized) return;
    
    console.log('[SmartFetch] Initializing smart fetch service...');
    await webSearchService.initialize();
    this.initialized = true;
  }

  /**
   * Detect URLs in text
   * @param {string} text - Text to scan for URLs
   * @returns {Array<string>} Array of detected URLs
   */
  detectUrls(text) {
    if (!text) return [];
    
    const urls = text.match(this.urlPattern) || [];
    // Remove duplicates and clean URLs
    return [...new Set(urls.map(url => this.cleanUrl(url)))];
  }

  /**
   * Clean and normalize URL
   * @private
   */
  cleanUrl(url) {
    // Remove trailing punctuation that might be captured
    url = url.replace(/[.,;:!?]$/, '');
    
    // Ensure protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    return url;
  }

  /**
   * Check if URL is fetchable
   * @param {string} url - URL to check
   * @returns {boolean} Whether URL should be fetched
   */
  isFetchable(url) {
    try {
      const urlObj = new URL(url);
      
      // Skip certain domains that don't work well with fetching
      const skipDomains = [
        'localhost',
        '127.0.0.1',
        'example.com',
        'youtube.com', // Video content
        'twitter.com', // Dynamic content
        'facebook.com', // Login required
        'instagram.com', // Login required
        'linkedin.com' // Often login required
      ];
      
      if (skipDomains.some(domain => urlObj.hostname.includes(domain))) {
        return false;
      }
      
      // Skip non-HTTP(S) protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }
      
      // Skip media files
      const mediaExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mp3', '.pdf', '.zip'];
      if (mediaExtensions.some(ext => urlObj.pathname.toLowerCase().endsWith(ext))) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Smart fetch URLs from text
   * @param {string} text - Text containing URLs
   * @param {Object} options - Fetch options
   * @returns {Promise<Array>} Fetched content
   */
  async smartFetch(text, options = {}) {
    const urls = this.detectUrls(text);
    
    if (urls.length === 0) {
      return { urls: [], content: [], summary: null };
    }
    
    console.log(`[SmartFetch] Detected ${urls.length} URLs:`, urls);
    
    const fetchableUrls = urls.filter(url => this.isFetchable(url));
    console.log(`[SmartFetch] ${fetchableUrls.length} URLs are fetchable`);
    
    const fetchedContent = [];
    
    for (const url of fetchableUrls) {
      // Check cache first
      if (this.fetchedUrls.has(url)) {
        console.log(`[SmartFetch] Using cached content for ${url}`);
        fetchedContent.push(this.fetchedUrls.get(url));
        continue;
      }
      
      try {
        console.log(`[SmartFetch] Fetching ${url}...`);
        const content = await webSearchService.fetchWebContent(url);
        
        // Process and summarize content
        const processed = this.processContent(content);
        
        // Cache it
        this.fetchedUrls.set(url, processed);
        
        // Limit cache size
        if (this.fetchedUrls.size > 20) {
          const firstKey = this.fetchedUrls.keys().next().value;
          this.fetchedUrls.delete(firstKey);
        }
        
        fetchedContent.push(processed);
      } catch (error) {
        console.error(`[SmartFetch] Failed to fetch ${url}:`, error);
      }
    }
    
    // Generate summary if multiple pieces of content
    const summary = this.generateSummary(fetchedContent);
    
    return {
      urls: fetchableUrls,
      content: fetchedContent,
      summary
    };
  }

  /**
   * Process fetched content
   * @private
   */
  processContent(content) {
    // Extract key information
    const processed = {
      url: content.url,
      title: content.title,
      description: content.description,
      text: this.extractKeyContent(content.content),
      headings: content.headings || [],
      fetchedAt: content.fetchedAt,
      summary: this.summarizeContent(content.content)
    };
    
    return processed;
  }

  /**
   * Extract key content from full text
   * @private
   */
  extractKeyContent(text, maxLength = 2000) {
    if (!text) return '';
    
    // Try to extract meaningful paragraphs
    const paragraphs = text.split(/\n\n+/)
      .filter(p => p.trim().length > 50) // Filter out short paragraphs
      .slice(0, 5); // Take first 5 meaningful paragraphs
    
    let extracted = paragraphs.join('\n\n');
    
    // Truncate if too long
    if (extracted.length > maxLength) {
      extracted = extracted.substring(0, maxLength) + '...';
    }
    
    return extracted;
  }

  /**
   * Generate a brief summary of content
   * @private
   */
  summarizeContent(text) {
    if (!text) return '';
    
    // Simple extractive summarization
    // Take first paragraph and first sentence of next few paragraphs
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 30);
    
    if (paragraphs.length === 0) return '';
    
    const summary = [];
    
    // Add first paragraph (usually introduction)
    if (paragraphs[0]) {
      const firstPara = paragraphs[0].substring(0, 300);
      summary.push(firstPara + (paragraphs[0].length > 300 ? '...' : ''));
    }
    
    // Add first sentence from next paragraphs
    for (let i = 1; i < Math.min(3, paragraphs.length); i++) {
      const firstSentence = this.extractFirstSentence(paragraphs[i]);
      if (firstSentence) {
        summary.push(firstSentence);
      }
    }
    
    return summary.join(' ');
  }

  /**
   * Extract first sentence from text
   * @private
   */
  extractFirstSentence(text) {
    const match = text.match(/^[^.!?]+[.!?]/);
    return match ? match[0].trim() : null;
  }

  /**
   * Generate overall summary from multiple contents
   * @private
   */
  generateSummary(contents) {
    if (contents.length === 0) return null;
    
    if (contents.length === 1) {
      return contents[0].summary;
    }
    
    // Combine summaries from multiple sources
    const titles = contents.map(c => c.title).filter(t => t);
    const summaries = contents.map(c => c.summary).filter(s => s);
    
    return {
      sources: titles.join(', '),
      text: summaries.join('\n\n'),
      count: contents.length
    };
  }

  /**
   * Format fetched content for chat context
   * @param {Object} fetchResult - Result from smartFetch
   * @returns {string} Formatted context string
   */
  formatForChat(fetchResult) {
    if (!fetchResult || fetchResult.content.length === 0) {
      return '';
    }
    
    const parts = [];
    
    parts.push('[Web Content Context]');
    
    fetchResult.content.forEach((content, index) => {
      parts.push(`\n[${index + 1}] ${content.title || content.url}`);
      
      if (content.description) {
        parts.push(`Description: ${content.description}`);
      }
      
      if (content.summary) {
        parts.push(`Summary: ${content.summary}`);
      }
      
      if (content.headings && content.headings.length > 0) {
        parts.push(`Main topics: ${content.headings.slice(0, 5).join(', ')}`);
      }
    });
    
    return parts.join('\n');
  }

  /**
   * Check if text mentions reading or analyzing URLs
   * @param {string} text - User input text
   * @returns {boolean} Whether user wants URL analysis
   */
  shouldFetchUrls(text) {
    const triggers = [
      'read this',
      'check this',
      'analyze this',
      'look at this',
      'what does this say',
      'summarize this',
      'tell me about this',
      'explain this',
      'from this link',
      'from this url',
      'from this website',
      'from this article'
    ];
    
    const lowerText = text.toLowerCase();
    
    // Check if text contains URL and a trigger phrase
    const hasUrl = this.detectUrls(text).length > 0;
    const hasTrigger = triggers.some(trigger => lowerText.includes(trigger));
    
    return hasUrl && (hasTrigger || lowerText.includes('http'));
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.fetchedUrls.clear();
    console.log('[SmartFetch] Cache cleared');
  }
}

// Export singleton instance
export default new SmartFetchService();