/**
 * Settings Persistence Service
 * Manages user preferences across sessions using TauriStorage (localStorage or file system)
 */

import tauriStorage from './tauri-storage.js';

class SettingsService {
  constructor() {
    this.STORAGE_KEY = 'cora-settings';
    this.DEFAULT_SETTINGS = {
      model: 'Hermes-3-Llama-3.1-8B-q4f16_1-MLC', // Default to Hermes for new users
      theme: 'light',
      persona: null,
      customPersonas: [],
      temperature: 0.7,
      webSearchEnabled: true,
      ragEnabled: true,
      autoLoadModel: true,
      chatHistory: [],
      lastUsed: Date.now()
    };

    this.settings = { ...this.DEFAULT_SETTINGS };
    this.listeners = new Set();
    this.initialized = false;

    // Initialize asynchronously
    this.initialize();
  }

  /**
   * Initialize storage and load settings
   */
  async initialize() {
    try {
      await tauriStorage.initialize();
      await this.load();
      this.initialized = true;
      console.log('[SettingsService] Initialized');
    } catch (error) {
      console.error('[SettingsService] Initialization failed:', error);
    }
  }

  /**
   * Load settings from storage
   * @returns {Object} Settings object
   */
  async load() {
    try {
      const stored = await tauriStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure all keys exist
        this.settings = { ...this.DEFAULT_SETTINGS, ...parsed };
        return this.settings;
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
    }
    this.settings = { ...this.DEFAULT_SETTINGS };
    return this.settings;
  }

  /**
   * Save settings to storage
   * @returns {Promise<boolean>} Success status
   */
  async save() {
    try {
      this.settings.lastUsed = Date.now();
      const success = await tauriStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
      if (success) {
        this.notifyListeners();
      }
      return success;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }

  /**
   * Get a specific setting
   * @param {string} key - Setting key
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Setting value
   */
  get(key, defaultValue = null) {
    return this.settings[key] ?? defaultValue;
  }

  /**
   * Set a specific setting
   * @param {string} key - Setting key
   * @param {*} value - Setting value
   * @returns {boolean} Success status
   */
  set(key, value) {
    this.settings[key] = value;
    return this.save();
  }

  /**
   * Update multiple settings at once
   * @param {Object} updates - Object with key-value pairs to update
   * @returns {boolean} Success status
   */
  update(updates) {
    Object.assign(this.settings, updates);
    return this.save();
  }

  /**
   * Reset settings to defaults
   * @returns {boolean} Success status
   */
  reset() {
    this.settings = { ...this.DEFAULT_SETTINGS };
    return this.save();
  }

  /**
   * Clear all settings from storage
   */
  async clear() {
    await tauriStorage.removeItem(this.STORAGE_KEY);
    this.settings = { ...this.DEFAULT_SETTINGS };
    this.notifyListeners();
  }

  /**
   * Add a listener for settings changes
   * @param {Function} callback - Callback function
   */
  addListener(callback) {
    this.listeners.add(callback);
  }

  /**
   * Remove a listener
   * @param {Function} callback - Callback function
   */
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of changes
   */
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.settings);
      } catch (error) {
        console.error('Settings listener error:', error);
      }
    });
  }

  /**
   * Get model preference
   * @returns {string|null} Model ID
   */
  getModel() {
    return this.settings.model;
  }

  /**
   * Set model preference
   * @param {string} modelId - Model ID
   * @returns {boolean} Success status
   */
  setModel(modelId) {
    return this.set('model', modelId);
  }

  /**
   * Get theme preference
   * @returns {string} Theme name
   */
  getTheme() {
    return this.settings.theme || 'light';
  }

  /**
   * Set theme preference
   * @param {string} theme - Theme name
   * @returns {boolean} Success status
   */
  setTheme(theme) {
    return this.set('theme', theme);
  }

  /**
   * Get persona settings
   * @returns {Object|null} Persona configuration
   */
  getPersona() {
    return this.settings.persona;
  }

  /**
   * Set persona settings
   * @param {Object} persona - Persona configuration
   * @returns {boolean} Success status
   */
  setPersona(persona) {
    return this.set('persona', persona);
  }

  /**
   * Get custom personas
   * @returns {Array} Array of custom personas
   */
  getCustomPersonas() {
    return this.settings.customPersonas || [];
  }

  /**
   * Add a custom persona
   * @param {Object} persona - Custom persona configuration
   * @returns {boolean} Success status
   */
  addCustomPersona(persona) {
    const personas = this.getCustomPersonas();
    personas.push({
      ...persona,
      id: `custom-${Date.now()}`,
      createdAt: Date.now()
    });
    return this.set('customPersonas', personas);
  }

  /**
   * Remove a custom persona
   * @param {string} personaId - Persona ID to remove
   * @returns {boolean} Success status
   */
  removeCustomPersona(personaId) {
    const personas = this.getCustomPersonas().filter(p => p.id !== personaId);
    return this.set('customPersonas', personas);
  }

  /**
   * Get temperature setting
   * @returns {number} Temperature value
   */
  getTemperature() {
    return this.settings.temperature ?? 0.7;
  }

  /**
   * Set temperature setting
   * @param {number} temperature - Temperature value (0-1)
   * @returns {boolean} Success status
   */
  setTemperature(temperature) {
    return this.set('temperature', Math.max(0, Math.min(1, temperature)));
  }

  /**
   * Get chat history (limited to last N messages)
   * @param {number} limit - Maximum number of messages
   * @returns {Array} Chat messages
   */
  getChatHistory(limit = 100) {
    const history = this.settings.chatHistory || [];
    return history.slice(-limit);
  }

  /**
   * Add message to chat history
   * @param {Object} message - Message object
   * @returns {boolean} Success status
   */
  addToChatHistory(message) {
    const history = this.settings.chatHistory || [];
    history.push({
      ...message,
      timestamp: Date.now()
    });
    
    // Keep only last 500 messages to avoid localStorage limits
    if (history.length > 500) {
      history.splice(0, history.length - 500);
    }
    
    return this.set('chatHistory', history);
  }

  /**
   * Clear chat history
   * @returns {boolean} Success status
   */
  clearChatHistory() {
    return this.set('chatHistory', []);
  }

  /**
   * Export settings as JSON
   * @returns {string} JSON string
   */
  export() {
    return JSON.stringify(this.settings, null, 2);
  }

  /**
   * Import settings from JSON
   * @param {string} json - JSON string
   * @returns {boolean} Success status
   */
  import(json) {
    try {
      const imported = JSON.parse(json);
      this.settings = { ...this.DEFAULT_SETTINGS, ...imported };
      return this.save();
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }

  /**
   * Get statistics about settings usage
   * @returns {Object} Usage statistics
   */
  getStats() {
    return {
      lastUsed: this.settings.lastUsed,
      chatHistorySize: (this.settings.chatHistory || []).length,
      customPersonasCount: (this.settings.customPersonas || []).length,
      storageSize: new Blob([JSON.stringify(this.settings)]).size
    };
  }
}

// Create singleton instance
const settingsService = new SettingsService();

// Auto-save on page unload
window.addEventListener('beforeunload', () => {
  settingsService.save();
});

export default settingsService;