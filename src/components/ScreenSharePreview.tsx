/**
 * ScreenSharePreview.tsx - Compact, non-intrusive Live Screen Sharing Preview Panel
 *
 * Section 54 & 59:
 * - Live video preview
 * - Minimize / Expand / Stop Sharing controls
 * - Analysis mode selector (AUTO, READ SCREEN, ANALYZE, EXPLAIN, DEBUG)
 * - Quick prompt actions ("What am I looking at?", "Read this", "Explain this", "Debug errors")
 * - Does not cover the skull (positioned floating at bottom corner or dockable)
 */

import React, { useEffect, useRef, useState } from 'react';
import { ScreenShareState, ScreenAnalysisMode } from '../types';
import { ScreenVisionManager } from '../services/ScreenVisionManager';
import {
  Monitor,
  Eye,
  Minimize2,
  Maximize2,
  Square,
  Sparkles,
  FileText,
  Search,
  HelpCircle,
  Bug,
  RefreshCw,
  X,
} from 'lucide-react';

interface ScreenSharePreviewProps {
  onStopSharing: () => void;
}

export const ScreenSharePreview: React.FC<ScreenSharePreviewProps> = ({ onStopSharing }) => {
  const [visionState, setVisionState] = useState<ScreenShareState>('SCREEN_OFF');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [mode, setMode] = useState<ScreenAnalysisMode>('auto');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const visionManager = ScreenVisionManager.getInstance();

  useEffect(() => {
    const unsubscribe = visionManager.subscribeState((st, str) => {
      setVisionState(st);
      setStream(str);
    });
    return unsubscribe;
  }, [visionManager]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, isMinimized]);

  if (visionState !== 'SCREEN_ACTIVE' || !stream) {
    return null;
  }

  const handleSelectMode = (newMode: ScreenAnalysisMode) => {
    setMode(newMode);
    visionManager.setMode(newMode);
  };

  const handleTriggerAnalysis = async (customPrompt?: string, chosenMode?: ScreenAnalysisMode) => {
    setIsAnalyzing(true);
    try {
      await visionManager.analyzeScreen(customPrompt, chosenMode || mode);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div
      className={`fixed bottom-4 left-4 z-40 transition-all duration-300 font-sans ${
        isMinimized ? 'w-64' : 'w-80 sm:w-96'
      }`}
    >
      <div className="bg-zinc-950/90 border border-cyan-500/40 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden ring-1 ring-cyan-500/20">
        {/* Header bar matching Section 54 / Patch Spec */}
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-cyan-950/50 via-purple-950/40 to-zinc-950/90 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
            </span>
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] font-mono font-bold tracking-wider text-cyan-300 uppercase">
                SCREEN VISION
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              title={isMinimized ? 'Expand preview' : 'Minimize preview'}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onStopSharing}
              className="p-1 rounded-lg hover:bg-rose-950/80 border border-rose-500/30 text-rose-300 hover:text-rose-100 transition-colors flex items-center justify-center"
              title="Stop Sharing [×]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Minimized view */}
        {isMinimized ? (
          <div className="px-3 py-2 flex items-center justify-between text-xs text-zinc-300 bg-zinc-900/40">
            <span className="text-[11px] text-zinc-400 font-mono">ARAVAN Vision Active</span>
            <button
              onClick={() => handleTriggerAnalysis()}
              disabled={isAnalyzing}
              className="px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 text-[10px] font-mono font-semibold hover:bg-cyan-900/60 flex items-center gap-1"
            >
              {isAnalyzing ? (
                <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
              ) : (
                <Sparkles className="w-3 h-3 text-cyan-400" />
              )}
              <span>Analyze</span>
            </button>
          </div>
        ) : (
          /* Expanded live preview */
          <div className="p-2.5 space-y-2">
            {/* Live Video Preview Box */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-black/80 border border-zinc-800/80 group">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />
              <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur text-[9px] font-mono text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                <Eye className="w-2.5 h-2.5" />
                <span>VISION STREAM</span>
              </div>
            </div>

            {/* Analysis Mode Selector Tabs (Section 59) */}
            <div className="flex items-center justify-between gap-1 p-1 bg-zinc-900/60 rounded-xl border border-zinc-800 text-[10px] font-mono">
              {(
                [
                  { id: 'auto', label: 'AUTO', icon: Sparkles },
                  { id: 'read', label: 'READ', icon: FileText },
                  { id: 'analyze', label: 'ANALYZE', icon: Search },
                  { id: 'explain', label: 'EXPLAIN', icon: HelpCircle },
                  { id: 'debug', label: 'DEBUG', icon: Bug },
                ] as const
              ).map((m) => {
                const Icon = m.icon;
                const isActive = mode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleSelectMode(m.id)}
                    className={`flex-1 py-1 rounded-lg flex items-center justify-center gap-1 transition-all ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                  >
                    <Icon className="w-2.5 h-2.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Fast 1-Click Action Prompts */}
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <button
                onClick={() => handleTriggerAnalysis('What am I looking at on this screen?')}
                disabled={isAnalyzing}
                className="px-2 py-1.5 rounded-lg bg-zinc-900/70 hover:bg-zinc-850 border border-zinc-800 text-[10px] text-zinc-300 hover:text-white font-mono text-left truncate transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="truncate">"What am I looking at?"</span>
              </button>

              <button
                onClick={() => handleTriggerAnalysis('Read the visible text on this screen.', 'read')}
                disabled={isAnalyzing}
                className="px-2 py-1.5 rounded-lg bg-zinc-900/70 hover:bg-zinc-850 border border-zinc-800 text-[10px] text-zinc-300 hover:text-white font-mono text-left truncate transition-colors flex items-center gap-1.5"
              >
                <FileText className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">"Read this text"</span>
              </button>

              <button
                onClick={() => handleTriggerAnalysis('Explain this graph, chart, or layout.', 'explain')}
                disabled={isAnalyzing}
                className="px-2 py-1.5 rounded-lg bg-zinc-900/70 hover:bg-zinc-850 border border-zinc-800 text-[10px] text-zinc-300 hover:text-white font-mono text-left truncate transition-colors flex items-center gap-1.5"
              >
                <HelpCircle className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate">"Explain this layout"</span>
              </button>

              <button
                onClick={() => handleTriggerAnalysis('What is wrong with this screen? Are there errors?', 'debug')}
                disabled={isAnalyzing}
                className="px-2 py-1.5 rounded-lg bg-zinc-900/70 hover:bg-zinc-850 border border-zinc-800 text-[10px] text-zinc-300 hover:text-white font-mono text-left truncate transition-colors flex items-center gap-1.5"
              >
                <Bug className="w-3 h-3 text-rose-400 shrink-0" />
                <span className="truncate">"Debug & find errors"</span>
              </button>
            </div>

            {/* Primary Action Button */}
            <button
              onClick={() => handleTriggerAnalysis()}
              disabled={isAnalyzing}
              className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white text-xs font-mono font-bold tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 transition-all disabled:opacity-60"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>ANALYZING SCREEN...</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>INTERPRET SCREEN NOW</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
