import React from 'react';
import { X, Info, Shield, Sparkles, Heart } from 'lucide-react';
import { SkullIcon } from './SkullIcon';
import { ARAVAN_VOICE, LIVE_MODEL_NAME } from '../config/voice';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 text-zinc-100 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-600/30 border border-cyan-500/40 p-1 flex items-center justify-center shadow-lg shadow-cyan-950/40">
              <SkullIcon className="w-6 h-6 text-cyan-400" glow />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wide">ABOUT ARAVAN</h2>
              <p className="text-xs text-zinc-400">Masculine Conversational AI Companion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Details Card */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Assistant:</span>
              <span className="font-semibold text-zinc-200">ARAVAN</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Built by:</span>
              <span className="font-semibold text-cyan-300">Jayom Panchal</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Voice Pipeline:</span>
              <span className="font-mono text-violet-300">Gemini Live ({ARAVAN_VOICE})</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Model:</span>
              <span className="font-mono text-amber-300">{LIVE_MODEL_NAME}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Audio Pipeline:</span>
              <span className="font-mono text-zinc-300">PCM16 16kHz in → PCM 24kHz out</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Voice Fallback:</span>
              <span className="font-mono text-rose-400">DISABLED (Strict masculine voice)</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 space-y-2">
            <div className="text-xs font-semibold text-zinc-300">Technology Stack</div>
            <div className="flex flex-wrap gap-2 pt-1">
              {['Gemini Live API', 'Web Audio API', 'React', 'TypeScript', 'Tailwind CSS', 'Vite', 'IndexedDB Memory'].map((tech) => (
                <span
                  key={tech}
                  className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-300"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
          <span>&copy; Jayom Panchal. All rights reserved.</span>
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
