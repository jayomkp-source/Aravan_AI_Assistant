/**
 * CapabilityCard.tsx - "I CAN DO ANYTHING YOU ASK" Cyber AI Command Center
 * 
 * Redesigned with rich, user-friendly interactive features:
 * - Real-time capability search & filtering
 * - 1-Click Skull Glow color palette & intensity toggles
 * - Interactive Memory Storage widget ("Save information as per user wish")
 * - Voice listening & echo-shield speech controls
 * - Web launcher & search tools
 * - Interactive Cosmic Galaxy & 3D mechanics actions
 * - Quick prompt template pills & custom command runner
 */

import React, { useState, useMemo } from 'react';
import {
  Globe,
  Search,
  Music,
  Smile,
  Lightbulb,
  Brain,
  Sparkles,
  Zap,
  Play,
  Flame,
  MessageSquare,
  Shield,
  Layers,
  ArrowRight,
  Send,
  HelpCircle,
  Clock,
  CheckCircle,
  Plus,
  Volume2,
  Mic,
  Activity,
  Compass,
} from 'lucide-react';
import { useTheme, THEME_PRESETS } from '../context/ThemeContext';
import { MemoryManager } from '../memory/MemoryManager';

interface CapabilityCardProps {
  onSelectAction?: (prompt: string) => void;
}

type CategoryType = 'all' | 'voice' | 'memory' | 'visuals' | 'web' | 'galaxy';

interface CapabilityItem {
  id: string;
  category: CategoryType;
  icon: React.ElementType;
  title: string;
  desc: string;
  toolBadge: string;
  color: string;
  bgColor: string;
  prompt: string;
}

export const CapabilityCard: React.FC<CapabilityCardProps> = ({ onSelectAction }) => {
  const { currentTheme, setTheme } = useTheme();
  const [activeCategory, setActiveCategory] = useState<CategoryType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [customInput, setCustomInput] = useState('');

  // Memory Storage Widget State ("save information as per user wish")
  const [memoryKey, setMemoryKey] = useState('');
  const [memoryValue, setMemoryValue] = useState('');
  const [memorySavedNotice, setMemorySavedNotice] = useState<string | null>(null);

  const capabilities: CapabilityItem[] = [
    // 1. Voice & Audio Listening
    {
      id: 'voice-echo-on',
      category: 'voice',
      icon: Shield,
      title: 'Enable Echo-Shield',
      desc: 'Mutes mic during AI speech to prevent echo.',
      toolBadge: 'setMicListeningPolicy',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-950/40 border-cyan-500/30',
      prompt: 'Stop listening to microphone while speaking',
    },
    {
      id: 'voice-echo-off',
      category: 'voice',
      icon: Mic,
      title: 'Continuous Listening',
      desc: 'Keeps mic open continuously for vocal barge-in.',
      toolBadge: 'setMicListeningPolicy',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-950/40 border-emerald-500/30',
      prompt: 'Enable continuous listening during speech',
    },
    {
      id: 'voice-jaw-sync',
      category: 'voice',
      icon: Activity,
      title: 'Test Jaw Articulation',
      desc: 'Syncs mandible jaw bone with Web Audio frequencies.',
      toolBadge: 'voiceDialogue',
      color: 'text-violet-400',
      bgColor: 'bg-violet-950/40 border-violet-500/30',
      prompt: 'Test 3D skull mandible articulation and speech sync',
    },

    // 2. Memory Bank (User Wish Information Storage)
    {
      id: 'mem-save-custom',
      category: 'memory',
      icon: Brain,
      title: 'Store User Fact',
      desc: 'Saves your personal details into persistent memory.',
      toolBadge: 'rememberFact',
      color: 'text-amber-400',
      bgColor: 'bg-amber-950/40 border-amber-500/30',
      prompt: 'Remember that my name is Jay and I built ARAVAN',
    },
    {
      id: 'mem-recall-all',
      category: 'memory',
      icon: Layers,
      title: 'Recall What You Know',
      desc: 'Retrieves all saved memories about you.',
      toolBadge: 'searchMemory',
      color: 'text-purple-400',
      bgColor: 'bg-purple-950/40 border-purple-500/30',
      prompt: 'What do you remember about me in your persistent brain?',
    },
    {
      id: 'mem-list-all',
      category: 'memory',
      icon: Layers,
      title: 'List All Memory Records',
      desc: 'Summarizes all stored facts in your knowledge base.',
      toolBadge: 'listMemories',
      color: 'text-teal-400',
      bgColor: 'bg-teal-950/40 border-teal-500/30',
      prompt: 'List all stored memories in your permanent brain',
    },

    // 3. Skull & Glow Customization
    {
      id: 'vis-crimson',
      category: 'visuals',
      icon: Sparkles,
      title: 'Crimson Red Glow',
      desc: 'Switches 3D cranium wireframe & galaxy to red.',
      toolBadge: 'setSkullColor',
      color: 'text-rose-400',
      bgColor: 'bg-rose-950/40 border-rose-500/30',
      prompt: 'Change skull glow color to crimson red',
    },
    {
      id: 'vis-green',
      category: 'visuals',
      icon: Sparkles,
      title: 'Cyber Green Glow',
      desc: 'Illuminates skull in matrix phosphor green.',
      toolBadge: 'setSkullColor',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-950/40 border-emerald-500/30',
      prompt: 'Make your skull glow cyber green',
    },
    {
      id: 'vis-blue',
      category: 'visuals',
      icon: Sparkles,
      title: 'Electric Blue Glow',
      desc: 'Radiates electric cyber aura across 3D cranium.',
      toolBadge: 'setSkullColor',
      color: 'text-blue-400',
      bgColor: 'bg-blue-950/40 border-blue-500/30',
      prompt: 'Change skull glow color to electric blue',
    },
    {
      id: 'vis-violet',
      category: 'visuals',
      icon: Sparkles,
      title: 'Neon Violet Glow',
      desc: 'Deep purple cyberpunk synthwave aura.',
      toolBadge: 'setSkullColor',
      color: 'text-purple-400',
      bgColor: 'bg-purple-950/40 border-purple-500/30',
      prompt: 'Change skull glow color to neon violet',
    },
    {
      id: 'vis-hyper',
      category: 'visuals',
      icon: Flame,
      title: 'Set Glow to Hyper',
      desc: 'Max out bloom radiance & synaptic photon load.',
      toolBadge: 'setGlowLevel',
      color: 'text-amber-300',
      bgColor: 'bg-amber-950/40 border-amber-500/30',
      prompt: 'Set your holographic skull glow to hyper mode',
    },
    {
      id: 'vis-dim',
      category: 'visuals',
      icon: Sparkles,
      title: 'Set Glow to Dim',
      desc: 'Subtle stealth luminescence for low-light mode.',
      toolBadge: 'setGlowLevel',
      color: 'text-zinc-400',
      bgColor: 'bg-zinc-800/60 border-zinc-700/40',
      prompt: 'Set your holographic skull glow to dim mode',
    },

    // 4. Cosmic Galaxy & 3D Mechanics
    {
      id: 'galaxy-motion',
      category: 'galaxy',
      icon: Compass,
      title: 'Cosmic Galaxy Orbit',
      desc: 'Interactive 3D spiral galaxy backdrop behind skull.',
      toolBadge: '3dScene',
      color: 'text-violet-300',
      bgColor: 'bg-violet-950/40 border-violet-500/30',
      prompt: 'Tell me about the interactive cosmic galaxy behind your skull',
    },
    {
      id: 'galaxy-diagnostics',
      category: 'galaxy',
      icon: Zap,
      title: 'Run Core Diagnostics',
      desc: 'Reports neural load, FPS, TMJ sync, and galaxy status.',
      toolBadge: 'getSystemDiagnostics',
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-950/40 border-indigo-500/30',
      prompt: 'Run full system diagnostics and report core specs',
    },

    // 5. Web & Tools
    {
      id: 'open-yt',
      category: 'web',
      icon: Globe,
      title: 'Open YouTube',
      desc: 'Instantly opens YouTube in a new tab.',
      toolBadge: 'openWebsite',
      color: 'text-red-400',
      bgColor: 'bg-red-950/40 border-red-500/30',
      prompt: 'Open YouTube',
    },
    {
      id: 'open-spotify',
      category: 'web',
      icon: Music,
      title: 'Open Spotify',
      desc: 'Launches Spotify web player in a new tab.',
      toolBadge: 'openWebsite',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-950/40 border-emerald-500/30',
      prompt: 'Open Spotify',
    },
    {
      id: 'open-gh',
      category: 'web',
      icon: Globe,
      title: 'Open GitHub',
      desc: 'Opens GitHub code repositories.',
      toolBadge: 'openWebsite',
      color: 'text-zinc-200',
      bgColor: 'bg-zinc-800/60 border-zinc-600/40',
      prompt: 'Open GitHub',
    },
    {
      id: 'search-tech',
      category: 'web',
      icon: Search,
      title: 'Search Latest Tech',
      desc: 'Queries current tech & space news.',
      toolBadge: 'searchWeb',
      color: 'text-sky-400',
      bgColor: 'bg-sky-950/40 border-sky-500/30',
      prompt: 'Search latest developments in artificial intelligence',
    },
    {
      id: 'time-now',
      category: 'web',
      icon: Clock,
      title: 'Current Time & Date',
      desc: 'Queries accurate real-time clock and timezone.',
      toolBadge: 'get_current_time',
      color: 'text-amber-400',
      bgColor: 'bg-amber-950/40 border-amber-500/30',
      prompt: 'What is the current time and date?',
    },
  ];

  // Filtering by category and search query
  const filteredCapabilities = useMemo(() => {
    return capabilities.filter((c) => {
      const matchesCategory = activeCategory === 'all' || c.category === activeCategory;
      if (!matchesCategory) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.desc.toLowerCase().includes(q) ||
        c.toolBadge.toLowerCase().includes(q) ||
        c.prompt.toLowerCase().includes(q)
      );
    });
  }, [capabilities, activeCategory, searchQuery]);

  const handleExecute = (prompt: string) => {
    if (onSelectAction) {
      onSelectAction(prompt);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customInput.trim();
    if (!trimmed) return;
    handleExecute(trimmed);
    setCustomInput('');
  };

  const handleTemplateClick = (template: string) => {
    setCustomInput(template);
  };

  // User Wish Information Storage Submission
  const handleSaveUserWishMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = memoryKey.trim();
    const value = memoryValue.trim();
    if (!key || !value) return;

    try {
      await MemoryManager.getInstance().saveExplicitMemory(key, value, 'fact', 0.95);
      setMemorySavedNotice(`Saved: "${key}" → "${value}"`);
      setMemoryKey('');
      setMemoryValue('');
      setTimeout(() => setMemorySavedNotice(null), 4000);

      // Also notify ARAVAN session
      handleExecute(`Remember that ${key} is ${value}`);
    } catch (err: any) {
      console.warn('[Memory Storage Error]:', err);
    }
  };

  return (
    <div className="w-full p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800/80 backdrop-blur-2xl shadow-2xl space-y-3.5 select-none transition-all">
      {/* 1. Header with Live Status & Capability Tagline */}
      <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800/70">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full animate-pulse shadow-[0_0_8px_currentColor]"
            style={{ backgroundColor: currentTheme.accent, color: currentTheme.accent }}
          />
          <h3 className="text-xs font-mono font-bold tracking-wider text-zinc-100 uppercase">
            I CAN DO ANYTHING YOU ASK
          </h3>
        </div>
        <span
          className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-zinc-900 font-semibold"
          style={{ borderColor: `${currentTheme.accent}40`, color: currentTheme.accent }}
        >
          Live AI Engine
        </span>
      </div>

      {/* 2. Interactive Search & Filter Bar */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search features (e.g. glow, memory, youtube, time)..."
          className="w-full bg-zinc-900/70 border border-zinc-800 focus:border-cyan-500/50 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all font-sans"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs"
          >
            ×
          </button>
        )}
      </div>

      {/* 3. User-Friendly Interactive Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
        {[
          { id: 'all', label: 'All Powers' },
          { id: 'visuals', label: '🎨 Skull & Glow' },
          { id: 'memory', label: '🧠 Memory Bank' },
          { id: 'voice', label: '🎙️ Voice & Audio' },
          { id: 'galaxy', label: '🌌 Cosmic Galaxy' },
          { id: 'web', label: '🌐 Web Tools' },
        ].map((tab) => {
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as CategoryType)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-all whitespace-nowrap border ${
                isActive
                  ? 'bg-zinc-800 text-white shadow-sm ring-1'
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border-zinc-800/70 hover:bg-zinc-850'
              }`}
              style={
                isActive
                  ? { borderColor: currentTheme.accent, ringColor: `${currentTheme.accent}60` }
                  : undefined
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 4. Quick 1-Click Glow Swatches Bar (Shown when 'all' or 'visuals' is active) */}
      {(activeCategory === 'all' || activeCategory === 'visuals') && (
        <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/70 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>1-CLICK GLOW PALETTE</span>
            </span>
            <span className="text-zinc-500">Instant Uniform Sync</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {THEME_PRESETS.slice(0, 8).map((preset) => {
              const isCurrent = currentTheme.id === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    setTheme(preset.id as any);
                    handleExecute(`Change skull glow color to ${preset.name}`);
                  }}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-mono transition-all ${
                    isCurrent
                      ? 'bg-zinc-850 border-white text-white shadow-md'
                      : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                  }`}
                  title={`Switch theme & glow to ${preset.name}`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: preset.accent }}
                  />
                  <span>{preset.name.replace('Cyber ', '')}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Interactive Memory Storage Form ("Save as per user wish") */}
      {(activeCategory === 'all' || activeCategory === 'memory') && (
        <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/70 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
            <span className="flex items-center gap-1">
              <Brain className="w-3 h-3 text-amber-400" />
              <span>STORE INFORMATION AS PER YOUR WISH</span>
            </span>
            <span className="text-zinc-500">Permanent Brain Storage</span>
          </div>

          <form onSubmit={handleSaveUserWishMemory} className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={memoryKey}
                onChange={(e) => setMemoryKey(e.target.value)}
                placeholder="Topic / Key (e.g. Favorite Color, Project)"
                className="w-1/2 bg-zinc-950/80 border border-zinc-800 focus:border-amber-500/50 rounded-lg px-2.5 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none"
              />
              <input
                type="text"
                value={memoryValue}
                onChange={(e) => setMemoryValue(e.target.value)}
                placeholder="Detail to remember (e.g. Crimson, ARAVAN)"
                className="flex-1 bg-zinc-950/80 border border-zinc-800 focus:border-amber-500/50 rounded-lg px-2.5 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!memoryKey.trim() || !memoryValue.trim()}
                className="px-2.5 py-1 bg-amber-600/80 hover:bg-amber-500 disabled:opacity-40 text-white rounded-lg text-xs font-mono font-medium transition-colors shrink-0 flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-3 h-3" />
                <span>Save</span>
              </button>
            </div>
          </form>

          {memorySavedNotice && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-1 rounded-md animate-fade-in">
              <CheckCircle className="w-3 h-3 shrink-0" />
              <span>{memorySavedNotice}</span>
            </div>
          )}
        </div>
      )}

      {/* 6. Interactive Quick Action Cards Grid */}
      <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {filteredCapabilities.length === 0 ? (
          <div className="p-4 text-center text-xs text-zinc-500 font-mono">
            No actions match "{searchQuery}". Try another keyword.
          </div>
        ) : (
          filteredCapabilities.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => handleExecute(item.prompt)}
                className="w-full flex items-center justify-between p-2 rounded-xl bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/60 hover:border-zinc-700/80 text-left transition-all duration-150 group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${item.bgColor} group-hover:scale-105 transition-transform`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                        {item.title}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-950 text-zinc-500 border border-zinc-800 shrink-0">
                        {item.toolBadge}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate group-hover:text-zinc-400">
                      {item.desc}
                    </div>
                  </div>
                </div>

                {/* Action Trigger Button */}
                <button
                  type="button"
                  className="shrink-0 ml-2 px-2 py-1 rounded-lg bg-zinc-900 text-zinc-400 group-hover:text-white group-hover:bg-zinc-800 border border-zinc-800 flex items-center gap-1 text-[10px] font-mono transition-colors"
                  title={`Execute: "${item.prompt}"`}
                >
                  <span>Run</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* 7. "Ask Anything" Interactive Custom Prompt Bar with Quick Template Pills */}
      <div className="pt-2 border-t border-zinc-800/60 space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 px-0.5">
          <span>QUICK TEMPLATES</span>
          <span className="text-zinc-500">Tap to fill or edit</span>
        </div>

        {/* Quick Fill Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            'Open youtube.com',
            'Remember that my name is Jay',
            'Change color to crimson',
            'Set glow to hyper',
            'What time is it?',
            'What do you know about me?',
          ].map((pill, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleTemplateClick(pill)}
              className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-900/70 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              +{pill}
            </button>
          ))}
        </div>

        {/* Direct Execute Form */}
        <form onSubmit={handleCustomSubmit} className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Tell ARAVAN to do anything (e.g. Open Google, Remember fact)..."
            className="flex-1 bg-zinc-900/80 border border-zinc-800 focus:border-cyan-500/60 rounded-xl px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 transition-all font-sans"
          />
          <button
            type="submit"
            disabled={!customInput.trim()}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-md shadow-cyan-950/40 shrink-0"
          >
            <span>Execute</span>
            <Send className="w-3 h-3 stroke-[2.5]" />
          </button>
        </form>
      </div>
    </div>
  );
};
