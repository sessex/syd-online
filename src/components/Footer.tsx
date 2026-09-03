import Image from 'next/image';
import Link from 'next/link';
import { siteContent } from '@/content/site';

export default function Footer() {
  const { stripImage, links } = siteContent.footer;

  return (
    <footer className="w-full py-16 md:py-24">
      <div className="flex justify-center">
        <div className="relative aspect-[1600/164] w-[min(88vw,960px)]">
          <Image
            src={stripImage}
            alt="Contact links"
            fill
            sizes="(max-width: 768px) 88vw, 960px"
            unoptimized
            className="object-contain"
          />
          <div className="absolute inset-0 flex">
            {links.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="flex-1 hover:opacity-70 transition-opacity"
                aria-label={link.name}
              />
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
