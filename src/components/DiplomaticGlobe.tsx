import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, MoveHorizontal, Play, Pause, Compass } from 'lucide-react';
import * as THREE from 'three';

export const DiplomaticGlobe: React.FC = React.memo(() => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const dragRef = useRef({ active: false, x: 0, rotation: 0 });
  const targetRotationRef = useRef<number | null>(null);
  const autoRotateRef = useRef(true);
  const [dragging, setDragging] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    const host = canvasRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer | undefined;
    let frame = 0;
    let disposed = false;
    let group: THREE.Group | undefined;
    let resizeObserver: ResizeObserver | undefined;
    const disposables: Array<THREE.Material | THREE.BufferGeometry | THREE.Texture> = [];

    try {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
      camera.position.set(0, 0, 4.8);

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;outline:none;';
      renderer.domElement.setAttribute('aria-hidden', 'true');
      host.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xffffff, 0.6));

      // Quiet star field: enough depth to read as space, never a glitter effect.
      const starPositions: number[] = [];
      let seed = 27;
      const random = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };
      for (let i = 0; i < 850; i++) {
        const radius = 7 + random() * 15;
        const theta = random() * Math.PI * 2;
        const phi = Math.acos(2 * random() - 1);
        starPositions.push(
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.cos(phi),
          radius * Math.sin(phi) * Math.sin(theta),
        );
      }
      const starGeometry = new THREE.BufferGeometry();
      starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
      const starMaterial = new THREE.PointsMaterial({ color: 0xd9c69b, size: 0.012, transparent: true, opacity: 0.48, sizeAttenuation: true });
      scene.add(new THREE.Points(starGeometry, starMaterial));
      disposables.push(starGeometry, starMaterial);

      group = new THREE.Group();
      scene.add(group);
      groupRef.current = group;

      // Build a graphic globe locally: no satellite imagery, no realistic Earth texture.
      // The equirectangular artwork is deliberately restrained, like a diplomatic atlas.
      const mapCanvas = document.createElement('canvas');
      mapCanvas.width = 1600;
      mapCanvas.height = 800;
      const ctx = mapCanvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      ctx.fillStyle = '#07080b';
      ctx.fillRect(0, 0, mapCanvas.width, mapCanvas.height);

      // Fine cartographic grid.
      ctx.strokeStyle = 'rgba(192, 164, 96, 0.20)';
      ctx.lineWidth = 1;
      for (let lon = 0; lon <= 360; lon += 15) {
        const x = (lon / 360) * mapCanvas.width;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, mapCanvas.height); ctx.stroke();
      }
      for (let lat = 0; lat <= 180; lat += 15) {
        const y = (lat / 180) * mapCanvas.height;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(mapCanvas.width, y); ctx.stroke();
      }

      // Accurate country outlines from the public geo-countries dataset.
      // Draw GeoJSON into the equirectangular canvas so the globe keeps its dark/gold style
      // without relying on hand-drawn continent approximations.
      const drawGeoJson = (geojson: any) => {
        ctx!.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
        ctx!.fillStyle = '#07080b';
        ctx!.fillRect(0, 0, mapCanvas.width, mapCanvas.height);

        const project = (coord: number[]) => ({
          x: ((coord[0] + 180) / 360) * mapCanvas.width,
          y: ((90 - coord[1]) / 180) * mapCanvas.height,
        });

        const drawRing = (ring: number[][]) => {
          if (!ring.length) return;
          ctx!.beginPath();
          ring.forEach((coord, i) => {
            const p = project(coord);
            if (i === 0) ctx!.moveTo(p.x, p.y);
            else ctx!.lineTo(p.x, p.y);
          });
          ctx!.closePath();
          ctx!.fillStyle = 'rgba(201, 173, 104, 0.055)';
          ctx!.fill();
          ctx!.strokeStyle = 'rgba(201, 173, 104, 0.78)';
          ctx!.lineWidth = 1.15;
          ctx!.stroke();
        };

        const drawPolygon = (polygon: number[][][]) => polygon.forEach(drawRing);
        geojson.features?.forEach((feature: any) => {
          const geometry = feature.geometry;
          if (!geometry) return;
          if (geometry.type === 'Polygon') drawPolygon(geometry.coordinates);
          else if (geometry.type === 'MultiPolygon') geometry.coordinates.forEach(drawPolygon);
        });

        // Grid is layered above the map for the fine atlas treatment.
        ctx!.strokeStyle = 'rgba(192, 164, 96, 0.20)';
        ctx!.lineWidth = 1;
        for (let lon = 0; lon <= 360; lon += 15) {
          const x = (lon / 360) * mapCanvas.width;
          ctx!.beginPath(); ctx!.moveTo(x, 0); ctx!.lineTo(x, mapCanvas.height); ctx!.stroke();
        }
        for (let lat = 0; lat <= 180; lat += 15) {
          const y = (lat / 180) * mapCanvas.height;
          ctx!.beginPath(); ctx!.moveTo(0, y); ctx!.lineTo(mapCanvas.width, y); ctx!.stroke();
        }
      };

      // Keep a quick grid visible immediately; replace it with real country boundaries
      // as soon as the GeoJSON loads. Failure leaves the globe functional.
      ctx.strokeStyle = 'rgba(192, 164, 96, 0.20)';
      ctx.lineWidth = 1;
      for (let lon = 0; lon <= 360; lon += 15) {
        const x = (lon / 360) * mapCanvas.width;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, mapCanvas.height); ctx.stroke();
      }
      for (let lat = 0; lat <= 180; lat += 15) {
        const y = (lat / 180) * mapCanvas.height;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(mapCanvas.width, y); ctx.stroke();
      }

      const globeTexture = new THREE.CanvasTexture(mapCanvas);
      globeTexture.colorSpace = THREE.SRGBColorSpace;
      globeTexture.anisotropy = 4;
      const sphereGeometry = new THREE.SphereGeometry(1.28, 96, 96);
      const earthMaterial = new THREE.MeshBasicMaterial({ map: globeTexture, color: '#ffffff' });
      const earth = new THREE.Mesh(sphereGeometry, earthMaterial);
      group.add(earth);
      disposables.push(globeTexture, sphereGeometry, earthMaterial);

      fetch('https://raw.githubusercontent.com/datasets/geo-countries/main/data/countries.geojson')
        .then((response) => {
          if (!response.ok) throw new Error('Country map unavailable');
          return response.json();
        })
        .then((geojson) => {
          if (disposed) return;
          drawGeoJson(geojson);
          globeTexture.needsUpdate = true;
        })
        .catch(() => {
          // Keep the initial atlas grid rather than breaking the interactive globe.
        });

      // A thin monochrome atmospheric edge, not a blue realistic-planet glow.
      const atmosphereMaterial = new THREE.ShaderMaterial({
        uniforms: { rimColor: { value: new THREE.Color('#bda15d') } },
        vertexShader: `varying vec3 vNormal; varying vec3 vViewPosition; void main(){ vec4 mvPosition = modelViewMatrix * vec4(position,1.0); vNormal = normalize(normalMatrix * normal); vViewPosition = -mvPosition.xyz; gl_Position = projectionMatrix * mvPosition; }`,
        fragmentShader: `uniform vec3 rimColor; varying vec3 vNormal; varying vec3 vViewPosition; void main(){ float rim=pow(1.0-max(dot(normalize(vNormal),normalize(vViewPosition)),0.0),2.5); gl_FragColor=vec4(rimColor,rim*0.24); }`,
        transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.34, 64, 64), atmosphereMaterial);
      group.add(atmosphere);
      disposables.push(atmosphere.geometry, atmosphereMaterial);

      // Riyadh locator placed on the surface; rotates with the planet.
      const lat = THREE.MathUtils.degToRad(24.7136);
      const lon = THREE.MathUtils.degToRad(46.6753);
      const marker = new THREE.Group();
      marker.position.set(
        -1.292 * Math.cos(lat) * Math.cos(lon),
        1.292 * Math.sin(lat),
        1.292 * Math.cos(lat) * Math.sin(lon),
      );
      marker.lookAt(marker.position.clone().multiplyScalar(2));
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 16), new THREE.MeshBasicMaterial({ color: '#f8e6a8' }));
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.044, 0.0025, 8, 40), new THREE.MeshBasicMaterial({ color: '#e2bd63', transparent: true, opacity: 0.9 }));
      marker.add(dot, halo);
      group.add(marker);
      disposables.push(dot.geometry, dot.material, halo.geometry, halo.material);

      const resize = () => {
        if (!renderer || !host) return;
        const width = Math.max(1, host.clientWidth);
        const height = Math.max(1, host.clientHeight);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.position.z = width < 560 ? 5.45 : width < 900 ? 5.05 : 4.55;
        camera.updateProjectionMatrix();
      };
      resize();
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);

      const animate = () => {
        if (disposed || !renderer || !group) return;
        frame = requestAnimationFrame(animate);
        if (!dragRef.current.active) {
          if (targetRotationRef.current !== null) {
            const delta = targetRotationRef.current - group.rotation.y;
            group.rotation.y += delta * 0.055;
            if (Math.abs(delta) < 0.001) { group.rotation.y = targetRotationRef.current; targetRotationRef.current = null; }
          } else if (autoRotateRef.current) group.rotation.y += 0.00055;
        }
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
      disposables.forEach((item) => item.dispose());
      groupRef.current = null;
    };
  }, []);

  const startDrag = (clientX: number) => {
    targetRotationRef.current = null;
    dragRef.current = { active: true, x: clientX, rotation: groupRef.current?.rotation.y ?? 0 };
    setDragging(true);
  };
  const moveDrag = (clientX: number) => {
    if (!dragRef.current.active || !groupRef.current) return;
    groupRef.current.rotation.y = dragRef.current.rotation + (clientX - dragRef.current.x) * 0.006;
  };
  const stopDrag = () => {
    dragRef.current.active = false;
    setDragging(false);
  };
  const resetGlobe = () => {
    targetRotationRef.current = 0;
    setSelectedRegion('');
  };

  const toggleAutoRotate = () => {
    const next = !autoRotate;
    autoRotateRef.current = next;
    setAutoRotate(next);
  };

  const focusRegion = (name: string, rotation: number) => {
    targetRotationRef.current = rotation;
    autoRotateRef.current = false;
    setAutoRotate(false);
    setSelectedRegion(name);
  };

  return (
    <section id="global-stage" className="relative isolate min-h-[760px] overflow-hidden border-y border-white/[0.07] bg-[#050608] text-white lg:min-h-[840px]" aria-labelledby="global-stage-title">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 68% 48%, rgba(44,73,104,.23), transparent 33%), radial-gradient(circle at 74% 68%, rgba(176,133,51,.08), transparent 28%)' }} />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/25 to-transparent" />
      </div>

      <div className="relative mx-auto grid min-h-[760px] max-w-[1440px] grid-cols-1 items-center px-6 pb-14 pt-20 sm:px-10 lg:min-h-[840px] lg:grid-cols-[0.82fr_1.18fr] lg:px-16 lg:py-16">
        <div className="relative z-10 mx-auto w-full max-w-[490px] text-center lg:mx-0 lg:text-left">
          <div className="mb-7 inline-flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.32em] text-[#d7b45b] sm:text-[11px]">
            <span className="h-px w-8 bg-[#d7b45b]/70" />
            The global stage
          </div>
          <h2 id="global-stage-title" className="font-serif text-[clamp(3.2rem,6vw,6.2rem)] font-light leading-[0.88] tracking-[-0.055em] text-[#f4f1e9]" style={{ fontFamily: 'var(--font-serif)' }}>
            One world.<br />
            <span className="italic text-[#d7b45b]">Many voices.</span>
          </h2>
          <p className="mx-auto mt-7 max-w-[360px] text-[13px] leading-7 text-[#a7a9ad] sm:text-sm lg:mx-0">
            Every nation brings a perspective. Every conversation can shape what comes next.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
            <div className="flex items-center gap-3 border-l border-[#d7b45b]/60 pl-4 text-left">
              <span className="text-[11px] uppercase tracking-[0.18em] text-[#f1e3bd]">Riyadh</span>
              <span className="text-[10px] tracking-[0.08em] text-[#74777c]">24.7136° N / 46.6753° E</span>
            </div>
          </div>
          <div className="mt-10 flex items-center justify-center gap-3 text-[9px] uppercase tracking-[0.22em] text-[#777a80] lg:justify-start">
            <MoveHorizontal className="h-3.5 w-3.5 text-[#d7b45b]" strokeWidth={1.5} />
            Drag to rotate
          </div>
        </div>

        <div className="relative mx-auto mt-[-8px] h-[390px] w-full max-w-[680px] sm:h-[500px] lg:mt-0 lg:h-[660px] lg:max-w-none">
          <svg className="pointer-events-none absolute inset-[-7%] h-[114%] w-[114%] opacity-70" viewBox="0 0 800 800" fill="none" aria-hidden="true">
            <ellipse cx="400" cy="400" rx="335" ry="128" stroke="rgba(215,180,91,.34)" strokeWidth="0.8" transform="rotate(-24 400 400)" />
            <ellipse cx="400" cy="400" rx="304" ry="112" stroke="rgba(215,180,91,.12)" strokeWidth="0.8" transform="rotate(19 400 400)" />
            <circle cx="112" cy="257" r="2.5" fill="#e4c775" />
            <circle cx="685" cy="520" r="2" fill="#e4c775" />
          </svg>
          <div
            ref={canvasRef}
            className={`absolute inset-0 z-[1] touch-pan-y ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            onPointerDown={(e) => { if (e.button !== 0) return; e.currentTarget.setPointerCapture(e.pointerId); startDrag(e.clientX); }}
            onPointerMove={(e) => moveDrag(e.clientX)}
            onPointerUp={stopDrag}
            onPointerCancel={stopDrag}
            onLostPointerCapture={stopDrag}
            role="img"
            aria-label="Interactive dark cartographic globe with fine gold continent outlines. Drag horizontally to rotate it."
          >
            {webglFailed && <div className="absolute inset-0 grid place-items-center px-8 text-center text-sm text-neutral-400">The globe could not load in this browser.</div>}
          </div>
          <div className="pointer-events-none absolute bottom-[8%] right-[2%] z-10 hidden border-l border-[#d7b45b]/50 pl-3 text-left sm:block">
            <div className="text-[9px] uppercase tracking-[0.24em] text-[#d7b45b]">WEST MUN</div>
            <div className="mt-1 text-[10px] tracking-[0.12em] text-white/55">RIYADH · 2027</div>
          </div>
          <button type="button" onClick={resetGlobe} className="absolute right-2 top-[8%] z-10 inline-flex items-center gap-2 border border-white/15 bg-black/35 px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-white/65 backdrop-blur-md transition-colors hover:border-[#d7b45b]/60 hover:text-[#f3e5ab]" aria-label="Reset globe rotation">
            <RotateCcw className="h-3 w-3" /> Reset view
          </button>
          <div className="absolute right-2 top-[17%] z-10 flex items-center gap-1 border border-white/10 bg-black/45 p-1 backdrop-blur-md">
            <button type="button" onClick={toggleAutoRotate} className="inline-flex items-center gap-2 px-2.5 py-2 text-[9px] uppercase tracking-[0.13em] text-white/70 hover:text-[#f3e5ab]" aria-label={autoRotate ? 'Pause automatic rotation' : 'Resume automatic rotation'}>
              {autoRotate ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              <span>{autoRotate ? 'Pause' : 'Auto rotate'}</span>
            </button>
          </div>
          <div className="absolute bottom-2 left-1/2 z-10 w-[min(96%,440px)] -translate-x-1/2 border border-white/10 bg-[#08090c]/85 p-3 backdrop-blur-xl sm:bottom-[4%] sm:left-auto sm:right-2 sm:w-[210px] sm:translate-x-0">
            <div className="mb-2 flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-[#d7b45b]"><Compass className="h-3 w-3" /> Explore the world</div>
            <div className="grid grid-cols-4 gap-1 sm:grid-cols-2">
              {[{ name: 'Americas', rotation: 1.35 }, { name: 'Europe', rotation: 0.25 }, { name: 'Africa', rotation: -0.35 }, { name: 'Asia', rotation: -1.55 }].map((region) => (
                <button key={region.name} type="button" onClick={() => focusRegion(region.name, region.rotation)} className={'border px-2 py-2 text-[9px] uppercase tracking-[0.12em] transition-all ' + (selectedRegion === region.name ? 'border-[#d7b45b]/70 bg-[#d7b45b]/10 text-[#f3e5ab]' : 'border-white/10 text-white/55 hover:border-[#d7b45b]/40 hover:text-white')}>
                  {region.name}
                </button>
              ))}
            </div>
            <div className="mt-2 text-[9px] leading-4 text-white/40">{selectedRegion ? 'Viewing ' + selectedRegion + ' · drag to explore nearby' : 'Choose a region or drag the globe to explore'}</div>
          </div>
        </div>
      </div>
    </section>
  );
});
DiplomaticGlobe.displayName = 'DiplomaticGlobe';
