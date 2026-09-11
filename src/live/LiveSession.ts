/**
 * LiveSession - Real-Time Gemini Live Audio-to-Audio Session Coordinator
 * 
 * STRICT COMPLIANCE:
 * - Direct connection with Gemini Live API using configured male voice (ARAVAN_VOICE).
 * - Zero fallback voices.
 * - Instant barge-in audio clearing.
 */

import { ARAVAN_VOICE, ARAVAN_VOICE_CONFIG, validateVoiceConfig, logVoiceSafetyCheck } from '../config/voice';
import { AudioStreamer } from '../audio/AudioStreamer';
import { AudioPlayer } from '../audio/AudioPlayer';
import { ToolManager } from '../tools/ToolManager';
import { StateManager } from '../state/StateManager';
import { LiveClientMessage, LiveServerMessage } from '../types';
import { MemoryManager } from '../memory/MemoryManager';

export class LiveSession {
  private ws: WebSocket | null = null;
  private audioStreamer: AudioStreamer;
  private audioPlayer: AudioPlayer;
  private toolManager: ToolManager;
  private stateManager: StateManager;
  private isConnecting = false;
  private isConnected = false;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
    this.audioStreamer = new AudioStreamer();
    this.audioPlayer = new AudioPlayer();
    this.toolManager = new ToolManager();

    // Hook audio player state changes
    this.audioPlayer.setCallbacks(
      (isPlaying) => {
        if (this.isConnected) {
          this.stateManager.setVoiceState(isPlaying ? 'speaking' : 'listening');
        }
      },
      (volume) => {
        const currentMicVol = this.stateManager.getState().micVolume;
        this.stateManager.setVolumes(currentMicVol, volume);
      }
    );

    // Hook tool execution events
    this.toolManager.setCallback((name, args) => {
      this.stateManager.setActiveTool({ name, args, status: 'running' });
      setTimeout(() => {
        this.stateManager.setActiveTool({ name, args, status: 'done' });
        setTimeout(() => this.stateManager.setActiveTool(null), 3000);
      }, 1000);
    });
  }

  /**
   * Connect to Gemini Live Audio Session
   */
  async connect(): Promise<void> {
    if (this.isConnected || this.isConnecting) return;

    this.isConnecting = true;
    this.stateManager.setVoiceState('connecting');

    try {
      // 1. CRITICAL VOICE SAFETY CHECK
      validateVoiceConfig();
      if (!ARAVAN_VOICE) {
        throw new Error("ARAVAN voice configuration missing.");
      }

      // Log voice configuration details in development mode
      logVoiceSafetyCheck();

      // 2. Initialize Audio Player context (user interaction required for AudioContext)
      await this.audioPlayer.initialize();

      // 3. Establish WebSocket connection to backend Live API proxy with resilient multi-endpoint fallback
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

              ws.onerror = (evt) => {
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
            await new Promise((r) => setTimeout(r, 400));
          }
        }
        if (connectedWs) break;
      }

      if (!connectedWs) {
        throw new Error(lastWsError?.message || "Failed to connect to ARAVAN Live Server. Please tap to retry.");
      }

      this.ws = connectedWs;

      // 4. Start Microphone capture at 16kHz PCM
      try {
        await this.audioStreamer.start(
          (pcm16Base64) => {
            // Stream raw 16kHz PCM audio chunk to Live API
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              const msg: LiveClientMessage = {
                type: 'audio',
                audio: pcm16Base64,
              };
              this.ws.send(JSON.stringify(msg));
              this.stateManager.incrementPacketsSent();
            }
          },
          (micVolume) => {
            const currentSpeakerVol = this.stateManager.getState().speakerVolume;
            this.stateManager.setVolumes(micVolume, currentSpeakerVol);

            // Local barge-in: only if user speaks noticeably while audio is playing
            if (micVolume > 0.4 && this.audioPlayer.currentlyPlaying) {
              this.audioPlayer.interrupt();
              this.stateManager.incrementInterruptions();
              if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'interrupt' }));
              }
            }
          }
        );
      } catch (micErr: any) {
        console.warn('[ARAVAN] Microphone initialization note:', micErr?.message || micErr);
        // Do not crash the entire Live session if mic is denied or unavailable; user can still type & receive voice
      }

      // 5. Handle incoming WebSocket messages from Live API
      this.ws.onmessage = async (event) => {
        try {
          const message: LiveServerMessage = JSON.parse(event.data);
          this.stateManager.recordLiveEvent(message.type);

          if (message.type === 'connected') {
            this.isConnected = true;
            this.isConnecting = false;
            this.stateManager.setVoiceState('listening');

            // Feed foundational background memory context on initial connection
            MemoryManager.getInstance().getRelevantContext('who built you creator user preferences ARAVAN')
              .then((ctx) => {
                if (ctx && this.ws && this.ws.readyState === WebSocket.OPEN) {
                  this.ws.send(JSON.stringify({
                    type: 'init',
                    context: ctx,
                  }));
                }
              })
              .catch(() => {});
          } else if (message.type === 'audio' && message.audio) {
            // Receive 24kHz PCM chunk and play via Web Audio
            this.stateManager.incrementPacketsReceived();
            await this.audioPlayer.playPCMChunk(message.audio);
          } else if (message.type === 'transcription' && message.text) {
            if (message.sender === 'user') {
              this.stateManager.updateUserSpokenText(message.text, message.finished ?? false);
            } else {
              this.stateManager.appendAssistantText(message.text, message.finished ?? false);
            }
          } else if (message.type === 'turn_complete') {
            this.stateManager.finalizeStreamingMessages();
          } else if (message.type === 'interrupted') {
            // Server detected user speech or text barge-in
            this.audioPlayer.interrupt();
            this.stateManager.incrementInterruptions();
            this.stateManager.finalizeStreamingMessages();
            this.stateManager.setVoiceState('listening');
          } else if (message.type === 'tool_call' && message.toolCall) {
            // Execute tool and return response back to Gemini Live
            const toolResponse = await this.toolManager.executeTool(message.toolCall);
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              const resMsg: LiveClientMessage = {
                type: 'tool_response',
                toolResponse,
              };
              this.ws.send(JSON.stringify(resMsg));
            }
          } else if (message.type === 'error') {
            console.error('[ARAVAN Server Error]', message.error);
            if (message.error?.code === 'VOICE_UNAVAILABLE' || message.error?.code === 'VOICE_CONFIG_ERROR') {
              this.handleError("ARAVAN voice unavailable. Please reconnect.");
            } else {
              this.handleError(message.error?.message || "Live API session encountered an error.");
            }
          }
        } catch (parseErr) {
          console.error('[ARAVAN] Error parsing Live message:', parseErr);
        }
      };

      this.ws.onclose = (evt) => {
        console.warn('[ARAVAN] WebSocket closed:', evt.code, evt.reason);
        if (this.isConnected || this.isConnecting) {
          this.disconnect();
          if (evt.code !== 1000) {
            this.stateManager.setError("Connection closed. Tap to reconnect.");
          }
        }
      };
    } catch (err) {
      console.error('[ARAVAN] Connection error:', err);
      this.handleError(
        (err as Error)?.message || "ARAVAN's voice couldn't be initialized. Please reconnect."
      );
    }
  }

  private handleError(errorMsg: string): void {
    this.disconnect();
    this.stateManager.setError(errorMsg);
  }

  /**
   * Send a typed message into the shared Gemini Live session
   */
  async sendTextMessage(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return;

    // If assistant is speaking when user sends a text message, interrupt immediately
    if (this.audioPlayer.currentlyPlaying) {
      this.audioPlayer.interrupt();
      this.stateManager.incrementInterruptions();
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'interrupt' }));
      }
    }

    // Record the user's typed message in conversation history
    this.stateManager.addUserTextMessage(trimmed);

    // If not connected yet, automatically initiate live connection
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    // Wait for the Live session to be fully open and connected
    const startWait = Date.now();
    while ((!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) && Date.now() - startWait < 6000) {
      await new Promise((r) => setTimeout(r, 50));
    }

    // Retrieve relevant memories for the text message
    let context: string | undefined;
    try {
      context = await MemoryManager.getInstance().getRelevantContext(trimmed);
    } catch {
      // ignore
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const msg: LiveClientMessage = {
        type: 'text',
        text: trimmed,
        context: context || undefined,
      };
      this.ws.send(JSON.stringify(msg));
      this.stateManager.incrementPacketsSent();
    } else {
      console.error('[ARAVAN] Could not send text message: WebSocket is not open.');
      this.stateManager.setError("Failed to reach ARAVAN. Please tap reconnect.");
    }
  }

  /**
   * Interrupt current speech manually
   */
  interrupt(): void {
    this.audioPlayer.interrupt();
    this.stateManager.incrementInterruptions();
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'interrupt' }));
    }
  }

  /**
   * Gracefully disconnect the Live session
   */
  disconnect(): void {
    this.isConnected = false;
    this.isConnecting = false;

    this.audioStreamer.stop();
    this.audioPlayer.stop();

    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close(1000, "User disconnected");
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

  get audioQueueSize(): number {
    return this.audioPlayer.queueLength;
  }
}
