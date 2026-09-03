/**
 * Single source of truth for all site content, asset paths, and links.
 * Swap copy and images here without touching components.
 */

export const siteContent = {
  hero: {
    // Brand assets - fallback to text if PNG not available
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
    // For now, one placeholder repeated. Sydney can drop real cutouts later.
    images: [
      '/carousel/placeholder.png',
      '/carousel/placeholder.png',
      '/carousel/placeholder.png',
      '/carousel/placeholder.png',
      '/carousel/placeholder.png',
    ],
  },

  about: {
    title: 'About',
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
        href: '#',
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
        href: '#',
      },
      {
        name: 'goldman sachs',
        description: 'full-stack on client onboarding for wealth management, modernizing workflows for advisors and operations teams',
        href: '#',
      },
      {
        name: 'hypno',
        description: 'creative workflow platform for event production and branded content galleries',
        href: '#',
      },
      {
        name: 'vbn',
        description: 'browser-based video conferencing and event streaming platform',
        href: '#',
      },
      {
        name: 'artswrk',
        description: 'launched an arts and entertainment professional network end-to-end',
        href: '#',
      },
    ],
  },

  footer: {
    links: [
      {
        name: 'x',
        href: '#',
        image: '/brand/footer-x.png',
      },
      {
        name: 'linkedin',
        href: '#',
        image: '/brand/footer-linkedin.png',
      },
      {
        name: 'github',
        href: '#',
        image: '/brand/footer-github.png',
      },
      {
        name: 'email',
        href: '#',
        image: '/brand/footer-email.png',
      },
    ],
  },

  // Terrain tunables - expose for easy adjustment
  terrain: {
    colors: ['#FF1493', '#00CED1', '#FFD700', '#9370DB', '#00FF00'],
    animationSpeed: 0.0005,
    contourBands: 12,
    noiseScale: 1.5,
  },
} as const;
