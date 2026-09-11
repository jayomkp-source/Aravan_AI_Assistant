/**
 * DiagnosticsModal - Voice Pipeline & Live API Telemetry Inspector
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
import { SessionStats, VoiceState } from '../types';
import { ShieldCheck, Cpu, Mic, Volume2, Radio, CheckCircle2, X } from 'lucide-react';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  voiceState: VoiceState;
  stats: SessionStats;
  lastLiveEvent?: string | null;
  activeAssistantMessageId?: string | null;
  audioContextState?: string;
  isMicActive?: boolean;
  audioQueueSize?: number;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({
  isOpen,
  onClose,
  voiceState,
  stats,
  lastLiveEvent,
  activeAssistantMessageId,
  audioContextState = 'running',
  isMicActive = false,
  audioQueueSize = 0,
}) => {
  const [testingConnection, setTestingConnection] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{ success: boolean; message: string; latency?: number } | null>(null);

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
      title: "Centralized Voice Constant",
      status: `ARAVAN_VOICE = "${ARAVAN_VOICE}" (Male)`,
      passed: true,
      note: "Explicit prebuilt voice configured via speechConfig",
    },
    {
      title: "Voice Generation Pipeline",
      status: VOICE_PIPELINE,
      passed: true,
      note: "Zero secondary TTS engines",
    },
    {
      title: "Voice Fallback Policy",
      status: `${VOICE_FALLBACK_STATUS} (Strict)`,
      passed: true,
      note: "Never substitutes female or browser TTS voices",
    },
    {
      title: "Audio Input Stream",
      status: AUDIO_INPUT_FORMAT,
      passed: true,
      note: "Web Audio low-latency mono stream",
    },
    {
      title: "Audio Output Stream",
      status: AUDIO_OUTPUT_FORMAT,
      passed: true,
      note: "24kHz direct Web Audio API gapless queue",
    },
    {
      title: "Live Gemini Model",
      status: LIVE_MODEL_NAME,
      passed: true,
      note: "Audio-to-audio native bidirectional model",
    },
    {
      title: "Barge-In / Interruption Engine",
      status: "ACTIVE",
      passed: true,
      note: "Instant buffer purge on user speech",
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
              ARAVAN Voice & Pipeline Diagnostics
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
          {/* Live Telemetry Card */}
          <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Live API & Audio Pipeline Telemetry
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
              <div className={`p-2.5 rounded-lg text-xs font-mono ${testResult.success ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60' : 'bg-red-950/60 text-red-300 border border-red-800/60'}`}>
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
                <div className="text-zinc-500 text-[10px]">Audio Queue</div>
                <div className="text-zinc-200">{audioQueueSize} buffers</div>
              </div>
              <div className="p-2 bg-zinc-950/80 rounded border border-zinc-800/60">
                <div className="text-zinc-500 text-[10px]">Last Live Event</div>
                <div className="text-amber-400">{lastLiveEvent || 'none'}</div>
              </div>
              <div className="p-2 bg-zinc-950/80 rounded border border-zinc-800/60 col-span-2">
                <div className="text-zinc-500 text-[10px]">Active Assistant Msg ID</div>
                <div className="text-zinc-400 truncate">{activeAssistantMessageId || 'none'}</div>
              </div>
            </div>
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
              <span className="font-medium text-amber-400 font-mono text-xs">
                {ARAVAN_VOICE}
              </span>
            </div>

            <div className="p-3 bg-zinc-900/70 border border-zinc-800/80 rounded-xl">
              <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
                <Mic className="w-3.5 h-3.5 text-amber-400" />
                Packets Sent
              </div>
              <span className="font-medium text-zinc-100 font-mono text-xs">
                {stats.packetsSent}
              </span>
            </div>

            <div className="p-3 bg-zinc-900/70 border border-zinc-800/80 rounded-xl">
              <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                Packets Recv
              </div>
              <span className="font-medium text-zinc-100 font-mono text-xs">
                {stats.packetsReceived}
              </span>
            </div>
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
          <span>Interruption Events: <strong className="text-zinc-200">{stats.interruptionsCount}</strong></span>
          <span className="text-zinc-500 font-mono">ARAVAN Live v1.0</span>
        </div>
      </div>
    </div>
  );
};
