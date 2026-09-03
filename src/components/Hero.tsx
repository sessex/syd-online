import Image from 'next/image';
import { siteContent } from '@/content/site';
import TerrainBackground from './TerrainBackground';
import ModelCarousel from './ModelCarousel';

export default function Hero() {
  const { name, subtitle } = siteContent.hero;

  return (
    <section className="relative h-[100dvh] p-[var(--page-gutter)]">
      <div className="relative h-[calc(100dvh-var(--page-gutter)-var(--page-gutter))] w-full overflow-hidden rounded-[clamp(24px,3vw,46px)]">
        <TerrainBackground />

        <div className="relative z-10 h-full">
          <header className="absolute left-[clamp(24px,4.2vw,68px)] top-[clamp(26px,4.2vw,68px)] w-[min(74vw,1050px)]">
            <div className="flex flex-col items-start gap-[clamp(6px,0.8vw,12px)]">
              <div className="relative aspect-[1600/243] w-full">
                <Image
                  src={name.image}
                  alt={name.fallback}
                  fill
                  className="object-contain object-left"
                  sizes="(max-width: 768px) 74vw, 1050px"
                  priority
                />
              </div>

              <div className="relative aspect-[1600/168] w-[74%]">
                <Image
                  src={subtitle.image}
                  alt={subtitle.fallback}
                  fill
                  className="object-contain object-left"
                  sizes="(max-width: 768px) 55vw, 780px"
                  priority
                />
              </div>
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
