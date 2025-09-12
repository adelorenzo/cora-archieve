import React, { useState, useEffect, useRef } from 'react';
import { Send, Settings, Trash2, Cpu, Zap, Loader2, Sparkles } from 'lucide-react';
import { Button } from './components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './components/ui/dialog';
import llmService from './lib/llm-service';
import { cn } from './lib/utils';

const tools = [{
  type: "function",
  function: {
    name: "getTime",
    description: "Get the current local time as an ISO string.",
    parameters: { type: "object", properties: {} },
  },
}];

function toolRouter(name) {
  if (name === "getTime") {
    return { now: new Date().toISOString() };
  }
  return { error: "Unknown tool" };
}

function App() {
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
  const messagesEndRef = useRef(null);
  const [systemMessages] = useState([
    { role: "system", content: "You are a concise, helpful assistant that runs 100% locally in the user's browser." }
  ]);

  useEffect(() => {
    loadAvailableModels();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadAvailableModels = async () => {
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
    setIsInitializing(false);
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
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsStreaming(true);

    const assistantMessage = { role: 'assistant', content: '' };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const allMessages = [...systemMessages, ...messages, userMessage];
      const stream = llmService.generateStream(allMessages, { temperature });

      for await (const delta of stream) {
        if (delta.content) {
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].content += delta.content;
            return newMessages;
          });
        }
        
        if (delta.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            const result = toolRouter(toolCall.function.name);
            const toolMessage = `Tool: ${toolCall.function.name}\nResult: ${JSON.stringify(result)}`;
            setMessages(prev => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1].content += `\n\n${toolMessage}`;
              return newMessages;
            });
          }
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

  const handleToolDemo = async () => {
    const demoMessage = { role: 'user', content: "What's the current time?" };
    setMessages(prev => [...prev, demoMessage]);
    setIsLoading(true);
    setIsStreaming(true);

    const assistantMessage = { role: 'assistant', content: '' };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const allMessages = [...systemMessages, ...messages, demoMessage];
      const stream = llmService.generateStream(allMessages, { temperature, tools });

      for await (const delta of stream) {
        if (delta.content) {
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].content += delta.content;
            return newMessages;
          });
        }
        
        if (delta.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            const result = toolRouter(toolCall.function.name);
            const response = `The current time is: ${result.now}`;
            setMessages(prev => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1].content += response;
              return newMessages;
            });
          }
        }
      }
    } catch (error) {
      console.error('Tool demo error:', error);
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
    <div className="h-screen flex flex-col bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-purple-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              WebLLM Chat
            </h1>
            <span className="text-xs text-gray-600 font-medium">100% Local • No Server • No Keys</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              className="text-gray-600 hover:text-purple-600 hover:bg-purple-50 transition-colors"
            >
              <Settings className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearChat}
              className="text-gray-600 hover:text-purple-600 hover:bg-purple-50 transition-colors"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Status Bar */}
        <div className="px-6 py-2 bg-gradient-to-r from-purple-100/50 to-pink-100/50 backdrop-blur-sm flex items-center gap-3 border-b border-purple-100">
          <div className={cn(
            "px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 shadow-sm",
            runtime === "webgpu" ? "bg-gradient-to-r from-green-400 to-emerald-400 text-white" : 
            runtime === "wasm" ? "bg-gradient-to-r from-amber-400 to-yellow-400 text-white" :
            "bg-gray-200 text-gray-600"
          )}>
            {runtime === "webgpu" ? <Zap className="h-3 w-3" /> : <Cpu className="h-3 w-3" />}
            {runtime === "detecting" ? "Detecting..." : runtime.toUpperCase()}
          </div>
          <span className="text-xs text-gray-600 font-medium">
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

        {/* Chat Container - fills remaining space */}
        <div className="flex-1 flex flex-col mx-6 my-4 bg-white/80 rounded-2xl shadow-xl backdrop-blur-sm overflow-hidden border border-purple-100">
          {/* Messages - fills available space */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-white to-purple-50/30">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <Sparkles className="h-12 w-12 mb-4 text-purple-400" />
                <p className="text-lg font-semibold text-gray-700">Start a conversation</p>
                <p className="text-sm mt-2 text-gray-600">Your AI assistant runs entirely in this browser</p>
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
                    {msg.content || (
                      <div className="typing-indicator">
                        <span style={{ animationDelay: "0ms" }}></span>
                        <span style={{ animationDelay: "150ms" }}></span>
                        <span style={{ animationDelay: "300ms" }}></span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-purple-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything..."
                disabled={isLoading || isInitializing}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
              <Button
                type="submit"
                disabled={isLoading || isInitializing || !input.trim()}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 shadow-lg transition-all transform hover:scale-105"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
            
            {/* Tool Demo Button */}
            <div className="mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleToolDemo}
                disabled={isLoading || isInitializing}
                className="text-xs border-purple-200 text-purple-600 hover:bg-purple-50"
              >
                Demo: getTime() Function
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
              {runtime === "webgpu" && models.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Model</label>
                  <select
                    value={selectedModel || ''}
                    onChange={(e) => handleModelChange(e.target.value)}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select a model...</option>
                    {models.map((model) => (
                      <option key={model.model_id} value={model.model_id}>
                        {model.model_id}
                      </option>
                    ))}
                  </select>
                  {!llmService.engine && selectedModel && (
                    <button
                      onClick={() => initializeLLM(selectedModel)}
                      className="mt-2 w-full bg-purple-500 hover:bg-purple-600 text-white rounded-lg px-4 py-2 text-sm transition-colors"
                      disabled={isInitializing}
                    >
                      {isInitializing ? 'Loading...' : 'Load Model'}
                    </button>
                  )}
                </div>
              )}
              
              {runtime === "wasm" && !llmService.engine && (
                <button
                  onClick={() => initializeLLM()}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white rounded-lg px-4 py-2 text-sm transition-colors"
                  disabled={isInitializing}
                >
                  {isInitializing ? 'Loading WASM...' : 'Initialize WASM Model'}
                </button>
              )}
              
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Temperature: {temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full mt-1 accent-purple-500"
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-600">
                  Runtime: {runtime === "webgpu" ? "WebGPU (Optimal)" : "WASM (Fallback)"}
                </p>
                <p className="text-xs text-gray-600 mt-1">
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