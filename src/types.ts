/**
 * ARAVAN Type Definitions
 */

export type VoiceState = 'disconnected' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error';
export type MessageRole = 'user' | 'assistant';
export type InteractionMode = 'voice-text' | 'voice-only';
export type GlowLevel = 'dim' | 'normal' | 'surge' | 'hyper' | 'off';

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
  type: 'connected' | 'audio' | 'interrupted' | 'tool_call' | 'transcription' | 'error' | 'turn_complete' | 'reconnecting';
  audio?: string; // base64 PCM 24kHz
  text?: string;
  sender?: 'user' | 'model';
  finished?: boolean;
  isDelta?: boolean;
  isStreaming?: boolean;
  voice?: string;
  model?: string;
  toolCall?: ToolCallPayload;
  code?: number;
  reason?: string;
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

// ============================================================
// SCREEN SHARING & VISION TYPES (Sections 51-64)
// ============================================================
export type ScreenShareState =
  | 'SCREEN_OFF'
  | 'REQUESTING_PERMISSION'
  | 'SCREEN_ACTIVE'
  | 'SCREEN_STOPPED'
  | 'SCREEN_ERROR';

export type ScreenAnalysisMode = 'auto' | 'read' | 'analyze' | 'explain' | 'debug';

export interface ScreenAnalysisResult {
  text: string;
  mode: ScreenAnalysisMode;
  timestamp: number;
}

// ============================================================
// SKULL CONTROL BOARD & PRESET TYPES (Sections 65-70, 82)
// ============================================================
export type GlowPresetName = 'calm' | 'default' | 'cyber' | 'power' | 'ultra' | 'night' | 'custom';

export interface SkullControlSettings {
  // Master visual sliders (0 to 100%)
  masterGlow: number;
  eyeGlow: number;
  electricGlow: number;
  purpleEnergy: number;
  cyanEnergy: number;
  fog: number;
  particles: number;
  bloom: number;
  talkingGlow: number;

  // Color Balance Mix (0 to 100%)
  colorMix: {
    cyan: number;
    purple: number;
    blue: number;
    magenta: number;
  };

  // Speed and Animation Reactivity (0 to 100%)
  energySpeed: number;
  lightningSpeed: number;
  fogSpeed: number;
  particleSpeed: number;
  talkingReactivity: number;
  cursorFollowStrength: number;

  // Selected Preset
  preset: GlowPresetName;
}

// ============================================================
// RUNTIME DIAGNOSTIC TELEMETRY TYPES
// ============================================================
export interface VoiceDiagnostics {
  configuredVoice: string;
  selectedModel: string;
  sessionStatus: VoiceState;
  micStatus: 'active' | 'muted' | 'standby' | 'denied';
  audioContextState: string;
  incomingAudioChunkCount: number;
  playbackActive: boolean;
  lastAudioError: string | null;
}

export interface TimeDiagnostics {
  lastQuery: string | null;
  recognizedIntent: string | null;
  toolInvoked: string | null;
  executionResult: string | null;
  activeTimeZone: string;
  lastTimeError: string | null;
  updatedAt: number | null;
}

export interface GlowDiagnostics {
  activePreset: GlowPresetName;
  masterGlow: number;
  eyeGlow: number;
  electricGlow: number;
  bloom: number;
  fog: number;
  particles: number;
  rendererStatus: 'initializing' | 'active' | 'fallback' | 'error' | 'disposed';
  lastSyncError: string | null;
}
