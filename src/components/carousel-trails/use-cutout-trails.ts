'use client';

import { useEffect, type RefObject } from 'react';
import type { createTrailRenderer } from './renderer';
import { TRAIL_STYLES, type TrailStyle } from './styles';

// Keyed by asset so a reordered carousel keeps each cutout's identity.
const styles: Record<string, TrailStyle> = {
  '/carousel/bunny.png': 'echo',
  '/carousel/bow2.png': 'sparks',
  '/carousel/chicken.png': 'thermal',
  '/carousel/werk.png': 'glitch',
  '/carousel/dance.png': 'chrome',
};

type AlphaMask = { width: number; height: number; alpha: Uint8Array };
type Pointer = { x: number; y: number };
const MIN_EMISSION_TRAVEL = 14;

function readMask(image: HTMLImageElement): AlphaMask | null {
  if (!image.complete || !image.naturalWidth) return null;
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  try {
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    const alpha = new Uint8Array(canvas.width * canvas.height);
    for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
    return { width: canvas.width, height: canvas.height, alpha };
  } catch {
    // An unreadable image must never turn its transparent rectangle into a hit.
    return null;
  }
}

export function useCutoutTrails(
  regionRef: RefObject<HTMLDivElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  paused: boolean,
) {
  useEffect(() => {
    const region = regionRef.current;
    const canvas = canvasRef.current;
    if (!region || !canvas || paused) return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const images = Array.from(region.querySelectorAll('img')).reverse();
    const masks = new Map<string, AlphaMask | null>();
    let renderer: ReturnType<typeof createTrailRenderer> = null;
    let initializing = false;
    let disposed = false;
    let unavailable = false;
    let pointer: Pointer | null = null;
    let pointerMoved = false;
    let frame = 0;
    let lastEmission = -Infinity;
    let lastEmissionPoint: Pointer | null = null;
    let lastImage: HTMLImageElement | null = null;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      renderer?.resize(rect.width, rect.height, Math.min(window.devicePixelRatio, 1.5));
    };

    const tick = (time: number) => {
      frame = 0;
      if (!renderer || disposed) return;
      let hit = lastImage;
      if (pointerMoved && pointer && !region.matches(':focus-visible') &&
          region.contains(document.elementFromPoint(pointer.x, pointer.y))) {
        hit = null;
        for (const image of images) {
          const rect = image.getBoundingClientRect();
          if (!rect.width || !rect.height || pointer.x < rect.left || pointer.x >= rect.right ||
              pointer.y < rect.top || pointer.y >= rect.bottom) continue;
          const src = image.getAttribute('src') ?? '';
          if (!styles[src]) continue;
          if (!masks.has(src) && image.complete && image.naturalWidth) masks.set(src, readMask(image));
          const mask = masks.get(src);
          if (!mask) continue;
          const x = Math.floor((pointer.x - rect.left) / rect.width * mask.width);
          const y = Math.floor((pointer.y - rect.top) / rect.height * mask.height);
          if (mask.alpha[y * mask.width + x] < 24) continue;
          hit = image;
          const distance = lastEmissionPoint
            ? Math.hypot(pointer.x - lastEmissionPoint.x, pointer.y - lastEmissionPoint.y)
            : Infinity;
          const intervalElapsed = time - lastEmission >= TRAIL_STYLES[styles[src]].interval;
          if (intervalElapsed && (hit !== lastImage || distance >= MIN_EMISSION_TRAVEL)) {
            const surface = canvas.getBoundingClientRect();
            renderer.emit({
              image, style: styles[src], time,
              x: rect.left - surface.left, y: rect.top - surface.top,
              width: rect.width, height: rect.height,
            });
            lastEmission = time;
            lastEmissionPoint = { ...pointer };
          }
          break;
        }
      } else if (pointerMoved) {
        hit = null;
      }
      pointerMoved = false;
      lastImage = hit;
      const hasTrails = renderer.render(time);
      if (pointerMoved || hasTrails) frame = requestAnimationFrame(tick);
    };

    const wake = async () => {
      if (disposed || unavailable || motion.matches || document.hidden) return;
      if (!renderer) {
        if (initializing) return;
        initializing = true;
        try {
          const { createTrailRenderer } = await import('./renderer');
          if (disposed || motion.matches || document.hidden) return;
          renderer = createTrailRenderer(canvas);
          unavailable = !renderer;
          resize();
        } catch {
          unavailable = true;
        } finally {
          initializing = false;
        }
      }
      if (renderer && !frame) frame = requestAnimationFrame(tick);
    };

    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || motion.matches) return;
      pointer = { x: event.clientX, y: event.clientY };
      pointerMoved = true;
      void wake();
    };
    const leave = () => {
      pointer = null;
      pointerMoved = false;
      lastImage = null;
      lastEmissionPoint = null;
    };
    const reset = () => {
      leave();
      cancelAnimationFrame(frame);
      frame = 0;
      renderer?.clear();
    };
    const visibility = () => { if (document.hidden) reset(); };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    region.addEventListener('pointerenter', move);
    region.addEventListener('pointermove', move);
    region.addEventListener('pointerleave', leave);
    region.addEventListener('pointercancel', leave);
    window.addEventListener('blur', leave);
    document.addEventListener('visibilitychange', visibility);
    motion.addEventListener('change', reset);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      region.removeEventListener('pointerenter', move);
      region.removeEventListener('pointermove', move);
      region.removeEventListener('pointerleave', leave);
      region.removeEventListener('pointercancel', leave);
      window.removeEventListener('blur', leave);
      document.removeEventListener('visibilitychange', visibility);
      motion.removeEventListener('change', reset);
      renderer?.dispose();
    };
  }, [regionRef, canvasRef, paused]);
}
