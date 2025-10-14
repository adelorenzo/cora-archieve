/**
 * Tauri Storage Service
 * Abstraction layer for persistent storage in both browser and Tauri desktop environments
 * Uses localStorage in browser, file system via Tauri commands in desktop
 */

class TauriStorage {
  constructor() {
    this.isTauri = typeof window !== 'undefined' && window.__TAURI__ !== undefined;
    this.dataDir = null;
    this.fs = null;
    this.path = null;

    console.log(`[TauriStorage] Initializing (Tauri mode: ${this.isTauri})`);
  }

  /**
   * Initialize Tauri filesystem APIs
   */
  async initialize() {
    if (!this.isTauri) {
      console.log('[TauriStorage] Browser mode - using localStorage');
      return;
    }

    try {
      // Dynamically import Tauri APIs
      const { appDataDir } = await import('https://esm.sh/@tauri-apps/api/path');
      const { readTextFile, writeTextFile, exists, createDir } = await import('https://esm.sh/@tauri-apps/api/fs');

      this.dataDir = await appDataDir();
      this.fs = { readTextFile, writeTextFile, exists, createDir };

      // Ensure data directory exists
      const dataPath = `${this.dataDir}data`;
      const dirExists = await exists(dataPath);
      if (!dirExists) {
        await this.fs.createDir(dataPath, { recursive: true });
      }

      console.log('[TauriStorage] Tauri filesystem initialized:', dataPath);
    } catch (error) {
      console.error('[TauriStorage] Failed to initialize Tauri APIs:', error);
      // Fallback to localStorage
      this.isTauri = false;
    }
  }

  /**
   * Get file path for a storage key
   */
  getFilePath(key) {
    return `${this.dataDir}data/${key}.json`;
  }

  /**
   * Get item from storage
   */
  async getItem(key) {
    if (!this.isTauri) {
      // Browser mode - use localStorage
      return localStorage.getItem(key);
    }

    try {
      // Desktop mode - read from file system
      const filePath = this.getFilePath(key);
      const fileExists = await this.fs.exists(filePath);

      if (!fileExists) {
        return null;
      }

      const content = await this.fs.readTextFile(filePath);
      console.log(`[TauriStorage] Read ${key} from file system`);
      return content;
    } catch (error) {
      console.error(`[TauriStorage] Failed to read ${key}:`, error);
      return null;
    }
  }

  /**
   * Set item in storage
   */
  async setItem(key, value) {
    if (!this.isTauri) {
      // Browser mode - use localStorage
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (error) {
        console.error(`[TauriStorage] localStorage setItem failed:`, error);
        return false;
      }
    }

    try {
      // Desktop mode - write to file system
      const filePath = this.getFilePath(key);
      await this.fs.writeTextFile(filePath, value);
      console.log(`[TauriStorage] Wrote ${key} to file system`);
      return true;
    } catch (error) {
      console.error(`[TauriStorage] Failed to write ${key}:`, error);
      return false;
    }
  }

  /**
   * Remove item from storage
   */
  async removeItem(key) {
    if (!this.isTauri) {
      // Browser mode - use localStorage
      localStorage.removeItem(key);
      return true;
    }

    try {
      // Desktop mode - remove file
      const { removeFile } = await import('https://esm.sh/@tauri-apps/api/fs');
      const filePath = this.getFilePath(key);
      const fileExists = await this.fs.exists(filePath);

      if (fileExists) {
        await removeFile(filePath);
        console.log(`[TauriStorage] Removed ${key} from file system`);
      }
      return true;
    } catch (error) {
      console.error(`[TauriStorage] Failed to remove ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if item exists in storage
   */
  async hasItem(key) {
    if (!this.isTauri) {
      // Browser mode
      return localStorage.getItem(key) !== null;
    }

    try {
      // Desktop mode
      const filePath = this.getFilePath(key);
      return await this.fs.exists(filePath);
    } catch (error) {
      console.error(`[TauriStorage] Failed to check existence of ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear all storage
   */
  async clear() {
    if (!this.isTauri) {
      // Browser mode
      localStorage.clear();
      return true;
    }

    try {
      // Desktop mode - remove data directory
      const { removeDir } = await import('https://esm.sh/@tauri-apps/api/fs');
      const dataPath = `${this.dataDir}data`;
      const dirExists = await this.fs.exists(dataPath);

      if (dirExists) {
        await removeDir(dataPath, { recursive: true });
        await this.fs.createDir(dataPath, { recursive: true });
        console.log('[TauriStorage] Cleared all data from file system');
      }
      return true;
    } catch (error) {
      console.error('[TauriStorage] Failed to clear storage:', error);
      return false;
    }
  }

  /**
   * Get storage size estimate (browser only)
   */
  getSize() {
    if (!this.isTauri && 'storage' in navigator && 'estimate' in navigator.storage) {
      return navigator.storage.estimate();
    }
    return Promise.resolve({ usage: 0, quota: 0 });
  }
}

// Create singleton instance
const tauriStorage = new TauriStorage();

export default tauriStorage;
