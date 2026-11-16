/**
 * ARAVAN — Cinematic Live Atmospheric Background
 * 
 * Multi-layer live animated background matching the reference screenshot:
 * Layer 1: Almost-black navy base with breathing deep-violet & cyan radial gradients
 * Layer 2: Faint perspective digital cybernetic grid
 * Layer 3: Drifting atmospheric nebula fog
 * Layer 4: 2D Canvas quantum star & holographic dust particles with micro-parallax
 * 
 * Ultra-lightweight: 60FPS GPU-friendly, zero second WebGL context.
 */

import React, { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

export const LiveBackground: React.FC = () => {
  const { currentTheme, applyTargets } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;

    const onMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    // 55 Lightweight quantum dust particles
    const particleCount = 55;
    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      alpha: number;
      color: string;
      pulseSpeed: number;
      pulseOffset: number;
    }[] = [];

    const colors = [
      currentTheme.accent,
      currentTheme.secondary,
      '#a855f7',
      '#06b6d4',
      '#ffffff',
    ];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25 - 0.08,
        radius: Math.random() * 1.8 + 0.6,
        alpha: Math.random() * 0.6 + 0.2,
        color: colors[i % colors.length],
        pulseSpeed: Math.random() * 0.02 + 0.01,
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }

    let frame = 0;
    const render = () => {
      frame++;
      mouseX += (targetMouseX - mouseX) * 0.03;
      mouseY += (targetMouseY - mouseY) * 0.03;
      const parallaxX = (mouseX / width - 0.5) * 16;
      const parallaxY = (mouseY / height - 0.5) * 16;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const currentAlpha = p.alpha * (0.6 + Math.sin(frame * p.pulseSpeed + p.pulseOffset) * 0.4);

        ctx.fillStyle = p.color;
        ctx.globalAlpha = currentAlpha;
        ctx.beginPath();
        ctx.arc(p.x - parallaxX * (p.radius * 0.4), p.y - parallaxY * (p.radius * 0.4), p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [currentTheme]);

  const bgThemeColor = applyTargets.background ? currentTheme.secondary : '#4c1d95';

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-[#03020c]">
      {/* 1. Deep Volumetric Ambient Glow Spots (Slow CSS Breathing) */}
      <div
        className="absolute -top-[15%] left-[10%] w-[80vw] h-[60vh] rounded-full blur-[140px] opacity-25 transition-all duration-1000 animate-pulse"
        style={{
          background: `radial-gradient(circle, ${bgThemeColor} 0%, rgba(15,5,30,0.8) 60%, transparent 80%)`,
          animationDuration: '10s',
        }}
      />
      <div
        className="absolute top-[35%] -left-[10%] w-[45vw] h-[55vh] rounded-full blur-[130px] opacity-20"
        style={{
          background: `radial-gradient(circle, ${currentTheme.glow} 0%, transparent 70%)`,
        }}
      />
      <div
        className="absolute top-[40%] -right-[10%] w-[45vw] h-[55vh] rounded-full blur-[130px] opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)',
        }}
      />

      {/* 2. Faint Cybernetic Digital Grid Floor */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 229, 255, 0.4) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(168, 85, 247, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 90% 70% at 50% 50%, black 20%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 50%, black 20%, transparent 80%)',
        }}
      />

      {/* 3. Drifting Nebula Fog Highlights */}
      <div
        className="absolute inset-0 opacity-15 mix-blend-screen"
        style={{
          background: 'radial-gradient(ellipse at 50% 45%, rgba(122,44,255,0.25) 0%, rgba(0,229,255,0.1) 40%, transparent 75%)',
        }}
      />

      {/* 4. Canvas Particle Layer */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full mix-blend-screen opacity-90"
      />
    </div>
  );
};
