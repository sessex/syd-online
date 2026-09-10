import assert from 'node:assert/strict';
import test from 'node:test';
import type { ApertureFrame } from './entrance-motion';

const { aperturePath, createApertureKeyframes, smoothstep }: typeof import('./entrance-motion') =
  await import(new URL('./entrance-motion.ts', import.meta.url).href);

type Point = readonly [number, number];

const frames: ApertureFrame[] = [
  { x: 36, y: 48, width: 1340, height: 680, radius: 24 },
  { x: 10, y: 16, width: 370, height: 760, radius: 18 },
  { x: 0, y: 0, width: 640, height: 640, radius: 0 },
  { x: 28.5, y: 45.75, width: 1440.25, height: 400.5, radius: 24 },
  { x: 8, y: 14, width: 320, height: 900, radius: 16 },
];

function points(path: string): Point[] {
  const numbers = path.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)!.map(Number);
  return Array.from({ length: numbers.length / 2 }, (_, index) => [
    numbers[index * 2], numbers[index * 2 + 1],
  ]);
}

function outline(path: string): Point[] {
  const controls = points(path);
  const result: Point[] = [];
  for (let segment = 0; segment < 12; segment++) {
    const [a, b, c, d] = controls.slice(segment * 3, segment * 3 + 4);
    for (let step = 0; step < 24; step++) {
      const t = step / 24;
      const s = 1 - t;
      result.push([
        s ** 3 * a[0] + 3 * s ** 2 * t * b[0] + 3 * s * t ** 2 * c[0] + t ** 3 * d[0],
        s ** 3 * a[1] + 3 * s ** 2 * t * b[1] + 3 * s * t ** 2 * c[1] + t ** 3 * d[1],
      ]);
    }
  }
  return result;
}

function radialExtent(polygon: Point[], center: Point, angle: number): number {
  const direction: Point = [Math.cos(angle), Math.sin(angle)];
  const cross = (a: Point, b: Point) => a[0] * b[1] - a[1] * b[0];
  let extent = 0;
  polygon.forEach((point, index) => {
    const next = polygon[(index + 1) % polygon.length];
    const offset: Point = [point[0] - center[0], point[1] - center[1]];
    const edge: Point = [next[0] - point[0], next[1] - point[1]];
    const denominator = cross(direction, edge);
    if (Math.abs(denominator) < 1e-12) return;
    const distance = cross(offset, edge) / denominator;
    const alongEdge = cross(offset, direction) / denominator;
    if (alongEdge >= -1e-9 && alongEdge <= 1 + 1e-9) extent = Math.max(extent, distance);
  });
  return extent;
}

test('the opening stays centered and inside the frame, with matching segment topology', () => {
  for (const frame of frames) {
    const center: Point = [frame.x + frame.width / 2, frame.y + frame.height / 2];
    for (const point of points(aperturePath(frame, 0))) assert.deepEqual(point, center);
    const keyframes = createApertureKeyframes(frame);
    assert.equal(keyframes.length, 121);
    assert.equal(keyframes[0], aperturePath(frame, 0));
    assert.equal(keyframes.at(-1), aperturePath(frame, 1));
    for (const path of keyframes) {
      assert.equal(path.match(/C/g)?.length, 12);
      const controls = points(path);
      assert.equal(controls.length, 37);
      for (const [x, y] of controls) {
        assert.ok(x >= frame.x - 1e-9 && x <= frame.x + frame.width + 1e-9);
        assert.ok(y >= frame.y - 1e-9 && y <= frame.y + frame.height + 1e-9);
      }
      const xs = controls.map(([x]) => x);
      assert.ok(Math.abs(Math.min(...xs) + Math.max(...xs) - center[0] * 2) < 1e-9);
    }
  }
});

test('the heart reveals continuously outward without covering previously revealed artwork', () => {
  for (const frame of frames) {
    const center: Point = [frame.x + frame.width / 2, frame.y + frame.height / 2];
    let previous = Array<number>(96).fill(0);
    for (let step = 1; step <= 120; step++) {
      const polygon = outline(aperturePath(frame, step / 120));
      const extents = previous.map((before, index) => {
        const current = radialExtent(polygon, center, index * Math.PI * 2 / previous.length);
        assert.ok(current >= before - .015, `Reveal reversed at t=${step / 120}, ray=${index}`);
        return current;
      });
      previous = extents;
    }
  }
});

test('the final aperture meets the inner frame edges and rounded corner tangents exactly', () => {
  for (const frame of frames) {
    const { x, y, width: w, height: h, radius: r } = frame;
    const anchors = points(aperturePath(frame, 1)).filter((_, index) => index % 3 === 0);
    assert.deepEqual(anchors, [
      [x + w / 2, y], [x + r, y], [x, y + r], [x, y + h / 2],
      [x, y + h - r], [x + r, y + h], [x + w / 2, y + h],
      [x + w - r, y + h], [x + w, y + h - r], [x + w, y + h / 2],
      [x + w, y + r], [x + w - r, y], [x + w / 2, y],
    ]);
  }
});

test('the reveal starts and ends at rest and preserves the early heart aspect ratio', () => {
  assert.equal(smoothstep(-1), 0);
  assert.equal(smoothstep(2), 1);
  const epsilon = 1e-5;
  assert.ok(smoothstep(epsilon) / epsilon < 1e-7);
  assert.ok((1 - smoothstep(1 - epsilon)) / epsilon < 1e-7);
  for (const frame of frames) {
    const a = points(aperturePath(frame, .1));
    const b = points(aperturePath(frame, .2));
    const cx = frame.x + frame.width / 2;
    const cy = frame.y + frame.height / 2;
    const ratio = smoothstep(.2 / .7) / smoothstep(.1 / .7);
    a.forEach(([x, y], index) => {
      assert.ok(Math.abs((x - cx) * ratio - (b[index][0] - cx)) < 1e-9);
      assert.ok(Math.abs((y - cy) * ratio - (b[index][1] - cy)) < 1e-9);
    });
  }
});
