import React, { useEffect, useRef, useState } from 'react';

interface OpeningIntroProps {
  onComplete: () => void;
  onFlightStart?: () => void;
}

type IntroStage = 'chamber' | 'locking' | 'unlock' | 'appreciation' | 'flying' | 'finished';

export const OpeningIntro: React.FC<OpeningIntroProps> = ({ onComplete, onFlightStart }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<Animation | null>(null);
  const timersRef = useRef<number[]>([]);
  const isMountedRef = useRef<boolean>(true);
  const unlockBurstRef = useRef<boolean>(false);

  // Viewport detection
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 640 || window.innerHeight < 600;
  });

  const [stage, setStage] = useState<IntroStage>('chamber');

  // Emblem and lock dimensions
  const diameter = isMobile ? 90 : 122;
  const svgSize = diameter + (isMobile ? 44 : 68);
  const svgCenter = svgSize / 2;
  const outerArcRadius = diameter / 2 + (isMobile ? 11 : 17);
  const innerArcRadius = diameter / 2 + (isMobile ? 6 : 9);

  // Resize listener strictly for mobile flag update
  useEffect(() => {
    const handleResize = () => {
      const mob = window.innerWidth < 640 || window.innerHeight < 600;
      setIsMobile((prev) => (prev !== mob ? mob : prev));
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock body scroll during intro
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Gold dust particles canvas engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

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
      depth: 1 | 2 | 3;
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

    const count = isMobile ? 14 : 26;
    const particles: Particle[] = Array.from({ length: count }).map((_, i) => {
      const depth: 1 | 2 | 3 = i % 4 === 0 ? 3 : i % 2 === 0 ? 2 : 1;
      let radius = 1.0;
      let speedY = 0.35;
      let baseAlpha = 0.35;

      if (depth === 1) {
        radius = Math.random() * 0.4 + 0.6;
        speedY = Math.random() * 0.2 + 0.2;
        baseAlpha = Math.random() * 0.2 + 0.18;
      } else if (depth === 2) {
        radius = Math.random() * 0.5 + 1.1;
        speedY = Math.random() * 0.3 + 0.35;
        baseAlpha = Math.random() * 0.2 + 0.35;
      } else {
        radius = Math.random() * 0.6 + 1.6;
        speedY = Math.random() * 0.4 + 0.5;
        baseAlpha = Math.random() * 0.25 + 0.55;
      }

      return {
        x: Math.random() * viewW,
        y: Math.random() * viewH,
        radius,
        speedY,
        driftBase: (Math.random() - 0.5) * 0.15,
        driftAmp: Math.random() * 0.3 + 0.15,
        phase: Math.random() * Math.PI * 2,
        freq: Math.random() * 0.02 + 0.015,
        baseAlpha,
        depth,
      };
    });

    const sparks: Spark[] = [];
    let frame = 0;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, viewW, viewH);

      // Trigger burst on unlock
      if (unlockBurstRef.current) {
        unlockBurstRef.current = false;
        const centerX = viewW / 2;
        const centerY = isMobile ? viewH * 0.36 : viewH * 0.38;
        const sparkCount = isMobile ? 12 : 20;
        const radiusSpawn = diameter / 2 + 8;

        for (let s = 0; s < sparkCount; s++) {
          const angle = (s / sparkCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
          const speed = Math.random() * 1.8 + 1.2;
          sparks.push({
            x: centerX + Math.cos(angle) * radiusSpawn,
            y: centerY + Math.sin(angle) * radiusSpawn,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0,
            maxLife: Math.random() * 25 + 35,
            radius: Math.random() * 1.2 + 0.8,
            color: s % 2 === 0 ? 'rgba(247, 231, 180,' : 'rgba(212, 175, 55,',
          });
        }
      }

      // Draw ambient particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y += p.speedY;
        p.x += p.driftBase + Math.sin(frame * p.freq + p.phase) * p.driftAmp;

        if (p.y > viewH + 10) {
          p.y = -10;
          p.x = Math.random() * viewW;
        }
        if (p.x < -10) p.x = viewW + 10;
        if (p.x > viewW + 10) p.x = -10;

        const twinkle = Math.sin(frame * 0.035 + p.phase) * 0.1;
        const currentAlpha = Math.max(0.1, Math.min(1, p.baseAlpha + twinkle));

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        if (p.depth === 3) {
          ctx.fillStyle = `rgba(247, 231, 180, ${currentAlpha})`;
        } else if (p.depth === 2) {
          ctx.fillStyle = `rgba(212, 175, 55, ${currentAlpha})`;
        } else {
          ctx.fillStyle = `rgba(197, 160, 89, ${currentAlpha})`;
        }
        ctx.fill();
      }

      // Draw unlock sparks
      for (let s = sparks.length - 1; s >= 0; s--) {
        const sp = sparks[s];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vx *= 0.94;
        sp.vy *= 0.94;
        sp.life++;

        const progress = sp.life / sp.maxLife;
        const alpha = Math.max(0, 1 - progress);

        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.radius * (1 - progress * 0.4), 0, Math.PI * 2);
        ctx.fillStyle = `${sp.color} ${alpha * 0.85})`;
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

  // Unified Orchestration Timeline — Runs once on mount
  useEffect(() => {
    isMountedRef.current = true;
    const timers = timersRef.current;

    // Helper to queue timeouts safely
    const addTimer = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        if (isMountedRef.current) {
          fn();
        }
      }, ms);
      timers.push(id);
      return id;
    };

    // Phase 1: Begin vault locking arcs rotation
    addTimer(() => {
      setStage('locking');
    }, isMobile ? 550 : 650);

    // Phase 2: Lock alignment engage & unlock sweep
    addTimer(() => {
      unlockBurstRef.current = true;
      setStage('unlock');
    }, isMobile ? 1400 : 1600);

    // Phase 3: Tagline reveals & composition held for appreciation
    addTimer(() => {
      setStage('appreciation');
    }, isMobile ? 1750 : 1950);

    // Phase 4: Single-timeline flight to navbar logo position
    addTimer(() => {
      if (!isMountedRef.current) return;

      const logoEl = logoRef.current;
      if (!logoEl) {
        onComplete();
        return;
      }

      const targetEl = document.getElementById('navbar-logo-target');
      const currentRect = logoEl.getBoundingClientRect();
      const currentCenterX = currentRect.left + currentRect.width / 2;
      const currentCenterY = currentRect.top + currentRect.height / 2;

      let targetCenterX = isMobile ? 38 : 52;
      let targetCenterY = isMobile ? 34 : 40;
      let targetWidth = isMobile ? 36 : 40;

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

      setStage('flying');
      if (onFlightStart) {
        onFlightStart();
      }

      const flightDuration = isMobile ? 950 : 1050;

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
        // Fallback for environments without Web Animations API
        addTimer(() => {
          if (isMountedRef.current) {
            setStage('finished');
            onComplete();
          }
        }, flightDuration);
      }
    }, isMobile ? 2750 : 3100);

    // Safety timeout: guaranteed unmount and site unlock even under extreme browser throttling
    addTimer(() => {
      if (isMountedRef.current) {
        setStage('finished');
        onComplete();
      }
    }, isMobile ? 4200 : 4600);

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
  }, [isMobile, onComplete, onFlightStart]);

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

  const isFlying = stage === 'flying';
  const isUnlocked = stage === 'unlock' || stage === 'appreciation' || stage === 'flying';
  const isAppreciating = stage === 'appreciation';

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden select-none transition-colors duration-1000 ease-out ${
        isFlying ? 'pointer-events-none bg-transparent' : 'bg-[#040405]'
      }`}
      aria-label="WEST MUN Introduction"
      role="dialog"
      aria-modal="true"
    >
      {/* Background ambient gold aura */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${
          isFlying ? 'opacity-0' : isUnlocked ? 'opacity-90' : 'opacity-40'
        }`}
        style={{
          background:
            'radial-gradient(ellipse at 50% 40%, rgba(212,175,55,0.08) 0%, rgba(12,12,14,0.6) 55%, #040405 100%)',
        }}
      />

      {/* Floating Gold Particles Canvas */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${
          isFlying ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Centered Anchor Container: Holds Logo & Concentric Unlock Mechanism */}
      <div
        className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
        style={{
          transform: `translate3d(0, ${isMobile ? '-14%' : '-12%'}, 0)`,
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
          {/* CONCENTRIC VAULT UNLOCK MECHANISM (SVG) */}
          <div
            className={`absolute pointer-events-none transition-all duration-700 ease-out ${
              isFlying
                ? 'opacity-0 scale-95'
                : isUnlocked
                ? 'opacity-0 scale-110 pointer-events-none'
                : stage === 'locking'
                ? 'opacity-85 scale-100'
                : 'opacity-40 scale-95'
            }`}
            style={{
              width: svgSize,
              height: svgSize,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} className="w-full h-full">
              {/* Background diplomatic dial: fine concentric tick marks & compass gauge */}
              <circle
                cx={svgCenter}
                cy={svgCenter}
                r={outerArcRadius + 6}
                fill="none"
                stroke="#d4af37"
                strokeWidth="0.75"
                strokeDasharray="2 6"
                strokeOpacity="0.25"
              />

              {/* Diplomatic dial markers */}
              {Array.from({ length: isMobile ? 8 : 12 }).map((_, i) => {
                const count = isMobile ? 8 : 12;
                const angle = (i / count) * 360;
                const rad = (angle * Math.PI) / 180;
                const r1 = outerArcRadius + 3;
                const r2 = outerArcRadius + 7;
                return (
                  <line
                    key={i}
                    x1={svgCenter + Math.cos(rad) * r1}
                    y1={svgCenter + Math.sin(rad) * r1}
                    x2={svgCenter + Math.cos(rad) * r2}
                    y2={svgCenter + Math.sin(rad) * r2}
                    stroke="#d4af37"
                    strokeWidth="1"
                    strokeOpacity={i % 3 === 0 ? '0.5' : '0.2'}
                  />
                );
              })}

              {/* Outer Vault Arc — Rotates clockwise into locked alignment */}
              <circle
                cx={svgCenter}
                cy={svgCenter}
                r={outerArcRadius}
                fill="none"
                stroke="#d4af37"
                strokeWidth={isMobile ? '1.25' : '1.5'}
                strokeDasharray={isMobile ? '65 25 15 25' : '90 35 25 35'}
                strokeLinecap="round"
                strokeOpacity="0.8"
                style={{
                  transformOrigin: `${svgCenter}px ${svgCenter}px`,
                  transform: stage === 'locking' || isUnlocked ? 'rotate(0deg)' : 'rotate(-85deg)',
                  transition: 'transform 1000ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />

              {/* Inner Vault Arc — Rotates counter-clockwise into locked alignment */}
              <circle
                cx={svgCenter}
                cy={svgCenter}
                r={innerArcRadius}
                fill="none"
                stroke="#f7e7b4"
                strokeWidth={isMobile ? '1.25' : '1.5'}
                strokeDasharray={isMobile ? '45 20 10 20' : '65 25 15 25'}
                strokeLinecap="round"
                strokeOpacity="0.9"
                style={{
                  transformOrigin: `${svgCenter}px ${svgCenter}px`,
                  transform: stage === 'locking' || isUnlocked ? 'rotate(0deg)' : 'rotate(95deg)',
                  transition: 'transform 1000ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />

              {/* 4 Cardinal Diamond Alignment Markers */}
              {[0, 90, 180, 270].map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const px = svgCenter + Math.cos(rad) * (outerArcRadius + 0.5);
                const py = svgCenter + Math.sin(rad) * (outerArcRadius + 0.5);
                return (
                  <polygon
                    key={deg}
                    points={`${px},${py - 2.5} ${px + 2.5},${py} ${px},${py + 2.5} ${px - 2.5},${py}`}
                    fill="#f7e7b4"
                    opacity={stage === 'locking' || isUnlocked ? 0.9 : 0.3}
                    style={{
                      transformOrigin: `${px}px ${py}px`,
                      transform: isUnlocked ? 'scale(1.3)' : 'scale(1)',
                      transition: 'all 500ms ease-out',
                    }}
                  />
                );
              })}
            </svg>
          </div>

          {/* Soft Unlock Backlight Bloom */}
          <div
            className={`absolute inset-0 rounded-full pointer-events-none transition-all duration-700 ease-out ${
              isFlying
                ? 'opacity-0 scale-95'
                : isUnlocked
                ? 'opacity-60 scale-125 bg-[radial-gradient(circle,rgba(212,175,55,0.45)_0%,rgba(212,175,55,0.1)_50%,transparent_75%)]'
                : 'opacity-15 scale-100 bg-[radial-gradient(circle,rgba(212,175,55,0.25)_0%,transparent_70%)]'
            }`}
          />

          {/* OFFICIAL WEST MUN EMBLEM CONTAINER */}
          <div
            className={`relative w-full h-full rounded-full overflow-hidden bg-[#0d0d10] transition-all duration-700 ${
              isFlying
                ? 'border border-[#d4af37]/50 shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                : isUnlocked
                ? 'border border-[#d4af37]/75 shadow-[0_0_35px_rgba(212,175,55,0.35)]'
                : 'border border-[#d4af37]/40 shadow-[0_0_20px_rgba(212,175,55,0.15)] opacity-90'
            }`}
          >
            <img
              src="/westmun-logo.jpg"
              alt="WEST MUN Official Logo"
              className="w-full h-full object-cover object-center select-none"
              draggable={false}
            />

            {/* Precision Light Sweep on Unlock Revelation */}
            <div
              className={`absolute inset-0 pointer-events-none transition-transform duration-700 ease-out ${
                isUnlocked ? 'translate-x-[180%]' : '-translate-x-[160%]'
              }`}
              style={{
                background:
                  'linear-gradient(105deg, transparent 25%, rgba(255, 240, 190, 0.45) 50%, rgba(212, 175, 55, 0.2) 56%, transparent 75%)',
              }}
            />
          </div>
        </div>

        {/* Centered Diplomatic Tagline: Placed directly below emblem */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-full max-w-xl px-5 text-center pointer-events-none will-change-[opacity,transform]"
          style={{
            top: `calc(50% + ${diameter / 2 + (isMobile ? 18 : 26)}px)`,
            opacity: isAppreciating ? 1 : 0,
            transform: isAppreciating
              ? 'translate3d(-50%, 0px, 0)'
              : isFlying
              ? 'translate3d(-50%, -10px, 0)'
              : 'translate3d(-50%, 12px, 0)',
            transition: isFlying
              ? 'opacity 250ms ease-in, transform 250ms ease-in'
              : isAppreciating
              ? 'opacity 650ms cubic-bezier(0.16, 1, 0.3, 1), transform 650ms cubic-bezier(0.16, 1, 0.3, 1)'
              : 'opacity 300ms ease-out, transform 300ms ease-out',
          }}
        >
          {/* Diplomatic Kicker */}
          <div className="inline-flex items-center justify-center gap-2 mb-1.5 sm:mb-2">
            <span className="w-5 sm:w-9 h-[1px] bg-gradient-to-r from-transparent to-[#d4af37]/70" />
            <span className="text-[9px] sm:text-[11px] font-mono tracking-[0.3em] uppercase text-[#d4af37]/90 font-medium">
              WEST MUN 2026
            </span>
            <span className="w-5 sm:w-9 h-[1px] bg-gradient-to-l from-transparent to-[#d4af37]/70" />
          </div>

          {/* Tagline */}
          <h1
            className="text-xl sm:text-2xl md:text-3xl font-serif font-normal tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#f7e7b4] via-[#d4af37] to-[#e8c868] leading-tight mb-1.5 sm:mb-2"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Where Diplomacy Meets Leadership
          </h1>

          {/* Conference Dossier Line */}
          <p className="text-[10px] sm:text-xs text-neutral-400 font-light tracking-[0.2em] uppercase">
            Western Model United Nations Conference
          </p>

          {/* Diamond Seal Motif */}
          <div className="mt-2.5 sm:mt-3 flex items-center justify-center gap-2 opacity-65">
            <span className="w-1.5 h-1.5 rotate-45 border border-[#d4af37]/70 bg-[#d4af37]/20" />
          </div>
        </div>
      </div>

      {/* Understated Skip Control */}
      <button
        type="button"
        onClick={handleSkip}
        className={`absolute bottom-6 right-6 z-50 text-[10px] font-mono tracking-widest uppercase text-neutral-400 hover:text-[#d4af37] transition-all duration-300 cursor-pointer py-1.5 px-3 border border-neutral-800/80 rounded-sm bg-black/60 hover:border-[#d4af37]/40 ${
          isFlying ? 'opacity-0 pointer-events-none' : 'opacity-70 hover:opacity-100'
        }`}
        aria-label="Skip opening intro"
      >
        Skip Intro <span>→</span>
      </button>
    </div>
  );
};
