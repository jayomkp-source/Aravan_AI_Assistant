/**
 * MemoryStore - IndexedDB implementation for ARAVAN's Persistent Brain
 * Database: ARAVAN_MEMORY
 */

import {
  IMemoryStore,
  Memory,
  Conversation,
  ConversationMessage,
  MemorySettings,
} from './MemoryTypes';

const DB_NAME = 'ARAVAN_MEMORY';
const DB_VERSION = 1;

export const FOUNDATIONAL_CREATOR_MEMORY: Memory = {
  id: 'mem_creator_jayom_panchal',
  category: 'identity',
  key: 'creator',
  value: 'Jayom Panchal built ARAVAN.',
  importance: 1.0,
  createdAt: 1724659200000,
  updatedAt: 1724659200000,
  tags: ['creator', 'founder', 'author', 'builder', 'identity'],
};

const DEFAULT_SETTINGS: MemorySettings = {
  memoryEnabled: true,
  historyEnabled: true,
  maxMemoriesInContext: 6,
};

export class IndexedDBMemoryStore implements IMemoryStore {
  private dbPromise: Promise<IDBDatabase> | null = null;
  // Fallback in-memory map for environments where IndexedDB might fail or be blocked
  private memoryFallback: Map<string, Memory> = new Map();
  private conversationsFallback: Map<string, Conversation> = new Map();
  private messagesFallback: Map<string, ConversationMessage> = new Map();
  private settingsFallback: MemorySettings = { ...DEFAULT_SETTINGS };

  constructor() {
    // Seed in-memory fallback
    this.memoryFallback.set(FOUNDATIONAL_CREATOR_MEMORY.id, { ...FOUNDATIONAL_CREATOR_MEMORY });
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not available in this environment'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. memories store
        if (!db.objectStoreNames.contains('memories')) {
          const memoryStore = db.createObjectStore('memories', { keyPath: 'id' });
          memoryStore.createIndex('category', 'category', { unique: false });
          memoryStore.createIndex('key', 'key', { unique: false });
          memoryStore.createIndex('importance', 'importance', { unique: false });
          memoryStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // 2. conversations store
        if (!db.objectStoreNames.contains('conversations')) {
          const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
          convStore.createIndex('startedAt', 'startedAt', { unique: false });
          convStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // 3. messages store
        if (!db.objectStoreNames.contains('messages')) {
          const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
          msgStore.createIndex('conversationId', 'conversationId', { unique: false });
          msgStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // 4. settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
      };

      request.onsuccess = async () => {
        const db = request.result;
        // Seed foundational creator memory if not present
        try {
          const tx = db.transaction(['memories'], 'readwrite');
          const store = tx.objectStore('memories');
          const checkReq = store.get(FOUNDATIONAL_CREATOR_MEMORY.id);
          checkReq.onsuccess = () => {
            if (!checkReq.result) {
              store.put(FOUNDATIONAL_CREATOR_MEMORY);
            }
          };
        } catch {
          // ignore
        }
        resolve(db);
      };

      request.onerror = () => {
        console.warn('[MemoryStore] Failed to open IndexedDB, falling back to in-memory store:', request.error);
        reject(request.error || new Error('Failed to open IndexedDB'));
      };
    });

    return this.dbPromise;
  }

  async save(memory: Memory): Promise<void> {
    this.memoryFallback.set(memory.id, { ...memory });
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['memories'], 'readwrite');
        const store = tx.objectStore('memories');
        const req = store.put(memory);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Handled by in-memory fallback
    }
  }

  async update(memory: Memory): Promise<void> {
    await this.save(memory);
  }

  async delete(id: string): Promise<void> {
    this.memoryFallback.delete(id);
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['memories'], 'readwrite');
        const store = tx.objectStore('memories');
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Fallback updated
    }
  }

  async get(id: string): Promise<Memory | null> {
    try {
      const db = await this.getDB();
      return await new Promise<Memory | null>((resolve, reject) => {
        const tx = db.transaction(['memories'], 'readonly');
        const store = tx.objectStore('memories');
        const req = store.get(id);
        req.onsuccess = () => resolve((req.result as Memory) || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return this.memoryFallback.get(id) || null;
    }
  }

  async getAll(): Promise<Memory[]> {
    try {
      const db = await this.getDB();
      const memories = await new Promise<Memory[]>((resolve, reject) => {
        const tx = db.transaction(['memories'], 'readonly');
        const store = tx.objectStore('memories');
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result as Memory[]) || []);
        req.onerror = () => reject(req.error);
      });

      // Always ensure foundational memory is included if missing
      const hasFoundational = memories.some((m) => m.id === FOUNDATIONAL_CREATOR_MEMORY.id);
      if (!hasFoundational) {
        memories.unshift(FOUNDATIONAL_CREATOR_MEMORY);
      }
      return memories;
    } catch {
      const memories = Array.from(this.memoryFallback.values());
      if (!memories.some((m) => m.id === FOUNDATIONAL_CREATOR_MEMORY.id)) {
        memories.unshift(FOUNDATIONAL_CREATOR_MEMORY);
      }
      return memories;
    }
  }

  async search(query: string): Promise<Memory[]> {
    const all = await this.getAll();
    const q = query.toLowerCase().trim();
    if (!q) return all;

    return all.filter((m) => {
      return (
        m.key.toLowerCase().includes(q) ||
        m.value.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        (m.tags && m.tags.some((t) => t.toLowerCase().includes(q)))
      );
    });
  }

  async getImportant(limit = 10): Promise<Memory[]> {
    const all = await this.getAll();
    return all
      .sort((a, b) => b.importance - a.importance || b.updatedAt - a.updatedAt)
      .slice(0, limit);
  }

  async clear(): Promise<void> {
    this.memoryFallback.clear();
    // Re-seed foundational memory so creator memory is never lost
    this.memoryFallback.set(FOUNDATIONAL_CREATOR_MEMORY.id, { ...FOUNDATIONAL_CREATOR_MEMORY });

    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['memories'], 'readwrite');
        const store = tx.objectStore('memories');
        const req = store.clear();
        req.onsuccess = () => {
          // Re-insert foundational memory
          store.put(FOUNDATIONAL_CREATOR_MEMORY);
          resolve();
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Fallback cleared
    }
  }

  // Conversation Persistence
  async saveConversation(conversation: Conversation): Promise<void> {
    this.conversationsFallback.set(conversation.id, { ...conversation });
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['conversations'], 'readwrite');
        const store = tx.objectStore('conversations');
        const req = store.put(conversation);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Fallback
    }
  }

  async getConversation(id: string): Promise<Conversation | null> {
    try {
      const db = await this.getDB();
      return await new Promise<Conversation | null>((resolve, reject) => {
        const tx = db.transaction(['conversations'], 'readonly');
        const store = tx.objectStore('conversations');
        const req = store.get(id);
        req.onsuccess = () => resolve((req.result as Conversation) || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return this.conversationsFallback.get(id) || null;
    }
  }

  async getAllConversations(): Promise<Conversation[]> {
    try {
      const db = await this.getDB();
      return await new Promise<Conversation[]>((resolve, reject) => {
        const tx = db.transaction(['conversations'], 'readonly');
        const store = tx.objectStore('conversations');
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result as Conversation[]) || []);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return Array.from(this.conversationsFallback.values());
    }
  }

  async deleteConversation(id: string): Promise<void> {
    this.conversationsFallback.delete(id);
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['conversations'], 'readwrite');
        const store = tx.objectStore('conversations');
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Fallback
    }
  }

  // Message Persistence
  async saveMessage(message: ConversationMessage): Promise<void> {
    this.messagesFallback.set(message.id, { ...message });
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['messages'], 'readwrite');
        const store = tx.objectStore('messages');
        const req = store.put(message);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Fallback
    }
  }

  async getMessagesForConversation(conversationId: string): Promise<ConversationMessage[]> {
    try {
      const db = await this.getDB();
      return await new Promise<ConversationMessage[]>((resolve, reject) => {
        const tx = db.transaction(['messages'], 'readonly');
        const store = tx.objectStore('messages');
        const index = store.index('conversationId');
        const req = index.getAll(conversationId);
        req.onsuccess = () => {
          const list = (req.result as ConversationMessage[]) || [];
          list.sort((a, b) => a.timestamp - b.timestamp);
          resolve(list);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return Array.from(this.messagesFallback.values())
        .filter((m) => m.conversationId === conversationId)
        .sort((a, b) => a.timestamp - b.timestamp);
    }
  }

  // Settings
  async getSettings(): Promise<MemorySettings> {
    try {
      const db = await this.getDB();
      return await new Promise<MemorySettings>((resolve) => {
        const tx = db.transaction(['settings'], 'readonly');
        const store = tx.objectStore('settings');
        const req = store.get('global_settings');
        req.onsuccess = () => {
          if (req.result && req.result.settings) {
            resolve({ ...DEFAULT_SETTINGS, ...req.result.settings });
          } else {
            resolve({ ...DEFAULT_SETTINGS });
          }
        };
        req.onerror = () => resolve({ ...DEFAULT_SETTINGS });
      });
    } catch {
      return { ...this.settingsFallback };
    }
  }

  async saveSettings(settings: Partial<MemorySettings>): Promise<void> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    this.settingsFallback = updated;

    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['settings'], 'readwrite');
        const store = tx.objectStore('settings');
        const req = store.put({ id: 'global_settings', settings: updated });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Fallback updated
    }
  }
}
