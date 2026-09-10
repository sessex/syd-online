'use client';

import { useEffect, useRef, useState } from 'react';
import type * as Three from 'three';
import { createPixelScene } from './pixel-scene';
import { fragmentShader, vertexShader } from './shaders';
import styles from './hero.module.css';

type Playback = {
  paused: boolean;
  reduced: boolean;
  visible: boolean;
  onScreen: boolean;
};

export default function PixelBackground() {
  const container = useRef<HTMLDivElement>(null);
  const playback = useRef<Playback>({ paused: false, reduced: true, visible: true, onScreen: true });
  const wake = useRef<() => void>(() => {});
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const host = container.current;
    const hero = host?.parentElement;
    if (!host || !hero) return;

    const { landscape, clouds } = createPixelScene();
    const fallback = document.createElement('canvas');
    fallback.className = `${styles.surface} ${styles.fallback}`;
    const fallbackContext = fallback.getContext('2d');
    function paintFallback() {
      const { width, height } = host!.getBoundingClientRect();
      const scale = Math.min(1, 800 / Math.max(width, height));
      fallback.width = Math.max(1, Math.round(width * scale));
      fallback.height = Math.max(1, Math.round(height * scale));
      if (!fallbackContext) return;
      const inset = Math.max(1, Math.min(16, Math.max(7, width * .011)) * scale);
      fallbackContext.fillStyle = '#ff20b4';
      fallbackContext.fillRect(0, 0, fallback.width, fallback.height);
      fallbackContext.imageSmoothingEnabled = false;
      const cropWidth = landscape.width * Math.min(1, (width / height) / (4 / 3));
      for (const plate of [landscape, clouds]) {
        fallbackContext.drawImage(plate, (landscape.width - cropWidth) / 2, 0, cropWidth, landscape.height,
          inset, inset, fallback.width - inset * 2, fallback.height - inset * 2);
      }
    }
    paintFallback();
    host.appendChild(fallback);
    host.dataset.renderer = 'canvas';

    let disposed = false;
    let frame = 0;
    let lastFrame = 0;
    let elapsed = 0;
    let renderer: Three.WebGLRenderer | undefined;
    let material: Three.ShaderMaterial | undefined;
    let geometry: Three.PlaneGeometry | undefined;
    let textures: Three.CanvasTexture[] = [];
    let contextLost = false;
    let renderFailed = false;
    const pointer = { x: .5, y: .5, hover: 0 };
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    playback.current.reduced = motion.matches;
    playback.current.visible = !document.hidden;

    const active = () => {
      const p = playback.current;
      return !disposed && !contextLost && !renderFailed && !p.paused && !p.reduced && p.visible && p.onScreen;
    };

    function restart() {
      cancelAnimationFrame(frame);
      lastFrame = 0;
      wake.current();
    }
    function onMotionChange() {
      playback.current.reduced = motion.matches;
      // Reduced motion is a stable composition, including pointer response.
      pointer.hover = 0;
      if (material && motion.matches) {
        material.uniforms.uHover.value = 0;
        material.uniforms.uTime.value = 0;
      }
      restart();
    }
    function onVisibilityChange() {
      playback.current.visible = !document.hidden;
      restart();
    }
    function onPointerMove(event: PointerEvent) {
      if (event.pointerType === 'touch' || !active()) return;
      const bounds = hero!.getBoundingClientRect();
      pointer.x = (event.clientX - bounds.left) / bounds.width;
      pointer.y = (event.clientY - bounds.top) / bounds.height;
      pointer.hover = 1;
    }
    function onPointerLeave() { pointer.hover = 0; }
    function onContextLost(event: Event) {
      event.preventDefault();
      contextLost = true;
      cancelAnimationFrame(frame);
      fallback.style.visibility = 'visible';
      host!.dataset.renderer = 'canvas';
      host!.dataset.motion = 'still';
      if (renderer) renderer.domElement.style.visibility = 'hidden';
    }
    function onContextRestored() {
      contextLost = false;
      renderFailed = false;
      if (renderer) renderer.domElement.style.visibility = 'visible';
      restart();
    }

    const observer = new IntersectionObserver(([entry]) => {
      playback.current.onScreen = entry.isIntersecting;
      restart();
    }, { threshold: 0 });
    observer.observe(hero);
    motion.addEventListener('change', onMotionChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    hero.addEventListener('pointermove', onPointerMove, { passive: true });
    hero.addEventListener('pointerleave', onPointerLeave);
    const resizeObserver = new ResizeObserver(() => {
      paintFallback();
      if (renderer && material) {
        const { width, height } = host.getBoundingClientRect();
        const scale = Math.min(1, 1600 / width);
        renderer.setSize(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)), false);
        material.uniforms.uResolution.value.set(width, height);
        restart();
      }
    });
    resizeObserver.observe(host);

    function showFallback() {
      renderFailed = true;
      cancelAnimationFrame(frame);
      if (renderer) renderer.domElement.style.visibility = 'hidden';
      fallback.style.visibility = 'visible';
      host!.dataset.renderer = 'canvas';
      host!.dataset.motion = 'still';
    }

    async function initialize() {
      try {
        const THREE = await import('three');
        if (disposed) return;
        renderer = new THREE.WebGLRenderer({ alpha: false, antialias: false, powerPreference: 'low-power' });
        renderer.debug.onShaderError = showFallback;
        renderer.setPixelRatio(1);
        renderer.domElement.className = styles.surface;
        renderer.domElement.addEventListener('webglcontextlost', onContextLost);
        renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);
        host!.appendChild(renderer.domElement);
        textures = [landscape, clouds].map((canvas) => {
          const texture = new THREE.CanvasTexture(canvas);
          texture.minFilter = THREE.NearestFilter;
          texture.magFilter = THREE.NearestFilter;
          texture.generateMipmaps = false;
          return texture;
        });
        material = new THREE.ShaderMaterial({
          vertexShader, fragmentShader,
          uniforms: {
            uLandscape: { value: textures[0] },
            uClouds: { value: textures[1] },
            uResolution: { value: new THREE.Vector2(1, 1) },
            uPointer: { value: new THREE.Vector2(.5, .5) },
            uHover: { value: 0 },
            uTime: { value: 0 },
          },
          depthTest: false, depthWrite: false, toneMapped: false,
        });
        const scene = new THREE.Scene();
        const camera = new THREE.Camera();
        geometry = new THREE.PlaneGeometry(2, 2);
        scene.add(new THREE.Mesh(geometry, material));

        function draw(now: number) {
          if (disposed || contextLost || renderFailed) return;
          const running = active();
          // Cap animation at 24fps. Time stops while paused/hidden/offscreen.
          if (running && lastFrame && now - lastFrame < 1000 / 24) {
            frame = requestAnimationFrame(draw);
            return;
          }
          const delta = lastFrame ? Math.min((now - lastFrame) / 1000, .1) : 0;
          lastFrame = now;
          if (running && material) {
            elapsed += delta;
            material.uniforms.uTime.value = elapsed;
            const easing = 1 - Math.exp(-delta * 5);
            material.uniforms.uPointer.value.lerp(new THREE.Vector2(pointer.x, pointer.y), easing);
            material.uniforms.uHover.value += (pointer.hover - material.uniforms.uHover.value) * easing;
          }
          try {
            renderer!.render(scene, camera);
          } catch {
            showFallback();
          }
          if (renderFailed) return;
          fallback.style.visibility = 'hidden';
          host!.dataset.renderer = 'webgl';
          host!.dataset.motion = running ? 'running' : 'still';
          if (running) frame = requestAnimationFrame(draw);
        }
        wake.current = () => {
          cancelAnimationFrame(frame);
          lastFrame = 0;
          draw(performance.now());
        };
        const { width, height } = host!.getBoundingClientRect();
        const scale = Math.min(1, 1600 / width);
        renderer.setSize(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)), false);
        material.uniforms.uResolution.value.set(width, height);
        restart();
      } catch {
        // The same generated landscape remains visible without WebGL support.
        showFallback();
      }
    }
    void initialize();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      wake.current = () => {};
      observer.disconnect();
      resizeObserver.disconnect();
      motion.removeEventListener('change', onMotionChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      hero.removeEventListener('pointermove', onPointerMove);
      hero.removeEventListener('pointerleave', onPointerLeave);
      renderer?.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer?.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      geometry?.dispose();
      material?.dispose();
      textures.forEach((texture) => texture.dispose());
      renderer?.dispose();
      renderer?.domElement.remove();
      fallback.remove();
    };
  }, []);

  function toggleMotion() {
    playback.current.paused = !playback.current.paused;
    setPaused(playback.current.paused);
    wake.current();
  }

  return (
    <>
      <div ref={container} className={styles.background} aria-hidden="true" />
      <button type="button" className={styles.motionToggle} aria-pressed={paused} onClick={toggleMotion}>
        {paused ? 'Play scenery' : 'Pause scenery'}
      </button>
    </>
  );
}
