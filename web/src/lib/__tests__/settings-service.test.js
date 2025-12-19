import { describe, it, expect, beforeEach, vi } from 'vitest';

// Re-mock localStorage for each test
const createMockLocalStorage = () => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i) => Object.keys(store)[i] || null)
  };
};

describe('SettingsService', () => {
  let SettingsService;
  let mockLocalStorage;

  beforeEach(async () => {
    // Reset modules and create fresh localStorage mock
    vi.resetModules();
    mockLocalStorage = createMockLocalStorage();
    global.localStorage = mockLocalStorage;

    // Import fresh instance
    const module = await import('../settings-service.js');
    SettingsService = module.default;
  });

  describe('initialization', () => {
    it('should load default settings when localStorage is empty', () => {
      expect(SettingsService.settings).toBeDefined();
      expect(SettingsService.settings.temperature).toBe(0.7);
      expect(SettingsService.settings.theme).toBe('light');
    });

    it('should merge stored settings with defaults', async () => {
      vi.resetModules();
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ theme: 'dark' }));

      const module = await import('../settings-service.js');
      const service = module.default;

      expect(service.settings.theme).toBe('dark');
      expect(service.settings.temperature).toBe(0.7); // Default preserved
    });
  });

  describe('get/set methods', () => {
    it('should get a setting value', () => {
      SettingsService.settings.customKey = 'customValue';
      expect(SettingsService.get('customKey')).toBe('customValue');
    });

    it('should return default value for missing key', () => {
      expect(SettingsService.get('nonexistent', 'fallback')).toBe('fallback');
    });

    it('should set a setting value and persist', () => {
      SettingsService.set('testKey', 'testValue');

      expect(SettingsService.settings.testKey).toBe('testValue');
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('model settings', () => {
    it('should get model', () => {
      SettingsService.settings.model = 'test-model';
      expect(SettingsService.getModel()).toBe('test-model');
    });

    it('should set model', () => {
      SettingsService.setModel('new-model');
      expect(SettingsService.settings.model).toBe('new-model');
    });
  });

  describe('theme settings', () => {
    it('should get theme', () => {
      SettingsService.settings.theme = 'dark';
      expect(SettingsService.getTheme()).toBe('dark');
    });

    it('should default to light theme', () => {
      SettingsService.settings.theme = null;
      expect(SettingsService.getTheme()).toBe('light');
    });

    it('should set theme', () => {
      SettingsService.setTheme('ocean');
      expect(SettingsService.settings.theme).toBe('ocean');
    });
  });

  describe('temperature settings', () => {
    it('should get temperature', () => {
      SettingsService.settings.temperature = 0.5;
      expect(SettingsService.getTemperature()).toBe(0.5);
    });

    it('should clamp temperature to valid range', () => {
      SettingsService.setTemperature(1.5);
      expect(SettingsService.settings.temperature).toBe(1);

      SettingsService.setTemperature(-0.5);
      expect(SettingsService.settings.temperature).toBe(0);
    });
  });

  describe('persona settings', () => {
    it('should get and set persona', () => {
      const persona = { id: 'test', name: 'Test Persona' };
      SettingsService.setPersona(persona);

      expect(SettingsService.getPersona()).toEqual(persona);
    });

    it('should add custom persona', () => {
      const persona = { name: 'Custom', prompt: 'Test prompt' };
      SettingsService.addCustomPersona(persona);

      const personas = SettingsService.getCustomPersonas();
      expect(personas).toHaveLength(1);
      expect(personas[0].name).toBe('Custom');
      expect(personas[0].id).toMatch(/^custom-/);
    });

    it('should remove custom persona', () => {
      SettingsService.settings.customPersonas = [
        { id: 'custom-1', name: 'First' },
        { id: 'custom-2', name: 'Second' }
      ];

      SettingsService.removeCustomPersona('custom-1');

      const personas = SettingsService.getCustomPersonas();
      expect(personas).toHaveLength(1);
      expect(personas[0].id).toBe('custom-2');
    });
  });

  describe('chat history', () => {
    it('should add message to chat history', () => {
      SettingsService.addToChatHistory({ role: 'user', content: 'Hello' });

      const history = SettingsService.getChatHistory();
      expect(history).toHaveLength(1);
      expect(history[0].content).toBe('Hello');
      expect(history[0].timestamp).toBeDefined();
    });

    it('should limit chat history to 500 messages', () => {
      SettingsService.settings.chatHistory = Array(500).fill({ role: 'user', content: 'Old' });
      SettingsService.addToChatHistory({ role: 'user', content: 'New' });

      const history = SettingsService.getChatHistory(600);
      expect(history).toHaveLength(500);
      expect(history[history.length - 1].content).toBe('New');
    });

    it('should clear chat history', () => {
      SettingsService.settings.chatHistory = [{ role: 'user', content: 'Test' }];
      SettingsService.clearChatHistory();

      expect(SettingsService.getChatHistory()).toHaveLength(0);
    });
  });

  describe('reset and clear', () => {
    it('should reset to defaults', () => {
      SettingsService.settings.theme = 'custom-theme';
      SettingsService.settings.temperature = 0.1;

      SettingsService.reset();

      expect(SettingsService.settings.theme).toBe('light');
      expect(SettingsService.settings.temperature).toBe(0.7);
    });

    it('should clear localStorage', () => {
      SettingsService.clear();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('cora-settings');
    });
  });

  describe('listeners', () => {
    it('should add and notify listeners', () => {
      const listener = vi.fn();
      SettingsService.addListener(listener);

      SettingsService.set('testKey', 'value');

      expect(listener).toHaveBeenCalledWith(SettingsService.settings);
    });

    it('should remove listeners', () => {
      const listener = vi.fn();
      SettingsService.addListener(listener);
      SettingsService.removeListener(listener);

      SettingsService.set('testKey', 'value');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('import/export', () => {
    it('should export settings as JSON', () => {
      const exported = SettingsService.export();

      expect(() => JSON.parse(exported)).not.toThrow();
      expect(JSON.parse(exported).temperature).toBe(0.7);
    });

    it('should import settings from JSON', () => {
      const toImport = JSON.stringify({ theme: 'midnight', temperature: 0.3 });

      SettingsService.import(toImport);

      expect(SettingsService.settings.theme).toBe('midnight');
      expect(SettingsService.settings.temperature).toBe(0.3);
    });

    it('should handle invalid JSON import gracefully', () => {
      const result = SettingsService.import('invalid json');

      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return usage statistics', () => {
      SettingsService.settings.chatHistory = [{ content: 'Test' }];
      SettingsService.settings.customPersonas = [{ name: 'Custom' }];

      const stats = SettingsService.getStats();

      expect(stats.chatHistorySize).toBe(1);
      expect(stats.customPersonasCount).toBe(1);
      expect(stats.storageSize).toBeGreaterThan(0);
    });
  });
});
