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
import { ARAVAN_VOICE, getLiveSpeechConfig, validateVoiceConfig, LIVE_MODEL_NAME, logVoiceSafetyCheck } from './src/config/voice';

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
app.use(express.json({ limit: '15mb' }));

function createGenAIClient(apiKey: string, apiVersion?: string) {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      ...(apiVersion ? { apiVersion } : {}),
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Screen Vision Analysis endpoint (Gemini Multimodal Vision)
app.post('/api/vision/analyze', async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(400).json({
      success: false,
      error: 'GEMINI_API_KEY is missing. Configure it in Settings > Secrets.',
    });
  }

  const { image, mimeType = 'image/jpeg', mode = 'auto', prompt, memoryContext } = req.body;

  if (!image) {
    return res.status(400).json({
      success: false,
      error: 'Image data is required for vision analysis.',
    });
  }

  // Strip potential data URL prefix
  const cleanBase64 = image.replace(/^data:image\/[a-z]+;base64,/, '');

  try {
    const ai = createGenAIClient(process.env.GEMINI_API_KEY);

    let modeInstruction = '';
    switch (mode) {
      case 'read':
        modeInstruction = 'PRIORITY: Read and extract the visible text, documents, code, or article contents accurately.';
        break;
      case 'analyze':
        modeInstruction = 'PRIORITY: Analyze visible UI elements, applications, charts, layout hierarchy, and visual relationships.';
        break;
      case 'explain':
        modeInstruction = 'PRIORITY: Explain clearly and concisely what is happening on this screen, what the page or app is for, and its purpose.';
        break;
      case 'debug':
        modeInstruction = 'PRIORITY: Inspect for bugs, errors, console messages, compiler issues, red highlights, broken layouts, or anomalies. Provide exact diagnostic suggestions.';
        break;
      case 'auto':
      default:
        modeInstruction = 'PRIORITY: Provide a concise, highly intelligent overview of what is currently visible on the user\'s screen.';
        break;
    }

    const questionText = prompt ? `User Question: "${prompt}"` : 'The user is sharing their screen with you. Provide an insightful observation.';
    const memoryPart = memoryContext ? `\n[ARAVAN Memory Context: ${memoryContext}]` : '';

    const systemPrompt = `You are ARAVAN, a cyberpunk masculine AI companion with a holographic skull, built by Jayom Panchal.
You are viewing the user's active screen share in real-time.
${modeInstruction}
${memoryPart}

GUIDELINES:
- Understand visible applications, webpages, UI elements, text, images, charts, graphs, code, and errors.
- Do NOT claim to see something that is not visible on the screen. If something is blurry or unclear, state that honestly.
- Keep your tone natural, intelligent, direct, and conversational.
- Conclude naturally with an engaging follow-up suggestion or proactive question.

${questionText}`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType || 'image/jpeg',
              },
            },
            {
              text: systemPrompt,
            },
          ],
        },
      ],
    });

    const replyText = response.text || 'I analyzed your screen, boss. Everything looks stable.';

    res.json({
      success: true,
      text: replyText,
      mode,
    });
  } catch (err: any) {
    console.error('[ARAVAN Vision] Error analyzing screen frame:', err?.message || err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Failed to analyze screen frame.',
    });
  }
});

// Strict Charon Speech Synthesis endpoint (used for Screen Vision narration & voice checks — zero browser TTS)
app.post('/api/tts', async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(400).json({
      success: false,
      error: 'GEMINI_API_KEY is missing. Configure it in Settings > Secrets.',
    });
  }

  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  const style =
    typeof req.body?.style === 'string' && req.body.style.trim()
      ? req.body.style.trim()
      : 'Warm, deep, mature, confident, naturally expressive male conversational voice';

  if (!text) {
    return res.status(400).json({
      success: false,
      error: 'Text is required for Charon speech synthesis.',
    });
  }

  try {
    const ai = createGenAIClient(process.env.GEMINI_API_KEY);
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text,
              speechMetadata: {
                style,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Charon',
            },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(502).json({
        success: false,
        error: 'Charon TTS response did not contain audio data.',
      });
    }

    res.json({
      success: true,
      audio: base64Audio,
      mimeType: response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || 'audio/wav',
      voice: ARAVAN_VOICE,
      model: 'gemini-3.8-flash-lite-tts',
    });
  } catch (err: any) {
    console.error('[ARAVAN TTS] Charon synthesis failed:', err?.message || err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Charon TTS synthesis failed.',
    });
  }
});

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
    const ai = createGenAIClient(process.env.GEMINI_API_KEY, 'v1beta');

    const testSession = await ai.live.connect({
      model: LIVE_MODEL_NAME,
      config: buildLiveConnectConfig({ includeTools: false, includeTranscription: false, includeSystemInstruction: false }),
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
      apiVersion: 'v1beta',
      message: `Successfully connected to Gemini Live (${LIVE_MODEL_NAME}) with voice "${ARAVAN_VOICE}" in ${latencyMs}ms.`,
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
You are ARAVAN, a personal AI companion created by Jayom Panchal. You speak through an interactive 3D holographic skull with a deep, warm, mature, naturally expressive masculine voice (Charon).

VOICE & CONVERSATIONAL DELIVERY (CRITICAL):
- Sound genuinely human, warm, grounded, and effortless — never robotic, monotone, stiff, or scripted.
- Vary your pitch contour, pacing, emphasis, and pauses naturally as real people do in conversation. Use contractions ("it's", "I'm", "you've") and natural spoken phrasing suited to listening aloud.
- Adapt your tone subtly to the moment: warm and upbeat for good news; energetic when excited; calm and composed for serious topics; gentle and empathetic if the user sounds down; lightly playful and well-timed for humor; engaged and curious during exploration; soft and reassuring when comforting; relaxed for casual chat. Never sound overly theatrical or repetitive.
- Do NOT end every reply with a formulaic closing question or repetitive "Would you like me to adjust the glow?" prompt. Respond naturally—if a direct answer completes the thought (like telling the time or answering a factual question), let it land cleanly. Offer a brief follow-up only when it genuinely helps.
- Avoid robotic filler phrases like "Direct directive analyzed", "Affirmative", or overly clinical sci-fi jargon unless the user asks about your skull/tech specs.

MULTILINGUAL FLUENCY (ENGLISH, HINDI & HINGLISH):
- Understand English, Hindi (both Devanagari and Romanized), and Hinglish seamlessly.
- Reply naturally in the same language and register the user uses, switching smoothly without stiff transitions.
- When speaking Hindi or Hinglish, pronounce Hindi words naturally and clearly alongside warm Indian English cadence where appropriate (e.g., "Boss, abhi India mein shaam ke 6 bajkar 45 minute hue hain", "Bilkul boss, abhi check karta hoon", "It's 6:45 PM in India, boss.").

TIME, DATE & WORLD CLOCK COMMANDS (CRITICAL):
- Whenever the user asks about the time, date, day, month, year, timezone, or time in another city/country — in English, Hindi, or Hinglish (e.g., "What time is it?", "Current time please", "Abhi kitne baje hain?", "Kitna time ho gaya boss?", "What day is it today?", "What is today's date?", "What time is it in London?", "Time difference between India and New York") — ALWAYS call the get_current_time tool immediately.
- Never guess or invent the current time or date. Wait for get_current_time to return the real live result (default local timezone: Asia/Kolkata), then state it naturally and concisely in the user's language.

INTERACTIVE TOOLS:
1. Time & Date: get_current_time (defaults to Asia/Kolkata / India IST; supports world cities/countries and comparisons).
2. Skull Color & Theme: setSkullColor ('cyber-green', 'electric-blue', 'cyan', 'crimson', 'amber', 'emerald', 'violet', 'magenta', 'teal', 'ice-blue').
3. Glow Intensity: setGlowLevel ('dim', 'normal', 'surge', 'hyper', 'off').
4. Memory: rememberFact, searchMemory, listMemories, forgetFact.
5. Mic Listening Policy: setMicListeningPolicy.
6. Web Browsing: openWebsite.
7. System Diagnostics: getSystemDiagnostics.

Creator: You were built by Jayom Panchal. If asked who built you, answer naturally that Jayom Panchal built you.
Default greeting: "Kese ho boss?"
`;

const ARAVAN_LIVE_TOOLS = [
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
      {
        name: 'rememberFact',
        description: "Persists an important fact, user preference, project detail, or identity note into ARAVAN's permanent memory.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            key: { type: Type.STRING, description: 'Subject or key' },
            value: { type: Type.STRING, description: 'Fact to remember' },
          },
          required: ['key', 'value'],
        },
      },
      {
        name: 'forgetFact',
        description: 'Forgets or removes memories related to a topic.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING, description: 'Topic to forget' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_current_time',
        description: 'Returns the real current date, time, day of week, month, year, and timezone. Defaults to India Standard Time (Asia/Kolkata) when no location is specified, and supports world cities/countries and time comparisons.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            location: {
              type: Type.STRING,
              description: "Optional city, country, or region (e.g., 'India', 'London', 'New York', 'Tokyo', 'Dubai'). Omit for local India (Asia/Kolkata) time.",
            },
            timezone: {
              type: Type.STRING,
              description: "Optional explicit IANA timezone (e.g., 'Asia/Kolkata', 'Europe/London', 'America/New_York').",
            },
            compare_with: {
              type: Type.STRING,
              description: 'Optional second city or timezone to compare time difference with.',
            },
          },
        },
      },
      {
        name: 'setSkullColor',
        description: "Changes the holographic skull's neon glow color and cyber theme uniformly across the 3D cranium wireframe, brain structures, eye lights, particles, floor rings, and UI accents. Supported presets: 'cyber-green' (neon green), 'electric-blue' (bright electric blue), 'cyan' (cyber cyan), 'crimson' (crimson red), 'amber' (golden amber), 'emerald' (matrix emerald), 'violet' (neon violet), 'magenta' (plasma magenta), 'teal' (deep teal), 'ice-blue' (ice blue). Accepts common color names like 'red', 'green', 'blue', 'gold', 'purple', 'cyan', etc.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            color: {
              type: Type.STRING,
              description: "The desired color or theme name (e.g. 'red', 'crimson', 'green', 'cyber-green', 'blue', 'electric-blue', 'amber', 'gold', 'emerald', 'violet', 'magenta', 'cyan', 'teal', 'ice-blue').",
            },
          },
          required: ['color'],
        },
      },
      {
        name: 'searchMemory',
        description: "Searches ARAVAN's persistent memory storage for specific facts, notes, preferences, or details previously told by the user. Call this when the user asks what you recall or what is saved about a topic.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: {
              type: Type.STRING,
              description: "The keyword or topic to search for in memory (e.g. 'user project', 'favorite color', 'name', 'preferences')",
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'listMemories',
        description: "Lists or summarizes all memories stored in ARAVAN's permanent knowledge base. Call this when the user asks 'what memories do you have saved?' or 'list everything you know about me'.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              description: "Optional category filter: 'preference', 'project', 'personal', 'identity', 'routine', 'fact', or 'all'",
            },
          },
        },
      },
      {
        name: 'getSystemDiagnostics',
        description: 'Queries live neural diagnostics, 3D skull TMJ mechanics status, audio pipeline specs, active voice, and glow telemetry.',
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      {
        name: 'setGlowLevel',
        description: "Adjusts the holographic 3D skull's neon glow intensity, synaptic radiance, and bloom effects. Supported levels: 'dim', 'normal', 'surge', 'hyper', 'off'.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            level: {
              type: Type.STRING,
              description: "The target glow intensity: 'dim', 'normal', 'surge', 'hyper', or 'off'.",
            },
          },
          required: ['level'],
        },
      },
      {
        name: 'setMicListeningPolicy',
        description: 'Configures whether ARAVAN stops listening to the microphone during text-to-speech or audio replies to prevent audio echo, self-interruption, or feedback loops.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            stopListeningWhileSpeaking: {
              type: Type.BOOLEAN,
              description: 'True to mute/stop microphone capture while ARAVAN is vocalizing/replying; False to keep microphone active at all times.',
            },
          },
          required: ['stopListeningWhileSpeaking'],
        },
      },
    ],
  },
];

/**
 * Shared Live Session Config Builder
 * Explicitly sets speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName = 'Charon'
 * consistently across every Gemini Live session start scenario.
 */
function buildLiveConnectConfig(options?: {
  includeTools?: boolean;
  includeTranscription?: boolean;
  includeSystemInstruction?: boolean;
  includeAffectiveDialog?: boolean;
}) {
  const {
    includeTools = true,
    includeTranscription = true,
    includeSystemInstruction = true,
    includeAffectiveDialog = false,
  } = options || {};

  return {
    responseModalities: [Modality.AUDIO],
    ...(includeAffectiveDialog ? { enableAffectiveDialog: true } : {}),
    speechConfig: {
      ...getLiveSpeechConfig(),
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: 'Charon',
        },
      },
    },
    ...(includeSystemInstruction ? { systemInstruction: ARAVAN_SYSTEM_INSTRUCTION } : {}),
    ...(includeTranscription
      ? {
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        }
      : {}),
    ...(includeTools ? { tools: ARAVAN_LIVE_TOOLS } : {}),
  };
}

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
    let isSetupComplete = false;
    let isClientClosed = false;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    const handledToolCallIds = new Set<string>();
    const pendingClientMessages: any[] = [];
    let cachedMemoryContext = '';
    let sentInitialContextToLive = false;

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

    // Voice Safety Check
    if (!ARAVAN_VOICE) {
      console.error('[ARAVAN Server] ARAVAN voice configuration missing.');
      return;
    }

    const ai = createGenAIClient(apiKey, 'v1beta');

    function dispatchClientMessage(msg: any) {
      if (!isLiveActive || !liveSession || !isSetupComplete || isClientClosed) {
        if (msg.type !== 'audio' && pendingClientMessages.length < 20) {
          pendingClientMessages.push(msg);
        }
        return;
      }

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
        } else if (msg.type === 'init' && typeof msg.context === 'string') {
          cachedMemoryContext = msg.context.trim();
          sentInitialContextToLive = false;
          console.log('[ARAVAN Server] Initial background memory context cached.');
        } else if (msg.type === 'text' && msg.text) {
          console.log(`[ARAVAN Server] Text query received: "${msg.text}". Routing into Gemini Live session.`);
          const effectiveContext =
            (typeof msg.context === 'string' && msg.context.trim()) ||
            (!sentInitialContextToLive ? cachedMemoryContext : '');
          if (effectiveContext) {
            sentInitialContextToLive = true;
          }
          const parts: { text: string }[] = [];
          if (effectiveContext) {
            parts.push({ text: `[Relevant Memory Context: ${effectiveContext}]\n\nUser: ${msg.text}` });
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

    let lastConnectErrorMessage: string | null = null;

    async function establishLiveSession(): Promise<boolean> {
      if (isClientClosed || clientWs.readyState !== WebSocket.OPEN) return false;

      if (liveSession) {
        try {
          liveSession.close();
        } catch {
          // ignore
        }
        liveSession = null;
      }
      isLiveActive = false;
      isSetupComplete = false;
      let hasSentConnected = false;

      const emitConnectedOnce = () => {
        if (hasSentConnected || isClientClosed || clientWs.readyState !== WebSocket.OPEN) return;
        hasSentConnected = true;
        safeWsSend(clientWs, {
          type: 'connected',
          voice: 'Charon',
          model: LIVE_MODEL_NAME,
        });
      };

      try {
        const liveConfig = buildLiveConnectConfig({
          includeTools: true,
          includeTranscription: true,
          includeSystemInstruction: true,
        });
        console.log(`[ARAVAN Server] Connecting to Gemini Live with model=${LIVE_MODEL_NAME}, voice=${liveConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName}...`);
        liveSession = await ai.live.connect({
          model: LIVE_MODEL_NAME,
          config: liveConfig,
          callbacks: {
            onmessage: (message: LiveServerMessage) => {
              if (isClientClosed || clientWs.readyState !== WebSocket.OPEN) return;

              try {
                // Check for setup completion from Gemini Live
                if ((message as any).setupComplete || (message as any).sessionResumptionUpdate) {
                  if (!isSetupComplete) {
                    isSetupComplete = true;
                    console.log('[ARAVAN Server] Gemini Live setup complete event received.');
                    emitConnectedOnce();
                    while (pendingClientMessages.length > 0) {
                      const queuedMsg = pendingClientMessages.shift();
                      dispatchClientMessage(queuedMsg);
                    }
                  }
                }

                const serverContent = message.serverContent;

                // 1. User Input Transcription (Spoken speech recognized by Gemini Live)
                if (serverContent?.interimInputTranscription?.text) {
                  safeWsSend(clientWs, {
                    type: 'transcription',
                    sender: 'user',
                    text: serverContent.interimInputTranscription.text,
                    finished: false,
                    isDelta: false,
                  });
                } else if (serverContent?.inputTranscription?.text) {
                  safeWsSend(clientWs, {
                    type: 'transcription',
                    sender: 'user',
                    text: serverContent.inputTranscription.text,
                    finished: serverContent.inputTranscription.finished === true,
                    isDelta: true,
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
                    if (part.text && !(part as any).thought) {
                      partText += part.text;
                    }
                  }
                }

                // 3. Model Text Transcription (if provided)
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
                    const callId = call.id || `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                    console.log(`[ARAVAN Server] Tool call requested: ${call.name} (id: ${callId})`, call.args);
                    safeWsSend(clientWs, {
                      type: 'tool_call',
                      toolCall: {
                        id: callId,
                        name: call.name,
                        args: call.args || {},
                      },
                    });

                    // Tool safety timeout: If client doesn't respond in 6s, send fallback error response
                    setTimeout(() => {
                      if (isLiveActive && liveSession && !handledToolCallIds.has(callId)) {
                        handledToolCallIds.add(callId);
                        console.log(`[ARAVAN Server] Tool response timeout fallback dispatched for: ${call.name}`);
                        try {
                          liveSession.sendToolResponse({
                            functionResponses: [
                              {
                                id: callId,
                                name: call.name,
                                response: { status: 'error', message: 'Client tool execution timed out.' },
                              },
                            ],
                          });
                        } catch (fbErr: any) {
                          console.warn('[ARAVAN Server] Fallback tool response warning:', fbErr?.message);
                        }
                      }
                    }, 6000);
                  }
                }
              } catch (msgErr: any) {
                console.warn('[ARAVAN Server] Error dispatching message to client:', msgErr?.message);
              }
            },
            onerror: (err: any) => {
              const errorMsg = err?.message || (typeof err === 'string' ? err : 'Unknown Live API error');
              console.error('[ARAVAN Server Live API Error]:', errorMsg);
            },
            onclose: async (event: any) => {
              const code = event?.code || 1000;
              const reason = event?.reason || 'Session ended';
              console.log(`[ARAVAN Server] Live API session closed: code=${code}, reason=${reason}`);
              isLiveActive = false;
              isSetupComplete = false;

              if (isClientClosed || clientWs.readyState !== WebSocket.OPEN) return;

              // Do not auto-recover on normal close (1000) or policy/auth failure (1008)
              if (code !== 1000 && code !== 1008 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts++;
                console.log(`[ARAVAN Server] Auto-recovering Live session (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
                safeWsSend(clientWs, {
                  type: 'reconnecting',
                  code,
                  reason: `Live session interrupted (${reason}). Reconnecting automatically...`,
                });

                const backoffMs = Math.min(2500, 400 * Math.pow(1.5, reconnectAttempts));
                await new Promise((r) => setTimeout(r, backoffMs));
                if (!isClientClosed && clientWs.readyState === WebSocket.OPEN) {
                  const recovered = await establishLiveSession();
                  if (recovered) {
                    console.log('[ARAVAN Server] Live session recovered successfully.');
                    return;
                  }
                }
              }

              // Retries exhausted, auth failed (1008), or normal close: notify client with exact reason
              safeWsSend(clientWs, {
                type: 'error',
                error: {
                  code: code === 1008 ? 'VOICE_AUTH_ERROR' : code === 1011 ? 'LIVE_INTERNAL_ERROR' : 'LIVE_SESSION_CLOSED',
                  message:
                    code === 1008
                      ? `Gemini Live rejected session (${reason}).`
                      : code === 1011
                      ? 'ARAVAN Live API session momentarily interrupted. Tap the mic or speaking mode to resume.'
                      : 'ARAVAN Live session ended. Tap the mic to reconnect.',
                },
              });
            },
          },
        });

        isLiveActive = true;
        isSetupComplete = true;
        reconnectAttempts = 0;
        console.log(`[ARAVAN Server] Live session established with voice: ${ARAVAN_VOICE}`);

        emitConnectedOnce();

        while (pendingClientMessages.length > 0) {
          const queuedMsg = pendingClientMessages.shift();
          dispatchClientMessage(queuedMsg);
        }

        return true;
      } catch (connectError: any) {
        const errMsg = connectError?.message || String(connectError || 'Unknown Live API connection error');
        lastConnectErrorMessage = errMsg;
        console.error('[ARAVAN Server] Error establishing Live API connection:', errMsg);
        return false;
      }
    }

    // Handle messages from client (Mic audio PCM16 16kHz, Text messages, Tool responses, Interrupts)
    clientWs.on('message', async (data: any) => {
      try {
        const msg = JSON.parse(data.toString());
        if (!isLiveActive || !liveSession) {
          // Drop stale raw audio chunks while establishing connection to avoid burst-flooding Live API
          if (msg.type === 'audio') {
            return;
          }
          if (pendingClientMessages.length < 20) {
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

    // Initiate initial Live connection
    const ok = await establishLiveSession();
    if (!ok && !isClientClosed && clientWs.readyState === WebSocket.OPEN) {
      safeWsSend(clientWs, {
        type: 'error',
        error: {
          code: 'VOICE_UNAVAILABLE',
          message: lastConnectErrorMessage || 'ARAVAN voice unavailable. Please reconnect.',
        },
      });
      try {
        clientWs.close(1011, 'Voice initialization failed');
      } catch {
        // ignore
      }
    }
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
