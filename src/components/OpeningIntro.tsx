import React, { useEffect, useRef, useState } from 'react';

interface OpeningIntroProps {
  onComplete: () => void;
}

export const OpeningIntro: React.FC<OpeningIntroProps> = ({ onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Stages:
  // 'initial': starting centered (with gentle fade in)
  // 'showcase': centered, tagline and particles in full elegant presence
  // 'flying': logo glides smoothly to top-left navbar target, tagline fades out
  // 'finished': hand-off complete, reveal full website
  const [stage, setStage] = useState<'initial' | 'showcase' | 'flying' | 'finished'>('initial');

  const [flightTransform, setFlightTransform] = useState<{
    deltaX: number;
    deltaY: number;
    scale: number;
  }>({
    deltaX: 0,
    deltaY: 0,
    scale: 0.32,
  });

  // Calculate GPU transform to move from center (top 44%, left 50%, size 124px) to navbar logo target
  const calculateFlightTransform = () => {
    const targetEl = document.getElementById('navbar-logo-target');
    const isMobile = window.innerWidth < 640;
    const targetRect = targetEl
      ? targetEl.getBoundingClientRect()
      : {
          top: isMobile ? 14 : 18,
          left: isMobile ? 20 : 32,
          width: isMobile ? 36 : 40,
          height: isMobile ? 36 : 40,
        };

    const initialCenterX = window.innerWidth / 2;
    const initialCenterY = window.innerHeight * 0.44;
    const initialSize = 124;

    const targetCenterX = targetRect.left + (targetRect.width || 40) / 2;
    const targetCenterY = targetRect.top + (targetRect.height || 40) / 2;
    const targetSize = targetRect.width || 40;

    setFlightTransform({
      deltaX: targetCenterX - initialCenterX,
      deltaY: targetCenterY - initialCenterY,
      scale: targetSize / initialSize,
    });
  };

  useEffect(() => {
    calculateFlightTransform();
    window.addEventListener('resize', calculateFlightTransform, { passive: true });
    return () => window.removeEventListener('resize', calculateFlightTransform);
  }, []);

  // Optimized Falling Gold Particles Animation (Zero Canvas shadowBlur to ensure 60 FPS on low-end hardware)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize, { passive: true });

    interface Particle {
      x: number;
      y: number;
      radius: number;
      speedY: number;
      driftBase: number;
      phase: number;
      alpha: number;
    }

    // Adaptive particle count for low-end devices / mobile
    const isLowPower =
      window.innerWidth < 768 ||
      (typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

    const count = isLowPower ? 20 : 36;

    const particles: Particle[] = Array.from({ length: count }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.8 + 1.0,
      speedY: Math.random() * 0.7 + 0.3,
      driftBase: (Math.random() - 0.5) * 0.3,
      phase: Math.random() * Math.PI * 2,
      alpha: Math.random() * 0.5 + 0.35,
    }));

    let frame = 0;
    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      // Fast, crisp particle render without expensive shadowBlur Gaussian filters
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y += p.speedY;
        p.x += p.driftBase + Math.sin(frame * 0.02 + p.phase) * 0.25;

        if (p.y > height + 10) {
          p.y = -10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 55, ${p.alpha})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Orchestrated Timeline:
  // 0ms: mount in 'initial'
  // 60ms: transition to 'showcase' (fade-in)
  // 2100ms: compute flight & transition to 'flying' (GPU transform glide to navbar)
  // 3300ms: transition to 'finished' & call onComplete()
  useEffect(() => {
    const tShowcase = setTimeout(() => {
      setStage('showcase');
    }, 60);

    const tFlight = setTimeout(() => {
      calculateFlightTransform();
      setStage('flying');
    }, 2100);

    const tFinish = setTimeout(() => {
      setStage('finished');
      onComplete();
    }, 3350);

    return () => {
      clearTimeout(tShowcase);
      clearTimeout(tFlight);
      clearTimeout(tFinish);
    };
  }, [onComplete]);

  const handleSkip = () => {
    setStage('finished');
    onComplete();
  };

  if (stage === 'finished') return null;

  const isFlying = stage === 'flying';

  return (
    <div
      onClick={handleSkip}
      className={`fixed inset-0 z-50 overflow-hidden select-none transition-opacity duration-700 ${
        isFlying ? 'pointer-events-none bg-[#070707]/0' : 'cursor-pointer bg-[#070707]'
      }`}
      aria-label="WEST MUN Introduction"
    >
      {/* Falling Gold Particles Canvas */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${
          isFlying ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Subtle Radial Atmosphere */}
      <div
        className={`absolute inset-0 pointer-events-none bg-radial from-transparent via-[#070707]/30 to-[#070707] transition-opacity duration-700 ${
          isFlying ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Intro Animated Logo — Uses 100% GPU-accelerated translate3d & scale (No layout reflows) */}
      <div
        className="fixed z-50 top-[44%] left-1/2 w-[124px] h-[124px] -ml-[62px] -mt-[62px] transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform pointer-events-none"
        style={{
          transform: isFlying
            ? `translate3d(${flightTransform.deltaX}px, ${flightTransform.deltaY}px, 0) scale(${flightTransform.scale})`
            : 'translate3d(0, 0, 0) scale(1)',
        }}
      >
        <div
          className={`relative w-full h-full rounded-full overflow-hidden border-2 border-[#d4af37]/70 shadow-[0_0_35px_rgba(212,175,55,0.3)] bg-[#0c0c0e] transition-opacity duration-500 ${
            stage === 'initial' ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <img
            src="/westmun-logo.jpg"
            alt="WEST MUN Official Logo"
            className="w-full h-full object-cover object-center"
          />
        </div>
      </div>

      {/* Centered Tagline & Subtitle (gentle fade-in, elegant gold typography with letter spacing) */}
      <div
        className={`absolute top-[calc(44%+76px)] left-1/2 -translate-x-1/2 w-full max-w-xl px-6 text-center transition-all duration-500 ease-out will-change-[opacity,transform] ${
          stage === 'initial'
            ? 'opacity-0 translate-y-3'
            : isFlying
            ? 'opacity-0 -translate-y-2 pointer-events-none'
            : 'opacity-100 translate-y-0'
        }`}
      >
        <div className="inline-flex items-center gap-2 mb-2.5">
          <span className="w-8 h-[1px] bg-gradient-to-r from-transparent to-[#d4af37]" />
          <span className="text-[11px] font-mono tracking-[0.3em] uppercase text-[#d4af37]">
            WEST MUN
          </span>
          <span className="w-8 h-[1px] bg-gradient-to-l from-transparent to-[#d4af37]" />
        </div>

        {/* Required Tagline */}
        <h1
          className="text-2xl sm:text-3xl md:text-4xl font-serif font-normal tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#f7e4a0] leading-tight mb-2"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Where Diplomacy Meets Leadership
        </h1>

        <p className="text-xs sm:text-sm text-neutral-400 font-light tracking-[0.18em] uppercase">
          Western Model United Nations Conference
        </p>
      </div>

      {/* Subtle skip indicator */}
      <div
        className={`absolute bottom-6 right-6 z-50 text-[10px] font-mono tracking-widest uppercase text-neutral-400 hover:text-[#d4af37] transition-opacity ${
          isFlying ? 'opacity-0' : 'opacity-70'
        }`}
      >
        Click anywhere to enter →
      </div>
    </div>
  );
};
