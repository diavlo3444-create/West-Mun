import React, { useEffect, useRef, useState } from 'react';
import { ArrowDownRight, Globe2, RotateCcw } from 'lucide-react';
import * as THREE from 'three';

const EARTH_TEXTURES = {
  surface: 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',
  normal: 'https://threejs.org/examples/textures/planets/earth_normal_2048.jpg',
  specular: 'https://threejs.org/examples/textures/planets/earth_specular_2048.jpg',
  clouds: 'https://threejs.org/examples/textures/planets/earth_clouds_1024.png',
  lights: 'https://threejs.org/examples/textures/planets/earth_lights_2048.png',
};

function surfacePoint(lat: number, lon: number, radius: number) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

export const DiplomaticGlobe: React.FC = React.memo(() => {
  const hostRef = useRef<HTMLElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{ renderer: THREE.WebGLRenderer; group: THREE.Group } | null>(null);
  const dragRef = useRef({ active: false, x: 0, rotation: 0 });
  const [dragging, setDragging] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);
  const visibleRef = useRef(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting;
    }, { threshold: 0.01 });
    observer.observe(host);
    return (
    <section
      ref={hostRef}
      id="global-stage"
      className="relative isolate overflow-hidden border-y border-[#d4af37]/15 bg-[#050505] text-white"
      aria-labelledby="global-stage-title"
    >
      <div className="pointer-events-none absolute inset-0 -z-10" style={{ background: 'radial-gradient(ellipse at 50% 52%, rgba(132,91,24,.13), transparent 38%), linear-gradient(180deg,#050505 0%,#080807 52%,#050505 100%)' }} />
      <div className="mx-auto flex min-h-[660px] max-w-[1240px] flex-col items-center px-5 pb-12 pt-16 text-center sm:px-8 sm:pt-20">
        <div className="mb-5 flex items-center justify-center gap-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-[#d4af37] sm:text-[11px]">
          <span className="h-px w-7 bg-[#d4af37]/70" />
          WEST MUN · RIYADH 2027
          <span className="h-px w-7 bg-[#d4af37]/70" />
        </div>
        <h2 id="global-stage-title" className="font-serif text-4xl font-light leading-none tracking-[-0.045em] text-white sm:text-5xl lg:text-6xl" style={{ fontFamily: 'var(--font-serif)' }}>
          A world of <span className="italic text-[#d4af37]">perspectives.</span>
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-6 text-neutral-400 sm:text-base">
          One planet. Different nations. A shared future.
        </p>

        <div
          ref={canvasHostRef}
          className={`relative mt-2 h-[330px] w-full max-w-[660px] touch-pan-y sm:h-[390px] lg:h-[440px] ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onPointerDown={(e) => { if (e.button !== 0) return; e.currentTarget.setPointerCapture(e.pointerId); startDrag(e.clientX); }}
          onPointerMove={(e) => moveDrag(e.clientX)}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          onLostPointerCapture={stopDrag}
          role="img"
          aria-label="Interactive realistic Earth with gold-toned continents and a marker at Riyadh. Drag horizontally to rotate."
        >
          {webglFailed && <div className="absolute inset-0 grid place-items-center text-sm text-neutral-400">Your browser could not start the 3D globe.</div>}
          <div className="pointer-events-none absolute left-1/2 top-5 z-10 -translate-x-1/2 whitespace-nowrap text-[9px] uppercase tracking-[0.24em] text-neutral-500">
            Interactive Earth <span className="mx-2 text-[#d4af37]/60">/</span> Drag to rotate
          </div>
          <div className="pointer-events-none absolute bottom-5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e5c16c]">Riyadh, Saudi Arabia</div>
            <div className="mt-1 text-[9px] tracking-[0.12em] text-neutral-500">24.7136° N · 46.6753° E</div>
          </div>
          <button type="button" onClick={(e) => { e.stopPropagation(); resetGlobe(); }} className="absolute right-3 top-5 z-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-neutral-400 backdrop-blur-sm transition-colors hover:border-[#d4af37]/50 hover:text-[#f3e5ab]" aria-label="Reset globe rotation">
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>

        <div className="mt-1 grid w-full max-w-2xl grid-cols-3 divide-x divide-[#d4af37]/20 border-y border-[#d4af37]/20 py-5">
          <div className="px-2">
            <div className="font-serif text-2xl font-light text-[#e2bd63] sm:text-3xl">7</div>
            <div className="mt-1 text-[9px] uppercase tracking-[0.18em] text-neutral-500 sm:text-[10px]">Continents</div>
          </div>
          <div className="px-2">
            <div className="font-serif text-2xl font-light text-[#e2bd63] sm:text-3xl">195</div>
            <div className="mt-1 text-[9px] uppercase tracking-[0.18em] text-neutral-500 sm:text-[10px]">Countries*</div>
          </div>
          <div className="px-2">
            <div className="font-serif text-2xl font-light text-[#e2bd63] sm:text-3xl">1</div>
            <div className="mt-1 text-[9px] uppercase tracking-[0.18em] text-neutral-500 sm:text-[10px]">Shared planet</div>
          </div>
        </div>
        <p className="mt-3 text-[9px] tracking-wide text-neutral-600">*Commonly counted as 193 UN member states and 2 UN observer states.</p>
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-[#d4af37]/30 to-transparent" />
    </section>
  );
});
DiplomaticGlobe.displayName = 'DiplomaticGlobe';
