/**
 * Single source of truth for all site content, asset paths, and links.
 * Swap copy and images here without touching components.
 */

export const siteContent = {
  hero: {
    // Brand assets - prefer transparent PNG, fallback to SVG or text
    name: {
      image: '/brand/name.png',
      fallback: 'SYDNEY ESSEX',
    },
    subtitle: {
      image: '/brand/subtitle.png',
      fallback: 'product engineer based in nyc',
    },
  },

  carousel: {
    // Green blazer / pink iBook cutout repeated for marquee
    images: [
      '/carousel/placeholder.png',
      '/carousel/placeholder.png',
      '/carousel/placeholder.png',
      '/carousel/placeholder.png',
      '/carousel/placeholder.png',
    ],
  },

  about: {
    paragraphs: [
      'sydney essex is a product engineer in nyc with 6 years of experience across creative startups and enterprise. her work has spanned browser video, generative image pipelines, and now agentic tools for designers.',
      'she cares about interfaces that feel good to use and about building the ai creative tools she\'d want as an instagram-obsessed content creator. currently curious about how technology can connect us back to the physical world in front of us.',
    ],
  },

  projects: {
    title: 'projects',
    items: [
      {
        name: 'trouvaille',
        description: 'placeholder text',
        href: 'https://trouv.vercel.app/',
      },
      {
        name: 'color hunt',
        description: 'placeholder text',
        href: '#',
      },
    ],
  },

  experience: {
    title: 'experience',
    items: [
      {
        name: 'asimov collective',
        description: 'building multi-tenant AI platform that learns client\'s brand and generates on-brand assets for in-house design work',
        href: 'https://www.asimovcollective.com/',
      },
      {
        name: 'goldman sachs',
        description: 'full-stack on client onboarding for wealth management, modernizing workflows for advisors and operations teams',
        href: '#',
      },
      {
        name: 'hypno',
        description: 'creative workflow platform for event production and branded content galleries',
        href: 'https://app.hypno.com/',
      },
      {
        name: 'vbn',
        description: 'browser-based video conferencing and event streaming platform',
        href: '#',
      },
      {
        name: 'artswrk',
        description: 'launched an arts and entertainment professional network end-to-end',
        href: 'https://artswrk.com/',
      },
    ],
  },

  footer: {
    // Single footer strip: "x ★ linkedin ★ github ★ email"
    // Overlay 4 clickable hit-areas instead of separate images
    stripImage: '/brand/footer.png',
    links: [
      {
        name: 'x',
        href: 'https://x.com/waifu101',
      },
      {
        name: 'linkedin',
        href: 'https://www.linkedin.com/in/sydneyessex/',
      },
      {
        name: 'github',
        href: 'https://github.com/sessex',
      },
      {
        name: 'email',
        href: 'mailto:sydneyressex@gmail.com',
      },
    ],
  },

  // Terrain tunables - expose for easy adjustment
  terrain: {
    // pink, orange, lime, purple, lavender
    colors: ['#ef2b83', '#ff7939', '#5bff45', '#3119e8', '#ce66ea'],
    animationSpeed: 0.06,
    contourBands: 8,
    noiseScale: 1.35,
    grainStrength: 0.12,
  },
} as const;
