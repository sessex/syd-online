import Image from 'next/image';
import { siteContent } from '@/content/site';
import TerrainBackground from './TerrainBackground';
import ModelCarousel from './ModelCarousel';

export default function Hero() {
  const { name, subtitle } = siteContent.hero;

  return (
    <section aria-label="Introducing Sydney Essex" className="p-[var(--page-gutter)]">
      <div className="relative isolate flex min-h-[calc(100svh-var(--page-gutter)-var(--page-gutter))] w-full flex-col overflow-hidden rounded-[clamp(24px,3vw,46px)] [--cutout-height:clamp(360px,62svh,540px)] sm:[--cutout-height:clamp(420px,max(42vw,55svh),680px)]">
        <TerrainBackground />

        <header className="relative z-10 mx-[clamp(24px,3.5vw,64px)] mt-[clamp(28px,4vw,72px)] mb-[clamp(24px,3vw,48px)] w-auto sm:w-[71%] sm:max-w-[1080px]">
          <div className="flex flex-col items-start gap-[clamp(6px,0.8vw,12px)]">
            <h1 className="relative aspect-[1600/243] w-full">
              <Image
                src={name.image}
                alt={name.fallback}
                fill
                className="object-contain object-left"
                sizes="(max-width: 640px) 85vw, (max-width: 1600px) 68vw, 1080px"
                preload
                unoptimized
              />
            </h1>

            <p className="relative aspect-[1600/168] w-full sm:w-[79%]">
              <Image
                src={subtitle.image}
                alt={subtitle.fallback}
                fill
                className="object-contain object-left"
                sizes="(max-width: 640px) 85vw, (max-width: 1600px) 54vw, 854px"
                preload
                unoptimized
              />
            </p>
          </div>
        </header>

        <div className="relative z-10 flex flex-1 items-center pb-[clamp(64px,5vw,80px)]">
          <ModelCarousel />
        </div>
      </div>
    </section>
  );
}
