'use client';

import { animate, type AnimationSequence } from 'framer-motion';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { aperturePath, createApertureKeyframes, smoothstep } from './entrance-motion';
import styles from './PageEntrance.module.css';

type Phase = 'waiting' | 'running' | 'complete';
// One clock: no React render or animation-end handoff between individual gestures.
const TIMING = { contract: .12, contractDuration: .75, open: .87, openDuration: 2.15, content: 3.12 };

export default function PageEntrance({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('waiting');
  const root = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const aperture = useRef<SVGPathElement>(null);
  const finished = phase === 'complete';
  const maskId = `entrance-${useId().replace(/:/g, '')}`;

  useEffect(() => {
    const host = root.current;
    const cover = overlay.current;
    const heart = aperture.current;
    if (!host || !cover || !heart || finished) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let disposed = false;
    let startTimer = 0;
    let playback: ReturnType<typeof animate> | undefined;
    const restoredStyles: Array<() => void> = [];
    const complete = () => { if (!disposed) setPhase('complete'); };
    const onMotionChange = () => { if (reducedMotion.matches) complete(); };
    const onVisibilityChange = () => { if (document.hidden) complete(); };
    const coverStyle = getComputedStyle(cover);
    const skip = reducedMotion.matches || coverStyle.visibility === 'hidden' || coverStyle.display === 'none' ||
      window.scrollY > 0 || Boolean(window.location.hash);
    const deadline = window.setTimeout(complete, 5700);
    const observer = new MutationObserver(() => { void prepare().catch(complete); });
    observer.observe(host, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-renderer'] });

    function rememberStyles(element: HTMLElement, properties: string[]) {
      const originals = properties.map((property) => [property, element.style.getPropertyValue(property)]);
      restoredStyles.push(() => originals.forEach(([property, value]) => {
        if (value) element.style.setProperty(property, value);
        else element.style.removeProperty(property);
      }));
    }

    async function prepare() {
      const hero = host!.querySelector<HTMLElement>('[data-hero-frame]');
      const art = host!.querySelector<HTMLElement>('[data-hero-art]');
      if (!hero || !art?.dataset.renderer) return;
      observer.disconnect();
      const images = Array.from(host!.querySelectorAll<HTMLImageElement>('[data-hero-enter] img'));
      await Promise.race([
        Promise.allSettled(images.map((image) => image.decode())),
        new Promise<void>((resolve) => { startTimer = window.setTimeout(resolve, 450); }),
      ]);
      if (disposed) return;
      const bounds = hero.getBoundingClientRect();
      const radius = parseFloat(getComputedStyle(hero).borderTopLeftRadius);
      const inset = Math.min(16, Math.max(7, bounds.width * .011));
      const inner = { x: bounds.x + inset, y: bounds.y + inset,
        width: bounds.width - inset * 2, height: bounds.height - inset * 2, radius: Math.max(0, radius - inset) };
      const paths = createApertureKeyframes(inner);
      const blur = Math.min(12, Math.max(6, bounds.width / 70));
      const focus = paths.map((_, index) => `blur(${(blur * (1 - smoothstep(index / (paths.length - 1)))).toFixed(3)}px)`);
      // Write the inset on the shared clock: native clip-path playback in the
      // in-app browser painted half the measured inset until the handoff.
      const clipAt = (progress: number) => {
        cover!.style.clipPath = `inset(${bounds.top * progress}px ${(window.innerWidth - bounds.right) * progress}px ${(window.innerHeight - bounds.bottom) * progress}px ${bounds.left * progress}px round ${radius * progress}px)`;
      };
      heart!.setAttribute('d', paths[0]);
      rememberStyles(art, ['filter']);
      art.style.filter = focus[0];
      const sequence: AnimationSequence = [
        // GSAP's unqualified "cubic" in Self Aware is cubic ease-out.
        [clipAt, [0, 1], { at: TIMING.contract, duration: TIMING.contractDuration, ease: (t) => 1 - (1 - t) ** 3 }],
        // Sample one continuous curve; linear interpolation does not restart easing at a waypoint.
        [heart!, { d: paths }, { at: TIMING.open, duration: TIMING.openDuration, ease: 'linear' }],
        [art, { filter: focus }, { at: TIMING.open, duration: TIMING.openDuration, ease: 'linear' }],
        [cover!, { opacity: [1, 0] }, { at: TIMING.open + TIMING.openDuration, duration: .16, ease: 'easeOut' }],
      ];
      const entrances = [
        { name: 'name', at: TIMING.content, y: 12, duration: .72 },
        { name: 'subtitle', at: TIMING.content + .08, y: 12, duration: .72 },
        { name: 'carousel', at: TIMING.content + .18, y: 20, duration: .82 },
        { name: 'controls', at: TIMING.content + .18, y: 0, duration: .5 },
      ];
      for (const entry of entrances) {
        const element = host!.querySelector<HTMLElement>(`[data-hero-enter="${entry.name}"]`);
        if (!element) continue;
        rememberStyles(element, ['opacity', 'transform']);
        sequence.push([element, { opacity: [0, 1], transform: [`translate3d(0, ${entry.y}px, 0)`, 'translate3d(0, 0px, 0)'] },
          { at: entry.at, duration: entry.duration, ease: [.16, 1, .3, 1] }]);
      }
      setPhase('running');
      playback = animate(sequence, { onComplete: complete });

    }

    if (skip) startTimer = window.setTimeout(complete, 0);
    else void prepare().catch(complete);
    reducedMotion.addEventListener('change', onMotionChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('keydown', complete, { once: true });
    host.addEventListener('focusin', complete, { once: true });
    window.addEventListener('pointerdown', complete, { once: true, passive: true });
    window.addEventListener('wheel', complete, { once: true, passive: true });
    window.addEventListener('touchstart', complete, { once: true, passive: true });
    window.addEventListener('resize', complete, { once: true });

    return () => {
      disposed = true;
      playback?.cancel();
      restoredStyles.forEach((restore) => restore());
      observer.disconnect();
      window.clearTimeout(startTimer);
      window.clearTimeout(deadline);
      reducedMotion.removeEventListener('change', onMotionChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('keydown', complete);
      host.removeEventListener('focusin', complete);
      window.removeEventListener('pointerdown', complete);
      window.removeEventListener('wheel', complete);
      window.removeEventListener('touchstart', complete);
      window.removeEventListener('resize', complete);
    };
  }, [finished]);

  return (
    <div ref={root} className={styles.entrance} data-entrance={phase}>
      {children}
      {!finished && (
        <div ref={overlay} className={styles.overlay} aria-hidden="true" onAnimationEnd={() => setPhase('complete')}>
          <svg className={styles.surface} width="100%" height="100%" focusable="false">
            <defs>
              <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%" style={{ maskType: 'luminance' }}>
                <rect width="100%" height="100%" fill="white" />
                <path ref={aperture} fill="black" d={aperturePath({ x: 0, y: 0, width: 0, height: 0, radius: 0 }, 0)} />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="var(--hero-frame-pink, #ff20b4)" mask={`url(#${maskId})`} />
          </svg>
        </div>
      )}
      <noscript><style>{`
        [data-entrance] > [aria-hidden="true"] { display: none !important; }
        [data-entrance] [data-hero-enter] { opacity: 1 !important; animation: none !important; pointer-events: auto !important; }
        [data-entrance] [data-hero-art] { filter: none !important; animation: none !important; }
      `}</style></noscript>
    </div>
  );
}
