import React, { useEffect, useState } from 'react';
import { Globe, Brain, CheckCircle2, AlertTriangle, ExternalLink, X } from 'lucide-react';

export interface ActionHudEvent {
  id: string;
  type: 'website_opening' | 'website_opened' | 'website_failed' | 'memory_stored';
  title: string;
  detail?: string;
  url?: string;
}

interface ActionHudToastProps {
  event?: ActionHudEvent | null;
  onDismiss?: () => void;
}

export const ActionHudToast: React.FC<ActionHudToastProps> = ({ event: propEvent, onDismiss }) => {
  const [activeEvent, setActiveEvent] = useState<ActionHudEvent | null>(propEvent || null);

  useEffect(() => {
    if (propEvent) {
      setActiveEvent(propEvent);
    }
  }, [propEvent]);

  // Global listener for action HUD events dispatched across the app
  useEffect(() => {
    const handleGlobalHud = (e: Event) => {
      const custom = e as CustomEvent<ActionHudEvent>;
      if (custom.detail) {
        setActiveEvent(custom.detail);
      }
    };

    window.addEventListener('aravan:action_hud', handleGlobalHud);
    return () => window.removeEventListener('aravan:action_hud', handleGlobalHud);
  }, []);

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (!activeEvent) return;
    const timer = setTimeout(() => {
      setActiveEvent(null);
      onDismiss?.();
    }, 6000);
    return () => clearTimeout(timer);
  }, [activeEvent, onDismiss]);

  if (!activeEvent) return null;

  const isMemory = activeEvent.type === 'memory_stored';
  const isFailed = activeEvent.type === 'website_failed';
  const isSuccess = activeEvent.type === 'website_opened';

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-fade-in pointer-events-auto select-none max-w-[92vw] sm:max-w-md">
      <div
        className={`px-4 py-2.5 rounded-2xl border backdrop-blur-2xl shadow-2xl flex items-center justify-between gap-3 font-mono text-xs transition-all ${
          isMemory
            ? 'bg-violet-950/90 border-violet-500/70 text-violet-200 shadow-violet-950/60 ring-1 ring-violet-500/30'
            : isFailed
            ? 'bg-amber-950/90 border-amber-500/70 text-amber-200 shadow-amber-950/60 ring-1 ring-amber-500/30'
            : isSuccess
            ? 'bg-emerald-950/90 border-emerald-500/70 text-emerald-200 shadow-emerald-950/60 ring-1 ring-emerald-500/30'
            : 'bg-cyan-950/90 border-cyan-500/70 text-cyan-200 shadow-cyan-950/60 ring-1 ring-cyan-500/30'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-black/40">
            {isMemory ? (
              <Brain className="w-4 h-4 text-violet-300 animate-pulse" />
            ) : isFailed ? (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            ) : isSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            ) : (
              <Globe className="w-4 h-4 text-cyan-300 animate-spin" />
            )}
          </div>

          <div className="min-w-0">
            <div className="font-bold tracking-wider uppercase text-[11px] truncate">{activeEvent.title}</div>
            {activeEvent.detail && <div className="text-[10px] opacity-80 truncate max-w-[200px] sm:max-w-xs">{activeEvent.detail}</div>}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {activeEvent.url && (
            <a
              href={activeEvent.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-[10px] tracking-wider uppercase shadow-md transition-all hover:scale-105 active:scale-95"
            >
              <span>LAUNCH</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          <button
            onClick={() => {
              setActiveEvent(null);
              onDismiss?.();
            }}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Dismiss toast"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
