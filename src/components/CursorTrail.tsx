import React, { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

export const CursorTrail: React.FC = () => {
  const { currentTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Respect prefers-reduced-motion
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

    // Trail points
    const points: { x: number; y: number; alpha: number; radius: number }[] = [];
    const maxPoints = 18;

    const onMouseMove = (e: MouseEvent) => {
      points.unshift({
        x: e.clientX,
        y: e.clientY,
        alpha: 0.6,
        radius: 3.5,
      });
      if (points.length > maxPoints) {
        points.pop();
      }
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = currentTheme.accent;
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        p.alpha *= 0.88;
        p.radius *= 0.94;

        if (p.alpha > 0.02) {
          ctx.globalAlpha = p.alpha * 0.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [currentTheme.accent]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50 mix-blend-screen"
    />
  );
};
