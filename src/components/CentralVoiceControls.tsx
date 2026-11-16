/**
 * CentralVoiceControls.tsx - Interactive Cyberpunk Voice & State Controller
 * 
 * Interactive States:
 * - Standby mode: Puts ARAVAN into calm idle observation
 * - Active talking mode: Tests real-time skull jaw lip-sync & speech articulation
 * - Mute / Wake voice: Toggles voice listening & session state
 * - Echo-Shield / Stop Mic on Speech: Prevents AI from listening to its own voice
 * - Glow Control toggle: Direct quick command for skull neon luminosity
 */

import React, { useState } from 'react';
import { VoiceState, GlowLevel } from '../types';
import {
  Mic,
  MicOff,
  Square,
  Play,
  Radio,
  Volume2,
  Moon,
  MessageSquareQuote,
  Shield,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { AudioReactiveCore } from '../audio/AudioReactiveCore';

interface CentralVoiceControlsProps {
  voiceState: VoiceState;
  micVolume: number;
  speakerVolume: number;
  glowLevel?: GlowLevel;
  onGlowLevelChange?: (level: GlowLevel) => void;
  stopListeningWhileSpeaking?: boolean;
  onToggleStopListeningWhileSpeaking?: () => void;
  onToggleConnection: () => void;
  onInterrupt: () => void;
  onActiveTalkingToggle?: () => void;
  onSetStandby?: () => void;
  isMicActive?: boolean;
  isMicMuted?: boolean;
  onToggleMicMute?: () => void;
}

export const CentralVoiceControls: React.FC<CentralVoiceControlsProps> = ({
  voiceState,
  micVolume,
  speakerVolume,
  glowLevel = 'surge',
  onGlowLevelChange,
  stopListeningWhileSpeaking = true,
  onToggleStopListeningWhileSpeaking,
  onToggleConnection,
  onInterrupt,
  onActiveTalkingToggle,
  onSetStandby,
  isMicActive = false,
  isMicMuted = false,
  onToggleMicMute,
}) => {
  const { currentTheme } = useTheme();
  const [isTestVocalizing, setIsTestVocalizing] = useState(false);

  const isDisconnected = voiceState === 'disconnected';
  const isConnecting = voiceState === 'connecting';
  const isListening = voiceState === 'listening';
  const isSpeaking = voiceState === 'speaking' || isTestVocalizing;
  const isError = voiceState === 'error';

  const activeVol = isSpeaking ? speakerVolume || 0.6 : isListening ? micVolume : 0;

  // Waveform heights
  const waveHeights = [18, 40, 65, 95, 80, 50, 85, 55, 70, 35, 22];

  // Natural conversational Charon voice test phrases (English & Hinglish)
  const CHARON_VOICE_SAMPLES = [
    "Hey boss, I'm right here and ready. My voice and jaw sync are working smoothly.",
    "Kese ho boss? Awaaz bilkul clear aa rahi hai na? Batao aaj kya kaam karna hai.",
    "Everything looks good on my end, boss. Ask me the time, open a site, or just talk.",
  ];

  const handleTriggerActiveTalking = () => {
    if (onActiveTalkingToggle) {
      onActiveTalkingToggle();
      return;
    }

    if (isSpeaking) {
      AudioReactiveCore.getInstance().stopSpeaking();
      onInterrupt();
      setIsTestVocalizing(false);
      return;
    }

    const randomSample = CHARON_VOICE_SAMPLES[Math.floor(Math.random() * CHARON_VOICE_SAMPLES.length)];
    setIsTestVocalizing(true);
    AudioReactiveCore.getInstance().speakText(
      randomSample,
      () => setIsTestVocalizing(true),
      () => setIsTestVocalizing(false)
    );
  };

  const handleStandby = () => {
    if (isSpeaking) {
      AudioReactiveCore.getInstance().stopSpeaking();
      setIsTestVocalizing(false);
    }
    if (onSetStandby) {
      onSetStandby();
    } else if (!isDisconnected) {
      onToggleConnection();
    }
  };

  const handleCycleGlow = () => {
    const order: GlowLevel[] = ['dim', 'normal', 'surge', 'hyper', 'off'];
    const currentIndex = order.indexOf(glowLevel as GlowLevel);
    const nextLevel = order[currentIndex >= 0 ? (currentIndex + 1) % order.length : 2];
    if (onGlowLevelChange) {
      onGlowLevelChange(nextLevel);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center space-y-2 select-none py-1">
      {/* 1. Concise Voice & Mechanics Bar */}
      <div className="w-full flex items-center justify-between gap-2 sm:gap-3 px-2 sm:px-4 flex-wrap sm:flex-nowrap">
        {/* Status & Mic Toggle */}
        <div className="flex items-center gap-2">
          {/* Main Audio Toggle Pill */}
          <button
            onClick={() => {
              if (isDisconnected) {
                onToggleConnection();
              } else if (onToggleMicMute) {
                onToggleMicMute();
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-all shadow-md ${
              isListening
                ? 'bg-cyan-950/70 border-cyan-500/60 text-cyan-300 ring-1 ring-cyan-500/40 shadow-cyan-950/40'
                : isSpeaking
                ? 'bg-violet-950/70 border-violet-500/60 text-violet-300 shadow-violet-950/40'
                : isConnecting
                ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 animate-pulse'
                : isMicMuted
                ? 'bg-rose-950/60 border-rose-500/60 text-rose-300'
                : 'bg-zinc-900/80 hover:bg-zinc-850 border-zinc-800 text-zinc-300 hover:text-white'
            }`}
            title={isDisconnected ? "Connect Audio & Enable Microphone" : isMicMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {isListening ? (
              <>
                <Mic className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>LISTENING</span>
              </>
            ) : isSpeaking ? (
              <>
                <Radio className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
                <span>VOCALIZING</span>
              </>
            ) : isConnecting ? (
              <>
                <Radio className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span>CONNECTING</span>
              </>
            ) : isMicMuted ? (
              <>
                <MicOff className="w-3.5 h-3.5 text-rose-400" />
                <span>MIC MUTED</span>
              </>
            ) : (
              <>
                <MicOff className="w-3.5 h-3.5 text-zinc-500" />
                <span>AUDIO STANDBY</span>
              </>
            )}
          </button>

          {/* Test Speech / Jaw Sync Test Button */}
          <button
            onClick={handleTriggerActiveTalking}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-mono font-medium transition-all ${
              isSpeaking
                ? 'bg-violet-950/80 border-violet-500/80 text-violet-200 animate-pulse'
                : 'bg-zinc-950/80 hover:bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Trigger test vocalization to inspect mandible jaw lip-sync"
          >
            <MessageSquareQuote className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">{isSpeaking ? 'Speaking...' : 'Test Speech'}</span>
          </button>
        </div>

        {/* Live Audio Reactive Waveform */}
        <div className="flex-1 max-w-[180px] sm:max-w-[220px] h-7 flex items-center justify-between gap-1 px-2.5 bg-zinc-950/80 rounded-xl border border-zinc-800/80 shadow-inner">
          {waveHeights.map((h, i) => (
            <div
              key={i}
              className="w-1 rounded-full transition-all duration-100"
              style={{
                height: `${Math.max(15, isSpeaking || isListening ? Math.min(100, h * (0.3 + activeVol * 0.9)) : 15)}%`,
                backgroundColor: isSpeaking
                  ? '#C026FF'
                  : isListening
                  ? currentTheme.accent
                  : '#52525b',
                opacity: isSpeaking || isListening ? 1 : 0.4,
              }}
            />
          ))}
        </div>

        {/* Echo Shield Toggle Pill */}
        <button
          onClick={onToggleStopListeningWhileSpeaking}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-mono font-medium transition-all ${
            stopListeningWhileSpeaking
              ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
              : 'bg-zinc-950/80 border-zinc-800 text-zinc-500 hover:text-zinc-400'
          }`}
          title="Echo-Shield stops mic capture during speech replies to avoid feedback"
        >
          {stopListeningWhileSpeaking ? (
            <>
              <Shield className="w-3 h-3 text-cyan-400" />
              <span>Shield ON</span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-3 h-3 text-amber-400" />
              <span>Shield OFF</span>
            </>
          )}
        </button>
      </div>

      {/* 2. Central Push-to-Talk / Wake Voice Controls Row */}
      <div className="w-full flex items-center justify-center gap-4 py-1">
        {/* Center: Glowing Microphone Button */}
        <div className="relative flex items-center justify-center">
          {(isListening || isSpeaking) && (
            <div
              className="absolute -inset-3 rounded-full border border-cyan-400/40 animate-ping pointer-events-none"
              style={{ animationDuration: '3s' }}
            />
          )}
          <div
            className={`absolute -inset-1.5 rounded-full blur-md opacity-75 transition-all ${
              isSpeaking
                ? 'bg-gradient-to-r from-violet-600 to-cyan-400'
                : isListening
                ? 'bg-cyan-500'
                : 'bg-zinc-700/40'
            }`}
          />

          <button
            onClick={isSpeaking ? onInterrupt : onToggleConnection}
            className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl focus:outline-none ${
              isDisconnected || isError
                ? 'bg-gradient-to-tr from-cyan-600 to-violet-700 hover:from-cyan-500 hover:to-violet-600 text-white shadow-cyan-900/50 hover:scale-105'
                : isSpeaking
                ? 'bg-gradient-to-tr from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white shadow-violet-900/60 animate-pulse'
                : 'bg-gradient-to-tr from-cyan-500 to-violet-600 text-white shadow-cyan-950/60 ring-2 ring-cyan-400/70'
            }`}
            title={
              isSpeaking
                ? 'Interrupt ARAVAN'
                : isDisconnected
                ? 'Wake Voice Session'
                : 'Stop Voice Session'
            }
          >
            {isSpeaking ? (
              <Volume2 className="w-6 h-6 text-white animate-bounce" />
            ) : isListening ? (
              <Mic className="w-6 h-6 text-white stroke-[2.5]" />
            ) : isConnecting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Subtitle / Interaction Guide */}
      <div className="text-center">
        <div className="text-xs font-medium text-zinc-400">
          {isListening && (
            <div className="flex flex-col items-center gap-1.5">
              <span className="flex items-center gap-2 text-cyan-300 font-semibold text-xs tracking-wide">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                ARAVAN IS LISTENING TO YOUR SPEECH · SPEAK FREELY
              </span>
              <div className="w-52 h-1.5 rounded-full bg-zinc-800 overflow-hidden flex items-center shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 transition-all duration-75 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(12, micVolume * 140))}%` }}
                />
              </div>
            </div>
          )}
          {isSpeaking && (
            <span>
              ARAVAN is <span className="text-violet-400 font-semibold">vocalizing</span>... mic muted to avoid echo feedback
            </span>
          )}
          {isConnecting && (
            <span className="text-amber-300 animate-pulse">
              Synchronizing audio pipeline with ARAVAN neural core...
            </span>
          )}
          {(isDisconnected || isError) && (
            <span className="text-zinc-400 flex items-center justify-center gap-2 flex-wrap">
              <span className="text-cyan-400 font-medium">● Audio Ready:</span>
              <span>Tap the central microphone to speak with ARAVAN</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
