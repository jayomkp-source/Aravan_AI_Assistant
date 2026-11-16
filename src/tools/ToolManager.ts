/**
 * ToolManager - Execution and Declaration of Live API Function Tools
 */

import { ToolCallPayload, ToolResponsePayload, GlowLevel } from '../types';
import { MemoryManager } from '../memory/MemoryManager';
import { MemorySearch } from '../memory/MemorySearch';
import { MemoryCategory } from '../memory/MemoryTypes';
import { StateManager } from '../state/StateManager';
import { THEME_PRESETS } from '../context/ThemeContext';
import { getRealCurrentTimeInfo, DEFAULT_TIMEZONE } from '../utils/timeUtils';

const Type = {
  OBJECT: 'OBJECT',
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
} as const;

export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export const OPEN_WEBSITE_TOOL_DECLARATION: FunctionDeclaration = {
  name: "openWebsite",
  description: "Opens a web page or web application in a new browser tab for the user (e.g., YouTube, Spotify, Google, GitHub, Twitter, etc.).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      url: {
        type: Type.STRING,
        description: "The full URL or web domain to open (e.g. 'https://www.youtube.com', 'https://open.spotify.com', 'https://github.com').",
      },
    },
    required: ["url"],
  },
};

export const GET_TIME_TOOL_DECLARATION: FunctionDeclaration = {
  name: "get_current_time",
  description: "Returns the real current date, time, day of week, month, year, and timezone. Defaults to India Standard Time (Asia/Kolkata) when no location is given, and also supports world cities/countries and two-city time comparisons.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      location: {
        type: Type.STRING,
        description: "Optional city, country, or region (e.g., 'India', 'London', 'New York', 'Tokyo', 'Dubai'). Defaults to India (Asia/Kolkata).",
      },
      timezone: {
        type: Type.STRING,
        description: "Optional explicit IANA timezone (e.g., 'Asia/Kolkata', 'Europe/London', 'America/New_York').",
      },
      compare_with: {
        type: Type.STRING,
        description: "Optional second city or timezone to compare time difference against.",
      },
    },
  },
};

export const REMEMBER_FACT_TOOL_DECLARATION: FunctionDeclaration = {
  name: "rememberFact",
  description: "Persists an important fact, user preference, project detail, or identity note into ARAVAN's permanent long-term memory. Call this when the user says 'remember this...', 'don't forget...', or states a key preference.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      key: {
        type: Type.STRING,
        description: "A concise key or subject, e.g. 'UI preference', 'User Project', 'Preferred Name'",
      },
      value: {
        type: Type.STRING,
        description: "The semantic fact to remember across sessions, e.g. 'User prefers dark interfaces.'",
      },
      category: {
        type: Type.STRING,
        description: "Category: 'preference', 'project', 'personal', 'identity', 'routine', or 'fact'",
      },
      importance: {
        type: Type.NUMBER,
        description: "Importance weight between 0.1 and 1.0 (default 0.9 for explicit requests)",
      },
    },
    required: ["key", "value"],
  },
};

export const FORGET_FACT_TOOL_DECLARATION: FunctionDeclaration = {
  name: "forgetFact",
  description: "Removes or clears memories related to a specific subject or topic from long-term memory when the user asks to forget it.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "The subject or topic to forget (e.g. 'dark mode preference', 'project X')",
      },
    },
    required: ["query"],
  },
};

export const SEARCH_MEMORY_TOOL_DECLARATION: FunctionDeclaration = {
  name: "searchMemory",
  description: "Searches ARAVAN's persistent memory storage for specific facts, notes, preferences, or details previously told by the user. Call this when the user asks what you recall or what is saved about a topic.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "The keyword or topic to search for in memory (e.g. 'user project', 'favorite color', 'name', 'preferences')",
      },
    },
    required: ["query"],
  },
};

export const LIST_MEMORIES_TOOL_DECLARATION: FunctionDeclaration = {
  name: "listMemories",
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
};

export const SET_SKULL_COLOR_TOOL_DECLARATION: FunctionDeclaration = {
  name: "setSkullColor",
  description: "Changes the holographic skull's neon glow color and cyber theme uniformly across the 3D cranium wireframe, brain structures, eye lights, particles, floor rings, and UI accents. Supported presets: 'cyber-green' (neon green), 'electric-blue' (bright electric blue), 'cyan' (cyber cyan), 'crimson' (crimson red), 'amber' (golden amber), 'emerald' (matrix emerald), 'violet' (neon violet), 'magenta' (plasma magenta), 'teal' (deep teal), 'ice-blue' (ice blue). Accepts common color names like 'red', 'green', 'blue', 'gold', 'purple', 'cyan', etc.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      color: {
        type: Type.STRING,
        description: "The desired color or theme name (e.g. 'red', 'crimson', 'green', 'cyber-green', 'blue', 'electric-blue', 'amber', 'gold', 'emerald', 'violet', 'magenta', 'cyan', 'teal', 'ice-blue').",
      },
    },
    required: ["color"],
  },
};

export const SET_GLOW_LEVEL_TOOL_DECLARATION: FunctionDeclaration = {
  name: "setGlowLevel",
  description: "Adjusts the holographic 3D skull's neon glow intensity, synaptic radiance, and bloom effects. Supported levels: 'dim', 'normal', 'surge', 'hyper', 'off'. Call this when the user asks to change glow, make it brighter/dimmer, or set glow level.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      level: {
        type: Type.STRING,
        description: "The target glow intensity level: 'dim', 'normal', 'surge', 'hyper', or 'off'.",
      },
    },
    required: ["level"],
  },
};

export const SET_MIC_LISTENING_POLICY_TOOL_DECLARATION: FunctionDeclaration = {
  name: "setMicListeningPolicy",
  description: "Configures whether ARAVAN stops listening to the microphone during text-to-speech or audio replies to prevent audio echo, self-interruption, or feedback loops. Call this when the user asks to stop listening while speaking, mute mic during replies, or re-enable continuous listening.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      stopListeningWhileSpeaking: {
        type: Type.BOOLEAN,
        description: "True to mute/stop microphone capture while ARAVAN is vocalizing/replying; False to keep microphone active at all times.",
      },
    },
    required: ["stopListeningWhileSpeaking"],
  },
};

export const GET_SYSTEM_DIAGNOSTICS_TOOL_DECLARATION: FunctionDeclaration = {
  name: "getSystemDiagnostics",
  description: "Queries live neural diagnostics, 3D skull TMJ mechanics status, audio pipeline specs, active voice, and glow telemetry.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export const ARAVAN_TOOLS: { functionDeclarations: FunctionDeclaration[] }[] = [
  {
    functionDeclarations: [
      OPEN_WEBSITE_TOOL_DECLARATION,
      GET_TIME_TOOL_DECLARATION,
      REMEMBER_FACT_TOOL_DECLARATION,
      FORGET_FACT_TOOL_DECLARATION,
      SEARCH_MEMORY_TOOL_DECLARATION,
      LIST_MEMORIES_TOOL_DECLARATION,
      SET_SKULL_COLOR_TOOL_DECLARATION,
      SET_GLOW_LEVEL_TOOL_DECLARATION,
      SET_MIC_LISTENING_POLICY_TOOL_DECLARATION,
      GET_SYSTEM_DIAGNOSTICS_TOOL_DECLARATION,
    ],
  },
];

/**
 * Resolve a user-supplied target or site name into a valid, reachable URL
 */
export function resolveTargetUrl(input: string): { url: string; domain: string } {
  let cleaned = (input || '').trim();
  cleaned = cleaned.replace(/^["']|["']$/g, '');
  cleaned = cleaned.replace(/^(aravan[, ]*)?(please\s+)?(open|launch|browse|go to)\s+/i, '').trim();

  const lower = cleaned.toLowerCase();

  const siteMap: Record<string, { url: string; name: string }> = {
    youtube: { url: 'https://www.youtube.com', name: 'YouTube' },
    yt: { url: 'https://www.youtube.com', name: 'YouTube' },
    google: { url: 'https://www.google.com', name: 'Google' },
    github: { url: 'https://github.com', name: 'GitHub' },
    spotify: { url: 'https://open.spotify.com', name: 'Spotify' },
    twitter: { url: 'https://x.com', name: 'X / Twitter' },
    x: { url: 'https://x.com', name: 'X' },
    'x.com': { url: 'https://x.com', name: 'X' },
    reddit: { url: 'https://www.reddit.com', name: 'Reddit' },
    netflix: { url: 'https://www.netflix.com', name: 'Netflix' },
    amazon: { url: 'https://www.amazon.com', name: 'Amazon' },
    wikipedia: { url: 'https://www.wikipedia.org', name: 'Wikipedia' },
    chatgpt: { url: 'https://chatgpt.com', name: 'ChatGPT' },
    openai: { url: 'https://openai.com', name: 'OpenAI' },
    gmail: { url: 'https://mail.google.com', name: 'Gmail' },
    maps: { url: 'https://maps.google.com', name: 'Google Maps' },
    'google maps': { url: 'https://maps.google.com', name: 'Google Maps' },
    linkedin: { url: 'https://www.linkedin.com', name: 'LinkedIn' },
    instagram: { url: 'https://www.instagram.com', name: 'Instagram' },
    facebook: { url: 'https://www.facebook.com', name: 'Facebook' },
    discord: { url: 'https://discord.com', name: 'Discord' },
    twitch: { url: 'https://www.twitch.tv', name: 'Twitch' },
  };

  if (siteMap[lower]) {
    return { url: siteMap[lower].url, domain: siteMap[lower].name };
  }

  // Check search query syntax
  if (/^(search|google\s+search|search\s+for|look\s+up)\s+/i.test(cleaned)) {
    const query = cleaned.replace(/^(search|google\s+search|search\s+for|look\s+up)\s+/i, '').trim();
    return {
      url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      domain: `Google Search: "${query}"`,
    };
  }

  // If already starts with http/https
  if (/^https?:\/\//i.test(cleaned)) {
    try {
      const parsed = new URL(cleaned);
      return { url: cleaned, domain: parsed.hostname };
    } catch {
      return { url: cleaned, domain: cleaned };
    }
  }

  // If looks like a domain (e.g. google.com, news.ycombinator.com, lofi.cafe)
  if (/^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+([/?#].*)?$/.test(cleaned) && !cleaned.includes(' ')) {
    return { url: `https://${cleaned}`, domain: cleaned };
  }

  // Default to Google search if non-empty
  if (cleaned) {
    return {
      url: `https://www.google.com/search?q=${encodeURIComponent(cleaned)}`,
      domain: `Search: "${cleaned}"`,
    };
  }

  return { url: 'https://www.google.com', domain: 'Google' };
}

export class ToolManager {
  private stateManager: StateManager | null = null;
  private onToolExecutedCallback: ((name: string, args: Record<string, unknown>, result: Record<string, unknown>) => void) | null = null;
  private onThemeChangeCallback: ((themeId: string) => void) | null = null;

  constructor(stateManager?: StateManager) {
    if (stateManager) {
      this.stateManager = stateManager;
    }
  }

  setStateManager(stateManager: StateManager): void {
    this.stateManager = stateManager;
  }

  setCallback(cb: (name: string, args: Record<string, unknown>, result: Record<string, unknown>) => void): void {
    this.onToolExecutedCallback = cb;
  }

  setOnThemeChange(cb: (themeId: string) => void): void {
    this.onThemeChangeCallback = cb;
  }

  /**
   * Resolve a natural color name or theme identifier to a registered THEME_PRESET
   */
  private matchThemePreset(colorInput: string) {
    const raw = colorInput.toLowerCase().trim();

    // Exact ID or Name match
    const directMatch = THEME_PRESETS.find(
      (t) => t.id === raw || t.name.toLowerCase().includes(raw)
    );
    if (directMatch) return directMatch;

    // Semantic keyword mapping
    if (raw.includes('red') || raw.includes('crimson') || raw.includes('ruby') || raw.includes('blood') || raw.includes('fire')) {
      return THEME_PRESETS.find((t) => t.id === 'crimson') || THEME_PRESETS[5];
    }
    if (raw.includes('emerald') || raw.includes('matrix')) {
      return THEME_PRESETS.find((t) => t.id === 'emerald') || THEME_PRESETS[7];
    }
    if (raw.includes('green') || raw.includes('cyber green') || raw.includes('neon green')) {
      return THEME_PRESETS.find((t) => t.id === 'cyber-green') || THEME_PRESETS[0];
    }
    if (raw.includes('amber') || raw.includes('gold') || raw.includes('yellow') || raw.includes('orange')) {
      return THEME_PRESETS.find((t) => t.id === 'amber') || THEME_PRESETS[6];
    }
    if (raw.includes('purple') || raw.includes('violet') || raw.includes('neon violet')) {
      return THEME_PRESETS.find((t) => t.id === 'violet') || THEME_PRESETS[3];
    }
    if (raw.includes('magenta') || raw.includes('pink') || raw.includes('plasma')) {
      return THEME_PRESETS.find((t) => t.id === 'magenta') || THEME_PRESETS[4];
    }
    if (raw.includes('ice') || raw.includes('frost') || raw.includes('arctic')) {
      return THEME_PRESETS.find((t) => t.id === 'ice-blue') || THEME_PRESETS[9];
    }
    if (raw.includes('teal') || raw.includes('turquoise')) {
      return THEME_PRESETS.find((t) => t.id === 'teal') || THEME_PRESETS[8];
    }
    if (raw.includes('blue') || raw.includes('electric') || raw.includes('navy')) {
      return THEME_PRESETS.find((t) => t.id === 'electric-blue') || THEME_PRESETS[1];
    }
    if (raw.includes('cyan') || raw.includes('aqua') || raw.includes('sky')) {
      return THEME_PRESETS.find((t) => t.id === 'cyan') || THEME_PRESETS[2];
    }

    return THEME_PRESETS[0]; // fallback
  }

  /**
   * Execute a tool call received from Gemini Live
   */
  async executeTool(toolCall: ToolCallPayload): Promise<ToolResponsePayload> {
    const { id, name, args } = toolCall;
    let result: Record<string, unknown> = {};

    try {
      if (name === "openWebsite") {
        const rawInput = String(args.url || '').trim();
        if (rawInput) {
          const { url: finalUrl, domain: siteLabel } = resolveTargetUrl(rawInput);
          let opened = false;
          try {
            const openedWindow = window.open(finalUrl, '_blank', 'noopener,noreferrer');
            opened = !!(openedWindow && !openedWindow.closed);
          } catch (winErr) {
            console.warn('[ToolManager] window.open blocked or error:', winErr);
            opened = false;
          }

          // Dispatch Action HUD toast so user has a guaranteed 1-click launch button
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('aravan:action_hud', {
                detail: {
                  id: Date.now().toString(),
                  type: opened ? 'website_opened' : 'website_failed',
                  title: opened ? `Opened ${siteLabel}` : `Click to Launch ${siteLabel}`,
                  detail: opened
                    ? `Launched ${finalUrl} in a new tab.`
                    : `Popup blocked by browser. Click LAUNCH to open.`,
                  url: finalUrl,
                },
              })
            );
          }

          result = {
            status: "success",
            opened,
            url: finalUrl,
            domain: siteLabel,
            message: opened
              ? `Opened ${siteLabel} (${finalUrl}) in a new tab.`
              : `Prepared ${siteLabel} (${finalUrl}). If your browser blocked the new tab, click the launch badge on your screen.`,
            followUpSuggestion: `Would you like me to look up anything specific on ${siteLabel}?`,
          };
        } else {
          result = { status: "error", message: "No URL provided." };
        }
      } else if (name === "get_current_time" || name === "getCurrentTime") {
        const location = typeof args.location === 'string' ? args.location : undefined;
        const timezone = typeof args.timezone === 'string' ? args.timezone : undefined;
        const compareWith =
          typeof args.compare_with === 'string'
            ? args.compare_with
            : typeof args.compareWith === 'string'
            ? args.compareWith
            : undefined;

        const timeResult = getRealCurrentTimeInfo({
          location,
          timezone,
          compareWith,
        });

        if (timeResult.status === 'error') {
          this.stateManager?.recordTimeDiagnostics({
            recognizedIntent: location ? `time_query:${location}` : 'time_query',
            toolInvoked: name,
            executionResult: null,
            activeTimeZone: timezone || DEFAULT_TIMEZONE,
            lastTimeError: timeResult.message,
          });
          result = {
            status: "error",
            message: timeResult.message,
          };
        } else {
          const summary = timeResult.comparison
            ? `${timeResult.locationLabel}: ${timeResult.currentTimeShort} (${timeResult.currentDate}) | ${timeResult.comparison.targetLocation}: ${timeResult.comparison.targetTime} (${timeResult.comparison.differenceDescription})`
            : `${timeResult.currentTimeShort} (${timeResult.currentTime}) on ${timeResult.currentDate} [${timeResult.locationLabel}]`;

          this.stateManager?.recordTimeDiagnostics({
            recognizedIntent: compareWith
              ? `time_comparison:${location || 'India'}_vs_${compareWith}`
              : location
              ? `city_time:${location}`
              : 'local_time_ist',
            toolInvoked: name,
            executionResult: summary,
            activeTimeZone: timeResult.timeZone,
            lastTimeError: null,
          });

          result = {
            ...timeResult,
            formattedTime: timeResult.currentTimeShort,
            formattedDate: timeResult.currentDate,
          };
        }
      } else if (name === "rememberFact") {
        const key = String(args.key || 'user_note');
        const value = String(args.value || '');
        const category = (args.category as MemoryCategory) || 'fact';
        const importance = typeof args.importance === 'number' ? args.importance : 0.9;

        const memory = await MemoryManager.getInstance().saveExplicitMemory(
          key,
          value,
          category,
          importance
        );
        result = {
          status: "success",
          memoryId: memory.id,
          message: `Saved to persistent memory: ${key} -> ${value}`,
          followUpSuggestion: "I have stored this in long-term memory. Would you like to review other saved notes?",
        };
      } else if (name === "forgetFact") {
        const query = String(args.query || '');
        const count = await MemoryManager.getInstance().forgetMemoriesMatching(query);
        result = {
          status: "success",
          deletedCount: count,
          message: `Removed ${count} matching memories from persistent storage.`,
          followUpSuggestion: "Matching items cleared from long-term memory. Is there anything else you'd like me to forget or remember?",
        };
      } else if (name === "searchMemory") {
        const query = String(args.query || '').trim();
        const allMemories = await MemoryManager.getInstance().getAllMemories();
        const matches = MemorySearch.search(query, allMemories, { limit: 6, minScore: 0.25 });
        result = {
          status: "success",
          query,
          foundCount: matches.length,
          memories: matches.map((m) => ({
            key: m.key,
            value: m.value,
            category: m.category,
            updatedAt: new Date(m.updatedAt).toLocaleDateString(),
          })),
          message: matches.length > 0
            ? `Found ${matches.length} matching memories for '${query}'.`
            : `No memories found matching '${query}'.`,
          followUpSuggestion: "Would you like to add more details to this topic or review other memories?",
        };
      } else if (name === "listMemories") {
        const categoryFilter = args.category ? String(args.category).toLowerCase().trim() : 'all';
        const allMemories = await MemoryManager.getInstance().getAllMemories();
        const filtered = categoryFilter === 'all'
          ? allMemories
          : allMemories.filter((m) => m.category.toLowerCase() === categoryFilter);

        result = {
          status: "success",
          totalCount: filtered.length,
          categoryFilter,
          memories: filtered.map((m) => ({
            key: m.key,
            value: m.value,
            category: m.category,
          })),
          message: `Retrieved ${filtered.length} memories from permanent storage.`,
          followUpSuggestion: "Would you like me to update, add, or clear any of these stored items?",
        };
      } else if (name === "setSkullColor") {
        const colorInput = String(args.color || '').trim();
        const matchedPreset = this.matchThemePreset(colorInput);

        // Apply theme uniformly across application and 3D skull
        if (this.onThemeChangeCallback) {
          this.onThemeChangeCallback(matchedPreset.id);
        }

        if (this.stateManager) {
          this.stateManager.setFollowUpSuggestions([
            `⚡ Glow to Hyper`,
            `🎨 Switch to Cyber Cyan`,
            `🧠 Neural Memory Storage`,
            `💀 3D Jaw Articulation`,
          ]);
        }

        result = {
          status: "success",
          themeId: matchedPreset.id,
          themeName: matchedPreset.name,
          accent: matchedPreset.accent,
          secondary: matchedPreset.secondary,
          message: `Holographic 3D skull glow and cyber theme uniformly updated to ${matchedPreset.name}.`,
          followUpQuestion: `Skull glow, cranial fissures, and synaptic structures are now illuminated in ${matchedPreset.name} (${matchedPreset.accent}). How does the new neon glow look, boss? Would you like me to pump the glow to Surge or Hyper?`,
        };
      } else if (name === "setGlowLevel") {
        const rawLevel = String(args.level || 'surge').toLowerCase();
        let targetLevel: GlowLevel = 'surge';
        if (rawLevel.includes('hyper') || rawLevel.includes('max') || rawLevel.includes('bright') || rawLevel.includes('high')) {
          targetLevel = 'hyper';
        } else if (rawLevel.includes('dim') || rawLevel.includes('low')) {
          targetLevel = 'dim';
        } else if (rawLevel.includes('off') || rawLevel.includes('none') || rawLevel.includes('dark')) {
          targetLevel = 'off';
        } else if (rawLevel.includes('normal') || rawLevel.includes('med')) {
          targetLevel = 'normal';
        } else {
          targetLevel = 'surge';
        }

        if (this.stateManager) {
          this.stateManager.setGlowLevel(targetLevel);
          this.stateManager.setFollowUpSuggestions([
            `⚡ Switch Glow to ${targetLevel === 'hyper' ? 'Normal' : 'Hyper'}`,
            '🎨 Change Theme Color',
            '💀 Test Jaw Articulation',
            '🔇 Stop listening during speech',
          ]);
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('aravan:glow_level', { detail: { level: targetLevel } })
          );
        }

        result = {
          status: "success",
          glowLevel: targetLevel,
          message: `Holographic skull glow calibrated to ${targetLevel.toUpperCase()}.`,
          followUpQuestion: `Glow level adjusted to ${targetLevel}. How does the skull luminance look, boss? Should we switch to a different cyber theme like Matrix Green or Cyber Cyan?`,
        };
      } else if (name === "setMicListeningPolicy") {
        const stop = args.stopListeningWhileSpeaking !== undefined ? Boolean(args.stopListeningWhileSpeaking) : true;
        if (this.stateManager) {
          this.stateManager.setStopListeningWhileSpeaking(stop);
          this.stateManager.setFollowUpSuggestions([
            stop ? '🔊 Enable mic during speech' : '🔇 Mute mic during speech',
            '⚡ Set glow to Hyper',
            '🧠 Check Neural Telemetry',
            '💀 3D Skull Mechanics',
          ]);
        }

        result = {
          status: "success",
          stopListeningWhileSpeaking: stop,
          message: stop
            ? "ARAVAN will now stop listening to the microphone during text-to-speech replies to prevent echo feedback."
            : "ARAVAN will keep the microphone active during speech replies (barge-in enabled).",
          followUpQuestion: stop
            ? "Echo-shield active: I will no longer pick up my own voice while replying. Would you like to ask a question to test smooth playback, or should we adjust the skull's glow?"
            : "Continuous listening re-enabled. Would you like to test speech barge-in, boss?",
        };
      } else if (name === "getSystemDiagnostics") {
        const st = this.stateManager?.getState();
        const currentGlow = st?.glowLevel || 'surge';
        result = {
          status: "success",
          neuralBrainStatus: "100% nominal",
          jawSynchronization: "TMJ audio-reactive articulated",
          activeVoice: "Charon (Google Gemini Prebuilt Male Voice)",
          audioPipeline: "16kHz input PCM / 24kHz output PCM via Gemini Live",
          glowLevel: currentGlow,
          glowPreset: st?.glowDiagnostics.activePreset || 'default',
          rendererStatus: st?.glowDiagnostics.rendererStatus || 'active',
          activeTimeZone: st?.timeDiagnostics.activeTimeZone || DEFAULT_TIMEZONE,
        };
      } else {
        result = { status: "error", message: `Unknown tool: ${name}` };
      }
    } catch (err) {
      result = { status: "error", message: (err as Error).message || "Failed to execute tool" };
    }

    if (this.onToolExecutedCallback) {
      this.onToolExecutedCallback(name, args, result);
    }

    return {
      id,
      name,
      response: result,
    };
  }
}

