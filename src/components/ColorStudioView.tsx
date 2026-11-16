/**
 * ColorStudioView.tsx - Dedicated Organized Color & Glow Customization Hub
 * 
 * Provides an easy-to-find, dedicated space for:
 * - 10 Cyber color schemes with real-time skull glow sync
 * - 5 Glow intensity levels (Dim, Normal, Surge, Hyper, Off)
 * - 3D Render modes (Wireframe, Shaded Glass, Synaptic Points)
 * - Apply targets (Skull, UI Accents, Atmospheric Background)
 * - Live holographic previews
 */

import React from 'react';
import { useTheme, THEME_PRESETS, ThemePreset } from '../context/ThemeContext';
import skullImage from '../assets/images/aravan_skull_core_1790922135848.jpg';
import { Check, Sparkles, Flame, Eye, Layers, Palette, RefreshCw, Wand2 } from 'lucide-react';
import { GlowLevel } from '../types';

interface ColorStudioViewProps {
  glowLevel: GlowLevel;
  onGlowLevelChange: (level: GlowLevel) => void;
  onSelectAction?: (prompt: string) => void;
}

export const ColorStudioView: React.FC<ColorStudioViewProps> = ({
  glowLevel,
  onGlowLevelChange,
  onSelectAction,
}) => {
  const { currentTheme, setTheme, applyTargets, toggleApplyTarget } = useTheme();

  const GLOW_LEVELS: { id: GlowLevel; label: string; desc: string; icon: React.ElementType }[] = [
    { id: 'dim', label: 'Dim', desc: 'Stealth low-light mode', icon: Eye },
    { id: 'normal', label: 'Normal', desc: 'Balanced neon luminance', icon: Sparkles },
    { id: 'surge', label: 'Surge', desc: 'High synaptic radiance', icon: Sparkles },
    { id: 'hyper', label: 'Hyper', desc: 'Maximum bloom & energy', icon: Flame },
    { id: 'off', label: 'Off', desc: 'Minimal stealth outline', icon: Eye },
  ];

  const handleSelectTheme = (preset: ThemePreset) => {
    setTheme(preset.id);
    if (onSelectAction) {
      onSelectAction(`Change skull glow color to ${preset.name}`);
    }
  };

  const previewList = [
    { id: 'electric-blue', label: 'Electric Blue', hue: 0, border: 'border-cyan-500/40' },
    { id: 'emerald', label: 'Matrix Emerald', hue: 240, border: 'border-emerald-500/40' },
    { id: 'crimson', label: 'Crimson Red', hue: 140, border: 'border-rose-500/40' },
    { id: 'ice-blue', label: 'Ice Blue', hue: -15, border: 'border-sky-500/40' },
    { id: 'amber', label: 'Golden Amber', hue: 180, border: 'border-amber-500/40' },
  ];

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
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <span>COLOR & GLOW STUDIO</span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full border bg-zinc-900 font-semibold"
                style={{ borderColor: currentTheme.accent, color: currentTheme.accent }}
              >
                {currentTheme.name}
              </span>
            </h2>
            <p className="text-xs text-zinc-400 font-medium">
              Configure holographic neon luminescence, cranial wireframe colors, and cosmic galaxy backdrop.
            </p>
          </div>
        </div>

        {/* Quick Voice Command Chip */}
        <button
          onClick={() => onSelectAction && onSelectAction('Randomize skull glow color and theme')}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 text-xs font-mono text-zinc-300 hover:text-white transition-all shadow-md shrink-0"
          title="Tell ARAVAN to cycle colors"
        >
          <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>Randomize Aura</span>
        </button>
      </div>

      {/* 2. Color Scheme Grid (All 10 Presets with Rich Cards) */}
      <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-xl shadow-2xl space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
            CHOOSE CYBER COLOR SCHEME
          </span>
          <span className="text-[11px] font-mono text-zinc-400">
            Click to illuminate 3D skull, eyes & galaxy
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {THEME_PRESETS.map((preset) => {
            const isSelected = preset.id === currentTheme.id;
            return (
              <button
                key={preset.id}
                onClick={() => handleSelectTheme(preset)}
                className={`p-3 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between space-y-2 group ${
                  isSelected
                    ? 'bg-zinc-850/90 border-white text-white shadow-xl ring-2'
                    : 'bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
                style={isSelected ? { ringColor: `${preset.accent}80` } : undefined}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="w-6 h-6 rounded-full border border-white/30 flex items-center justify-center shadow-md transition-transform group-hover:scale-110"
                    style={{ backgroundColor: preset.accent }}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-zinc-950 stroke-[3]" />}
                  </div>
                  <div
                    className="w-3 h-3 rounded-full border border-white/20"
                    style={{ backgroundColor: preset.secondary }}
                    title={`Secondary: ${preset.secondary}`}
                  />
                </div>
                <div>
                  <div className="text-xs font-bold font-sans text-zinc-100 truncate">
                    {preset.name.replace(/\s*\(#.*\)/, '')}
                  </div>
                  <div className="text-[10px] font-mono text-zinc-400 flex items-center justify-between">
                    <span>{preset.accent}</span>
                    {isSelected && <span className="text-cyan-400 font-bold">ACTIVE</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Glow Intensity Spectrum & Apply To Targets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Glow Intensity Levels */}
        <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-xl shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>GLOW INTENSITY SPECTRUM</span>
            </span>
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-zinc-900 font-bold uppercase"
              style={{ borderColor: currentTheme.accent, color: currentTheme.accent }}
            >
              {glowLevel}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {GLOW_LEVELS.map((level) => {
              const isSelected = glowLevel === level.id;
              const Icon = level.icon;
              return (
                <button
                  key={level.id}
                  onClick={() => onGlowLevelChange(level.id)}
                  className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center space-y-1 ${
                    isSelected
                      ? 'bg-zinc-800 border-white text-white shadow-lg ring-1 ring-white/60'
                      : 'bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Icon
                    className="w-4 h-4"
                    style={isSelected ? { color: currentTheme.accent } : undefined}
                  />
                  <span className="text-xs font-mono font-bold capitalize">{level.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-zinc-400 font-sans">
            Modulates bloom passes, synaptic core point lights, and cranium vertex radiance.
          </p>
        </div>

        {/* Apply Targets */}
        <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-xl shadow-2xl space-y-3">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>COLOR APPLICATION TARGETS</span>
          </span>

          <div className="grid grid-cols-3 gap-2">
            {(['glow', 'accents', 'background'] as const).map((target) => {
              const isActive = applyTargets[target];
              const labels = { glow: 'Skull & Galaxy', accents: 'UI Accents', background: 'Atmosphere' };
              return (
                <button
                  key={target}
                  onClick={() => toggleApplyTarget(target)}
                  className={`py-3 px-2 rounded-xl text-xs font-medium transition-all border flex flex-col items-center justify-center space-y-1 ${
                    isActive
                      ? 'bg-zinc-800 text-white border-zinc-700 shadow-md ring-1 ring-cyan-500/40'
                      : 'bg-zinc-900/40 text-zinc-500 border-zinc-800 hover:text-zinc-300'
                  }`}
                >
                  <span className="font-semibold text-center">{labels[target]}</span>
                  <span className={`text-[10px] font-mono ${isActive ? 'text-cyan-400 font-bold' : 'text-zinc-600'}`}>
                    {isActive ? 'ENABLED' : 'OFF'}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-zinc-400 font-sans">
            Toggle which parts of the interface receive the chosen color scheme.
          </p>
        </div>
      </div>

      {/* 4. Live Previews Strip */}
      <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-xl shadow-2xl space-y-3">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
          QUICK THEME PREVIEWS
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {previewList.map((p) => {
            const isSelected = p.id === currentTheme.id;
            return (
              <button
                key={p.id}
                onClick={() => setTheme(p.id)}
                className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-zinc-850 border-cyan-400 shadow-md ring-1 ring-cyan-400'
                    : `${p.border} bg-zinc-900/50 opacity-80 hover:opacity-100 hover:scale-[1.02]`
                }`}
              >
                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-white/20">
                  <img
                    src={skullImage}
                    alt={p.label}
                    className="w-full h-full object-cover"
                    style={{ filter: `hue-rotate(${p.hue}deg)` }}
                  />
                </div>
                <div className="text-left min-w-0 flex-1 truncate">
                  <div className="text-xs font-semibold text-zinc-200 truncate">{p.label}</div>
                  <div className="text-[10px] font-mono text-zinc-500">Preset</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
