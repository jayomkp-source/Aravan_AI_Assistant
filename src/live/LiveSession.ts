/**
 * LiveSession - Real-Time Gemini Live Audio-to-Audio Session Coordinator
 *
 * STRICT COMPLIANCE:
 * - Direct connection with Gemini Live API using configured male voice (ARAVAN_VOICE = "Charon").
 * - Zero fallback browser TTS voices.
 * - Instant barge-in audio clearing and synchronized text + audio state.
 */

import { ARAVAN_VOICE, validateVoiceConfig, logVoiceSafetyCheck } from '../config/voice';
import { AudioStreamer } from '../audio/AudioStreamer';
import { AudioPlayer } from '../audio/AudioPlayer';
import { SpeechRecognitionListener } from '../audio/SpeechRecognitionListener';
import { ToolManager } from '../tools/ToolManager';
import { StateManager } from '../state/StateManager';
import { LiveClientMessage, LiveServerMessage } from '../types';
import { MemoryManager } from '../memory/MemoryManager';
import { AudioReactiveCore } from '../audio/AudioReactiveCore';

function looksLikeTimeQuery(text: string): boolean {
  const p = text.toLowerCase();
  return (
    /\b(time|clock|date|day|today|month|year|timezone|baje|samay|waqt|tarikh)\b/i.test(p) ||
    p.includes('kitne baje') ||
    p.includes('kitna time')
  );
}

export class LiveSession {
  private ws: WebSocket | null = null;
  private audioStreamer: AudioStreamer;
  private audioPlayer: AudioPlayer;
  private speechListener: SpeechRecognitionListener;
  private toolManager: ToolManager;
  private stateManager: StateManager;
  private isConnecting = false;
  private isConnected = false;
  private connectPromise: Promise<void> | null = null;
  private connectedWaiters: Array<() => void> = [];
  private connectionRejectWaiters: Array<(err: Error) => void> = [];
  private lastSessionError: string | null = null;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
    this.audioStreamer = new AudioStreamer();
    this.audioPlayer = new AudioPlayer();
    this.speechListener = new SpeechRecognitionListener();
    this.toolManager = new ToolManager(stateManager);

    // Hook audio player state changes:
    // SPEAKING represents ACTUAL audio playback (never just arriving text).
    this.audioPlayer.setCallbacks(
      (isPlaying) => {
        AudioReactiveCore.getInstance().setSpeakingState(isPlaying);
        this.speechListener.setSpeaking(isPlaying);
        if (isPlaying) {
          this.stateManager.setVoiceState('speaking');
        } else if (this.isConnected) {
          this.stateManager.setVoiceState('listening');
        } else if (this.stateManager.getState().voiceState === 'speaking') {
          this.stateManager.setVoiceState('disconnected');
        }
      },
      (volume) => {
        const currentMicVol = this.stateManager.getState().micVolume;
        this.stateManager.setVolumes(currentMicVol, volume);
      },
      (audioErr) => {
        this.stateManager.setAudioError(audioErr);
      }
    );

    // Register strict Gemini Charon TTS handler for Screen Vision narration / Test Speech
    AudioReactiveCore.getInstance().registerCharonSpeechHandler(
      async (text, onStart, onEnd) => {
        try {
          await this.audioPlayer.initialize();
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
          });
          const data = await res.json();
          if (!res.ok || !data.success || !data.audio) {
            throw new Error(data?.error || 'Charon TTS endpoint unavailable.');
          }
          this.stateManager.setAudioError(null);
          onStart?.();
          await this.audioPlayer.playPCMChunk(data.audio);
          await this.audioPlayer.waitForDrain();
          onEnd?.();
        } catch (err: any) {
          const msg = err?.message || 'Charon TTS playback failed.';
          console.warn('[ARAVAN] Charon TTS error:', msg);
          this.stateManager.setAudioError(msg);
          AudioReactiveCore.getInstance().setLastAudioError(msg);
          onEnd?.();
        }
      },
      () => {
        this.audioPlayer.interrupt();
      }
    );

    // Hook tool execution events
    this.toolManager.setCallback((name, args) => {
      this.stateManager.setActiveTool({ name, args, status: 'running' });
      setTimeout(() => {
        this.stateManager.setActiveTool({ name, args, status: 'done' });
        setTimeout(() => this.stateManager.setActiveTool(null), 3000);
      }, 900);
    });
  }

  /**
   * Unlocks / resumes Web Audio output on a user gesture without creating duplicate contexts.
   */
  async unlockAudio(): Promise<void> {
    try {
      await this.audioPlayer.initialize();
    } catch {
      // Ignore autoplay restriction errors prior to gesture
    }
  }

  private resolveConnectedWaiters(): void {
    this.connectionRejectWaiters = [];
    while (this.connectedWaiters.length > 0) {
      const resolve = this.connectedWaiters.shift();
      resolve?.();
    }
  }

  private rejectConnectedWaiters(err: Error): void {
    this.connectedWaiters = [];
    while (this.connectionRejectWaiters.length > 0) {
      const reject = this.connectionRejectWaiters.shift();
      reject?.(err);
    }
  }

  private waitForConnected(timeoutMs = 8000): Promise<void> {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.connectedWaiters.indexOf(onReady);
        if (idx !== -1) this.connectedWaiters.splice(idx, 1);
        const rIdx = this.connectionRejectWaiters.indexOf(onReject);
        if (rIdx !== -1) this.connectionRejectWaiters.splice(rIdx, 1);
        reject(new Error('Timed out waiting for Gemini Live session confirmation.'));
      }, timeoutMs);

      const onReady = () => {
        clearTimeout(timer);
        resolve();
      };
      const onReject = (err: Error) => {
        clearTimeout(timer);
        reject(err);
      };
      this.connectedWaiters.push(onReady);
      this.connectionRejectWaiters.push(onReject);
    });
  }

  /**
   * Start 16kHz microphone capture and attach to the active Live session
   */
  async startMicrophone(): Promise<void> {
    if (this.audioStreamer.isStreamingActive) return;

    try {
      await this.audioPlayer.initialize();
      await this.audioStreamer.start(
        (pcm16Base64) => {
          const isSpeaking =
            this.audioPlayer.currentlyPlaying ||
            AudioReactiveCore.getInstance().getIsSpeaking() ||
            this.stateManager.getState().voiceState === 'speaking';
          const stopWhileSpeaking = this.stateManager.getState().stopListeningWhileSpeaking;

          // Echo-shield: skip sending mic audio while ARAVAN is speaking
          if (stopWhileSpeaking && isSpeaking) {
            return;
          }

          if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
            const msg: LiveClientMessage = {
              type: 'audio',
              audio: pcm16Base64,
            };
            this.ws.send(JSON.stringify(msg));
            this.stateManager.incrementPacketsSent();
          }
        },
        (micVolume) => {
          const isSpeaking =
            this.audioPlayer.currentlyPlaying ||
            AudioReactiveCore.getInstance().getIsSpeaking() ||
            this.stateManager.getState().voiceState === 'speaking';
          const stopWhileSpeaking = this.stateManager.getState().stopListeningWhileSpeaking;

          const effectiveMicVol = stopWhileSpeaking && isSpeaking ? 0 : micVolume;
          const currentSpeakerVol = this.stateManager.getState().speakerVolume;
          this.stateManager.setVolumes(effectiveMicVol, currentSpeakerVol);

          // Barge-in if user intentionally kept mic active during speech
          if (!stopWhileSpeaking && micVolume > 0.45 && this.audioPlayer.currentlyPlaying) {
            this.audioPlayer.interrupt();
            this.stateManager.incrementInterruptions();
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              this.ws.send(JSON.stringify({ type: 'interrupt' }));
            }
          }
        }
      );
      this.stateManager.setMicMuted(this.audioStreamer.muted);
    } catch (micErr: any) {
      const errMsg = micErr?.message || 'Microphone access unavailable or denied.';
      console.warn('[ARAVAN] Microphone initialization note:', errMsg);
      this.stateManager.setAudioError(errMsg);
    }
  }

  /**
   * Connect to Gemini Live Audio Session
   */
  async connect(options?: { enableMic?: boolean }): Promise<void> {
    const enableMic = options?.enableMic ?? true;

    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (enableMic && !this.audioStreamer.isStreamingActive) {
        await this.startMicrophone();
      }
      return;
    }

    if (this.connectPromise) {
      await this.connectPromise;
      if (enableMic && this.isConnected && !this.audioStreamer.isStreamingActive) {
        await this.startMicrophone();
      }
      return;
    }

    this.connectPromise = this.performConnect(enableMic);
    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  private async performConnect(enableMic: boolean): Promise<void> {
    this.isConnecting = true;
    this.lastSessionError = null;
    this.stateManager.setVoiceState('connecting');

    try {
      validateVoiceConfig();
      if (!ARAVAN_VOICE) {
        throw new Error('ARAVAN voice configuration missing.');
      }
      logVoiceSafetyCheck();

      await this.audioPlayer.initialize();

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const endpoints = [
        `${protocol}//${window.location.host}/api/live`,
        `${protocol}//${window.location.host}/ws/live`,
      ];

      let connectedWs: WebSocket | null = null;
      let lastWsError: Error | null = null;

      for (const endpoint of endpoints) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            connectedWs = await new Promise<WebSocket>((resolve, reject) => {
              const ws = new WebSocket(endpoint);
              let settled = false;

              const timer = setTimeout(() => {
                if (!settled) {
                  settled = true;
                  try { ws.close(); } catch {}
                  reject(new Error(`Timeout connecting to ${endpoint}`));
                }
              }, 7000);

              ws.onopen = () => {
                if (!settled) {
                  settled = true;
                  clearTimeout(timer);
                  resolve(ws);
                }
              };

              ws.onerror = () => {
                if (!settled) {
                  settled = true;
                  clearTimeout(timer);
                  reject(new Error(`Failed connection to ${endpoint}`));
                }
              };
            });

            if (connectedWs) break;
          } catch (err: any) {
            lastWsError = err;
            await new Promise((r) => setTimeout(r, 350));
          }
        }
        if (connectedWs) break;
      }

      if (!connectedWs) {
        throw new Error(lastWsError?.message || 'Failed to connect to ARAVAN Live Server.');
      }

      this.ws = connectedWs;

      const connectedReadyPromise = this.waitForConnected(8000);

      this.ws.onmessage = async (event) => {
        try {
          const message: LiveServerMessage = JSON.parse(event.data);
          this.stateManager.recordLiveEvent(message.type);

          if (message.type === 'connected') {
            this.isConnected = true;
            this.isConnecting = false;
            this.stateManager.setAudioError(null);
            this.stateManager.setVoiceState(this.audioPlayer.currentlyPlaying ? 'speaking' : 'listening');
            this.resolveConnectedWaiters();

            // Send initial memory context cleanly to server session
            MemoryManager.getInstance()
              .getRelevantContext('user identity preferences profile')
              .then((context) => {
                if (context && this.ws && this.ws.readyState === WebSocket.OPEN) {
                  this.ws.send(JSON.stringify({ type: 'init', context }));
                }
              })
              .catch(() => {});
          } else if (message.type === 'reconnecting') {
            this.stateManager.setVoiceState('connecting');
          } else if (message.type === 'audio' && message.audio) {
            this.stateManager.incrementPacketsReceived();
            await this.audioPlayer.playPCMChunk(message.audio);
          } else if (message.type === 'transcription' && message.text) {
            if (message.sender === 'user') {
              if (looksLikeTimeQuery(message.text)) {
                this.stateManager.recordTimeDiagnostics({
                  lastQuery: message.text.trim(),
                  recognizedIntent: 'semantic_time_query_voice',
                });
              }
              this.stateManager.updateUserSpokenText(
                message.text,
                message.finished ?? false,
                message.isDelta ?? false
              );
            } else {
              this.stateManager.appendAssistantText(message.text, message.finished ?? false);
            }
          } else if (message.type === 'turn_complete') {
            this.stateManager.finalizeStreamingMessages();
          } else if (message.type === 'interrupted') {
            this.audioPlayer.interrupt();
            this.stateManager.incrementInterruptions();
            this.stateManager.finalizeStreamingMessages();
            this.stateManager.setVoiceState('listening');
          } else if (message.type === 'tool_call' && message.toolCall) {
            const toolResponse = await this.toolManager.executeTool(message.toolCall);
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              const resMsg: LiveClientMessage = {
                type: 'tool_response',
                toolResponse,
              };
              this.ws.send(JSON.stringify(resMsg));
            }
          } else if (message.type === 'error') {
            const serverErrMsg = message.error?.message || 'Live API session encountered an error.';
            console.error('[ARAVAN Server Error]', message.error);
            if (message.error?.code === 'LIVE_INTERNAL_ERROR') {
              this.stateManager.setAudioError(serverErrMsg);
              this.stateManager.setVoiceState('listening');
            } else {
              this.lastSessionError = serverErrMsg;
              this.rejectConnectedWaiters(new Error(serverErrMsg));
              this.handleError(serverErrMsg);
            }
          }
        } catch (parseErr) {
          console.error('[ARAVAN] Error parsing Live message:', parseErr);
        }
      };

      this.ws.onclose = (evt) => {
        console.warn('[ARAVAN] WebSocket closed:', evt.code, evt.reason);
        const reasonErr =
          this.lastSessionError ||
          evt.reason ||
          (evt.code !== 1000 ? `Connection closed (code ${evt.code}). Tap to reconnect.` : 'Disconnected');
        if (this.isConnecting) {
          this.rejectConnectedWaiters(new Error(reasonErr));
        }
        if (this.isConnected || this.isConnecting) {
          this.disconnect();
          if (evt.code !== 1000) {
            this.stateManager.setError(reasonErr);
          }
        }
      };

      await connectedReadyPromise;

      if (enableMic) {
        await this.startMicrophone();
      }
    } catch (err) {
      const msg =
        (err as Error)?.message || "ARAVAN's voice couldn't be initialized. Please reconnect.";
      console.error('[ARAVAN] Connection error:', msg);
      this.handleError(msg);
      throw err;
    }
  }

  private handleError(errorMsg: string): void {
    this.disconnect();
    this.stateManager.setError(errorMsg);
  }

  /**
   * Send a typed message into the shared Gemini Live session (replies in text + Charon audio).
   */
  async sendTextMessage(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return;

    await this.unlockAudio();

    if (looksLikeTimeQuery(trimmed)) {
      this.stateManager.recordTimeDiagnostics({
        lastQuery: trimmed,
        recognizedIntent: 'semantic_time_query_text',
      });
    }

    if (this.audioPlayer.currentlyPlaying) {
      this.audioPlayer.interrupt();
      this.stateManager.incrementInterruptions();
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'interrupt' }));
      }
    }

    this.stateManager.addUserTextMessage(trimmed);

    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      try {
        await this.connect({ enableMic: false });
      } catch (connErr: any) {
        const msg = connErr?.message || 'Gemini Live connection unavailable.';
        console.warn('[ARAVAN] Live connection unavailable for message:', msg);
        this.stateManager.addMessage({
          role: 'assistant',
          text: `Voice session error: ${msg}`,
          source: 'text',
        });
        return;
      }
    }

    let context: string | undefined;
    try {
      context = await MemoryManager.getInstance().getRelevantContext(trimmed);
    } catch {
      // ignore
    }

    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      const msg: LiveClientMessage = {
        type: 'text',
        text: trimmed,
        context: context || undefined,
      };
      this.ws.send(JSON.stringify(msg));
      this.stateManager.incrementPacketsSent();
    } else {
      const errMsg = this.lastSessionError || 'Gemini Live session is not connected.';
      this.stateManager.setError(errMsg);
      this.stateManager.addMessage({
        role: 'assistant',
        text: `Voice session error: ${errMsg}`,
        source: 'text',
      });
    }
  }

  interrupt(): void {
    this.audioPlayer.interrupt();
    this.stateManager.incrementInterruptions();
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'interrupt' }));
    }
  }

  disconnect(): void {
    this.isConnected = false;
    this.isConnecting = false;
    this.connectPromise = null;
    this.connectedWaiters = [];
    this.connectionRejectWaiters = [];

    this.audioStreamer.stop();
    this.audioPlayer.stop();
    this.speechListener.stop();

    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close(1000, 'User disconnected');
        }
      } catch {
        // ignore
      }
      this.ws = null;
    }

    this.stateManager.setVoiceState('disconnected');
  }

  get connected(): boolean {
    return this.isConnected;
  }

  setOnThemeChange(cb: (themeId: string) => void): void {
    this.toolManager.setOnThemeChange(cb);
  }

  get connecting(): boolean {
    return this.isConnecting;
  }

  get audioContextState(): string {
    return this.audioPlayer.state;
  }

  get isPlaying(): boolean {
    return this.audioPlayer.currentlyPlaying;
  }

  get isMicActive(): boolean {
    return this.audioStreamer.active;
  }

  get isMicMuted(): boolean {
    return this.audioStreamer.muted;
  }

  getAudioAnalyserNode(): AnalyserNode | null {
    return this.audioPlayer.getAnalyserNode();
  }

  toggleMicMute(): boolean {
    if (this.isConnected && !this.audioStreamer.isStreamingActive) {
      this.startMicrophone();
      return false;
    }
    const isMuted = this.audioStreamer.toggleMute();
    this.stateManager.setMicMuted(isMuted);
    if (isMuted) {
      this.speechListener.pause();
    } else {
      this.speechListener.resume();
    }
    return isMuted;
  }

  setMicMuted(muted: boolean): void {
    this.audioStreamer.setMuted(muted);
    this.stateManager.setMicMuted(muted);
    if (muted) {
      this.speechListener.pause();
    } else {
      this.speechListener.resume();
    }
  }

  get audioQueueSize(): number {
    return this.audioPlayer.queueLength;
  }
}
