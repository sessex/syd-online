'use client';

import Image from 'next/image';
import { useRef } from 'react';
import { siteContent } from '@/content/site';
import { useCutoutTrails } from './carousel-trails/use-cutout-trails';

export default function ModelCarousel({ paused }: { paused: boolean }) {
  const { images } = siteContent.carousel;
  const regionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useCutoutTrails(regionRef, canvasRef, paused);

  return (
    <div className="relative isolate w-full" data-hero-interaction="carousel">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 left-0 h-[calc(100%+96px)] w-full"
      />
      <div
        ref={regionRef}
        role="region"
        aria-roledescription="carousel"
        aria-label="Sydney’s photo carousel. Scroll to explore."
        tabIndex={0}
        data-motion-paused={paused}
        className="model-carousel relative w-full overflow-x-auto outline-offset-[-4px]"
      >
        <div className="model-marquee-track flex w-max">
          {[0, 1].map((group) => (
            <div
              key={group}
              aria-hidden={group === 1}
              className="model-marquee-group flex shrink-0 items-end gap-[clamp(8px,1vw,16px)] pr-[clamp(8px,1vw,16px)]"
            >
              {images.map((item, index) => (
                <div
                  key={`${group}-${index}`}
                  className="relative h-[var(--cutout-height)] shrink-0"
                  style={{ aspectRatio: `${item.width} / ${item.height}` }}
                >
                  <Image
                    src={item.src}
                    alt={group === 0 ? item.alt : ''}
                    fill
                    sizes="(max-width: 640px) 85vw, (max-width: 1600px) 34vw, 545px"
                    loading="eager"
                    unoptimized
                    className="object-contain object-bottom"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
