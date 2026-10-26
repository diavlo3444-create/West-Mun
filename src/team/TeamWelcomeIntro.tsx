import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface TeamWelcomeIntroProps {
  memberName: string;
  roleTitle: string;
  team: string;
  section: string | null;
  onComplete: () => void;
}

function formatTeamName(teamKey: string): string {
  const normalized = teamKey.toLowerCase().replace(/[\s_-]+/g, '');
  if (normalized.includes('security')) return 'Security & Operations';
  if (normalized.includes('media')) return 'Media & Press Operations';
  if (normalized.includes('volunteer')) return 'Volunteers & Logistics';
  return teamKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export const TeamWelcomeIntro: React.FC<TeamWelcomeIntroProps> = ({
  memberName,
  roleTitle,
  team,
  section,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isFinishedRef = useRef(false);
  const [isExiting, setIsExiting] = useState(false);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handleFinish = useCallback(() => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    setIsExiting(true);
    // Smooth exit dissolve before triggering unmount
    setTimeout(() => {
      onComplete();
    }, prefersReducedMotion ? 50 : 450);
  }, [onComplete, prefersReducedMotion]);

  // Lock body scroll during welcome sequence
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Ambient gold atmospheric lighting canvas (subtle, slow ambient illumination)
  useEffect(() => {
    if (prefersReducedMotion) return;

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
    window.addEventListener('resize', handleResize);

    // 14 slow-drifting warm metallic gold ambient motes
    const motes = Array.from({ length: 14 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.4 + 0.6,
      speedY: Math.random() * 0.22 + 0.08,
      speedX: (Math.random() - 0.5) * 0.15,
      opacity: Math.random() * 0.3 + 0.12,
      phase: Math.random() * Math.PI * 2,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (const m of motes) {
        m.y -= m.speedY;
        m.x += Math.sin(m.phase) * m.speedX;
        m.phase += 0.012;

        if (m.y < -10) {
          m.y = height + 10;
          m.x = Math.random() * width;
        }

        ctx.fillStyle = `rgba(212, 175, 55, ${m.opacity})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, [prefersReducedMotion]);

  // Master timeline timer: complete around ~2.8s
  useEffect(() => {
    const duration = prefersReducedMotion ? 1200 : 2800;
    const timer = setTimeout(() => {
      handleFinish();
    }, duration);

    return () => clearTimeout(timer);
  }, [prefersReducedMotion, handleFinish]);

  const teamTitle = formatTeamName(team);
  const formattedRole = roleTitle || `${teamTitle} Member`;

  // Split member name into individual words for editorial clip reveals (React Bits / Motion reference)
  const nameWords = useMemo(() => {
    const raw = memberName.trim() || 'Team Member';
    return raw.split(/\s+/);
  }, [memberName]);

  // Apple-inspired smooth cubic bezier curve
  const cinematicEase = [0.16, 1, 0.3, 1] as const;

  return (
    <AnimatePresence>
      <motion.aside
        aria-label="WEST MUN Team Member Welcome"
        initial={{ opacity: 0 }}
        animate={{ opacity: isExiting ? 0 : 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-[#050508] text-white overflow-hidden select-none"
      >
        {/* Ambient atmospheric canvas */}
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-50"
          aria-hidden="true"
        />

        {/* Central warm gold vignette (cinematic lighting) */}
        <div
          className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_rgba(212,175,55,0.07)_0%,_rgba(5,5,8,0.92)_65%,_#050508_100%)]"
          aria-hidden="true"
        />

        {/* Top & bottom subtle hairline rules */}
        <div
          className="pointer-events-none absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/35 to-transparent"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/20 to-transparent"
          aria-hidden="true"
        />

        {/* Skip button in top right */}
        <button
          type="button"
          onClick={handleFinish}
          className="absolute top-5 right-5 sm:top-7 sm:right-8 z-20 flex items-center gap-2 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-neutral-400 hover:text-[#f5d47a] transition-colors py-1.5 px-3 rounded-none border border-white/10 hover:border-[#d4af37]/50 bg-black/60 backdrop-blur-md cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
          aria-label="Skip introduction and proceed to portal"
        >
          <span>Skip intro</span>
          <ArrowRight className="h-3 w-3 text-[#d4af37]" />
        </button>

        {/* Central hero composition */}
        <div className="relative z-10 w-full max-w-3xl px-6 sm:px-10 py-8 text-center flex flex-col items-center">
          {/* Crest Emblem & Conference Kicker */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: cinematicEase }}
            className="flex flex-col items-center"
          >
            <div className="mb-3 flex h-11 w-11 items-center justify-center border border-[#d4af37]/40 bg-[#0d0d12] shadow-[0_0_25px_rgba(212,175,55,0.18)]">
              <ShieldCheck className="h-5 w-5 text-[#d4af37]" />
            </div>

            <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.32em] text-[#d4af37]">
              WEST MUN 2027 · CONFERENCE CORPS
            </p>
          </motion.div>

          {/* Member Name Headline with Staggered Word Clipping Mask Reveals */}
          <div className="mt-5 sm:mt-7 w-full overflow-hidden">
            <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-normal tracking-wide text-white text-balance drop-shadow-md">
              {nameWords.map((word, idx) => (
                <span
                  key={`${word}-${idx}`}
                  className="inline-block overflow-hidden mr-3 sm:mr-4 align-bottom"
                >
                  <motion.span
                    className="inline-block"
                    initial={{ y: prefersReducedMotion ? 0 : '115%', opacity: prefersReducedMotion ? 1 : 0 }}
                    animate={{ y: '0%', opacity: 1 }}
                    transition={{
                      duration: 0.75,
                      delay: prefersReducedMotion ? 0 : 0.25 + idx * 0.1,
                      ease: cinematicEase,
                    }}
                  >
                    {word}
                  </motion.span>
                </span>
              ))}
            </h1>
          </div>

          {/* Drawing Thin Gold Line across the screen */}
          <div className="w-full my-4 sm:my-5 flex items-center justify-center">
            <motion.div
              initial={{ scaleX: prefersReducedMotion ? 1 : 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 0.8 }}
              transition={{
                duration: 0.85,
                delay: prefersReducedMotion ? 0 : 0.45,
                ease: cinematicEase,
              }}
              className="h-[1px] w-48 sm:w-72 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent origin-center"
            />
          </div>

          {/* Role, Department, and Operational Status Reveal */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: prefersReducedMotion ? 0 : 0.6,
              ease: cinematicEase,
            }}
            className="w-full flex flex-col items-center"
          >
            <p className="font-mono text-sm sm:text-base text-[#f5d47a] tracking-wider uppercase font-medium">
              {formattedRole}
            </p>

            {/* Zero-Pill Metadata Rail */}
            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm text-neutral-400">
              <span className="text-neutral-300 font-sans tracking-wide">{teamTitle}</span>
              {section && (
                <>
                  <span className="text-neutral-600" aria-hidden="true">/</span>
                  <span className="capitalize text-neutral-300">{section} Section</span>
                </>
              )}
              <span className="text-neutral-600" aria-hidden="true">/</span>
              <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Operational Clearance Active
              </span>
            </div>

            {/* Sub-label console indicator */}
            <div className="mt-4 flex items-center gap-2 border border-[#d4af37]/25 bg-black/40 px-3.5 py-1 text-[11px] font-mono text-neutral-300 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 bg-[#d4af37]" />
              <span className="tracking-wider uppercase text-[10px] text-neutral-300">
                Station & Shift Console Ready
              </span>
            </div>
          </motion.div>

          {/* Bottom subtle progress hairline */}
          <div className="mt-8 w-44 sm:w-56 h-[1px] bg-white/10 overflow-hidden relative">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{
                duration: prefersReducedMotion ? 1.0 : 2.5,
                ease: 'linear',
              }}
              className="h-full bg-gradient-to-r from-[#d4af37] via-[#f5d47a] to-[#d4af37] origin-left"
            />
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};
