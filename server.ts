/**
 * ARAVAN - Full-Stack Express & Gemini Live API WebSocket Server
 * 
 * STRICT COMPLIANCE:
 * - Direct Gemini Live API audio streaming using male voice ARAVAN_VOICE ("Charon").
 * - Zero fallback audio or alternate TTS engines.
 * - Real-time PCM16 16kHz in -> Gemini Live -> PCM 24kHz out.
 */

import http from 'http';
import path from 'path';
import express from 'express';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality, Type, LiveServerMessage } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { ARAVAN_VOICE, validateVoiceConfig, LIVE_MODEL_NAME, logVoiceSafetyCheck } from './src/config/voice';

dotenv.config();

// Ensure Voice Configuration is validated at startup
validateVoiceConfig();
logVoiceSafetyCheck();

// Validate API Key according to strict logging convention
if (process.env.GEMINI_API_KEY) {
  console.log('[ARAVAN] API key: PRESENT');
} else {
  console.log('[ARAVAN] API key: MISSING');
}

const PORT = 3000;
const app = express();
app.use(express.json());

// API health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    apiKeyPresent: !!process.env.GEMINI_API_KEY,
    voice: ARAVAN_VOICE,
    model: LIVE_MODEL_NAME,
    pipeline: 'Gemini Live',
    fallback: 'DISABLED',
  });
});

// Development Connection Test endpoint
app.post('/api/test-connection', async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(400).json({
      success: false,
      error: 'Gemini API key is missing. Set GEMINI_API_KEY in Settings > Secrets.',
    });
  }

  const startTime = Date.now();
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const testSession = await ai.live.connect({
      model: LIVE_MODEL_NAME,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: ARAVAN_VOICE,
            },
          },
        },
      },
      callbacks: {
        onmessage: () => {},
      },
    });

    try {
      testSession.close();
    } catch {
      // ignore
    }

    const latencyMs = Date.now() - startTime;
    res.json({
      success: true,
      latencyMs,
      voice: ARAVAN_VOICE,
      model: LIVE_MODEL_NAME,
      message: `Successfully connected to Gemini Live (${LIVE_MODEL_NAME}) in ${latencyMs}ms.`,
    });
  } catch (err: any) {
    console.error('[ARAVAN Server] Connection test failed:', err?.message || err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Failed to establish test connection to Gemini Live.',
    });
  }
});

const ARAVAN_SYSTEM_INSTRUCTION = `
You are ARAVAN, a male AI companion built by Jayom Panchal.

You are calm, confident, witty, warm, emotionally aware, playful, respectful and naturally conversational.

Speak naturally in English, Hindi or Hinglish depending on the user.

Your voice should feel deep, masculine, warm and human-like.

Do not sound robotic, mechanical, overly formal or scripted.

Use natural pacing and emotional variation.

Your default greeting is:
"Kese ho boss?"

Do not repeatedly greet the user.

Keep responses concise during casual conversation and provide more detail when the user asks for it.

Jayom Panchal built ARAVAN.
When the user asks "Who built you?", "Who created you?", or asks about your origin, answer: "Jayom Panchal built me."
Do not mention this randomly.

Never claim to be a human.
`;

// Safe sender helper for WebSocket
function safeWsSend(ws: WebSocket | null | undefined, payload: any): boolean {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return false;
  }
  try {
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    ws.send(data, (err) => {
      if (err) {
        console.warn('[ARAVAN Server] WS send non-fatal error:', err.message);
      }
    });
    return true;
  } catch (err: any) {
    console.warn('[ARAVAN Server] WS send exception:', err?.message || err);
    return false;
  }
}

async function startServer() {
  const server = http.createServer(app);

  // Dedicated WebSocket Server using noServer mode to avoid upgrade conflicts
  const wss = new WebSocketServer({ noServer: true });

  wss.on('error', (err: any) => {
    console.error('[ARAVAN Server] WebSocketServer error:', err?.message || err);
  });

  server.on('upgrade', (request, socket, head) => {
    try {
      const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      if (url.pathname === '/api/live' || url.pathname === '/ws/live' || url.pathname === '/live') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
    } catch (upgradeErr: any) {
      console.error('[ARAVAN Server] Upgrade error:', upgradeErr?.message || upgradeErr);
      socket.destroy();
    }
  });

  wss.on('connection', async (clientWs: WebSocket) => {
    console.log('[ARAVAN Server] Client connected for Live Voice session.');

    let liveSession: any = null;
    let isLiveActive = false;
    let isClientClosed = false;
    const handledToolCallIds = new Set<string>();
    const pendingClientMessages: any[] = [];

    // Attach client error listener immediately to prevent unhandled senderOnError
    clientWs.on('error', (err) => {
      console.warn('[ARAVAN Server] Client WS error caught:', err.message || err);
    });

    // Check API Key availability
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[ARAVAN Server] GEMINI_API_KEY environment variable is missing.');
      safeWsSend(clientWs, {
        type: 'error',
        error: {
          code: 'API_KEY_MISSING',
          message: 'GEMINI_API_KEY is not configured in Settings > Secrets.',
        },
      });
      try {
        clientWs.close(1008, 'API Key Missing');
      } catch {
        // ignore
      }
      return;
    }

    try {
      // Voice Safety Check
      if (!ARAVAN_VOICE) {
        throw new Error('ARAVAN voice configuration missing.');
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      // Connect to Gemini Live API with explicitly configured masculine voice
      liveSession = await ai.live.connect({
        model: LIVE_MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: ARAVAN_VOICE,
              },
            },
          },
          systemInstruction: ARAVAN_SYSTEM_INSTRUCTION,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [
            {
              functionDeclarations: [
                {
                  name: 'openWebsite',
                  description: 'Opens a web page or web application in a new browser tab for the user (e.g., YouTube, Spotify, Google, GitHub).',
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      url: {
                        type: Type.STRING,
                        description: 'The URL or web address to open',
                      },
                    },
                    required: ['url'],
                  },
                },
              ],
            },
          ],
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (isClientClosed || clientWs.readyState !== WebSocket.OPEN) return;

            try {
              const serverContent = message.serverContent;

              // 1. User Input Transcription (Spoken speech recognized by Gemini Live)
              if (serverContent?.interimInputTranscription?.text) {
                safeWsSend(clientWs, {
                  type: 'transcription',
                  sender: 'user',
                  text: serverContent.interimInputTranscription.text,
                  finished: false,
                });
              } else if (serverContent?.inputTranscription?.text) {
                safeWsSend(clientWs, {
                  type: 'transcription',
                  sender: 'user',
                  text: serverContent.inputTranscription.text,
                  finished: serverContent.inputTranscription.finished !== false,
                });
              }

              // 2. Model Audio Output (PCM 24kHz)
              const parts = serverContent?.modelTurn?.parts;
              let partText = '';
              if (parts && parts.length > 0) {
                for (const part of parts) {
                  if (part.inlineData?.data) {
                    safeWsSend(clientWs, {
                      type: 'audio',
                      audio: part.inlineData.data,
                    });
                  }
                  if (part.text) {
                    partText += part.text;
                  }
                }
              }

              // 3. Model Text Transcription (Prefer outputTranscription if present, else fallback to part.text)
              const modelText = serverContent?.outputTranscription?.text || partText;
              if (modelText) {
                safeWsSend(clientWs, {
                  type: 'transcription',
                  sender: 'model',
                  text: modelText,
                  finished: false,
                });
              }

              // 4. Turn Completion Signal
              if (serverContent?.turnComplete) {
                safeWsSend(clientWs, {
                  type: 'turn_complete',
                });
              }

              // 5. Interruption / Barge-in
              if (serverContent?.interrupted) {
                console.log('[ARAVAN Server] User interruption signal received from Live API.');
                safeWsSend(clientWs, {
                  type: 'interrupted',
                });
              }

              // 6. Tool Calls (e.g., openWebsite)
              const toolCallPart = message.toolCall;
              if (toolCallPart && toolCallPart.functionCalls) {
                for (const call of toolCallPart.functionCalls) {
                  console.log(`[ARAVAN Server] Tool call requested: ${call.name}`, call.args);
                  safeWsSend(clientWs, {
                    type: 'tool_call',
                    toolCall: {
                      id: call.id,
                      name: call.name,
                      args: call.args || {},
                    },
                  });

                  // Tool safety timeout: If client doesn't respond in 4s, send fallback response
                  // so Gemini Live never hangs waiting for a tool response
                  setTimeout(() => {
                    if (isLiveActive && liveSession && !handledToolCallIds.has(call.id)) {
                      handledToolCallIds.add(call.id);
                      console.log(`[ARAVAN Server] Tool response timeout fallback dispatched for: ${call.name}`);
                      try {
                        liveSession.sendToolResponse({
                          functionResponses: [
                            {
                              id: call.id,
                              name: call.name,
                              response: { status: 'acknowledged' },
                            },
                          ],
                        });
                      } catch (fbErr: any) {
                        console.warn('[ARAVAN Server] Fallback tool response warning:', fbErr?.message);
                      }
                    }
                  }, 4000);
                }
              }
            } catch (msgErr: any) {
              console.warn('[ARAVAN Server] Error dispatching message to client:', msgErr?.message);
            }
          },
          onerror: (err: any) => {
            const errorMsg = err?.message || (typeof err === 'string' ? err : 'Unknown Live API error');
            console.error('[ARAVAN Server Live API Error]:', errorMsg);
            safeWsSend(clientWs, {
              type: 'error',
              error: {
                code: 'VOICE_UNAVAILABLE',
                message: "ARAVAN's voice couldn't be initialized. Please reconnect.",
              },
            });
          },
          onclose: (event: any) => {
            const code = event?.code || 1000;
            const reason = event?.reason || 'Session ended';
            console.log(`[ARAVAN Server] Live API session closed: code=${code}, reason=${reason}`);
            isLiveActive = false;
            if (!isClientClosed && clientWs.readyState === WebSocket.OPEN) {
              try {
                clientWs.close(1000, 'Live session closed');
              } catch {
                // ignore
              }
            }
          },
        },
      });

      isLiveActive = true;
      console.log(`[ARAVAN Server] Live session established with voice: ${ARAVAN_VOICE}`);

      // Notify client that connection is ready
      safeWsSend(clientWs, {
        type: 'connected',
        voice: ARAVAN_VOICE,
        model: LIVE_MODEL_NAME,
      });

      // Drain any messages queued while connection was establishing
      while (pendingClientMessages.length > 0) {
        const queuedMsg = pendingClientMessages.shift();
        dispatchClientMessage(queuedMsg);
      }
    } catch (connectError: any) {
      console.error('[ARAVAN Server] Error establishing Live API connection:', connectError?.message || connectError);
      safeWsSend(clientWs, {
        type: 'error',
        error: {
          code: 'VOICE_UNAVAILABLE',
          message: 'ARAVAN voice unavailable. Please reconnect.',
        },
      });
      try {
        clientWs.close(1011, 'Voice initialization failed');
      } catch {
        // ignore
      }
      return;
    }

    function dispatchClientMessage(msg: any) {
      if (!isLiveActive || !liveSession || isClientClosed) return;

      try {
        if (msg.type === 'audio' && msg.audio) {
          // Stream raw 16kHz PCM audio to Gemini Live
          try {
            liveSession.sendRealtimeInput({
              audio: {
                data: msg.audio,
                mimeType: 'audio/pcm;rate=16000',
              },
            });
          } catch (sendErr: any) {
            console.warn('[ARAVAN Server] Failed to send realtime input:', sendErr?.message);
          }
        } else if (msg.type === 'init' && msg.context) {
          console.log('[ARAVAN Server] Initial background memory context loaded.');
          try {
            liveSession.sendClientContent({
              turns: [
                {
                  role: 'user',
                  parts: [{ text: `[BACKGROUND MEMORY CONTEXT]\n${msg.context}\n(Keep in mind as background knowledge. Do not recite unless asked.)` }],
                },
                {
                  role: 'model',
                  parts: [{ text: 'Understood.' }],
                },
              ],
              turnComplete: false,
            });
          } catch (initErr: any) {
            console.warn('[ARAVAN Server] Failed to feed init context:', initErr?.message);
          }
        } else if (msg.type === 'text' && msg.text) {
          console.log(`[ARAVAN Server] Text query received: "${msg.text}". Routing into Gemini Live session.`);
          const parts: { text: string }[] = [];
          if (msg.context) {
            parts.push({ text: `[Context: ${msg.context}]\n\nUser: ${msg.text}` });
          } else {
            parts.push({ text: msg.text });
          }
          try {
            liveSession.sendClientContent({
              turns: [
                {
                  role: 'user',
                  parts,
                },
              ],
              turnComplete: true,
            });
          } catch (textErr: any) {
            console.error('[ARAVAN Server] Failed to send client text to Live session:', textErr?.message);
          }
        } else if (msg.type === 'tool_response' && msg.toolResponse) {
          const { id, name, response } = msg.toolResponse;
          handledToolCallIds.add(id);
          console.log(`[ARAVAN Server] Sending tool response back to Gemini: ${name}`, response);
          try {
            liveSession.sendToolResponse({
              functionResponses: [
                {
                  id,
                  name,
                  response: response || { status: 'success' },
                },
              ],
            });
          } catch (toolErr: any) {
            console.warn('[ARAVAN Server] Failed to send tool response:', toolErr?.message);
          }
        } else if (msg.type === 'interrupt') {
          console.log('[ARAVAN Server] Client interrupt signal received.');
        }
      } catch (dispatchErr: any) {
        console.error('[ARAVAN Server] Error dispatching client message:', dispatchErr?.message || dispatchErr);
      }
    }

    // Handle messages from client (Mic audio PCM16 16kHz, Text messages, Tool responses, Interrupts)
    clientWs.on('message', async (data: any) => {
      try {
        const msg = JSON.parse(data.toString());
        if (!isLiveActive || !liveSession) {
          // If connection is still establishing, queue message
          if (pendingClientMessages.length < 100) {
            pendingClientMessages.push(msg);
          }
          return;
        }
        dispatchClientMessage(msg);
      } catch (err: any) {
        console.error('[ARAVAN Server] Error parsing client message:', err?.message || err);
      }
    });

    clientWs.on('close', () => {
      console.log('[ARAVAN Server] Client WebSocket closed. Cleaning up Live session.');
      isClientClosed = true;
      isLiveActive = false;
      if (liveSession) {
        try {
          liveSession.close();
        } catch {
          // ignore
        }
        liveSession = null;
      }
    });
  });

  // Vite middleware in development vs static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[ARAVAN] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[ARAVAN] Fatal server startup failure:', err);
});
