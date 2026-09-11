/**
 * useLiveSession - Custom React hook for ARAVAN Live Session lifecycle
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { StateManager, ARAVANState } from '../state/StateManager';
import { LiveSession } from '../live/LiveSession';
import { InteractionMode } from '../types';

export function useLiveSession() {
  const stateManagerRef = useRef<StateManager | null>(null);
  const liveSessionRef = useRef<LiveSession | null>(null);

  if (!stateManagerRef.current) {
    stateManagerRef.current = new StateManager();
  }
  if (!liveSessionRef.current) {
    liveSessionRef.current = new LiveSession(stateManagerRef.current);
  }

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

  const connect = useCallback(async () => {
    if (liveSessionRef.current) {
      stateManagerRef.current?.clearError();
      await liveSessionRef.current.connect();
    }
  }, []);

  const disconnect = useCallback(() => {
    if (liveSessionRef.current) {
      liveSessionRef.current.disconnect();
    }
  }, []);

  const toggleConnection = useCallback(async () => {
    if (state.voiceState === 'disconnected' || state.voiceState === 'error') {
      await connect();
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

  return {
    state,
    voiceState: state.voiceState,
    interactionMode: state.interactionMode,
    micVolume: state.micVolume,
    speakerVolume: state.speakerVolume,
    errorMessage: state.errorMessage,
    activeTool: state.activeTool,
    lastTranscription: state.lastTranscription,
    lastLiveEvent: state.lastLiveEvent,
    activeAssistantMessageId: state.activeAssistantMessageId,
    messages: state.messages,
    stats: state.stats,
    audioContextState: liveSessionRef.current?.audioContextState ?? 'uninitialized',
    isMicActive: liveSessionRef.current?.isMicActive ?? false,
    audioQueueSize: liveSessionRef.current?.audioQueueSize ?? 0,
    connect,
    disconnect,
    toggleConnection,
    interrupt,
    sendTextMessage,
    setInteractionMode,
    clearMessages,
  };
}
