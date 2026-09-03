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
    { name: 'project name', description: '...', href: 'https://...' },
  ],
}
```

### Terrain Tunables
Adjust visual parameters:

```typescript
terrain: {
  palette: ['#7A27BD', '#E6308E', '#F1347C', '#F07F32', '#EAFE53', '#71EA0C'],
  scale: 2.6,
  warp: 1.1,
  detail: 5,
  contrast: 3.2,
  offset: -0.22,
  spread: -0.5,
  seed: 7,
  grain: 0.34,
  motion: {
    intensity: 0.1,
    loopSeconds: 12,
  },
}
```

The shader applies value-noise domain warping, static pixel grain, and hard
palette bands. Adjust field values incrementally; grain is intentionally
applied before palette quantization so the bead artwork remains on a clean,
transparent layer above the terrain.

## Typography

Body sections use:
- **Font**: Helvetica Neue (system fallback stack)
- **Size**: 36px
- **Letter spacing**: -3% (-0.03em)
- **Section titles**: Bold
- **Body text**: Regular

## Next Steps

1. Replace brand PNG assets in `public/brand/` while keeping their filenames
2. Add carousel cutouts to `public/carousel/`
3. Update `src/content/site.ts` with real links and copy
4. Adjust terrain field values if needed

No code changes required for content swaps.
