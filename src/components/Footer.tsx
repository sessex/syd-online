import Image from 'next/image';
import Link from 'next/link';
import { Fragment } from 'react';
import { siteContent } from '@/content/site';

export default function Footer() {
  const { links, separator } = siteContent.footer;
  const minimumTargetSize = 44;
  const canvasWidth = links.reduce(
    (width, link) => width + link.image.width,
    separator.width * (links.length - 1),
  );
  const canvasWidthWithoutX = canvasWidth - links[0].image.width;
  const naturalHeight = (separator.height / canvasWidth) * 100;
  const narrowHeight = (separator.height / canvasWidthWithoutX) * 100;
  const targetOffset = (minimumTargetSize * separator.height) / canvasWidthWithoutX;
  const artworkHeight = `min(${naturalHeight}cqw, calc(${narrowHeight}cqw - ${targetOffset}px))`;

  return (
    <footer className="w-full py-16 md:py-24">
      <nav
        aria-label="Contact"
        className="mx-auto flex w-[min(88vw,960px)] items-center justify-center [container-type:inline-size]"
      >
        {links.map((link, index) => (
          <Fragment key={link.name}>
            {index > 0 && (
              <Image
                {...separator}
                alt=""
                aria-hidden="true"
                sizes="(max-width: 1090px) 6vw, 55px"
                className="pointer-events-none w-auto max-w-none flex-none"
                style={{ height: artworkHeight }}
              />
            )}
            <Link
              href={link.href}
              className="flex min-h-11 min-w-11 flex-none items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
            >
              <Image
                {...link.image}
                alt={link.name}
                sizes="(max-width: 1090px) 30vw, 292px"
                className="w-auto max-w-none"
                style={{ height: artworkHeight }}
              />
            </Link>
          </Fragment>
        ))}
      </nav>
    </footer>
  );
}
