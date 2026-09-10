/**
 * Single source of truth for all site content, asset paths, and links.
 * Swap copy and images here without touching components.
 */

export const siteContent = {
  hero: {
    // Brand assets - prefer transparent PNG, fallback to SVG or text
    name: {
      image: '/brand/name-sparkle.png',
      fallback: 'SYDNEY ESSEX',
    },
    subtitle: {
      image: '/brand/subtitle-sparkle.png',
      fallback: 'product engineer based in nyc',
    },
  },

  carousel: {
    images: [
      { src: '/carousel/bunny.png', width: 1024, height: 1536, alt: 'Sydney posing with a bunny in a floral outfit' },
      { src: '/carousel/bow2.png', width: 1024, height: 1536, alt: 'Sydney in a black outfit with an oversized pink bow' },
      { src: '/carousel/chicken.png', width: 1122, height: 1402, alt: 'Sydney holding a chicken in a yellow skirt' },
      { src: '/carousel/werk.png', width: 1123, height: 1401, alt: 'Sydney seated with a coffee and a telephone' },
      { src: '/carousel/dance.png', width: 1087, height: 1447, alt: 'Sydney kicking up a boot in a colorful outfit' },
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
        blurb: 'secondhand fashion finder',
        description: 'paste a retail product link to find matching pieces on Vestiaire Collective, ranked by value. past sale prices help you decide whether to buy now or wait.',
        href: 'https://trouv.vercel.app/',
        dateLabel: '2026',
        dateDescription: '2026',
      },
      {
        name: 'iris',
        blurb: 'color hunting with friends',
        description: 'an iOS app for color hunting with friends.',
        href: '#',
        linkStatus: 'coming soon',
        dateLabel: '2026',
        dateDescription: '2026',
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
        blurb: 'brand-aware image tools',
        dateLabel: '2026–present',
        dateDescription: 'March 2026 to present',
      },
      {
        name: 'goldman sachs',
        description: 'full-stack on client onboarding for wealth management, modernizing workflows for advisors and operations teams',
        href: '#',
        blurb: 'wealth client onboarding',
        dateLabel: '2024–26',
        dateDescription: 'September 2024 to March 2026',
      },
      {
        name: 'hypno',
        description: 'creative workflow platform for event production and branded content galleries',
        href: 'https://app.hypno.com/',
        blurb: 'event & content workflows',
        dateLabel: '2023–24',
        dateDescription: 'February 2023 to September 2024',
      },
      {
        name: 'vbn',
        description: 'browser-based video conferencing and event streaming platform',
        href: 'https://www.linkedin.com/company/vbnxyz/',
        blurb: 'video calls & live streaming',
        dateLabel: '2021–23',
        dateDescription: 'September 2021 to February 2023',
      },
      {
        name: 'artswrk',
        description: 'launched an arts and entertainment professional network end-to-end',
        href: 'https://artswrk.com/',
        blurb: 'a network for arts professionals',
        dateLabel: '2020–21',
        dateDescription: 'June 2020 to September 2021',
      },
    ],
  },

  footer: {
    separator: { src: '/brand/footer-star.png', width: 1377, height: 1142 },
    links: [
      {
        name: 'x',
        href: 'https://x.com/waifu101',
        image: { src: '/brand/footer-x.png', width: 1306, height: 1204 },
      },
      {
        name: 'linkedin',
        href: 'https://www.linkedin.com/in/sydneyessex/',
        image: { src: '/brand/footer-linkedin.png', width: 2172, height: 724 },
      },
      {
        name: 'github',
        href: 'https://github.com/sessex',
        image: { src: '/brand/footer-github.png', width: 2084, height: 755 },
      },
      {
        name: 'email',
        href: 'mailto:sydneyressex@gmail.com',
        image: { src: '/brand/footer-email.png', width: 1893, height: 831 },
      },
    ],
  },

} as const;
