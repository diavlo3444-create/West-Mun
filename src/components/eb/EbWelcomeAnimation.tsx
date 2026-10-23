import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Crown, ShieldCheck, ChevronDown, ArrowDown, Building2, UserCheck } from 'lucide-react';
import type { EbMemberProfile } from '../../pages/EbPortal';

export interface EbWelcomeAnimationProps {
  profile: EbMemberProfile;
  onComplete: () => void;
}

function formatDepartmentName(dept?: string | null): string {
  if (!dept) return '';
  const map: Record<string, string> = {
    media_press: 'Media & Press',
    security: 'Security & Operations',
    volunteers: 'Volunteers & Logistics',
    design: 'Design & Visual Identity',
    marketing: 'Marketing & Outreach',
    pr: 'Public Relations',
    finance: 'Finance & Sponsorship',
    it: 'Information Technology',
    general: 'General Assembly',
  };
  return map[dept.toLowerCase()] || dept.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatRoleTitle(role?: string | null): string {
  if (!role) return 'Executive Board Member';
  if (role.toLowerCase() === 'co_head') return 'Department Co-Head';
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export const EbWelcomeAnimation: React.FC<EbWelcomeAnimationProps> = ({ profile, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isCompletedRef = useRef(false);

  // Animation timeline stages:
  // 'enter'        (0 - 500ms): Screen fades into near-black, ambient particles begin, crest appears
  // 'member'      (500 - 1500ms): Member name and role animate smoothly upward into center
  // 'relationship'(1500 - 2700ms): Connector line animates down, revealing Reporting Head or credential
  // 'hold'        (2700 - 3200ms): Composition rests in stillness
  // 'exit'        (3200 - 3700ms): Smooth fade and elevation away to reveal dashboard
  const [phase, setPhase] = useState<'enter' | 'member' | 'relationship' | 'hold' | 'exit'>('enter');

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handleFinish = useCallback(() => {
    if (isCompletedRef.current) return;
    isCompletedRef.current = true;
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

  // Ambient gold particles canvas
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

    // Particle count: 24 delicate drifting gold specks
    const particleCount = 24;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.8 + 0.6,
      speedY: Math.random() * 0.45 + 0.15,
      speedX: (Math.random() - 0.5) * 0.25,
      opacity: Math.random() * 0.45 + 0.15,
      phase: Math.random() * Math.PI * 2,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.y -= p.speedY;
        p.x += Math.sin(p.phase) * p.speedX;
        p.phase += 0.02;

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }

        ctx.fillStyle = `rgba(212, 175, 55, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
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
      // Shorter, instant static presentation for users preferring reduced motion
      const t1 = setTimeout(() => {
        handleFinish();
      }, 1600);
      return () => clearTimeout(t1);
    }

    const tMember = setTimeout(() => {
      setPhase('member');
    }, 500);

    const tRel = setTimeout(() => {
      setPhase('relationship');
    }, 1500);

    const tHold = setTimeout(() => {
      setPhase('hold');
    }, 2700);

    const tExit = setTimeout(() => {
      setPhase('exit');
    }, 3200);

    const tDone = setTimeout(() => {
      handleFinish();
    }, 3750);

    return () => {
      clearTimeout(tMember);
      clearTimeout(tRel);
      clearTimeout(tHold);
      clearTimeout(tExit);
      clearTimeout(tDone);
    };
  }, [prefersReducedMotion, handleFinish]);

  const hasReportingHead = Boolean(profile.reportingHeadName && profile.reportingHeadName.trim());
  const memberRole = formatRoleTitle(profile.role);
  const memberDepartment = formatDepartmentName(profile.department);
  const headDepartment = formatDepartmentName(profile.reportingHeadDepartment || profile.department);

  return (
    <aside
      aria-label="Executive Board Welcome"
      ref={containerRef}
      className={`fixed inset-0 z-[120] flex flex-col items-center justify-center bg-[#050508] text-white overflow-hidden select-none transition-all duration-500 ease-out ${
        phase === 'exit'
          ? 'opacity-0 scale-[1.01] pointer-events-none'
          : 'opacity-100 scale-100'
      }`}
    >
      {/* Background canvas with ambient gold particles */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-60"
        aria-hidden="true"
      />

      {/* Subtle radial ambient warmth centered behind the focal composition */}
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_rgba(212,175,55,0.09)_0%,_rgba(5,5,8,0.92)_65%,_#050508_100%)]"
        aria-hidden="true"
      />

      {/* Thin luxury gold light sweep hairline at top */}
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent"
        aria-hidden="true"
      />

      {/* Top right subtle skip button */}
      <button
        type="button"
        onClick={handleFinish}
        className="absolute top-5 right-5 sm:top-6 sm:right-8 z-20 flex items-center gap-1.5 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-neutral-500 hover:text-[#f5d47a] transition-colors py-1.5 px-3 rounded border border-white/5 hover:border-[#d4af37]/30 bg-black/40 backdrop-blur-sm cursor-pointer"
        aria-label="Skip welcome sequence and enter dashboard"
      >
        <span>Skip intro</span>
        <span aria-hidden="true">→</span>
      </button>

      {/* Center Cinematic Card Composition */}
      <div className="relative z-10 w-full max-w-xl px-5 sm:px-8 py-6 text-center flex flex-col items-center">
        {/* Emblem & Category Kicker */}
        <div
          className={`transition-all duration-700 ease-out transform ${
            phase !== 'enter' || prefersReducedMotion
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2'
          }`}
        >
          <div className="mx-auto mb-3 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-[#d4af37]/40 bg-[#0d0d12] shadow-[0_0_20px_rgba(212,175,55,0.18)]">
            <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-[#d4af37]" />
          </div>

          <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.28em] text-[#d4af37]">
            WEST MUN 2027 · Executive Board
          </p>
        </div>

        {/* 1. EB MEMBER REVEAL */}
        <div
          className={`mt-4 sm:mt-5 w-full transition-all duration-800 ease-out transform ${
            phase === 'enter' && !prefersReducedMotion
              ? 'opacity-0 translate-y-4'
              : 'opacity-100 translate-y-0'
          }`}
        >
          {/* Member Name */}
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal tracking-wide text-white text-balance drop-shadow-sm">
            {profile.name}
          </h1>

          {/* Member Role & Department */}
          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm text-neutral-400">
            <span className="font-mono text-[#f5d47a] font-medium tracking-wider uppercase text-[11px] sm:text-xs">
              {memberRole}
            </span>
            <span className="text-neutral-600" aria-hidden="true">·</span>
            <span className="text-neutral-300 font-sans tracking-wide">
              {memberDepartment}
              {profile.section ? ` (${profile.section} section)` : ''}
            </span>
          </div>
        </div>

        {/* 2. REPORTING HEAD RELATIONSHIP (OR DIPLOMATIC ACCREDITATION SEAL) */}
        {hasReportingHead ? (
          <div
            className={`w-full mt-4 sm:mt-5 transition-all duration-800 ease-out transform ${
              phase === 'enter' || phase === 'member'
                ? prefersReducedMotion
                  ? 'opacity-100'
                  : 'opacity-0 translate-y-4'
                : 'opacity-100 translate-y-0'
            }`}
          >
            {/* Elegant downward connector line */}
            <div className="flex flex-col items-center">
              <div
                className={`w-[1px] bg-gradient-to-b from-[#d4af37] via-[#d4af37]/60 to-[#d4af37]/20 transition-all duration-700 ease-out ${
                  phase === 'enter' || phase === 'member'
                    ? prefersReducedMotion ? 'h-5' : 'h-0 opacity-0'
                    : 'h-6 sm:h-7 opacity-100'
                }`}
                aria-hidden="true"
              />

              {/* Relationship Label Pill */}
              <div className="my-1 inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/35 bg-[#0a0a0f] px-3 py-1 shadow-[0_0_12px_rgba(212,175,55,0.12)]">
                <ArrowDown className="h-2.5 w-2.5 text-[#d4af37]" aria-hidden="true" />
                <span className="font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.22em] text-[#f5d47a]">
                  Reports To
                </span>
              </div>

              <div
                className={`w-[1px] bg-gradient-to-b from-[#d4af37]/20 via-[#d4af37]/60 to-[#d4af37] transition-all duration-700 ease-out ${
                  phase === 'enter' || phase === 'member'
                    ? prefersReducedMotion ? 'h-4' : 'h-0 opacity-0'
                    : 'h-4 sm:h-5 opacity-100'
                }`}
                aria-hidden="true"
              />
            </div>

            {/* Reporting Head Supervisor Card */}
            <div className="mt-2 w-full rounded-xl border border-[#d4af37]/30 bg-[#0a0a0e]/90 p-4 sm:p-5 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[#d4af37]" />
                <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-neutral-400">
                  Assigned Department Head
                </span>
              </div>

              <h2 className="font-serif text-xl sm:text-2xl text-white font-medium tracking-wide">
                {profile.reportingHeadName}
              </h2>

              <p className="mt-1 text-xs text-neutral-300 font-sans">
                Department Head · {headDepartment}
                {profile.reportingHeadSection ? ` (${profile.reportingHeadSection} section)` : ''}
              </p>

              {profile.reportingHeadEmail && (
                <p className="mt-1 font-mono text-[10px] sm:text-[11px] text-[#f5d47a]/80">
                  {profile.reportingHeadEmail}
                </p>
              )}
            </div>
          </div>
        ) : (
          /* Graceful accreditation note when member is top-level or has no reporting head */
          <div
            className={`w-full mt-6 transition-all duration-800 ease-out transform ${
              phase === 'enter' || phase === 'member'
                ? prefersReducedMotion
                  ? 'opacity-100'
                  : 'opacity-0 translate-y-2'
                : 'opacity-100 translate-y-0'
            }`}
          >
            <div className="mx-auto w-32 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent" />
            <div className="mt-3.5 inline-flex items-center gap-2 text-xs font-mono text-neutral-400">
              <ShieldCheck className="h-3.5 w-3.5 text-[#d4af37]" />
              <span className="tracking-wider uppercase text-[10px]">
                Authorized Operational Credential · Active Session
              </span>
            </div>
          </div>
        )}

        {/* Bottom subtle progress indicator line */}
        <div className="mt-7 w-40 sm:w-52 h-[1px] bg-white/10 overflow-hidden relative">
          <div
            className={`h-full bg-gradient-to-r from-[#d4af37] via-[#f5d47a] to-[#d4af37] transition-all ease-linear ${
              prefersReducedMotion
                ? 'w-full duration-1000'
                : phase === 'enter'
                ? 'w-1/6 duration-500'
                : phase === 'member'
                ? 'w-2/5 duration-1000'
                : phase === 'relationship'
                ? 'w-4/5 duration-1200'
                : 'w-full duration-500'
            }`}
          />
        </div>
      </div>
    </aside>
  );
};
