/**
 * StateManager - Central reactive state container for ARAVAN session
 */

import {
  VoiceState,
  SessionStats,
  ConversationMessage,
  InteractionMode,
  GlowLevel,
  TimeDiagnostics,
  GlowDiagnostics,
} from '../types';
import { ARAVAN_VOICE, VOICE_PIPELINE } from '../config/voice';
import { DEFAULT_TIMEZONE } from '../utils/timeUtils';
import { MemoryManager } from '../memory/MemoryManager';

export interface ARAVANState {
  voiceState: VoiceState;
  interactionMode: InteractionMode;
  micVolume: number;
  speakerVolume: number;
  errorMessage: string | null;
  lastAudioError: string | null;
  activeTool: { name: string; args: Record<string, unknown>; status: 'running' | 'done' } | null;
  lastTranscription: { sender: 'user' | 'model'; text: string; timestamp: number } | null;
  lastLiveEvent: string | null;
  activeAssistantMessageId: string | null;
  messages: ConversationMessage[];
  stats: SessionStats;
  glowLevel: GlowLevel;
  stopListeningWhileSpeaking: boolean;
  isMicMuted: boolean;
  followUpSuggestions: string[];
  timeDiagnostics: TimeDiagnostics;
  glowDiagnostics: GlowDiagnostics;
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

const DEFAULT_CONVERSATION_MESSAGES: ConversationMessage[] = [
  {
    id: 'msg_1',
    role: 'user',
    text: 'Aravan, open YouTube',
    timestamp: Date.now() - 1000 * 60 * 3,
    source: 'text',
  },
  {
    id: 'msg_2',
    role: 'assistant',
    text: 'Yeah, give me a sec.',
    timestamp: Date.now() - 1000 * 60 * 3,
    source: 'voice',
  },
  {
    id: 'msg_3',
    role: 'assistant',
    text: 'Done. YouTube is open.',
    timestamp: Date.now() - 1000 * 60 * 3,
    source: 'voice',
  },
  {
    id: 'msg_4',
    role: 'user',
    text: 'Search for lo-fi music',
    timestamp: Date.now() - 1000 * 60 * 2,
    source: 'text',
  },
  {
    id: 'msg_5',
    role: 'assistant',
    text: 'Sure, searching now.',
    timestamp: Date.now() - 1000 * 60 * 2,
    source: 'voice',
  },
  {
    id: 'msg_6',
    role: 'assistant',
    text: 'Here are some great lo-fi music playlists for you. Enjoy! 🎧',
    timestamp: Date.now() - 1000 * 60 * 2,
    source: 'voice',
  },
];

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
    lastAudioError: null,
    activeTool: null,
    lastTranscription: null,
    lastLiveEvent: null,
    activeAssistantMessageId: null,
    messages: DEFAULT_CONVERSATION_MESSAGES,
    stats: {
      connectedSince: null,
      packetsReceived: 0,
      packetsSent: 0,
      interruptionsCount: 0,
      activeVoice: ARAVAN_VOICE,
      pipeline: VOICE_PIPELINE,
    },
    glowLevel: 'surge',
    stopListeningWhileSpeaking: true,
    isMicMuted: false,
    followUpSuggestions: [
      '⚡ Set glow to Hyper',
      '💀 3D Skull Mechanics',
      '🧠 Neural Brain Status',
      '🔇 Stop listening during speech',
    ],
    timeDiagnostics: {
      lastQuery: null,
      recognizedIntent: null,
      toolInvoked: null,
      executionResult: null,
      activeTimeZone: DEFAULT_TIMEZONE,
      lastTimeError: null,
      updatedAt: null,
    },
    glowDiagnostics: {
      activePreset: 'default',
      masterGlow: 75,
      eyeGlow: 80,
      electricGlow: 80,
      bloom: 70,
      fog: 40,
      particles: 60,
      rendererStatus: 'initializing',
      lastSyncError: null,
    },
  };

  private listeners: Set<StateListener> = new Set();
  private static instance: StateManager | null = null;

  public static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  constructor() {
    StateManager.instance = this;
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
    const prevMic = this.state.micVolume;
    const prevSpk = this.state.speakerVolume;
    // Avoid 60Hz re-renders when both channels are effectively silent
    if (prevMic < 0.004 && micVolume < 0.004 && prevSpk < 0.004 && speakerVolume < 0.004) {
      return;
    }
    if (Math.abs(prevMic - micVolume) < 0.004 && Math.abs(prevSpk - speakerVolume) < 0.004) {
      return;
    }
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
      lastAudioError: errorMessage,
    };
    this.notify();
  }

  setAudioError(audioError: string | null): void {
    if (this.state.lastAudioError !== audioError) {
      this.state = {
        ...this.state,
        lastAudioError: audioError,
      };
      this.notify();
    }
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
  updateUserSpokenText(text: string, finished: boolean, isDelta = false): void {
    const cleanChunk = isDelta ? text : text.trim();
    if (!cleanChunk || !cleanChunk.trim()) return;

    let updatedMessages = [...this.state.messages];
    let savedMsg: ConversationMessage | null = null;

    if (this.currentUserVoiceId) {
      const idx = updatedMessages.findIndex((m) => m.id === this.currentUserVoiceId);
      if (idx !== -1) {
        const existing = updatedMessages[idx].text;
        let combined = cleanChunk;
        if (isDelta) {
          if (cleanChunk === existing) {
            combined = existing;
          } else if (cleanChunk.startsWith(existing)) {
            combined = cleanChunk;
          } else {
            combined = existing + cleanChunk;
          }
        }
        savedMsg = {
          ...updatedMessages[idx],
          text: combined.trimStart(),
          isStreaming: !finished,
        };
        updatedMessages[idx] = savedMsg;
      } else {
        this.currentUserVoiceId = generateId();
        savedMsg = {
          id: this.currentUserVoiceId,
          role: 'user',
          text: cleanChunk.trim(),
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
        text: cleanChunk.trim(),
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
        text: savedMsg ? savedMsg.text : cleanChunk.trim(),
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

    // Reset user spoken message tracker and finalize any streaming user voice message
    this.currentUserVoiceId = null;

    let updatedMessages = this.state.messages.map((m) =>
      m.role === 'user' && m.isStreaming ? { ...m, isStreaming: false } : m
    );
    let savedMsg: ConversationMessage | null = null;

    if (this.currentAssistantId) {
      const idx = updatedMessages.findIndex((m) => m.id === this.currentAssistantId);
      if (idx !== -1) {
        const existing = updatedMessages[idx].text;
        let newText: string;
        if (text === existing) {
          newText = existing;
        } else if (text.startsWith(existing)) {
          newText = text;
        } else if (existing.endsWith(text) && text.trim().length > 2) {
          newText = existing;
        } else {
          newText = existing + text;
        }

        savedMsg = {
          ...updatedMessages[idx],
          text: newText.trimStart(),
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
   * Append a single complete user or assistant message to the conversation
   */
  addMessage(msg: Partial<ConversationMessage> & { role: 'user' | 'assistant'; text: string }): void {
    const fullMsg: ConversationMessage = {
      id: generateId(),
      role: msg.role,
      text: msg.text,
      timestamp: msg.timestamp || Date.now(),
      source: msg.source || 'text',
      isStreaming: false,
    };
    this.state = {
      ...this.state,
      messages: [...this.state.messages, fullMsg],
    };
    this.notify();
    MemoryManager.getInstance().saveMessage(fullMsg).catch(() => {});
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
      lastAudioError: null,
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
      glowLevel: this.state.glowLevel,
      stopListeningWhileSpeaking: this.state.stopListeningWhileSpeaking,
      isMicMuted: false,
      followUpSuggestions: this.state.followUpSuggestions,
      timeDiagnostics: this.state.timeDiagnostics,
      glowDiagnostics: this.state.glowDiagnostics,
    };
    this.notify();
  }

  setGlowLevel(level: GlowLevel): void {
    if (this.state.glowLevel !== level) {
      this.state = {
        ...this.state,
        glowLevel: level,
      };
      this.notify();
    }
  }

  setStopListeningWhileSpeaking(enabled: boolean): void {
    if (this.state.stopListeningWhileSpeaking !== enabled) {
      this.state = {
        ...this.state,
        stopListeningWhileSpeaking: enabled,
      };
      this.notify();
    }
  }

  toggleStopListeningWhileSpeaking(): boolean {
    const nextVal = !this.state.stopListeningWhileSpeaking;
    this.setStopListeningWhileSpeaking(nextVal);
    return nextVal;
  }

  setFollowUpSuggestions(suggestions: string[]): void {
    if (suggestions && suggestions.length > 0) {
      this.state = {
        ...this.state,
        followUpSuggestions: suggestions,
      };
      this.notify();
    }
  }

  setMicMuted(muted: boolean): void {
    if (this.state.isMicMuted !== muted) {
      this.state = {
        ...this.state,
        isMicMuted: muted,
        micVolume: muted ? 0 : this.state.micVolume,
      };
      this.notify();
    }
  }

  toggleMicMuted(): boolean {
    const nextVal = !this.state.isMicMuted;
    this.setMicMuted(nextVal);
    return nextVal;
  }

  recordTimeDiagnostics(patch: Partial<TimeDiagnostics>): void {
    this.state = {
      ...this.state,
      timeDiagnostics: {
        ...this.state.timeDiagnostics,
        ...patch,
        updatedAt: Date.now(),
      },
    };
    this.notify();
  }

  updateGlowDiagnostics(patch: Partial<GlowDiagnostics>): void {
    const next: GlowDiagnostics = {
      ...this.state.glowDiagnostics,
      ...patch,
    };
    const curr = this.state.glowDiagnostics;
    if (
      curr.activePreset === next.activePreset &&
      curr.masterGlow === next.masterGlow &&
      curr.eyeGlow === next.eyeGlow &&
      curr.electricGlow === next.electricGlow &&
      curr.bloom === next.bloom &&
      curr.fog === next.fog &&
      curr.particles === next.particles &&
      curr.rendererStatus === next.rendererStatus &&
      curr.lastSyncError === next.lastSyncError
    ) {
      return;
    }
    this.state = {
      ...this.state,
      glowDiagnostics: next,
    };
    this.notify();
  }
}

