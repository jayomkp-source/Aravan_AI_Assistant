/**
 * ToolManager - Execution and Declaration of Live API Function Tools
 */

import { FunctionDeclaration, Type } from '@google/genai';
import { ToolCallPayload, ToolResponsePayload } from '../types';
import { MemoryManager } from '../memory/MemoryManager';
import { MemoryCategory } from '../memory/MemoryTypes';

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
  name: "getCurrentTime",
  description: "Gets the current local date, time, and timezone.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
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

export const ARAVAN_TOOLS: { functionDeclarations: FunctionDeclaration[] }[] = [
  {
    functionDeclarations: [
      OPEN_WEBSITE_TOOL_DECLARATION,
      GET_TIME_TOOL_DECLARATION,
      REMEMBER_FACT_TOOL_DECLARATION,
      FORGET_FACT_TOOL_DECLARATION,
    ],
  },
];

export class ToolManager {
  private onToolExecutedCallback: ((name: string, args: Record<string, unknown>, result: Record<string, unknown>) => void) | null = null;

  setCallback(cb: (name: string, args: Record<string, unknown>, result: Record<string, unknown>) => void): void {
    this.onToolExecutedCallback = cb;
  }

  /**
   * Execute a tool call received from Gemini Live
   */
  async executeTool(toolCall: ToolCallPayload): Promise<ToolResponsePayload> {
    const { id, name, args } = toolCall;
    let result: Record<string, unknown> = {};

    try {
      if (name === "openWebsite") {
        let rawUrl = String(args.url || '').trim();
        if (rawUrl) {
          if (!/^https?:\/\//i.test(rawUrl)) {
            rawUrl = `https://${rawUrl}`;
          }
          // Safely attempt window.open
          const openedWindow = window.open(rawUrl, '_blank', 'noopener,noreferrer');
          result = {
            status: "success",
            opened: !!openedWindow,
            url: rawUrl,
            message: `Opened ${rawUrl} in a new tab.`,
          };
        } else {
          result = { status: "error", message: "No URL provided." };
        }
      } else if (name === "getCurrentTime") {
        const now = new Date();
        result = {
          status: "success",
          isoTime: now.toISOString(),
          formattedTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          formattedDate: now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
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
        };
      } else if (name === "forgetFact") {
        const query = String(args.query || '');
        const count = await MemoryManager.getInstance().forgetMemoriesMatching(query);
        result = {
          status: "success",
          deletedCount: count,
          message: `Removed ${count} matching memories from persistent storage.`,
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
