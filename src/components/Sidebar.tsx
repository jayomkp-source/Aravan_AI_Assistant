import React from 'react';
import { SkullIcon } from './SkullIcon';
import { VoiceState } from '../types';
import {
  Home,
  Brain,
  Wrench,
  Settings,
  Palette,
  Info,
  Youtube,
  Search,
  MessageCircle,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Zap,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  voiceState: VoiceState;
  micVolume: number;
  speakerVolume: number;
  onQuickAction: (action: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  voiceState,
  micVolume,
  speakerVolume,
  onQuickAction,
}) => {
  const isListening = voiceState === 'listening';
  const isSpeaking = voiceState === 'speaking';
  const isConnecting = voiceState === 'connecting';
  const isError = voiceState === 'error';

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'skull', label: 'Skull Control', icon: Zap },
    { id: 'memory', label: 'Memory', icon: Brain },
    { id: 'tools', label: 'Tools', icon: Wrench },
    { id: 'theme', label: 'Theme', icon: Palette },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'about', label: 'About', icon: Info },
  ];

  const quickActions = [
    { id: 'youtube', label: 'Open YouTube', url: 'https://www.youtube.com', icon: Youtube, color: 'text-red-500' },
    { id: 'google', label: 'Search Google', url: 'https://www.google.com', icon: Search, color: 'text-blue-400' },
    { id: 'whatsapp', label: 'Open WhatsApp', url: 'https://web.whatsapp.com', icon: MessageCircle, color: 'text-emerald-500' },
    { id: 'chatgpt', label: 'Open ChatGPT', url: 'https://chatgpt.com', icon: Sparkles, color: 'text-teal-400' },
  ];

  return (
    <aside className="w-64 shrink-0 flex flex-col justify-between p-4 bg-[#070514]/90 border-r border-zinc-800/80 backdrop-blur-xl h-full select-none">
      {/* Top: Logo & Navigation */}
      <div className="space-y-6">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-600/30 border border-cyan-500/40 p-1 flex items-center justify-center shadow-lg shadow-cyan-950/40">
            <SkullIcon className="w-6 h-6 text-cyan-400" glow />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-wider text-base text-zinc-100 uppercase">ARAVAN</span>
            </div>
            <span className="text-[10px] tracking-widest uppercase text-cyan-400 font-mono font-medium block">
              AI ASSISTANT
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-violet-950/60 text-white border border-violet-500/50 shadow-[0_0_15px_rgba(122,44,255,0.25)]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* VOICE STATUS & TELEMETRY Card */}
        <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase font-semibold">
              VOICE STATE
            </span>
            <span className={`text-[10px] font-mono font-bold uppercase ${
              isSpeaking ? 'text-violet-400' : isListening ? 'text-cyan-400' : isConnecting ? 'text-amber-400' : 'text-zinc-500'
            }`}>
              {isSpeaking ? 'VOCALIZING' : isListening ? 'LISTENING' : isConnecting ? 'CONNECTING' : 'STANDBY'}
            </span>
          </div>

          {/* Waveform line */}
          <div className="h-6 flex items-center justify-between gap-1 px-1 bg-zinc-900/50 rounded border border-zinc-800/60">
            {[20, 45, 80, 50, 90, 30, 70, 60, 40, 85, 30, 65].map((val, idx) => (
              <div
                key={idx}
                className="w-1 bg-cyan-400/80 rounded-full transition-all duration-150"
                style={{
                  height: `${
                    isSpeaking
                      ? Math.min(100, val * (0.3 + speakerVolume * 0.9))
                      : isListening
                      ? Math.min(100, val * (0.3 + micVolume * 0.8))
                      : 15
                  }%`,
                  opacity: isSpeaking || isListening ? 1 : 0.3,
                }}
              />
            ))}
          </div>

          {/* AI CORE SPECS Snapshot */}
          <div className="pt-1.5 border-t border-zinc-900 flex flex-col gap-1 text-[10px] font-mono text-zinc-400">
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">CORE MODEL:</span>
              <span className="text-cyan-300 font-semibold">Gemini Live</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">VOICE:</span>
              <span className="text-zinc-300">ARAVAN (Charon)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">AUDIO LATENCY:</span>
              <span className="text-emerald-400">~22 ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">MANDIBLE TMJ:</span>
              <span className="text-violet-300">REAL-TIME SYNC</span>
            </div>
          </div>
        </div>

        {/* QUICK ACTIONS Card */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase font-semibold px-1">
            QUICK ACTIONS
          </div>
          <div className="space-y-1.5">
            {quickActions.map((qa) => {
              const Icon = qa.icon;
              return (
                <button
                  key={qa.id}
                  onClick={() => onQuickAction(qa.url)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-950/60 hover:bg-zinc-900 border border-zinc-800/60 hover:border-zinc-700/80 text-xs text-zinc-300 transition-all duration-150 group"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-3.5 h-3.5 ${qa.color}`} />
                    <span className="group-hover:text-white transition-colors">{qa.label}</span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom: Creator Profile Badge */}
      <div className="pt-4 border-t border-zinc-900/80">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 hover:border-zinc-700/60 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-violet-600 p-0.5 flex items-center justify-center shadow-md">
              <div className="w-full h-full bg-zinc-950 rounded-full flex items-center justify-center font-bold text-xs text-cyan-300">
                JP
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-200">Jayom Panchal</div>
              <div className="text-[10px] font-mono text-cyan-400">Creator</div>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
        </div>
      </div>
    </aside>
  );
};
