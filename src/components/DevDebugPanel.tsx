import React, { useState, useEffect } from 'react';
import {
  Terminal,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Eye,
  Clock,
  Sparkles,
} from 'lucide-react';
import { VoiceState, TimeDiagnostics, GlowDiagnostics } from '../types';
import { ScreenVisionManager } from '../services/ScreenVisionManager';
import { LIVE_MODEL_NAME } from '../config/voice';

interface DevDebugPanelProps {
  voiceState: VoiceState;
  isMicActive: boolean;
  audioContextState: string;
  activeAssistantMessageId: string | null;
  lastLiveEvent: string | null;
  lastError: string | null;
  lastAudioError?: string | null;
  audioQueueSize?: number;
  isPlaying?: boolean;
  packetsReceived?: number;
  timeDiagnostics?: TimeDiagnostics;
  glowDiagnostics?: GlowDiagnostics;
}

export const DevDebugPanel: React.FC<DevDebugPanelProps> = ({
  voiceState,
  isMicActive,
  audioContextState,
  activeAssistantMessageId,
  lastLiveEvent,
  lastError,
  lastAudioError = null,
  audioQueueSize = 0,
  isPlaying = false,
  packetsReceived = 0,
  timeDiagnostics,
  glowDiagnostics,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  const [screenState, setScreenState] = useState<string>('SCREEN_OFF');
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);

  useEffect(() => {
    const unsubState = ScreenVisionManager.getInstance().subscribeState((st, stream) => {
      setScreenState(st);
      setScreenStream(stream);
    });
    const unsubErr = ScreenVisionManager.getInstance().subscribeError((err) => {
      setScreenError(err);
    });
    return () => {
      unsubState();
      unsubErr();
    };
  }, []);

  const hasScreenSupport =
    typeof navigator !== 'undefined' && Boolean(navigator?.mediaDevices?.getDisplayMedia);
  const isSecureContext = typeof window !== 'undefined' && Boolean(window.isSecureContext);
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  const videoTrack = screenStream?.getVideoTracks()?.[0];
  const videoTrackStatus = videoTrack
    ? videoTrack.readyState === 'live'
      ? 'ACTIVE'
      : 'ENDED'
    : 'NONE';

  const formattedScreenState =
    screenState === 'SCREEN_ACTIVE'
      ? 'ACTIVE'
      : screenState === 'REQUESTING_PERMISSION'
      ? 'REQUESTING'
      : screenState === 'SCREEN_ERROR'
      ? 'ERROR'
      : 'OFF';

  const isGeminiConnected = voiceState === 'listening' || voiceState === 'speaking' || voiceState === 'thinking';

  const runConnectionTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || `Connected in ${data.latencyMs}ms`,
          latencyMs: data.latencyMs,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Test connection failed.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Network error during connection test.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div id="aravan-dev-debug-root" className="fixed bottom-4 right-4 z-50 font-mono text-xs select-none">
      {!isOpen ? (
        <button
          id="btn-open-dev-debug"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-emerald-500/40 text-emerald-400 backdrop-blur-md shadow-lg hover:bg-slate-800 transition-all hover:border-emerald-400"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span className="font-semibold tracking-wider">DIAGNOSTICS</span>
          <span
            className={`w-2 h-2 rounded-full ${
              screenState === 'SCREEN_ACTIVE'
                ? 'bg-cyan-400 animate-ping'
                : isGeminiConnected
                ? 'bg-emerald-400 animate-pulse'
                : 'bg-zinc-500'
            }`}
          />
        </button>
      ) : (
        <div
          id="panel-dev-debug"
          className="w-84 max-h-[85vh] overflow-y-auto rounded-xl bg-slate-950/95 border border-slate-700/60 shadow-2xl backdrop-blur-xl p-4 text-slate-300 transition-all space-y-3"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
            <div className="flex items-center gap-2 text-emerald-400">
              <Terminal className="w-4 h-4" />
              <span className="font-bold tracking-wider text-sm">SYSTEM TELEMETRY</span>
            </div>
            <button
              id="btn-close-dev-debug"
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Voice Diagnostics */}
          <div className="space-y-1 text-[11px]">
            <div className="text-indigo-300 font-bold pb-1 border-b border-slate-800/80">
              VOICE DIAGNOSTICS
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-900">
              <span className="text-slate-400">Configured Voice:</span>
              <span className="font-semibold text-indigo-300">Charon</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-900">
              <span className="text-slate-400">Model:</span>
              <span className="text-slate-200 truncate max-w-[165px]">{LIVE_MODEL_NAME}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-900">
              <span className="text-slate-400">Session / State:</span>
              <span className={`font-semibold uppercase ${isGeminiConnected ? 'text-emerald-400' : 'text-slate-400'}`}>
                {voiceState}
              </span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-900">
              <span className="text-slate-400">Mic / AudioCtx:</span>
              <span className="text-slate-200 uppercase">
                {isMicActive ? 'ACTIVE' : 'STANDBY'} · {audioContextState || 'closed'}
              </span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-900">
              <span className="text-slate-400">Chunks / Playback:</span>
              <span className="text-slate-200">
                {packetsReceived} rx · {isPlaying ? 'PLAYING' : 'IDLE'} ({audioQueueSize})
              </span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-900">
              <span className="text-slate-400">Last Event / Msg:</span>
              <span className="text-amber-300 truncate max-w-[155px]">
                {lastLiveEvent || 'none'} {activeAssistantMessageId ? `(${activeAssistantMessageId.slice(-5)})` : ''}
              </span>
            </div>
            <div className="flex flex-col py-0.5 border-b border-slate-900">
              <span className="text-slate-400">Audio / Voice Error:</span>
              <span className="font-mono text-rose-400 break-words mt-0.5 text-[10px]">
                {lastAudioError || lastError || 'None'}
              </span>
            </div>
          </div>

          {/* Time Diagnostics */}
          <div className="p-2.5 rounded-lg bg-emerald-950/25 border border-emerald-500/30 space-y-1 text-[11px]">
            <div className="flex items-center gap-1.5 text-emerald-300 font-bold pb-1 border-b border-emerald-900/40">
              <Clock className="w-3.5 h-3.5" />
              <span>TIME DIAGNOSTICS</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400">Timezone:</span>
              <span className="text-emerald-300">{timeDiagnostics?.activeTimeZone || 'Asia/Kolkata'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400">Intent / Tool:</span>
              <span className="text-cyan-300 truncate">
                {timeDiagnostics?.recognizedIntent || 'none'} · {timeDiagnostics?.toolInvoked || '—'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-400">Result:</span>
              <span className="text-slate-200 break-words text-[10px]">
                {timeDiagnostics?.executionResult || 'None'}
              </span>
            </div>
            {timeDiagnostics?.lastTimeError && (
              <div className="text-rose-400 text-[10px]">Error: {timeDiagnostics.lastTimeError}</div>
            )}
          </div>

          {/* Glow Diagnostics */}
          <div className="p-2.5 rounded-lg bg-violet-950/25 border border-violet-500/30 space-y-1 text-[11px]">
            <div className="flex items-center gap-1.5 text-violet-300 font-bold pb-1 border-b border-violet-900/40">
              <Sparkles className="w-3.5 h-3.5" />
              <span>GLOW DIAGNOSTICS</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Preset / Renderer:</span>
              <span className="text-violet-300 uppercase">
                {glowDiagnostics?.activePreset || 'default'} · {glowDiagnostics?.rendererStatus || 'init'}
              </span>
            </div>
            <div className="text-[10px] text-slate-300">
              M:{glowDiagnostics?.masterGlow ?? 75}% · E:{glowDiagnostics?.eyeGlow ?? 80}% · El:{glowDiagnostics?.electricGlow ?? 80}% · B:{glowDiagnostics?.bloom ?? 70}% · F:{glowDiagnostics?.fog ?? 40}% · P:{glowDiagnostics?.particles ?? 60}%
            </div>
            {glowDiagnostics?.lastSyncError && (
              <div className="text-rose-400 text-[10px]">Sync Error: {glowDiagnostics.lastSyncError}</div>
            )}
          </div>

          {/* Screen Vision Diagnostic Panel */}
          <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/40 space-y-1">
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold pb-1 border-b border-cyan-800/40 text-[11px]">
              <Eye className="w-3.5 h-3.5" />
              <span>SCREEN VISION DIAGNOSTICS</span>
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-cyan-900/40 text-[11px]">
              <span className="text-slate-400">SUPPORT / SECURE:</span>
              <span className={`font-semibold ${hasScreenSupport && isSecureContext ? 'text-emerald-400' : 'text-rose-400'}`}>
                {hasScreenSupport ? 'YES' : 'NO'} / {isSecureContext ? 'YES' : 'NO'}
              </span>
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-cyan-900/40 text-[11px]">
              <span className="text-slate-400">STREAM / TRACK:</span>
              <span className="font-semibold text-slate-200">
                {screenStream ? 'ACTIVE' : 'NONE'} · {videoTrackStatus} ({formattedScreenState})
              </span>
            </div>

            <div className="flex flex-col py-0.5 text-[10px]">
              <span className="text-slate-400">SCREEN ERROR:</span>
              <span className="font-mono text-rose-400 break-words mt-0.5">
                {screenError || 'None'}
              </span>
            </div>

            {isInIframe && (
              <div className="pt-1 border-t border-cyan-900/60 flex items-center justify-between gap-1 text-[10px]">
                <span className="text-amber-300">Iframe Context</span>
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
                >
                  <span>Open Direct ↗</span>
                </a>
              </div>
            )}
          </div>

          {/* Test Connection Button */}
          <div className="pt-1 border-t border-slate-800">
            <button
              id="btn-test-live-connection"
              onClick={runConnectionTest}
              disabled={isTesting}
              className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-200 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span className="font-semibold">{isTesting ? 'Testing...' : 'Test Gemini Connection'}</span>
            </button>

            {testResult && (
              <div
                className={`mt-2 p-2 rounded-lg text-[10px] flex items-start gap-1.5 ${
                  testResult.success
                    ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-rose-400" />
                )}
                <div>
                  <div className="font-semibold">{testResult.success ? 'Success' : 'Failed'}</div>
                  <div className="text-[9px] opacity-90">{testResult.message}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
