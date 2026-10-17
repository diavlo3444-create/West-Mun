# Bidirectional Scroll-Driven Video Playback with Reverse Inertia

Enable directional awareness in the WEST MUN hero background video so scrolling upward smoothly reverses the video playback with physical inertia and gentle deceleration, resting cleanly at the first frame.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Based on your selections, the hero background video will become fully bidirectional:
> - **Downward Scroll:** Video streams forward at native refresh rates with dynamic velocity scaling (`0.85x` – `1.75x`).
> - **Upward Scroll:** Video plays backward in synchronization with your upward scroll speed, stepping backward frame-by-frame with matching inertia.
> - **Inertia Deceleration in Both Directions:** When upward scrolling stops, the video gently decelerates to a stop over ~400ms rather than freezing abruptly.
> - **First Frame Boundary:** If rewinding reaches the beginning of the video, it smoothly rests at the first frame (`00:00s`) without wrapping or abrupt jumps.

- **Confirmed Decision 1**: Play backward with velocity inertia when scrolling up, decelerating smoothly to a halt when scroll stops.
- **Confirmed Decision 2**: Pause gently at the first frame if rewinding reaches the beginning of the video.

---

## 1. Overview & Core Concept

- **What It Does**: Upgrades the `VelocityInertiaHelper` in `src/components/Hero.tsx` with directional intelligence:
  - Downward scroll advances the cinematic narrative forward.
  - Upward scroll rewinds the video naturally, mirroring the physical feeling of rewinding a film reel or timeline.
- **Target Audience**: Model UN participants navigating back and forth across conference stages and headlines.
- **Key Value**: Delivers bidirectional physical responsiveness with zero abrupt stops and zero browser decoder crashes.

```
                    ┌────────────────────────┐
                    │      User Scrolls      │
                    └───────────┬────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│     Scrolling Down (dy > 0)   │               │      Scrolling Up (dy < 0)    │
│  - Direction = Forward (+1)   │               │  - Direction = Reverse (-1)   │
│  - Native hardware forward    │               │  - Micro-stepping rewind tick │
│  - Scales playbackRate (0.85x)│               │  - Scales rewind speed (0.85x)│
└───────────────┬───────────────┘               └───────────────┬───────────────┘
                │                                               │
                └───────────────────────┬───────────────────────┘
                                        │
                                        ▼
                        ┌───────────────────────────────┐
                        │      When Scrolling Stops     │
                        │  - 80ms idle threshold        │
                        │  - Friction decay (0.92^dt)   │
                        │  - Smoothly eases to pause    │
                        │  - Rests on current frame     │
                        │  - If time <= 0, rests at 0s  │
                        └───────────────────────────────┘
```

---

## 2. Technical Architecture & Implementation Steps

### Refinements in `src/components/Hero.tsx`

1. **Directional Velocity Tracking in `VelocityInertiaHelper`**:
   - Detect instantaneous displacement sign:
     - If `scrollY > lastScrollY`: set `direction = 1` (forward).
     - If `scrollY < lastScrollY`: set `direction = -1` (reverse).
   - Filter small jitter (< 2px) to prevent direction fluttering on high-precision trackpads.
2. **Bidirectional Inertia Loop (`tick`)**:
   - **Forward Branch (`direction === 1`)**:
     - Ensure native `video.play()` is active.
     - Apply smoothed `video.playbackRate = currentPlaybackRate`.
   - **Reverse Branch (`direction === -1`)**:
     - Pause native forward playback (`video.pause()`) so the browser media engine does not conflict.
     - On each animation frame, compute reverse delta:
       $$\text{dtSeconds} = \frac{\Delta\text{frameMs}}{1000} \times \text{currentPlaybackRate}$$
       $$\text{newTime} = \max(0, \text{video.currentTime} - \text{dtSeconds})$$
       Assign `video.currentTime = newTime`.
     - Boundary check: If `newTime <= 0.02s`, invoke `this.stop()` to pause gently at the initial frame.
3. **Deceleration & Inertia Preservation**:
   - Continuous friction decay (`decayFactor = Math.pow(friction, frameRatio)`) applies identically in both forward and reverse directions.
   - When scrolling stops, reverse motion smoothly coasts to a halt over ~400ms before pausing.
4. **Immediate Direction Swapping**:
   - If the user reverses scroll direction mid-motion (e.g., scrolling up and then immediately down), the inertia helper switches branches seamlessly without pausing or stuttering.

---

## Verification Plan

### Automated Verification
1. **TypeScript & Linter**: Run `npm run lint` (`tsc --noEmit`) to verify zero type regressions.
2. **Security Audit**: Run `npx tsx scripts/security-check.ts` to verify 12/12 security checks pass.
3. **Production Build**: Run `npm run build` to verify clean bundle compilation.
4. **Applet Compilation**: Call `compile_applet`.

### Manual & Visual Verification
- **Downward Scroll:** Video plays forward smoothly with dynamic velocity scaling.
- **Upward Scroll:** Video reverses smoothly backwards with matching inertia.
- **Stop on Reverse:** When upward scrolling stops, video smoothly coasts to a halt.
- **Beginning Boundary:** Reaching the top of the hero section pauses cleanly on the first frame (`00:00s`).
