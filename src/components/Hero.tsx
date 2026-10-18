import React, { useRef, useState, useEffect, useCallback, memo } from 'react';
import { ArrowRight, ShieldCheck, Sparkles, ChevronDown } from 'lucide-react';

interface HeroProps {
  displayedText?: string;
  isDoneTyping?: boolean;
}

const FULL_DISPATCH_TEXT =
  'The floor is open for debate. Good diplomacy unites divided nations. What global crisis will your delegation solve?';

// Self-contained Typewriter Component: isolates character ticks so the rest of the application
// is never re-rendered while typing is in progress.
const TypewriterDispatch = memo(({
  fallbackText,
  fallbackDone,
}: {
  fallbackText?: string;
  fallbackDone?: boolean;
}) => {
  const [text, setText] = useState(() => fallbackText || '');
  const [done, setDone] = useState(() => fallbackDone || false);

  useEffect(() => {
    if (fallbackText !== undefined) {
      setText(fallbackText);
      setDone(fallbackDone || false);
      return;
    }

    let index = 0;
    let timer: number | null = null;
    let interval: number | null = null;

    timer = window.setTimeout(() => {
      interval = window.setInterval(() => {
        index++;
        if (index <= FULL_DISPATCH_TEXT.length) {
          setText(FULL_DISPATCH_TEXT.slice(0, index));
        }
        if (index >= FULL_DISPATCH_TEXT.length) {
          if (interval !== null) clearInterval(interval);
          setDone(true);
        }
      }, 36);
    }, 500);

    return () => {
      if (timer !== null) clearTimeout(timer);
      if (interval !== null) clearInterval(interval);
    };
  }, [fallbackText, fallbackDone]);

  return (
    <p className="text-sm sm:text-base text-neutral-200 font-normal leading-relaxed text-center">
      <span className="text-[#d4af37] font-semibold mr-2 font-serif tracking-wider">
        DELEGATE DISPATCH:
      </span>
      {text}
      {!done && (
        <span
          className="inline-block w-[2px] h-[1.1em] bg-[#d4af37] align-middle ml-1 animate-blink"
          aria-hidden="true"
        />
      )}
    </p>
  );
});
TypewriterDispatch.displayName = 'TypewriterDispatch';

/**
 * Velocity-Based Inertia Helper:
 * Dynamically computes scroll-triggered video playback speed based on real-time scroll velocity
 * and applies a physics-modeled friction decay (inertia) to gently decelerate the video to a halt
 * when scrolling stops, rather than pausing abruptly.
 */
interface VelocityInertiaConfig {
  minPlaybackRate?: number; // Base rate during slow scroll (e.g., 0.85)
  maxPlaybackRate?: number; // Upper limit during rapid scroll (e.g., 1.75)
  velocityMultiplier?: number; // Sensitivity mapping from px/ms to playback speed (e.g., 0.45)
  friction?: number; // Per-frame damping coefficient (0.91 - 0.94)
  idleThresholdMs?: number; // Duration without scroll input before inertia takes full control (e.g., 80ms)
  minHaltRate?: number; // Lower threshold to trigger clean pause (e.g., 0.12)
}

class VelocityInertiaHelper {
  private videoRef: React.RefObject<HTMLVideoElement | null>;
  private isVisibleRef: React.RefObject<boolean>;
  private lastScrollY: number = 0;
  private lastScrollTime: number = 0;
  private smoothedVelocity: number = 0;
  private currentPlaybackRate: number = 1.0;
  private targetPlaybackRate: number = 1.0;
  private lastFrameTime: number = 0;
  private lastScrollTimestamp: number = 0;
  private rafId: number | null = null;
  private direction: number = 1; // 1 = forward (downward scroll), -1 = reverse (upward scroll)

  private minPlaybackRate: number;
  private maxPlaybackRate: number;
  private velocityMultiplier: number;
  private friction: number;
  private idleThresholdMs: number;
  private minHaltRate: number;

  private lastSeekTime: number = 0;
  private pendingSeekTime: number | null = null;
  private isSeeking: boolean = false;

  constructor(
    videoRef: React.RefObject<HTMLVideoElement | null>,
    isVisibleRef: React.RefObject<boolean>,
    config?: VelocityInertiaConfig
  ) {
    this.videoRef = videoRef;
    this.isVisibleRef = isVisibleRef;
    this.lastScrollY = typeof window !== 'undefined' ? window.scrollY || 0 : 0;
    this.minPlaybackRate = config?.minPlaybackRate ?? 0.85;
    this.maxPlaybackRate = config?.maxPlaybackRate ?? 1.75;
    this.velocityMultiplier = config?.velocityMultiplier ?? 0.45;
    this.friction = config?.friction ?? 0.92;
    this.idleThresholdMs = config?.idleThresholdMs ?? 80;
    this.minHaltRate = config?.minHaltRate ?? 0.12;
  }

  /**
   * Safe seek dispatcher that uses fastSeek when supported and prevents decoder stalls
   */
  private dispatchSeek(video: HTMLVideoElement, time: number): void {
    const clampedTime = Math.max(0, time);
    if (Math.abs(video.currentTime - clampedTime) < 0.02) return;

    if (video.seeking || this.isSeeking) {
      this.pendingSeekTime = clampedTime;
      return;
    }

    try {
      this.isSeeking = true;
      if (typeof (video as unknown as { fastSeek?: (t: number) => void }).fastSeek === 'function') {
        (video as unknown as { fastSeek: (t: number) => void }).fastSeek(clampedTime);
      } else {
        video.currentTime = clampedTime;
      }
    } catch {
      this.isSeeking = false;
    }
  }

  /**
   * Called when video finishes seeking a frame, draining any coalesced pending seek
   */
  public onSeeked(): void {
    this.isSeeking = false;
    if (this.pendingSeekTime !== null) {
      const nextTime = this.pendingSeekTime;
      this.pendingSeekTime = null;
      const video = this.videoRef.current;
      if (video) {
        this.dispatchSeek(video, nextTime);
      }
    }
  }

  /**
   * Called on each scroll update to register displacement, determine scroll direction, and update momentum
   */
  public onScroll(scrollY: number): void {
    const video = this.videoRef.current;
    if (!video || !this.isVisibleRef.current) return;

    const now = performance.now();
    const dt = now - this.lastScrollTime;
    const dy = scrollY - this.lastScrollY;
    const absDy = Math.abs(dy);

    // Filter minor micro-jitter (< 1.5px) from erratic trackpad noise
    if (absDy >= 1.5) {
      this.direction = dy > 0 ? 1 : -1;
    }

    this.lastScrollY = scrollY;
    this.lastScrollTime = now;
    this.lastScrollTimestamp = now;

    // Filter anomalous deltas (e.g., tab switch or first scroll after pause)
    if (dt > 4 && dt < 250) {
      const instantVelocity = absDy / dt; // pixels per millisecond
      // Exponential moving average for smooth, organic speed response
      this.smoothedVelocity = this.smoothedVelocity * 0.35 + instantVelocity * 0.65;
    } else {
      this.smoothedVelocity = Math.max(0.2, this.smoothedVelocity * 0.5);
    }

    // Map velocity to target playback rate
    this.targetPlaybackRate = Math.min(
      this.maxPlaybackRate,
      Math.max(
        this.minPlaybackRate,
        this.minPlaybackRate + this.smoothedVelocity * this.velocityMultiplier
      )
    );

    // If scrolling downward (forward) and video is paused, start forward playback
    if (this.direction === 1) {
      if (video.paused) {
        video.play().catch(() => {});
      }
    } else {
      // If scrolling upward (reverse), pause native forward playback so we can step backward cleanly
      if (!video.paused) {
        video.pause();
      }
    }

    // Start or wake up the inertia update loop
    if (this.rafId === null) {
      this.lastFrameTime = now;
      this.rafId = requestAnimationFrame(this.tick);
    }
  }

  /**
   * Continuous animation frame loop:
   * During active scroll, lerps playbackRate towards target velocity in the current scroll direction.
   * When idle, applies physical friction decay until cleanly resting.
   */
  private tick = (now: number): void => {
    const video = this.videoRef.current;
    if (!video || !this.isVisibleRef.current) {
      this.stop();
      return;
    }

    const deltaFrame = Math.min(50, now - this.lastFrameTime);
    this.lastFrameTime = now;
    const timeSinceLastScroll = now - this.lastScrollTimestamp;

    if (timeSinceLastScroll > this.idleThresholdMs) {
      // User has stopped scrolling: apply continuous inertia friction decay
      const frameRatio = deltaFrame / 16.67;
      const decayFactor = Math.pow(this.friction, frameRatio);
      this.currentPlaybackRate *= decayFactor;
      this.smoothedVelocity *= decayFactor;

      if (this.currentPlaybackRate <= this.minHaltRate) {
        // Complete gentle stop
        this.stop();
        return;
      }
    } else {
      // User is actively scrolling: smooth lerp to target velocity
      const lerpSpeed = Math.min(1, 0.25 * (deltaFrame / 16.67));
      this.currentPlaybackRate += (this.targetPlaybackRate - this.currentPlaybackRate) * lerpSpeed;
    }

    const effectiveRate = Math.max(0.1, this.currentPlaybackRate);

    if (this.direction === 1) {
      // Forward playback: ensure video is playing and set playbackRate
      if (video.paused) {
        video.play().catch(() => {});
      }
      try {
        video.playbackRate = effectiveRate;
      } catch {}
    } else {
      // Reverse playback: ensure forward playback is paused and step currentTime backward cleanly
      if (!video.paused) {
        video.pause();
      }
      const dtSeconds = (deltaFrame / 1000) * effectiveRate;
      const newTime = video.currentTime - dtSeconds;

      if (newTime <= 0.02) {
        // Reached the start of the video: pause gently at the first frame
        this.dispatchSeek(video, 0);
        this.stop();
        return;
      } else {
        const nowMs = performance.now();
        // Throttle reverse seek requests to avoid saturating mobile/low-end hardware decoders
        if (nowMs - this.lastSeekTime >= 30) {
          this.lastSeekTime = nowMs;
          this.dispatchSeek(video, newTime);
        } else {
          this.pendingSeekTime = newTime;
        }
      }
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  /**
   * Immediately halts playback and resets inertia state
   */
  public stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    const video = this.videoRef.current;
    if (video) {
      if (!video.paused) {
        video.pause();
      }
      try {
        video.playbackRate = 1.0;
      } catch {}
    }
    this.currentPlaybackRate = 1.0;
    this.smoothedVelocity = 0;
    this.pendingSeekTime = null;
    this.isSeeking = false;
  }
}

export const Hero: React.FC<HeroProps> = memo(({ displayedText, isDoneTyping }) => {
  const heroTrackRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoParallaxRef = useRef<HTMLDivElement>(null);

  // Direct DOM element refs to eliminate React re-renders on scroll
  const stage1Ref = useRef<HTMLDivElement>(null);
  const stage2Ref = useRef<HTMLDivElement>(null);
  const stage3Ref = useRef<HTMLDivElement>(null);
  const scrollIndicatorRef = useRef<HTMLDivElement>(null);
  const scrubPctRef = useRef<HTMLSpanElement>(null);
  const scrubBarRef = useRef<HTMLDivElement>(null);
  const scrubSecRef = useRef<HTMLSpanElement>(null);

  // Animation and progress trackers
  const isMobileRef = useRef<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const currentProgressRef = useRef<number>(0);
  const videoDurationRef = useRef<number>(8);
  const isHeroVisibleRef = useRef<boolean>(true);
  const scrollRafIdRef = useRef<number | null>(null);
  const resizeRafIdRef = useRef<number | null>(null);

  // Dedicated velocity-based inertia helper for scroll-triggered playback and gentle deceleration
  const inertiaHelperRef = useRef<VelocityInertiaHelper | null>(null);
  if (!inertiaHelperRef.current) {
    inertiaHelperRef.current = new VelocityInertiaHelper(videoRef, isHeroVisibleRef, {
      minPlaybackRate: 0.85,
      maxPlaybackRate: 1.75,
      velocityMultiplier: 0.45,
      friction: 0.92,
      idleThresholdMs: 80,
      minHaltRate: 0.12,
    });
  }

  // Cached layout metrics to completely eliminate getBoundingClientRect on scroll
  const trackHeightRef = useRef<number>(0);
  const viewportHeightRef = useRef<number>(0);
  const trackTopRef = useRef<number>(0);

  // Cached DOM state tracking to eliminate redundant CSSOM and DOM tree writes
  const lastDomStateRef = useRef({
    s1Opacity: -1,
    s1Y: -999,
    s1Display: '',
    s1PointerEvents: '',
    s2Opacity: -1,
    s2Y: -999,
    s2Display: '',
    s2PointerEvents: '',
    s3Opacity: -1,
    s3Y: -999,
    s3Display: '',
    s3PointerEvents: '',
    indOpacity: -1,
    indY: -999,
    indPointerEvents: '',
    scrubPctText: '',
    scrubSecText: '',
    scrubScale: -1,
  });

  // Local fallback if the primary video fails to load (no third-party hosts)
  const fallbackVideo = '/background_original.mp4';

  const [videoSrc, setVideoSrc] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return '/background_mobile.mp4';
    }
    return '/background.mp4';
  });

  // Responsively select optimal video source without resetting scroll progress or causing layout shifts
  useEffect(() => {
    const handleViewportChange = () => {
      const isMobile = window.innerWidth < 768;
      isMobileRef.current = isMobile;
      const targetSrc = isMobile ? '/background_mobile.mp4' : '/background.mp4';
      setVideoSrc((prev) => {
        if (prev === fallbackVideo) return prev;
        return prev !== targetSrc ? targetSrc : prev;
      });
    };

    window.addEventListener('resize', handleViewportChange, { passive: true });
    window.addEventListener('orientationchange', handleViewportChange, { passive: true });
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
    };
  }, [fallbackVideo]);

  // Apply visual updates directly to GPU-accelerated CSS properties with change deadbands
  const applyVisuals = useCallback((p: number) => {
    const last = lastDomStateRef.current;

    // Stage 1: Brand & Opening Headline (Visible 0.0 -> ~0.36)
    const stage1Opacity = p <= 0.22 ? 1 : Math.max(0, 1 - (p - 0.22) / 0.16);
    const stage1Y = p * -50;
    const stage1Display = stage1Opacity > 0.01 ? 'block' : 'none';
    const stage1Pointer = stage1Opacity > 0.02 ? 'auto' : 'none';

    if (stage1Ref.current) {
      if (Math.abs(stage1Opacity - last.s1Opacity) >= 0.005) {
        stage1Ref.current.style.opacity = stage1Opacity.toFixed(3);
        last.s1Opacity = stage1Opacity;
      }
      if (Math.abs(stage1Y - last.s1Y) >= 0.2) {
        stage1Ref.current.style.transform = `translate3d(0, ${stage1Y.toFixed(1)}px, 0)`;
        last.s1Y = stage1Y;
      }
      if (stage1Display !== last.s1Display) {
        stage1Ref.current.style.display = stage1Display;
        last.s1Display = stage1Display;
      }
      if (stage1Pointer !== last.s1PointerEvents) {
        stage1Ref.current.style.pointerEvents = stage1Pointer;
        last.s1PointerEvents = stage1Pointer;
      }
    }

    // Stage 2: Dispatch & Typewriter Card (Peaks 0.35-0.58)
    let stage2Opacity = 0;
    if (p < 0.2) {
      stage2Opacity = 0;
    } else if (p < 0.35) {
      stage2Opacity = (p - 0.2) / 0.15;
    } else if (p <= 0.58) {
      stage2Opacity = 1;
    } else if (p <= 0.72) {
      stage2Opacity = Math.max(0, 1 - (p - 0.58) / 0.14);
    }
    const stage2Y = (1 - stage2Opacity) * 20;
    const stage2Display = stage2Opacity > 0.01 ? 'block' : 'none';
    const stage2Pointer = stage2Opacity > 0.02 ? 'auto' : 'none';

    if (stage2Ref.current) {
      if (Math.abs(stage2Opacity - last.s2Opacity) >= 0.005) {
        stage2Ref.current.style.opacity = stage2Opacity.toFixed(3);
        last.s2Opacity = stage2Opacity;
      }
      if (Math.abs(stage2Y - last.s2Y) >= 0.2) {
        stage2Ref.current.style.transform = `translate3d(0, ${stage2Y.toFixed(1)}px, 0)`;
        last.s2Y = stage2Y;
      }
      if (stage2Display !== last.s2Display) {
        stage2Ref.current.style.display = stage2Display;
        last.s2Display = stage2Display;
      }
      if (stage2Pointer !== last.s2PointerEvents) {
        stage2Ref.current.style.pointerEvents = stage2Pointer;
        last.s2PointerEvents = stage2Pointer;
      }
    }

    // Stage 3: Action Stage & Registration CTAs (Peaks 0.66-0.88)
    let stage3Opacity = 0;
    if (p < 0.52) {
      stage3Opacity = 0;
    } else if (p < 0.66) {
      stage3Opacity = (p - 0.52) / 0.14;
    } else if (p <= 0.88) {
      stage3Opacity = 1;
    } else if (p <= 1.0) {
      stage3Opacity = Math.max(0, 1 - (p - 0.88) / 0.12);
    }
    const stage3Y = (1 - stage3Opacity) * 20;
    const stage3Display = stage3Opacity > 0.01 ? 'block' : 'none';
    const stage3Pointer = stage3Opacity > 0.02 ? 'auto' : 'none';

    if (stage3Ref.current) {
      if (Math.abs(stage3Opacity - last.s3Opacity) >= 0.005) {
        stage3Ref.current.style.opacity = stage3Opacity.toFixed(3);
        last.s3Opacity = stage3Opacity;
      }
      if (Math.abs(stage3Y - last.s3Y) >= 0.2) {
        stage3Ref.current.style.transform = `translate3d(0, ${stage3Y.toFixed(1)}px, 0)`;
        last.s3Y = stage3Y;
      }
      if (stage3Display !== last.s3Display) {
        stage3Ref.current.style.display = stage3Display;
        last.s3Display = stage3Display;
      }
      if (stage3Pointer !== last.s3PointerEvents) {
        stage3Ref.current.style.pointerEvents = stage3Pointer;
        last.s3PointerEvents = stage3Pointer;
      }
    }

    // Scroll Down Indicator
    const indicatorOpacity = p <= 0.01 ? 1 : Math.max(0, 1 - p / 0.08);
    const indicatorY = p * -20;
    const indicatorPointer = indicatorOpacity > 0.05 ? 'auto' : 'none';

    if (scrollIndicatorRef.current) {
      if (Math.abs(indicatorOpacity - last.indOpacity) >= 0.005) {
        scrollIndicatorRef.current.style.opacity = indicatorOpacity.toFixed(3);
        last.indOpacity = indicatorOpacity;
      }
      if (indicatorPointer !== last.indPointerEvents) {
        scrollIndicatorRef.current.style.pointerEvents = indicatorPointer;
        last.indPointerEvents = indicatorPointer;
      }
      if (Math.abs(indicatorY - last.indY) >= 0.2) {
        scrollIndicatorRef.current.style.transform = `translate3d(-50%, ${indicatorY.toFixed(1)}px, 0)`;
        last.indY = indicatorY;
      }
    }

    // Scrub Pill text & GPU-composited scaleX progress bar (cached string comparisons)
    if (scrubPctRef.current) {
      const pctStr = `${Math.round(p * 100)}%`;
      if (pctStr !== last.scrubPctText) {
        scrubPctRef.current.textContent = pctStr;
        last.scrubPctText = pctStr;
      }
    }
    if (scrubBarRef.current) {
      if (Math.abs(p - last.scrubScale) >= 0.002) {
        scrubBarRef.current.style.transform = `scaleX(${p.toFixed(3)})`;
        last.scrubScale = p;
      }
    }
    if (scrubSecRef.current) {
      const sec = Math.min(
        Math.floor(p * videoDurationRef.current),
        Math.floor(videoDurationRef.current)
      );
      const secStr = `00:0${sec}s`;
      if (secStr !== last.scrubSecText) {
        scrubSecRef.current.textContent = secStr;
        last.scrubSecText = secStr;
      }
    }
  }, []);

  const handleVideoReady = useCallback((video: HTMLVideoElement) => {
    if (!isNaN(video.duration) && isFinite(video.duration) && video.duration > 0) {
      videoDurationRef.current = video.duration;
    }
    // Paused by default until scroll interaction starts
    video.pause();
  }, []);

  // Read scroll position with cached layout offset — NO getBoundingClientRect on scroll
  const updateOnScroll = useCallback(() => {
    const scrollableDistance = trackHeightRef.current - viewportHeightRef.current;
    if (scrollableDistance <= 0) return;

    const scrollY = window.scrollY || window.pageYOffset || 0;
    const currentScroll = scrollY - trackTopRef.current;

    // Clamped progress calculation: cleanly handles fast scrolls past boundaries
    const rawProgress = currentScroll / scrollableDistance;
    const clamped = currentScroll <= 0 ? 0 : currentScroll >= scrollableDistance ? 1 : rawProgress;

    currentProgressRef.current = clamped;

    // Direct, hardware-accelerated updates to DOM elements (stages, indicators, scrub pill)
    applyVisuals(clamped);

    // Subtle GPU-accelerated scroll parallax on the background video layer
    if (videoParallaxRef.current) {
      const parallaxY = -(clamped * 45); // 45px vertical translation creates depth
      videoParallaxRef.current.style.transform = `translate3d(0, ${parallaxY.toFixed(1)}px, 0)`;
    }

    // Velocity-based inertia helper: calculates real-time scroll speed and applies gentle friction deceleration on stop
    if (
      isHeroVisibleRef.current &&
      currentScroll >= -viewportHeightRef.current &&
      currentScroll <= scrollableDistance + viewportHeightRef.current
    ) {
      inertiaHelperRef.current?.onScroll(scrollY);
    }
  }, [applyVisuals]);

  // RAF-coalesced scroll handler: coalesces high-frequency scroll events to exactly one calculation per frame
  const handleScroll = useCallback(() => {
    if (scrollRafIdRef.current !== null) return;
    scrollRafIdRef.current = requestAnimationFrame(() => {
      scrollRafIdRef.current = null;
      if (isHeroVisibleRef.current) {
        updateOnScroll();
      }
    });
  }, [updateOnScroll]);

  // Measure and cache layout metrics on mount and resize ONLY
  const updateLayoutMetrics = useCallback(() => {
    const track = heroTrackRef.current;
    const currentInnerHeight = window.innerHeight;
    if (track) {
      trackHeightRef.current = track.offsetHeight;
      trackTopRef.current = track.offsetTop;
    } else {
      trackHeightRef.current = currentInnerHeight * 3.2;
      trackTopRef.current = 0;
    }
    viewportHeightRef.current = currentInnerHeight;
    updateOnScroll();
  }, [updateOnScroll]);

  // RAF-coalesced resize handler to avoid layout thrashing during dynamic address bar changes
  const handleResize = useCallback(() => {
    if (resizeRafIdRef.current !== null) return;
    resizeRafIdRef.current = requestAnimationFrame(() => {
      resizeRafIdRef.current = null;
      updateLayoutMetrics();
    });
  }, [updateLayoutMetrics]);

  // Mount setup: listeners, IntersectionObserver, and cleanups
  useEffect(() => {
    updateLayoutMetrics();

    const video = videoRef.current;
    if (video) {
      if (video.readyState >= 1 && !isNaN(video.duration) && isFinite(video.duration) && video.duration > 0) {
        videoDurationRef.current = video.duration;
      }
    }

    // IntersectionObserver to pause video playback and RAF processing when Hero is completely off-screen
    const track = heroTrackRef.current;
    let observer: IntersectionObserver | null = null;
    if (track && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          isHeroVisibleRef.current = entry.isIntersecting;
          if (entry.isIntersecting) {
            updateOnScroll();
          } else {
            inertiaHelperRef.current?.stop();
          }
        },
        { rootMargin: '100px 0px 100px 0px' }
      );
      observer.observe(track);
    }

    // Visibility change listener (pauses playback and RAF when browser tab is inactive)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isHeroVisibleRef.current = false;
        inertiaHelperRef.current?.stop();
        if (scrollRafIdRef.current !== null) {
          cancelAnimationFrame(scrollRafIdRef.current);
          scrollRafIdRef.current = null;
        }
      } else {
        isHeroVisibleRef.current = true;
        updateLayoutMetrics();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Set initial layout values
    applyVisuals(0);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (observer) observer.disconnect();
      inertiaHelperRef.current?.stop();
      if (scrollRafIdRef.current !== null) {
        cancelAnimationFrame(scrollRafIdRef.current);
        scrollRafIdRef.current = null;
      }
      if (resizeRafIdRef.current !== null) {
        cancelAnimationFrame(resizeRafIdRef.current);
        resizeRafIdRef.current = null;
      }
    };
  }, [applyVisuals, handleResize, handleScroll, updateLayoutMetrics, updateOnScroll]);

  return (
    <section
      id="hero"
      ref={heroTrackRef}
      className="relative w-full h-[320vh] bg-[#070707]"
    >
      {/* Pinned Sticky Full-Screen Viewport Container */}
      <div className="sticky top-0 h-screen w-full overflow-hidden isolate">
        {/* Background Video Layer — Kinetic scroll-triggered playback with GPU parallax */}
        <div
          ref={videoParallaxRef}
          className="absolute -top-[7%] inset-x-0 h-[114%] w-full pointer-events-none select-none will-change-transform"
          style={{ transform: 'translate3d(0, 0px, 0)' }}
        >
          <video
            ref={videoRef}
            src={videoSrc}
            loop
            muted
            playsInline
            disablePictureInPicture
            disableRemotePlayback
            preload="auto"
            onError={() => {
              if (videoSrc !== fallbackVideo) {
                setVideoSrc(fallbackVideo);
              }
            }}
            onLoadedMetadata={(e) => handleVideoReady(e.currentTarget)}
            onCanPlay={(e) => handleVideoReady(e.currentTarget)}
            onSeeked={() => inertiaHelperRef.current?.onSeeked()}
            className="absolute inset-0 h-full w-full object-cover pointer-events-none select-none opacity-85"
            style={{
              objectPosition: '70% center',
            }}
          />
        </div>

        {/* Cinematic Scrims for Flawless Text Readability without GPU-heavy blur */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#070707] via-[#070707]/60 to-transparent" />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/85 via-black/40 to-transparent" />
        <div className="absolute inset-0 pointer-events-none bg-radial from-transparent via-[#070707]/30 to-[#070707]/85" />

        {/* Synchronized Hero Content Container - Visually centered for desktop and mobile */}
        <div className="relative z-10 h-full w-full max-w-5xl mx-auto px-5 sm:px-8 md:px-12 flex flex-col justify-center items-center pb-20 sm:pb-24 md:pb-0 pt-16 md:pt-0 text-center">
          <div className="w-full max-w-3xl relative mx-auto flex flex-col items-center text-center">
            {/* ========================================================
                STAGE 1: Opening & Grand Headline (Scroll p: 0.0 -> 0.35)
               ======================================================== */}
            <div
              ref={stage1Ref}
              className="w-full flex flex-col items-center text-center will-change-[opacity,transform] pointer-events-auto"
              style={{
                opacity: 1,
                transform: 'translate3d(0, 0px, 0)',
                display: 'block',
              }}
            >
              <div className="inline-flex items-center justify-center gap-2 mb-4 px-3.5 py-1 bg-[#0c0c0e]/95 border border-[#d4af37]/40 rounded-sm shadow-[0_0_15px_rgba(212,175,55,0.15)]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#d4af37]" />
                <span className="text-[11px] sm:text-xs font-medium uppercase tracking-widest text-[#f3e5ab]">
                  Official Delegation Summit · 2027
                </span>
              </div>

              <h1
                className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white mb-4 font-serif leading-[1.06] text-center"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                <span className="shimmer-platinum">WEST</span>{' '}
                <span className="shimmer-gold">MUN</span>
              </h1>

              <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent mb-5 mx-auto" />

              <p className="text-base sm:text-lg md:text-xl text-neutral-300 font-light leading-relaxed mb-6 text-center max-w-2xl mx-auto">
                The Western Model United Nations Conference — convening sovereign youth delegations to debate global crises, draft treaties, and advance multilateral diplomacy.
              </p>

              <div className="flex items-center justify-center gap-3 text-xs tracking-widest uppercase text-neutral-400 mx-auto text-center">
                <span className="text-[#d4af37]">✦</span>
                <span>Scroll down to initiate proceedings</span>
                <span className="animate-pulse text-[#d4af37]">↓</span>
              </div>
            </div>

            {/* ========================================================
                STAGE 2: Diplomatic Dispatch & Typewriter (Scroll p: 0.25 -> 0.70)
               ======================================================== */}
            <div
              ref={stage2Ref}
              className="w-full flex flex-col items-center text-center will-change-[opacity,transform] pointer-events-none"
              style={{
                opacity: 0,
                transform: 'translate3d(0, 20px, 0)',
                display: 'none',
              }}
            >
              <div className="inline-flex items-center justify-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-[#d4af37]" />
                <span className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold">
                  Plenary Session Dispatch
                </span>
              </div>

              <h2
                className="text-2xl sm:text-4xl font-serif text-white mb-4 leading-snug text-center"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Diplomatic{' '}
                <span className="gold-gradient-text shimmer-gold shimmer-stagger-1">
                  Engagement
                </span>{' '}
                in Real-Time
              </h2>

              {/* Typewriter Text Container */}
              <div className="mb-6 p-5 sm:p-6 bg-[#0c0c0e]/95 border border-[#d4af37]/35 rounded-sm shadow-xl text-center max-w-2xl w-full mx-auto">
                <TypewriterDispatch
                  fallbackText={displayedText}
                  fallbackDone={isDoneTyping}
                />
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs font-mono text-neutral-400 mx-auto">
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
              ref={stage3Ref}
              className="w-full flex flex-col items-center text-center will-change-[opacity,transform] pointer-events-none"
              style={{
                opacity: 0,
                transform: 'translate3d(0, 20px, 0)',
                display: 'none',
              }}
            >
              <div className="inline-flex items-center justify-center gap-2 mb-3 px-3 py-1 bg-[#141418] border border-[#d4af37]/30 rounded-sm text-xs text-[#f3e5ab] font-medium uppercase tracking-wider">
                Registration: TBA
              </div>

              <h2
                className="text-3xl sm:text-5xl font-serif text-white mb-4 text-center leading-tight"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Take Your Seat on the{' '}
                <span className="gold-gradient-text shimmer-gold shimmer-stagger-2">
                  World Stage
                </span>
              </h2>

              <p className="text-neutral-300 text-sm sm:text-base mb-8 max-w-xl mx-auto font-light leading-relaxed text-center">
                Whether representing a permanent member of the Security Council or leading an assembly coalition, WEST MUN provides the substantive arena for your diplomatic ambitions.
              </p>

              {/* Dual Action CTAs */}
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mx-auto w-full max-w-md sm:max-w-none">
                <a
                  href="#register"
                  className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-xs sm:text-sm font-semibold uppercase tracking-widest text-black bg-gradient-to-r from-[#e5c158] via-[#d4af37] to-[#aa8232] rounded-sm hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_20px_rgba(212,175,55,0.3)] cursor-pointer"
                >
                  <span>Registration: TBA</span>
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
          ref={scrollIndicatorRef}
          className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2.5 will-change-[opacity,transform]"
          style={{
            opacity: 1,
            transform: 'translate3d(-50%, 0px, 0)',
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
            <div className="w-5 h-8 rounded-full border border-[#d4af37]/70 flex items-start justify-center pt-1.5 bg-[#0e0e11]/90 group-hover:border-[#d4af37] transition-colors shadow-[0_0_12px_rgba(212,175,55,0.2)]">
              <div className="w-1 h-2 bg-[#d4af37] rounded-full animate-bounce" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-mono tracking-widest text-[#f3e5ab] uppercase opacity-80 group-hover:opacity-100 transition-opacity">
              Scroll
            </span>
          </a>
        </div>

        {/* HIGH-PERFORMANCE VIDEO SCRUB INDICATOR PILL */}
        <div
          className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 z-20 hidden md:flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-[#0a0a0c]/85 border border-[#d4af37]/30 shadow-lg text-[10px] font-mono text-neutral-400 select-none pointer-events-none will-change-transform"
          aria-hidden="true"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-pulse" />
          <span className="text-[#f3e5ab]">SUMMIT REEL</span>
          <span className="text-neutral-600">|</span>
          <span ref={scrubSecRef} className="text-neutral-300">
            00:00s
          </span>
          <span className="text-neutral-600">|</span>
          <span ref={scrubPctRef} className="text-[#d4af37]">
            0%
          </span>
          {/* Hardware-accelerated progress bar using scaleX */}
          <div className="w-12 h-1 bg-neutral-800 rounded-full overflow-hidden ml-1">
            <div
              ref={scrubBarRef}
              className="h-full bg-gradient-to-r from-[#d4af37] to-[#f7e7b4] origin-left will-change-transform"
              style={{ transform: 'scaleX(0)' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
});
Hero.displayName = 'Hero';
