'use client';

import { useEffect, useRef } from 'react';
import styles from './PixelWishesCursor.module.css';
import { startPixelWishesCursor } from './pixel-wishes';

export default function PixelWishesCursor() {
  const inversion = useRef<HTMLCanvasElement>(null);
  const color = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!inversion.current || !color.current) return;
    return startPixelWishesCursor({
      inversion: inversion.current,
      color: color.current,
    });
  }, []);

  return (
    <>
      <canvas
        ref={inversion}
        className={`${styles.layer} ${styles.inversion}`}
        aria-hidden="true"
        data-pixel-wishes-layer="inversion"
        data-pixel-wishes-state="disabled"
        data-pixel-wishes-disabled-reason="initializing"
        data-pixel-wishes-particle-count="0"
        data-pixel-wishes-emitted-total="0"
      />
      <canvas
        ref={color}
        className={`${styles.layer} ${styles.color}`}
        aria-hidden="true"
        data-pixel-wishes-layer="color"
        data-pixel-wishes-state="disabled"
        data-pixel-wishes-disabled-reason="initializing"
        data-pixel-wishes-particle-count="0"
        data-pixel-wishes-emitted-total="0"
      />
    </>
  );
}
