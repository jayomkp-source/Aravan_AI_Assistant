/**
 * VoiceOrb - Central Reactive Voice Core
 * 
 * Visualizes the 4 major voice states:
 * - 'disconnected': Calm, dormant dark bronze-slate glow
 * - 'connecting': Focused amber/gold orbital spin
 * - 'listening': Expands and ripples to microphone input amplitude
 * - 'speaking': Resonant deep amber-bronze energy waves matching ARAVAN's voice amplitude
 * - 'error': Intense crimson alert state
 */

import React from 'react';
import { VoiceState } from '../types';

interface VoiceOrbProps {
  voiceState: VoiceState;
  micVolume: number;
  speakerVolume: number;
  onClick: () => void;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  voiceState,
  micVolume,
  speakerVolume,
  onClick,
}) => {
  // Compute active scale and glow intensity based on state and real-time audio amplitude
  const isSpeaking = voiceState === 'speaking';
  const isListening = voiceState === 'listening';
  const isConnecting = voiceState === 'connecting';
  const isError = voiceState === 'error';

  const audioLevel = isSpeaking ? speakerVolume : isListening ? micVolume : 0;
  const dynamicScale = 1 + audioLevel * 0.35;
  const coreScale = 1 + audioLevel * 0.45;
  const ringScale = 1 + audioLevel * 0.7;

  return (
    <div
      id="aravan-voice-orb-container"
      className="relative flex items-center justify-center cursor-pointer select-none group w-72 h-72 sm:w-88 sm:h-88"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label="ARAVAN Voice Core"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Outer ambient radiant halo */}
      <div
        className={`absolute inset-0 rounded-full transition-all duration-700 blur-3xl opacity-40 ${
          isError
            ? 'bg-rose-700'
            : isSpeaking
            ? 'bg-amber-600'
            : isListening
            ? 'bg-amber-500/50'
            : isConnecting
            ? 'bg-amber-400/40 animate-pulse'
            : 'bg-zinc-800/60 group-hover:bg-amber-950/40'
        }`}
        style={{
          transform: `scale(${dynamicScale * 1.15})`,
        }}
      />

      {/* Outer resonant soundwave ring 1 */}
      <div
        className={`absolute rounded-full border transition-all duration-150 ${
          isError
            ? 'border-rose-500/60 w-64 h-64 sm:w-80 sm:h-80'
            : isSpeaking
            ? 'border-amber-400/70 w-64 h-64 sm:w-80 sm:h-80'
            : isListening
            ? 'border-amber-300/40 w-60 h-60 sm:w-76 sm:h-76'
            : isConnecting
            ? 'border-amber-500/50 w-60 h-60 sm:w-76 sm:h-76 animate-ping'
            : 'border-zinc-800 w-52 h-52 sm:w-68 sm:h-68 group-hover:border-zinc-700'
        }`}
        style={{
          transform: `scale(${ringScale})`,
          opacity: isSpeaking || isListening ? 0.3 + audioLevel * 0.7 : 0.2,
        }}
      />

      {/* Middle orbital ring with subtle rotational effect */}
      <div
        className={`absolute rounded-full border border-dashed transition-all duration-300 ${
          isError
            ? 'border-rose-400/80 w-52 h-52 sm:w-64 sm:h-64'
            : isSpeaking
            ? 'border-amber-300/80 w-52 h-52 sm:w-64 sm:h-64 animate-spin'
            : isListening
            ? 'border-amber-400/50 w-48 h-48 sm:w-60 sm:h-60'
            : isConnecting
            ? 'border-amber-400 w-48 h-48 sm:w-60 sm:h-60 animate-spin'
            : 'border-zinc-800/80 w-44 h-44 sm:w-56 sm:h-56 group-hover:border-amber-900/50'
        }`}
        style={{
          animationDuration: isSpeaking ? '8s' : isConnecting ? '2s' : '20s',
          transform: `scale(${dynamicScale})`,
        }}
      />

      {/* Inner resonant pulse sphere */}
      <div
        className={`relative z-10 rounded-full flex items-center justify-center shadow-2xl transition-all duration-200 ${
          isError
            ? 'w-36 h-36 sm:w-44 sm:h-44 bg-gradient-to-tr from-rose-950 via-rose-900 to-rose-700 border border-rose-500/70 shadow-rose-950/80'
            : isSpeaking
            ? 'w-36 h-36 sm:w-44 sm:h-44 bg-gradient-to-tr from-stone-950 via-amber-950 to-amber-700 border border-amber-400/80 shadow-amber-950/80'
            : isListening
            ? 'w-36 h-36 sm:w-44 sm:h-44 bg-gradient-to-tr from-stone-950 via-stone-900 to-amber-900 border border-amber-500/50 shadow-amber-950/40'
            : isConnecting
            ? 'w-36 h-36 sm:w-44 sm:h-44 bg-gradient-to-tr from-stone-950 via-amber-950 to-stone-900 border border-amber-400/60 shadow-amber-950/50 animate-pulse'
            : 'w-32 h-32 sm:w-40 sm:h-40 bg-gradient-to-tr from-zinc-950 via-zinc-900 to-zinc-850 border border-zinc-700/60 shadow-black group-hover:border-amber-600/40'
        }`}
        style={{
          transform: `scale(${coreScale})`,
        }}
      >
        {/* Core luminous heart */}
        <div
          className={`rounded-full transition-all duration-150 ${
            isError
              ? 'w-16 h-16 sm:w-20 sm:h-20 bg-rose-500 shadow-[0_0_35px_#f43f5e]'
              : isSpeaking
              ? 'w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-200 to-amber-500 shadow-[0_0_40px_#f59e0b]'
              : isListening
              ? 'w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-amber-300 to-amber-600 shadow-[0_0_25px_#d97706]'
              : isConnecting
              ? 'w-12 h-12 sm:w-14 sm:h-14 bg-amber-400 shadow-[0_0_20px_#f59e0b]'
              : 'w-10 h-10 sm:w-12 sm:h-12 bg-zinc-700 group-hover:bg-zinc-600 shadow-[0_0_15px_rgba(255,255,255,0.05)]'
          }`}
          style={{
            transform: `scale(${1 + audioLevel * 0.5})`,
          }}
        />

        {/* Tactical inner acoustic crosshair */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <div className="w-full h-px bg-current" />
          <div className="h-full w-px bg-current absolute" />
        </div>
      </div>
    </div>
  );
};
