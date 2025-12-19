/**
 * Function Calling Service
 * Manages tool definitions and execution for LLM function calling
 */

import webSearchService from './web-search-service.js';

class FunctionCallingService {
  constructor() {
    this.availableTools = new Map();
    this.initializeTools();
    
    // Models that support function calling (from WebLLM)
    this.functionCallingModels = [
      'Hermes-2-Pro-Llama-3-8B-q4f16_1-MLC',
      'Hermes-2-Pro-Llama-3-8B-q4f32_1-MLC',
      'Hermes-2-Pro-Mistral-7B-q4f16_1-MLC',
      'Hermes-3-Llama-3.1-8B-q4f32_1-MLC',
      'Hermes-3-Llama-3.1-8B-q4f16_1-MLC'
    ];
  }
  
  /**
   * Check if a model supports function calling
   * Note: Even if listed here, function calling might not work properly
   */
  supportsModelFunctionCalling(modelId) {
    return this.functionCallingModels.includes(modelId);
  }
  
  /**
   * Get manual function calling prompt for models that don't support tools properly
   */
  getManualFunctionCallingPrompt() {
    return `You have access to web search capabilities. You should autonomously decide when to search the web based on the user's question.

WHEN TO SEARCH:
- Current events, news, or recent happenings
- Weather information or forecasts
- Real-time data (stocks, sports scores, etc.)
- Factual information you're uncertain about
- Technical documentation or specifications
- When the user asks to "search", "look up", "find", or "research" something
- Any information that requires up-to-date data beyond your training cutoff

HOW TO SEARCH:
When you determine a web search is needed, output ONLY: [SEARCH: your search query]
Then wait for results before continuing your response.

EXAMPLES:
User: "What's the weather in Tokyo?"
You: [SEARCH: current weather in Tokyo]

User: "Who won the latest election in France?"
You: [SEARCH: latest France election results 2024]

User: "How do I install Zulip server?"
You: [SEARCH: how to install self-hosted Zulip server guide]

User: "Tell me about Python" (general knowledge, no search needed)
You: Python is a high-level programming language... [continue without search]

IMPORTANT: 
- Use your judgment to decide if a search is necessary
- For general knowledge within your training, respond directly
- For current/specific/uncertain information, search first
- NEVER make up current information - always search for it`;
  }
  
  /**
   * Detect manual function call format [SEARCH: query]
   */
  detectManualFunctionCall(text) {
    // Pattern for [SEARCH: query]
    const searchPattern = /\[SEARCH:\s*([^\]]+)\]/i;
    const match = text.match(searchPattern);
    
    if (match) {
      return {
        detected: true,
        function: 'web_search',
        query: match[1].trim(),
        isManualFormat: true
      };
    }
    
    // Also check for the other patterns we already have
    return this.detectTextFunctionCall(text);
  }

  /**
   * Initialize available tools
   */
  initializeTools() {
    // Web Search Tool
    this.availableTools.set('web_search', {
      schema: {
        type: "function",
        function: {
          name: "web_search",
          description: "Search the web for information on any topic. Use this when you need current information, facts, documentation, or when the user asks to research, search, or find information online.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query to find information about"
              },
              num_results: {
                type: "number",
                description: "Number of results to fetch (1-5)",
                default: 3
              }
            },
            required: ["query"]
          }
        }
      },
      execute: async (args) => {
        console.log('[FunctionCalling] Executing web_search with:', args);
        
        // Initialize web search if needed
        if (!webSearchService.initialized) {
          await webSearchService.initialize();
        }
        
        // Perform search
        const searchResults = await webSearchService.search(args.query);
        
        // Fetch content from top results if requested
        if (args.num_results && args.num_results > 0) {
          const urlsToFetch = [];
          
          if (searchResults.abstract?.url) {
            urlsToFetch.push(searchResults.abstract.url);
          }
          
          searchResults.related.slice(0, args.num_results - 1).forEach(item => {
            if (item.url) {
              urlsToFetch.push(item.url);
            }
          });
          
          // Fetch content for each URL
          const fetchedContent = [];
          for (const url of urlsToFetch) {
            try {
              const content = await webSearchService.fetchWebContent(url);
              fetchedContent.push({
                title: content.title,
                url: content.url,
                content: content.content.substring(0, 1000), // Limit content length
                description: content.description
              });
            } catch (error) {
              console.warn(`[FunctionCalling] Failed to fetch ${url}:`, error);
            }
          }
          
          searchResults.fetchedContent = fetchedContent;
        }
        
        return this.formatSearchResults(searchResults);
      }
    });

    // Web Fetch Tool (for specific URLs)
    this.availableTools.set('fetch_url', {
      schema: {
        type: "function",
        function: {
          name: "fetch_url",
          description: "Fetch and extract content from a specific URL. Use this when you need to read content from a specific web page.",
          parameters: {
            type: "object",
            properties: {
              url: {
                type: "string",
                description: "The URL to fetch content from"
              }
            },
            required: ["url"]
          }
        }
      },
      execute: async (args) => {
        console.log('[FunctionCalling] Executing fetch_url with:', args);
        
        if (!webSearchService.initialized) {
          await webSearchService.initialize();
        }
        
        const content = await webSearchService.fetchWebContent(args.url);
        return {
          title: content.title,
          url: content.url,
          description: content.description,
          content: content.content.substring(0, 2000), // Limit content
          headings: content.headings.slice(0, 10)
        };
      }
    });
  }

  /**
   * Format search results for LLM consumption
   */
  formatSearchResults(results) {
    let formatted = '';
    
    // Handle fallback results
    if (results.fallback) {
      formatted += results.fallback.text;
      if (results.fallback.disclaimer) {
        formatted += `\n\n${results.fallback.disclaimer}`;
      }
      return formatted;
    }
    
    if (results.answer) {
      formatted += `Direct Answer: ${results.answer.text}\n\n`;
    }
    
    if (results.abstract) {
      formatted += `Summary: ${results.abstract.text}\n`;
      if (results.abstract.source) {
        formatted += `Source: ${results.abstract.source}\n`;
      }
      formatted += '\n';
    }
    
    if (results.definition) {
      formatted += `Definition: ${results.definition.text}\n\n`;
    }
    
    // Handle SearXNG web results
    if (results.webResults && results.webResults.length > 0) {
      formatted += 'Web Search Results:\n';
      results.webResults.forEach((item, index) => {
        formatted += `\n[${index + 1}] ${item.title}\n`;
        if (item.url) formatted += `URL: ${item.url}\n`;
        if (item.content) formatted += `${item.content}\n`;
      });
    } else if (results.fetchedContent && results.fetchedContent.length > 0) {
      formatted += 'Detailed Information:\n';
      results.fetchedContent.forEach((content, index) => {
        formatted += `\n[${index + 1}] ${content.title}\n`;
        formatted += `URL: ${content.url}\n`;
        if (content.description) {
          formatted += `Description: ${content.description}\n`;
        }
        formatted += `Content: ${content.content}\n`;
      });
    } else if (results.related && results.related.length > 0) {
      formatted += 'Related Information:\n';
      results.related.forEach((item, index) => {
        formatted += `[${index + 1}] ${item.text}\n`;
      });
    }
    
    return formatted || 'No results found for the search query.';
  }

  /**
   * Get tool schemas for LLM
   */
  getToolSchemas(enabledTools = ['web_search', 'fetch_url']) {
    const schemas = [];
    
    for (const toolName of enabledTools) {
      if (this.availableTools.has(toolName)) {
        schemas.push(this.availableTools.get(toolName).schema);
      }
    }
    
    return schemas;
  }

  /**
   * Execute a function call
   */
  async executeFunction(functionName, args) {
    console.log(`[FunctionCalling] Executing function: ${functionName}`, args);
    
    const tool = this.availableTools.get(functionName);
    if (!tool) {
      throw new Error(`Unknown function: ${functionName}`);
    }
    
    try {
      const result = await tool.execute(args);
      console.log(`[FunctionCalling] Function ${functionName} completed successfully`);
      return result;
    } catch (error) {
      console.error(`[FunctionCalling] Function ${functionName} failed:`, error);
      throw error;
    }
  }

  /**
   * Process LLM response and handle function calls
   */
  async processFunctionCall(toolCall) {
    if (!toolCall || !toolCall.function) {
      return null;
    }
    
    const { name, arguments: argsString } = toolCall.function;
    
    try {
      const args = JSON.parse(argsString);
      const result = await this.executeFunction(name, args);
      
      return {
        tool_call_id: toolCall.id,
        role: "tool",
        content: typeof result === 'string' ? result : JSON.stringify(result)
      };
    } catch (error) {
      return {
        tool_call_id: toolCall.id,
        role: "tool",
        content: `Error: ${error.message}`
      };
    }
  }

  /**
   * Check if a message might benefit from web search
   */
  shouldUseWebSearch(message) {
    const triggers = [
      'search', 'research', 'find', 'look up', 'what is', 'how to', 'when did',
      'where is', 'who is', 'latest', 'current', 'recent', 'news', 'information',
      'tell me about', 'explain', 'learn about', 'discover', 'investigate',
      'web', 'online', 'internet', 'google', 'browse', 'weather', 'temperature'
    ];
    
    const lowerMessage = message.toLowerCase();
    return triggers.some(trigger => lowerMessage.includes(trigger));
  }

  /**
   * Detect if model is trying to call a function through text
   * Some models simulate function calls with patterns like *web_search query*
   */
  detectTextFunctionCall(text) {
    // Pattern 1: *function_name arguments*
    const asteriskPattern = /\*(\w+)\s+([^*]+)\*/;
    const match = text.match(asteriskPattern);
    
    if (match) {
      const [, functionName, args] = match;
      if (functionName === 'web_search') {
        return {
          detected: true,
          function: 'web_search',
          query: args.trim()
        };
      }
    }
    
    // Pattern 2: [FUNCTION: web_search(query)]
    const bracketPattern = /\[FUNCTION:\s*(\w+)\(([^)]+)\)\]/;
    const bracketMatch = text.match(bracketPattern);
    
    if (bracketMatch) {
      const [, functionName, args] = bracketMatch;
      if (functionName === 'web_search') {
        return {
          detected: true,
          function: 'web_search',
          query: args.replace(/['"]/g, '').trim()
        };
      }
    }
    
    return { detected: false };
  }

  /**
   * Execute text-detected function call
   */
  async executeTextFunctionCall(detectedCall) {
    if (detectedCall.function === 'web_search') {
      console.log('[FunctionCalling] Executing text-detected web search:', detectedCall.query);
      
      try {
        if (!webSearchService.initialized) {
          console.log('[FunctionCalling] Initializing web search service...');
          await webSearchService.initialize();
        }
        
        console.log('[FunctionCalling] Calling webSearchService.search...');
        const searchResults = await webSearchService.search(detectedCall.query);
        console.log('[FunctionCalling] Search results received:', searchResults);
        
        const formatted = this.formatSearchResults(searchResults);
        console.log('[FunctionCalling] Formatted results length:', formatted.length);
        return formatted;
      } catch (error) {
        console.error('[FunctionCalling] Error executing web search:', error);
        console.error('[FunctionCalling] Error stack:', error.stack);
        throw error;
      }
    }
    
    return null;
  }
}

// Export singleton instance
export default new FunctionCallingService();