# Interactive Scroll-Driven Video Playback with Smooth Deceleration

Convert the WEST MUN hero background video into an interactive, scroll-responsive cinematic experience. The video plays forward naturally while the user scrolls and gently decelerates to a halt when scrolling pauses, delivering an interactive feel with zero decoder lag or frame stuttering.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Based on your selections, the hero background video will react dynamically to your scrolling:
> - **Active Scroll Playback:** Whenever you scroll inside the hero section, the video immediately plays forward at native framerate (without choppy `currentTime` seeking).
> - **Dynamic Velocity Response:** Faster scrolling slightly elevates playback speed (`1.0x` to `1.5x`), while slower scrolling maintains a graceful, deliberate pace.
> - **Gentle Deceleration on Stop:** When scrolling ceases, rather than freezing abruptly, the video smoothly decelerates over ~400ms before pausing on its final resting frame.
> - **Preserved 3-Stage Narrative:** The 320vh scroll progress continues to orchestrate Stage 1 (Official Delegation Summit), Stage 2 (Diplomatic Dispatch & Typewriter), and Stage 3 (Registration CTAs) alongside subtle GPU parallax.

- **Confirmed Decision 1**: Play forward while scrolling, pause when scrolling stops.
- **Confirmed Decision 2**: Gently decelerate playback to a stop over a brief moment (~400ms) rather than freezing instantly.

---

## 1. Overview & Core Concept

- **What It Does**: Transforms the hero background from a passive loop into an interactive, kinetic canvas that directly responds to user scroll engagement.
- **Target Audience**: Model UN delegates, faculty advisors, and student leaders expecting a modern, prestige-grade conference landing page.
- **Key Value**: Bridges the tactile feel of user-driven interactivity with the stutter-free performance of native browser hardware decoding.

```
┌─────────────────────────────────────────────────────────────┐
│                    User Scrolls Page                        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Scroll Activity & Velocity                  │
│   - Detects downward/upward scroll motion via RAF listener   │
│   - video.play() triggers instantly if currently paused     │
│   - Adjusts video.playbackRate dynamically (0.8x – 1.5x)    │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌───────────────────────────────┐   ┌─────────────────────────┐
│     While Scrolling Continues │   │  When Scrolling Stops   │
│   - Video streams forward     │   │  - 120ms idle detected   │
│   - Parallax offset updates   │   │  - Playback decelerates │
│   - Narrative stages reveal   │   │    1.0 -> 0.6 -> 0.2 ->0│
│   - 100% native 60/120fps     │   │  - video.pause() rests  │
└───────────────────────────────┘   └─────────────────────────┘
```

---

## 2. User Experience & Visual Design

- **Interactive Feel**:
  - As soon as the user touches the scroll wheel, trackpad, or screen, the video bursts to life, streaming smoothly forward.
  - Pausing to read the Diplomatic Dispatch or Summit headline causes the video to smoothly ease to a resting posture over ~400ms.
- **Visual Staging & Parallax**:
  - **Scroll Parallax:** GPU-composited vertical translation (`translate3d(0, -${p * 45}px, 0)`) provides continuous depth alignment with the page scroll.
  - **Stage 1 (0.0 – 0.35):** Official Delegation Summit headline with gold shield badge.
  - **Stage 2 (0.35 – 0.70):** Plenary Session Dispatch with isolated typewriter animation.
  - **Stage 3 (0.70 – 1.0):** Urgent Committee Registration CTA with gold shimmer badges.
- **Aesthetic Consistency**:
  - Obsidian background (`#070707`), muted gold accents (`#d4af37`), high-contrast scrims, and zero pill badge clutter.

---

## 3. Key Product Decisions & Technical Strategy

### Decision 1: Playback-Driven Motion vs. Decoder Seeking
- **Chosen Approach**: Control `video.play()`, `video.pause()`, and `video.playbackRate` rather than writing to `video.currentTime`.
- **Why**: Writing `currentTime` continuously forces the browser to discard its decode cache and seek GOP keyframes, causing severe browser lag. Native forward playback uses hardware decoding buffers at full display refresh rate with zero dropped frames.
- **Alternatives Considered**: Fast-seek scrubbing (rejected due to measured decoder thrashing).

### Decision 2: Smooth Deceleration Engine
- **Chosen Approach**: When scroll events pause for >100ms, start a gentle ease-out loop that ramps `playbackRate` down from `1.0` to `0.0` over 350–450ms, then invokes `video.pause()`. If new scroll events arrive during easing, immediately cancel easing and restore full playback speed.
- **Why**: An instant freeze feels jarring and robotic; a natural deceleration feels tactile, deliberate, and high-end.

---

## 4. Technical Architecture & Implementation Steps

### `src/components/Hero.tsx` Refinements
1. **Scroll-Driven Playback Controller**:
   - Track `lastScrollY`, `lastScrollTime`, and `scrollVelocity` inside refs.
   - On scroll event:
     - Clear any pending deceleration timer.
     - Call `video.play()` if paused.
     - Scale `video.playbackRate = Math.min(1.6, Math.max(0.8, 0.8 + velocity * 0.4))`.
2. **Deceleration & Resting Engine**:
   - Use an idle timer (100–120ms):
     - Run a requestAnimationFrame deceleration step reducing `playbackRate` by ~15% per frame.
     - Once `playbackRate < 0.15`, call `video.pause()` and reset `playbackRate = 1.0`.
3. **Boundary & Off-Screen Lifecycle**:
   - Maintain `IntersectionObserver` to guarantee that video pauses completely when the hero is off-screen.
   - Maintain tab visibility handlers (`document.hidden`).

---

## Verification Plan

### Automated Verification
1. **TypeScript & Linter**: Run `npm run lint` (`tsc --noEmit`) to verify zero type regressions.
2. **Security Audit**: Run `npx tsx scripts/security-check.ts` to verify 12/12 security checks pass.
3. **Production Build**: Run `npm run build` to verify clean bundle compilation.
4. **Applet Compilation**: Call `compile_applet`.

### Manual Verification
- **Scroll Play:** Scroll down slowly: video plays smoothly forward.
- **Scroll Fast:** Video accelerates subtly with scroll speed.
- **Scroll Stop:** Video eases to a soft stop over ~400ms without abrupt freezing.
- **Idle State:** Video rests cleanly while reading stages.
- **Reverse Scroll:** Video resumes playing forward while scrolling back up through the hero.
