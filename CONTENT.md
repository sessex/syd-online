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
- `footer-x.png` - X/Twitter bead label
- `footer-linkedin.png` - LinkedIn bead label
- `footer-github.png` - GitHub bead label
- `footer-email.png` - Email bead label

**Fallbacks**: If PNG assets are missing, the site displays styled text automatically.

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
  title: 'About',
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
  colors: ['#FF1493', '#00CED1', ...],  // Array of hex colors
  animationSpeed: 0.0005,                // Higher = faster
  contourBands: 12,                      // More = denser lines
  noiseScale: 1.5,                       // Higher = more detailed
}
```

## Typography

Body sections use:
- **Font**: Helvetica Neue (system fallback stack)
- **Size**: 36px
- **Letter spacing**: -3% (-0.03em)
- **Section titles**: Bold
- **Body text**: Regular

## Next Steps

1. Drop brand PNG assets into `public/brand/`
2. Add carousel cutouts to `public/carousel/`
3. Update `src/content/site.ts` with real links and copy
4. Adjust terrain colors/animation if needed

No code changes required for content swaps.
