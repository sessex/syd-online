'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { siteContent } from '@/content/site';
import { useState } from 'react';

export default function ModelCarousel() {
  const { images } = siteContent.carousel;
  const [imageError, setImageError] = useState(false);

  // Duplicate images for seamless infinite loop
  const duplicatedImages = [...images, ...images, ...images];

  return (
    <div className="relative w-full overflow-hidden py-8">
      <motion.div
        className="flex gap-8"
        animate={{
          x: [0, -100 * images.length],
        }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: 'loop',
            duration: 20,
            ease: 'linear',
          },
        }}
      >
        {duplicatedImages.map((src, index) => (
          <div
            key={index}
            className="relative shrink-0 h-[300px] w-[200px] flex items-center justify-center"
          >
            {imageError ? (
              <div className="w-full h-full bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 rounded-lg flex items-center justify-center text-gray-600 text-sm">
                Model {(index % images.length) + 1}
              </div>
            ) : (
              <Image
                src={src}
                alt={`Model ${(index % images.length) + 1}`}
                fill
                className="object-contain"
                onError={() => setImageError(true)}
              />
            )}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
