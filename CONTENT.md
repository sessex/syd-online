# Content and Asset Guide

This document explains how to swap content, images, and links in Sydney's landing page.

## Single Source of Truth

All content is managed in **`src/content/site.ts`**. Edit this file to update:

- Copy text for all sections
- Asset paths for images
- Links and hrefs
- Terrain visual parameters

## Asset Structure

### Brand Assets
Place PNG files in `public/brand/`:

- `name.png` - "SYDNEY ESSEX" bead lettering (transparent PNG)
- `subtitle.png` - "product engineer based in nyc" (transparent PNG)
- `footer.png` - Combined X / LinkedIn / GitHub / email bead strip

### Carousel Images
Place model cutout PNGs in `public/carousel/`:

- `placeholder.png` - Currently repeated 5 times
- Future: Add unique filenames (e.g., `model-1.png`, `model-2.png`) and update the `carousel.images` array in `src/content/site.ts`

**Tip**: For best results, use transparent PNG cutouts with models centered.

## Swapping Content

### Text Content
Edit sections in `src/content/site.ts`:

```typescript
about: {
  paragraphs: [
    'Your first paragraph...',
    'Your second paragraph...',
  ],
}
```

### Links
Update hrefs in the config:

```typescript
projects: {
  items: [
    { name: 'project name', blurb: 'one-line summary', description: '...',
      dateLabel: '2026', dateDescription: '2026', href: 'https://...' },
  ],
}
```

### Terrain Tunables
Adjust visual parameters:

```typescript
terrain: {
  palette: ['#510BF5', '#75FBFA', '#78FC4C', '#EAFE53', '#EE7F31', '#EA337B'],
  scale: 2.6,
  warp: 1.1,
  detail: 5,
  contrast: 1.7,
  spread: 0,
  seed: 7,
  grain: 0.3,
  motion: {
    intensity: 0.6,
    loopSeconds: 2.5,
  },
}
```

The shader applies value-noise domain warping, static pixel grain, and hard
palette bands. Adjust field values incrementally; grain is intentionally
applied before palette quantization so the bead artwork remains on a clean,
transparent layer above the terrain.

## Typography

Body sections use self-hosted Raveo, with a 43px introductory lead and 46px
item titles on desktop. On phones these become 34px and 30px. Dates and
one-line blurbs stay visible; the full row opens the description and visit link.
Use `href: '#'` for an unavailable destination. It renders a status instead of a
link, with optional `linkStatus` copy such as Iris's "in development for iOS".

The title hover adds a short pink/green chroma wave. Disclosure transitions take
320ms to open and 280ms to close. Both honor reduced motion. The timings, colors,
and responsive layout live in `src/components/PostHero.module.css`.

## Next Steps

1. Replace brand PNG assets in `public/brand/` while keeping their filenames
2. Add carousel cutouts to `public/carousel/`
3. Update `src/content/site.ts` with real links and copy
4. Adjust terrain field values if needed

No code changes required for content swaps.
