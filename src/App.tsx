/**
 * ARAVAN - Dual-Mode AI Assistant (Voice + Text Simultaneously)
 * 
 * Strict masculine voice output via Gemini Live API (Charon male voice).
 */

import React, { useState, useEffect } from 'react';
import { useLiveSession } from './hooks/useLiveSession';
import { VoiceOrb } from './components/VoiceOrb';
import { Waveform } from './components/Waveform';
import { ConversationPanel } from './components/ConversationPanel';
import { TextInputBar } from './components/TextInputBar';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { MemoryModal } from './components/MemoryModal';
import { DevDebugPanel } from './components/DevDebugPanel';
import { ARAVAN_VOICE } from './config/voice';
import {
  Mic,
  MicOff,
  Radio,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Volume2,
  RefreshCw,
  Sparkles,
  Zap,
  MessageSquare,
  Headphones,
  Brain,
} from 'lucide-react';

export default function App() {
  const {
    voiceState,
    interactionMode,
    micVolume,
    speakerVolume,
    errorMessage,
    activeTool,
    messages,
    stats,
    lastLiveEvent,
    activeAssistantMessageId,
    audioContextState,
    isMicActive,
    audioQueueSize,
    connect,
    disconnect,
    toggleConnection,
    interrupt,
    sendTextMessage,
    setInteractionMode,
    clearMessages,
  } = useLiveSession();

  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showMemory, setShowMemory] = useState(false);

  // Keyboard shortcut: Spacebar to toggle when body focused, Escape to interrupt
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputActive = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');

      if (e.code === 'Space' && !isInputActive) {
        e.preventDefault();
        toggleConnection();
      } else if (e.code === 'Escape' && voiceState === 'speaking') {
        e.preventDefault();
        interrupt();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleConnection, interrupt, voiceState]);

  const isDisconnected = voiceState === 'disconnected';
  const isConnecting = voiceState === 'connecting';
  const isListening = voiceState === 'listening';
  const isSpeaking = voiceState === 'speaking';
  const isError = voiceState === 'error';

  return (
    <main className="min-h-screen w-full bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-amber-500 selection:text-black overflow-x-hidden relative font-sans">
      {/* Background radial glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(180,83,9,0.15),rgba(255,255,255,0))]" />
      
      {/* Subtle grid texture */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370f_1px,transparent_1px),linear-gradient(to_bottom,#1f29370f_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between border-b border-zinc-900/60 bg-zinc-950/60 backdrop-blur-md">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 shadow-lg shadow-amber-900/30 flex items-center justify-center">
            <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
              <span className="font-mono font-bold text-amber-400 text-sm tracking-wider">A</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base sm:text-lg tracking-wider text-zinc-100 uppercase">ARAVAN</h1>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-amber-400 hidden sm:inline-block">
                Male Voice: {ARAVAN_VOICE}
              </span>
            </div>
            <p className="text-xs text-zinc-500 hidden sm:block">Dual-Mode Voice + Text Companion</p>
          </div>
        </div>

        {/* Controls: Mode Switcher, Status Pill & Diagnostics */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mode Switcher */}
          <div className="flex items-center bg-zinc-900/90 p-0.5 rounded-full border border-zinc-800 text-xs">
            <button
              id="mode-voice-text-btn"
              onClick={() => setInteractionMode('voice-text')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium transition-all ${
                interactionMode === 'voice-text'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Simultaneous Voice + Text Mode"
            >
              <MessageSquare className="w-3 h-3" />
              <span className="hidden md:inline">Voice + Text</span>
            </button>
            <button
              id="mode-voice-only-btn"
              onClick={() => setInteractionMode('voice-only')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium transition-all ${
                interactionMode === 'voice-only'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Voice-Only Minimal Mode"
            >
              <Headphones className="w-3 h-3" />
              <span className="hidden md:inline">Voice Only</span>
            </button>
          </div>

          {/* Live Status Pill */}
          <div
            id="aravan-status-pill"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono transition-all duration-300 ${
              isSpeaking
                ? 'bg-amber-950/40 border-amber-500/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                : isListening
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : isConnecting
                ? 'bg-amber-950/30 border-amber-600/30 text-amber-400 animate-pulse'
                : isError
                ? 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                : 'bg-zinc-900/80 border-zinc-800 text-zinc-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isSpeaking
                  ? 'bg-amber-400 animate-ping'
                  : isListening
                  ? 'bg-emerald-400 animate-pulse'
                  : isConnecting
                  ? 'bg-amber-400 animate-bounce'
                  : isError
                  ? 'bg-rose-500'
                  : 'bg-zinc-600'
              }`}
            />
            <span className="uppercase font-semibold tracking-wide text-[11px]">
              {isSpeaking
                ? 'SPEAKING'
                : isListening
                ? 'LISTENING'
                : isConnecting
                ? 'CONNECTING'
                : isError
                ? 'ERROR'
                : 'READY'}
            </span>
          </div>

          {/* Brain / Memory Button */}
          <button
            id="open-memory-header-btn"
            onClick={() => setShowMemory(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/40 text-xs text-amber-300 transition-colors shadow-sm"
            title="Inspect ARAVAN's Persistent Memory"
          >
            <Brain className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Brain</span>
          </button>

          {/* Diagnostics Button */}
          <button
            id="open-diagnostics-btn"
            onClick={() => setShowDiagnostics(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition-colors"
            title="Inspect Voice Architecture & Diagnostics"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden lg:inline">Diagnostics</span>
          </button>
        </div>
      </header>

      {/* Main Interactive Workspace */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-4 py-6 max-w-5xl mx-auto w-full">
        {/* Error Alert Box */}
        {errorMessage && (
          <div
            id="aravan-error-banner"
            className="mb-6 w-full max-w-md mx-auto p-4 rounded-xl bg-rose-950/60 border border-rose-700/60 text-rose-200 flex items-start gap-3 shadow-xl backdrop-blur-md animate-fade-in"
          >
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-rose-100 mb-1">Voice Pipeline Alert</p>
              <p className="text-xs text-rose-300 leading-relaxed">{errorMessage}</p>
              <button
                id="retry-connection-btn"
                onClick={connect}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-rose-800 hover:bg-rose-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Reconnect ARAVAN
              </button>
            </div>
          </div>
        )}

        {/* Tool Execution Toast */}
        {activeTool && (
          <div
            id="aravan-tool-toast"
            className="mb-4 mx-auto px-4 py-1.5 rounded-full bg-amber-950/80 border border-amber-500/60 text-amber-200 flex items-center gap-2 text-xs font-mono shadow-xl backdrop-blur-md animate-bounce"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>
              Executing <strong>{activeTool.name}</strong>
              {activeTool.args?.url ? ` (${activeTool.args.url})` : ''}...
            </span>
          </div>
        )}

        {interactionMode === 'voice-text' ? (
          /* Dual-Mode Layout (Voice Stage + Glassmorphism Transcript & Text Input) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left/Top Stage: Voice Orb & Primary Controls */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800/60 backdrop-blur-md">
              <VoiceOrb
                voiceState={voiceState}
                micVolume={micVolume}
                speakerVolume={speakerVolume}
                onClick={toggleConnection}
              />

              <div className="mt-4 text-center select-none">
                <h2 className="text-lg font-bold tracking-tight text-zinc-100">
                  {isDisconnected && 'Tap orb to start'}
                  {isConnecting && 'Connecting to Live API...'}
                  {isListening && 'Listening to you'}
                  {isSpeaking && 'ARAVAN is speaking'}
                  {isError && 'Voice Disconnected'}
                </h2>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-1">
                  {isDisconnected && 'Speak or type anytime. Voice responses will play automatically.'}
                  {isConnecting && `Initializing ${ARAVAN_VOICE} male voice stream.`}
                  {isListening && 'Speak in English or Hindi. Or type below.'}
                  {isSpeaking && 'Interrupt him anytime by speaking or typing.'}
                  {isError && 'Tap orb or reconnect button to recover.'}
                </p>
              </div>

              {/* Dynamic Waveform Visualizer */}
              <div className="mt-4 flex justify-center w-full">
                <Waveform
                  voiceState={voiceState}
                  micVolume={micVolume}
                  speakerVolume={speakerVolume}
                />
              </div>

              {/* Action Buttons */}
              <div className="mt-5 flex items-center gap-3 w-full justify-center">
                <button
                  id="aravan-main-toggle-btn"
                  onClick={toggleConnection}
                  className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-xs tracking-wide transition-all duration-300 shadow-md ${
                    isDisconnected || isError
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-amber-900/30'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                  }`}
                >
                  {isDisconnected || isError ? (
                    <>
                      <Mic className="w-3.5 h-3.5" />
                      <span>Wake Voice</span>
                    </>
                  ) : (
                    <>
                      <MicOff className="w-3.5 h-3.5 text-rose-400" />
                      <span>End Voice</span>
                    </>
                  )}
                </button>

                {isSpeaking && (
                  <button
                    id="aravan-interrupt-btn"
                    onClick={interrupt}
                    className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs text-amber-300 transition-colors"
                    title="Interrupt ARAVAN"
                  >
                    <span>Interrupt</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right Stage: Live Glassmorphism Conversation & Text Input */}
            <div className="lg:col-span-7 flex flex-col gap-3">
              <ConversationPanel
                messages={messages}
                voiceState={voiceState}
                onClear={clearMessages}
                onQuickPrompt={(prompt) => sendTextMessage(prompt)}
                onOpenMemory={() => setShowMemory(true)}
              />

              <TextInputBar
                onSend={(text) => sendTextMessage(text)}
                disabled={isConnecting}
                isSpeaking={isSpeaking}
                onInterrupt={interrupt}
              />
            </div>
          </div>
        ) : (
          /* Minimalist Voice-Only Mode */
          <div className="flex flex-col items-center justify-center max-w-2xl mx-auto w-full py-4">
            <VoiceOrb
              voiceState={voiceState}
              micVolume={micVolume}
              speakerVolume={speakerVolume}
              onClick={toggleConnection}
            />

            <div className="mt-8 text-center space-y-2 select-none">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
                {isDisconnected && 'Tap to wake ARAVAN'}
                {isConnecting && 'Connecting to Gemini Live...'}
                {isListening && 'Listening to your voice...'}
                {isSpeaking && 'ARAVAN is speaking'}
                {isError && 'Voice Disconnected'}
              </h2>
              <p className="text-sm text-zinc-400 max-w-sm mx-auto">
                {isDisconnected && 'Start a natural, masculine voice-to-voice conversation.'}
                {isConnecting && `Initializing 24kHz audio stream with ${ARAVAN_VOICE} voice.`}
                {isListening && 'Speak in English, Hindi, or Hinglish. Barge-in is always active.'}
                {isSpeaking && 'Feel free to interrupt him anytime — he will pause instantly.'}
                {isError && 'Please tap the orb or reconnect button to start a fresh session.'}
              </p>
            </div>

            <div className="mt-8 flex justify-center w-full">
              <Waveform
                voiceState={voiceState}
                micVolume={micVolume}
                speakerVolume={speakerVolume}
              />
            </div>

            <div className="mt-8 flex items-center gap-4">
              <button
                id="aravan-main-toggle-btn"
                onClick={toggleConnection}
                className={`flex items-center gap-2.5 px-7 py-3.5 rounded-full font-medium text-sm tracking-wide transition-all duration-300 shadow-xl ${
                  isDisconnected || isError
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-amber-900/30'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                }`}
              >
                {isDisconnected || isError ? (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>Wake ARAVAN</span>
                  </>
                ) : (
                  <>
                    <MicOff className="w-4 h-4 text-rose-400" />
                    <span>End Session</span>
                  </>
                )}
              </button>

              {isSpeaking && (
                <button
                  id="aravan-interrupt-btn"
                  onClick={interrupt}
                  className="flex items-center gap-1.5 px-4 py-3.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs text-amber-300 transition-colors"
                  title="Interrupt ARAVAN"
                >
                  <span>Interrupt</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Guidance & Language Hints */}
      <footer className="relative z-20 w-full max-w-5xl mx-auto px-6 py-4 border-t border-zinc-900/80">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500/70" />
            <span>Dual-Mode Active:</span>
            <span className="text-zinc-400 font-mono text-[11px]">
              Speak or type anytime • One unified context • Masculine Gemini Live voice
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="flex items-center gap-1 text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Charon (Male)
            </span>
          </div>
        </div>
      </footer>

      {/* Diagnostics Modal */}
      <DiagnosticsModal
        isOpen={showDiagnostics}
        onClose={() => setShowDiagnostics(false)}
        voiceState={voiceState}
        stats={stats}
        lastLiveEvent={lastLiveEvent}
        activeAssistantMessageId={activeAssistantMessageId}
        audioContextState={audioContextState}
        isMicActive={isMicActive}
        audioQueueSize={audioQueueSize}
      />

      {/* Memory Review & Management Modal */}
      <MemoryModal
        isOpen={showMemory}
        onClose={() => setShowMemory(false)}
      />

      {/* Development Debug Panel */}
      <DevDebugPanel
        voiceState={voiceState}
        isMicActive={isMicActive}
        audioContextState={audioContextState}
        activeAssistantMessageId={activeAssistantMessageId}
        lastLiveEvent={lastLiveEvent}
        lastError={errorMessage}
      />
    </main>
  );
}

