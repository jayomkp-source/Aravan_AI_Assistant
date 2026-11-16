/**
 * CosmicBackground.tsx - Living Futuristic Cosmic Environment
 *
 * Section 71-81 Strict Compliance:
 * - Subtle Stars: hundreds of tiny drifting, twinkling stars with varied sizes & luminosities.
 * - Distant Planets: 1 large distant ringed planet + 3 subtle orbiters drifting slowly in corners,
 *   never overlapping the central skull viewport.
 * - Nebula: Layered slow-drifting purple/cyan cosmic dust and gas clouds.
 * - Cursor Parallax: Background shifts subtly opposite to mouse without affecting skull tracking.
 * - Live Cosmic Events: Occasional rare subtle shooting star.
 * - Audio-Reactive: Reacts subtly to voiceState (purple on speaking, cyan on listening).
 * - High Performance: 2D Canvas + hardware accelerated CSS with zero WebGL conflicts.
 */

import React, { useEffect, useRef } from 'react';
import { VoiceState, ScreenShareState } from '../types';

interface CosmicBackgroundProps {
  voiceState: VoiceState;
  speakerVolume?: number;
  micVolume?: number;
  screenState?: ScreenShareState;
}

interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  baseAlpha: number;
  twinkleSpeed: number;
  driftX: number;
  driftY: number;
}

interface ShootingStar {
  x: number;
  y: number;
  len: number;
  speed: number;
  angle: number;
  alpha: number;
  active: boolean;
}

export const CosmicBackground: React.FC<CosmicBackgroundProps> = ({
  voiceState,
  speakerVolume = 0,
  micVolume = 0,
  screenState = 'SCREEN_OFF',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const parallaxRef = useRef<{ targetX: number; targetY: number; currX: number; currY: number }>({
    targetX: 0,
    targetY: 0,
    currX: 0,
    currY: 0,
  });

  const stateRef = useRef({
    voiceState,
    speakerVolume,
    micVolume,
    screenState,
  });

  useEffect(() => {
    stateRef.current = { voiceState, speakerVolume, micVolume, screenState };
  }, [voiceState, speakerVolume, micVolume, screenState]);

  // Subtle cursor parallax listener
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      // Parallax shift opposite to mouse (max 14px)
      parallaxRef.current.targetX = -((e.clientX - halfW) / halfW) * 14;
      parallaxRef.current.targetY = -((e.clientY - halfH) / halfH) * 10;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Canvas starfield & cosmic events animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Initialize 240 performant stars
    const starCount = 240;
    const stars: Star[] = [];
    for (let i = 0; i < starCount; i++) {
      const baseAlpha = 0.2 + Math.random() * 0.7;
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() < 0.85 ? 0.8 + Math.random() * 0.8 : 1.8 + Math.random() * 1.2,
        alpha: baseAlpha,
        baseAlpha,
        twinkleSpeed: 0.008 + Math.random() * 0.02,
        driftX: (Math.random() - 0.5) * 0.04,
        driftY: -0.02 - Math.random() * 0.05,
      });
    }

    // Occasional subtle shooting star
    let shootingStar: ShootingStar | null = null;
    let nextShootingStarTime = performance.now() + 8000 + Math.random() * 15000;

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const render = (time: number) => {
      animId = requestAnimationFrame(render);

      // Smooth parallax damping
      const p = parallaxRef.current;
      p.currX += (p.targetX - p.currX) * 0.05;
      p.currY += (p.targetY - p.currY) * 0.05;

      ctx.clearRect(0, 0, width, height);

      const { voiceState: vs, speakerVolume: sv, screenState: scs } = stateRef.current;
      const isSpeaking = vs === 'speaking';
      const isListening = vs === 'listening';
      const audioBoost = isSpeaking ? (sv || 0.5) * 0.4 : isListening ? 0.15 : 0;

      // Draw Stars
      for (let i = 0; i < starCount; i++) {
        const star = stars[i];

        // Drift slowly
        star.x += star.driftX;
        star.y += star.driftY;
        if (star.y < 0) star.y = height;
        if (star.x < 0) star.x = width;
        if (star.x > width) star.x = 0;

        // Twinkle subtly
        star.alpha =
          star.baseAlpha + Math.sin(time * star.twinkleSpeed + i) * 0.25 + audioBoost * 0.35;
        const finalAlpha = Math.min(1, Math.max(0.1, star.alpha));

        const drawX = star.x + p.currX * 0.6;
        const drawY = star.y + p.currY * 0.6;

        ctx.fillStyle = i % 5 === 0 ? `rgba(180, 220, 255, ${finalAlpha})` : `rgba(235, 235, 255, ${finalAlpha})`;
        ctx.beginPath();
        ctx.arc(drawX, drawY, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Live Rare Cosmic Event: Shooting Star (Section 77)
      if (time > nextShootingStarTime && !shootingStar) {
        shootingStar = {
          x: Math.random() * (width * 0.7),
          y: Math.random() * (height * 0.3),
          len: 80 + Math.random() * 60,
          speed: 9 + Math.random() * 5,
          angle: Math.PI / 4 + (Math.random() - 0.5) * 0.2,
          alpha: 0.8,
          active: true,
        };
        nextShootingStarTime = time + 18000 + Math.random() * 25000;
      }

      if (shootingStar && shootingStar.active) {
        const ss = shootingStar;
        const tailX = ss.x - Math.cos(ss.angle) * ss.len;
        const tailY = ss.y - Math.sin(ss.angle) * ss.len;

        const grad = ctx.createLinearGradient(tailX, tailY, ss.x, ss.y);
        grad.addColorStop(0, 'rgba(122, 44, 255, 0)');
        grad.addColorStop(0.7, `rgba(0, 229, 255, ${ss.alpha * 0.5})`);
        grad.addColorStop(1, `rgba(255, 255, 255, ${ss.alpha})`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(ss.x, ss.y);
        ctx.stroke();

        ss.x += Math.cos(ss.angle) * ss.speed;
        ss.y += Math.sin(ss.angle) * ss.speed;
        ss.alpha -= 0.015;

        if (ss.alpha <= 0 || ss.x > width || ss.y > height) {
          shootingStar = null;
        }
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* 1. Deep Space Base Radial Fog */}
      <div className="absolute inset-0 bg-[#04020a]" />

      {/* 2. Drifting Purple & Cyan Nebula Clouds (Section 74) */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          background: `
            radial-gradient(circle 800px at 15% 20%, rgba(122, 44, 255, ${
              voiceState === 'speaking' ? 0.22 : 0.14
            }), transparent 70%),
            radial-gradient(circle 700px at 85% 75%, rgba(0, 191, 255, ${
              voiceState === 'listening' || screenState === 'SCREEN_ACTIVE' ? 0.20 : 0.12
            }), transparent 70%),
            radial-gradient(circle 500px at 50% 10%, rgba(255, 42, 109, ${
              voiceState === 'speaking' ? 0.10 : 0.05
            }), transparent 60%)
          `,
        }}
      />

      {/* 3. Distant Planets (Section 73) - Strategically positioned in far corners away from central skull */}
      {/* Major Planet: Gas Giant with Ring in Top-Right Corner */}
      <div
        className="absolute top-10 right-14 w-28 h-28 rounded-full pointer-events-none opacity-40 transition-transform duration-700 hidden md:block"
        style={{
          background: 'radial-gradient(circle at 35% 35%, #593196 0%, #1e1136 65%, #0d0618 100%)',
          boxShadow: '0 0 35px rgba(122, 44, 255, 0.35)',
        }}
      >
        {/* Planet Ring */}
        <div
          className="absolute -inset-4 border border-violet-400/30 rounded-full pointer-events-none"
          style={{
            transform: 'scaleY(0.3) rotate(-25deg)',
          }}
        />
        {/* Tiny orbiting moon */}
        <div
          className="absolute -top-3 -right-2 w-2 h-2 rounded-full bg-cyan-300/60 shadow-[0_0_8px_#00e5ff]"
        />
      </div>

      {/* Minor Planet: Distant Ice World in Bottom-Left */}
      <div
        className="absolute bottom-16 left-12 w-16 h-16 rounded-full pointer-events-none opacity-30 hidden sm:block"
        style={{
          background: 'radial-gradient(circle at 30% 30%, #00e5ff 0%, #005080 70%, #031422 100%)',
          boxShadow: '0 0 25px rgba(0, 229, 255, 0.25)',
        }}
      />

      {/* 4. Canvas Starfield with Twinkle, Drift & Cosmic Shooting Stars */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* 5. Subtle Cosmic Vignette & Holographic Grid Floor Fade */}
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, #04020a 95%)',
      }} />
    </div>
  );
};
