/**
 * SkullControlModal.tsx - Futuristic Glass Holographic Skull Control Console
 *
 * Section 65-70, 82-83:
 * - Real-time sliders: Master Glow, Eye Glow, Electric Glow, Purple Energy, Cyan Energy,
 *   Fog, Particles, Bloom, Talking Glow.
 * - Quick Presets: CALM, DEFAULT, CYBER, POWER, ULTRA, NIGHT.
 * - Color Mix: Cyan, Purple, Blue, Magenta.
 * - Animation Speeds: Energy Speed, Lightning Speed, Fog Speed, Particle Speed,
 *   Talking Reactivity, Cursor Follow Strength.
 * - RESET TO DEFAULT button restores reference appearance.
 */

import React, { useState } from 'react';
import { useSkullControls } from '../context/SkullControlsContext';
import { GlowPresetName } from '../types';
import {
  Sliders,
  Sparkles,
  Zap,
  Eye,
  Activity,
  RotateCcw,
  X,
  Gauge,
  Palette,
  Wind,
  Flame,
} from 'lucide-react';

interface SkullControlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SkullControlModal: React.FC<SkullControlModalProps> = ({ isOpen, onClose }) => {
  const { controls, updateControl, updateColorMix, applyPreset, resetToDefault } = useSkullControls();
  const [activeTab, setActiveTab] = useState<'glow' | 'colors' | 'dynamics'>('glow');

  if (!isOpen) return null;

  const presets: { id: GlowPresetName; label: string; desc: string }[] = [
    { id: 'default', label: 'DEFAULT', desc: 'Reference cinematic balance' },
    { id: 'calm', label: 'CALM', desc: 'Low glow, calm particles' },
    { id: 'cyber', label: 'CYBER', desc: 'Cyan-heavy electric aura' },
    { id: 'power', label: 'POWER', desc: 'High purple/cyan energy' },
    { id: 'ultra', label: 'ULTRA', desc: 'Maximum visual intensity' },
    { id: 'night', label: 'NIGHT', desc: 'Subtle stealth lumination' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-2xl bg-zinc-950/90 border border-violet-500/40 rounded-3xl shadow-[0_0_50px_rgba(122,44,255,0.25)] backdrop-blur-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Futuristic Top Header Bar */}
        <div className="px-6 py-4 border-b border-zinc-800/80 bg-gradient-to-r from-violet-950/50 via-zinc-950/80 to-cyan-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-400 shadow-lg shadow-violet-950/50">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-wider text-white uppercase">
                  SKULL CONTROL
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-violet-950/80 border border-violet-500/50 text-violet-300">
                  REAL-TIME
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono">
                Cinematic luminescence, energy physics & color mix console
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetToDefault}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300 hover:text-white text-xs font-mono transition-all"
              title="Restore reference skull visual appearance"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>RESET</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Glow Presets Quick Selector Bar (Section 67) */}
        <div className="px-6 py-3 bg-zinc-950/60 border-b border-zinc-900 flex items-center gap-2 overflow-x-auto scrollbar-thin">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest shrink-0 font-semibold">
            PRESETS:
          </span>
          {presets.map((p) => {
            const isActive = controls.preset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                className={`px-3 py-1 rounded-xl text-xs font-mono font-bold tracking-wide transition-all shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/30 to-violet-500/30 border border-cyan-400/60 text-cyan-200 shadow-md shadow-cyan-950/40'
                    : 'bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
                title={p.desc}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Console Section Navigation Tabs */}
        <div className="px-6 pt-3 flex items-center gap-3 border-b border-zinc-900 text-xs font-mono">
          <button
            onClick={() => setActiveTab('glow')}
            className={`pb-2.5 font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'glow'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>LUMINESCENCE & BLOOM</span>
          </button>

          <button
            onClick={() => setActiveTab('colors')}
            className={`pb-2.5 font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'colors'
                ? 'border-violet-400 text-violet-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>COLOR MIX BALANCE</span>
          </button>

          <button
            onClick={() => setActiveTab('dynamics')}
            className={`pb-2.5 font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'dynamics'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>SPEEDS & DYNAMICS</span>
          </button>
        </div>

        {/* Sliders Container with Custom Glass Styling */}
        <div className="p-6 overflow-y-auto space-y-5 scrollbar-thin">
          {/* TAB 1: LUMINESCENCE & BLOOM */}
          {activeTab === 'glow' && (
            <div className="space-y-4">
              <SliderRow
                label="MASTER GLOW"
                value={controls.masterGlow}
                onChange={(v) => updateControl('masterGlow', v)}
                accentColor="cyan"
                description="Global neon emissive intensity across all cranium and brain elements"
              />

              <SliderRow
                label="EYE GLOW"
                value={controls.eyeGlow}
                onChange={(v) => updateControl('eyeGlow', v)}
                accentColor="cyan"
                description="Bilateral cyber vortex eye PointLight illumination & pupil brightness"
              />

              <SliderRow
                label="ELECTRIC GLOW"
                value={controls.electricGlow}
                onChange={(v) => updateControl('electricGlow', v)}
                accentColor="violet"
                description="Cranial suture fissure lightning and fine wireframe contour intensity"
              />

              <SliderRow
                label="PURPLE ENERGY"
                value={controls.purpleEnergy}
                onChange={(v) => updateControl('purpleEnergy', v)}
                accentColor="violet"
                description="Secondary deep-violet quantum brain energy core radiation"
              />

              <SliderRow
                label="CYAN ENERGY"
                value={controls.cyanEnergy}
                onChange={(v) => updateControl('cyanEnergy', v)}
                accentColor="cyan"
                description="Electric cyan rim highlights and frontal vortex glow"
              />

              <SliderRow
                label="BLOOM POST-PROCESSING"
                value={controls.bloom}
                onChange={(v) => updateControl('bloom', v)}
                accentColor="violet"
                description="Optical neon lens diffusion and cinematic atmospheric glare"
              />

              <SliderRow
                label="TALKING GLOW BOOST"
                value={controls.talkingGlow}
                onChange={(v) => updateControl('talkingGlow', v)}
                accentColor="emerald"
                description="Luminance surge multiplier during active speech vocalization"
              />

              <SliderRow
                label="PARTICLE DENSITY"
                value={controls.particles}
                onChange={(v) => updateControl('particles', v)}
                accentColor="cyan"
                description="Floating 3D holographic quantum dust and neural spark opacity"
              />

              <SliderRow
                label="FOG DENSITY"
                value={controls.fog}
                onChange={(v) => updateControl('fog', v)}
                accentColor="violet"
                description="Atmospheric depth fog around holographic emitter perimeter"
              />
            </div>
          )}

          {/* TAB 2: COLOR MIX BALANCE (Section 68) */}
          {activeTab === 'colors' && (
            <div className="space-y-5">
              <p className="text-xs text-zinc-400 font-mono">
                Fine-tune the spectral color balance. The skull remains recognizable, cinematic, and harmonious.
              </p>

              <SliderRow
                label="CYAN RATIO"
                value={controls.colorMix.cyan}
                onChange={(v) => updateColorMix('cyan', v)}
                accentColor="cyan"
                description="Dominance of electric cyan in wireframes and eye iris vortexes"
              />

              <SliderRow
                label="PURPLE RATIO"
                value={controls.colorMix.purple}
                onChange={(v) => updateColorMix('purple', v)}
                accentColor="violet"
                description="Dominance of deep violet in internal brain hemispheres and ambient rim"
              />

              <SliderRow
                label="BLUE SPECTRUM"
                value={controls.colorMix.blue}
                onChange={(v) => updateColorMix('blue', v)}
                accentColor="cyan"
                description="Subtle cool blue undertone on translucent dark cranium glass"
              />

              <SliderRow
                label="MAGENTA ACCENT"
                value={controls.colorMix.magenta}
                onChange={(v) => updateColorMix('magenta', v)}
                accentColor="pink"
                description="Nasal bone bridge accent (#FF2A6D) and chromatic fringe"
              />
            </div>
          )}

          {/* TAB 3: SPEEDS & DYNAMICS (Section 69) */}
          {activeTab === 'dynamics' && (
            <div className="space-y-4">
              <SliderRow
                label="ENERGY SPEED"
                value={controls.energySpeed}
                onChange={(v) => updateControl('energySpeed', v)}
                accentColor="cyan"
                description="Forehead vortex swirl & brain pulse cycle rate"
              />

              <SliderRow
                label="LIGHTNING SPEED"
                value={controls.lightningSpeed}
                onChange={(v) => updateControl('lightningSpeed', v)}
                accentColor="violet"
                description="Cranial fissure lightning and floor ring spin frequency"
              />

              <SliderRow
                label="PARTICLE DRIFT SPEED"
                value={controls.particleSpeed}
                onChange={(v) => updateControl('particleSpeed', v)}
                accentColor="cyan"
                description="Ascending vertical float velocity of quantum data sparks"
              />

              <SliderRow
                label="FOG VELOCITY"
                value={controls.fogSpeed}
                onChange={(v) => updateControl('fogSpeed', v)}
                accentColor="violet"
                description="Breathing rhythm of atmospheric ambient haze"
              />

              <SliderRow
                label="TALKING REACTIVITY"
                value={controls.talkingReactivity}
                onChange={(v) => updateControl('talkingReactivity', v)}
                accentColor="emerald"
                description="Mandible TMJ jaw articulation responsiveness to audio waveforms"
              />

              <SliderRow
                label="CURSOR FOLLOW STRENGTH"
                value={controls.cursorFollowStrength}
                onChange={(v) => updateControl('cursorFollowStrength', v)}
                accentColor="cyan"
                description="Skull yaw & pitch damping sensitivity toward mouse pointer"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-zinc-950/80 border-t border-zinc-900 flex items-center justify-between text-xs font-mono">
          <span className="text-zinc-500">All adjustments apply in real-time without reload</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold transition-all shadow-md shadow-violet-950/50"
          >
            CONFIRM SETTINGS
          </button>
        </div>
      </div>
    </div>
  );
};

interface SliderRowProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  accentColor?: 'cyan' | 'violet' | 'emerald' | 'pink';
  description?: string;
}

const SliderRow: React.FC<SliderRowProps> = ({
  label,
  value,
  onChange,
  accentColor = 'cyan',
  description,
}) => {
  const colorClasses = {
    cyan: 'accent-cyan-400 text-cyan-300',
    violet: 'accent-violet-500 text-violet-300',
    emerald: 'accent-emerald-400 text-emerald-300',
    pink: 'accent-pink-400 text-pink-300',
  }[accentColor];

  return (
    <div className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-850 hover:border-zinc-800 transition-colors space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-mono font-bold tracking-wide text-zinc-200 uppercase">
          {label}
        </label>
        <span className={`text-xs font-mono font-extrabold ${colorClasses}`}>
          {value}%
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer ${colorClasses}`}
      />

      {description && (
        <p className="text-[10px] text-zinc-500 font-mono leading-tight">{description}</p>
      )}
    </div>
  );
};
