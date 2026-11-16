import React from 'react';
import { X, Wrench, Globe, Clock, Brain, Trash2, Search, ExternalLink, Sparkles, Shield } from 'lucide-react';

interface ToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenWebsite: (url: string) => void;
}

export const ToolsModal: React.FC<ToolsModalProps> = ({ isOpen, onClose, onOpenWebsite }) => {
  if (!isOpen) return null;

  const tools = [
    {
      name: 'openWebsite',
      description: 'Opens any public website requested by the user in a safe browser tab with URL normalization.',
      icon: Globe,
      color: 'text-cyan-400',
      status: 'Active',
      example: '"Open YouTube", "Open Google", "Open Spotify"',
    },
    {
      name: 'rememberFact',
      description: "Saves facts, user preferences, project details, and identity notes into ARAVAN's permanent long-term memory.",
      icon: Brain,
      color: 'text-emerald-400',
      status: 'Active',
      example: '"Remember that I like dark interfaces."',
    },
    {
      name: 'forgetFact',
      description: 'Removes or forgets memories related to a given subject on command.',
      icon: Trash2,
      color: 'text-rose-400',
      status: 'Active',
      example: '"Forget my dark theme preference."',
    },
    {
      name: 'setSkullColor',
      description: 'Changes the 3D holographic skull glow color, eye lights, synaptic wireframe, floor rings, and UI accents uniformly to any of 10 cyber neon themes.',
      icon: Sparkles,
      color: 'text-rose-400',
      status: 'Active',
      example: '"Change color to red", "Make the skull glow green", "Set color to amber"',
    },
    {
      name: 'searchMemory',
      description: "Searches ARAVAN's persistent memory storage for specific stored facts, user preferences, project details, or topics.",
      icon: Search,
      color: 'text-amber-400',
      status: 'Active',
      example: '"What do you remember about my project?", "Check memory for my preferences"',
    },
    {
      name: 'listMemories',
      description: "Retrieves and lists stored memories and knowledge across sessions according to user wishes.",
      icon: Brain,
      color: 'text-cyan-400',
      status: 'Active',
      example: '"What memories do you have saved?", "List all my saved facts"',
    },
    {
      name: 'setGlowLevel',
      description: "Controls the 3D holographic wireframe skull's neon glow intensity, synaptic radiance, and bloom effects across 5 modes ('dim', 'normal', 'surge', 'hyper', 'off').",
      icon: Sparkles,
      color: 'text-violet-400',
      status: 'Active',
      example: '"Set glow to hyper", "Dim the skull glow", "Glow level surge"',
    },
    {
      name: 'setMicListeningPolicy',
      description: 'Configures echo-shielding to stop listening to the microphone during speech replies to prevent feedback loops, self-interruption, or hearing its own voice.',
      icon: Shield,
      color: 'text-cyan-400',
      status: 'Active',
      example: '"Stop listening during replies", "Disable mic during speech"',
    },
    {
      name: 'get_current_time',
      description: 'Returns real-time date, time, day, and timezone information (defaults to Asia/Kolkata / India IST and supports world cities).',
      icon: Clock,
      color: 'text-amber-400',
      status: 'Active',
      example: '"What time is it?", "Abhi kitne baje hain?", "Time in London"',
    },
    {
      name: 'searchWeb',
      description: 'Search architecture for real-time web discovery.',
      icon: Search,
      color: 'text-blue-400',
      status: 'Ready',
      example: '"Search for latest space discoveries"',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 text-zinc-100 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-950/60 border border-violet-500/40 text-violet-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wide">ARAVAN Tools & Capabilities</h2>
              <p className="text-xs text-zinc-400">Modular tool architecture executed in real-time</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tools List */}
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {tools.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.name}
                className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2 hover:border-zinc-700/80 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${t.color}`} />
                    <span className="font-mono text-sm font-semibold text-zinc-200">{t.name}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                    {t.status}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{t.description}</p>
                <div className="text-[11px] font-mono text-zinc-500">
                  <span className="text-zinc-400">Voice prompt: </span>
                  <span className="text-cyan-300">{t.example}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
          <span>Safe execution under browser security policies.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
