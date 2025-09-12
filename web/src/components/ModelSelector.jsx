import React, { useState, useRef, useEffect } from 'react';
import { Cpu, Zap, Brain, Sparkles, ChevronDown } from 'lucide-react';
import llmService from '../lib/llm-service.js';
import { CURATED_MODELS } from '../config/models.js';
import DropdownPortal from './DropdownPortal';

// Icon mapping for different model types
const getModelIcon = (modelId) => {
  if (modelId.includes('SmolLM') || modelId.includes('TinyLlama')) {
    return <Zap className="w-4 h-4" />;
  }
  if (modelId.includes('Phi')) {
    return <Cpu className="w-4 h-4" />;
  }
  if (modelId.includes('gemma')) {
    return <Sparkles className="w-4 h-4" />;
  }
  return <Brain className="w-4 h-4" />;
};

const getCuratedModelsForUI = () => {
  return CURATED_MODELS.map(model => ({
    id: model.model_id,
    name: model.name,
    description: model.description,
    icon: getModelIcon(model.model_id),
    size: model.size,
    speed: model.speed,
    quality: model.quality,
    useCase: model.useCase
  }));
};

const ModelSelector = ({ currentModel, onModelSelect, runtime }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Calculate dropdown position
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      });
    }

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    // Delay adding the listener to avoid catching the opening click
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleModelSelect = async (model) => {
    if (model.id === currentModel) {
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setIsOpen(false);
    
    try {
      await onModelSelect(model.id);
    } finally {
      setIsLoading(false);
    }
  };

  const curatedModels = getCuratedModelsForUI();
  
  const selectedModel = curatedModels.find(m => m.id === currentModel) || {
    name: currentModel || 'Select Model',
    description: 'Choose a model to start chatting',
    icon: <Brain className="w-4 h-4" />
  };

  // For WASM runtime, only show the fallback model
  const availableModels = runtime === 'wasm' 
    ? [{ 
        id: 'stories260K',
        name: 'TinyStories',
        description: 'Lightweight WASM fallback model',
        icon: <Zap className="w-4 h-4" />,
        size: '~15MB',
        speed: 'Very Fast',
        quality: 'Basic'
      }]
    : curatedModels;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        disabled={isLoading}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors ${
          isLoading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : (
          selectedModel.icon
        )}
        <div className="text-left">
          <div className="text-sm font-medium">{selectedModel.name}</div>
          {runtime === 'wasm' && (
            <div className="text-xs text-muted-foreground">WASM Mode</div>
          )}
        </div>
        {runtime !== 'wasm' && <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {isOpen && (
        <DropdownPortal>
          <div 
            ref={dropdownRef}
            className="fixed w-96 rounded-lg bg-popover border border-border shadow-lg z-[9999]"
            style={{ 
              top: `${dropdownPosition.top + 8}px`, 
              left: `${dropdownPosition.left}px` 
            }}
          >
            <div className="p-3">
            <div className="text-sm font-medium text-muted-foreground mb-3">
              Select AI Model
            </div>
            
            <div className="space-y-2">
              {availableModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleModelSelect(model)}
                  className={`w-full p-3 rounded-lg text-left hover:bg-secondary transition-colors ${
                    currentModel === model.id ? 'bg-secondary ring-2 ring-primary' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{model.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{model.name}</span>
                        <span className="text-xs text-muted-foreground">{model.size}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {model.description}
                      </div>
                      <div className="flex gap-4 mt-2 text-xs">
                        <span className="text-muted-foreground">
                          Speed: <span className="text-foreground">{model.speed}</span>
                        </span>
                        <span className="text-muted-foreground">
                          Quality: <span className="text-foreground">{model.quality}</span>
                        </span>
                      </div>
                      {model.useCase && (
                        <div className="text-xs text-primary/70 mt-1 font-medium">
                          Best for: {model.useCase}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-border">
              <div className="text-xs text-muted-foreground">
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  Runtime: {runtime === 'webgpu' ? 'WebGPU (Hardware Accelerated)' : 'WebAssembly'}
                </div>
                <div>Models are downloaded once and cached locally</div>
              </div>
            </div>
          </div>
          </div>
        </DropdownPortal>
      )}
    </div>
  );
};

export default ModelSelector;