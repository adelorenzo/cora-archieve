import React, { useState, useEffect, useRef } from 'react';
import { Send, Settings, Trash2, Cpu, Zap, Loader2, Sparkles, Database, Upload, BookOpen } from 'lucide-react';
import { Button } from './components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './components/ui/dialog';
import { Badge } from './components/ui/badge';
import MarkdownRenderer from './components/MarkdownRenderer';
import ErrorBoundary from './components/ErrorBoundary';
import ThemeSwitcher from './components/ThemeSwitcher';
import PersonaSelector from './components/PersonaSelector';
import ModelSelector from './components/ModelSelector';
// Lazy load RAG components to reduce initial bundle size
const DocumentUpload = React.lazy(() => import('./components/DocumentUpload'));
const KnowledgeBase = React.lazy(() => import('./components/KnowledgeBase'));
import { useTheme } from './contexts/ThemeContext';
import { usePersona } from './contexts/PersonaContext';
import { useRAG } from './hooks/useRAG';
import llmService from './lib/llm-service';
import performanceOptimizer from './lib/performance-optimizer';
import { cn } from './lib/utils';

function App() {
  const { currentTheme } = useTheme();
  const { activePersonaData } = usePersona();
  const { ragState, isRAGEnabled, getRAGStatus, initializeRAG, updateStats } = useRAG();
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initStatus, setInitStatus] = useState('Initializing...');
  const [runtime, setRuntime] = useState('detecting');
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [isStreaming, setIsStreaming] = useState(false);
  const [knowledgeBaseOpen, setKnowledgeBaseOpen] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const messagesEndRef = useRef(null);
  const getSystemMessages = () => {
    const basePrompt = activePersonaData?.systemPrompt || "You are a concise, helpful assistant that runs 100% locally in the user's browser.";
    const ragPrompt = isRAGEnabled() ? 
      "\n\nYou have access to a knowledge base with relevant documents. When answering questions, you can reference information from the uploaded documents if it's relevant to the user's query. Always cite your sources when using information from the knowledge base." 
      : "";
    
    return [
      { role: "system", content: basePrompt + ragPrompt }
    ];
  };

  useEffect(() => {
    loadAvailableModels();
    
    // Track app initialization
    performanceOptimizer.trackInteraction('app-start');
    
    // Intelligent RAG initialization - only if user has used RAG before
    if (performanceOptimizer.shouldPreloadAdvancedFeatures()) {
      initializeRAG().catch(error => {
        console.warn('RAG preload failed:', error);
      });
    }
    
    // Start performance monitoring
    setTimeout(() => {
      performanceOptimizer.preloadCriticalComponents();
    }, 3000);
  }, []); // Remove initializeRAG from dependencies to prevent infinite loop

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadAvailableModels = async () => {
    try {
      setInitStatus('Detecting runtime...');
      const detectedRuntime = await llmService.detectRuntime();
      setRuntime(detectedRuntime);
      
      if (detectedRuntime === 'webgpu') {
        const availableModels = await llmService.getAvailableModels();
        setModels(availableModels);
        if (availableModels.length > 0) {
          // Find a small model to use as default
          const defaultModel = availableModels.find(m => 
            m.model_id.includes('SmolLM2-135M') || 
            m.model_id.includes('Qwen2.5-0.5B')
          ) || availableModels[0];
          setSelectedModel(defaultModel.model_id);
        }
        setInitStatus('Select a model to start');
      } else {
        setInitStatus('WASM mode - Click to initialize');
      }
    } catch (error) {
      console.error('Failed to detect runtime:', error);
      setRuntime('wasm'); // Fallback to WASM on error
      setInitStatus('WASM mode (fallback) - Click to initialize');
    } finally {
      setIsInitializing(false);
    }
  };

  const initializeLLM = async (modelToLoad = selectedModel) => {
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
      }
      setInitStatus('Ready');
      setIsInitializing(false);
    } catch (error) {
      console.error('Failed to initialize LLM:', error);
      setInitStatus('Failed to initialize - Try another model');
      setIsInitializing(false);
    }
  };

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
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsStreaming(true);

    const assistantMessage = { role: 'assistant', content: '' };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const systemMessages = getSystemMessages();
      const allMessages = [
        ...systemMessages,
        ...messages,
        userMessage
      ];

      // Use the enhanced chat method that handles RAG context automatically
      const stream = llmService.chat(allMessages, { 
        temperature: activePersonaData?.temperature || temperature,
        ragLimit: 5,
        ragThreshold: 0.7
      });

      for await (const delta of stream) {
        if (delta.content) {
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].content += delta.content;
            return newMessages;
          });
        }
      }
    } catch (error) {
      console.error('Generation error:', error);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].content = 'Error generating response. Please try again.';
        return newMessages;
      });
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };


  const handleModelChange = async (model) => {
    setSelectedModel(model);
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
    setMessages([]);
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <div className="flex flex-col h-full">
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
            <PersonaSelector />
            <ThemeSwitcher />
            
            {/* RAG Status Badge */}
            {isRAGEnabled() && (
              <Badge 
                variant="default" 
                className="bg-green-500 text-white hover:bg-green-600 cursor-pointer"
                onClick={() => setKnowledgeBaseOpen(true)}
              >
                RAG • {ragState.indexedCount} docs
              </Badge>
            )}
            
            {/* Knowledge Base Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                performanceOptimizer.trackInteraction('knowledge-base-open');
                setKnowledgeBaseOpen(true);
              }}
              className={cn(
                "transition-colors",
                isRAGEnabled() 
                  ? "text-green-600 hover:text-green-700 hover:bg-green-50" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
              title={isRAGEnabled() ? "Knowledge Base (Active)" : "Knowledge Base"}
            >
              <BookOpen className="h-5 w-5" />
            </Button>
            
            {/* Document Upload Toggle */}
            <Button
              variant={showDocumentUpload ? "secondary" : "ghost"}
              size="icon"
              onClick={() => {
                performanceOptimizer.trackInteraction('document-upload-toggle');
                setShowDocumentUpload(!showDocumentUpload);
              }}
              className="text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Document Upload"
            >
              <Upload className="h-5 w-5" />
            </Button>
            
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
          <ModelSelector 
            currentModel={selectedModel}
            onModelSelect={handleModelChange}
            runtime={runtime}
          />
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

        {/* Document Upload Section */}
        {showDocumentUpload && (
          <div className="mx-6 mb-4">
            <React.Suspense fallback={
              <div className="bg-card rounded-2xl p-6 border border-border animate-pulse">
                <div className="h-32 bg-muted rounded"></div>
              </div>
            }>
              <DocumentUpload
                onDocumentsChange={() => {
                  // Update RAG stats when documents change
                  updateStats();
                }}
                className="bg-card rounded-2xl p-6 border border-border"
              />
            </React.Suspense>
          </div>
        )}

        {/* Chat Container - fills remaining space */}
        <div className="flex-1 flex flex-col mx-6 my-4 bg-card rounded-2xl shadow-xl backdrop-blur-sm overflow-hidden border border-border">
          {/* Messages - fills available space */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-card to-secondary/10">
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
                          <MarkdownRenderer content={msg.content} />
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
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
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
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
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

        {/* Knowledge Base Modal */}
        {knowledgeBaseOpen && (
          <React.Suspense fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-card rounded-lg p-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="mt-4 text-sm text-muted-foreground">Loading knowledge base...</p>
              </div>
            </div>
          }>
            <KnowledgeBase
              open={knowledgeBaseOpen}
              onOpenChange={setKnowledgeBaseOpen}
              onRAGStatusChange={() => {
                // Update RAG stats when knowledge base changes
                updateStats();
              }}
            />
          </React.Suspense>
        )}
      </div>
    </div>
  );
}

export default App;