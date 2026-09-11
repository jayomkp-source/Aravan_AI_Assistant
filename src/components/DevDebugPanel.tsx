import React, { useState } from 'react';
import { Terminal, CheckCircle2, AlertCircle, RefreshCw, X, ChevronUp, ChevronDown } from 'lucide-react';
import { VoiceState } from '../types';

interface DevDebugPanelProps {
  voiceState: VoiceState;
  isMicActive: boolean;
  audioContextState: string;
  activeAssistantMessageId: string | null;
  lastLiveEvent: string | null;
  lastError: string | null;
}

export const DevDebugPanel: React.FC<DevDebugPanelProps> = ({
  voiceState,
  isMicActive,
  audioContextState,
  activeAssistantMessageId,
  lastLiveEvent,
  lastError,
}) => {
  // Only render in development mode
  if (!(import.meta as any).env?.DEV) {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  const isGeminiConnected = voiceState === 'listening' || voiceState === 'speaking';

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
    <div id="aravan-dev-debug-root" className="fixed bottom-4 left-4 z-50 font-mono text-xs select-none">
      {/* Minimized Toggle Button */}
      {!isOpen ? (
        <button
          id="btn-open-dev-debug"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-emerald-500/40 text-emerald-400 backdrop-blur-md shadow-lg hover:bg-slate-800 transition-all hover:border-emerald-400"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span className="font-semibold tracking-wider">ARAVAN DEBUG</span>
          <span
            className={`w-2 h-2 rounded-full ${
              isGeminiConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
            }`}
          />
        </button>
      ) : (
        /* Expanded Debug Window */
        <div
          id="panel-dev-debug"
          className="w-80 rounded-xl bg-slate-950/95 border border-slate-700/60 shadow-2xl backdrop-blur-xl p-4 text-slate-300 transition-all"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <Terminal className="w-4 h-4" />
              <span className="font-bold tracking-wider text-sm">ARAVAN DEBUG</span>
            </div>
            <button
              id="btn-close-dev-debug"
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Metrics Grid */}
          <div className="space-y-2 text-[11px]">
            <div className="flex justify-between items-center py-0.5 border-b border-slate-900">
              <span className="text-slate-400">Gemini:</span>
              <span
                className={`font-semibold ${
                  isGeminiConnected ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                {isGeminiConnected ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-900">
              <span className="text-slate-400">Microphone:</span>
              <span
                className={`font-semibold ${
                  isMicActive ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                {isMicActive ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-900">
              <span className="text-slate-400">AudioContext:</span>
              <span
                className={`font-semibold uppercase ${
                  audioContextState === 'running' ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {audioContextState || 'CLOSED'}
              </span>
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-900">
              <span className="text-slate-400">Input:</span>
              <span className="font-semibold text-sky-400">PCM16 16kHz</span>
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-900">
              <span className="text-slate-400">Output:</span>
              <span className="font-semibold text-sky-400">PCM 24kHz</span>
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-900">
              <span className="text-slate-400">Voice:</span>
              <span className="font-semibold text-indigo-400">Charon</span>
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-900">
              <span className="text-slate-400">Voice fallback:</span>
              <span className="font-semibold text-rose-400">DISABLED</span>
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-900">
              <span className="text-slate-400">Current state:</span>
              <span
                className={`font-semibold uppercase ${
                  voiceState === 'listening'
                    ? 'text-emerald-400'
                    : voiceState === 'speaking'
                    ? 'text-cyan-400'
                    : voiceState === 'connecting'
                    ? 'text-amber-400'
                    : voiceState === 'error'
                    ? 'text-rose-400'
                    : 'text-slate-400'
                }`}
              >
                {voiceState}
              </span>
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-900">
              <span className="text-slate-400">Active assistant message:</span>
              <span className="font-mono text-slate-300 truncate max-w-[140px]">
                {activeAssistantMessageId || 'None'}
              </span>
            </div>

            <div className="flex justify-between items-center py-0.5 border-b border-slate-900">
              <span className="text-slate-400">Last Live event:</span>
              <span className="font-mono text-slate-300">
                {lastLiveEvent || 'None'}
              </span>
            </div>

            <div className="flex flex-col py-0.5 border-b border-slate-900">
              <span className="text-slate-400">Last error:</span>
              <span className="font-mono text-rose-400 break-words mt-0.5 text-[10px]">
                {lastError || 'None'}
              </span>
            </div>
          </div>

          {/* Test Connection Button */}
          <div className="mt-3 pt-2 border-t border-slate-800">
            <button
              id="btn-test-live-connection"
              onClick={runConnectionTest}
              disabled={isTesting}
              className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-200 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span className="font-semibold">{isTesting ? 'Testing...' : 'Test Connection'}</span>
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
