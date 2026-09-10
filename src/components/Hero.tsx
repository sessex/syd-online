'use client';

import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { siteContent } from '@/content/site';
import PixelBackground from './pixel-hero/PixelBackground';
import ModelCarousel from './ModelCarousel';
import styles from './pixel-hero/hero.module.css';

function MotionIcon({ paused }: { paused: boolean }) {
  const prefersReducedMotion = useReducedMotion();
  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { type: 'spring' as const, duration: 0.3, bounce: 0 };

  return (
    <AnimatePresence initial={false} mode="popLayout">
      <motion.span
        key={paused ? 'play' : 'pause'}
        initial={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
        transition={transition}
        className={styles.motionIcon}
        aria-hidden="true"
      >
        {paused ? (
          <svg viewBox="0 0 24 24" focusable="false" className={styles.playGlyph}>
            <path d="M7.5 5.2v13.6L19 12 7.5 5.2Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M6.5 5h4v14h-4zM13.5 5h4v14h-4z" />
          </svg>
        )}
      </motion.span>
    </AnimatePresence>
  );
}

export default function Hero() {
  const { name, subtitle } = siteContent.hero;
  const [motionPaused, setMotionPaused] = useState(false);
  const motionLabel = motionPaused ? 'Play motion' : 'Pause motion';

  return (
    <section aria-label="Introducing Sydney Essex" className="p-[var(--page-gutter)]">
      <div className={styles.hero} data-hero-frame data-motion-paused={motionPaused}>
        <PixelBackground paused={motionPaused} />

        <header className={styles.heading}>
          <div className={styles.lettering}>
            <h1 className={styles.name} data-hero-enter="name">
              <Image
                src={name.image}
                alt={name.fallback}
                width={2172}
                height={724}
                className={styles.gems}
                sizes="(max-width: 640px) 85vw, 70vw"
                preload
                unoptimized
              />
            </h1>

            <p className={styles.subtitle} data-hero-enter="subtitle">
              <Image
                src={subtitle.image}
                alt={subtitle.fallback}
                width={2172}
                height={724}
                className={styles.gems}
                sizes="(max-width: 640px) 77vw, 53vw"
                preload
                unoptimized
              />
            </p>
          </div>
        </header>

        <div className={styles.carousel} data-hero-enter="carousel">
          <ModelCarousel paused={motionPaused} />
        </div>

        <button
          type="button"
          className={styles.motionToggle}
          data-hero-enter="controls"
          aria-pressed={motionPaused}
          title={motionLabel}
          onClick={() => setMotionPaused((paused) => !paused)}
        >
          <span className="sr-only">{motionLabel}</span>
          <MotionIcon paused={motionPaused} />
        </button>
      </div>
    </section>
  );
}
