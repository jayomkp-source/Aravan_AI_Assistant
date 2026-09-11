/**
 * ARAVAN Memory System - Type Definitions
 */

export type MemoryCategory =
  | 'identity'
  | 'preference'
  | 'personal'
  | 'project'
  | 'relationship'
  | 'routine'
  | 'fact'
  | 'conversation';

export interface Memory {
  id: string;
  category: MemoryCategory;
  key: string;
  value: string;
  importance: number; // 0.0 -> 1.0
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
  sourceConversationId?: string;
  tags?: string[];
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  source: 'voice' | 'text';
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  startedAt: number;
  updatedAt: number;
  title?: string;
  messages: ConversationMessage[];
}

export interface MemorySettings {
  memoryEnabled: boolean;
  historyEnabled: boolean;
  maxMemoriesInContext: number;
}

export interface IMemoryStore {
  save(memory: Memory): Promise<void>;
  update(memory: Memory): Promise<void>;
  delete(id: string): Promise<void>;
  get(id: string): Promise<Memory | null>;
  search(query: string): Promise<Memory[]>;
  getImportant(limit?: number): Promise<Memory[]>;
  getAll(): Promise<Memory[]>;
  clear(): Promise<void>;

  // Conversation and message persistence
  saveConversation(conversation: Conversation): Promise<void>;
  getConversation(id: string): Promise<Conversation | null>;
  getAllConversations(): Promise<Conversation[]>;
  deleteConversation(id: string): Promise<void>;
  saveMessage(message: ConversationMessage): Promise<void>;
  getMessagesForConversation(conversationId: string): Promise<ConversationMessage[]>;

  // Settings
  getSettings(): Promise<MemorySettings>;
  saveSettings(settings: Partial<MemorySettings>): Promise<void>;
}
