import Image from 'next/image';
import Link from 'next/link';
import { Fragment } from 'react';
import { siteContent } from '@/content/site';

export default function Footer() {
  const { links, separator } = siteContent.footer;

  return (
    <footer className="w-full py-16 md:py-24">
      <nav aria-label="Contact" className="mx-auto flex w-[min(88vw,960px)] items-center gap-[clamp(4px,1vw,12px)]">
        {links.map((link, index) => (
          <Fragment key={link.name}>
            {index > 0 && (
              <Image
                {...separator}
                alt=""
                aria-hidden="true"
                sizes="32px"
                className="pointer-events-none h-auto w-[clamp(12px,3vw,32px)] flex-none"
              />
            )}
            <Link
              href={link.href}
              className="flex min-h-11 min-w-11 basis-0 items-center justify-center transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
              style={link.name === 'x'
                ? { flex: '0 0 clamp(44px, 6vw, 64px)' }
                : { flexGrow: link.image.width / link.image.height }}
            >
              <Image
                {...link.image}
                alt={link.name}
                sizes="(max-width: 1090px) 23vw, 250px"
                className={link.name === 'x' ? 'h-auto w-[clamp(24px,5vw,64px)] max-w-full' : 'h-auto w-full'}
              />
            </Link>
          </Fragment>
        ))}
      </nav>
    </footer>
  );
}
