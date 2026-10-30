import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';

export const AmbientBackground: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;

  // Determine ambient mood based on route
  const isVoiceRoute = path.includes('voice-keeper');
  const isPerksRoute = path.includes('perks');
  const isPermitsRoute = path.includes('permits');

  const spotlightRef = useRef<HTMLDivElement>(null);
  const dotGridRef = useRef<HTMLDivElement>(null);

  const targetPosRef = useRef({ x: -500, y: -500 });
  const currentPosRef = useRef({ x: -500, y: -500 });
  const rafIdRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);

  useEffect(() => {
    // Check if device supports fine pointer (mouse/trackpad, not touch-only)
    if (window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    const animate = () => {
      // Smooth linear interpolation (lerp factor 0.09)
      const dx = targetPosRef.current.x - currentPosRef.current.x;
      const dy = targetPosRef.current.y - currentPosRef.current.y;

      currentPosRef.current.x += dx * 0.09;
      currentPosRef.current.y += dy * 0.09;

      const posX = Math.round(currentPosRef.current.x);
      const posY = Math.round(currentPosRef.current.y);

      // Cập nhật trực tiếp trên DOM node mà không gây React re-render (0ms latency, 60/120fps)
      if (spotlightRef.current) {
        spotlightRef.current.style.transform = `translate3d(${posX - 270}px, ${posY - 270}px, 0)`;
      }
      if (dotGridRef.current) {
        const maskVal = `radial-gradient(340px circle at ${posX}px ${posY}px, black 15%, transparent 100%)`;
        dotGridRef.current.style.maskImage = maskVal;
        dotGridRef.current.style.webkitMaskImage = maskVal;
      }

      // Keep running if there's significant movement
      if (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2) {
        rafIdRef.current = requestAnimationFrame(animate);
      } else {
        isRunningRef.current = false;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      targetPosRef.current = { x: e.clientX, y: e.clientY };

      if (spotlightRef.current) spotlightRef.current.style.opacity = '1';
      if (dotGridRef.current) dotGridRef.current.style.opacity = '0.9';

      if (!isRunningRef.current) {
        isRunningRef.current = true;
        rafIdRef.current = requestAnimationFrame(animate);
      }
    };

    const handlePointerLeave = () => {
      if (spotlightRef.current) spotlightRef.current.style.opacity = '0';
      if (dotGridRef.current) dotGridRef.current.style.opacity = '0';
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('mouseleave', handlePointerLeave);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('mouseleave', handlePointerLeave);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Spotlight color based on active module
  const spotlightColor = isVoiceRoute
    ? 'rgba(6, 182, 212, 0.22)' // Cyber Cyan
    : isPerksRoute
    ? 'rgba(245, 158, 11, 0.20)' // Liquid Gold / Amber
    : isPermitsRoute
    ? 'rgba(168, 85, 247, 0.22)' // Royal Violet
    : 'rgba(88, 101, 242, 0.22)'; // Discord Blurple

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 select-none">
      {/* LAYER 1: LIVING AURORA ORBS (ROUTE-AWARE MOOD LIGHTING) */}
      <div className="absolute inset-0">
        <div
          className={cn(
            'absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full blur-[140px] transition-all duration-1000 animate-aurora-1 opacity-40',
            isVoiceRoute
              ? 'bg-cyan-500'
              : isPerksRoute
              ? 'bg-amber-500'
              : isPermitsRoute
              ? 'bg-purple-600'
              : 'bg-discord-blurple',
          )}
        />
        <div
          className={cn(
            'absolute -bottom-40 -right-32 w-[580px] h-[580px] rounded-full blur-[150px] transition-all duration-1000 animate-aurora-2 opacity-35',
            isVoiceRoute
              ? 'bg-emerald-500'
              : isPerksRoute
              ? 'bg-pink-500'
              : isPermitsRoute
              ? 'bg-fuchsia-600'
              : 'bg-indigo-600',
          )}
        />
      </div>

      {/* LAYER 2: INTERACTIVE POINTER SPOTLIGHT (DIRECT HARDWARE ACCELERATED DOM) */}
      <div
        ref={spotlightRef}
        className="absolute top-0 left-0 rounded-full pointer-events-none transition-opacity duration-300 blur-[85px] will-change-transform opacity-0"
        style={{
          width: 540,
          height: 540,
          transform: 'translate3d(-500px, -500px, 0)',
          background: `radial-gradient(circle, ${spotlightColor} 0%, transparent 70%)`,
        }}
      />

      {/* LAYER 3: CYBER MATRIX DOT-GRID PATTERN */}
      <div className="absolute inset-0 cyber-dot-grid opacity-60" />

      {/* LAYER 4: POINTER-INTERACTIVE DOT-GRID ILLUMINATOR */}
      <div
        ref={dotGridRef}
        className="absolute inset-0 cyber-dot-grid pointer-events-none transition-opacity duration-300 opacity-0"
      />

      {/* LAYER 5: CYBER ISOMETRIC LINES GRID */}
      <div className="absolute inset-0 cyber-lines-grid opacity-35" />

      {/* LAYER 6: FILM NOISE TEXTURE */}
      <div
        className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};

export default AmbientBackground;
