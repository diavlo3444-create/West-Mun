import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isFinishedRef = useRef(false);

  // Phases:
  // 'enter'   (0 - 500ms): ambient light and crest illuminate, top hairline sweeps
  // 'name'    (500 - 1500ms): member's real name appears with editorial clip reveal
  // 'details' (1500 - 2700ms): role, team, section, and credential details reveal
  // 'hold'    (2700 - 3200ms): composition rests in pristine stillness
  // 'exit'    (3200 - 3700ms): smooth cinematic dissolution into dashboard
  const [phase, setPhase] = useState<'enter' | 'name' | 'details' | 'hold' | 'exit'>('enter');

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handleFinish = useCallback(() => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    onComplete();
  }, [onComplete]);

  // Lock body scroll during welcome sequence
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Ambient gold light particulate canvas
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

    // 20 delicate, slow-drifting metallic gold motes
    const motes = Array.from({ length: 20 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.6 + 0.6,
      speedY: Math.random() * 0.35 + 0.12,
      speedX: (Math.random() - 0.5) * 0.2,
      opacity: Math.random() * 0.4 + 0.15,
      phase: Math.random() * Math.PI * 2,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (const m of motes) {
        m.y -= m.speedY;
        m.x += Math.sin(m.phase) * m.speedX;
        m.phase += 0.018;

        if (m.y < -10) {
          m.y = height + 10;
          m.x = Math.random() * width;
        }

        ctx.fillStyle = `rgba(212, 175, 55, ${m.opacity})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
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

  // Master timeline orchestration
  useEffect(() => {
    if (prefersReducedMotion) {
      const t = setTimeout(handleFinish, 1200);
      return () => clearTimeout(t);
    }

    const tName = setTimeout(() => setPhase('name'), 500);
    const tDetails = setTimeout(() => setPhase('details'), 1500);
    const tHold = setTimeout(() => setPhase('hold'), 2700);
    const tExit = setTimeout(() => setPhase('exit'), 3200);
    const tFinish = setTimeout(() => handleFinish(), 3700);

    return () => {
      clearTimeout(tName);
      clearTimeout(tDetails);
      clearTimeout(tHold);
      clearTimeout(tExit);
      clearTimeout(tFinish);
    };
  }, [prefersReducedMotion, handleFinish]);

  const teamTitle = formatTeamName(team);
  const formattedRole = roleTitle || `${teamTitle} Member`;

  return (
    <aside
      aria-label="WEST MUN Team Member Welcome"
      ref={containerRef}
      className={`fixed inset-0 z-[120] flex flex-col items-center justify-center bg-[#050508] text-white overflow-hidden select-none transition-all duration-700 ease-out ${
        phase === 'exit'
          ? 'opacity-0 scale-[1.01] pointer-events-none'
          : 'opacity-100 scale-100'
      }`}
    >
      {/* Background canvas for ambient light motes */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-65"
        aria-hidden="true"
      />

      {/* Central radial warm gold vignette */}
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_rgba(212,175,55,0.08)_0%,_rgba(5,5,8,0.92)_65%,_#050508_100%)]"
        aria-hidden="true"
      />

      {/* Top and bottom subtle hairline sweeps */}
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent"
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
        className="absolute top-5 right-5 sm:top-7 sm:right-8 z-20 flex items-center gap-2 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-neutral-400 hover:text-[#f5d47a] transition-colors py-1.5 px-3 rounded border border-white/10 hover:border-[#d4af37]/40 bg-black/50 backdrop-blur-md cursor-pointer"
        aria-label="Skip introduction and proceed to portal"
      >
        <span>Skip intro</span>
        <ArrowRight className="h-3 w-3" />
      </button>

      {/* Central hero composition */}
      <div className="relative z-10 w-full max-w-2xl px-6 sm:px-10 py-8 text-center flex flex-col items-center">
        {/* Crest Emblem & Conference Kicker */}
        <div
          className={`transition-all duration-700 ease-out transform ${
            phase !== 'enter' || prefersReducedMotion
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2'
          }`}
        >
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-[#d4af37]/40 bg-[#0d0d12] shadow-[0_0_25px_rgba(212,175,55,0.2)]">
            <ShieldCheck className="h-5 w-5 text-[#d4af37]" />
          </div>

          <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-[#d4af37]">
            WEST MUN 2027 · CONFERENCE CORPS
          </p>
        </div>

        {/* Member Name Headline with Editorial Clip Transition */}
        <div
          className={`mt-4 sm:mt-6 w-full transition-all duration-800 ease-out transform ${
            phase === 'enter' && !prefersReducedMotion
              ? 'opacity-0 translate-y-5'
              : 'opacity-100 translate-y-0'
          }`}
        >
          <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-normal tracking-wide text-white text-balance drop-shadow-md">
            {memberName}
          </h1>
        </div>

        {/* Expanding Gold Hairline Rule */}
        <div className="w-full my-5 flex items-center justify-center">
          <div
            className={`h-[1px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent transition-all duration-1000 ease-out ${
              phase === 'enter' && !prefersReducedMotion ? 'w-0 opacity-0' : 'w-48 sm:w-64 opacity-80'
            }`}
          />
        </div>

        {/* Team Role, Department, and Credential Seal */}
        <div
          className={`w-full transition-all duration-800 ease-out transform ${
            phase === 'enter' || phase === 'name'
              ? prefersReducedMotion
                ? 'opacity-100'
                : 'opacity-0 translate-y-4'
              : 'opacity-100 translate-y-0'
          }`}
        >
          <p className="font-mono text-sm sm:text-base text-[#f5d47a] tracking-wider uppercase font-medium">
            {formattedRole}
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm text-neutral-400">
            <span className="text-neutral-300 font-sans tracking-wide">{teamTitle}</span>
            {section && (
              <>
                <span className="text-neutral-600" aria-hidden="true">·</span>
                <span className="capitalize text-neutral-300">{section} Section</span>
              </>
            )}
            <span className="text-neutral-600" aria-hidden="true">·</span>
            <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-emerald-400 font-semibold">
              Operational Clearance Active
            </span>
          </div>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#d4af37]/25 bg-black/40 px-3.5 py-1 text-[11px] font-mono text-neutral-300 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37] animate-pulse" />
            <span className="tracking-wider uppercase text-[10px] text-neutral-300">
              Station & Shift Console Ready
            </span>
          </div>
        </div>

        {/* Bottom subtle progress hairline */}
        <div className="mt-8 w-44 sm:w-56 h-[1px] bg-white/10 overflow-hidden relative">
          <div
            className={`h-full bg-gradient-to-r from-[#d4af37] via-[#f5d47a] to-[#d4af37] transition-all ease-linear ${
              prefersReducedMotion
                ? 'w-full duration-800'
                : phase === 'enter'
                ? 'w-1/6 duration-500'
                : phase === 'name'
                ? 'w-1/2 duration-1000'
                : phase === 'details'
                ? 'w-4/5 duration-1200'
                : 'w-full duration-500'
            }`}
          />
        </div>
      </div>
    </aside>
  );
};
