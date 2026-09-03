'use client';

import Image from 'next/image';
import { useState } from 'react';
import { siteContent } from '@/content/site';
import TerrainBackground from './TerrainBackground';
import ModelCarousel from './ModelCarousel';

export default function Hero() {
  const { name, subtitle } = siteContent.hero;
  const [nameImageError, setNameImageError] = useState(false);
  const [subtitleImageError, setSubtitleImageError] = useState(false);

  return (
    <section className="relative h-[100dvh] p-[var(--page-gutter)]">
      <div className="relative h-[calc(100dvh-var(--page-gutter)-var(--page-gutter))] w-full overflow-hidden rounded-[clamp(24px,3vw,46px)]">
        <TerrainBackground />

        <div className="relative z-10 h-full">
          <header className="absolute left-[clamp(24px,4.2vw,68px)] top-[clamp(26px,4.2vw,68px)] w-[min(76vw,760px)]">
            <div className="flex flex-col items-start gap-[clamp(6px,0.8vw,12px)]">
              {!nameImageError ? (
                <div className="relative aspect-[700/106] w-full">
                  <Image
                    src={name.image}
                    alt={name.fallback}
                    fill
                    className="object-contain object-left"
                    sizes="(max-width: 768px) 76vw, 760px"
                    priority
                    onError={() => setNameImageError(true)}
                  />
                </div>
              ) : (
                <h1 className="font-helvetica text-[clamp(42px,6vw,92px)] font-normal leading-[0.9] tracking-[-0.05em] text-black">
                  {name.fallback}
                </h1>
              )}

              {!subtitleImageError ? (
                <div className="relative aspect-[1024/139] w-[74%]">
                  <Image
                    src={subtitle.image}
                    alt={subtitle.fallback}
                    fill
                    className="object-contain object-left"
                    sizes="(max-width: 768px) 56vw, 560px"
                    priority
                    onError={() => setSubtitleImageError(true)}
                  />
                </div>
              ) : (
                <p className="font-helvetica text-[clamp(18px,2.3vw,36px)] font-normal leading-none tracking-[-0.03em] text-black">
                  {subtitle.fallback}
                </p>
              )}
            </div>
          </header>

          <div className="absolute inset-x-0 bottom-0">
            <ModelCarousel />
          </div>
        </div>
      </div>
    </section>
  );
}
