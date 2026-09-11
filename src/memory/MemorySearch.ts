/**
 * MemorySearch - Lightweight Relevance & Scoring Engine for ARAVAN's Memory
 * 
 * Formula:
 * score = relevanceScore + importanceScore + recencyScore
 */

import { Memory } from './MemoryTypes';

// Words that indicate creator / identity queries
const CREATOR_KEYWORDS = new Set([
  'who',
  'built',
  'creator',
  'made',
  'build',
  'developer',
  'father',
  'founder',
  'jayom',
  'panchal',
  'author',
  'created',
  'origin',
  'invented',
  'inventor',
]);

// Stop words to ignore during keyword matching
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'in', 'on', 'at', 'to', 'for', 'with', 'about', 'by', 'of', 'it', 'its',
  'you', 'your', 'i', 'me', 'my', 'we', 'us', 'our', 'what', 'when', 'where', 'how',
  'can', 'could', 'would', 'should', 'do', 'does', 'did', 'have', 'has', 'had',
  'please', 'tell', 'bhai', 'yaar', 'boss', 'kya', 'hai', 'batao', 'bata',
]);

export interface ScoredMemory {
  memory: Memory;
  score: number;
}

export class MemorySearch {
  /**
   * Tokenize and normalize a string into meaningful keyword tokens
   */
  private static tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
  }

  /**
   * Search and rank memories based on relevance to a query
   */
  static search(
    query: string,
    memories: Memory[],
    options: {
      limit?: number;
      minScore?: number;
      now?: number;
    } = {}
  ): Memory[] {
    if (!query || memories.length === 0) return [];

    const limit = options.limit ?? 5;
    const minScore = options.minScore ?? 0.25;
    const now = options.now ?? Date.now();

    const queryLower = query.toLowerCase();
    const queryTokens = this.tokenize(query);

    // Check if query is asking about creator or identity
    const isCreatorQuery =
      queryLower.includes('who built') ||
      queryLower.includes('who created') ||
      queryLower.includes('who made') ||
      queryLower.includes('creator') ||
      queryLower.includes('who are you') ||
      queryLower.includes('jayom') ||
      queryTokens.some((t) => CREATOR_KEYWORDS.has(t));

    const scored: ScoredMemory[] = memories.map((memory) => {
      let relevanceScore = 0;

      // Special boost for creator memory if query matches creator keywords
      if (memory.key === 'creator' || memory.id === 'mem_creator_jayom_panchal') {
        if (isCreatorQuery) {
          relevanceScore += 2.0; // Guaranteed top rank
        }
      }

      // 1. Text & key matching
      const memoryText = `${memory.key} ${memory.value} ${memory.category} ${(memory.tags || []).join(' ')}`.toLowerCase();
      const memoryTokens = this.tokenize(memoryText);

      // Exact substring match bonus
      if (queryTokens.length > 0) {
        let matchCount = 0;
        for (const token of queryTokens) {
          if (memoryText.includes(token)) {
            matchCount++;
            // Extra weight if token appears in key or tags
            if (memory.key.toLowerCase().includes(token)) matchCount += 0.5;
            if (memory.tags?.some((t) => t.toLowerCase().includes(token))) matchCount += 0.5;
          }
        }
        relevanceScore += (matchCount / queryTokens.length) * 1.5;
      }

      // Exact phrase match in value or key
      if (query.length > 3 && memoryText.includes(queryLower)) {
        relevanceScore += 1.0;
      }

      // 2. Importance weighting (0.0 to 1.0)
      const importanceScore = (memory.importance || 0.5) * 0.8;

      // 3. Recency weighting (exponential decay over 30 days)
      const ageInHours = Math.max(0, (now - (memory.updatedAt || memory.createdAt)) / (1000 * 60 * 60));
      const recencyScore = Math.max(0, 0.2 * Math.exp(-ageInHours / (24 * 30)));

      // Total score
      const totalScore = relevanceScore + importanceScore + recencyScore;

      return {
        memory,
        score: totalScore,
      };
    });

    // Filter and sort by score descending
    return scored
      .filter((s) => s.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.memory);
  }

  /**
   * Format relevant memories into a clean, compact background knowledge prompt
   * that Gemini Live can naturally consume without feeling robotic.
   */
  static formatForPrompt(memories: Memory[]): string {
    if (!memories || memories.length === 0) return '';

    const lines = memories.map((m) => `- ${m.value.trim()}`);
    return `Relevant background knowledge about user & context:\n${lines.join('\n')}`;
  }
}
