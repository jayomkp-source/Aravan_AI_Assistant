/**
 * StateManager - Central reactive state container for ARAVAN session
 */

import { VoiceState, SessionStats, ConversationMessage, InteractionMode } from '../types';
import { ARAVAN_VOICE, VOICE_PIPELINE } from '../config/voice';
import { MemoryManager } from '../memory/MemoryManager';

export interface ARAVANState {
  voiceState: VoiceState;
  interactionMode: InteractionMode;
  micVolume: number;
  speakerVolume: number;
  errorMessage: string | null;
  activeTool: { name: string; args: Record<string, unknown>; status: 'running' | 'done' } | null;
  lastTranscription: { sender: 'user' | 'model'; text: string; timestamp: number } | null;
  lastLiveEvent: string | null;
  activeAssistantMessageId: string | null;
  messages: ConversationMessage[];
  stats: SessionStats;
}

export type StateListener = (state: ARAVANState) => void;

function generateId(): string {
  return 'msg_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
}

const DEFAULT_WELCOME_MESSAGE: ConversationMessage = {
  id: 'msg_welcome',
  role: 'assistant',
  text: 'Kese ho boss? Ready whenever you are — speak or type anytime.',
  timestamp: Date.now(),
  source: 'text',
  isStreaming: false,
};

export class StateManager {
  private currentAssistantId: string | null = null;
  private currentUserVoiceId: string | null = null;
  private conversationId = 'conv_main';
  private persistenceInitialized = false;

  private state: ARAVANState = {
    voiceState: 'disconnected',
    interactionMode: 'voice-text',
    micVolume: 0,
    speakerVolume: 0,
    errorMessage: null,
    activeTool: null,
    lastTranscription: null,
    lastLiveEvent: null,
    activeAssistantMessageId: null,
    messages: [DEFAULT_WELCOME_MESSAGE],
    stats: {
      connectedSince: null,
      packetsReceived: 0,
      packetsSent: 0,
      interruptionsCount: 0,
      activeVoice: ARAVAN_VOICE,
      pipeline: VOICE_PIPELINE,
    },
  };

  private listeners: Set<StateListener> = new Set();

  constructor() {
    this.initPersistence();
  }

  async initPersistence(): Promise<void> {
    if (this.persistenceInitialized) return;
    try {
      const memoryManager = MemoryManager.getInstance();
      await memoryManager.init();
      const savedMessages = await memoryManager.getMessages(this.conversationId);
      if (savedMessages && savedMessages.length > 0) {
        // Convert to UI types and clean streaming flags
        this.state = {
          ...this.state,
          messages: savedMessages.map((m) => ({
            id: m.id,
            role: m.role,
            text: m.text,
            timestamp: m.timestamp,
            source: m.source,
            isStreaming: false,
          })),
        };
        this.notify();
      }
      this.persistenceInitialized = true;
    } catch (e) {
      console.warn('[StateManager] Persistence init non-fatal warning:', e);
    }
  }

  getState(): ARAVANState {
    return this.state;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  setInteractionMode(interactionMode: InteractionMode): void {
    if (this.state.interactionMode !== interactionMode) {
      this.state = {
        ...this.state,
        interactionMode,
      };
      this.notify();
    }
  }

  setVoiceState(voiceState: VoiceState): void {
    if (this.state.voiceState !== voiceState) {
      this.state = {
        ...this.state,
        voiceState,
        errorMessage: voiceState !== 'error' ? null : this.state.errorMessage,
        stats: {
          ...this.state.stats,
          connectedSince:
            voiceState === 'listening' || voiceState === 'speaking'
              ? this.state.stats.connectedSince || Date.now()
              : voiceState === 'disconnected' || voiceState === 'error'
              ? null
              : this.state.stats.connectedSince,
        },
      };
      this.notify();
    }
  }

  setVolumes(micVolume: number, speakerVolume: number): void {
    this.state = {
      ...this.state,
      micVolume,
      speakerVolume,
    };
    this.notify();
  }

  setError(errorMessage: string): void {
    this.finalizeStreamingMessages();
    this.state = {
      ...this.state,
      voiceState: 'error',
      errorMessage,
    };
    this.notify();
  }

  clearError(): void {
    if (this.state.errorMessage) {
      this.state = {
        ...this.state,
        errorMessage: null,
        voiceState: 'disconnected',
      };
      this.notify();
    }
  }

  setActiveTool(tool: { name: string; args: Record<string, unknown>; status: 'running' | 'done' } | null): void {
    this.state = {
      ...this.state,
      activeTool: tool,
    };
    this.notify();
  }

  recordLiveEvent(eventName: string): void {
    this.state = {
      ...this.state,
      lastLiveEvent: eventName,
    };
    this.notify();
  }

  recordTranscription(sender: 'user' | 'model', text: string): void {
    this.state = {
      ...this.state,
      lastTranscription: {
        sender,
        text,
        timestamp: Date.now(),
      },
    };
    this.notify();
  }

  /**
   * Add a user-typed text message into the conversation
   */
  addUserTextMessage(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;

    this.finalizeStreamingMessages();

    const userMessage: ConversationMessage = {
      id: generateId(),
      role: 'user',
      text: trimmed,
      timestamp: Date.now(),
      source: 'text',
      isStreaming: false,
    };

    this.state = {
      ...this.state,
      messages: [...this.state.messages, userMessage],
      lastTranscription: {
        sender: 'user',
        text: trimmed,
        timestamp: Date.now(),
      },
    };
    this.notify();

    // Persist message to IndexedDB
    MemoryManager.getInstance().saveMessage(userMessage).catch(() => {});
  }

  /**
   * Real-time recognized user speech transcription
   */
  updateUserSpokenText(text: string, finished: boolean): void {
    const trimmed = text.trim();
    if (!trimmed) return;

    let updatedMessages = [...this.state.messages];
    let savedMsg: ConversationMessage | null = null;

    if (this.currentUserVoiceId) {
      const idx = updatedMessages.findIndex((m) => m.id === this.currentUserVoiceId);
      if (idx !== -1) {
        savedMsg = {
          ...updatedMessages[idx],
          text: trimmed,
          isStreaming: !finished,
        };
        updatedMessages[idx] = savedMsg;
      } else {
        this.currentUserVoiceId = generateId();
        savedMsg = {
          id: this.currentUserVoiceId,
          role: 'user',
          text: trimmed,
          timestamp: Date.now(),
          source: 'voice',
          isStreaming: !finished,
        };
        updatedMessages.push(savedMsg);
      }
    } else {
      this.currentUserVoiceId = generateId();
      savedMsg = {
        id: this.currentUserVoiceId,
        role: 'user',
        text: trimmed,
        timestamp: Date.now(),
        source: 'voice',
        isStreaming: !finished,
      };
      updatedMessages.push(savedMsg);
    }

    if (finished) {
      this.currentUserVoiceId = null;
      if (savedMsg) {
        MemoryManager.getInstance().saveMessage(savedMsg).catch(() => {});
      }
    }

    this.state = {
      ...this.state,
      messages: updatedMessages,
      lastTranscription: {
        sender: 'user',
        text: trimmed,
        timestamp: Date.now(),
      },
    };
    this.notify();
  }

  /**
   * Real-time assistant text stream (from modelTurn or output transcription)
   * Prevents duplicate assistant messages for the same turn.
   */
  appendAssistantText(text: string, finished: boolean): void {
    if (!text) return;

    // Reset user spoken message tracker since assistant is responding
    this.currentUserVoiceId = null;

    let updatedMessages = [...this.state.messages];
    let savedMsg: ConversationMessage | null = null;

    if (this.currentAssistantId) {
      const idx = updatedMessages.findIndex((m) => m.id === this.currentAssistantId);
      if (idx !== -1) {
        // If text is additive or progressive
        const existing = updatedMessages[idx].text;
        const newText = text.startsWith(existing) ? text : existing + text;

        savedMsg = {
          ...updatedMessages[idx],
          text: newText,
          isStreaming: !finished,
        };
        updatedMessages[idx] = savedMsg;
      } else {
        this.currentAssistantId = generateId();
        savedMsg = {
          id: this.currentAssistantId,
          role: 'assistant',
          text,
          timestamp: Date.now(),
          source: 'voice',
          isStreaming: !finished,
        };
        updatedMessages.push(savedMsg);
      }
    } else {
      this.currentAssistantId = generateId();
      savedMsg = {
        id: this.currentAssistantId,
        role: 'assistant',
        text,
        timestamp: Date.now(),
        source: 'voice',
        isStreaming: !finished,
      };
      updatedMessages.push(savedMsg);
    }

    if (finished) {
      this.currentAssistantId = null;
      if (savedMsg) {
        MemoryManager.getInstance().saveMessage(savedMsg).catch(() => {});
      }
    }

    this.state = {
      ...this.state,
      activeAssistantMessageId: this.currentAssistantId,
      messages: updatedMessages,
      lastTranscription: {
        sender: 'model',
        text,
        timestamp: Date.now(),
      },
    };
    this.notify();
  }

  /**
   * Finalize all streaming messages (turn complete, interruption, error)
   */
  finalizeStreamingMessages(): void {
    let changed = false;
    const finalizedMessages: ConversationMessage[] = [];

    const updatedMessages = this.state.messages.map((m) => {
      if (m.isStreaming) {
        changed = true;
        const finalized = { ...m, isStreaming: false };
        finalizedMessages.push(finalized);
        return finalized;
      }
      return m;
    });

    this.currentAssistantId = null;
    this.currentUserVoiceId = null;

    // Persist any finalized messages to storage
    for (const msg of finalizedMessages) {
      MemoryManager.getInstance().saveMessage(msg).catch(() => {});
    }

    // Extract turn facts in background
    let lastUser: ConversationMessage | null = null;
    let lastAssistant: ConversationMessage | null = null;
    for (let i = updatedMessages.length - 1; i >= 0; i--) {
      if (!lastAssistant && updatedMessages[i].role === 'assistant') {
        lastAssistant = updatedMessages[i];
      }
      if (!lastUser && updatedMessages[i].role === 'user') {
        lastUser = updatedMessages[i];
      }
      if (lastUser && lastAssistant) break;
    }

    if (lastUser && lastAssistant && lastUser.text && lastAssistant.text) {
      MemoryManager.getInstance().processTurnInBackground(
        lastUser.text,
        lastAssistant.text,
        this.conversationId,
        lastUser.source
      );
    }

    this.state = {
      ...this.state,
      activeAssistantMessageId: null,
      messages: updatedMessages,
    };
    this.notify();
  }

  clearMessages(): void {
    this.currentAssistantId = null;
    this.currentUserVoiceId = null;
    this.state = {
      ...this.state,
      messages: [DEFAULT_WELCOME_MESSAGE],
    };
    this.notify();
  }

  incrementPacketsReceived(): void {
    this.state = {
      ...this.state,
      stats: {
        ...this.state.stats,
        packetsReceived: this.state.stats.packetsReceived + 1,
      },
    };
    this.notify();
  }

  incrementPacketsSent(): void {
    this.state = {
      ...this.state,
      stats: {
        ...this.state.stats,
        packetsSent: this.state.stats.packetsSent + 1,
      },
    };
    this.notify();
  }

  incrementInterruptions(): void {
    this.state = {
      ...this.state,
      stats: {
        ...this.state.stats,
        interruptionsCount: this.state.stats.interruptionsCount + 1,
      },
    };
    this.notify();
  }

  reset(): void {
    this.currentAssistantId = null;
    this.currentUserVoiceId = null;
    this.state = {
      voiceState: 'disconnected',
      interactionMode: this.state.interactionMode,
      micVolume: 0,
      speakerVolume: 0,
      errorMessage: null,
      activeTool: null,
      lastTranscription: null,
      lastLiveEvent: null,
      activeAssistantMessageId: null,
      messages: this.state.messages,
      stats: {
        connectedSince: null,
        packetsReceived: 0,
        packetsSent: 0,
        interruptionsCount: 0,
        activeVoice: ARAVAN_VOICE,
        pipeline: VOICE_PIPELINE,
      },
    };
    this.notify();
  }
}

