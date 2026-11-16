/**
 * useLiveSession - Custom React hook for ARAVAN Live Session lifecycle
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { StateManager, ARAVANState } from '../state/StateManager';
import { LiveSession } from '../live/LiveSession';
import { GlowLevel, InteractionMode } from '../types';

export interface UseLiveSessionOptions {
  onThemeChange?: (themeId: string) => void;
}

export function useLiveSession(options?: UseLiveSessionOptions) {
  const stateManagerRef = useRef<StateManager | null>(null);
  const liveSessionRef = useRef<LiveSession | null>(null);

  if (!stateManagerRef.current) {
    stateManagerRef.current = StateManager.getInstance();
  }
  if (!liveSessionRef.current) {
    liveSessionRef.current = new LiveSession(stateManagerRef.current);
  }

  useEffect(() => {
    if (options?.onThemeChange && liveSessionRef.current) {
      liveSessionRef.current.setOnThemeChange(options.onThemeChange);
    }
  }, [options?.onThemeChange]);

  const [state, setState] = useState<ARAVANState>(stateManagerRef.current.getState());

  useEffect(() => {
    const unsubscribe = stateManagerRef.current!.subscribe((newState) => {
      setState({ ...newState });
    });

    return () => {
      unsubscribe();
      if (liveSessionRef.current) {
        liveSessionRef.current.disconnect();
      }
    };
  }, []);

  const connect = useCallback(async (connectOpts?: { enableMic?: boolean }) => {
    if (liveSessionRef.current) {
      stateManagerRef.current?.clearError();
      await liveSessionRef.current.connect({ enableMic: connectOpts?.enableMic ?? true });
    }
  }, []);

  const unlockAudio = useCallback(async () => {
    if (liveSessionRef.current) {
      await liveSessionRef.current.unlockAudio();
    }
  }, []);

  const disconnect = useCallback(() => {
    if (liveSessionRef.current) {
      liveSessionRef.current.disconnect();
    }
  }, []);

  const toggleConnection = useCallback(async () => {
    if (state.voiceState === 'disconnected' || state.voiceState === 'error') {
      await connect({ enableMic: true });
    } else if (
      liveSessionRef.current?.connected &&
      !liveSessionRef.current?.isMicActive &&
      !liveSessionRef.current?.isMicMuted
    ) {
      await liveSessionRef.current.startMicrophone();
    } else {
      disconnect();
    }
  }, [state.voiceState, connect, disconnect]);

  const interrupt = useCallback(() => {
    if (liveSessionRef.current) {
      liveSessionRef.current.interrupt();
    }
  }, []);

  const sendTextMessage = useCallback(async (text: string) => {
    if (liveSessionRef.current) {
      await liveSessionRef.current.sendTextMessage(text);
    }
  }, []);

  const setInteractionMode = useCallback((mode: InteractionMode) => {
    stateManagerRef.current?.setInteractionMode(mode);
  }, []);

  const clearMessages = useCallback(() => {
    stateManagerRef.current?.clearMessages();
  }, []);

  const setGlowLevel = useCallback((level: GlowLevel) => {
    stateManagerRef.current?.setGlowLevel(level);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aravan:glow_level', { detail: { level } }));
    }
  }, []);

  const setStopListeningWhileSpeaking = useCallback((val: boolean) => {
    stateManagerRef.current?.setStopListeningWhileSpeaking(val);
  }, []);

  const toggleStopListeningWhileSpeaking = useCallback(() => {
    return stateManagerRef.current?.toggleStopListeningWhileSpeaking() ?? true;
  }, []);

  return {
    state,
    voiceState: state.voiceState,
    interactionMode: state.interactionMode,
    micVolume: state.micVolume,
    speakerVolume: state.speakerVolume,
    errorMessage: state.errorMessage,
    lastAudioError: state.lastAudioError,
    activeTool: state.activeTool,
    lastTranscription: state.lastTranscription,
    lastLiveEvent: state.lastLiveEvent,
    activeAssistantMessageId: state.activeAssistantMessageId,
    messages: state.messages,
    stats: state.stats,
    glowLevel: state.glowLevel,
    stopListeningWhileSpeaking: state.stopListeningWhileSpeaking,
    followUpSuggestions: state.followUpSuggestions,
    timeDiagnostics: state.timeDiagnostics,
    glowDiagnostics: state.glowDiagnostics,
    audioContextState: liveSessionRef.current?.audioContextState ?? 'uninitialized',
    isMicActive: liveSessionRef.current?.isMicActive ?? false,
    isMicMuted: state.isMicMuted || (liveSessionRef.current?.isMicMuted ?? false),
    audioQueueSize: liveSessionRef.current?.audioQueueSize ?? 0,
    isPlaying: liveSessionRef.current?.isPlaying ?? false,
    getAudioAnalyserNode: () => liveSessionRef.current?.getAudioAnalyserNode() ?? null,
    connect,
    unlockAudio,
    disconnect,
    toggleConnection,
    toggleMicMute: () => liveSessionRef.current?.toggleMicMute() ?? false,
    interrupt,
    sendTextMessage,
    setInteractionMode,
    clearMessages,
    setGlowLevel,
    setStopListeningWhileSpeaking,
    toggleStopListeningWhileSpeaking,
  };
}
