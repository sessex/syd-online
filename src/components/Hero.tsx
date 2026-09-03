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
    <section className="relative min-h-[100dvh] flex items-center justify-center p-4 md:p-8">
      {/* Rounded container with clipping */}
      <div className="relative w-full max-w-7xl h-[calc(100dvh-2rem)] md:h-[calc(100dvh-4rem)] rounded-[2rem] md:rounded-[3rem] overflow-hidden">
        {/* Terrain background - clipped by parent */}
        <TerrainBackground />

        {/* Content overlay */}
        <div className="relative z-10 h-full flex flex-col">
          {/* Top: Name and subtitle */}
          <div className="pt-8 md:pt-16 px-8 md:px-16">
            <div className="flex flex-col gap-3 md:gap-4">
              {/* Name */}
              {!nameImageError ? (
                <div className="relative h-16 md:h-24 w-full max-w-2xl">
                  <Image
                    src={name.image}
                    alt={name.fallback}
                    fill
                    className="object-contain object-left"
                    priority
                    onError={() => setNameImageError(true)}
                  />
                </div>
              ) : (
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500">
                  {name.fallback}
                </h1>
              )}

              {/* Subtitle */}
              {!subtitleImageError ? (
                <div className="relative h-8 md:h-12 w-full max-w-xl">
                  <Image
                    src={subtitle.image}
                    alt={subtitle.fallback}
                    fill
                    className="object-contain object-left"
                    priority
                    onError={() => setSubtitleImageError(true)}
                  />
                </div>
              ) : (
                <p className="text-xl md:text-2xl font-light text-white tracking-wide">
                  {subtitle.fallback}
                </p>
              )}
            </div>
          </div>

          {/* Bottom: Model carousel - centered vertically in remaining space */}
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="w-full max-w-6xl">
              <ModelCarousel />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
