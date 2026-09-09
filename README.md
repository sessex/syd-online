# Sydney Essex — Personal Landing Page

Personal landing page built with Next.js 16, featuring dynamic R3F terrain background and infinite carousel.

## Features

- **Dynamic Terrain**: WebGL shader-based background with psychedelic contour bands, grain, and subtle animation
- **Infinite Carousel**: Seamless horizontal loop powered by Framer Motion
- **Single Content Source**: All copy, links, and asset paths managed in `src/content/site.ts`
- **Swappable Assets**: Drop-in PNG replacements with automatic fallbacks
- **Responsive Design**: Mobile-friendly layout throughout

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the landing page.

## Content Management

All content is managed in **`src/content/site.ts`**:

- Hero copy and asset paths
- Carousel images
- About, Projects, Experience text
- All external links
- Terrain visual parameters (colors, animation speed, contour bands)

See `CONTENT.md` for detailed asset structure and swapping guide.

## Asset Structure

```
public/
  brand/
    name.png          # "SYDNEY ESSEX" bead lettering
    subtitle.png      # "product engineer based in nyc"
    footer.png        # Contact strip with pink stars
  carousel/
    placeholder.png   # Model cutout (currently repeated)
```

## Tech Stack

- **Next.js 16** (App Router)
- **React 19**
- **Tailwind CSS 4**
- **React Three Fiber** (3D terrain)
- **Framer Motion** (carousel animation)
- **TypeScript**

## Build

```bash
npm run build
npm start
```

## Development

- `src/app/` — Next.js app routes
- `src/components/` — Hero, TerrainBackground, ModelCarousel, About, Projects, Experience, Footer
- `src/content/` — Content configuration
- `public/` — Static assets (brand, carousel images)

## Customization

### Terrain Visuals

Edit `src/content/site.ts`:

```typescript
terrain: {
  colors: ['#FF1493', '#00CED1', '#FFD700', '#9370DB', '#00FF00'],
  animationSpeed: 0.0005,
  contourBands: 12,
  noiseScale: 1.5,
}
```

### Typography

Body sections use Helvetica Neue stack:
- Font: "Helvetica Neue", Helvetica, Arial, sans-serif
- Size: 36px
- Letter-spacing: -3% (-0.03em)
- Titles: bold / Body: regular

## License

Private project — Sydney Essex
