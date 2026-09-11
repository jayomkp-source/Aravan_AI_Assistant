/**
 * MemoryExtractor - Extracts semantic long-term memories from conversation turns
 * 
 * Rules:
 * 1. Strictly rejects credentials, API keys, passwords, credit cards, tokens.
 * 2. Filters out conversational noise ("okay", "hello", "thanks").
 * 3. Identifies explicit memory commands ("Remember that...", "Don't forget...").
 * 4. Extracts meaningful user preferences, projects, routines, and identity facts.
 * 5. Prevents duplicate memories by identifying existing matches to update.
 */

import { Memory, MemoryCategory } from './MemoryTypes';

// Security patterns for credentials & sensitive info
const SENSITIVE_PATTERNS = [
  /AIza[0-9A-Za-z-_]{35}/,                         // Google API Key
  /sk-[a-zA-Z0-9]{20,}/,                          // OpenAI / standard API key
  /\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/,   // JWT or auth token structure
  /password\s*[:=]\s*[^\s]+/i,                    // Password assignment
  /\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/,     // Credit Card
  /\b(cvv|cvc)\s*[:=]?\s*\d{3,4}\b/i,            // CVV
  /\b(?:bearer|token|secret|private[_-]?key)\s*[:=]?\s*[^\s]+/i, // Auth secrets
];

// Conversational filler or action commands that should NOT be stored as memories
const TRIVIAL_PHRASES = new Set([
  'okay', 'ok', 'yes', 'no', 'yeah', 'yep', 'nope', 'thanks', 'thank you',
  'hello', 'hi', 'hey', 'kese ho', 'kaisa hai', 'good morning', 'good night',
  'bye', 'see you', 'what time is it', 'tell me the time', 'open youtube',
  'open spotify', 'open google', 'search google', 'wait', 'hold on', 'testing',
  'can you hear me', '1 2 3', 'repeat', 'stop', 'pause',
]);

export interface ExtractedFact {
  category: MemoryCategory;
  key: string;
  value: string;
  importance: number;
  tags: string[];
}

export class MemoryExtractor {
  /**
   * Check if text contains sensitive credentials
   */
  static containsSensitiveData(text: string): boolean {
    return SENSITIVE_PATTERNS.some((pattern) => pattern.test(text));
  }

  /**
   * Check if a statement is purely trivial
   */
  static isTrivial(text: string): boolean {
    const cleaned = text.toLowerCase().replace(/[^\w\s]/g, '').trim();
    if (!cleaned || cleaned.length < 3) return true;
    return TRIVIAL_PHRASES.has(cleaned);
  }

  /**
   * Extract potential facts from a user statement and optional assistant turn
   */
  static extractFacts(userText: string, assistantText?: string): ExtractedFact[] {
    const facts: ExtractedFact[] = [];
    const trimmed = userText.trim();

    // 1. Safety check
    if (this.containsSensitiveData(trimmed) || (assistantText && this.containsSensitiveData(assistantText))) {
      console.warn('[MemoryExtractor] Blocked statement containing sensitive credentials/keys');
      return [];
    }

    if (this.isTrivial(trimmed)) {
      return [];
    }

    const lower = trimmed.toLowerCase();

    // 2. Explicit "Remember..." commands
    // e.g., "Remember that I want you to call me boss", "Remember this: I prefer dark mode"
    const rememberMatch = trimmed.match(/^(?:please\s+)?(?:remember\s+(?:that\s+|this\s*[:,-]?\s*)|don't\s+forget\s+(?:that\s+)?|keep\s+in\s+mind\s+(?:that\s+)?|note\s+that\s+)(.+)/i);
    if (rememberMatch && rememberMatch[1]) {
      const explicitContent = rememberMatch[1].trim();
      if (!this.isTrivial(explicitContent)) {
        facts.push(this.formatFactFromPhrase(explicitContent, 0.9, true));
        return facts;
      }
    }

    // 3. User addressing preference: "Call me X", "You can call me X"
    const callMeMatch = trimmed.match(/(?:call\s+me|address\s+me\s+as)\s+["']?([a-zA-Z0-9_\s]{2,20})["']?/i);
    if (callMeMatch && callMeMatch[1]) {
      const nameOrTitle = callMeMatch[1].trim();
      if (!TRIVIAL_PHRASES.has(nameOrTitle.toLowerCase())) {
        facts.push({
          category: 'preference',
          key: 'preferred_title',
          value: `User prefers being addressed as "${nameOrTitle}".`,
          importance: 0.85,
          tags: ['title', 'name', 'address', 'preference'],
        });
        return facts;
      }
    }

    // 4. UI or Theme Preferences: "I prefer dark interfaces", "I like dark themes"
    if (lower.includes('prefer dark') || lower.includes('like dark') || lower.includes('dark interface') || lower.includes('dark mode')) {
      facts.push({
        category: 'preference',
        key: 'ui_theme',
        value: 'User prefers dark futuristic interfaces and themes.',
        importance: 0.8,
        tags: ['theme', 'ui', 'dark mode', 'design', 'preference'],
      });
      return facts;
    }

    // 5. Voice or Sound Preferences
    if (lower.includes('natural voice') || lower.includes('sound natural') || lower.includes('deep voice') || lower.includes('masculine voice')) {
      facts.push({
        category: 'preference',
        key: 'voice_style',
        value: 'User prefers natural, deep, masculine, human-like voice responses.',
        importance: 0.85,
        tags: ['voice', 'tone', 'masculine', 'charon', 'natural'],
      });
      return facts;
    }

    // 6. Project building: "I'm building an AI assistant called ARAVAN", "I am working on ARAVAN"
    const projectMatch = trimmed.match(/(?:i(?:'m|\s+am)\s+(?:building|working\s+on|developing|creating))\s+(.+)/i);
    if (projectMatch && projectMatch[1]) {
      const projectDesc = projectMatch[1].trim();
      facts.push({
        category: 'project',
        key: 'current_project',
        value: `User is building: ${projectDesc}.`,
        importance: 0.9,
        tags: ['project', 'building', 'work'],
      });
      return facts;
    }

    // 7. General Preferences: "I prefer X", "I like X", "My favorite X is Y"
    const favoriteMatch = trimmed.match(/my\s+favorite\s+([a-zA-Z\s]+)\s+is\s+([^.?!,]+)/i);
    if (favoriteMatch && favoriteMatch[1] && favoriteMatch[2]) {
      const item = favoriteMatch[1].trim();
      const val = favoriteMatch[2].trim();
      facts.push({
        category: 'preference',
        key: `favorite_${item.replace(/\s+/g, '_')}`,
        value: `User's favorite ${item} is ${val}.`,
        importance: 0.75,
        tags: ['favorite', item.toLowerCase(), 'preference'],
      });
      return facts;
    }

    // 8. Identity statements: "My name is X", "I am an engineer / developer / student"
    const nameMatch = trimmed.match(/my\s+name\s+is\s+([a-zA-Z\s]{2,30})/i);
    if (nameMatch && nameMatch[1]) {
      const name = nameMatch[1].trim();
      facts.push({
        category: 'identity',
        key: 'user_name',
        value: `User's name is ${name}.`,
        importance: 0.9,
        tags: ['identity', 'name', 'user'],
      });
      return facts;
    }

    return facts;
  }

  /**
   * Helper to format an explicit phrase into a structured fact
   */
  private static formatFactFromPhrase(phrase: string, defaultImportance = 0.8, isExplicit = false): ExtractedFact {
    let clean = phrase.trim();
    // Normalize punctuation
    if (!/[.!?]$/.test(clean)) clean += '.';

    // Derive category and key
    let category: MemoryCategory = 'fact';
    let key = 'user_note';

    const lower = clean.toLowerCase();
    if (lower.includes('prefer') || lower.includes('like') || lower.includes('want you to')) {
      category = 'preference';
      key = 'user_preference';
    } else if (lower.includes('building') || lower.includes('project') || lower.includes('aravan') || lower.includes('app')) {
      category = 'project';
      key = 'project_note';
    } else if (lower.includes('my name') || lower.includes('i am') || lower.includes('call me')) {
      category = 'personal';
      key = 'personal_detail';
    }

    // Format natural 3rd person value for model
    let formattedValue = clean;
    if (/^i\s+/i.test(clean)) {
      formattedValue = 'User ' + clean.substring(2);
    } else if (/^my\s+/i.test(clean)) {
      formattedValue = "User's " + clean.substring(3);
    }

    return {
      category,
      key,
      value: formattedValue,
      importance: isExplicit ? 0.95 : defaultImportance,
      tags: ['explicit_note', category],
    };
  }

  /**
   * Find if a candidate fact matches an existing memory (for updating instead of duplicating)
   */
  static findDuplicateMatch(candidate: ExtractedFact, existingMemories: Memory[]): Memory | null {
    const candidateLower = candidate.value.toLowerCase();
    const candidateKey = candidate.key.toLowerCase();

    for (const mem of existingMemories) {
      // 1. Exact key match in same category
      if (mem.category === candidate.category && mem.key.toLowerCase() === candidateKey) {
        return mem;
      }

      // 2. High semantic substring overlap
      const memValLower = mem.value.toLowerCase();
      if (memValLower === candidateLower || memValLower.includes(candidateLower) || candidateLower.includes(memValLower)) {
        return mem;
      }
    }

    return null;
  }
}
