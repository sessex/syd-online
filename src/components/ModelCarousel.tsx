import Image from 'next/image';
import { siteContent } from '@/content/site';

export default function ModelCarousel() {
  const { images } = siteContent.carousel;

  return (
    <div className="relative w-full overflow-hidden">
      <div className="model-marquee-track flex w-max">
        {[0, 1].map((group) => (
          <div
            key={group}
            aria-hidden={group === 1}
            className="flex shrink-0 items-end gap-[clamp(8px,1.4vw,24px)] pr-[clamp(8px,1.4vw,24px)]"
          >
            {images.map((src, index) => (
              <div
                key={`${group}-${index}`}
                className="relative h-[clamp(300px,57dvh,610px)] w-[clamp(150px,18.5vw,296px)] shrink-0"
              >
                <Image
                  src={src}
                  alt={group === 0 ? 'Sydney holding a pink iBook' : ''}
                  fill
                  sizes="(max-width: 768px) 42vw, 19vw"
                  loading={group === 0 ? 'eager' : 'lazy'}
                  unoptimized
                  className="object-contain object-bottom"
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
