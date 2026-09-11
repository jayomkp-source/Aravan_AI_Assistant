/**
 * Waveform - Dynamic Reactive Acoustic Visualizer
 * 
 * Renders real-time audio oscillations based on mic input or speaker output.
 */

import React, { useMemo } from 'react';
import { VoiceState } from '../types';

interface WaveformProps {
  voiceState: VoiceState;
  micVolume: number;
  speakerVolume: number;
}

export const Waveform: React.FC<WaveformProps> = ({
  voiceState,
  micVolume,
  speakerVolume,
}) => {
  const isSpeaking = voiceState === 'speaking';
  const isListening = voiceState === 'listening';
  const isConnecting = voiceState === 'connecting';
  const isError = voiceState === 'error';

  const activeVolume = isSpeaking ? speakerVolume : isListening ? micVolume : 0;
  const barCount = 32;

  // Generate bar heights with natural harmonic distribution
  const bars = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < barCount; i++) {
      // Gaussian / bell distribution towards center
      const distanceFromCenter = Math.abs(i - barCount / 2) / (barCount / 2);
      const bellCurve = Math.cos(distanceFromCenter * (Math.PI / 2.2));
      arr.push(Math.max(0.1, bellCurve));
    }
    return arr;
  }, [barCount]);

  return (
    <div id="aravan-waveform" className="flex items-center justify-center gap-1.5 sm:gap-2 h-14 w-full max-w-md px-6 select-none">
      {bars.map((bellWeight, index) => {
        // Calculate dynamic height
        let heightMultiplier = 0.15; // default idle baseline

        if (isSpeaking) {
          // Dynamic lively oscillation for ARAVAN speaking
          const wavePhase = Math.sin(index * 0.4 + Date.now() * 0.005);
          heightMultiplier = 0.2 + (bellWeight * activeVolume * 1.6) + (wavePhase * activeVolume * 0.4);
        } else if (isListening) {
          // Responsive mic waveform
          const wavePhase = Math.cos(index * 0.5 + Date.now() * 0.004);
          heightMultiplier = 0.18 + (bellWeight * activeVolume * 1.4) + (wavePhase * activeVolume * 0.3);
        } else if (isConnecting) {
          // Scanning pulse wave
          const wavePhase = Math.sin((index - (Date.now() * 0.01) % barCount) * 0.3);
          heightMultiplier = 0.2 + Math.max(0, wavePhase) * 0.5;
        }

        const clampedHeight = Math.min(100, Math.max(8, heightMultiplier * 100));

        return (
          <div
            key={index}
            className={`w-1 sm:w-1.5 rounded-full transition-all duration-75 ${
              isError
                ? 'bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                : isSpeaking
                ? 'bg-gradient-to-t from-amber-600 via-amber-400 to-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                : isListening
                ? 'bg-gradient-to-t from-amber-700 via-amber-500 to-amber-300 shadow-[0_0_6px_rgba(217,119,6,0.3)]'
                : isConnecting
                ? 'bg-amber-400/60'
                : 'bg-zinc-800'
            }`}
            style={{
              height: `${clampedHeight}%`,
              opacity: isSpeaking || isListening ? 0.6 + activeVolume * 0.4 : 0.3,
            }}
          />
        );
      })}
    </div>
  );
};
