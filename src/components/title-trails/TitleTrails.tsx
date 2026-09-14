'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import type { PointerSample, TrailRenderer } from './titleTrailRenderer';
import styles from '../PostHero.module.css';

const PADDING = 54;
const SETTLE_MS = 13500;

type TitleLine = Readonly<{ text: string; left: number; top: number; width: number; height: number }>;
type TitleGeometry = Readonly<{ element: HTMLElement; lines: readonly TitleLine[] }>;

function captureTitles(root: HTMLElement) {
  const bounds = root.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = bounds.width + PADDING * 2;
  const height = bounds.height + PADDING * 2;
  const atlas = document.createElement('canvas');
  atlas.width = Math.ceil(width * ratio);
  atlas.height = Math.ceil(height * ratio);
  const context = atlas.getContext('2d');
  if (!context) throw new Error('Title mask is unavailable');
  context.scale(ratio, ratio);
  context.fillStyle = '#000';
  const titles: TitleGeometry[] = [];
  for (const element of root.querySelectorAll<HTMLElement>('[data-chromatic-ink]')) {
    const node = element.firstChild;
    if (!node || node.nodeType !== Node.TEXT_NODE) continue;
    const text = node.textContent ?? '';
    const lines: { text: string; left: number; top: number; width: number; height: number }[] = [];
    const range = document.createRange();
    for (let index = 0; index < text.length; index++) {
      range.setStart(node, index);
      range.setEnd(node, index + 1);
      const rect = range.getBoundingClientRect();
      if (!rect.width) continue;
      const left = rect.left - bounds.left + PADDING;
      const top = rect.top - bounds.top + PADDING;
      const previous = lines.at(-1);
      if (previous && Math.abs(previous.top - top) < 1) {
        previous.text += text[index];
        previous.width = left + rect.width - previous.left;
      } else {
        lines.push({ text: text[index], left, top, width: rect.width, height: rect.height });
      }
    }
    const style = getComputedStyle(element);
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    context.letterSpacing = style.letterSpacing;
    context.textBaseline = 'alphabetic';
    const metrics = context.measureText('Hg');
    const ascent = metrics.fontBoundingBoxAscent;
    const descent = metrics.fontBoundingBoxDescent;
    for (const line of lines) {
      const baseline = line.top + (line.height - ascent - descent) / 2 + ascent;
      context.fillText(line.text, line.left, baseline);
    }
    titles.push({ element, lines });
  }
  return { atlas, titles, width, height };
}

export default function TitleTrails({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const media = ['(prefers-reduced-motion: no-preference)', '(forced-colors: none)', '(hover: hover)', '(pointer: fine)'].map((query) => matchMedia(query));
    const available = () => media.every((query) => query.matches);
    let engine: TrailRenderer | null = null;
    let titles: readonly TitleGeometry[] = [];
    let previous: { x: number; y: number; title: TitleGeometry; line: TitleLine } | null = null;
    let pending: PointerSample | null = null;
    let frameId = 0;
    let resizeId = 0;
    let lastFrame = 0;
    let lastInput = 0;
    let revision = 0;
    let loading = false;
    let failed = false;
    let disposed = false;

    function stop() {
      cancelAnimationFrame(frameId);
      frameId = 0;
      previous = null;
      pending = null;
      engine?.clear();
      canvas!.dataset.state = engine ? 'idle' : 'disabled';
    }

    function disable() {
      revision++;
      loading = false;
      stop();
      engine?.dispose();
      engine = null;
      titles = [];
      canvas!.dataset.state = 'disabled';
    }

    function rebuild() {
      resizeId = 0;
      previous = null;
      if (!engine) return;
      stop();
      try {
        const source = captureTitles(root!);
        engine.resize(source.atlas, source.width, source.height);
        titles = source.titles;
      } catch {
        failed = true;
        disable();
      }
    }

    function queueRebuild() {
      previous = null;
      if (engine && !resizeId) resizeId = requestAnimationFrame(rebuild);
    }

    async function initialize() {
      if (engine || loading || failed || disposed || !available() || document.hidden) return;
      loading = true;
      const current = ++revision;
      try {
        const [module] = await Promise.all([import('./titleTrailRenderer'), document.fonts.ready]);
        if (current !== revision || disposed || !available() || document.hidden) return;
        engine = module.createTitleTrailRenderer(canvas!);
        rebuild();
      } catch {
        failed = true;
        disable();
      } finally {
        if (current === revision) loading = false;
      }
    }

    function frame(now: number) {
      frameId = 0;
      if (!engine) return;
      if (!available()) {
        disable();
        return;
      }
      if (document.hidden) {
        stop();
        return;
      }
      if (now - lastInput >= SETTLE_MS) {
        stop();
        return;
      }
      engine.frame(Math.max(0, (now - lastFrame) / 1000), pending);
      pending = null;
      lastFrame = now;
      frameId = requestAnimationFrame(frame);
    }

    function move(event: PointerEvent) {
      if (event.pointerType === 'touch' || !available() || document.hidden) return;
      if (!engine) {
        void initialize();
        return;
      }
      const bounds = root!.getBoundingClientRect();
      const x = event.clientX - bounds.left + PADDING;
      const y = event.clientY - bounds.top + PADDING;
      let line: TitleLine | undefined;
      const title = titles.find((entry) => {
        line = entry.lines.find((part) => x >= part.left - 8 && x <= part.left + part.width + 8 && y >= part.top - 8 && y <= part.top + part.height + 8);
        return line !== undefined;
      });
      if (!title || !line) {
        previous = null;
        return;
      }
      if (previous?.title !== title || previous.line !== line) pending = null;
      if (previous?.title === title && previous.line === line) {
        const dx = x - previous.x;
        const dy = y - previous.y;
        if (Math.hypot(dx, dy) > 0.01) {
          pending = { x, y, dx: dx + (pending?.dx ?? 0), dy: dy + (pending?.dy ?? 0), top: line.top, bottom: line.top + line.height };
          lastInput = performance.now();
          canvas!.dataset.state = 'active';
          if (!frameId) {
            lastFrame = lastInput;
            frameId = requestAnimationFrame(frame);
          }
        }
      }
      previous = { x, y, title, line };
    }

    function leave() {
      previous = null;
    }

    function preferenceChanged() {
      if (!available()) disable();
    }

    function visibilityChanged() {
      if (document.hidden) {
        revision++;
        loading = false;
        stop();
      }
    }

    function contextLost(event: Event) {
      event.preventDefault();
      failed = true;
      disable();
    }

    const observer = new ResizeObserver(queueRebuild);
    observer.observe(root);
    root.addEventListener('pointermove', move);
    root.addEventListener('pointerleave', leave);
    window.addEventListener('scroll', leave, { passive: true });
    window.addEventListener('resize', queueRebuild);
    for (const query of media) query.addEventListener('change', preferenceChanged);
    document.addEventListener('visibilitychange', visibilityChanged);
    document.fonts.addEventListener('loadingdone', queueRebuild);
    canvas.addEventListener('webglcontextlost', contextLost);
    return () => {
      disposed = true;
      disable();
      cancelAnimationFrame(resizeId);
      observer.disconnect();
      root.removeEventListener('pointermove', move);
      root.removeEventListener('pointerleave', leave);
      window.removeEventListener('scroll', leave);
      window.removeEventListener('resize', queueRebuild);
      for (const query of media) query.removeEventListener('change', preferenceChanged);
      document.removeEventListener('visibilitychange', visibilityChanged);
      document.fonts.removeEventListener('loadingdone', queueRebuild);
      canvas.removeEventListener('webglcontextlost', contextLost);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.titleTrails}>
      <canvas ref={canvasRef} className={styles.trailCanvas} data-chromatic-trail data-state="disabled" aria-hidden="true" />
      {children}
    </div>
  );
}
