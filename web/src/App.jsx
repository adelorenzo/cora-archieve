import React, { useState, useEffect, useRef } from 'react';
import { Send, Settings, Trash2, Cpu, Zap, Loader2, Sparkles, Database, MessageSquare } from 'lucide-react';
import { Button } from './components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './components/ui/dialog';
import { Badge } from './components/ui/badge';
// Essential components loaded immediately
import ErrorBoundary from './components/ErrorBoundary';
import {
  PersonaSelectorSkeleton,
  ModelSelectorSkeleton,
  ThemeSwitcherSkeleton,
  ChatSkeleton
} from './components/LoadingSkeletons';

// Import SimpleMarkdownRenderer to avoid dependency issues
import SimpleMarkdownRenderer from './components/SimpleMarkdownRenderer';

// Lazy load other heavy components to reduce initial bundle size
const ThemeSwitcher = React.lazy(() => import('./components/ThemeSwitcher'));
const PersonaSelector = React.lazy(() => import('./components/PersonaSelector'));
const ModelSelector = React.lazy(() => import('./components/ModelSelector'));
const ConversationSwitcher = React.lazy(() => import('./components/ConversationSwitcher'));
import { useTheme } from './contexts/ThemeContext';
import { usePersona } from './contexts/PersonaContext';
import llmService from './lib/llm-service';
import performanceOptimizer from './lib/performance-optimizer';
import smartFetchService from './lib/smart-fetch-service';
import functionCallingService from './lib/function-calling-service';
import settingsService from './lib/settings-service';
import conversationManager from './lib/conversation-manager';
import { cn } from './lib/utils';

function App() {
  const { currentTheme } = useTheme();
  const { activePersonaData } = usePersona();
  
  // Debug logging on component mount
  useEffect(() => {
    console.log('[App] Component mounted');
    console.log('[App] Initial theme:', currentTheme);
    console.log('[App] Active persona:', activePersonaData?.name);
    console.log('[App] Active conversation:', activeConversation?.title);
    console.log('[App] Environment:', {
      userAgent: navigator.userAgent,
      webGPU: 'gpu' in navigator,
      serviceWorker: 'serviceWorker' in navigator,
      indexedDB: 'indexedDB' in window
    });
  }, []);

  // Listen for conversation changes
  useEffect(() => {
    const handleConversationChange = (data) => {
      setActiveConversation(data.activeConversation);
      setConversations(data.conversations);
    };
    
    conversationManager.addListener(handleConversationChange);
    return () => conversationManager.removeListener(handleConversationChange);
  }, []);
  
  const [activeConversation, setActiveConversation] = useState(() => conversationManager.getActiveConversation());
  const [conversations, setConversations] = useState(() => conversationManager.getAllConversations());
  const messages = activeConversation?.messages || [];
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initStatus, setInitStatus] = useState('Initializing...');
  const [runtime, setRuntime] = useState('detecting');
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(() => settingsService.getModel());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [temperature, setTemperature] = useState(() => settingsService.getTemperature());
  const [isStreaming, setIsStreaming] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const [detectedUrls, setDetectedUrls] = useState([]);
  const messagesEndRef = useRef(null);

  // Helper functions for conversation management
  const addMessageToConversation = (message) => {
    const conversationId = activeConversation?.id;
    if (conversationId) {
      conversationManager.addMessage(conversationId, message);
      // Update local state to trigger re-render
      setActiveConversation(conversationManager.getActiveConversation());
    }
  };

  const updateLastMessage = (updates) => {
    if (activeConversation?.messages.length > 0) {
      const conversationId = activeConversation.id;
      const conversation = conversationManager.getConversation(conversationId);
      const lastMessage = conversation.messages[conversation.messages.length - 1];

      // Handle both callback function and direct object updates
      const newUpdates = typeof updates === 'function' ? updates(lastMessage) : updates;
      Object.assign(lastMessage, newUpdates);

      conversationManager.save();
      setActiveConversation(conversationManager.getActiveConversation());
    }
  };

  const removeLastMessage = () => {
    if (activeConversation?.messages.length > 0) {
      const conversationId = activeConversation.id;
      const conversation = conversationManager.getConversation(conversationId);
      conversation.messages.pop();
      conversationManager.save();
      setActiveConversation(conversationManager.getActiveConversation());
    }
  };

  const handleConversationChange = (conversation) => {
    setActiveConversation(conversation);
    setShowConversations(false);
  };
  const getSystemMessages = (includeToolInstructions = false, useManualFormat = false) => {
    const basePrompt = activePersonaData?.systemPrompt || "You are a concise, helpful assistant that runs 100% locally in the user's browser.";
    
    let toolPrompt = "";
    if (includeToolInstructions) {
      if (useManualFormat) {
        // Use manual format for models that don't properly support function calling
        toolPrompt = "\n\n" + functionCallingService.getManualFunctionCallingPrompt();
      } else {
        // Use standard format for models that support proper function calling
        toolPrompt = "\n\nYou have access to web search tools. IMPORTANT: You MUST use the web_search function for ANY request about current information, weather, news, or web searches. Do NOT generate responses from your training data for these queries. Instead, call the web_search function with an appropriate query. Format: Use the tool/function calling mechanism, not text output.";
      }
    }
    
    return [
      { role: "system", content: basePrompt + toolPrompt }
    ];
  };

  useEffect(() => {
    console.log('[App] Starting initialization...');
    loadAvailableModels();

    // Track app initialization
    performanceOptimizer.trackInteraction('app-start');
    console.log('[App] Performance tracking started');

    // Start performance monitoring
    setTimeout(() => {
      console.log('[App] Starting critical component preload...');
      performanceOptimizer.preloadCriticalComponents();
    }, 3000);

  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadAvailableModels = async () => {
    try {
      console.log('[App] Loading available models...');
      setInitStatus('Detecting runtime...');
      const detectedRuntime = await llmService.detectRuntime();
      console.log('[App] Detected runtime:', detectedRuntime);
      setRuntime(detectedRuntime);
      
      if (detectedRuntime === 'webgpu') {
        console.log('[App] Fetching WebGPU models...');
        const availableModels = await llmService.getAvailableModels();
        console.log('[App] Available models:', availableModels.length);
        setModels(availableModels);
        
        if (availableModels.length > 0) {
          // Check for saved model preference
          const savedModel = settingsService.getModel();
          let modelToSelect = null;

          if (savedModel && availableModels.find(m => m.model_id === savedModel)) {
            // User has a saved preference - use it
            modelToSelect = savedModel;
            console.log('[App] Restoring saved model:', savedModel);
          } else {
            // New user or saved model not available - try Hermes first, then fall back
            const hermesModel = availableModels.find(m =>
              m.model_id.includes('Hermes-3-Llama-3.1-8B')
            );

            if (hermesModel) {
              modelToSelect = hermesModel.model_id;
              console.log('[App] Selected Hermes as default model for new user');
            } else {
              // Fallback to DeepSeek if Hermes not available
              const fallbackModel = availableModels.find(m =>
                m.model_id.includes('DeepSeek-R1-Distill-Qwen-1.5B')
              ) || availableModels[0];
              modelToSelect = fallbackModel.model_id;
              console.log('[App] Hermes not available, falling back to:', modelToSelect);
            }
          }

          setSelectedModel(modelToSelect);
          // Save the model choice immediately
          settingsService.setModel(modelToSelect);

          // Auto-initialize the model
          console.log('[App] Auto-initializing model:', modelToSelect);
          setInitStatus('Loading model...');
          await initializeLLM(modelToSelect);
        } else {
          setInitStatus('No models available');
        }
      } else {
        setInitStatus('WASM mode - Click to initialize');
        // Auto-initialize WASM mode
        console.log('[App] Auto-initializing WASM mode...');
        await initializeLLM();
      }
    } catch (error) {
      console.error('Failed to detect runtime:', error);
      setRuntime('wasm'); // Fallback to WASM on error
      setInitStatus('WASM mode (fallback) - Click to initialize');
    } finally {
      setIsInitializing(false);
    }
  };

  // Define as function declaration for hoisting
  async function initializeLLM(modelToLoad = selectedModel) {
    if (!modelToLoad && runtime === 'webgpu') {
      setInitStatus('Please select a model');
      return;
    }
    
    setIsInitializing(true);
    try {
      const result = await llmService.initialize(modelToLoad, setInitStatus);
      setRuntime(result.runtime);
      if (result.models) {
        setModels(result.models);
      }
      if (result.selectedModel) {
        setSelectedModel(result.selectedModel);
        // Save the successfully initialized model
        settingsService.setModel(result.selectedModel);
      }
      setInitStatus('Ready');
      setIsInitializing(false);
    } catch (error) {
      console.error('Failed to initialize LLM:', error);
      setInitStatus('Failed to initialize - Try another model');
      setIsInitializing(false);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isInitializing) return;
    
    // Initialize if not yet initialized
    if (!llmService.engine) {
      if (runtime === 'wasm') {
        await initializeLLM();
      } else {
        setInitStatus('Please select a model first');
        setSettingsOpen(true);
        return;
      }
    }

    const userMessage = { role: 'user', content: input.trim() };
    const userQuery = input.trim();
    
    // Add user message to conversation
    addMessageToConversation(userMessage);
    
    // Check for URLs and smart fetch if detected
    let webContext = '';
    if (smartFetchService.shouldFetchUrls(userQuery)) {
      console.log('[App] Detected URLs in message, fetching content...');
      
      // Show loading state with URL detection message
      const loadingMessage = { 
        role: 'system', 
        content: '🔍 Detected URLs in your message. Fetching web content...' 
      };
      addMessageToConversation(loadingMessage);
      
      try {
        // Initialize smart fetch if needed
        if (!smartFetchService.initialized) {
          await smartFetchService.initialize();
        }
        
        // Fetch URLs
        const fetchResult = await smartFetchService.smartFetch(userQuery);
        
        if (fetchResult.content.length > 0) {
          webContext = smartFetchService.formatForChat(fetchResult);
          console.log(`[App] Fetched ${fetchResult.content.length} URLs successfully`);
          
          // Remove loading message and add success message
          removeLastMessage();
          const successMessage = {
            role: 'system',
            content: `✅ Fetched content from ${fetchResult.content.length} URL(s). Analyzing...`
          };
          addMessageToConversation(successMessage);
          
          // Small delay to show the success message
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Remove success message
          removeLastMessage();
        } else {
          // Remove loading message if no content fetched
          removeLastMessage();
        }
      } catch (error) {
        console.error('[App] Smart fetch failed:', error);
        // Remove loading message and show error
        removeLastMessage();
        const errorMessage = {
          role: 'system',
          content: '⚠️ Unable to fetch web content. Proceeding without it.'
        };
        addMessageToConversation(errorMessage);
        await new Promise(resolve => setTimeout(resolve, 2000));
        removeLastMessage();
      }
    }
    
    setInput('');
    setIsLoading(true);
    setIsStreaming(true);

    const assistantMessage = { role: 'assistant', content: '' };
    addMessageToConversation(assistantMessage);

    try {
      // Check if we should enable web search based on the query AND if the model supports it
      const modelSupportsFunctions = functionCallingService.supportsModelFunctionCalling(llmService.currentModel);
      const shouldSearchWeb = functionCallingService.shouldUseWebSearch(userQuery);
      
      // For Hermes models, always enable manual function calling
      // The model will autonomously decide when to search
      const isHermesModel = llmService.currentModel?.includes('Hermes');
      const useManualFunctionCalling = isHermesModel; // Always enabled for Hermes
      const useStandardTools = modelSupportsFunctions && shouldSearchWeb && !isHermesModel;
      
      const systemMessages = getSystemMessages(
        isHermesModel || (shouldSearchWeb && modelSupportsFunctions),
        useManualFunctionCalling
      );
      
      // Add web context if available
      let enhancedUserMessage = userMessage;
      if (webContext) {
        enhancedUserMessage = {
          role: 'user',
          content: `${userMessage.content}\n\n${webContext}`
        };
      }
      
      const allMessages = [
        ...systemMessages,
        ...messages,
        enhancedUserMessage
      ];
      
      if (!modelSupportsFunctions && !isHermesModel && shouldSearchWeb) {
        console.log('[App] Web search requested but model does not support function calling');
      }
      
      // Only use tools parameter for non-Hermes models that support it
      const tools = useStandardTools ? functionCallingService.getToolSchemas() : undefined;
      
      // Use the enhanced chat method that handles function calling
      const stream = llmService.chat(allMessages, { 
        temperature: activePersonaData?.temperature || temperature,
        tools: tools
      });

      let functionCallBuffer = null;
      let contentBuffer = '';
      let textFunctionCallDetected = null;
      
      for await (const delta of stream) {
        // Handle regular content
        if (delta.content) {
          contentBuffer += delta.content;
          updateLastMessage({ content: contentBuffer });
        }
        
        // Check for text-based function call (fallback for models that don't support proper function calling)
        if (delta.textFunctionCall) {
          textFunctionCallDetected = delta.textFunctionCall;
          console.log('[App] Text-based function call detected:', textFunctionCallDetected);
        }
        
        // Handle tool/function calls
        if (delta.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            functionCallBuffer = toolCall;
          }
        }
        
        // When streaming is complete and we have a function call
        if (delta.finish_reason === 'tool_calls' && functionCallBuffer) {
          console.log('[App] Function call detected:', functionCallBuffer);
          
          // Execute the function call
          try {
            // Add status message
            updateLastMessage({ content: contentBuffer + '\n\n🔍 Searching the web...' });
            
            // Execute the function
            const functionResponse = await functionCallingService.processFunctionCall(functionCallBuffer);
            
            if (functionResponse) {
              // Add function response to messages
              const updatedMessages = [
                ...allMessages,
                { role: 'assistant', content: contentBuffer, tool_calls: [functionCallBuffer] },
                functionResponse
              ];
              
              // Continue conversation with function result
              const continueStream = llmService.chat(updatedMessages, {
                temperature: activePersonaData?.temperature || temperature,
              });
              
              // Clear the status and start new response
              updateLastMessage(msg => ({
                ...msg,
                content: contentBuffer + '\n\n'
              }));
              
              for await (const continueDelta of continueStream) {
                if (continueDelta.content) {
                  updateLastMessage(msg => ({
                    ...msg,
                    content: msg.content + continueDelta.content
                  }));
                }
              }
            }
          } catch (error) {
            console.error('[App] Function call failed:', error);
            updateLastMessage(msg => ({
              ...msg,
              content: contentBuffer + '\n\n⚠️ Web search failed. Continuing with available information...'
            }));
          }
        }
      }
      
      // Handle text-based function calls (fallback for models that simulate function calls)
      if (textFunctionCallDetected && textFunctionCallDetected.detected) {
        console.log('[App] Processing text-based function call...');
        
        try {
          // Execute the text-detected function
          const searchResult = await functionCallingService.executeTextFunctionCall(textFunctionCallDetected);
          
          if (searchResult) {
            // Update the message to show search was performed
            updateLastMessage(msg => ({
              ...msg,
              content: contentBuffer + '\n\n📌 Web Search Results:\n' + searchResult
            }));
          }
        } catch (error) {
          console.error('[App] Text-based function call failed:', error);
        }
      }
      
      // Check for manual function call format [SEARCH: query] in the final content
      if (useManualFunctionCalling && contentBuffer) {
        const manualCall = functionCallingService.detectManualFunctionCall(contentBuffer);
        if (manualCall.detected) {
          console.log('[App] Manual function call detected:', manualCall);
          
          let searchResult = null;
          try {
            // Show searching animation
            updateLastMessage(msg => ({
              ...msg,
              content: '🔍 Searching the web...'
            }));
            
            // Execute the search
            searchResult = await functionCallingService.executeTextFunctionCall(manualCall);
            
            if (searchResult) {
              // Store search results but don't display them yet
              // Instead, immediately try to get a follow-up response from the model
              try {
                const searchResultMessage = { 
                  role: 'user', 
                  content: `Based on these search results, please provide a helpful response to the original question: "${userQuery}"\n\nSearch Results:\n${searchResult}`
                };
                
                const continueMessages = [
                  ...allMessages,
                  { role: 'assistant', content: `[SEARCH: ${manualCall.query}]\n\nSearch Results:\n${searchResult}` },
                  searchResultMessage
                ];
                
                // Update to "Generating response..." indicator
                updateLastMessage(msg => ({
                  ...msg,
                  content: '✨ Analyzing search results...'
                }));
                
                // Continue the conversation with search results
                const continueStream = await llmService.chat(continueMessages, {
                  temperature: activePersonaData?.temperature || temperature,
                  // Don't pass tools for the continuation
                });
                
                // Start with empty content for clean response
                let continuationContent = '';
                for await (const delta of continueStream) {
                  if (delta && delta.content) {
                    continuationContent += delta.content;
                    updateLastMessage(msg => ({
                      ...msg,
                      content: continuationContent
                    }));
                  }
                }
              } catch (contError) {
                console.warn('[App] Could not generate follow-up response:', contError);
                // Show a simplified message if follow-up fails
                updateLastMessage(msg => ({
                  ...msg,
                  content: `I found information about your query from web search. Based on the latest available information, I can provide some context, though I'm having difficulty generating a detailed response at the moment.`
                }));
              }
            }
          } catch (error) {
            console.error('[App] Manual function call error:', error);
            // Show clean error message
            updateLastMessage(msg => ({
              ...msg,
              content: '⚠️ Search failed. Please try again.'
            }));
          }
        }
      }
    } catch (error) {
      console.error('Generation error:', error);
      updateLastMessage(msg => ({
        ...msg,
        content: 'Error generating response. Please try again.'
      }));
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };


  const handleModelChange = async (model) => {
    setSelectedModel(model);
    // Save model preference using settings service
    settingsService.setModel(model);
    console.log('[App] Saved model preference:', model);
    setSettingsOpen(false);

    // If no engine is loaded yet, initialize with the selected model
    if (!llmService.engine) {
      await initializeLLM(model);
    } else {
      // Switch to the new model
      setIsInitializing(true);
      try {
        const result = await llmService.switchModel(model);
        setRuntime(result.runtime);
        setModels(result.models || models);
        setInitStatus('Ready');
      } catch (error) {
        console.error('Failed to switch model:', error);
        setInitStatus('Failed to switch model');
      } finally {
        setIsInitializing(false);
      }
    }
  };

  const clearChat = () => {
    if (activeConversation) {
      // Clear messages in current conversation
      conversationManager.updateConversation(activeConversation.id, {
        messages: [],
        updatedAt: new Date()
      });
      setActiveConversation(conversationManager.getActiveConversation());
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-card backdrop-blur-md border-b border-border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
            </div>
            <h1 className="text-xl font-bold text-foreground">
              Cora
            </h1>
            <span className="text-xs text-muted-foreground font-medium">100% Local • No Server • No Keys</span>
          </div>
          <div className="flex items-center gap-2">
            <React.Suspense fallback={<PersonaSelectorSkeleton />}>
              <PersonaSelector />
            </React.Suspense>

            {/* Conversations Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowConversations(!showConversations)}
              className="text-muted-foreground hover:text-foreground hover:bg-secondary"
              title="Conversations"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>

            <React.Suspense fallback={<ThemeSwitcherSkeleton />}>
              <ThemeSwitcher />
            </React.Suspense>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              className="text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <Settings className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearChat}
              className="text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Status Bar */}
        <div className="relative z-50 px-6 py-2 bg-secondary/50 backdrop-blur-sm flex items-center gap-3 border-b border-border">
          <React.Suspense fallback={<ModelSelectorSkeleton />}>
            <ModelSelector
              currentModel={selectedModel}
              onModelSelect={handleModelChange}
              runtime={runtime}
            />
          </React.Suspense>
          <div className={cn(
            "px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 shadow-sm",
            runtime === "webgpu" ? "bg-green-500 text-white" : 
            runtime === "wasm" ? "bg-amber-500 text-white" :
            "bg-muted text-muted-foreground"
          )}>
            {runtime === "webgpu" ? <Zap className="h-3 w-3" /> : <Cpu className="h-3 w-3" />}
            {runtime === "detecting" ? "Detecting..." : runtime.toUpperCase()}
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {isInitializing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                {initStatus}
              </span>
            ) : (
              initStatus
            )}
          </span>
        </div>


        {/* Main Content Area with Optional Conversation Switcher and Web Search Panel */}
        <div className="flex-1 flex mx-6 my-4 gap-4 min-h-0">
          {/* Conversation Switcher - slides in from left */}
          {showConversations && (
            <div className="w-80 bg-card rounded-2xl shadow-xl backdrop-blur-sm border border-border">
              <React.Suspense fallback={
                <div className="w-full h-full p-4 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              }>
                <ConversationSwitcher
                  onConversationChange={handleConversationChange}
                  className="h-full"
                />
              </React.Suspense>
            </div>
          )}

          {/* Chat Container - fills remaining space */}
          <div className="flex-1 flex flex-col bg-card rounded-2xl shadow-xl backdrop-blur-sm border border-border">
          {/* Messages - fills available space */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-4 bg-gradient-to-b from-card to-secondary/10">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <Sparkles className="h-12 w-12 mb-4 text-primary" />
                <p className="text-lg font-semibold text-foreground">Start a conversation</p>
                <p className="text-sm mt-2 text-muted-foreground">Your AI assistant runs entirely in this browser</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "message-bubble",
                      msg.role === "user" ? "user-message" : "assistant-message"
                    )}
                  >
                    <ErrorBoundary>
                      {msg.content ? (
                        msg.role === "assistant" ? (
                          <SimpleMarkdownRenderer content={msg.content} />
                        ) : (
                          <div className="whitespace-pre-wrap break-words">
                            {msg.content}
                          </div>
                        )
                      ) : (
                        <div className="typing-indicator">
                          <span style={{ animationDelay: "0ms" }}></span>
                          <span style={{ animationDelay: "150ms" }}></span>
                          <span style={{ animationDelay: "300ms" }}></span>
                        </div>
                      )}
                    </ErrorBoundary>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="p-4 bg-card border-t border-border">
            {/* URL Detection Indicator */}
            {detectedUrls.length > 0 && (
              <div className="mb-2 px-3 py-2 bg-primary/10 text-primary rounded-lg flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4" />
                <span>
                  {detectedUrls.length} URL{detectedUrls.length > 1 ? 's' : ''} detected. 
                  Content will be fetched automatically when you send.
                </span>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => {
                  const value = e.target.value;
                  setInput(value);
                  // Detect URLs in real-time
                  const urls = smartFetchService.detectUrls(value);
                  setDetectedUrls(urls);
                }}
                placeholder="Ask anything..."
                disabled={isLoading || isInitializing}
                className="flex-1 bg-secondary border border-border rounded-xl px-4 py-3 placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              <Button
                type="submit"
                disabled={isLoading || isInitializing || !input.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 shadow-lg transition-all transform hover:scale-105"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </form>
        </div>
        
        {/* Web Search Panel */}
      </div>

        {/* Settings Dialog */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent onClose={() => setSettingsOpen(false)}>
            <DialogHeader>
              <DialogTitle>Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              
              <div>
                <label className="text-sm font-medium text-foreground">
                  Temperature: {temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => {
                    const newTemp = parseFloat(e.target.value);
                    setTemperature(newTemp);
                    settingsService.setTemperature(newTemp);
                  }}
                  className="w-full mt-1 accent-primary"
                />
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Runtime: {runtime === "webgpu" ? "WebGPU (Optimal)" : "WASM (Fallback)"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Model: {selectedModel || "Loading..."}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}

export default App;