import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, FastForward, Sparkles, Shield, Key, Lock, Unlock, ArrowRight } from 'lucide-react';
import { getRoleTitle, type DepartmentKey, type SectionKey } from './departments';

interface GoldenKeyUnlockProps {
  department: DepartmentKey;
  section?: SectionKey | null;
  headName?: string | null;
  headEmail?: string;
  onComplete: () => void;
}

interface GoldParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  drift: number;
}

export const GoldenKeyUnlock: React.FC<GoldenKeyUnlockProps> = ({
  department,
  section,
  headName,
  headEmail = '',
  onComplete,
}) => {
  // Explicit sequential animation stages:
  // 1: 'lock_visible'    (0 - 800ms)     Lock centered, key poised
  // 2: 'key_approaches'  (800 - 2000ms)  Key smoothly glides in from side, teeth aligned
  // 3: 'key_insertion'   (2000 - 3300ms) Key physically slides into keyhole, tip disappears inside
  // 4: 'key_paused'      (3300 - 4000ms) Fully seated pause
  // 5: 'key_unlocking'   (4000 - 5100ms) Key rotates 75° around its own shaft axis inside lock
  // 6: 'unlock_feedback' (5100 - 6400ms) Mechanical recoil, gold flash, and radial glow
  // 7: 'greeting_reveal' (6400 - 9100ms) Smooth transition to centered personalized greeting
  // 8: 'fade_out'        (9100 - 9800ms) Seamless reveal of dashboard
  const [stage, setStage] = useState<
    | 'lock_visible'
    | 'key_approaches'
    | 'key_insertion'
    | 'key_paused'
    | 'key_unlocking'
    | 'unlock_feedback'
    | 'greeting_reveal'
    | 'fade_out'
  >('lock_visible');

  const [isMuted, setIsMuted] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const resolvedName = (headName && headName.trim()) || headEmail.split('@')[0] || 'Department Head';
  const resolvedRole = getRoleTitle(department, section);

  // Mechanical click & brass chime synthesized via Web Audio API
  const playUnlockSound = useCallback(() => {
    if (isMuted) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Dual tumbler clicks
      [0, 0.07].forEach((offset, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(idx === 0 ? 1150 : 880, now + offset);
        filter.Q.setValueAtTime(4.0, now + offset);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(idx === 0 ? 460 : 340, now + offset);
        osc.frequency.exponentialRampToValueAtTime(110, now + offset + 0.05);

        gain.gain.setValueAtTime(0, now + offset);
        gain.gain.linearRampToValueAtTime(0.28, now + offset + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.07);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.08);
      });

      // Warm harmonic brass resonance (C#5 & G#5 chord)
      [554.37, 830.61].forEach((freq) => {
        const chimeOsc = ctx.createOscillator();
        const chimeGain = ctx.createGain();

        chimeOsc.type = 'sine';
        chimeOsc.frequency.setValueAtTime(freq, now + 0.08);

        chimeGain.gain.setValueAtTime(0, now + 0.08);
        chimeGain.gain.linearRampToValueAtTime(0.08, now + 0.16);
        chimeGain.gain.exponentialRampToValueAtTime(0.0005, now + 1.4);

        chimeOsc.connect(chimeGain);
        chimeGain.connect(ctx.destination);

        chimeOsc.start(now + 0.08);
        chimeOsc.stop(now + 1.5);
      });
    } catch {
      // Audio autoplay policy or lack of support: silently ignore
    }
  }, [isMuted]);

  // Ambient gold particles
  const particles = useRef<GoldParticle[]>(
    Array.from({ length: 32 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.2 + 1,
      speed: Math.random() * 12 + 10,
      opacity: Math.random() * 0.55 + 0.2,
      drift: (Math.random() - 0.5) * 40,
    }))
  ).current;

  const stageRef = useRef(stage);
  stageRef.current = stage;

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const playUnlockSoundRef = useRef(playUnlockSound);
  playUnlockSoundRef.current = playUnlockSound;

  const animationStartedRef = useRef(false);

  // Strict Sequential Stage Orchestration — Runs exactly once per mount
  useEffect(() => {
    if (animationStartedRef.current) return;
    animationStartedRef.current = true;

    if (prefersReducedMotion) {
      const t1 = setTimeout(() => setStage('greeting_reveal'), 150);
      const t2 = setTimeout(() => {
        setStage('fade_out');
        setTimeout(() => onCompleteRef.current(), 350);
      }, 1600);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }

    const t0 = setTimeout(() => setStage('key_approaches'), 800);
    const t1 = setTimeout(() => setStage('key_insertion'), 2000);
    const t2 = setTimeout(() => setStage('key_paused'), 3300);
    const t3 = setTimeout(() => setStage('key_unlocking'), 4000);
    const t4 = setTimeout(() => {
      setStage('unlock_feedback');
      playUnlockSoundRef.current();
    }, 5100);
    const t5 = setTimeout(() => setStage('greeting_reveal'), 6400);
    const t6 = setTimeout(() => setStage('fade_out'), 9100);
    const t7 = setTimeout(() => onCompleteRef.current(), 9800);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        onCompleteRef.current();
      }
      if (e.key === 'Enter' && stageRef.current === 'greeting_reveal') {
        e.preventDefault();
        onCompleteRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
      clearTimeout(t7);
      window.removeEventListener('keydown', handleKeyDown);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [prefersReducedMotion]);

  // Keyhole entrance plane is at X = 400 in SVG coordinates.
  // Lock plate is centered at (400, 220).
  // Key tip (local x = 0) positions:
  // - approaches: tip at X = 455 (55px to the right of keyhole entrance, teeth aligned)
  // - inserted/paused/unlocking/feedback: tip at X = 345 (55px INSIDE the keyhole)
  let keyTranslateX = 640; // off-screen right
  let keyOpacity = 0;
  let keyRotateX = 0; // rotation around horizontal shaft axis (degrees)
  let keyTransition = 'transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s ease';

  if (stage === 'lock_visible') {
    keyTranslateX = 640;
    keyOpacity = 0;
    keyRotateX = 0;
    keyTransition = 'transform 0.8s ease, opacity 0.6s ease';
  } else if (stage === 'key_approaches') {
    keyTranslateX = 455; // aligned poised at keyhole threshold
    keyOpacity = 1;
    keyRotateX = 0;
    keyTransition = 'transform 1.1s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.5s ease';
  } else if (stage === 'key_insertion') {
    keyTranslateX = 345; // physically inserted 55px into lock
    keyOpacity = 1;
    keyRotateX = 0;
    keyTransition = 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)';
  } else if (stage === 'key_paused') {
    keyTranslateX = 345; // holds fully inserted position firmly
    keyOpacity = 1;
    keyRotateX = 0;
    keyTransition = 'transform 0.4s ease';
  } else if (stage === 'key_unlocking') {
    keyTranslateX = 345; // stays fully inserted inside lock
    keyOpacity = 1;
    keyRotateX = 75; // rotates 75° around shaft axis
    keyTransition = 'transform 1.0s cubic-bezier(0.65, 0, 0.35, 1)';
  } else if (stage === 'unlock_feedback' || stage === 'greeting_reveal' || stage === 'fade_out') {
    keyTranslateX = 345;
    keyOpacity = stage === 'unlock_feedback' ? 1 : 0.2;
    keyRotateX = 75;
    keyTransition = 'opacity 0.8s ease';
  }

  // Key artwork group (shared by inside and outside layers)
  const renderKeyArtwork = () => (
    <g>
      {/* 1. Cylindrical Tip (rounded lead that enters keyhole) */}
      <path
        d="M 0 205
           L 10 205
           L 10 215
           L 0 215
           A 5 5 0 0 1 0 205 Z"
        fill="url(#wmGoldShank)"
        stroke="#fff7d6"
        strokeWidth="1.2"
      />

      {/* 2. Key Bit (Stepped Wards & Diplomatic Teeth) */}
      {/* Extends down from y = 210 to y = 244 to fit lower keyhole slot */}
      <path
        d="M 10 210
           L 54 210
           L 54 242
           L 44 242
           L 44 232
           L 36 232
           L 36 244
           L 24 244
           L 24 234
           L 18 234
           L 18 242
           L 10 242
           Z"
        fill="url(#wmGoldShank)"
        stroke="#fff7d6"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      {/* Ward Cutouts inside Bit */}
      <rect x="26" y="222" width="6" height="6" rx="1" fill="#0c0b0e" stroke="#d4af37" strokeWidth="0.8" />
      <rect x="38" y="218" width="5" height="5" rx="1" fill="#0c0b0e" stroke="#d4af37" strokeWidth="0.8" />

      {/* 3. Main Cylindrical Shaft (from x = 0 to x = 160 along y = 210) */}
      <rect
        x="6"
        y="204"
        width="154"
        height="12"
        rx="2"
        fill="url(#wmGoldShank)"
        stroke="#fff3b0"
        strokeWidth="1.2"
      />
      {/* Specular Highlight along shaft */}
      <rect x="6" y="208" width="154" height="3" fill="url(#wmGoldSpecular)" />

      {/* 4. Collar Moldings & Ring Bevels */}
      {/* Front Collar at x = 65 */}
      <rect x="65" y="198" width="8" height="24" rx="2" fill="url(#wmBowGradient)" stroke="#fff9db" strokeWidth="1" />
      <rect x="75" y="202" width="5" height="16" rx="1.5" fill="url(#wmGoldShank)" stroke="#d4af37" strokeWidth="0.8" />

      {/* Rear Stop Collar at x = 145 */}
      <rect x="145" y="196" width="10" height="28" rx="2.5" fill="url(#wmBowGradient)" stroke="#fff9db" strokeWidth="1" />

      {/* 5. Key Bow (Ornate Diplomatic Head at x = 195, y = 210) */}
      {/* Outer Crown Finial */}
      <path
        d="M 234 210
           C 234 204, 238 200, 244 198
           C 250 200, 252 208, 252 210
           C 252 212, 250 220, 244 222
           C 238 220, 234 216, 234 210 Z"
        fill="url(#wmBowGradient)"
        stroke="#fff7d6"
        strokeWidth="1"
      />

      {/* Outer Circular Ring */}
      <circle cx="195" cy="210" r="36" fill="url(#wmBowGradient)" stroke="#fff9db" strokeWidth="2.2" />

      {/* Inner Cutout with Beaded Filigree */}
      <circle cx="195" cy="210" r="22" fill="#07070a" stroke="#d4af37" strokeWidth="1.6" />

      {/* Diplomatic Rosette Cross Filigree */}
      <g stroke="url(#wmGoldShank)" strokeWidth="1.8" fill="none">
        <circle cx="195" cy="210" r="9" />
        <path d="M 195 190 C 198 196, 198 204, 195 210 C 192 204, 192 196, 195 190 Z" fill="url(#wmBowGradient)" />
        <path d="M 195 230 C 198 224, 198 216, 195 210 C 192 216, 192 224, 195 230 Z" fill="url(#wmBowGradient)" />
        <path d="M 175 210 C 181 207, 189 207, 195 210 C 189 213, 181 213, 175 210 Z" fill="url(#wmBowGradient)" />
        <path d="M 215 210 C 209 207, 201 207, 195 210 C 201 213, 209 213, 215 210 Z" fill="url(#wmBowGradient)" />
      </g>
    </g>
  );

  const isUnlockedState =
    stage === 'unlock_feedback' || stage === 'greeting_reveal' || stage === 'fade_out';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome unlock animation"
      className={`fixed inset-0 z-50 flex flex-col justify-between overflow-hidden bg-[#060608] select-none transition-opacity duration-700 ${
        stage === 'fade_out' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* 1. Vignette Background & Ambient Gold Glow */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,#14120b_0%,#09090c_55%,#030304_100%)]"
        aria-hidden="true"
      />
      <div
        className={`pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(212,175,55,0.2),transparent_65%)] transition-opacity duration-1000 ${
          stage === 'unlock_feedback' || stage === 'greeting_reveal' ? 'opacity-100' : 'opacity-40'
        }`}
        aria-hidden="true"
      />

      {/* 2. Floating Gold Dust Particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute rounded-full bg-[#fde047] shadow-[0_0_8px_#d4af37]"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              opacity: p.opacity,
              animation: `wmParticleDrift ${p.speed}s linear infinite`,
              transform: `translate(${p.drift}px, -40px)`,
            }}
          />
        ))}
      </div>

      {/* 3. Balanced Top Status Bar */}
      <header className="relative z-20 flex items-center justify-between px-6 py-5 sm:px-10 sm:py-7 border-b border-white/[0.04]">
        {/* Left: WEST MUN Brand Lockup & Status */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d4af37]/40 bg-[#121114] shadow-[0_0_12px_rgba(212,175,55,0.15)]">
            <Shield className="h-4 w-4 text-[#d4af37]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="wm-display text-[12px] font-semibold tracking-[0.18em] text-[#f4f0e4]">
                WEST MUN <span className="text-[#d4af37]">2027</span>
              </span>
              <span className="text-neutral-600">·</span>
              <span className="hidden sm:inline-block text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-400">
                Department Chamber
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[9.5px] font-mono uppercase tracking-[0.14em]">
              {isUnlockedState ? (
                <span className="flex items-center gap-1 text-emerald-400">
                  <Unlock className="h-2.5 w-2.5" />
                  Access Granted
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[#d4af37]">
                  <Lock className="h-2.5 w-2.5" />
                  Secured Chamber
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Sound Toggle & Skip Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => {
              const next = !isMuted;
              setIsMuted(next);
              if (!next && (stage === 'key_unlocking' || stage === 'unlock_feedback')) {
                playUnlockSound();
              }
            }}
            className="group flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-white/[0.12] bg-[#121216]/80 text-neutral-400 backdrop-blur-md transition-all hover:border-[#d4af37]/50 hover:bg-[#18181e] hover:text-[#f4f0e4]"
            title={isMuted ? 'Turn on sound' : 'Mute sound'}
            aria-label={isMuted ? 'Turn on sound' : 'Mute sound'}
          >
            {isMuted ? (
              <VolumeX className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-neutral-400 group-hover:text-neutral-200" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#d4af37]" />
            )}
          </button>

          <button
            type="button"
            onClick={onComplete}
            className="group flex items-center gap-1.5 sm:gap-2 rounded-full border border-[#d4af37]/35 bg-[#121216]/80 px-3 py-1.5 sm:px-4 sm:py-1.5 text-[10.5px] sm:text-[11px] font-mono uppercase tracking-[0.16em] text-neutral-300 backdrop-blur-md transition-all hover:border-[#d4af37] hover:bg-[#1a1710] hover:text-[#fef3c7]"
          >
            <span>Skip intro</span>
            <FastForward className="h-3 w-3 text-[#d4af37] transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </header>

      {/* 4. Central Optical Arena (Perfect Viewport Balance) */}
      <main className="relative flex flex-1 items-center justify-center px-4 py-6 w-full max-w-5xl mx-auto overflow-hidden">
        {/* VIEW 1: Center Lock & Key Insertion Stage */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-all duration-1000 ${
            stage === 'greeting_reveal' || stage === 'fade_out'
              ? 'opacity-0 scale-90 pointer-events-none'
              : 'opacity-100 scale-100'
          }`}
        >
          {/* Ambient Backlight Flare */}
          <div
            className={`pointer-events-none absolute h-72 w-72 sm:h-96 sm:w-96 rounded-full transition-all duration-700 ${
              stage === 'unlock_feedback'
                ? 'scale-175 bg-[radial-gradient(circle,rgba(254,240,138,0.65)_0%,rgba(212,175,55,0.4)_35%,transparent_75%)] opacity-100'
                : 'scale-100 bg-[radial-gradient(circle,rgba(212,175,55,0.18)_0%,transparent_70%)] opacity-60'
            }`}
          />

          {/* Symmetrical Shared SVG Canvas (Center of lock at 400, 220) */}
          <svg
            className={`w-full max-w-[340px] sm:max-w-[480px] md:max-w-[560px] lg:max-w-[620px] h-auto drop-shadow-[0_16px_48px_rgba(0,0,0,0.85)] transition-transform duration-300 ${
              stage === 'unlock_feedback' ? 'translate-x-[2px] -translate-y-[1px]' : ''
            }`}
            viewBox="0 0 800 440"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Metallic Gradients */}
              <linearGradient id="wmLockRim" x1="280" y1="100" x2="520" y2="340" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#fff3b0" />
                <stop offset="25%" stopColor="#d4af37" />
                <stop offset="50%" stopColor="#7a5a14" />
                <stop offset="75%" stopColor="#f7e199" />
                <stop offset="100%" stopColor="#483307" />
              </linearGradient>

              <linearGradient id="wmLockPlate" x1="290" y1="110" x2="510" y2="330" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#1e1c17" />
                <stop offset="35%" stopColor="#111113" />
                <stop offset="70%" stopColor="#1c1913" />
                <stop offset="100%" stopColor="#0b0b0d" />
              </linearGradient>

              <radialGradient id="wmLockCore" cx="400" cy="220" r="70" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#3d3319" />
                <stop offset="60%" stopColor="#171511" />
                <stop offset="100%" stopColor="#0a0a0c" />
              </radialGradient>

              <linearGradient id="wmGoldShank" x1="0" y1="200" x2="240" y2="240" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#fff7d6" />
                <stop offset="15%" stopColor="#fde047" />
                <stop offset="35%" stopColor="#d4af37" />
                <stop offset="55%" stopColor="#854d0e" />
                <stop offset="75%" stopColor="#fef08a" />
                <stop offset="90%" stopColor="#ca8a04" />
                <stop offset="100%" stopColor="#713f12" />
              </linearGradient>

              <linearGradient id="wmGoldSpecular" x1="0" y1="208" x2="0" y2="211" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>

              <radialGradient id="wmBowGradient" cx="195" cy="210" r="40" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#fffbeb" />
                <stop offset="30%" stopColor="#facc15" />
                <stop offset="70%" stopColor="#b48c28" />
                <stop offset="100%" stopColor="#5c430e" />
              </radialGradient>

              <radialGradient id="wmKeyholeBurst" cx="400" cy="220" r="60" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="45%" stopColor="#d4af37" />
                <stop offset="100%" stopColor="#854d0e" stopOpacity="0" />
              </radialGradient>

              {/* Exact Layering Clips: keyhole entrance plane is at X = 400 */}
              <clipPath id="insideLockClip">
                <rect x="-100" y="0" width="500" height="440" />
              </clipPath>

              <clipPath id="outsideLockClip">
                <rect x="400" y="0" width="600" height="440" />
              </clipPath>
            </defs>

            {/* LAYER 1: Deep Keyhole Interior Chamber */}
            <g id="lock-back-chamber">
              <path
                d="M 400 198
                   A 12 12 0 1 0 400 222
                   L 405 238
                   A 5 5 0 0 1 400 244
                   L 400 244
                   A 5 5 0 0 1 395 238
                   L 400 222 Z"
                fill="#030305"
              />
            </g>

            {/* LAYER 2: Key Portion Inside Lock (Behind faceplate) */}
            <g id="key-inside-lock" clipPath="url(#insideLockClip)">
              <g
                style={{
                  transform: `translateX(${keyTranslateX}px) rotateX(${keyRotateX}deg)`,
                  transformOrigin: '400px 210px',
                  transition: keyTransition,
                  opacity: keyOpacity,
                }}
              >
                {renderKeyArtwork()}
              </g>
            </g>

            {/* LAYER 3: Golden Lock Escutcheon Faceplate */}
            <g id="lock-faceplate">
              {/* Symmetrical Outer Cartouche Beveled Plate */}
              <rect
                x="280"
                y="100"
                width="240"
                height="240"
                rx="44"
                fill="url(#wmLockPlate)"
                stroke="url(#wmLockRim)"
                strokeWidth="3.5"
              />

              {/* Inner Filigree Inset */}
              <rect
                x="294"
                y="114"
                width="212"
                height="212"
                rx="34"
                fill="none"
                stroke="#d4af37"
                strokeOpacity="0.25"
                strokeWidth="1.5"
                strokeDasharray="6 3"
              />

              {/* Corner Fastener Rivets */}
              {[
                [304, 124],
                [496, 124],
                [304, 316],
                [496, 316],
              ].map(([cx, cy], i) => (
                <g key={i}>
                  <circle cx={cx} cy={cy} r="6" fill="#151518" stroke="#d4af37" strokeWidth="1.5" />
                  <circle cx={cx - 1.5} cy={cy - 1.5} r="1.5" fill="#fef08a" />
                </g>
              ))}

              {/* Center Medallion Plate */}
              <circle cx="400" cy="220" r="70" fill="url(#wmLockCore)" stroke="url(#wmLockRim)" strokeWidth="2.5" />
              <circle cx="400" cy="220" r="56" fill="none" stroke="#d4af37" strokeOpacity="0.32" strokeWidth="1" />

              {/* Keyhole Opening Bevel Border */}
              <path
                d="M 400 198
                   A 12 12 0 1 0 400 222
                   L 405 238
                   A 5 5 0 0 1 400 244
                   L 400 244
                   A 5 5 0 0 1 395 238
                   L 400 222 Z"
                fill="none"
                stroke="#d4af37"
                strokeWidth="1.6"
              />

              {/* Radial Golden Burst Flash upon Unlock */}
              <g
                className={`transition-all duration-700 ${
                  stage === 'unlock_feedback' ? 'opacity-100 scale-125' : 'opacity-0 scale-90'
                }`}
                style={{ transformOrigin: '400px 220px' }}
              >
                <circle cx="400" cy="220" r="55" fill="url(#wmKeyholeBurst)" opacity="0.85" />
                <path
                  d="M 400 135 L 400 305 M 315 220 L 485 220 M 340 160 L 460 280 M 340 280 L 460 160"
                  stroke="#fffbeb"
                  strokeWidth="2"
                  strokeOpacity="0.85"
                />
              </g>
            </g>

            {/* LAYER 4: Key Portion Outside Lock (In front of faceplate) */}
            <g id="key-outside-lock" clipPath="url(#outsideLockClip)">
              <g
                style={{
                  transform: `translateX(${keyTranslateX}px) rotateX(${keyRotateX}deg)`,
                  transformOrigin: '400px 210px',
                  transition: keyTransition,
                  opacity: keyOpacity,
                }}
              >
                {renderKeyArtwork()}
              </g>
            </g>
          </svg>
        </div>

        {/* VIEW 2: Perfectly Centered Personalized Welcome Greeting Card */}
        <div
          className={`relative z-10 flex flex-col items-center text-center transition-all duration-1000 ease-out px-4 py-6 max-w-xl w-full ${
            stage === 'greeting_reveal'
              ? 'opacity-100 translate-y-0 scale-100'
              : stage === 'fade_out'
              ? 'opacity-0 -translate-y-8 scale-98'
              : 'opacity-0 translate-y-12 scale-95 pointer-events-none'
          }`}
        >
          {/* Ornate Gilded Crest Emblem above Name */}
          <div className="relative mb-5 flex items-center justify-center">
            <div className="absolute h-16 w-16 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.35)_0%,transparent_70%)] animate-pulse" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-[#d4af37]/60 bg-[#14120e] shadow-[0_0_24px_rgba(212,175,55,0.35)]">
              <Key className="h-6 w-6 text-[#fef08a]" />
            </div>
          </div>

          {/* Diplomatic Seal Eyebrow */}
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#d4af37]/45 bg-[#17140e]/90 px-3.5 py-1 text-[9.5px] sm:text-[10px] font-mono uppercase tracking-[0.2em] text-[#fef08a] shadow-[0_0_20px_rgba(212,175,55,0.2)] backdrop-blur-md">
            <Sparkles className="h-3 w-3 text-[#d4af37]" />
            <span>Diplomatic Clearance Confirmed</span>
          </div>

          {/* Stately Heading */}
          <div className="space-y-1">
            <p className="wm-display text-xs sm:text-sm uppercase tracking-[0.28em] text-neutral-400">
              Welcome Back
            </p>
            <h1 className="wm-serif text-3xl sm:text-5xl lg:text-6xl tracking-wide text-[#fef9c3] drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] leading-tight">
              <span className="bg-gradient-to-r from-[#fffbeb] via-[#facc15] to-[#ca8a04] bg-clip-text text-transparent font-medium">
                {resolvedName.toUpperCase()}
              </span>
            </h1>
          </div>

          {/* Role & Conference Badge Card */}
          <div className="mt-4 inline-flex items-center gap-2.5 rounded-full border border-[#d4af37]/30 bg-[#121116]/80 px-4 py-2 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs sm:text-sm font-medium text-neutral-200 tracking-wide font-sans">
              {resolvedRole}
            </span>
            <span className="text-neutral-600">·</span>
            <span className="text-xs font-mono text-[#d4af37]">WEST MUN 2027</span>
          </div>

          {/* Credential Indicators */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 text-[10px] sm:text-[10.5px] font-mono text-neutral-400">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1">
              <Shield className="h-3 w-3 text-[#d4af37]" />
              Accredited Department Head
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-950/20 px-2.5 py-1 text-emerald-300">
              Chamber Unlocked
            </span>
          </div>

          {/* Primary Action Button */}
          <div className="mt-7 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onComplete}
              className="group inline-flex items-center gap-2.5 rounded-full border border-[#d4af37] bg-gradient-to-r from-[#b48c28] via-[#e5c158] to-[#ca8a04] px-7 py-3 text-xs sm:text-[13px] font-semibold uppercase tracking-[0.18em] text-[#121008] shadow-[0_0_32px_rgba(212,175,55,0.4)] transition-all hover:scale-105 hover:shadow-[0_0_48px_rgba(212,175,55,0.6)] active:scale-95"
            >
              <span>Enter Department Dashboard</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <span className="text-[10px] font-mono text-neutral-400">
              Press Enter or click to enter
            </span>
          </div>
        </div>
      </main>

      {/* 5. Minimalist Footer Accreditation */}
      <footer className="relative z-20 flex items-center justify-between px-6 py-4 sm:px-10 border-t border-white/[0.04] text-[9.5px] font-mono uppercase tracking-[0.16em] text-neutral-400">
        <span>Western Model United Nations</span>
        <span className="hidden sm:inline-block">Secretariat Command Room · Confidential</span>
        <span>WEST MUN 2027</span>
      </footer>

      <style>{`
        @keyframes wmParticleDrift {
          0% {
            transform: translateY(0px) rotate(0deg);
            opacity: 0.2;
          }
          50% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-120px) rotate(180deg);
            opacity: 0.1;
          }
        }
      `}</style>
    </div>
  );
};
