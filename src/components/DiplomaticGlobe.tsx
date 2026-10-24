import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import * as THREE from 'three';

const EARTH_TEXTURES = {
  surface: 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',
  normal: 'https://threejs.org/examples/textures/planets/earth_normal_2048.jpg',
  clouds: 'https://threejs.org/examples/textures/planets/earth_clouds_1024.png',
};

export const DiplomaticGlobe: React.FC = React.memo(() => {
  const hostRef = useRef<HTMLElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const dragRef = useRef({ active: false, x: 0, rotation: 0 });
  const [dragging, setDragging] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    let frame = 0;
    let disposed = false;
    let earth: THREE.Mesh;
    let clouds: THREE.Mesh | null = null;
    let group: THREE.Group;
    let resizeObserver: ResizeObserver | undefined;

    try {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      camera.position.z = 4.1;
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setClearColor(0x000000, 0);
      host.appendChild(renderer.domElement);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';

      scene.add(new THREE.AmbientLight(0xffffff, 1.35));
      const keyLight = new THREE.DirectionalLight(0xffd782, 2.4);
      keyLight.position.set(-3, 1.5, 4);
      scene.add(keyLight);
      const rimLight = new THREE.DirectionalLight(0x6485a7, 0.75);
      rimLight.position.set(3, -1, -2);
      scene.add(rimLight);

      group = new THREE.Group();
      scene.add(group);
      groupRef.current = group;

      const loader = new THREE.TextureLoader();
      loader.load(EARTH_TEXTURES.surface, (texture) => {
        if (disposed) { texture.dispose(); return; }
        texture.colorSpace = THREE.SRGBColorSpace;
        const material = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.96,
          metalness: 0.02,
          color: new THREE.Color('#c5a15b'),
        });
        earth.material = material;
        material.onBeforeCompile = (shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            `#include <color_fragment>
             float landLight = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
             diffuseColor.rgb *= vec3(1.12, 0.91, 0.61);
             diffuseColor.rgb = mix(vec3(0.025, 0.035, 0.045), diffuseColor.rgb, smoothstep(0.08, 0.27, landLight));`
          );
        };
        material.needsUpdate = true;
      }, undefined, () => setWebglFailed(true));

      const geometry = new THREE.SphereGeometry(1.15, 64, 64);
      earth = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#b99855', roughness: 1 }));
      group.add(earth);

      loader.load(EARTH_TEXTURES.normal, (texture) => {
        if (disposed) { texture.dispose(); return; }
        const material = earth.material as THREE.MeshStandardMaterial;
        material.normalMap = texture;
        material.normalScale = new THREE.Vector2(0.35, 0.35);
        material.needsUpdate = true;
      });
      loader.load(EARTH_TEXTURES.clouds, (texture) => {
        if (disposed) { texture.dispose(); return; }
        const material = new THREE.MeshStandardMaterial({
          map: texture,
          transparent: true,
          opacity: 0.10,
          depthWrite: false,
          color: '#d6c69d',
        });
        clouds = new THREE.Mesh(new THREE.SphereGeometry(1.17, 48, 48), material);
        group.add(clouds);
      });

      const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(1.22, 48, 48),
        new THREE.MeshBasicMaterial({ color: '#b88a36', transparent: true, opacity: 0.11, side: THREE.BackSide })
      );
      group.add(atmosphere);

      const markerGeometry = new THREE.SphereGeometry(0.025, 12, 12);
      const marker = new THREE.Mesh(markerGeometry, new THREE.MeshBasicMaterial({ color: '#fff0b0' }));
      const lat = THREE.MathUtils.degToRad(24.7136);
      const lon = THREE.MathUtils.degToRad(46.6753);
      marker.position.set(
        -1.165 * Math.cos(lat) * Math.cos(lon),
        1.165 * Math.sin(lat),
        1.165 * Math.cos(lat) * Math.sin(lon),
      );
      group.add(marker);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.055, 0.003, 8, 32),
        new THREE.MeshBasicMaterial({ color: '#e5c16c', transparent: true, opacity: 0.9 })
      );
      ring.position.copy(marker.position);
      ring.lookAt(marker.position.clone().multiplyScalar(2));
      group.add(ring);

      const resize = () => {
        if (!host || !renderer) return;
        const width = Math.max(host.clientWidth, 1);
        const height = Math.max(host.clientHeight, 1);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      resize();
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);

      const animate = () => {
        if (disposed) return;
        frame = requestAnimationFrame(animate);
        if (!dragRef.current.active) group.rotation.y += 0.00065;
        if (clouds) clouds.rotation.y += 0.00015;
        renderer.render(scene, camera);
      };
      animate();
    } catch {
      setWebglFailed(true);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
      groupRef.current = null;
    };
  }, []);

  const startDrag = (clientX: number) => {
    dragRef.current = { active: true, x: clientX, rotation: groupRef.current?.rotation.y ?? 0 };
    setDragging(true);
  };
  const moveDrag = (clientX: number) => {
    if (!dragRef.current.active || !groupRef.current) return;
    groupRef.current.rotation.y = dragRef.current.rotation + (clientX - dragRef.current.x) * 0.008;
  };
  const stopDrag = () => {
    dragRef.current.active = false;
    setDragging(false);
  };
  const resetGlobe = () => {
    if (groupRef.current) groupRef.current.rotation.set(0, 0, 0);
  };

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
        <p className="mt-4 max-w-xl text-sm leading-6 text-neutral-400 sm:text-base">One planet. Different nations. A shared future.</p>
        <div
          ref={canvasHostRef}
          className={`relative mt-2 h-[330px] w-full max-w-[660px] touch-pan-y sm:h-[390px] lg:h-[440px] ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onPointerDown={(e) => { if (e.button !== 0) return; e.currentTarget.setPointerCapture(e.pointerId); startDrag(e.clientX); }}
          onPointerMove={(e) => moveDrag(e.clientX)}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          onLostPointerCapture={stopDrag}
          role="img"
          aria-label="Interactive Earth with gold-toned continents and a marker at Riyadh. Drag horizontally to rotate."
        >
          {webglFailed && <div className="absolute inset-0 z-20 grid place-items-center text-sm text-neutral-400">The 3D globe could not load in this browser.</div>}
          <div className="pointer-events-none absolute left-1/2 top-5 z-10 -translate-x-1/2 whitespace-nowrap text-[9px] uppercase tracking-[0.24em] text-neutral-500">Interactive Earth <span className="mx-2 text-[#d4af37]/60">/</span> Drag to rotate</div>
          <div className="pointer-events-none absolute bottom-5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e5c16c]">Riyadh, Saudi Arabia</div>
            <div className="mt-1 text-[9px] tracking-[0.12em] text-neutral-500">24.7136° N · 46.6753° E</div>
          </div>
          <button type="button" onClick={(e) => { e.stopPropagation(); resetGlobe(); }} className="absolute right-3 top-5 z-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-neutral-400 backdrop-blur-sm transition-colors hover:border-[#d4af37]/50 hover:text-[#f3e5ab]" aria-label="Reset globe rotation">
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>
        <div className="mt-1 grid w-full max-w-2xl grid-cols-3 divide-x divide-[#d4af37]/20 border-y border-[#d4af37]/20 py-5">
          <div className="px-2"><div className="font-serif text-2xl font-light text-[#e2bd63] sm:text-3xl">7</div><div className="mt-1 text-[9px] uppercase tracking-[0.18em] text-neutral-500 sm:text-[10px]">Continents</div></div>
          <div className="px-2"><div className="font-serif text-2xl font-light text-[#e2bd63] sm:text-3xl">195</div><div className="mt-1 text-[9px] uppercase tracking-[0.18em] text-neutral-500 sm:text-[10px]">Countries*</div></div>
          <div className="px-2"><div className="font-serif text-2xl font-light text-[#e2bd63] sm:text-3xl">1</div><div className="mt-1 text-[9px] uppercase tracking-[0.18em] text-neutral-500 sm:text-[10px]">Shared planet</div></div>
        </div>
        <p className="mt-3 text-[9px] tracking-wide text-neutral-600">*Commonly counted as 193 UN member states and 2 UN observer states.</p>
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-[#d4af37]/30 to-transparent" />
    </section>
  );
});
DiplomaticGlobe.displayName = 'DiplomaticGlobe';
