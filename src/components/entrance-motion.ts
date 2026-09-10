export type ApertureFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
};

type Point = readonly [number, number];
type Cubic = readonly [Point, Point, Point, Point];

/** Minimum-jerk timing: position, velocity and acceleration meet at each endpoint. */
export function smoothstep(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * t * (10 + t * (-15 + t * 6));
}

const mix = (a: Point, b: Point, t: number): Point => t === 0 ? a : t === 1 ? b : [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];

function split(cubic: Cubic): readonly [Cubic, Cubic] {
  const [a, b, c, d] = cubic;
  const ab = mix(a, b, .5);
  const bc = mix(b, c, .5);
  const cd = mix(c, d, .5);
  const abc = mix(ab, bc, .5);
  const bcd = mix(bc, cd, .5);
  const middle = mix(abc, bcd, .5);
  return [[a, ab, abc, middle], [middle, bcd, cd, d]];
}

// Fixed point correspondence keeps the contour continuous throughout the reveal.
// Splitting preserves the heart exactly while matching the rectangle's 12 segments.
const HEART: readonly Cubic[] = ([
  [[0, -.55], [-.2, -.92], [-.5, -1], [-.72, -.85]],
  [[-.72, -.85], [-1.12, -.62], [-1.03, -.17], [-.76, .14]],
  [[-.76, .14], [-.55, .42], [-.23, .73], [0, .95]],
  [[0, .95], [.23, .73], [.55, .42], [.76, .14]],
  [[.76, .14], [1.03, -.17], [1.12, -.62], [.72, -.85]],
  [[.72, -.85], [.5, -1], [.2, -.92], [0, -.55]],
] satisfies readonly Cubic[]).flatMap(split);

const line = (a: Point, b: Point): Cubic => [a, mix(a, b, 1 / 3), mix(a, b, 2 / 3), b];

function roundedRectangle(frame: ApertureFrame): readonly Cubic[] {
  const { x: left, y: top, width, height } = frame;
  const right = left + width;
  const bottom = top + height;
  const cx = left + width / 2;
  const cy = top + height / 2;
  const r = Math.max(0, Math.min(frame.radius, width / 2, height / 2));
  const k = r * (4 * (Math.SQRT2 - 1) / 3);
  return [
    line([cx, top], [left + r, top]),
    [[left + r, top], [left + r - k, top], [left, top + r - k], [left, top + r]],
    line([left, top + r], [left, cy]),
    line([left, cy], [left, bottom - r]),
    [[left, bottom - r], [left, bottom - r + k], [left + r - k, bottom], [left + r, bottom]],
    line([left + r, bottom], [cx, bottom]),
    line([cx, bottom], [right - r, bottom]),
    [[right - r, bottom], [right - r + k, bottom], [right, bottom - r + k], [right, bottom - r]],
    line([right, bottom - r], [right, cy]),
    line([right, cy], [right, top + r]),
    [[right, top + r], [right, top + r - k], [right - r + k, top], [right - r, top]],
    line([right - r, top], [cx, top]),
  ];
}

/** One centered heart grows and relaxes into the frame without an intermediate stop. */
export function aperturePath(frame: ApertureFrame, progress: number): string {
  // Keep growth overlapping the morph: larger, earlier lobes can retreat as their
  // matched rectangle points spread sideways, briefly covering the artwork again.
  const size = Math.min(frame.width, frame.height) * .32 * smoothstep(progress / .7);
  const blend = smoothstep((progress - .3) / .7);
  const cx = frame.x + frame.width / 2;
  const cy = frame.y + frame.height / 2;
  const rectangle = roundedRectangle(frame);
  const segments = HEART.map((segment, index) => segment.map((point, control) => {
    const heart: Point = [cx + point[0] * size, cy + point[1] * size];
    return mix(heart, rectangle[index][control], blend);
  }));
  const format = (point: Point) => `${point[0]} ${point[1]}`;
  return `M ${format(segments[0][0])} ${segments.map((segment) => (
    `C ${format(segment[1])} ${format(segment[2])} ${format(segment[3])}`
  )).join(' ')} Z`;
}

/** Uniform timestamps; geometry already contains its easing and should play linearly. */
export function createApertureKeyframes(frame: ApertureFrame): string[] {
  return Array.from({ length: 121 }, (_, index) => aperturePath(frame, index / 120));
}
