'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { siteContent } from '@/content/site';

export default function Footer() {
  const { stripImage, links } = siteContent.footer;
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    // Fallback: text links with pink star separators
    return (
      <footer className="w-full py-16 md:py-24">
        <div className="flex flex-wrap items-center justify-center gap-y-4">
          {links.map((link, index) => (
            <div key={link.name} className="flex items-center">
              <Link
                href={link.href}
                className="text-[24px] tracking-[-0.03em] font-helvetica hover:underline px-2"
              >
                {link.name}
              </Link>
              {index < links.length - 1 && (
                <span className="inline-block text-pink-500 text-sm mx-2">★</span>
              )}
            </div>
          ))}
        </div>
      </footer>
    );
  }

  // Single footer strip with overlay clickable areas
  // Image is "x ★ linkedin ★ github ★ email"
  // Divide into 4 equal horizontal sections for hit areas
  return (
    <footer className="w-full py-16 md:py-24">
      <div className="flex justify-center">
        <div className="relative w-full max-w-2xl h-16 md:h-20">
          <Image
            src={stripImage}
            alt="Contact links"
            fill
            className="object-contain"
            onError={() => setImageError(true)}
          />
          {/* Overlay clickable areas - divide strip into 4 equal sections */}
          <div className="absolute inset-0 flex">
            {links.map((link, index) => (
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
