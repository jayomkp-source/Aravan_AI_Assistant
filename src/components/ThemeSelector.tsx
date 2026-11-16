import React from 'react';
import { useTheme, THEME_PRESETS } from '../context/ThemeContext';
import skullImage from '../assets/images/aravan_skull_core_1790922135848.jpg';
import { Check } from 'lucide-react';

export const ThemeSelector: React.FC = () => {
  const { currentTheme, setTheme, applyTargets, toggleApplyTarget } = useTheme();

  const previewList = [
    { id: 'electric-blue', label: 'Electric Blue', hue: 0, border: 'border-cyan-500/40' },
    { id: 'emerald', label: 'Matrix Emerald', hue: 240, border: 'border-emerald-500/40' },
    { id: 'crimson', label: 'Crimson Red', hue: 140, border: 'border-rose-500/40' },
    { id: 'ice-blue', label: 'Ice Blue', hue: -15, border: 'border-sky-500/40' },
    { id: 'amber', label: 'Golden Amber', hue: 180, border: 'border-amber-500/40' },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto mt-6 p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-xl shadow-2xl flex flex-col lg:flex-row items-stretch gap-4 select-none">
      {/* 1. Color Scheme Swatches */}
      <div className="flex-1 p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/60 flex flex-col justify-between">
        <div className="text-[11px] font-mono tracking-wider text-zinc-400 uppercase font-semibold mb-3 flex items-center justify-between">
          <span>CHANGE THEME / COLOR SCHEME</span>
          <span className="text-xs font-sans text-cyan-400 font-medium">{currentTheme.name}</span>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2.5">
          {THEME_PRESETS.map((t) => {
            const isSelected = t.id === currentTheme.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                title={t.name}
                className="group relative flex flex-col items-center focus:outline-none"
              >
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                    isSelected
                      ? 'scale-110 shadow-[0_0_14px_rgba(255,255,255,0.4)] ring-2 ring-white/80'
                      : 'hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: t.accent }}
                >
                  {isSelected && <Check className="w-4 h-4 text-zinc-950 stroke-[3]" />}
                </div>
                {/* Glowing indicator line under selected color */}
                {isSelected && (
                  <div
                    className="w-4 h-1 rounded-full mt-1.5 shadow-[0_0_8px_currentColor]"
                    style={{ backgroundColor: t.accent }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Apply To Target Toggles */}
      <div className="w-full lg:w-64 p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/60 flex flex-col justify-between">
        <div className="text-[11px] font-mono tracking-wider text-zinc-400 uppercase font-semibold mb-3">
          APPLY TO
        </div>
        <div className="flex items-center gap-2">
          {(['background', 'accents', 'glow'] as const).map((target) => {
            const isActive = applyTargets[target];
            const labels = { background: 'Background', accents: 'UI Accents', glow: 'Glow' };
            return (
              <button
                key={target}
                onClick={() => toggleApplyTarget(target)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-200 border ${
                  isActive
                    ? 'bg-zinc-800/90 text-white border-zinc-700 shadow-sm'
                    : 'bg-zinc-950/40 text-zinc-500 border-zinc-800/60 hover:text-zinc-300'
                }`}
              >
                <span className="capitalize">{labels[target]}</span>
                {isActive && <span className="ml-1 text-[9px] text-cyan-400">●</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Live Skull Previews */}
      <div className="w-full lg:w-72 p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/60 flex flex-col justify-between">
        <div className="text-[11px] font-mono tracking-wider text-zinc-400 uppercase font-semibold mb-3">
          PREVIEWS
        </div>
        <div className="flex items-center justify-between gap-1.5">
          {previewList.map((p) => {
            const isSelected = p.id === currentTheme.id;
            return (
              <button
                key={p.id}
                onClick={() => setTheme(p.id)}
                title={`Switch to ${p.label}`}
                className={`relative w-11 h-11 rounded-lg overflow-hidden border transition-all duration-200 ${
                  isSelected ? 'border-cyan-400 scale-105 shadow-md shadow-cyan-900/40 ring-1 ring-cyan-400' : `${p.border} opacity-70 hover:opacity-100 hover:scale-105`
                }`}
              >
                <img
                  src={skullImage}
                  alt={p.label}
                  className="w-full h-full object-cover"
                  style={{ filter: `hue-rotate(${p.hue}deg)` }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
