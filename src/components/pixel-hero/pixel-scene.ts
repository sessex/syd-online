/** Art-directed, deterministic pixel painting. The two plates are drawn once;
 * animation and optical distortion belong to the renderer, not the painting. */
const WIDTH = 480;
const HEIGHT = 360;

type Color = readonly [number, number, number];
type Cloud = { x: number; y: number; width: number; height: number; seed: number };

const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value));
const mix = (a: number, b: number, amount: number) => a + (b - a) * amount;
const smooth = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};
const hash = (x: number, y: number, seed = 0) => {
  let n = Math.imul(x + seed * 113, 374761393) + Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
};
const noise = (x: number, y: number, seed = 0) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const tx = smooth(x - ix);
  const ty = smooth(y - iy);
  return mix(mix(hash(ix, iy, seed), hash(ix + 1, iy, seed), tx),
    mix(hash(ix, iy + 1, seed), hash(ix + 1, iy + 1, seed), tx), ty);
};
const fractal = (x: number, y: number, seed: number) =>
  noise(x, y, seed) * 0.57 + noise(x * 2.07, y * 2.07, seed + 1) * 0.28 +
  noise(x * 4.13, y * 4.13, seed + 2) * 0.15;

// A restrained ordered dither, rather than uncorrelated grain, preserves the
// alternating pixel structure in the original 1990s landscape reference.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const dither = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5;
const blend = (a: Color, b: Color, amount: number): Color => [
  mix(a[0], b[0], amount), mix(a[1], b[1], amount), mix(a[2], b[2], amount),
];
const palette: Color[] = [
  [12, 46, 49], [22, 70, 33], [32, 101, 19], [51, 133, 7],
  [78, 166, 1], [118, 192, 2], [162, 216, 6], [203, 234, 22], [228, 247, 67],
];
function grassColor(light: number): Color {
  const p = clamp(light) * (palette.length - 1);
  const index = Math.floor(p);
  return blend(palette[index], palette[Math.min(index + 1, palette.length - 1)], p - index);
}
function horizon(u: number) {
  return 0.577 - 0.037 * Math.exp(-Math.pow((u - 0.25) / 0.27, 2)) +
    0.099 * smooth((u - 0.33) / 0.67);
}
function canvas() {
  const element = document.createElement("canvas");
  element.width = WIDTH;
  element.height = HEIGHT;
  return element;
}
function paintLandscape(element: HTMLCanvasElement) {
  const ctx = element.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is unavailable");
  const image = ctx.createImageData(WIDTH, HEIGHT);

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const u = x / WIDTH;
      const v = y / HEIGHT;
      const crest = horizon(u);
      let color: Color;
      const checker = dither(x, y);

      if (v < crest) {
        // Broad, diagonal wisps of color in a blue sky. Quiet behind the name,
        // with increasing azure and texture closer to the horizon.
        const wind = v - u * 0.14 + Math.sin(u * 7) * 0.013;
        const streak = fractal(u * 3.5 + v * 2, wind * 20, 18);
        const skyT = clamp(v / 0.72 + (streak - 0.5) * 0.27);
        color = blend([1, 35, 255], [72, 181, 255], skyT);
        const ditherWisp = smooth((noise(u * 7, wind * 23, 36) - 0.39) * 4);
        const skyChecker = ((x + y) & 1) === 0 ? 0.5 : -0.5;
        const texture = (noise(x / 4, y / 4, 9) - 0.5) * 4 +
          skyChecker * (5 + ditherWisp * 34) + (ditherWisp - 0.5) * 10;
        color = [color[0] + texture * 0.3, color[1] + texture, color[2]];
        // A distant blue foothill at the right edge, behind the green crest.
        const ridge = 0.665 - 0.052 * Math.exp(-Math.pow((u - 0.94) / 0.055, 2)) +
          (noise(x / 15, 1, 8) - 0.5) * 0.016;
        if (u > 0.80 && v > ridge) {
          const mountainLight = noise(x / 16, y / 5, 6) + checker * 0.3;
          color = blend([29, 70, 172], [117, 157, 233], clamp(mountainLight));
        }
      } else {
        const depth = clamp((v - crest) / (1 - crest));
        // Long horizontal contours bend with the hillside. Their shadows are
        // deliberately coherent; independent random pixels would read as static.
        const contour = v - u * 0.12 + 0.025 * Math.sin(u * 5.8 + 0.35);
        const broad = fractal(u * 3.5, contour * 24, 29);
        const furrow = noise(u * 5, contour * 125, 51);
        const meadow = noise(u * 11, contour * 65, 43);
        const foreground = smooth((depth - 0.5) / 0.5);
        const fine = mix(noise(x * 0.20, y * 0.72, 77), noise(x * 0.7, y * 0.20, 77), foreground);
        const ragged = (noise(x / 25, y / 8, 54) - 0.5) * 0.009;
        const band = (center: number, width: number) => Math.exp(-Math.pow((contour + ragged - center) / width, 2));
        // Deliberately raked swaths of sunlight and shadow establish the long
        // diagonal meadow bands. Fine grass detail follows their direction.
        const upperBands = band(0.625, 0.011) * 0.19 + band(0.671, 0.010) * 0.12 -
          band(0.700, 0.016) * 0.12 - band(0.769, 0.026) * 0.23;
        const lowerContour = v + u * 0.055 + 0.013 * Math.sin(u * 6);
        const lowerShadow = Math.exp(-Math.pow((lowerContour - 0.915) / 0.047, 2));
        const lowerRidge = Math.exp(-Math.pow((lowerContour - 0.864) / 0.011, 2));
        let light = 0.59 + (broad - 0.5) * 0.36 + (furrow - 0.5) * 0.30 +
          (meadow - 0.5) * 0.15 - depth * 0.24 + upperBands - lowerShadow * 0.18 + lowerRidge * 0.23;
        // Sunlight hits the upper-left slope; the descending right shoulder is
        // shaded, echoing the unmistakable Bliss silhouette.
        light += (1 - smooth(depth / 0.42)) * (0.23 - u * 0.33);
        light += (fine - 0.5) * mix(0.15, 0.25, foreground) + checker * mix(0.13, 0.17, depth);
        color = grassColor(light);
      }
      const offset = (y * WIDTH + x) * 4;
      image.data[offset] = clamp(color[0], 0, 255);
      image.data[offset + 1] = clamp(color[1], 0, 255);
      image.data[offset + 2] = clamp(color[2], 0, 255);
      image.data[offset + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);

  // Individual upright blades add scale at the bottom without turning the hill
  // into a repeated texture. Their length grows naturally toward the viewer.
  for (let i = 0; i < 6200; i++) {
    const x = Math.floor(hash(i, 10, 91) * WIDTH);
    const y = Math.floor(mix(horizon(x / WIDTH) * HEIGHT + 4, HEIGHT, hash(i, 20, 95)));
    const depth = clamp((y / HEIGHT - horizon(x / WIDTH)) / (1 - horizon(x / WIDTH)));
    if (hash(i, 15) > smooth((depth - 0.38) / 0.62) * 0.80) continue;
    const length = 1 + Math.floor(depth * hash(i, 30, 92) * 5);
    const lit = hash(i, 40, 3) > 0.64;
    ctx.fillStyle = lit ? `rgba(157,204,12,${0.18 + depth * 0.21})` : `rgba(8,61,37,${0.15 + depth * 0.22})`;
    ctx.fillRect(x, y - length, 1, length);
    if (length > 4) ctx.fillRect(x + (i % 2 ? 1 : -1), y - length + 2, 1, 2);
  }

  // Loose meadow clusters, with a few recognizable five-pixel flowers nearest
  // the camera. The distribution follows the bright bands, never the sky.
  for (let i = 0; i < 900; i++) {
    const x = Math.floor(hash(i, 1, 110) * WIDTH);
    const u = x / WIDTH;
    const y = Math.floor(mix(horizon(u) * HEIGHT + 35, HEIGHT - 3, hash(i, 2, 115)));
    const v = y / HEIGHT;
    const cluster = noise(u * 12, v * 14, 9);
    if (hash(i, 3, 17) > cluster * 0.62 || v < 0.69 + u * 0.04) continue;
    const size = v > 0.80 && hash(i, 5, 18) > 0.58 ? 2 : 1;
    ctx.fillStyle = i % 7 === 0 ? "#fffbc6" : i % 3 === 0 ? "#f4df23" : "#eaff36";
    ctx.fillRect(x, y, size, size);
    if (size === 2) {
      ctx.fillRect(x - 1, y + 1, 4, 1);
      ctx.fillRect(x + 1, y - 1, 1, 4);
      ctx.fillStyle = "#ffcc21";
      ctx.fillRect(x + 1, y + 1, 1, 1);
    }
  }
}

const CLOUDS: Cloud[] = [
  { x: 0.18, y: 0.365, width: 0.17, height: 0.092, seed: 11 },
  { x: 0.025, y: 0.515, width: 0.22, height: 0.106, seed: 24 },
  { x: 0.355, y: 0.531, width: 0.14, height: 0.039, seed: 31 },
  { x: 0.516, y: 0.434, width: 0.18, height: 0.103, seed: 42 },
  { x: 0.696, y: 0.469, width: 0.091, height: 0.074, seed: 60 },
  { x: 0.773, y: 0.377, width: 0.16, height: 0.087, seed: 75 },
  { x: 0.828, y: 0.477, width: 0.18, height: 0.108, seed: 84 },
  { x: 0.996, y: 0.353, width: 0.13, height: 0.107, seed: 97 },
  { x: 0.972, y: 0.53, width: 0.07, height: 0.05, seed: 105 },
  { x: 0.578, y: 0.561, width: 0.074, height: 0.042, seed: 121 },
  { x: 0.663, y: 0.574, width: 0.077, height: 0.05, seed: 133 },
  { x: 0.773, y: 0.602, width: 0.14, height: 0.067, seed: 148 },
  { x: 0.886, y: 0.615, width: 0.15, height: 0.075, seed: 159 },
  { x: 1.008, y: 0.608, width: 0.11, height: 0.054, seed: 171 },
];

const CLOUD_LOBES = [
  [-0.44, 0.12, 0.14, 0.17], [-0.26, -0.02, 0.19, 0.32],
  [-0.08, -0.13, 0.19, 0.46], [0.13, -0.02, 0.21, 0.37],
  [0.33, 0.15, 0.18, 0.26], [0.48, 0.29, 0.19, 0.14],
] as const;

function paintClouds(element: HTMLCanvasElement) {
  const ctx = element.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is unavailable");
  const image = ctx.createImageData(WIDTH, HEIGHT);
  for (const cloud of CLOUDS) {
    const cx = cloud.x * WIDTH;
    const cy = cloud.y * HEIGHT;
    const width = cloud.width * WIDTH;
    const height = cloud.height * HEIGHT;
    const left = Math.max(0, Math.floor(cx - width * 1.18));
    const right = Math.min(WIDTH, Math.ceil(cx + width * 0.85));
    const top = Math.max(Math.ceil(HEIGHT * 0.29), Math.floor(cy - height * 0.70));
    const bottom = Math.min(HEIGHT, Math.ceil(cy + height * 0.74));

    for (let y = top; y < bottom; y++) {
      for (let x = left; x < right; x++) {
        if (y > horizon(x / WIDTH) * HEIGHT - 2) continue;
        const dx = (x - cx) / width;
        const dy = (y - cy) / height;
        const warp = (noise(x / 5, y / 4, cloud.seed) - 0.5) * 0.085;
        let mass = -10;
        // Overlapping unequal lobes have sunlit high tops and a swept right
        // underside, avoiding both vector ellipses and a repeated cloud stamp.
        for (let lobe = 0; lobe < CLOUD_LOBES.length; lobe++) {
          const [baseX, baseY, baseWidth, baseHeight] = CLOUD_LOBES[lobe];
          const lx = baseX + (hash(lobe, cloud.seed, 1) - 0.5) * 0.075;
          const ly = baseY + (hash(lobe, cloud.seed, 4) - 0.5) * 0.14;
          const rx = baseWidth * (0.9 + hash(lobe, cloud.seed, 2) * 0.24);
          const ry = baseHeight * (0.86 + hash(lobe, cloud.seed, 3) * 0.34);
          const ellipse = 1 - Math.pow((dx - lx + dy * 0.16) / rx, 2) - Math.pow((dy - ly) / ry, 2);
          mass = Math.max(mass, ellipse);
        }
        const fringe = noise(x / 2.4, y / 2.5, cloud.seed + 6);
        mass += warp * 3 + (fringe - 0.5) * 0.22;
        // Wispy tails taper into thin, broken diagonal streamers.
        const tailLine = 0.24 + dx * 0.30;
        const tailDistance = Math.min(Math.abs(dy - tailLine),
          Math.abs(dy - tailLine - 0.20) * 1.7);
        const tail = dx < 0.2 && dx > -1.1 && tailDistance < 0.020 + (dx + 1.1) * 0.055;
        if (mass < 0 && !(tail && fringe > 0.44)) continue;
        const shade = clamp((dy + 0.18 + dx * 0.18) * 1.55 +
          (noise(x / 7, y / 6, cloud.seed + 9) - 0.5) * 0.53);
        const checker = ((x + y) & 1) === 0 ? 0.23 : -0.23;
        const quantized = clamp(Math.round((shade + checker * smooth(shade * 4)) * 5) / 5);
        let color = quantized < 0.42
          ? blend([255, 255, 226], [255, 212, 242], quantized / 0.42)
          : blend([238, 219, 251], [92, 153, 236], (quantized - 0.42) / 0.58);
        if (mass < 0.12) color = blend(color, [147, 201, 255], 0.28);
        const offset = (y * WIDTH + x) * 4;
        image.data[offset] = color[0];
        image.data[offset + 1] = color[1];
        image.data[offset + 2] = color[2];
        image.data[offset + 3] = mass < 0 ? 135 : mass < 0.08 ? 210 : 255;
      }
    }
  }
  ctx.putImageData(image, 0, 0);
}

let cachedScene: { landscape: HTMLCanvasElement; clouds: HTMLCanvasElement } | undefined;

export function createPixelScene(): { landscape: HTMLCanvasElement; clouds: HTMLCanvasElement } {
  if (cachedScene) return cachedScene;
  const landscape = canvas();
  const clouds = canvas();
  paintLandscape(landscape);
  paintClouds(clouds);
  cachedScene = { landscape, clouds };
  return cachedScene;
}
