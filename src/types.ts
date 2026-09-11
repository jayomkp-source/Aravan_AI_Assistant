/**
 * ARAVAN Type Definitions
 */

export type VoiceState = 'disconnected' | 'connecting' | 'listening' | 'speaking' | 'error';
export type MessageRole = 'user' | 'assistant';
export type InteractionMode = 'voice-text' | 'voice-only';

export interface ConversationMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: number;
  source: 'voice' | 'text';
  isStreaming?: boolean;
}

export interface ToolCallPayload {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ToolResponsePayload {
  id: string;
  name: string;
  response: Record<string, unknown>;
}

export interface LiveClientMessage {
  type: 'audio' | 'text' | 'tool_response' | 'interrupt' | 'ping' | 'init' | 'context_update';
  audio?: string; // base64 PCM16 16kHz
  text?: string;  // typed text sent through Live session
  context?: string; // retrieved memory context
  toolResponse?: ToolResponsePayload;
}

export interface LiveServerMessage {
  type: 'connected' | 'audio' | 'interrupted' | 'tool_call' | 'transcription' | 'error' | 'turn_complete';
  audio?: string; // base64 PCM 24kHz
  text?: string;
  sender?: 'user' | 'model';
  finished?: boolean;
  isStreaming?: boolean;
  toolCall?: ToolCallPayload;
  error?: {
    code: string;
    message: string;
  };
}

export interface AudioVisualizerLevels {
  micLevel: number;      // 0 to 1
  speakerLevel: number;  // 0 to 1
  frequencyData: number[]; // normalized 0 to 1 array
}

export interface SessionStats {
  connectedSince: number | null;
  packetsReceived: number;
  packetsSent: number;
  interruptionsCount: number;
  activeVoice: string;
  pipeline: string;
}
