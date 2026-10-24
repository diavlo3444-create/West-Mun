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
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { threshold: 0.01 });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch {
      setWebglFailed(true);
      return;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 600 ? 1.35 : 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.domElement.className = 'absolute inset-0 block h-full w-full';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0, 4.65);
    const world = new THREE.Group();
    scene.add(world);

    // Quiet star field: a little depth, never a noisy particle storm.
    const starPositions = new Float32Array(950 * 3);
    let seed = 2027;
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (let i = 0; i < 950; i++) {
      const radius = 7 + random() * 18;
      const theta = random() * Math.PI * 2;
      const z = random() * 2 - 1;
      const planar = Math.sqrt(1 - z * z);
      starPositions[i * 3] = radius * planar * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * z;
      starPositions[i * 3 + 2] = radius * planar * Math.sin(theta);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({
      color: 0xd7cba5, size: 0.025, transparent: true, opacity: 0.65, sizeAttenuation: true,
    }));
    scene.add(stars);

    scene.add(new THREE.AmbientLight(0x71809a, 1.05));
    const sun = new THREE.DirectionalLight(0xfff1d1, 3.15);
    sun.position.set(-4.5, 2.2, 5);
    scene.add(sun);
    const goldRim = new THREE.DirectionalLight(0xc69b42, 1.4);
    goldRim.position.set(4, -1, -4);
    scene.add(goldRim);

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    const loadTexture = (url: string) => loader.load(url, undefined, undefined, () => {});
    const earthMap = loadTexture(EARTH_TEXTURES.surface);
    earthMap.colorSpace = THREE.SRGBColorSpace;
    const normalMap = loadTexture(EARTH_TEXTURES.normal);
    const specularMap = loadTexture(EARTH_TEXTURES.specular);
    const lightsMap = loadTexture(EARTH_TEXTURES.lights);
    lightsMap.colorSpace = THREE.SRGBColorSpace;
    const cloudMap = loadTexture(EARTH_TEXTURES.clouds);
    cloudMap.colorSpace = THREE.SRGBColorSpace;

    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(1.25, 96, 96),
      new THREE.MeshPhongMaterial({
        map: earthMap,
        normalMap,
        normalScale: new THREE.Vector2(0.32, 0.32),
        specularMap,
        specular: new THREE.Color(0x68778a),
        shininess: 14,
        emissiveMap: lightsMap,
        emissive: new THREE.Color(0xc49a48),
        emissiveIntensity: 0.34,
      }),
    );
    world.add(earth);

    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(1.263, 72, 72),
      new THREE.MeshPhongMaterial({
        map: cloudMap,
        transparent: true,
        opacity: 0.23,
        depthWrite: false,
        blending: THREE.NormalBlending,
        color: 0xe5e8ed,
      }),
    );
    world.add(clouds);

    // Thin atmospheric shell with a blue-white edge and a restrained gold rim.
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.31, 72, 72),
      new THREE.ShaderMaterial({
        vertexShader: `varying vec3 vNormal; varying vec3 vViewPosition; void main(){ vec4 mvPosition=modelViewMatrix*vec4(position,1.0); vNormal=normalize(normalMatrix*normal); vViewPosition=-mvPosition.xyz; gl_Position=projectionMatrix*mvPosition; }`,
        fragmentShader: `varying vec3 vNormal; varying vec3 vViewPosition; void main(){ float rim=pow(1.0-max(dot(normalize(vNormal),normalize(vViewPosition)),0.0),2.35); vec3 blue=vec3(0.20,0.48,0.78); vec3 gold=vec3(0.72,0.49,0.17); float edge=smoothstep(0.25,0.95,rim); gl_FragColor=vec4(mix(blue,gold,edge*0.42),rim*0.62); }`,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    );
    world.add(atmosphere);

    // Riyadh marker and a restrained route arc to Paris, used as a visual metaphor—not a claimed partnership.
    const riyadh = surfacePoint(24.7136, 46.6753, 1.272);
    const marker = new THREE.Group();
    marker.position.copy(riyadh);
    marker.lookAt(riyadh.clone().multiplyScalar(2));
    const markerCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffe6a0 }),
    );
    marker.add(markerCore);
    const markerRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.045, 0.0035, 8, 36),
      new THREE.MeshBasicMaterial({ color: 0xd4af37, transparent: true, opacity: 0.95 }),
    );
    marker.add(markerRing);
    world.add(marker);

    const paris = surfacePoint(48.8566, 2.3522, 1.272);
    const arcMid = riyadh.clone().add(paris).normalize().multiplyScalar(1.67);
    const arc = new THREE.QuadraticBezierCurve3(riyadh, arcMid, paris);
    const arcLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(arc.getPoints(64)),
      new THREE.LineBasicMaterial({ color: 0xd4af37, transparent: true, opacity: 0.52 }),
    );
    world.add(arcLine);

    sceneRef.current = { renderer, group: world };
    let raf = 0;
    let last = 0;
    let width = 1;
    let height = 1;
    let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotionChange = (event: MediaQueryListEvent) => { reducedMotion = event.matches; };
    motionQuery.addEventListener('change', onMotionChange);

    const resize = () => {
      width = Math.max(1, host.clientWidth);
      height = Math.max(1, host.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 600 ? 1.25 : 1.6));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.fov = width < 600 ? 39 : 34;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      if (!isVisible || document.hidden) { last = 0; return; }
      const dt = last ? Math.min(0.04, (now - last) / 1000) : 0.016;
      last = now;
      if (!dragRef.current.active && !reducedMotion) world.rotation.y += dt * 0.055;
      clouds.rotation.y += dt * 0.012;

      // Scroll gently pushes the Earth forward, then eases back—cinematic but never hijacks page scroll.
      const rect = host.getBoundingClientRect();
      const viewport = Math.max(1, window.innerHeight);
      const progress = THREE.MathUtils.clamp((viewport - rect.top) / (viewport + rect.height), 0, 1);
      const scrollScale = reducedMotion ? 1 : 0.94 + Math.sin(progress * Math.PI) * 0.075;
      world.scale.setScalar(scrollScale);
      world.rotation.x = THREE.MathUtils.lerp(world.rotation.x, reducedMotion ? -0.04 : -0.04 + Math.sin(progress * Math.PI) * 0.045, 0.035);
      stars.rotation.y += reducedMotion ? 0 : dt * 0.0015;
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      motionQuery.removeEventListener('change', onMotionChange);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
          object.geometry.dispose();
          const material = object.material;
          (Array.isArray(material) ? material : [material]).forEach((entry) => entry.dispose());
        }
      });
      [earthMap, normalMap, specularMap, lightsMap, cloudMap].forEach((texture) => texture.dispose());
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
    };
  }, [isVisible]);

  const startDrag = (clientX: number) => {
    if (!sceneRef.current) return;
    dragRef.current = { active: true, x: clientX, rotation: sceneRef.current.group.rotation.y };
    setDragging(true);
  };
  const moveDrag = (clientX: number) => {
    if (!dragRef.current.active || !sceneRef.current) return;
    sceneRef.current.group.rotation.y = dragRef.current.rotation + (clientX - dragRef.current.x) * 0.006;
  };
  const stopDrag = () => { dragRef.current.active = false; setDragging(false); };
  const resetGlobe = () => {
    if (sceneRef.current) sceneRef.current.group.rotation.set(-0.04, 0, 0);
  };

  return (
    <section
      ref={hostRef}
      id="global-stage"
      className="relative isolate overflow-hidden border-t border-[#d4af37]/15 bg-[#05070a] text-white"
      aria-labelledby="global-stage-title"
    >
      <div className="pointer-events-none absolute inset-0 -z-10" style={{ background: 'radial-gradient(ellipse at 70% 45%, rgba(37,68,104,.16), transparent 43%), radial-gradient(ellipse at 70% 62%, rgba(212,175,55,.055), transparent 38%), linear-gradient(180deg,#07090d 0%,#05070a 100%)' }} />
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
          aria-label="Realistic interactive Earth with cloud cover, atmosphere, and a gold marker on Riyadh. Drag horizontally to rotate."
        >
          {webglFailed && <div className="absolute inset-0 grid place-items-center text-sm text-neutral-400">Your browser could not start the 3D globe.</div>}
          <div className="pointer-events-none absolute left-5 top-6 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[9px] uppercase tracking-[0.2em] text-neutral-300 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37] shadow-[0_0_10px_#d4af37]" /> Earth · Live 3D
          </div>
          <div className="absolute bottom-8 left-5 z-10 flex items-center gap-3">
            <div className="h-9 w-px bg-gradient-to-b from-[#f3e5ab] to-transparent" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#f3e5ab]">Riyadh, Saudi Arabia</div>
              <div className="mt-1 text-[9px] tracking-[0.12em] text-neutral-500">24.7136° N · 46.6753° E</div>
            </div>
          </div>
          <button type="button" onClick={(e) => { e.stopPropagation(); resetGlobe(); }} className="absolute right-5 top-6 z-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-neutral-300 backdrop-blur-sm transition-colors hover:border-[#d4af37]/50 hover:text-[#f3e5ab]" aria-label="Reset globe rotation">
            <RotateCcw className="h-3 w-3" /> Reset view
          </button>
          <div className="pointer-events-none absolute bottom-8 right-5 z-10 hidden items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-neutral-600 sm:flex">
            <span className="h-px w-6 bg-[#d4af37]/35" /> A global stage, hosted in Riyadh
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-[#d4af37]/25 to-transparent" />
    </section>
  );
});
DiplomaticGlobe.displayName = 'DiplomaticGlobe';
