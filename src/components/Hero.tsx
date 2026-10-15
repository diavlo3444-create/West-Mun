import React, { useRef, useState, useEffect } from 'react';
import { ArrowRight, ShieldCheck, Sparkles, ChevronDown } from 'lucide-react';

interface HeroProps {
  displayedText: string;
  isDoneTyping: boolean;
}

export const Hero: React.FC<HeroProps> = ({ displayedText, isDoneTyping }) => {
  const heroTrackRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const targetTimeRef = useRef<number>(0);
  const lastSeekTimeRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);

  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(8);
  const [videoSrc, setVideoSrc] = useState<string>('/background.mp4');

  const fallbackVideo =
    'https://flow-content.google/video/fa4bbb59-43c8-4a80-adf5-56331769e37f?Expires=1792033962&KeyName=labs-flow-prod-cdn-key&Signature=tdvKzLhOlfu06BKzGLvNYhyymI8';

  // Perform smooth seeking throttled to 30 FPS maximum to prevent decoder overload on low-end hardware
  const performSeek = () => {
    const video = videoRef.current;
    if (!video || isNaN(video.duration) || video.duration <= 0) return;
    if (video.seeking) return; // Wait for active seek to finish

    const now = performance.now();
    if (now - lastSeekTimeRef.current < 32) return; // Max ~30 seeks per second

    const diff = Math.abs(video.currentTime - targetTimeRef.current);
    if (diff > 0.03) {
      try {
        lastSeekTimeRef.current = now;
        video.currentTime = targetTimeRef.current;
      } catch {
        // Safe seek catch
      }
    }
  };

  const handleSeeked = () => {
    // Only continue seek if there is pending distance to target
    performSeek();
  };

  // Scroll Progress Calculation tied to heroTrackRef with viewport clipping
  const calculateScrollProgress = () => {
    const track = heroTrackRef.current;
    const video = videoRef.current;
    if (!track) return;

    const rect = track.getBoundingClientRect();
    const trackHeight = track.offsetHeight;
    const viewportHeight = window.innerHeight;
    const scrollableDistance = trackHeight - viewportHeight;

    if (scrollableDistance <= 0) return;

    // Viewport check: If hero is completely off-screen, bypass video seeking
    if (rect.bottom < -50 || rect.top > viewportHeight + 50) {
      return;
    }

    // rect.top is 0 when top of track hits top of viewport
    const currentScroll = -rect.top;
    const rawProgress = currentScroll / scrollableDistance;
    const clampedProgress = Math.min(Math.max(rawProgress, 0), 1);

    setScrollProgress(clampedProgress);

    if (video && !isNaN(video.duration) && video.duration > 0) {
      const target = clampedProgress * video.duration;
      targetTimeRef.current = Math.min(Math.max(target, 0), video.duration);
      performSeek();
    }
  };

  // RAF throttled scroll event listener
  useEffect(() => {
    const handleScroll = () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = requestAnimationFrame(() => {
        calculateScrollProgress();
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    // Initial check on mount and video ready state check
    const video = videoRef.current;
    if (video) {
      video.pause();
      if (video.readyState >= 1 && !isNaN(video.duration) && isFinite(video.duration) && video.duration > 0) {
        setVideoDuration(video.duration);
      }
    }
    calculateScrollProgress();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // UI stage opacity & transform math based on scrollProgress (p: 0 -> 1)
  const p = scrollProgress;

  // Animated gold "scroll down" indicator opacity (fades out smoothly as user begins scrolling)
  const scrollIndicatorOpacity = p <= 0.01 ? 1 : Math.max(0, 1 - p / 0.08);

  // Stage 1: Brand & Opening Headline (Visible from 0 to ~0.36)
  const stage1Opacity = p <= 0.22 ? 1 : Math.max(0, 1 - (p - 0.22) / 0.16);
  const stage1TranslateY = p * -50;

  // Stage 2: Dispatch & Typewriter Card (Ramps up from 0.20, peaks 0.35-0.58, fades out 0.72)
  let stage2Opacity = 0;
  if (p < 0.2) {
    stage2Opacity = 0;
  } else if (p >= 0.2 && p < 0.35) {
    stage2Opacity = (p - 0.2) / 0.15;
  } else if (p >= 0.35 && p <= 0.58) {
    stage2Opacity = 1;
  } else if (p > 0.58 && p <= 0.72) {
    stage2Opacity = Math.max(0, 1 - (p - 0.58) / 0.14);
  }
  const stage2TranslateY = (1 - stage2Opacity) * 20;

  // Stage 3: Call to Action & Summit Registration (Ramps up from 0.55, peaks 0.66-0.88, fades out at end)
  let stage3Opacity = 0;
  if (p < 0.52) {
    stage3Opacity = 0;
  } else if (p >= 0.52 && p < 0.66) {
    stage3Opacity = (p - 0.52) / 0.14;
  } else if (p >= 0.66 && p <= 0.88) {
    stage3Opacity = 1;
  } else if (p > 0.88 && p <= 1.0) {
    stage3Opacity = Math.max(0, 1 - (p - 0.88) / 0.12);
  }
  const stage3TranslateY = (1 - stage3Opacity) * 20;

  // Derived current video second (prevents extra re-renders on seek)
  const currentSec = Math.min(Math.floor(p * videoDuration), Math.floor(videoDuration));

  return (
    <section
      id="hero"
      ref={heroTrackRef}
      className="relative w-full h-[320vh] bg-[#070707]"
    >
      {/* Pinned Sticky Full-Screen Viewport Container */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Background Video — Controlled purely by vertical scroll position */}
        <video
          ref={videoRef}
          src={videoSrc}
          onError={() => {
            if (videoSrc !== fallbackVideo) {
              setVideoSrc(fallbackVideo);
            }
          }}
          muted
          playsInline
          preload="auto"
          onSeeked={handleSeeked}
          onLoadedMetadata={(e) => {
            const video = e.currentTarget;
            video.pause();
            if (!isNaN(video.duration) && isFinite(video.duration) && video.duration > 0) {
              setVideoDuration(video.duration);
            }
            calculateScrollProgress();
          }}
          onCanPlay={(e) => {
            const video = e.currentTarget;
            video.pause();
            if (!isNaN(video.duration) && isFinite(video.duration) && video.duration > 0) {
              setVideoDuration(video.duration);
            }
            calculateScrollProgress();
          }}
          className="absolute inset-0 h-full w-full object-cover pointer-events-none select-none opacity-85 will-change-transform"
          style={{
            objectPosition: '70% center',
          }}
        />

        {/* Cinematic Scrims for Flawless Text Readability without GPU-heavy blur */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#070707] via-[#070707]/60 to-transparent" />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/85 via-black/40 to-transparent" />
        <div className="absolute inset-0 pointer-events-none bg-radial from-transparent via-[#070707]/30 to-[#070707]/85" />

        {/* Synchronized Hero Content Container */}
        <div className="relative z-10 h-full w-full max-w-7xl mx-auto px-5 sm:px-8 md:px-12 lg:px-16 flex flex-col justify-end md:justify-center pb-24 md:pb-0">
          <div className="max-w-3xl relative">
            {/* ========================================================
                STAGE 1: Opening & Grand Headline (Scroll p: 0.0 -> 0.35)
               ======================================================== */}
            <div
              className={`will-change-[opacity,transform] ${
                stage1Opacity > 0 ? 'pointer-events-auto' : 'pointer-events-none'
              }`}
              style={{
                opacity: stage1Opacity,
                transform: `translate3d(0, ${stage1TranslateY}px, 0)`,
                display: stage1Opacity > 0.01 ? 'block' : 'none',
              }}
            >
              <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 bg-[#0c0c0e]/95 border border-[#d4af37]/40 rounded-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-[#d4af37]" />
                <span className="text-[11px] sm:text-xs font-medium uppercase tracking-widest text-[#f3e5ab]">
                  Official Delegation Summit · Edition TBA
                </span>
              </div>

              <h1
                className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white mb-4 font-serif leading-[1.06]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                WEST <span className="gold-gradient-text">MUN</span>
              </h1>

              <div className="w-16 h-[2px] bg-gradient-to-r from-[#d4af37] to-transparent mb-5" />

              <p className="text-base sm:text-lg md:text-xl text-neutral-300 font-light leading-relaxed mb-6">
                The Western Model United Nations Conference — convening sovereign youth delegations to debate global crises, draft treaties, and advance multilateral diplomacy.
              </p>

              <div className="flex items-center gap-3 text-xs tracking-widest uppercase text-neutral-400">
                <span className="text-[#d4af37]">✦</span>
                <span>Scroll down to initiate proceedings</span>
                <span className="animate-pulse text-[#d4af37]">↓</span>
              </div>
            </div>

            {/* ========================================================
                STAGE 2: Diplomatic Dispatch & Typewriter (Scroll p: 0.25 -> 0.70)
               ======================================================== */}
            <div
              className={`will-change-[opacity,transform] ${
                stage2Opacity > 0 ? 'pointer-events-auto' : 'pointer-events-none'
              }`}
              style={{
                opacity: stage2Opacity,
                transform: `translate3d(0, ${stage2TranslateY}px, 0)`,
                display: stage2Opacity > 0.01 ? 'block' : 'none',
              }}
            >
              <div className="inline-flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-[#d4af37]" />
                <span className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold">
                  Plenary Session Dispatch
                </span>
              </div>

              <h2
                className="text-2xl sm:text-4xl font-serif text-white mb-4 leading-snug"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Diplomatic <span className="gold-gradient-text">Engagement</span> in Real-Time
              </h2>

              {/* Typewriter Text Container */}
              <div className="mb-6 p-5 sm:p-6 bg-[#0c0c0e]/95 border border-[#d4af37]/35 rounded-sm shadow-xl">
                <p className="text-sm sm:text-base text-neutral-200 font-normal leading-relaxed">
                  <span className="text-[#d4af37] font-semibold mr-2 font-serif tracking-wider">
                    DELEGATE DISPATCH:
                  </span>
                  {displayedText}
                  {!isDoneTyping && (
                    <span
                      className="inline-block w-[2px] h-[1.1em] bg-[#d4af37] align-middle ml-1 animate-blink"
                      aria-hidden="true"
                    />
                  )}
                </p>
              </div>

              <div className="flex flex-wrap gap-4 text-xs font-mono text-neutral-400">
                <span className="px-2.5 py-1 bg-black/70 border border-neutral-800 rounded-sm">
                  ✓ Parliamentary Procedure
                </span>
                <span className="px-2.5 py-1 bg-black/70 border border-neutral-800 rounded-sm">
                  ✓ Consensus Building
                </span>
                <span className="px-2.5 py-1 bg-black/70 border border-neutral-800 rounded-sm">
                  ✓ Working Resolutions
                </span>
              </div>
            </div>

            {/* ========================================================
                STAGE 3: Action Stage & Registration CTAs (Scroll p: 0.55 -> 0.90)
               ======================================================== */}
            <div
              className={`will-change-[opacity,transform] ${
                stage3Opacity > 0 ? 'pointer-events-auto' : 'pointer-events-none'
              }`}
              style={{
                opacity: stage3Opacity,
                transform: `translate3d(0, ${stage3TranslateY}px, 0)`,
                display: stage3Opacity > 0.01 ? 'block' : 'none',
              }}
            >
              <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 bg-[#141418] border border-[#d4af37]/30 rounded-sm text-xs text-[#f3e5ab] font-medium uppercase tracking-wider">
                Registration & Delegations
              </div>

              <h2
                className="text-3xl sm:text-5xl font-serif text-white mb-4"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Take Your Seat on the <span className="gold-gradient-text">World Stage</span>
              </h2>

              <p className="text-neutral-300 text-sm sm:text-base mb-8 max-w-xl font-light leading-relaxed">
                Whether representing a permanent member of the Security Council or leading an assembly coalition, WEST MUN provides the substantive arena for your diplomatic ambitions.
              </p>

              {/* Dual Action CTAs */}
              <div className="flex flex-wrap items-center gap-4">
                <a
                  href="#register"
                  className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-xs sm:text-sm font-semibold uppercase tracking-widest text-black bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] rounded-sm hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_20px_rgba(212,175,55,0.3)] cursor-pointer"
                >
                  <span>Register Now</span>
                  <ArrowRight className="w-4 h-4 text-black" />
                </a>

                <a
                  href="#about"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-xs sm:text-sm font-medium uppercase tracking-widest text-white bg-[#0e0e11]/90 border border-neutral-700 hover:border-[#d4af37]/60 hover:text-[#d4af37] rounded-sm transition-all active:scale-95 cursor-pointer"
                >
                  <span>Explore the Conference</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* SUBTLE, ANIMATED GOLD 'SCROLL DOWN' INDICATOR (BOTTOM CENTER) */}
        <div
          className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2.5 will-change-[opacity,transform]"
          style={{
            opacity: scrollIndicatorOpacity,
            pointerEvents: scrollIndicatorOpacity > 0.05 ? 'auto' : 'none',
            transform: `translate3d(-50%, ${p * -20}px, 0)`,
          }}
        >
          <a
            href="#hero"
            onClick={(e) => {
              e.preventDefault();
              window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
            }}
            className="flex flex-col items-center gap-2 text-center group cursor-pointer"
            aria-label="Scroll down to advance cinematic experience"
          >
            {/* Elegant Gold Mouse / Pill with Bouncing Dot */}
            <div className="w-5 h-8 rounded-full border border-[#d4af37]/70 flex items-start justify-center pt-1.5 bg-[#0e0e11]/90 group-hover:border-[#d4af37] transition-colors shadow-[0_0_12px_rgba(212,175,55,0.2)]">
              <div className="w-1 h-2 rounded-full bg-gradient-to-b from-[#f3e5ab] to-[#d4af37] animate-bounce" />
            </div>

            {/* Subtle Label with Double Chevron */}
            <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-[0.25em] uppercase text-[#f3e5ab]/90 font-medium">
              <span>Scroll Down</span>
              <ChevronDown className="w-3 h-3 text-[#d4af37] animate-pulse" />
            </div>
          </a>
        </div>

        {/* Cinematic Scrub Pill (Bottom Right) */}
        <div className="absolute bottom-5 right-5 sm:right-8 z-20 flex items-center gap-3 bg-[#0e0e11]/95 border border-neutral-800/90 rounded-sm px-3.5 py-1.5 text-[11px] font-mono text-neutral-400">
          <span className="text-[#d4af37] font-semibold">SCROLL SCRUB</span>
          <span className="w-1 h-1 rounded-full bg-neutral-600" />
          <span className="text-white">
            {(p * 100).toFixed(0)}%
          </span>
          <div className="w-16 h-1 bg-neutral-800 rounded-full overflow-hidden hidden sm:block">
            <div
              className="h-full bg-gradient-to-r from-[#d4af37] to-[#e5c158]"
              style={{ width: `${p * 100}%` }}
            />
          </div>
          <span className="text-neutral-500">
            00:0{currentSec}s
          </span>
        </div>
      </div>
    </section>
  );
};
