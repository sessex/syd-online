'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { siteContent } from '@/content/site';

function PinkStarSeparator() {
  return (
    <span className="inline-block text-pink-500 text-sm mx-3">★</span>
  );
}

export default function Footer() {
  const { links } = siteContent.footer;

  return (
    <footer className="w-full py-16 md:py-24">
      <div className="flex flex-wrap items-center justify-center gap-y-4">
        {links.map((link, index) => (
          <div key={link.name} className="flex items-center">
            <FooterLink href={link.href} image={link.image} name={link.name} />
            {index < links.length - 1 && <PinkStarSeparator />}
          </div>
        ))}
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  image,
  name,
}: {
  href: string;
  image: string;
  name: string;
}) {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return (
      <Link
        href={href}
        className="text-[24px] tracking-[-0.03em] font-helvetica hover:underline"
      >
        {name}
      </Link>
    );
  }

  return (
    <Link href={href} className="relative block group">
      <div className="relative h-8 w-24">
        <Image
          src={image}
          alt={name}
          fill
          className="object-contain group-hover:opacity-80 transition-opacity"
          onError={() => setImageError(true)}
        />
      </div>
    </Link>
  );
}
