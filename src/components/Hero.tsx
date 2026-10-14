import React, { useRef, useState, useEffect } from 'react';
import { ChevronDown, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

interface HeroProps {
  displayedText: string;
  isDoneTyping: boolean;
}

export const Hero: React.FC<HeroProps> = ({ displayedText, isDoneTyping }) => {
  const heroTrackRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const targetTimeRef = useRef<number>(0);
  const isSeekingRef = useRef<boolean>(false);
  const rafIdRef = useRef<number | null>(null);

  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(8);
  const [videoSrc, setVideoSrc] = useState<string>('/background.mp4');

  const fallbackVideo =
    'https://flow-content.google/video/fa4bbb59-43c8-4a80-adf5-56331769e37f?Expires=1792033962&KeyName=labs-flow-prod-cdn-key&Signature=tdvKzLhOlfu06BKzGLvNYhyymI8';

  // Perform smooth seeking without competing seeks or flooding
  const performSeek = () => {
    const video = videoRef.current;
    if (!video || !video.duration || isSeekingRef.current) return;

    if (Math.abs(video.currentTime - targetTimeRef.current) > 0.02) {
      isSeekingRef.current = true;
      try {
        video.currentTime = targetTimeRef.current;
      } catch {
        isSeekingRef.current = false;
      }
    }
  };

  const handleSeeked = () => {
    isSeekingRef.current = false;
    const video = videoRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
    }
    performSeek();
  };

  // Scroll Progress Calculation tied to heroTrackRef
  const calculateScrollProgress = () => {
    const track = heroTrackRef.current;
    const video = videoRef.current;
    if (!track) return;

    const rect = track.getBoundingClientRect();
    const trackHeight = track.offsetHeight;
    const viewportHeight = window.innerHeight;
    const scrollableDistance = trackHeight - viewportHeight;

    if (scrollableDistance <= 0) return;

    // rect.top is 0 when top of track hits top of viewport
    const currentScroll = -rect.top;
    const rawProgress = currentScroll / scrollableDistance;
    const clampedProgress = Math.min(Math.max(rawProgress, 0), 1);

    setScrollProgress(clampedProgress);

    if (video && video.duration) {
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

    // Initial check on mount
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

  // Stage 1: Brand & Opening Headline (Visible from 0 to ~0.38)
  const stage1Opacity = p <= 0.22 ? 1 : Math.max(0, 1 - (p - 0.22) / 0.16);
  const stage1TranslateY = p * -60;

  // Stage 2: Dispatch & Typewriter Card (Ramps up from 0.22, peaks 0.32-0.58, fades out 0.68)
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

  // Stage 3: Call to Action & Summit Registration (Ramps up from 0.55, peaks 0.65-0.86, fades at end)
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
            setVideoDuration(video.duration || 8);
            calculateScrollProgress();
          }}
          className="absolute inset-0 h-full w-full object-cover pointer-events-none select-none opacity-85"
          style={{
            objectPosition: '70% center',
          }}
        />

        {/* Cinematic Scrims for Flawless Text Readability */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#070707] via-[#070707]/50 to-transparent" />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/80 via-black/30 to-transparent" />
        <div className="absolute inset-0 pointer-events-none bg-radial from-transparent via-[#070707]/25 to-[#070707]/80" />

        {/* Synchronized Hero Content Container */}
        <div className="relative z-10 h-full w-full max-w-7xl mx-auto px-5 sm:px-8 md:px-12 lg:px-16 flex flex-col justify-end md:justify-center pb-20 md:pb-0">
          <div className="max-w-3xl relative">
            {/* ========================================================
                STAGE 1: Opening & Grand Headline (Scroll p: 0.0 -> 0.35)
               ======================================================== */}
            <div
              className={`transition-all duration-300 ease-out ${
                stage1Opacity > 0 ? 'pointer-events-auto' : 'pointer-events-none'
              }`}
              style={{
                opacity: stage1Opacity,
                transform: `translateY(${stage1TranslateY}px)`,
                display: stage1Opacity > 0.01 ? 'block' : 'none',
              }}
            >
              <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 bg-black/60 border border-[#d4af37]/40 rounded-sm backdrop-blur-md">
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
              className={`transition-all duration-300 ease-out ${
                stage2Opacity > 0 ? 'pointer-events-auto' : 'pointer-events-none'
              }`}
              style={{
                opacity: stage2Opacity,
                transform: `translateY(${stage2TranslateY}px)`,
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

              {/* Preserved Typewriter Text Container */}
              <div className="mb-6 p-5 sm:p-6 bg-[#0a0a0c]/85 border border-[#d4af37]/30 rounded-sm backdrop-blur-md shadow-2xl">
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
                <span className="px-2.5 py-1 bg-black/50 border border-neutral-800 rounded-sm">
                  ✓ Parliamentary Procedure
                </span>
                <span className="px-2.5 py-1 bg-black/50 border border-neutral-800 rounded-sm">
                  ✓ Consensus Building
                </span>
                <span className="px-2.5 py-1 bg-black/50 border border-neutral-800 rounded-sm">
                  ✓ Working Resolutions
                </span>
              </div>
            </div>

            {/* ========================================================
                STAGE 3: Action Stage & Registration CTAs (Scroll p: 0.55 -> 0.90)
               ======================================================== */}
            <div
              className={`transition-all duration-300 ease-out ${
                stage3Opacity > 0 ? 'pointer-events-auto' : 'pointer-events-none'
              }`}
              style={{
                opacity: stage3Opacity,
                transform: `translateY(${stage3TranslateY}px)`,
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
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-xs sm:text-sm font-medium uppercase tracking-widest text-white bg-black/60 border border-neutral-700 hover:border-[#d4af37]/60 hover:text-[#d4af37] rounded-sm backdrop-blur-md transition-all active:scale-95 cursor-pointer"
                >
                  <span>Explore the Conference</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Subtle Cinematic Reel Scrub Indicator (Bottom Right) */}
        <div className="absolute bottom-5 right-5 sm:right-8 z-20 flex items-center gap-3 bg-black/60 border border-neutral-800/90 rounded-sm px-3.5 py-1.5 backdrop-blur-md text-[11px] font-mono text-neutral-400">
          <span className="text-[#d4af37] font-semibold">SCROLL SCRUB</span>
          <span className="w-1 h-1 rounded-full bg-neutral-600" />
          <span className="text-white">
            {(p * 100).toFixed(0)}%
          </span>
          <div className="w-16 h-1 bg-neutral-800 rounded-full overflow-hidden hidden sm:block">
            <div
              className="h-full bg-gradient-to-r from-[#d4af37] to-[#e5c158] transition-all duration-75"
              style={{ width: `${p * 100}%` }}
            />
          </div>
          <span className="text-neutral-500">
            00:0{Math.min(Math.floor(currentTime), Math.floor(videoDuration))}s
          </span>
        </div>

        {/* Scroll Down Guide (Bottom Left) */}
        <div className="absolute bottom-5 left-5 sm:left-8 z-20 flex items-center gap-2 text-neutral-400 text-xs tracking-widest uppercase">
          <a
            href="#intro"
            className="inline-flex items-center gap-2 hover:text-[#d4af37] transition-colors py-1 cursor-pointer"
            aria-label="Skip cinematic hero to conference details"
          >
            <span className="w-5 h-[1px] bg-[#d4af37]/40" />
            <span className="text-[10px] sm:text-xs">Skip to Conference Intro</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#d4af37] animate-bounce" />
          </a>
        </div>
      </div>
    </section>
  );
};
