import Image from 'next/image';
import { siteContent } from '@/content/site';
import PixelBackground from './pixel-hero/PixelBackground';
import ModelCarousel from './ModelCarousel';
import styles from './pixel-hero/hero.module.css';

export default function Hero() {
  const { name, subtitle } = siteContent.hero;

  return (
    <section aria-label="Introducing Sydney Essex" className="p-[var(--page-gutter)]">
      <div className={styles.hero}>
        <PixelBackground />

        <header className={styles.heading}>
          <div className={styles.lettering}>
            <h1 className={styles.name}>
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

            <p className={styles.subtitle}>
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

        <div className={styles.carousel}>
          <ModelCarousel />
        </div>
      </div>
    </section>
  );
}
