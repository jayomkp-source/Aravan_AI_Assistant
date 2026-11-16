/**
 * SkullControlsContext.tsx - Real-time Skull Glow, Animation & Aesthetics State
 *
 * - Controls: Master Glow, Eye Glow, Electric Glow, Purple Energy, Cyan Energy,
 *   Fog, Particles, Bloom, Talking Glow.
 * - Sliders 0-100%. Real-time immediate Three.js sync.
 * - Presets: CALM, DEFAULT, CYBER, POWER, ULTRA, NIGHT.
 * - Color Mix: Cyan, Purple, Blue, Magenta.
 * - Speeds: Energy Speed, Lightning Speed, Fog Speed, Particle Speed, Talking Reactivity, Cursor Follow Strength.
 * - Validated localStorage persistence for visual preferences only.
 * - RESET TO DEFAULT button restores reference appearance without resetting memory or voice.
 */

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { SkullControlSettings, GlowPresetName, GlowLevel } from '../types';
import { StateManager } from '../state/StateManager';

export const SKULL_CONTROLS_STORAGE_KEY = 'ARAVAN_SKULL_VISUAL_SETTINGS_V1';

const VALID_PRESETS: ReadonlySet<GlowPresetName> = new Set([
  'calm',
  'default',
  'cyber',
  'power',
  'ultra',
  'night',
  'custom',
]);

export const SKULL_PRESETS: Record<GlowPresetName, SkullControlSettings> = {
  default: {
    masterGlow: 75,
    eyeGlow: 80,
    electricGlow: 80,
    purpleEnergy: 65,
    cyanEnergy: 85,
    fog: 40,
    particles: 60,
    bloom: 70,
    talkingGlow: 75,
    colorMix: { cyan: 80, purple: 75, blue: 60, magenta: 50 },
    energySpeed: 50,
    lightningSpeed: 60,
    fogSpeed: 40,
    particleSpeed: 50,
    talkingReactivity: 80,
    cursorFollowStrength: 75,
    preset: 'default',
  },
  calm: {
    masterGlow: 30,
    eyeGlow: 40,
    electricGlow: 30,
    purpleEnergy: 30,
    cyanEnergy: 40,
    fog: 25,
    particles: 25,
    bloom: 25,
    talkingGlow: 40,
    colorMix: { cyan: 50, purple: 40, blue: 60, magenta: 20 },
    energySpeed: 25,
    lightningSpeed: 25,
    fogSpeed: 20,
    particleSpeed: 25,
    talkingReactivity: 40,
    cursorFollowStrength: 50,
    preset: 'calm',
  },
  cyber: {
    masterGlow: 85,
    eyeGlow: 95,
    electricGlow: 90,
    purpleEnergy: 35,
    cyanEnergy: 100,
    fog: 45,
    particles: 70,
    bloom: 80,
    talkingGlow: 85,
    colorMix: { cyan: 100, purple: 30, blue: 85, magenta: 40 },
    energySpeed: 65,
    lightningSpeed: 75,
    fogSpeed: 45,
    particleSpeed: 65,
    talkingReactivity: 85,
    cursorFollowStrength: 80,
    preset: 'cyber',
  },
  power: {
    masterGlow: 90,
    eyeGlow: 90,
    electricGlow: 95,
    purpleEnergy: 95,
    cyanEnergy: 90,
    fog: 50,
    particles: 85,
    bloom: 85,
    talkingGlow: 90,
    colorMix: { cyan: 85, purple: 100, blue: 70, magenta: 90 },
    energySpeed: 80,
    lightningSpeed: 85,
    fogSpeed: 60,
    particleSpeed: 80,
    talkingReactivity: 90,
    cursorFollowStrength: 85,
    preset: 'power',
  },
  ultra: {
    masterGlow: 100,
    eyeGlow: 100,
    electricGlow: 100,
    purpleEnergy: 100,
    cyanEnergy: 100,
    fog: 60,
    particles: 100,
    bloom: 95,
    talkingGlow: 100,
    colorMix: { cyan: 100, purple: 100, blue: 90, magenta: 100 },
    energySpeed: 100,
    lightningSpeed: 100,
    fogSpeed: 80,
    particleSpeed: 100,
    talkingReactivity: 100,
    cursorFollowStrength: 100,
    preset: 'ultra',
  },
  night: {
    masterGlow: 20,
    eyeGlow: 25,
    electricGlow: 20,
    purpleEnergy: 20,
    cyanEnergy: 25,
    fog: 15,
    particles: 15,
    bloom: 15,
    talkingGlow: 25,
    colorMix: { cyan: 40, purple: 30, blue: 50, magenta: 15 },
    energySpeed: 20,
    lightningSpeed: 20,
    fogSpeed: 15,
    particleSpeed: 20,
    talkingReactivity: 30,
    cursorFollowStrength: 40,
    preset: 'night',
  },
  custom: {
    masterGlow: 75,
    eyeGlow: 80,
    electricGlow: 80,
    purpleEnergy: 65,
    cyanEnergy: 85,
    fog: 40,
    particles: 60,
    bloom: 70,
    talkingGlow: 75,
    colorMix: { cyan: 80, purple: 75, blue: 60, magenta: 50 },
    energySpeed: 50,
    lightningSpeed: 60,
    fogSpeed: 40,
    particleSpeed: 50,
    talkingReactivity: 80,
    cursorFollowStrength: 75,
    preset: 'custom',
  },
};

function clampSlider(val: unknown, fallback: number): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
  return Math.max(0, Math.min(100, Math.round(val)));
}

/**
 * Validates and sanitizes persisted or partially-supplied skull control settings
 * so corrupted or out-of-range values never break the 3D renderer.
 */
export function sanitizeSkullControls(raw: unknown): SkullControlSettings {
  const def = SKULL_PRESETS.default;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...def, colorMix: { ...def.colorMix } };
  }
  const obj = raw as Record<string, unknown>;
  const rawMix =
    obj.colorMix && typeof obj.colorMix === 'object' && !Array.isArray(obj.colorMix)
      ? (obj.colorMix as Record<string, unknown>)
      : {};

  const presetCandidate = typeof obj.preset === 'string' ? (obj.preset as GlowPresetName) : def.preset;
  const preset: GlowPresetName = VALID_PRESETS.has(presetCandidate) ? presetCandidate : 'custom';

  return {
    masterGlow: clampSlider(obj.masterGlow, def.masterGlow),
    eyeGlow: clampSlider(obj.eyeGlow, def.eyeGlow),
    electricGlow: clampSlider(obj.electricGlow, def.electricGlow),
    purpleEnergy: clampSlider(obj.purpleEnergy, def.purpleEnergy),
    cyanEnergy: clampSlider(obj.cyanEnergy, def.cyanEnergy),
    fog: clampSlider(obj.fog, def.fog),
    particles: clampSlider(obj.particles, def.particles),
    bloom: clampSlider(obj.bloom, def.bloom),
    talkingGlow: clampSlider(obj.talkingGlow, def.talkingGlow),
    colorMix: {
      cyan: clampSlider(rawMix.cyan, def.colorMix.cyan),
      purple: clampSlider(rawMix.purple, def.colorMix.purple),
      blue: clampSlider(rawMix.blue, def.colorMix.blue),
      magenta: clampSlider(rawMix.magenta, def.colorMix.magenta),
    },
    energySpeed: clampSlider(obj.energySpeed, def.energySpeed),
    lightningSpeed: clampSlider(obj.lightningSpeed, def.lightningSpeed),
    fogSpeed: clampSlider(obj.fogSpeed, def.fogSpeed),
    particleSpeed: clampSlider(obj.particleSpeed, def.particleSpeed),
    talkingReactivity: clampSlider(obj.talkingReactivity, def.talkingReactivity),
    cursorFollowStrength: clampSlider(obj.cursorFollowStrength, def.cursorFollowStrength),
    preset,
  };
}

export function mapGlowLevelToSkullSettings(
  level: GlowLevel,
  current: SkullControlSettings
): SkullControlSettings {
  switch (level) {
    case 'dim':
      return { ...SKULL_PRESETS.calm, colorMix: { ...SKULL_PRESETS.calm.colorMix }, preset: 'calm' };
    case 'normal':
      return { ...SKULL_PRESETS.default, colorMix: { ...SKULL_PRESETS.default.colorMix }, preset: 'default' };
    case 'surge':
      return { ...SKULL_PRESETS.power, colorMix: { ...SKULL_PRESETS.power.colorMix }, preset: 'power' };
    case 'hyper':
      return { ...SKULL_PRESETS.ultra, colorMix: { ...SKULL_PRESETS.ultra.colorMix }, preset: 'ultra' };
    case 'off':
      return {
        ...current,
        colorMix: { ...current.colorMix },
        masterGlow: 0,
        eyeGlow: 0,
        electricGlow: 0,
        purpleEnergy: 0,
        cyanEnergy: 0,
        bloom: 0,
        talkingGlow: 0,
        preset: 'custom',
      };
    default:
      return current;
  }
}

interface SkullControlsContextType {
  controls: SkullControlSettings;
  updateControl: <K extends keyof SkullControlSettings>(key: K, value: SkullControlSettings[K]) => void;
  updateColorMix: (channel: keyof SkullControlSettings['colorMix'], value: number) => void;
  applyPreset: (name: GlowPresetName) => void;
  resetToDefault: () => void;
}

const SkullControlsContext = createContext<SkullControlsContextType | null>(null);

export const SkullControlsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [controls, setControls] = useState<SkullControlSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(SKULL_CONTROLS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          return sanitizeSkullControls(parsed);
        }
      } catch (err) {
        console.warn('[SkullControls] Failed to load cached settings, falling back to default:', err);
      }
    }
    return { ...SKULL_PRESETS.default, colorMix: { ...SKULL_PRESETS.default.colorMix } };
  });

  // Save validated settings to localStorage and sync diagnostics telemetry
  useEffect(() => {
    try {
      localStorage.setItem(SKULL_CONTROLS_STORAGE_KEY, JSON.stringify(controls));
    } catch {
      // ignore storage quota errors
    }

    StateManager.getInstance().updateGlowDiagnostics({
      activePreset: controls.preset,
      masterGlow: controls.masterGlow,
      eyeGlow: controls.eyeGlow,
      electricGlow: controls.electricGlow,
      bloom: controls.bloom,
      fog: controls.fog,
      particles: controls.particles,
    });
  }, [controls]);

  // Keep Glow Control Panel synchronized with voice commands ('setGlowLevel')
  useEffect(() => {
    const onVoiceGlowChange = (event: Event) => {
      const detail = (event as CustomEvent<{ level?: GlowLevel }>).detail;
      if (!detail?.level) return;
      setControls((prev) => mapGlowLevelToSkullSettings(detail.level!, prev));
    };
    window.addEventListener('aravan:glow_level', onVoiceGlowChange);
    return () => window.removeEventListener('aravan:glow_level', onVoiceGlowChange);
  }, []);

  const updateControl = useCallback(
    <K extends keyof SkullControlSettings>(key: K, value: SkullControlSettings[K]) => {
      setControls((prev) => {
        if (key === 'preset') {
          const nextPreset = VALID_PRESETS.has(value as GlowPresetName)
            ? (value as GlowPresetName)
            : 'custom';
          return { ...prev, preset: nextPreset };
        }
        if (key === 'colorMix' && value && typeof value === 'object') {
          const mix = value as SkullControlSettings['colorMix'];
          return {
            ...prev,
            colorMix: {
              cyan: clampSlider(mix.cyan, prev.colorMix.cyan),
              purple: clampSlider(mix.purple, prev.colorMix.purple),
              blue: clampSlider(mix.blue, prev.colorMix.blue),
              magenta: clampSlider(mix.magenta, prev.colorMix.magenta),
            },
            preset: 'custom',
          };
        }
        return {
          ...prev,
          [key]: clampSlider(value, Number(prev[key]) || 0),
          preset: 'custom',
        };
      });
    },
    []
  );

  const updateColorMix = useCallback(
    (channel: keyof SkullControlSettings['colorMix'], value: number) => {
      setControls((prev) => ({
        ...prev,
        colorMix: {
          ...prev.colorMix,
          [channel]: clampSlider(value, prev.colorMix[channel]),
        },
        preset: 'custom',
      }));
    },
    []
  );

  const applyPreset = useCallback((name: GlowPresetName) => {
    const presetConfig = SKULL_PRESETS[name] || SKULL_PRESETS.default;
    setControls({
      ...presetConfig,
      colorMix: { ...presetConfig.colorMix },
      preset: name,
    });
    const presetToGlowLevel: Record<GlowPresetName, GlowLevel> = {
      calm: 'dim',
      night: 'dim',
      default: 'normal',
      cyber: 'surge',
      power: 'surge',
      ultra: 'hyper',
      custom: 'surge',
    };
    StateManager.getInstance().setGlowLevel(presetToGlowLevel[name] || 'normal');
  }, []);

  const resetToDefault = useCallback(() => {
    setControls({
      ...SKULL_PRESETS.default,
      colorMix: { ...SKULL_PRESETS.default.colorMix },
      preset: 'default',
    });
    StateManager.getInstance().setGlowLevel('normal');
    try {
      localStorage.setItem(SKULL_CONTROLS_STORAGE_KEY, JSON.stringify(SKULL_PRESETS.default));
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo(
    () => ({
      controls,
      updateControl,
      updateColorMix,
      applyPreset,
      resetToDefault,
    }),
    [controls, updateControl, updateColorMix, applyPreset, resetToDefault]
  );

  return <SkullControlsContext.Provider value={value}>{children}</SkullControlsContext.Provider>;
};

export function useSkullControls(): SkullControlsContextType {
  const context = useContext(SkullControlsContext);
  if (!context) {
    throw new Error('useSkullControls must be used within a SkullControlsProvider');
  }
  return context;
}
