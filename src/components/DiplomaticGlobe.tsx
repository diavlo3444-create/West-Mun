import React, { useEffect, useRef, useState } from 'react';
import { ArrowDownRight, Globe2 } from 'lucide-react';

type Point = { lat: number; lon: number; size?: number; city?: string };

// Deliberately lightweight geographic landmarks: no map tiles, external requests, or WebGL dependency.
const LAND_POINTS: Point[] = [
  ...Array.from({ length: 15 }, (_, i) => ({ lat: 70 - i * 8, lon: -165 + i * 3.7 })),
  ...Array.from({ length: 13 }, (_, i) => ({ lat: 60 - i * 7, lon: -130 + i * 3.1 })),
  ...Array.from({ length: 11 }, (_, i) => ({ lat: 52 - i * 8, lon: -95 + i * 2.7 })),
  ...Array.from({ length: 10 }, (_, i) => ({ lat: 48 - i * 8, lon: -65 + i * 2.1 })),
  ...Array.from({ length: 16 }, (_, i) => ({ lat: 65 - i * 7.3, lon: 5 + i * 3.8 })),
  ...Array.from({ length: 12 }, (_, i) => ({ lat: 50 - i * 8, lon: 25 + i * 3.2 })),
  ...Array.from({ length: 13 }, (_, i) => ({ lat: 25 - i * 7, lon: 5 + i * 2.6 })),
  ...Array.from({ length: 11 }, (_, i) => ({ lat: 20 - i * 7, lon: 30 + i * 2.3 })),
  ...Array.from({ length: 17 }, (_, i) => ({ lat: 55 - i * 5.5, lon: 75 + i * 4.5 })),
  ...Array.from({ length: 14 }, (_, i) => ({ lat: 35 - i * 4.2, lon: 110 + i * 3.6 })),
  ...Array.from({ length: 11 }, (_, i) => ({ lat: 10 - i * 5, lon: 120 + i * 2.4 })),
  ...Array.from({ length: 12 }, (_, i) => ({ lat: -10 - i * 6, lon: 135 + i * 2.2 })),
  ...Array.from({ length: 12 }, (_, i) => ({ lat: -5 - i * 6.5, lon: -75 + i * 2.4 })),
  ...Array.from({ length: 10 }, (_, i) => ({ lat: -15 - i * 7, lon: -65 + i * 2.2 })),
  ...Array.from({ length: 8 }, (_, i) => ({ lat: -20 - i * 6, lon: -50 + i * 1.8 })),
  ...Array.from({ length: 7 }, (_, i) => ({ lat: -25 - i * 4.5, lon: 15 + i * 2.8 })),
  ...Array.from({ length: 7 }, (_, i) => ({ lat: -25 - i * 4.5, lon: 30 + i * 2.3 })),
  { lat: 24.7, lon: 46.7, size: 4, city: 'RIYADH' },
  { lat: 51.5, lon: -0.1, size: 2.4 },
  { lat: 40.7, lon: -74, size: 2.4 },
  { lat: 48.8, lon: 2.3, size: 2.4 },
  { lat: 35.7, lon: 139.7, size: 2.4 },
  { lat: 1.3, lon: 103.8, size: 2.4 },
];

function project(lat: number, lon: number, rotation: number, radius: number) {
  const phi = (lat * Math.PI) / 180;
  const lambda = ((lon + rotation) * Math.PI) / 180;
  const x = Math.cos(phi) * Math.sin(lambda);
  const y = Math.sin(phi);
  const z = Math.cos(phi) * Math.cos(lambda);
  return { x: x * radius, y: -y * radius, z };
}

export const DiplomaticGlobe: React.FC = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ active: false, x: 0, rotation: 0 });
  const rotationRef = useRef(18);
  const motionRef = useRef({ reduced: false, paused: false });

  useEffect(() => {
    motionRef.current.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const host = hostRef.current;
    if (!host) return;
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
      motionRef.current.paused = !entry.isIntersecting || document.hidden;
    }, { threshold: 0.05 });
    observer.observe(host);
    const onVisibility = () => { motionRef.current.paused = document.hidden; };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', onVisibility); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvasHostRef.current;
    const ctx = canvas?.getContext('2d', { alpha: true });
    if (!canvas || !host || !ctx) return;
    let raf = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let last = 0;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, width < 600 ? 1.35 : 1.7);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (motionRef.current.paused || !isVisible) return;
      const dt = last ? Math.min(32, now - last) : 16;
      last = now;
      if (!dragRef.current.active && !motionRef.current.reduced) rotationRef.current += dt * 0.0038;
      ctx.clearRect(0, 0, width, height);

      const compact = width < 600;
      const radius = Math.min(width * (compact ? 0.38 : 0.28), height * 0.43, compact ? 205 : 285);
      const cx = width * (compact ? 0.5 : 0.57);
      const cy = height * (compact ? 0.46 : 0.49);
      const rot = rotationRef.current;
      const gradient = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.38, radius * 0.05, cx, cy, radius * 1.25);
      gradient.addColorStop(0, 'rgba(42,39,29,0.82)');
      gradient.addColorStop(0.6, 'rgba(15,15,16,0.95)');
      gradient.addColorStop(1, 'rgba(4,4,5,0.98)');
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      // Fine latitude / longitude lines, kept quiet so the gold geography carries the focus.
      ctx.lineWidth = 0.65;
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        for (let step = 0; step <= 90; step++) {
          const lon = -180 + step * 4;
          const p = project(lat, lon, rot, radius);
          const x = cx + p.x;
          const y = cy + p.y;
          if (step === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = lat === 0 ? 'rgba(212,175,55,0.16)' : 'rgba(220,210,180,0.10)';
        ctx.stroke();
      }
      for (let lon = -150; lon <= 180; lon += 30) {
        ctx.beginPath();
        for (let step = 0; step <= 36; step++) {
          const lat = -90 + step * 5;
          const p = project(lat, lon, rot, radius);
          if (step === 0) ctx.moveTo(cx + p.x, cy + p.y); else ctx.lineTo(cx + p.x, cy + p.y);
        }
        ctx.strokeStyle = 'rgba(220,210,180,0.095)';
        ctx.stroke();
      }

      // Land lights and diplomatic city nodes appear only on the visible hemisphere.
      LAND_POINTS.forEach((point) => {
        const p = project(point.lat, point.lon, rot, radius);
        if (p.z < 0.04) return;
        const x = cx + p.x;
        const y = cy + p.y;
        const isRiyadh = point.city === 'RIYADH';
        const r = point.size || 1.35;
        ctx.beginPath();
        ctx.arc(x, y, isRiyadh ? r * 3.4 : r, 0, Math.PI * 2);
        ctx.fillStyle = isRiyadh ? 'rgba(212,175,55,0.14)' : 'rgba(212,175,55,0.42)';
        ctx.fill();
        if (isRiyadh) {
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = '#f5e5a5';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x, y, r * 2.6, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(243,229,171,0.72)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
          ctx.fillStyle = '#f3e5ab';
          ctx.fillText('RIYADH', x + 11, y - 9);
        }
      });

      // A single great-circle style arc links the host city to the wider world.
      const origin = project(24.7, 46.7, rot, radius);
      if (origin.z > 0) {
        const target = project(48.8, 2.3, rot, radius);
        if (target.z > 0) {
          ctx.beginPath();
          ctx.moveTo(cx + origin.x, cy + origin.y);
          ctx.quadraticCurveTo(cx + radius * 0.12, cy - radius * 0.72, cx + target.x, cy + target.y);
          ctx.strokeStyle = 'rgba(212,175,55,0.46)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      ctx.restore();

      // Rim light and restrained orbital hairline.
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(212,175,55,0.34)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, cy, radius * 1.28, radius * 0.25, -0.22, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(212,175,55,0.17)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); resizeObserver.disconnect(); };
  }, [isVisible]);

  const startDrag = (clientX: number) => {
    dragRef.current = { active: true, x: clientX, rotation: rotationRef.current };
    setDragging(true);
  };
  const moveDrag = (clientX: number) => {
    if (!dragRef.current.active) return;
    rotationRef.current = dragRef.current.rotation + (clientX - dragRef.current.x) * 0.42;
  };
  const stopDrag = () => { dragRef.current.active = false; setDragging(false); };

  return (
    <section
      ref={hostRef}
      id="global-stage"
      className="relative isolate overflow-hidden border-t border-[#d4af37]/15 bg-[#070707] text-white"
      aria-labelledby="global-stage-title"
    >
      <div className="absolute inset-0 -z-10 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 68% 48%, rgba(212,175,55,.075), transparent 42%), linear-gradient(180deg,#080808 0%,#070707 100%)' }} />
      <div className="mx-auto grid min-h-[690px] max-w-[1440px] grid-cols-1 items-center gap-0 px-5 py-20 sm:px-8 lg:min-h-[780px] lg:grid-cols-[0.78fr_1.22fr] lg:px-14 lg:py-16">
        <div className="relative z-10 mx-auto w-full max-w-xl lg:mx-0 lg:py-12">
          <div className="mb-7 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#d4af37] sm:text-xs">
            <span className="h-px w-8 bg-[#d4af37]" />
            <span>WEST MUN · RIYADH 2027</span>
          </div>
          <h2 id="global-stage-title" className="max-w-lg font-serif text-5xl font-light leading-[0.98] tracking-[-0.045em] text-white sm:text-6xl lg:text-[4.7rem]" style={{ fontFamily: 'var(--font-serif)' }}>
            One world.<br />
            <span className="italic text-[#d4af37]">Many perspectives.</span>
          </h2>
          <p className="mt-7 max-w-md text-sm leading-7 text-neutral-400 sm:text-base sm:leading-8">
            Diplomacy begins when we look beyond our own horizon. At WEST MUN, ideas cross borders, perspectives meet, and tomorrow’s solutions begin with a conversation.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-5">
            <a href="#about" className="group inline-flex items-center gap-3 border-b border-[#d4af37]/50 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#f3e5ab] transition-colors hover:border-[#f3e5ab]">
              Discover WEST MUN <ArrowDownRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:translate-y-1" />
            </a>
            <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-neutral-600"><Globe2 className="h-3.5 w-3.5" /> Drag to explore</span>
          </div>
        </div>

        <div
          ref={canvasHostRef}
          className={`relative -mx-3 mt-3 h-[390px] touch-pan-y sm:mx-0 sm:h-[510px] lg:mt-0 lg:h-[680px] ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onPointerDown={(e) => { if (e.button !== 0) return; e.currentTarget.setPointerCapture(e.pointerId); startDrag(e.clientX); }}
          onPointerMove={(e) => moveDrag(e.clientX)}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          onLostPointerCapture={stopDrag}
          role="img"
          aria-label="Interactive gold globe centred on Riyadh, Saudi Arabia. Drag horizontally to rotate."
        >
          <canvas ref={canvasRef} className="absolute inset-0 block" aria-hidden="true" />
          <div className="pointer-events-none absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap text-[9px] uppercase tracking-[0.24em] text-neutral-600 sm:bottom-9">
            <span className="h-px w-7 bg-[#d4af37]/35" /> A global stage, hosted in Riyadh <span className="h-px w-7 bg-[#d4af37]/35" />
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-[#d4af37]/25 to-transparent" />
    </section>
  );
});
DiplomaticGlobe.displayName = 'DiplomaticGlobe';
