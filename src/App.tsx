/**
 * ARAVAN — Master Futuristic AI Command Center
 * 
 * Central Holographic Skull Core, Real-time Gemini Live Voice, Persistent Memory,
 * Dual-Mode Voice + Text, Dynamic Theme Presets & Modular Tools.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLiveSession } from './hooks/useLiveSession';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Sidebar } from './components/Sidebar';
import { HolographicSkull } from './components/HolographicSkull';
import { CentralVoiceControls } from './components/CentralVoiceControls';
import { SuggestionChips } from './components/SuggestionChips';
import { ThemeSelector } from './components/ThemeSelector';
import { ConversationPanel } from './components/ConversationPanel';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { MemoryModal } from './components/MemoryModal';
import { ToolsModal } from './components/ToolsModal';
import { AboutModal } from './components/AboutModal';
import { SkullIcon } from './components/SkullIcon';
import { ARAVAN_VOICE } from './config/voice';
import { SkullControlsProvider } from './context/SkullControlsContext';
import { SkullControlModal } from './components/SkullControlModal';
import { CosmicBackground } from './components/CosmicBackground';
import { ScreenSharePreview } from './components/ScreenSharePreview';
import { ScreenVisionManager } from './services/ScreenVisionManager';
import { ActionHudToast } from './components/ActionHudToast';
import { DevDebugPanel } from './components/DevDebugPanel';
import { ScreenShareState } from './types';
import {
  Activity,
  Settings as SettingsIcon,
  Maximize2,
  Minimize2,
  AlertCircle,
  RefreshCw,
  Zap,
  Brain,
  Palette,
  Eye,
  Sliders,
  X,
  ExternalLink,
} from 'lucide-react';

function ARAVANCore() {
  const { currentTheme, setTheme, applyTargets } = useTheme();

  const {
    voiceState,
    interactionMode,
    micVolume,
    speakerVolume,
    errorMessage,
    lastAudioError,
    activeTool,
    messages,
    stats,
    lastLiveEvent,
    activeAssistantMessageId,
    audioContextState,
    isMicActive,
    isMicMuted,
    isPlaying,
    audioQueueSize,
    glowLevel,
    stopListeningWhileSpeaking,
    followUpSuggestions,
    timeDiagnostics,
    glowDiagnostics,
    connect,
    unlockAudio,
    disconnect,
    toggleConnection,
    toggleMicMute,
    interrupt,
    sendTextMessage,
    setInteractionMode,
    clearMessages,
    setGlowLevel,
    toggleStopListeningWhileSpeaking,
  } = useLiveSession({ onThemeChange: setTheme });

  // Navigation and Modal states
  const [currentTab, setCurrentTab] = useState('home');
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showSkullControls, setShowSkullControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Screen Sharing Vision State & Lifecycle (Sections 1-12)
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [screenShareState, setScreenShareState] = useState<ScreenShareState>('SCREEN_OFF');
  const [screenVisionError, setScreenVisionError] = useState<string | null>(null);

  // Sync state with ScreenVisionManager singleton
  useEffect(() => {
    const unsubState = ScreenVisionManager.getInstance().subscribeState((st, str) => {
      setScreenShareState(st);
      screenStreamRef.current = str;
    });
    const unsubErr = ScreenVisionManager.getInstance().subscribeError((err) => {
      setScreenVisionError(err);
    });
    return () => {
      unsubState();
      unsubErr();
    };
  }, []);

  // Connect Gemini Live session cleanly without requesting mic before user gesture
  useEffect(() => {
    connect({ enableMic: false }).catch(() => {});
  }, [connect]);

  // Resume Web AudioContext smoothly on first user interaction
  useEffect(() => {
    const handleUnlock = () => {
      unlockAudio().catch(() => {});
    };
    window.addEventListener('pointerdown', handleUnlock, { once: true });
    window.addEventListener('keydown', handleUnlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handleUnlock);
      window.removeEventListener('keydown', handleUnlock);
    };
  }, [unlockAudio]);

  // Stop screen sharing cleanly (Section 6, 7)
  const stopScreenVision = useCallback(() => {
    const stream = screenStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
    }
    screenStreamRef.current = null;
    ScreenVisionManager.getInstance().stopScreenShare();
  }, []);

  // Directly start screen sharing via user click - NO preceding delays or AI requests! (Section 1-3)
  const startScreenVision = useCallback(async () => {
    if (screenStreamRef.current) {
      return;
    }

    setScreenVisionError(null);

    // 1. Browser support check (Section 11)
    if (!navigator?.mediaDevices || !navigator?.mediaDevices?.getDisplayMedia) {
      const msg = "Screen sharing is not supported by this browser.";
      setScreenVisionError(msg);
      ScreenVisionManager.getInstance().setLastError(msg);
      return;
    }

    // 2. Secure context check (Section 12)
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      const msg = "Screen Vision requires HTTPS or localhost.";
      setScreenVisionError(msg);
      ScreenVisionManager.getInstance().setLastError(msg);
      return;
    }

    // Check permissions policy if explicitly restricted by host iframe
    if (
      typeof document !== 'undefined' &&
      ((document as any).permissionsPolicy?.allowsFeature?.('display-capture') === false ||
       (document as any).featurePolicy?.allowsFeature?.('display-capture') === false)
    ) {
      const msg = "Browser permissions policy blocked screen capture in this preview frame. Open ARAVAN in a top-level tab.";
      setScreenVisionError(msg);
      ScreenVisionManager.getInstance().setLastError(msg);
      return;
    }

    try {
      // 3. DIRECT browser permission request immediately on user gesture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      screenStreamRef.current = stream;
      setScreenVisionError(null);

      // 4. Browser native stop button listener (Section 7)
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const handleEnded = () => {
          console.log('[ARAVAN] Native screen sharing ended by user/browser (track.onended)');
          stopScreenVision();
        };
        videoTrack.addEventListener('ended', handleEnded);
        videoTrack.onended = handleEnded;
      }

      // 5. Connect stream to video element and frame pipeline (Section 17, 18)
      await ScreenVisionManager.getInstance().attachStream(stream);

    } catch (error: any) {
      console.warn('[ARAVAN] Screen Vision permission note:', error?.message || error);
      stopScreenVision();

      // Section 10: DO NOT HIDE THE REAL ERROR
      let errorMsg = "Screen sharing failed.";
      const errName = error?.name || '';
      const errMsg = error?.message || '';

      if (errName === 'NotAllowedError') {
        if (errMsg.toLowerCase().includes('permissions policy') || errMsg.toLowerCase().includes('display-capture')) {
          errorMsg = "Browser permissions policy blocked screen capture in iframe. Open ARAVAN in a top-level tab.";
        } else {
          errorMsg = "Screen sharing permission was cancelled or denied by user.";
        }
      } else if (errName === 'SecurityError') {
        errorMsg = "Security error: Screen sharing requires HTTPS or a top-level window.";
      } else if (errName === 'AbortError') {
        errorMsg = "Screen capture request was aborted.";
      } else if (errName === 'NotSupportedError') {
        errorMsg = "Screen capture is not supported on this device/display.";
      } else if (errMsg) {
        errorMsg = errMsg;
      }

      setScreenVisionError(errorMsg);
      ScreenVisionManager.getInstance().setLastError(errorMsg);
    }
  }, [stopScreenVision]);

  // Click handler directly bound to button (Section 2, 8)
  const handleToggleScreenShare = useCallback(() => {
    if (screenShareState === 'SCREEN_ACTIVE' || screenStreamRef.current) {
      stopScreenVision();
    } else {
      startScreenVision();
    }
  }, [screenShareState, stopScreenVision, startScreenVision]);

  // Keyboard shortcut: Spacebar to toggle voice, Escape to interrupt
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputActive =
        activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');

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

  // Tab navigation handler
  const handleSelectTab = (tab: string) => {
    setCurrentTab(tab);
    if (tab === 'memory') {
      setShowMemory(true);
    } else if (tab === 'tools') {
      setShowTools(true);
    } else if (tab === 'settings') {
      setShowDiagnostics(true);
    } else if (tab === 'about') {
      setShowAbout(true);
    } else if (tab === 'skull' || tab === 'controls') {
      setShowSkullControls(true);
    } else if (tab === 'theme') {
      // Scroll to theme bar
      const el = document.getElementById('theme-selector-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Safe external website opening
  const handleOpenUrl = (url: string) => {
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.warn('[ARAVAN] Could not open URL:', err);
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#05030d] text-zinc-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-black overflow-x-hidden relative font-sans">
      {/* 1. Living Futuristic Cosmic Background (Sections 71-81) */}
      <CosmicBackground
        voiceState={voiceState}
        speakerVolume={speakerVolume}
        micVolume={micVolume}
        screenState={screenShareState}
      />

      {/* Cybernetic Grid Matrix Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1f29370d_1px,transparent_1px),linear-gradient(to_bottom,#1f29370d_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] pointer-events-none" />

      {/* Top Application Header Bar */}
      <header className="relative z-20 w-full px-4 lg:px-8 py-3.5 flex items-center justify-between border-b border-zinc-800/80 bg-[#060412]/80 backdrop-blur-xl select-none">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-600/30 border border-cyan-500/40 p-1 flex items-center justify-center shadow-lg shadow-cyan-950/40">
            <SkullIcon className="w-5 h-5 text-cyan-400" glow />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-wider text-white uppercase">ARAVAN</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-violet-950/70 border border-violet-500/40 text-violet-300">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                LIVE
              </span>

              {/* SCREEN VISION Persistent Indicator (Sections 52, 63 & Patch Spec) */}
              {screenShareState === 'SCREEN_ACTIVE' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  ● SCREEN VISION ACTIVE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-zinc-900/60 border border-zinc-800 text-zinc-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                  SCREEN VISION OFF
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 font-medium hidden sm:block">
              Kese ho boss? 👋 <span className="text-zinc-500">— Your intelligent AI companion.</span>
            </p>
          </div>
        </div>

        {/* Right Header Action Icons */}
        <div className="flex items-center gap-2">
          {/* Dedicated Screen Vision Toggle Button (Sections 1-4 & 15) */}
          <button
            type="button"
            onClick={handleToggleScreenShare}
            className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all backdrop-blur-md border shadow-sm ${
              screenShareState === 'SCREEN_ACTIVE'
                ? 'bg-gradient-to-r from-cyan-950/90 via-purple-950/80 to-cyan-950/90 border-cyan-400/80 text-cyan-200 shadow-[0_0_18px_rgba(6,182,212,0.4)] ring-1 ring-cyan-400/50'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
            }`}
            title={
              screenShareState === 'SCREEN_ACTIVE'
                ? 'Screen Vision: ACTIVE (ARAVAN can see your screen) — Click to Turn Off'
                : 'Screen Vision: OFF — Click to start screen sharing'
            }
          >
            <div className="relative flex items-center justify-center">
              <Eye
                className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                  screenShareState === 'SCREEN_ACTIVE'
                    ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                    : 'text-zinc-400'
                }`}
              />
              {screenShareState === 'SCREEN_ACTIVE' && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              )}
            </div>
            <span className="font-mono tracking-wider">
              {screenShareState === 'SCREEN_ACTIVE'
                ? '● SCREEN VISION ON'
                : 'SCREEN VISION'}
            </span>
          </button>

          {/* Dedicated Futuristic Skull Control Console (Section 65, 84) */}
          <button
            onClick={() => setShowSkullControls(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-semibold transition-all border bg-violet-950/50 border-violet-500/40 text-violet-300 hover:bg-violet-900/50 hover:text-white shadow-sm"
            title="Open Holographic Skull Control Console (Glow, Bloom, Colors & Speeds)"
          >
            <Zap className="w-3.5 h-3.5 text-violet-400" />
            <span className="hidden lg:inline">SKULL CONTROL</span>
          </button>

          {/* Dedicated Memory Vault Button */}
          <button
            onClick={() => setShowMemory(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-semibold transition-all border bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/40 hover:text-white shadow-sm"
            title="Open ARAVAN's Persistent Memory Bank"
          >
            <Brain className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">MEMORY VAULT</span>
          </button>

          {/* Dedicated Theme Customizer Quick Link */}
          <button
            onClick={() => {
              const el = document.getElementById('theme-selector-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-semibold transition-all border bg-zinc-900/70 border-zinc-700/60 text-zinc-300 hover:text-white hover:border-cyan-500/50 shadow-sm"
            title="Change Skull Colors & Theme Presets"
          >
            <Palette className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">THEME</span>
          </button>

          {/* Quick Audio Enable & Mic Listening Status */}
          <button
            onClick={toggleConnection}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-semibold transition-all border shadow-sm ${
              voiceState === 'listening'
                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-emerald-950/40 ring-1 ring-emerald-500/40'
                : voiceState === 'speaking'
                ? 'bg-violet-950/80 border-violet-500/60 text-violet-300 animate-pulse'
                : 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/40 hover:text-white'
            }`}
            title={voiceState === 'listening' ? "Audio Listening is Active — ARAVAN can hear you" : "Click to Enable Audio & Speech Listening"}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                voiceState === 'listening'
                  ? 'bg-emerald-400 animate-ping'
                  : voiceState === 'speaking'
                  ? 'bg-violet-400'
                  : 'bg-cyan-400 animate-pulse'
              }`}
            />
            <span>
              {voiceState === 'listening'
                ? 'AUDIO LISTENING'
                : voiceState === 'speaking'
                ? 'VOCALIZING'
                : 'AUDIO ENABLE'}
            </span>
          </button>

          {/* Audio Visualizer Indicator */}
          <button
            onClick={toggleConnection}
            className={`p-2 rounded-xl border transition-all ${
              voiceState === 'listening' || voiceState === 'speaking'
                ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 shadow-md shadow-cyan-950/30'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Toggle Live Audio Session"
          >
            <Activity className="w-4 h-4" />
          </button>

          {/* Settings / Diagnostics */}
          <button
            onClick={() => setShowDiagnostics(true)}
            className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
            title="System Diagnostics & Architecture"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all hidden sm:flex"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Open Top-Level Tab (if running in iframe) */}
          {typeof window !== 'undefined' && window.self !== window.top && (
            <a
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800 text-cyan-400 hover:text-cyan-300 hover:border-cyan-500/50 transition-all hidden md:flex"
              title="Open ARAVAN in a new top-level tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </header>

      {/* Main 3-Column AI Command Center */}
      <div className="relative z-10 flex-1 w-full max-w-[1720px] mx-auto flex flex-col lg:flex-row items-stretch overflow-hidden">
        {/* LEFT COLUMN: Sidebar Navigation */}
        <div className="hidden lg:block">
          <Sidebar
            currentTab={currentTab}
            onSelectTab={handleSelectTab}
            voiceState={voiceState}
            micVolume={micVolume}
            speakerVolume={speakerVolume}
            onQuickAction={handleOpenUrl}
          />
        </div>

        {/* CENTER STAGE: Holographic Skull AI Core & Controls */}
        <main className="flex-1 flex flex-col justify-between p-3 sm:p-5 lg:p-6 overflow-y-auto">
          {/* Global Voice Pipeline Error Notice (if any) */}
          {errorMessage && (
            <div
              id="aravan-error-banner"
              className="mb-4 w-full max-w-xl mx-auto p-3.5 rounded-xl bg-rose-950/80 border border-rose-600/60 text-rose-200 flex items-center justify-between gap-3 shadow-xl backdrop-blur-md animate-fade-in"
            >
              <div className="flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => connect({ enableMic: true })}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 bg-rose-800 hover:bg-rose-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Reconnect
              </button>
            </div>
          )}

          {/* Active Tool Execution Indicator */}
          {activeTool && (
            <div
              id="aravan-tool-toast"
              className="mb-3 mx-auto px-4 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/60 text-cyan-200 flex items-center gap-2 text-xs font-mono shadow-xl backdrop-blur-md animate-pulse"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                Executing <strong>{activeTool.name}</strong>
                {activeTool.args?.url ? ` (${String(activeTool.args.url)})` : ''}...
              </span>
              {activeTool.name === 'openWebsite' && activeTool.args?.url && (
                <a
                  href={String(activeTool.args.url).startsWith('http') ? String(activeTool.args.url) : `https://${activeTool.args.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 px-2.5 py-0.5 rounded-md bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-[10px] tracking-wider uppercase transition-colors"
                >
                  LAUNCH ↗
                </a>
              )}
            </div>
          )}

          {/* 1. Large Holographic Skull Core */}
          <div className="my-auto">
            <HolographicSkull
              voiceState={voiceState}
              micVolume={micVolume}
              speakerVolume={speakerVolume}
              glowLevel={glowLevel}
              onGlowLevelChange={setGlowLevel}
              stopListeningWhileSpeaking={stopListeningWhileSpeaking}
              onToggleStopListeningWhileSpeaking={toggleStopListeningWhileSpeaking}
              onClick={toggleConnection}
            />

            {/* 2. Central Voice Controls & Live Waveform */}
            <div className="mt-3">
              <CentralVoiceControls
                voiceState={voiceState}
                micVolume={micVolume}
                speakerVolume={speakerVolume}
                glowLevel={glowLevel}
                onGlowLevelChange={setGlowLevel}
                stopListeningWhileSpeaking={stopListeningWhileSpeaking}
                onToggleStopListeningWhileSpeaking={toggleStopListeningWhileSpeaking}
                onToggleConnection={toggleConnection}
                onInterrupt={interrupt}
                isMicActive={isMicActive}
                isMicMuted={isMicMuted}
                onToggleMicMute={toggleMicMute}
                onSetStandby={() => {
                  if (voiceState !== 'disconnected') {
                    disconnect();
                  }
                }}
              />
            </div>
          </div>

          {/* 3. Suggestion Chips Bar */}
          <div className="mt-4">
            <SuggestionChips
              dynamicSuggestions={followUpSuggestions}
              onSelectSuggestion={(text) => sendTextMessage(text)}
            />
          </div>

          {/* 4. Theme & Color Scheme Control Bar */}
          <div id="theme-selector-section" className="mt-2">
            <ThemeSelector />
          </div>

          {/* 5. Center Bottom Tagline Footer */}
          <div className="mt-6 pt-4 border-t border-zinc-900/80 text-center text-xs text-zinc-500 flex flex-col sm:flex-row items-center justify-center gap-2 select-none">
            <span>ARAVAN can open websites, search, answer questions, remember things and much more.</span>
            <button
              onClick={() => setShowAbout(true)}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-950/60 border border-violet-500/40 text-[10px] font-mono text-violet-300 hover:text-white transition-colors"
            >
              <span>⚡ BUILT BY JAYOM PANCHAL</span>
            </button>
          </div>
        </main>

        {/* RIGHT COLUMN: Conversation Panel & Capability Matrix */}
        <aside className="w-full lg:w-[380px] xl:w-[420px] shrink-0 p-3 sm:p-5 border-t lg:border-t-0 lg:border-l border-zinc-800/80 bg-[#070514]/70 backdrop-blur-xl flex flex-col justify-between">
          <ConversationPanel
            messages={messages}
            voiceState={voiceState}
            onClear={clearMessages}
            onSendMessage={(text) => sendTextMessage(text)}
            onToggleMic={() => {
              if (voiceState === 'disconnected') {
                connect();
              } else {
                toggleMicMute();
              }
            }}
            isMicActive={isMicActive && !isMicMuted}
          />
        </aside>
      </div>

      {/* Modals & Dialogs */}
      <DiagnosticsModal
        isOpen={showDiagnostics}
        onClose={() => setShowDiagnostics(false)}
        voiceState={voiceState}
        stats={stats}
        lastLiveEvent={lastLiveEvent}
        activeAssistantMessageId={activeAssistantMessageId}
        audioContextState={audioContextState}
        isMicActive={isMicActive}
        isPlaying={isPlaying}
        audioQueueSize={audioQueueSize}
        lastAudioError={lastAudioError}
        timeDiagnostics={timeDiagnostics}
        glowDiagnostics={glowDiagnostics}
        onTestConnection={() => connect({ enableMic: false })}
      />

      <MemoryModal
        isOpen={showMemory}
        onClose={() => setShowMemory(false)}
        onSendMessage={(text) => sendTextMessage(text)}
      />

      <ToolsModal
        isOpen={showTools}
        onClose={() => setShowTools(false)}
        onOpenWebsite={handleOpenUrl}
      />

      <AboutModal
        isOpen={showAbout}
        onClose={() => setShowAbout(false)}
      />

      {/* Screen Share Live Floating Preview (Section 54) */}
      <ScreenSharePreview
        onStopSharing={() => ScreenVisionManager.getInstance().stopScreenShare()}
      />

      {/* Dedicated Holographic Skull Control Console (Section 65-70, 82-83) */}
      <SkullControlModal
        isOpen={showSkullControls}
        onClose={() => setShowSkullControls(false)}
      />

      {/* Global Interactive Action HUD Toast (Reliable Website Launch) */}
      <ActionHudToast />

      {/* Section 10: Visible Screen Vision Error Alert Notice */}
      {screenVisionError && (
        <div
          id="screen-vision-error-banner"
          className="fixed top-16 right-4 z-50 p-3.5 rounded-2xl bg-rose-950/95 border border-rose-500/80 text-rose-200 text-xs font-mono shadow-2xl backdrop-blur-xl max-w-sm animate-fade-in flex flex-col gap-2 ring-1 ring-rose-500/50"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-rose-300 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>SCREEN VISION ERROR</span>
            </div>
            <button
              type="button"
              onClick={() => setScreenVisionError(null)}
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10"
              title="Dismiss error"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-rose-200 leading-relaxed font-sans">{screenVisionError}</p>
          {typeof window !== 'undefined' && window.self !== window.top && (
            <div className="pt-1.5 border-t border-rose-900/60 flex items-center justify-between gap-2">
              <span className="text-[10px] text-zinc-400">Running in iframe?</span>
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-[10px] uppercase shadow-md transition-colors"
              >
                <span>Open Top-Level ↗</span>
              </a>
            </div>
          )}
        </div>
      )}

      {/* Development Diagnostic Telemetry Panel */}
      <DevDebugPanel
        voiceState={voiceState}
        isMicActive={isMicActive}
        audioContextState={audioContextState}
        activeAssistantMessageId={activeAssistantMessageId}
        lastLiveEvent={lastLiveEvent}
        lastError={errorMessage}
        lastAudioError={lastAudioError}
        audioQueueSize={audioQueueSize}
        isPlaying={isPlaying}
        packetsReceived={stats.packetsReceived}
        timeDiagnostics={timeDiagnostics}
        glowDiagnostics={glowDiagnostics}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SkullControlsProvider>
        <ARAVANCore />
      </SkullControlsProvider>
    </ThemeProvider>
  );
}
