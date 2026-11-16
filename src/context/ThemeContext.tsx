import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ThemePreset {
  id: string;
  name: string;
  accent: string;
  secondary: string;
  glow: string;
  hueRotate: number;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'cyber-green', name: 'Cyber Green (#00FF66)', accent: '#00FF66', secondary: '#00E5FF', glow: 'rgba(0, 255, 102, 0.45)', hueRotate: 120 },
  { id: 'electric-blue', name: 'Electric Blue', accent: '#00BFFF', secondary: '#7A2CFF', glow: 'rgba(0, 191, 255, 0.4)', hueRotate: 0 },
  { id: 'cyan', name: 'Cyber Cyan', accent: '#00E5FF', secondary: '#38BDF8', glow: 'rgba(0, 229, 255, 0.4)', hueRotate: -25 },
  { id: 'violet', name: 'Neon Violet', accent: '#7A2CFF', secondary: '#C026FF', glow: 'rgba(122, 44, 255, 0.4)', hueRotate: 45 },
  { id: 'magenta', name: 'Plasma Magenta', accent: '#C026FF', secondary: '#E052FF', glow: 'rgba(192, 38, 255, 0.4)', hueRotate: 80 },
  { id: 'crimson', name: 'Crimson Red', accent: '#EF4444', secondary: '#F97316', glow: 'rgba(239, 68, 68, 0.4)', hueRotate: 140 },
  { id: 'amber', name: 'Golden Amber', accent: '#F59E0B', secondary: '#EAB308', glow: 'rgba(245, 158, 11, 0.4)', hueRotate: 180 },
  { id: 'emerald', name: 'Matrix Emerald', accent: '#10B981', secondary: '#059669', glow: 'rgba(16, 185, 129, 0.4)', hueRotate: 240 },
  { id: 'teal', name: 'Deep Teal', accent: '#14B8A6', secondary: '#06B6D4', glow: 'rgba(20, 184, 166, 0.4)', hueRotate: 220 },
  { id: 'ice-blue', name: 'Ice Blue', accent: '#38BDF8', secondary: '#818CF8', glow: 'rgba(56, 189, 248, 0.4)', hueRotate: -15 },
];

export interface ApplyTargets {
  background: boolean;
  accents: boolean;
  glow: boolean;
}

interface ThemeContextType {
  currentTheme: ThemePreset;
  setTheme: (id: string) => void;
  applyTargets: ApplyTargets;
  toggleApplyTarget: (target: keyof ApplyTargets) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeId] = useState<string>(() => {
    try {
      return localStorage.getItem('aravan_theme') || 'cyber-green';
    } catch {
      return 'cyber-green';
    }
  });

  const [applyTargets, setApplyTargets] = useState<ApplyTargets>(() => {
    try {
      const saved = localStorage.getItem('aravan_theme_targets');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return { background: true, accents: true, glow: true };
  });

  const currentTheme = THEME_PRESETS.find((t) => t.id === themeId) || THEME_PRESETS[0];

  const setTheme = (id: string) => {
    setThemeId(id);
    try {
      localStorage.setItem('aravan_theme', id);
    } catch {
      // ignore
    }
  };

  const toggleApplyTarget = (target: keyof ApplyTargets) => {
    setApplyTargets((prev) => {
      const next = { ...prev, [target]: !prev[target] };
      try {
        localStorage.setItem('aravan_theme_targets', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  useEffect(() => {
    // Apply CSS variables to root
    const root = document.documentElement;
    root.style.setProperty('--aravan-accent', currentTheme.accent);
    root.style.setProperty('--aravan-secondary', currentTheme.secondary);
    root.style.setProperty('--aravan-glow', currentTheme.glow);
    root.style.setProperty('--aravan-hue-rotate', `${currentTheme.hueRotate}deg`);
  }, [currentTheme]);

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, applyTargets, toggleApplyTarget }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
