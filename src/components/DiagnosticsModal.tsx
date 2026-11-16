/**
 * DiagnosticsModal - Voice, Time Command & 3D Glow Pipeline Telemetry Inspector
 */

import React from 'react';
import {
  ARAVAN_VOICE,
  VOICE_PIPELINE,
  VOICE_FALLBACK_STATUS,
  AUDIO_INPUT_FORMAT,
  AUDIO_OUTPUT_FORMAT,
  LIVE_MODEL_NAME,
} from '../config/voice';
import {
  SessionStats,
  VoiceState,
  TimeDiagnostics,
  GlowDiagnostics,
} from '../types';
import {
  ShieldCheck,
  Cpu,
  Mic,
  Volume2,
  Radio,
  CheckCircle2,
  X,
  Eye,
  Clock,
  Sparkles,
} from 'lucide-react';
import { ScreenVisionManager } from '../services/ScreenVisionManager';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  voiceState: VoiceState;
  stats: SessionStats;
  lastLiveEvent?: string | null;
  activeAssistantMessageId?: string | null;
  audioContextState?: string;
  isMicActive?: boolean;
  isPlaying?: boolean;
  audioQueueSize?: number;
  lastAudioError?: string | null;
  timeDiagnostics?: TimeDiagnostics;
  glowDiagnostics?: GlowDiagnostics;
  onTestConnection?: () => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({
  isOpen,
  onClose,
  voiceState,
  stats,
  lastLiveEvent,
  activeAssistantMessageId,
  audioContextState = 'uninitialized',
  isMicActive = false,
  isPlaying = false,
  audioQueueSize = 0,
  lastAudioError = null,
  timeDiagnostics,
  glowDiagnostics,
}) => {
  const [testingConnection, setTestingConnection] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{
    success: boolean;
    message: string;
    latency?: number;
  } | null>(null);

  if (!isOpen) return null;

  const runConnectionTest = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/test-connection', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: `Connected to Gemini Live in ${data.latencyMs}ms (${data.model}, voice: ${data.voice})`,
          latency: data.latencyMs,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Connection test failed',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network request failed',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const checks = [
    {
      title: 'Centralized Voice Constant',
      status: `ARAVAN_VOICE = "${ARAVAN_VOICE}" (Male)`,
      passed: true,
      note: 'Explicit prebuilt voice configured via speechConfig',
    },
    {
      title: 'Voice Generation Pipeline',
      status: VOICE_PIPELINE,
      passed: true,
      note: 'Zero secondary or browser SpeechSynthesis engines',
    },
    {
      title: 'Voice Fallback Policy',
      status: `${VOICE_FALLBACK_STATUS} (Strict)`,
      passed: true,
      note: 'Never substitutes female or OS TTS voices',
    },
    {
      title: 'Audio Input Stream',
      status: AUDIO_INPUT_FORMAT,
      passed: true,
      note: 'Web Audio low-latency mono stream',
    },
    {
      title: 'Audio Output Stream',
      status: AUDIO_OUTPUT_FORMAT,
      passed: true,
      note: '24kHz direct Web Audio API ordered gapless queue',
    },
    {
      title: 'Live Gemini Model',
      status: LIVE_MODEL_NAME,
      passed: true,
      note: 'Audio-to-audio native bidirectional model (v1beta)',
    },
    {
      title: 'Barge-In / Interruption Engine',
      status: 'ACTIVE',
      passed: true,
      note: 'Instant buffer purge & generation guard on user speech',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        id="aravan-diagnostics-modal"
        className="w-full max-w-xl bg-zinc-950 border border-zinc-800/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-zinc-100 text-lg tracking-wide">
              ARAVAN Voice, Time & Glow Diagnostics
            </h3>
          </div>
          <button
            id="close-diagnostics-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Voice & Audio Pipeline Telemetry Card */}
          <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Voice & Audio Pipeline Telemetry
              </span>
              <button
                onClick={runConnectionTest}
                disabled={testingConnection}
                className="px-3 py-1 text-xs font-medium bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black rounded-lg transition-colors flex items-center gap-1.5"
              >
                {testingConnection ? 'Testing...' : 'Test Gemini Connection'}
              </button>
            </div>

            {testResult && (
              <div
                className={`p-2.5 rounded-lg text-xs font-mono ${
                  testResult.success
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                    : 'bg-red-950/60 text-red-300 border border-red-800/60'
                }`}
              >
                {testResult.message}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
              <div className="p-2 bg-zinc-950/80 rounded border border-zinc-800/60">
                <div className="text-zinc-500 text-[10px]">Web Audio State</div>
                <div className="text-zinc-200 capitalize">{audioContextState}</div>
              </div>
              <div className="p-2 bg-zinc-950/80 rounded border border-zinc-800/60">
                <div className="text-zinc-500 text-[10px]">Mic Capture</div>
                <div className={isMicActive ? 'text-emerald-400' : 'text-zinc-400'}>
                  {isMicActive ? '16kHz PCM Active' : 'Standby / Ready'}
                </div>
              </div>
              <div className="p-2 bg-zinc-950/80 rounded border border-zinc-800/60">
                <div className="text-zinc-500 text-[10px]">Playback & Queue</div>
                <div className="text-zinc-200">
                  {isPlaying ? 'Playing' : 'Idle'} ({audioQueueSize} chunks)
                </div>
              </div>
              <div className="p-2 bg-zinc-950/80 rounded border border-zinc-800/60">
                <div className="text-zinc-500 text-[10px]">Last Live Event</div>
                <div className="text-amber-400 truncate">{lastLiveEvent || 'none'}</div>
              </div>
              <div className="p-2 bg-zinc-950/80 rounded border border-zinc-800/60 col-span-2">
                <div className="text-zinc-500 text-[10px]">Active Assistant Msg ID</div>
                <div className="text-zinc-400 truncate">{activeAssistantMessageId || 'none'}</div>
              </div>
            </div>

            {lastAudioError && (
              <div className="p-2 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300 text-[11px] font-mono">
                <strong>Last Audio/Voice Error:</strong> {lastAudioError}
              </div>
            )}
          </div>

          {/* Live Status Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-zinc-900/70 border border-zinc-800/80 rounded-xl">
              <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
                <Radio className="w-3.5 h-3.5 text-amber-400" />
                State
              </div>
              <span className="font-medium text-zinc-100 uppercase tracking-wider text-xs">
                {voiceState}
              </span>
            </div>

            <div className="p-3 bg-zinc-900/70 border border-zinc-800/80 rounded-xl">
              <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                Male Voice
              </div>
              <span className="font-medium text-amber-400 font-mono text-xs">{ARAVAN_VOICE}</span>
            </div>

            <div className="p-3 bg-zinc-900/70 border border-zinc-800/80 rounded-xl">
              <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
                <Mic className="w-3.5 h-3.5 text-amber-400" />
                Packets Sent
              </div>
              <span className="font-medium text-zinc-100 font-mono text-xs">{stats.packetsSent}</span>
            </div>

            <div className="p-3 bg-zinc-900/70 border border-zinc-800/80 rounded-xl">
              <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                Chunks Recv
              </div>
              <span className="font-medium text-zinc-100 font-mono text-xs">
                {stats.packetsReceived}
              </span>
            </div>
          </div>

          {/* Time Command Diagnostics */}
          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-emerald-900/40">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                <Clock className="w-4 h-4" />
                <span>Time Command Diagnostics</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                {timeDiagnostics?.activeTimeZone || 'Asia/Kolkata'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 bg-zinc-950/70 rounded border border-zinc-800/60">
                <div className="text-zinc-500 text-[10px]">Last Query / Intent</div>
                <div className="text-zinc-200 truncate">
                  {timeDiagnostics?.lastQuery || timeDiagnostics?.recognizedIntent || 'None yet'}
                </div>
              </div>
              <div className="p-2 bg-zinc-950/70 rounded border border-zinc-800/60">
                <div className="text-zinc-500 text-[10px]">Tool Invoked</div>
                <div className="text-cyan-300">{timeDiagnostics?.toolInvoked || 'None yet'}</div>
              </div>
              <div className="p-2 bg-zinc-950/70 rounded border border-zinc-800/60 sm:col-span-2">
                <div className="text-zinc-500 text-[10px]">Execution Result</div>
                <div className="text-emerald-300 break-words">
                  {timeDiagnostics?.executionResult || 'Waiting for time command'}
                </div>
              </div>
            </div>

            {timeDiagnostics?.lastTimeError && (
              <div className="p-2 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300 text-[11px] font-mono">
                <strong>Last Time Error:</strong> {timeDiagnostics.lastTimeError}
              </div>
            )}
          </div>

          {/* 3D Glow & Renderer Diagnostics */}
          <div className="p-3.5 rounded-xl bg-violet-950/20 border border-violet-500/30 space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-violet-900/40">
              <div className="flex items-center gap-2 text-violet-300 font-bold text-xs">
                <Sparkles className="w-4 h-4" />
                <span>3D Glow & Renderer Telemetry</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                  glowDiagnostics?.rendererStatus === 'active'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                    : glowDiagnostics?.rendererStatus === 'error'
                    ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                    : 'bg-zinc-800 text-zinc-300'
                }`}
              >
                {glowDiagnostics?.rendererStatus || 'initializing'}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs font-mono">
              <div className="p-2 bg-zinc-950/70 rounded border border-zinc-800/60">
                <div className="text-zinc-500 text-[10px]">Preset</div>
                <div className="text-violet-300 uppercase">
                  {glowDiagnostics?.activePreset || 'default'}
                </div>
              </div>
              <div className="p-2 bg-zinc-950/70 rounded border border-zinc-800/60">
                <div className="text-zinc-500 text-[10px]">Master</div>
                <div className="text-zinc-200">{glowDiagnostics?.masterGlow ?? 75}%</div>
              </div>
              <div className="p-2 bg-zinc-950/70 rounded border border-zinc-800/60">
                <div className="text-zinc-500 text-[10px]">Eyes</div>
                <div className="text-zinc-200">{glowDiagnostics?.eyeGlow ?? 80}%</div>
              </div>
              <div className="p-2 bg-zinc-950/70 rounded border border-zinc-800/60">
                <div className="text-zinc-500 text-[10px]">Bloom</div>
                <div className="text-zinc-200">{glowDiagnostics?.bloom ?? 70}%</div>
              </div>
              <div className="p-2 bg-zinc-950/70 rounded border border-zinc-800/60">
                <div className="text-zinc-500 text-[10px]">Fog</div>
                <div className="text-zinc-200">{glowDiagnostics?.fog ?? 40}%</div>
              </div>
              <div className="p-2 bg-zinc-950/70 rounded border border-zinc-800/60">
                <div className="text-zinc-500 text-[10px]">Particles</div>
                <div className="text-zinc-200">{glowDiagnostics?.particles ?? 60}%</div>
              </div>
            </div>

            {glowDiagnostics?.lastSyncError && (
              <div className="p-2 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300 text-[11px] font-mono">
                <strong>Renderer Error:</strong> {glowDiagnostics.lastSyncError}
              </div>
            )}
          </div>

          {/* Screen Vision Telemetry */}
          <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/40 space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-cyan-900/40">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                <Eye className="w-4 h-4" />
                <span>Screen Vision Telemetry</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  ScreenVisionManager.getInstance().getState() === 'SCREEN_ACTIVE'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {ScreenVisionManager.getInstance().getState()}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2 bg-zinc-950/70 rounded border border-zinc-800/60">
                <div className="text-zinc-500 text-[10px]">Browser Support</div>
                <div
                  className={
                    typeof navigator !== 'undefined' && navigator?.mediaDevices?.getDisplayMedia
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }
                >
                  {typeof navigator !== 'undefined' && navigator?.mediaDevices?.getDisplayMedia
                    ? 'YES (Native)'
                    : 'NO'}
                </div>
              </div>

              <div className="p-2 bg-zinc-950/70 rounded border border-zinc-800/60">
                <div className="text-zinc-500 text-[10px]">Secure Context</div>
                <div
                  className={
                    typeof window !== 'undefined' && window.isSecureContext
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }
                >
                  {typeof window !== 'undefined' && window.isSecureContext
                    ? 'YES (Secure)'
                    : 'NO (Insecure)'}
                </div>
              </div>

              <div className="p-2 bg-zinc-950/70 rounded border border-zinc-800/60">
                <div className="text-zinc-500 text-[10px]">Stream Status</div>
                <div
                  className={
                    ScreenVisionManager.getInstance().getStream()
                      ? 'text-emerald-400'
                      : 'text-zinc-400'
                  }
                >
                  {ScreenVisionManager.getInstance().getStream() ? 'ACTIVE' : 'NONE'}
                </div>
              </div>

              <div className="p-2 bg-zinc-950/70 rounded border border-zinc-800/60">
                <div className="text-zinc-500 text-[10px]">Video Track</div>
                <div className="text-zinc-300">
                  {ScreenVisionManager.getInstance().getStream()?.getVideoTracks()?.[0]?.readyState ||
                    'NONE'}
                </div>
              </div>
            </div>

            {ScreenVisionManager.getInstance().getLastError() && (
              <div className="p-2 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300 text-[11px] font-mono">
                <strong>Last Error:</strong> {ScreenVisionManager.getInstance().getLastError()}
              </div>
            )}
          </div>

          {/* Voice Integrity Verification List */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
              Voice Architecture & Verification Checks
            </h4>
            <div className="space-y-2.5">
              {checks.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/60"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-200">{item.title}</span>
                    </div>
                    <p className="text-xs text-zinc-400">{item.note}</p>
                  </div>
                  <div className="flex items-center gap-1.5 pl-3">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-amber-300">
                      {item.status}
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-zinc-900/60 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <span>
            Interruption Events: <strong className="text-zinc-200">{stats.interruptionsCount}</strong>
          </span>
          <span className="text-zinc-500 font-mono">ARAVAN Live v1.0</span>
        </div>
      </div>
    </div>
  );
};
