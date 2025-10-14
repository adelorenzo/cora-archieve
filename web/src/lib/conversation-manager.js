/**
 * Conversation Manager Service
 * Manages multiple chat conversations with search, export, and persistence
 */

import settingsService from './settings-service.js';
import tauriStorage from './tauri-storage.js';

class ConversationManager {
  constructor() {
    this.STORAGE_KEY = 'cora-conversations';
    this.conversations = new Map();
    this.activeConversationId = null;
    this.listeners = new Set();
    this.nextId = 1;
    this.initialized = false;

    // Initialize asynchronously
    this.initialize();
  }

  /**
   * Initialize storage and load conversations
   */
  async initialize() {
    try {
      await tauriStorage.initialize();
      await this.load();
      this.initialized = true;
      console.log('[ConversationManager] Initialized');
    } catch (error) {
      console.error('[ConversationManager] Initialization failed:', error);
      this.createConversation('New Chat');
    }
  }

  /**
   * Load conversations from storage
   */
  async load() {
    try {
      const stored = await tauriStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);

        // Load conversations
        if (data.conversations) {
          Object.entries(data.conversations).forEach(([id, conv]) => {
            this.conversations.set(id, {
              ...conv,
              createdAt: new Date(conv.createdAt),
              updatedAt: new Date(conv.updatedAt)
            });
          });
        }

        // Set active conversation
        this.activeConversationId = data.activeConversationId;
        this.nextId = data.nextId || 1;
      }

      // Create default conversation if none exist
      if (this.conversations.size === 0) {
        this.createConversation('New Chat');
      }
    } catch (error) {
      console.warn('Failed to load conversations:', error);
      this.createConversation('New Chat');
    }
  }

  /**
   * Save conversations to storage
   */
  async save() {
    try {
      const data = {
        conversations: Object.fromEntries(this.conversations),
        activeConversationId: this.activeConversationId,
        nextId: this.nextId,
        lastSaved: Date.now()
      };

      const success = await tauriStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      if (success) {
        this.notifyListeners();
      }
      return success;
    } catch (error) {
      console.error('Failed to save conversations:', error);
      return false;
    }
  }

  /**
   * Create a new conversation
   */
  createConversation(title = 'New Chat', switchTo = true) {
    const id = `conv_${this.nextId++}`;
    const conversation = {
      id,
      title,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      model: settingsService.getModel(),
      persona: settingsService.getPersona(),
      temperature: settingsService.getTemperature(),
      archived: false,
      starred: false
    };
    
    this.conversations.set(id, conversation);
    
    if (switchTo) {
      this.activeConversationId = id;
    }
    
    this.save();
    return conversation;
  }

  /**
   * Get conversation by ID
   */
  getConversation(id) {
    return this.conversations.get(id);
  }

  /**
   * Get active conversation
   */
  getActiveConversation() {
    if (!this.activeConversationId || !this.conversations.has(this.activeConversationId)) {
      // Create new conversation if none active
      return this.createConversation('New Chat');
    }
    return this.conversations.get(this.activeConversationId);
  }

  /**
   * Switch to a conversation
   */
  switchToConversation(id) {
    if (this.conversations.has(id)) {
      this.activeConversationId = id;
      this.save();
      return this.conversations.get(id);
    }
    return null;
  }

  /**
   * Add message to conversation
   */
  addMessage(conversationId, message) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return false;
    
    const messageWithId = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...message
    };
    
    conversation.messages.push(messageWithId);
    conversation.updatedAt = new Date();
    
    // Auto-generate title from first user message
    if (conversation.messages.length === 1 && message.role === 'user') {
      conversation.title = this.generateTitle(message.content);
    }
    
    this.save();
    return messageWithId;
  }

  /**
   * Get messages for conversation
   */
  getMessages(conversationId) {
    const conversation = this.conversations.get(conversationId);
    return conversation ? conversation.messages : [];
  }

  /**
   * Update conversation metadata
   */
  updateConversation(conversationId, updates) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return false;
    
    Object.assign(conversation, updates, {
      updatedAt: new Date()
    });
    
    this.save();
    return true;
  }

  /**
   * Delete conversation
   */
  deleteConversation(conversationId) {
    if (!this.conversations.has(conversationId)) return false;
    
    this.conversations.delete(conversationId);
    
    // Switch to another conversation if this was active
    if (this.activeConversationId === conversationId) {
      const remaining = Array.from(this.conversations.keys());
      if (remaining.length > 0) {
        this.activeConversationId = remaining[0];
      } else {
        // Create new conversation if none left
        this.createConversation('New Chat');
      }
    }
    
    this.save();
    return true;
  }

  /**
   * Get all conversations
   */
  getAllConversations() {
    return Array.from(this.conversations.values())
      .filter(conv => !conv.archived)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Get archived conversations
   */
  getArchivedConversations() {
    return Array.from(this.conversations.values())
      .filter(conv => conv.archived)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Search conversations
   */
  searchConversations(query, options = {}) {
    const {
      includeArchived = false,
      searchMessages = true,
      searchTitles = true,
      caseSensitive = false
    } = options;
    
    const searchTerm = caseSensitive ? query : query.toLowerCase();
    const results = [];
    
    for (const conversation of this.conversations.values()) {
      if (!includeArchived && conversation.archived) continue;
      
      let matches = [];
      
      // Search title
      if (searchTitles) {
        const title = caseSensitive ? conversation.title : conversation.title.toLowerCase();
        if (title.includes(searchTerm)) {
          matches.push({
            type: 'title',
            text: conversation.title,
            conversation
          });
        }
      }
      
      // Search messages
      if (searchMessages) {
        for (const message of conversation.messages) {
          const content = caseSensitive ? message.content : message.content.toLowerCase();
          if (content.includes(searchTerm)) {
            matches.push({
              type: 'message',
              message,
              conversation
            });
          }
        }
      }
      
      if (matches.length > 0) {
        results.push({
          conversation,
          matches,
          matchCount: matches.length
        });
      }
    }
    
    return results.sort((a, b) => b.matchCount - a.matchCount);
  }

  /**
   * Export conversation
   */
  exportConversation(conversationId, format = 'json') {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return null;
    
    switch (format) {
      case 'json':
        return JSON.stringify(conversation, null, 2);
      
      case 'markdown':
        let markdown = `# ${conversation.title}\n\n`;
        markdown += `**Created:** ${conversation.createdAt.toLocaleString()}\n`;
        markdown += `**Updated:** ${conversation.updatedAt.toLocaleString()}\n`;
        if (conversation.model) markdown += `**Model:** ${conversation.model}\n`;
        markdown += '\n---\n\n';
        
        for (const message of conversation.messages) {
          const role = message.role === 'user' ? '👤 **You**' : '🤖 **Assistant**';
          markdown += `${role}:\n${message.content}\n\n`;
        }
        return markdown;
      
      case 'txt':
        let text = `${conversation.title}\n`;
        text += `Created: ${conversation.createdAt.toLocaleString()}\n`;
        text += `Updated: ${conversation.updatedAt.toLocaleString()}\n\n`;
        
        for (const message of conversation.messages) {
          const role = message.role === 'user' ? 'You' : 'Assistant';
          text += `${role}: ${message.content}\n\n`;
        }
        return text;
      
      default:
        return JSON.stringify(conversation, null, 2);
    }
  }

  /**
   * Import conversation
   */
  importConversation(data, format = 'json') {
    try {
      let conversation;
      
      if (format === 'json') {
        conversation = typeof data === 'string' ? JSON.parse(data) : data;
      } else {
        throw new Error('Only JSON import supported currently');
      }
      
      // Generate new ID to avoid conflicts
      const newId = `conv_${this.nextId++}`;
      conversation.id = newId;
      conversation.createdAt = new Date(conversation.createdAt);
      conversation.updatedAt = new Date();
      
      // Ensure messages have IDs
      conversation.messages.forEach((msg, index) => {
        if (!msg.id) {
          msg.id = `msg_${Date.now()}_${index}`;
        }
        if (msg.timestamp) {
          msg.timestamp = new Date(msg.timestamp);
        }
      });
      
      this.conversations.set(newId, conversation);
      this.save();
      
      return conversation;
    } catch (error) {
      console.error('Failed to import conversation:', error);
      return null;
    }
  }

  /**
   * Export all conversations
   */
  exportAll(format = 'json') {
    const allConversations = Array.from(this.conversations.values());
    
    if (format === 'json') {
      return JSON.stringify({
        conversations: allConversations,
        exportedAt: new Date(),
        version: '1.0'
      }, null, 2);
    }
    
    return allConversations;
  }

  /**
   * Clear all conversations
   */
  async clearAll() {
    this.conversations.clear();
    this.activeConversationId = null;
    await tauriStorage.removeItem(this.STORAGE_KEY);

    // Create new default conversation
    this.createConversation('New Chat');
  }

  /**
   * Generate title from message content
   */
  generateTitle(content) {
    const words = content.trim().split(/\s+/).slice(0, 6);
    let title = words.join(' ');
    
    if (title.length > 50) {
      title = title.substring(0, 47) + '...';
    }
    
    return title || 'New Chat';
  }

  /**
   * Get conversation statistics
   */
  getStats() {
    const conversations = Array.from(this.conversations.values());
    const totalMessages = conversations.reduce((sum, conv) => sum + conv.messages.length, 0);
    const activeCount = conversations.filter(conv => !conv.archived).length;
    const archivedCount = conversations.filter(conv => conv.archived).length;
    
    return {
      totalConversations: conversations.length,
      activeConversations: activeCount,
      archivedConversations: archivedCount,
      totalMessages,
      storageSize: new Blob([JSON.stringify({
        conversations: Object.fromEntries(this.conversations)
      })]).size
    };
  }

  /**
   * Add listener for changes
   */
  addListener(callback) {
    this.listeners.add(callback);
  }

  /**
   * Remove listener
   */
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * Notify all listeners
   */
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback({
          conversations: this.getAllConversations(),
          activeConversation: this.getActiveConversation(),
          stats: this.getStats()
        });
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }
}

// Create singleton instance
const conversationManager = new ConversationManager();

// Auto-save on page unload
window.addEventListener('beforeunload', () => {
  conversationManager.save();
});

export default conversationManager;