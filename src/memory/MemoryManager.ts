/**
 * MemoryManager - Central Orchestrator for ARAVAN's Persistent Brain
 * 
 * Works across:
 * - Voice conversations
 * - Typed conversations
 * - Browser refreshes
 * - Future sessions
 */

import {
  Memory,
  MemoryCategory,
  Conversation,
  ConversationMessage,
  MemorySettings,
} from './MemoryTypes';
import { IndexedDBMemoryStore, FOUNDATIONAL_CREATOR_MEMORY } from './MemoryStore';
import { MemorySearch } from './MemorySearch';
import { MemoryExtractor, ExtractedFact } from './MemoryExtractor';

function generateId(prefix = 'mem'): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
}

export class MemoryManager {
  private static instance: MemoryManager | null = null;
  private store: IndexedDBMemoryStore;
  private settings: MemorySettings = {
    memoryEnabled: true,
    historyEnabled: true,
    maxMemoriesInContext: 5,
  };
  private isInitialized = false;
  private memoryListeners: Set<() => void> = new Set();

  constructor() {
    this.store = new IndexedDBMemoryStore();
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;
    try {
      this.settings = await this.store.getSettings();
      // Ensure foundational memory is present
      const existingCreator = await this.store.get(FOUNDATIONAL_CREATOR_MEMORY.id);
      if (!existingCreator) {
        await this.store.save(FOUNDATIONAL_CREATOR_MEMORY);
      }
      this.isInitialized = true;
    } catch (err) {
      console.warn('[MemoryManager] Initialization non-fatal warning:', err);
    }
  }

  subscribe(listener: () => void): () => void {
    this.memoryListeners.add(listener);
    return () => this.memoryListeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.memoryListeners) {
      try {
        listener();
      } catch (e) {
        console.error('[MemoryManager] Listener error:', e);
      }
    }
  }

  isMemoryEnabled(): boolean {
    return this.settings.memoryEnabled;
  }

  async toggleMemoryEnabled(enabled: boolean): Promise<void> {
    this.settings.memoryEnabled = enabled;
    await this.store.saveSettings({ memoryEnabled: enabled });
    this.notify();
  }

  /**
   * Retrieve relevant memories for the current user input / context
   */
  async getRelevantContext(query: string): Promise<string> {
    await this.init();

    // If memory is disabled, do not retrieve personal memories
    if (!this.settings.memoryEnabled) {
      // Check if user specifically asked who built ARAVAN; if so, answer foundational identity
      const qLower = query.toLowerCase();
      if (qLower.includes('who built') || qLower.includes('creator') || qLower.includes('who made')) {
        return `Relevant background knowledge:\n- ${FOUNDATIONAL_CREATOR_MEMORY.value}`;
      }
      return '';
    }

    try {
      const allMemories = await this.store.getAll();
      const relevant = MemorySearch.search(query, allMemories, {
        limit: this.settings.maxMemoriesInContext,
        minScore: 0.3,
      });

      return MemorySearch.formatForPrompt(relevant);
    } catch (err) {
      console.warn('[MemoryManager] Error getting context:', err);
      return '';
    }
  }

  /**
   * Get all active memories for review UI
   */
  async getAllMemories(): Promise<Memory[]> {
    await this.init();
    return this.store.getAll();
  }

  /**
   * Explicitly save a memory (e.g. from user command "Remember this...")
   */
  async saveExplicitMemory(
    key: string,
    value: string,
    category: MemoryCategory = 'fact',
    importance = 0.9,
    tags: string[] = []
  ): Promise<Memory> {
    await this.init();

    // Security check
    if (MemoryExtractor.containsSensitiveData(key) || MemoryExtractor.containsSensitiveData(value)) {
      throw new Error('Cannot store sensitive credentials or keys in memory.');
    }

    const allMemories = await this.store.getAll();
    const candidate: ExtractedFact = { category, key, value, importance, tags };
    const duplicate = MemoryExtractor.findDuplicateMatch(candidate, allMemories);

    const now = Date.now();
    let memoryToSave: Memory;

    if (duplicate) {
      memoryToSave = {
        ...duplicate,
        value,
        importance: Math.max(duplicate.importance, importance),
        updatedAt: now,
        lastUsedAt: now,
        tags: Array.from(new Set([...(duplicate.tags || []), ...tags])),
      };
      await this.store.update(memoryToSave);
    } else {
      memoryToSave = {
        id: generateId('mem'),
        category,
        key,
        value,
        importance,
        createdAt: now,
        updatedAt: now,
        lastUsedAt: now,
        tags,
      };
      await this.store.save(memoryToSave);
    }

    this.notify();
    return memoryToSave;
  }

  /**
   * Delete an individual memory
   */
  async deleteMemory(id: string): Promise<void> {
    await this.init();
    await this.store.delete(id);
    this.notify();
  }

  /**
   * Clear all memories (keeps foundational creator memory intact)
   */
  async clearAllMemories(): Promise<void> {
    await this.init();
    await this.store.clear();
    this.notify();
  }

  /**
   * Forget memories matching a query (natural language "Forget what I said about X")
   */
  async forgetMemoriesMatching(query: string): Promise<number> {
    await this.init();
    const all = await this.store.getAll();
    const qLower = query.toLowerCase().trim();

    let deletedCount = 0;
    for (const mem of all) {
      // Never delete foundational creator memory unless explicitly requested
      if (mem.id === FOUNDATIONAL_CREATOR_MEMORY.id) continue;

      const memText = `${mem.key} ${mem.value} ${mem.category}`.toLowerCase();
      if (memText.includes(qLower)) {
        await this.store.delete(mem.id);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.notify();
    }
    return deletedCount;
  }

  /**
   * Background process turn: Asynchronously extract and persist memories without blocking audio
   */
  async processTurnInBackground(
    userText: string,
    assistantText: string,
    conversationId: string,
    source: 'voice' | 'text' = 'voice'
  ): Promise<void> {
    if (!this.settings.memoryEnabled) return;

    // Run completely decoupled in background
    setTimeout(async () => {
      try {
        await this.init();

        // 1. Natural commands detection
        const userLower = userText.toLowerCase().trim();
        if (userLower.startsWith('forget what i said about') || userLower.startsWith('forget everything about')) {
          const match = userText.match(/forget (?:what i said about|everything about)\s+(.+)/i);
          if (match && match[1]) {
            await this.forgetMemoriesMatching(match[1].trim());
            return;
          }
        }

        // 2. Extract facts from conversational turn
        const facts = MemoryExtractor.extractFacts(userText, assistantText);
        if (facts.length === 0) return;

        const allMemories = await this.store.getAll();
        const now = Date.now();

        for (const fact of facts) {
          const duplicate = MemoryExtractor.findDuplicateMatch(fact, allMemories);

          if (duplicate) {
            // Update existing memory
            const updated: Memory = {
              ...duplicate,
              value: fact.value,
              importance: Math.min(1.0, duplicate.importance + 0.05),
              updatedAt: now,
              lastUsedAt: now,
              sourceConversationId: conversationId,
            };
            await this.store.update(updated);
          } else {
            // Create new memory
            const newMemory: Memory = {
              id: generateId('mem'),
              category: fact.category,
              key: fact.key,
              value: fact.value,
              importance: fact.importance,
              createdAt: now,
              updatedAt: now,
              lastUsedAt: now,
              sourceConversationId: conversationId,
              tags: fact.tags,
            };
            await this.store.save(newMemory);
          }
        }

        this.notify();
      } catch (err) {
        console.warn('[MemoryManager] Background memory extraction error:', err);
      }
    }, 10);
  }

  // Conversation & Message Persistence
  async saveMessage(
    msg: {
      id: string;
      role: 'user' | 'assistant';
      text: string;
      timestamp: number;
      source: 'voice' | 'text';
      conversationId?: string;
    },
    conversationId = 'conv_main'
  ): Promise<void> {
    if (!this.settings.historyEnabled) return;
    try {
      await this.init();
      await this.store.saveMessage({
        id: msg.id,
        conversationId: msg.conversationId || conversationId,
        role: msg.role,
        text: msg.text,
        timestamp: msg.timestamp,
        source: msg.source,
      });
    } catch {
      // ignore
    }
  }

  async getMessages(conversationId: string): Promise<ConversationMessage[]> {
    try {
      await this.init();
      return await this.store.getMessagesForConversation(conversationId);
    } catch {
      return [];
    }
  }

  async saveConversation(conv: Conversation): Promise<void> {
    if (!this.settings.historyEnabled) return;
    try {
      await this.init();
      await this.store.saveConversation(conv);
    } catch {
      // ignore
    }
  }

  async getRecentConversations(): Promise<Conversation[]> {
    try {
      await this.init();
      const all = await this.store.getAllConversations();
      return all.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
      return [];
    }
  }
}
