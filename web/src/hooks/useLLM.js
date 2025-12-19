import { useState, useCallback, useEffect } from 'react';
import llmService from '../lib/llm-service';
import settingsService from '../lib/settings-service';

/**
 * Custom hook for managing LLM state and operations
 * Handles initialization, model selection, and streaming state
 */
export function useLLM() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initStatus, setInitStatus] = useState('Initializing...');
  const [runtime, setRuntime] = useState('detecting');
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(() => settingsService.getModel());
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [temperature, setTemperature] = useState(() => settingsService.getTemperature());

  /**
   * Initialize the LLM service
   */
  const initializeLLM = useCallback(async (progressCallback) => {
    setIsInitializing(true);
    setInitStatus('Detecting WebGPU support...');

    try {
      const detectedRuntime = await llmService.detectRuntime();
      setRuntime(detectedRuntime);

      if (detectedRuntime === 'webgpu') {
        setInitStatus('WebGPU detected. Loading model...');
      } else {
        setInitStatus('Using WASM fallback...');
      }

      // Get available models
      const availableModels = llmService.getAvailableModels();
      setModels(availableModels);

      // Initialize with saved model or default
      const savedModel = settingsService.getModel();
      const modelToUse = savedModel || availableModels[0]?.id;

      if (modelToUse) {
        await llmService.initialize(modelToUse, (progress, text) => {
          setInitStatus(text || `Loading model: ${Math.round(progress)}%`);
          if (progressCallback) progressCallback(progress, text);
        });
        setSelectedModel(modelToUse);
      }

      return true;
    } catch (error) {
      console.error('[useLLM] Initialization error:', error);
      setInitStatus(`Error: ${error.message}`);
      return false;
    } finally {
      setIsInitializing(false);
    }
  }, []);

  /**
   * Change the current model
   */
  const handleModelChange = useCallback(async (modelId) => {
    if (modelId === selectedModel) return;

    setIsLoading(true);
    setInitStatus(`Switching to ${modelId}...`);

    try {
      await llmService.switchModel(modelId, (progress, text) => {
        setInitStatus(text || `Loading model: ${Math.round(progress)}%`);
      });
      setSelectedModel(modelId);
      settingsService.setModel(modelId);
      return true;
    } catch (error) {
      console.error('[useLLM] Model switch error:', error);
      setInitStatus(`Error: ${error.message}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [selectedModel]);

  /**
   * Update temperature setting
   */
  const handleTemperatureChange = useCallback((value) => {
    setTemperature(value);
    settingsService.setTemperature(value);
    llmService.setTemperature(value);
  }, []);

  /**
   * Generate a response from the LLM
   */
  const generateResponse = useCallback(async (prompt, onChunk, options = {}) => {
    setIsStreaming(true);
    setIsLoading(true);

    try {
      const response = await llmService.generate(prompt, {
        onChunk,
        temperature,
        ...options
      });
      return response;
    } finally {
      setIsStreaming(false);
      setIsLoading(false);
    }
  }, [temperature]);

  /**
   * Stop current generation
   */
  const stopGeneration = useCallback(() => {
    llmService.stop();
    setIsStreaming(false);
    setIsLoading(false);
  }, []);

  return {
    // State
    isInitializing,
    initStatus,
    runtime,
    models,
    selectedModel,
    isStreaming,
    isLoading,
    temperature,
    // Actions
    initializeLLM,
    handleModelChange,
    handleTemperatureChange,
    generateResponse,
    stopGeneration,
    // State setters (for external control)
    setIsStreaming,
    setIsLoading,
    setInitStatus
  };
}

export default useLLM;
