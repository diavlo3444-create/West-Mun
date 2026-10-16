import React, { useEffect, useRef, useState } from 'react';

interface OpeningIntroProps {
  onComplete: () => void;
  onFlightStart?: () => void;
}

type IntroStage = 'darkness' | 'reveal' | 'tagline' | 'flying' | 'finished';

export const OpeningIntro: React.FC<OpeningIntroProps> = ({ onComplete, onFlightStart }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<Animation | null>(null);
  const timersRef = useRef<number[]>([]);
  const isMountedRef = useRef<boolean>(true);
  const unlockBurstRef = useRef<boolean>(false);
  const isFlyingRef = useRef<boolean>(false);

  // Viewport detection
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 640 || window.innerHeight < 600;
  });

  const [isShortScreen, setIsShortScreen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerHeight < 520;
  });

  const [stage, setStage] = useState<IntroStage>('darkness');

  // Emblem and concentric summit architecture dimensions
  const diameter = isMobile ? (isShortScreen ? 76 : 88) : 128;
  const svgSize = diameter + (isMobile ? 48 : 80);
  const svgCenter = svgSize / 2;
  const outerArcRadius = diameter / 2 + (isMobile ? 16 : 26);
  const innerArcRadius = diameter / 2 + (isMobile ? 8 : 14);

  // Resize listener for responsive layout parameters
  useEffect(() => {
    const handleResize = () => {
      const mob = window.innerWidth < 640 || window.innerHeight < 600;
      const short = window.innerHeight < 520;
      setIsMobile((prev) => (prev !== mob ? mob : prev));
      setIsShortScreen((prev) => (prev !== short ? short : prev));
    };
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Lock body scroll during intro
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Gold dust particles canvas engine with depth tiers and specular glints
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);

    let viewW = window.innerWidth;
    let viewH = window.innerHeight;
    canvas.width = viewW * dpr;
    canvas.height = viewH * dpr;
    ctx.scale(dpr, dpr);

    const handleCanvasResize = () => {
      if (!canvas || !ctx) return;
      viewW = window.innerWidth;
      viewH = window.innerHeight;
      canvas.width = viewW * dpr;
      canvas.height = viewH * dpr;
      ctx.scale(dpr, dpr);
    };
    window.addEventListener('resize', handleCanvasResize, { passive: true });

    interface Particle {
      x: number;
      y: number;
      radius: number;
      speedY: number;
      driftBase: number;
      driftAmp: number;
      phase: number;
      freq: number;
      baseAlpha: number;
      twinkleSpeed: number;
      depth: 1 | 2 | 3; // 1: Distant subtle, 2: Midground warm gold, 3: Foreground specular glint
    }

    interface Spark {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      radius: number;
      color: string;
    }

    // Finely tuned particle density: restrained and spacious, like fine dust suspended in a quiet grand hall
    const count = 26;
    const particles: Particle[] = Array.from({ length: count }).map((_, i) => {
      const depth: 1 | 2 | 3 = i % 4 === 0 ? 3 : i % 2 === 0 ? 2 : 1;
      let radius = 1.0;
      let speedY = 0.3;
      let baseAlpha = 0.3;

      if (depth === 1) {
        // Distant micro-dust
        radius = Math.random() * 0.4 + 0.6;
        speedY = Math.random() * 0.15 + 0.18;
        baseAlpha = Math.random() * 0.15 + 0.15;
      } else if (depth === 2) {
        // Midground warm gold
        radius = Math.random() * 0.5 + 1.0;
        speedY = Math.random() * 0.22 + 0.28;
        baseAlpha = Math.random() * 0.2 + 0.35;
      } else {
        // Foreground glinting specular
        radius = Math.random() * 0.6 + 1.4;
        speedY = Math.random() * 0.3 + 0.42;
        baseAlpha = Math.random() * 0.25 + 0.5;
      }

      return {
        x: Math.random() * viewW,
        y: Math.random() * viewH,
        radius,
        speedY,
        driftBase: (Math.random() - 0.5) * 0.12,
        driftAmp: Math.random() * 0.25 + 0.15,
        phase: Math.random() * Math.PI * 2,
        freq: Math.random() * 0.018 + 0.012,
        twinkleSpeed: Math.random() * 0.03 + 0.02,
        baseAlpha,
        depth,
      };
    });

    const sparks: Spark[] = [];
    let frame = 0;

    const render = () => {
      if (isFlyingRef.current) {
        // Stop canvas work during flight animation to free up 100% of GPU compositor thread
        return;
      }

      frame++;
      ctx.clearRect(0, 0, viewW, viewH);

      // Trigger subtle harmonic spark burst on emblem reveal
      if (unlockBurstRef.current) {
        unlockBurstRef.current = false;
        const centerX = viewW / 2;
        const centerY = isMobile ? viewH * 0.38 : viewH * 0.39;
        const sparkCount = isMobile ? 10 : 18;
        const radiusSpawn = diameter / 2 + 8;

        for (let s = 0; s < sparkCount; s++) {
          const angle = (s / sparkCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
          const speed = Math.random() * 1.5 + 0.8;
          sparks.push({
            x: centerX + Math.cos(angle) * radiusSpawn,
            y: centerY + Math.sin(angle) * radiusSpawn,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0,
            maxLife: Math.random() * 24 + 28,
            radius: Math.random() * 1.1 + 0.8,
            color: s % 2 === 0 ? 'rgba(255, 245, 210,' : 'rgba(212, 175, 55,',
          });
        }
      }

      // Draw ambient gold particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y += p.speedY;
        p.x += p.driftBase + Math.sin(frame * p.freq + p.phase) * p.driftAmp;

        if (p.y > viewH + 12) {
          p.y = -12;
          p.x = Math.random() * viewW;
        }
        if (p.x < -12) p.x = viewW + 12;
        if (p.x > viewW + 12) p.x = -12;

        // Soft specular twinkle on foreground particles
        const twinkle = Math.sin(frame * p.twinkleSpeed + p.phase) * (p.depth === 3 ? 0.25 : 0.12);
        const currentAlpha = Math.max(0.08, Math.min(1, p.baseAlpha + twinkle));

        if (p.depth === 3) {
          // Specular glint with lightweight dual-pass glow (zero shadowBlur rasterization overhead)
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(212, 175, 55, ${currentAlpha * 0.25})`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 248, 220, ${currentAlpha})`;
          ctx.fill();
        } else if (p.depth === 2) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(212, 175, 55, ${currentAlpha})`;
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(180, 145, 80, ${currentAlpha})`;
          ctx.fill();
        }
      }

      // Draw reveal sparks
      for (let s = sparks.length - 1; s >= 0; s--) {
        const sp = sparks[s];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vx *= 0.93;
        sp.vy *= 0.93;
        sp.life++;

        const progress = sp.life / sp.maxLife;
        const alpha = Math.max(0, 1 - progress);

        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.radius * (1 - progress * 0.4), 0, Math.PI * 2);
        ctx.fillStyle = `${sp.color} ${alpha * 0.9})`;
        ctx.fill();

        if (sp.life >= sp.maxLife) {
          sparks.splice(s, 1);
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleCanvasResize);
    };
  }, [diameter, isMobile]);

  // Unified Orchestration Timeline — "The Golden Summit"
  useEffect(() => {
    isMountedRef.current = true;
    const timers = timersRef.current;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const addTimer = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        if (isMountedRef.current) {
          fn();
        }
      }, ms);
      timers.push(id);
      return id;
    };

    // If user prefers reduced motion: show brief static composition and unlock cleanly
    if (prefersReducedMotion) {
      setStage('tagline');
      addTimer(() => {
        if (isMountedRef.current) {
          if (onFlightStart) onFlightStart();
          setStage('finished');
          onComplete();
        }
      }, 700);

      return () => {
        isMountedRef.current = false;
        timers.forEach((t) => clearTimeout(t));
        timers.length = 0;
      };
    }

    const mob = window.innerWidth < 640 || window.innerHeight < 600;

    // ACT I -> ACT II: Reveal the centered WEST MUN emblem and architectural geometry
    addTimer(() => {
      unlockBurstRef.current = true;
      setStage('reveal');
    }, mob ? 400 : 650);

    // ACT II: Tagline reveal & full summit composition
    addTimer(() => {
      setStage('tagline');
    }, mob ? 1100 : 1600);

    // ACT III: The Cinematic Transition — Flight to exact navbar logo target
    addTimer(() => {
      if (!isMountedRef.current) return;

      const logoEl = logoRef.current;
      if (!logoEl) {
        onComplete();
        return;
      }

      const currentlyMobile = window.innerWidth < 640 || window.innerHeight < 600;

      const targetEl = document.getElementById('navbar-logo-target');
      const currentRect = logoEl.getBoundingClientRect();
      const currentCenterX = currentRect.left + currentRect.width / 2;
      const currentCenterY = currentRect.top + currentRect.height / 2;

      // Fallback coordinates matching Navbar layout
      let targetCenterX = currentlyMobile ? 38 : 52;
      let targetCenterY = currentlyMobile ? 34 : 40;
      let targetWidth = currentlyMobile ? 36 : 40;

      if (targetEl) {
        const targetRect = targetEl.getBoundingClientRect();
        if (targetRect.width > 0 && targetRect.height > 0) {
          targetCenterX = targetRect.left + targetRect.width / 2;
          targetCenterY = targetRect.top + targetRect.height / 2;
          targetWidth = targetRect.width;
        }
      }

      const dx = targetCenterX - currentCenterX;
      const dy = targetCenterY - currentCenterY;
      const scale = targetWidth / currentRect.width;

      isFlyingRef.current = true;
      setStage('flying');
      if (onFlightStart) {
        onFlightStart();
      }

      const flightDuration = currentlyMobile ? 800 : 950;

      if (typeof logoEl.animate === 'function') {
        const anim = logoEl.animate(
          [
            {
              transform: 'translate3d(0px, 0px, 0px) scale(1)',
              opacity: 1,
            },
            {
              transform: `translate3d(${dx}px, ${dy}px, 0px) scale(${scale})`,
              opacity: 1,
            },
          ],
          {
            duration: flightDuration,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'forwards',
          }
        );

        animRef.current = anim;

        anim.onfinish = () => {
          if (isMountedRef.current) {
            setStage('finished');
            onComplete();
          }
        };
      } else {
        // Fallback for browsers without Web Animations API
        addTimer(() => {
          if (isMountedRef.current) {
            setStage('finished');
            onComplete();
          }
        }, flightDuration);
      }
    }, mob ? 2500 : 3300);

    // Guaranteed unmount safety timeout
    addTimer(() => {
      if (isMountedRef.current) {
        setStage('finished');
        onComplete();
      }
    }, mob ? 3700 : 4700);

    return () => {
      isMountedRef.current = false;
      timers.forEach((t) => clearTimeout(t));
      timers.length = 0;
      if (animRef.current) {
        try {
          animRef.current.cancel();
        } catch {}
      }
    };
  }, [onComplete, onFlightStart]);

  const handleSkip = () => {
    if (!isMountedRef.current) return;
    if (animRef.current) {
      try {
        animRef.current.cancel();
      } catch {}
    }
    if (onFlightStart) onFlightStart();
    setStage('finished');
    onComplete();
  };

  if (stage === 'finished') return null;

  const isDarkness = stage === 'darkness';
  const isRevealed = stage === 'reveal' || stage === 'tagline' || stage === 'flying';
  const isTaglineVisible = stage === 'tagline';
  const isFlying = stage === 'flying';

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden select-none transition-colors duration-1000 ease-out ${
        isFlying ? 'pointer-events-none bg-transparent' : 'bg-[#040406]'
      }`}
      aria-label="WEST MUN Introduction"
      role="dialog"
      aria-modal="true"
    >
      {/* 1. Deep Atmospheric Vignette */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${
          isFlying ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          background:
            'radial-gradient(ellipse at 50% 40%, rgba(18, 18, 22, 0.4) 0%, rgba(8, 8, 10, 0.85) 60%, #030304 100%)',
        }}
      />

      {/* 2. Soft Anamorphic Warm-Gold Light Beam (ACT I: Emerging through the darkness) */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${
          isFlying ? 'opacity-0' : isRevealed ? 'opacity-80' : 'opacity-40'
        }`}
        style={{
          background:
            'radial-gradient(ellipse 65% 55% at 50% 36%, rgba(212, 175, 55, 0.12) 0%, rgba(180, 140, 45, 0.04) 42%, transparent 70%)',
        }}
      />

      {/* 3. Subtle Volumetric Diagonal Sheen in the Darkness */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${
          isDarkness ? 'opacity-70' : 'opacity-0'
        }`}
        style={{
          background:
            'linear-gradient(115deg, transparent 38%, rgba(212, 175, 55, 0.04) 48%, rgba(255, 245, 210, 0.09) 50%, rgba(212, 175, 55, 0.04) 52%, transparent 62%)',
        }}
      />

      {/* 4. Falling Gold Dust Particles Canvas */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${
          isFlying ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* 5. Centered Anchor: Holds Logo, Architectural Chamber Arcs, and Tagline */}
      <div
        className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
        style={{
          transform: `translate3d(0, ${isShortScreen ? '-7%' : isMobile ? '-12%' : '-10%'}, 0)`,
        }}
      >
        {/* LOGO FLYER ELEMENT — Starting at translate3d(0,0,0) */}
        <div
          ref={logoRef}
          className="relative pointer-events-none will-change-transform"
          style={{
            width: diameter,
            height: diameter,
          }}
        >
          {/* ARCHITECTURAL DIPLOMATIC HALL ARCS & SUMMIT GEOMETRY (SVG) */}
          <div
            className={`absolute pointer-events-none transition-[opacity,transform] duration-800 ease-out ${
              isFlying
                ? 'opacity-0 scale-95'
                : isRevealed
                ? 'opacity-85 scale-100'
                : 'opacity-0 scale-90'
            }`}
            style={{
              width: svgSize,
              height: svgSize,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <svg
              width={svgSize}
              height={svgSize}
              viewBox={`0 0 ${svgSize} ${svgSize}`}
              className="w-full h-full"
            >
              <defs>
                <linearGradient id="arcGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f7e7b4" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#d4af37" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#8c6d23" stopOpacity="0.3" />
                </linearGradient>
              </defs>

              {/* Outer Assembly Amphitheater Ring with fine dash pattern */}
              <circle
                cx={svgCenter}
                cy={svgCenter}
                r={outerArcRadius + (isMobile ? 6 : 10)}
                fill="none"
                stroke="#d4af37"
                strokeWidth="0.75"
                strokeDasharray="2 7"
                strokeOpacity="0.3"
              />

              {/* Radial Diplomatic Summit Markers around circumference */}
              {Array.from({ length: isMobile ? 8 : 16 }).map((_, i) => {
                const count = isMobile ? 8 : 16;
                const angle = (i / count) * 360;
                const rad = (angle * Math.PI) / 180;
                const isCardinal = i % (count / 4) === 0;
                const r1 = outerArcRadius + 1;
                const r2 = outerArcRadius + (isCardinal ? 6 : 4);
                return (
                  <line
                    key={i}
                    x1={svgCenter + Math.cos(rad) * r1}
                    y1={svgCenter + Math.sin(rad) * r1}
                    x2={svgCenter + Math.cos(rad) * r2}
                    y2={svgCenter + Math.sin(rad) * r2}
                    stroke="#d4af37"
                    strokeWidth={isCardinal ? '1' : '0.6'}
                    strokeOpacity={isCardinal ? '0.6' : '0.25'}
                  />
                );
              })}

              {/* Primary Architectural Vault Arc — Clockwise alignment */}
              <circle
                cx={svgCenter}
                cy={svgCenter}
                r={outerArcRadius}
                fill="none"
                stroke="url(#arcGoldGrad)"
                strokeWidth={isMobile ? '1.2' : '1.4'}
                strokeDasharray={isMobile ? '70 24 16 24' : '110 40 30 40'}
                strokeLinecap="round"
                style={{
                  transformOrigin: `${svgCenter}px ${svgCenter}px`,
                  transform: isRevealed ? 'rotate(0deg)' : 'rotate(-70deg)',
                  transition: 'transform 1000ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />

              {/* Inner Concentric Alignment Ring — Counter-clockwise alignment */}
              <circle
                cx={svgCenter}
                cy={svgCenter}
                r={innerArcRadius}
                fill="none"
                stroke="#f7e7b4"
                strokeWidth={isMobile ? '1.1' : '1.3'}
                strokeDasharray={isMobile ? '45 18 12 18' : '75 28 18 28'}
                strokeLinecap="round"
                strokeOpacity="0.75"
                style={{
                  transformOrigin: `${svgCenter}px ${svgCenter}px`,
                  transform: isRevealed ? 'rotate(0deg)' : 'rotate(80deg)',
                  transition: 'transform 1000ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />

              {/* Four Cardinal Summit Diamond Accents */}
              {[0, 90, 180, 270].map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const px = svgCenter + Math.cos(rad) * (outerArcRadius + 0.5);
                const py = svgCenter + Math.sin(rad) * (outerArcRadius + 0.5);
                return (
                  <polygon
                    key={deg}
                    points={`${px},${py - 2} ${px + 2},${py} ${px},${py + 2} ${px - 2},${py}`}
                    fill="#f7e7b4"
                    opacity={isRevealed ? 0.9 : 0.2}
                    style={{
                      transformOrigin: `${px}px ${py}px`,
                      transform: isRevealed ? 'scale(1.2)' : 'scale(0.8)',
                      transition: 'all 500ms ease-out',
                    }}
                  />
                );
              })}
            </svg>
          </div>

          {/* Soft Golden Chamber Backlight Halo */}
          <div
            className={`absolute inset-0 rounded-full pointer-events-none transition-[opacity,transform] duration-700 ease-out ${
              isFlying
                ? 'opacity-0 scale-95'
                : isRevealed
                ? 'opacity-70 scale-125 bg-[radial-gradient(circle,rgba(212,175,55,0.4)_0%,rgba(212,175,55,0.08)_50%,transparent_75%)]'
                : 'opacity-10 scale-95 bg-[radial-gradient(circle,rgba(212,175,55,0.2)_0%,transparent_70%)]'
            }`}
          />

          {/* OFFICIAL WEST MUN EMBLEM CONTAINER */}
          <div
            className={`relative w-full h-full rounded-full overflow-hidden bg-[#141414] flex items-center justify-center transition-[border-color,opacity] duration-500 ease-out ${
              isFlying
                ? 'border border-[#d4af37]/50 shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                : isRevealed
                ? 'border border-[#d4af37]/75 shadow-[0_0_35px_rgba(212,175,55,0.35),0_0_70px_rgba(212,175,55,0.12)] scale-100 opacity-100'
                : 'border border-[#d4af37]/30 shadow-[0_0_15px_rgba(212,175,55,0.1)] scale-95 opacity-0'
            }`}
          >
            {/* The official WEST MUN logo image */}
            <img
              src="/westmun-logo.jpg"
              alt="WEST MUN Official Logo"
              className="w-full h-full object-contain p-1.5 object-center select-none"
              draggable={false}
            />

            {/* Restrained Golden Metallic Light Sweep Across Emblem */}
            <div
              className={`absolute inset-0 pointer-events-none transition-transform duration-1000 ease-out ${
                isRevealed ? 'translate-x-[200%]' : '-translate-x-[180%]'
              }`}
              style={{
                background:
                  'linear-gradient(105deg, transparent 25%, rgba(255, 245, 210, 0.45) 50%, rgba(212, 175, 55, 0.2) 58%, transparent 75%)',
              }}
            />
          </div>
        </div>

        {/* Centered Diplomatic Tagline: Placed directly below the emblem */}
        <div
          className="absolute inset-x-0 mx-auto w-full max-w-xl flex flex-col items-center justify-center text-center pointer-events-none will-change-[opacity,transform]"
          style={{
            top: `calc(50% + ${diameter / 2 + (isMobile ? 16 : 24)}px)`,
            left: 0,
            right: 0,
            width: '100%',
            maxWidth: '36rem',
            marginLeft: 'auto',
            marginRight: 'auto',
            boxSizing: 'border-box',
            paddingLeft: isMobile ? '24px' : '32px',
            paddingRight: isMobile ? '24px' : '32px',
            textAlign: 'center',
            opacity: isTaglineVisible && !isFlying ? 1 : 0,
            transform: isTaglineVisible && !isFlying
              ? 'translate3d(0, 0px, 0)'
              : isFlying
              ? 'translate3d(0, -10px, 0)'
              : 'translate3d(0, 14px, 0)',
            transition: isFlying
              ? 'opacity 250ms ease-in, transform 250ms ease-in'
              : isTaglineVisible
              ? 'opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), transform 700ms cubic-bezier(0.16, 1, 0.3, 1)'
              : 'opacity 300ms ease-out, transform 300ms ease-out',
          }}
        >
          {/* Diplomatic Kicker */}
          <div
            className="w-full flex items-center justify-center gap-2 sm:gap-2.5 mb-1.5 sm:mb-2 text-center"
            style={{ textAlign: 'center', justifyContent: 'center' }}
          >
            <span className="w-5 sm:w-10 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/60 to-[#d4af37]/90 shrink-0" />
            <span className="text-[10px] sm:text-[11px] font-mono tracking-[0.2em] sm:tracking-[0.3em] uppercase text-[#d4af37] font-medium text-center">
              WEST MUN 2027
            </span>
            <span className="w-5 sm:w-10 h-[1px] bg-gradient-to-l from-transparent via-[#d4af37]/60 to-[#d4af37]/90 shrink-0" />
          </div>

          {/* Golden Shimmer Tagline */}
          <h1
            className="w-full text-center text-xl sm:text-2xl md:text-3xl font-serif font-normal tracking-wide leading-snug sm:leading-tight mb-1.5 sm:mb-2 shimmer-gold mx-auto"
            style={{
              fontFamily: 'var(--font-heading)',
              textAlign: 'center',
              marginLeft: 'auto',
              marginRight: 'auto',
              maxWidth: '100%',
              wordBreak: 'break-word',
            }}
          >
            Where Diplomacy Meets Leadership
          </h1>

          {/* Conference Dossier Line */}
          <p
            className="w-full text-center text-[9px] sm:text-xs text-neutral-400 font-light tracking-[0.16em] sm:tracking-[0.22em] uppercase mx-auto"
            style={{
              textAlign: 'center',
              marginLeft: 'auto',
              marginRight: 'auto',
              maxWidth: '100%',
            }}
          >
            Western Model United Nations Conference
          </p>

          {/* Diplomatic Diamond Motif */}
          <div
            className="w-full mt-2.5 sm:mt-3 flex items-center justify-center gap-2 opacity-60 text-center"
            style={{ textAlign: 'center', justifyContent: 'center' }}
          >
            <span className="w-1.5 h-1.5 rotate-45 border border-[#d4af37]/80 bg-[#d4af37]/25" />
          </div>
        </div>
      </div>

      {/* Cinematic Skip Intro Control */}
      <button
        type="button"
        onClick={handleSkip}
        className={`absolute bottom-5 right-5 sm:bottom-7 sm:right-7 z-50 text-[10px] sm:text-[11px] font-mono tracking-widest uppercase text-neutral-400 hover:text-[#d4af37] transition-all duration-300 cursor-pointer py-2 px-3.5 sm:px-4 border border-neutral-800/80 rounded-sm bg-[#0c0c0e]/95 hover:border-[#d4af37]/40 shadow-lg ${
          isFlying ? 'opacity-0 pointer-events-none' : 'opacity-70 hover:opacity-100'
        }`}
        aria-label="Skip opening intro"
      >
        Skip Intro <span className="inline-block transition-transform duration-200">→</span>
      </button>
    </div>
  );
};
