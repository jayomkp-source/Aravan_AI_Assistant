/**
 * MemoryBankView.tsx - Dedicated Organized Memory Hub
 * 
 * Provides an easy-to-find, dedicated space for:
 * - Storing information as per user wish (facts, preferences, project notes)
 * - Searching and reviewing all saved memories
 * - Filtering by categories (Preferences, Projects, Facts, Personal)
 * - Individual memory deletion & full memory wipe
 * - Continuous memory learning toggles
 */

import React, { useState, useEffect } from 'react';
import { MemoryManager } from '../memory/MemoryManager';
import { Memory, MemoryCategory } from '../memory/MemoryTypes';
import {
  Brain,
  Search,
  Plus,
  Trash2,
  CheckCircle,
  Shield,
  Layers,
  Lock,
  Calendar,
  Tag,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface MemoryBankViewProps {
  onSelectAction?: (prompt: string) => void;
}

export const MemoryBankView: React.FC<MemoryBankViewProps> = ({ onSelectAction }) => {
  const { currentTheme } = useTheme();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isMemoryEnabled, setIsMemoryEnabled] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // New Memory Input Form State
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('fact');

  const memoryManager = MemoryManager.getInstance();

  const loadMemories = async () => {
    const list = await memoryManager.getAllMemories();
    setMemories(list);
    setIsMemoryEnabled(memoryManager.isMemoryEnabled());
  };

  useEffect(() => {
    loadMemories();
    const unsubscribe = memoryManager.subscribe(() => {
      loadMemories();
    });
    return unsubscribe;
  }, []);

  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = newKey.trim();
    const val = newValue.trim();
    if (!key || !val) return;

    try {
      await memoryManager.saveExplicitMemory(key, val, newCategory, 0.9);
      setStatusMessage(`Successfully saved "${key}" into permanent memory.`);
      setNewKey('');
      setNewValue('');
      setTimeout(() => setStatusMessage(null), 3500);

      if (onSelectAction) {
        onSelectAction(`Remember that ${key} is ${val}`);
      }
    } catch (err: any) {
      console.warn('[MemoryBankView] Error saving memory:', err);
    }
  };

  const handleDelete = async (id: string, key: string) => {
    await memoryManager.deleteMemory(id);
    setStatusMessage(`Deleted memory for "${key}".`);
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleClearAll = async () => {
    await memoryManager.clearAllMemories();
    setShowClearConfirm(false);
    setStatusMessage('All personal memories cleared.');
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleToggleSystem = async () => {
    const nextState = !isMemoryEnabled;
    setIsMemoryEnabled(nextState);
    await memoryManager.toggleMemoryEnabled(nextState);
    setStatusMessage(nextState ? 'Memory storage enabled.' : 'Memory storage paused.');
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const filteredMemories = memories.filter((m) => {
    const matchesCat = selectedCategory === 'all' || m.category === selectedCategory;
    if (!matchesCat) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.key.toLowerCase().includes(q) ||
      m.value.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 select-none animate-fade-in p-2 sm:p-4">
      {/* 1. Header Banner */}
      <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-lg"
            style={{
              backgroundColor: `${currentTheme.accent}20`,
              borderColor: `${currentTheme.accent}60`,
              color: currentTheme.accent,
            }}
          >
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <span>MEMORY STORAGE BANK</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-950/40 text-amber-300 font-semibold font-mono">
                {memories.length} Stored Facts
              </span>
            </h2>
            <p className="text-xs text-zinc-400 font-medium">
              Save any information as per your wish. ARAVAN persists these records securely across sessions.
            </p>
          </div>
        </div>

        {/* Controls: Recall & Toggle System */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectAction && onSelectAction('Check your memory and tell me what you recall about me')}
            className="px-3 py-1.5 rounded-xl bg-violet-950/70 hover:bg-violet-900 border border-violet-500/50 text-xs font-mono text-violet-200 transition-colors shadow-sm"
          >
            Recall Everything
          </button>
          <button
            onClick={handleToggleSystem}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-medium transition-colors ${
              isMemoryEnabled
                ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}
          >
            {isMemoryEnabled ? 'Active' : 'Paused'}
          </button>
        </div>
      </div>

      {/* Status Notice Toast */}
      {statusMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center gap-2 shadow-lg animate-fade-in">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* 2. Store Information As Per User Wish (Main Input Card) */}
      <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-xl shadow-2xl space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
            <Plus className="w-4 h-4 text-amber-400" />
            <span>SAVE NEW INFORMATION PER YOUR WISH</span>
          </span>
          <span className="text-[11px] font-mono text-zinc-500">IndexedDB Secure Brain</span>
        </div>

        <form onSubmit={handleSaveMemory} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            {/* Subject / Key */}
            <div className="sm:col-span-4">
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="Topic / Key (e.g. Favorite Food, Project Name)..."
                className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-amber-500/60 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none font-sans"
              />
            </div>

            {/* Fact / Value */}
            <div className="sm:col-span-5">
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Information to remember (e.g. Sushi, ARAVAN AI)..."
                className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-amber-500/60 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none font-sans"
              />
            </div>

            {/* Category Selector */}
            <div className="sm:col-span-3 flex items-center gap-2">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
                className="flex-1 bg-zinc-900/80 border border-zinc-800 text-zinc-200 rounded-xl px-2.5 py-2 text-xs focus:outline-none"
              >
                <option value="fact">Fact</option>
                <option value="preference">Preference</option>
                <option value="project">Project</option>
                <option value="personal">Personal</option>
                <option value="routine">Routine</option>
              </select>

              <button
                type="submit"
                disabled={!newKey.trim() || !newValue.trim()}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-white rounded-xl text-xs font-mono font-semibold transition-all shadow-md shrink-0 flex items-center gap-1.5"
              >
                <span>Save</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stored memory records..."
            className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-cyan-500/50 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          {['all', 'preference', 'project', 'fact', 'personal'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-all border whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-zinc-800 text-white border-zinc-700 shadow-sm'
                  : 'bg-zinc-950/60 text-zinc-400 border-zinc-850 hover:text-zinc-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Stored Memories Cards Grid */}
      <div className="space-y-2.5">
        {filteredMemories.length === 0 ? (
          <div className="p-8 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-center space-y-2">
            <Brain className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-xs text-zinc-400 font-medium">No memory records found.</p>
            <p className="text-[11px] text-zinc-600">
              Use the form above to tell ARAVAN anything you want it to remember!
            </p>
          </div>
        ) : (
          filteredMemories.map((mem) => {
            const isCreator = mem.id === 'creator_foundational';
            return (
              <div
                key={mem.id}
                className="p-3.5 rounded-xl bg-zinc-950/70 hover:bg-zinc-950 border border-zinc-850 hover:border-zinc-750 transition-all flex items-start justify-between gap-3 group"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-zinc-100 font-sans">{mem.key}</span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 capitalize">
                      {mem.category}
                    </span>
                    {isCreator && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full bg-violet-950/80 border border-violet-500/40 text-violet-300">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Core Foundational</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-300 font-sans leading-relaxed">{mem.value}</p>
                  <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500 pt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(mem.updatedAt).toLocaleDateString()}
                    </span>
                    <span>Importance: {Math.round(mem.importance * 100)}%</span>
                  </div>
                </div>

                {!isCreator && (
                  <button
                    onClick={() => handleDelete(mem.id, mem.key)}
                    className="p-1.5 rounded-lg text-zinc-600 hover:text-rose-400 hover:bg-rose-950/40 transition-colors shrink-0"
                    title={`Delete memory: ${mem.key}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 5. Clear All & Security Notice */}
      <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs font-mono text-zinc-500">
        <span>Persistent storage preserved in browser IndexedDB.</span>
        {showClearConfirm ? (
          <div className="flex items-center gap-2">
            <span className="text-rose-400 text-[11px]">Clear all memories?</span>
            <button
              onClick={handleClearAll}
              className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px]"
            >
              Yes, Clear
            </button>
            <button
              onClick={() => setShowClearConfirm(false)}
              className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="text-rose-400/80 hover:text-rose-300 text-[11px] transition-colors"
          >
            Clear Personal Memories
          </button>
        )}
      </div>
    </div>
  );
};
