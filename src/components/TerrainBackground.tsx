'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Component, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import * as THREE from 'three';
import { siteContent } from '@/content/site';

const motionQuery = '(prefers-reduced-motion: reduce)';

function subscribeToMotionPreference(onChange: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function getMotionPreference() {
  return window.matchMedia(motionQuery).matches;
}

function getServerMotionPreference() {
  return true;
}

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  uniform float uTime;
  uniform float uDpr;
  uniform vec3 uPalette[5];
  uniform float uDither;
  uniform float uDitherCellSize;
  uniform float uMotionIntensity;
  uniform float uLoopSeconds;
  varying vec2 vUv;

  float hash(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * 0.1031);
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
  }

  float noise(vec2 p) {
    vec2 cell = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(cell), hash(cell + vec2(1.0, 0.0)), f.x),
      mix(hash(cell + vec2(0.0, 1.0)), hash(cell + 1.0), f.x),
      f.y
    );
  }

  float hill(vec2 p, vec2 center, vec2 radius) {
    vec2 q = (p - center) / radius;
    return exp(-dot(q, q));
  }

  float bayer2(vec2 p) {
    p = mod(p, 2.0);
    return mod(p.x + p.y, 2.0) * 2.0 + p.y;
  }

  vec3 ink(float h) {
    vec3 color = mix(uPalette[0], uPalette[1], smoothstep(0.12, 0.30, h));
    color = mix(color, uPalette[2], smoothstep(0.30, 0.48, h));
    color = mix(color, uPalette[3], smoothstep(0.48, 0.62, h));
    return mix(color, uPalette[4], smoothstep(0.70, 0.98, h));
  }

  void main() {
    float phase = uTime / uLoopSeconds * 6.28318530718;
    // The color masses breathe locally; the texture stays fixed to the page.
    vec2 drift = vec2(sin(phase), cos(phase) - 1.0) * uMotionIntensity;
    vec2 p = vUv;
    vec2 warp = vec2(
      noise(p * 3.5 + drift + vec2(7.0, 2.0)),
      noise(p * 3.5 - drift + vec2(2.0, 9.0))
    ) - 0.5;
    p += warp * 0.23 + drift * 0.16;

    // A quiet pink center leaves room for the cutouts. Cooler peaks and
    // narrow warm/green contours gather near the edges, as in the reference.
    float height = 0.65 + (noise(p * 5.0 + 4.0) - 0.5) * 0.12;
    height += 0.39 * hill(p, vec2(0.56, -0.06), vec2(0.26, 0.32));
    height += 0.29 * hill(p, vec2(0.67, 0.96), vec2(0.24, 0.34));
    height -= 0.72 * hill(p, vec2(-0.09, 0.58), vec2(0.24, 0.30));
    height -= 0.62 * hill(p, vec2(0.99, 0.20), vec2(0.19, 0.15));
    height -= 0.23 * hill(p, vec2(1.02, 0.96), vec2(0.15, 0.19));

    // Four-by-four ordered dithering at a stable CSS-pixel scale. A tiny
    // static irregularity softens the grid without introducing moving grain.
    vec2 pixel = floor(gl_FragCoord.xy / uDpr / uDitherCellSize);
    float ordered = (4.0 * bayer2(pixel) + bayer2(floor(pixel / 2.0)) + 0.5) / 16.0;
    height += (ordered - 0.5) * uDither;
    height += (hash(pixel) - 0.5) * 0.015;
    vec3 color = ink(clamp(height, 0.0, 1.0));
    color *= 1.0 + (ordered - 0.5) * 0.065;
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

function TerrainMesh({ animated }: { animated: boolean }) {
  const elapsedRef = useRef(0);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const dpr = useThree((state) => state.viewport.dpr);
  const invalidate = useThree((state) => state.invalidate);
  const { palette, dither, ditherCellSize, motion } = siteContent.terrain;
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDpr: { value: dpr },
      uPalette: { value: palette.map((color) => new THREE.Color(color)) },
      uDither: { value: dither },
      uDitherCellSize: { value: ditherCellSize },
      uMotionIntensity: { value: motion.intensity },
      uLoopSeconds: { value: motion.loopSeconds },
    }),
    [dither, ditherCellSize, dpr, motion.intensity, motion.loopSeconds, palette]
  );

  useEffect(() => {
    if (!animated) return;
    const timer = window.setInterval(invalidate, 1000 / 24);
    return () => window.clearInterval(timer);
  }, [animated, invalidate]);

  useFrame((_, delta) => {
    if (!animated || !materialRef.current) return;
    // A resumed demand loop can report the entire time spent offscreen.
    elapsedRef.current = (elapsedRef.current + Math.min(delta, 0.1)) % motion.loopSeconds;
    materialRef.current.uniforms.uTime.value = elapsedRef.current;
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        toneMapped={false}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

class TerrainFallback extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function TerrainBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useSyncExternalStore(
    subscribeToMotionPreference,
    getMotionPreference,
    getServerMotionPreference
  );
  const [onScreen, setOnScreen] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(element);
    const updateVisibility = () => setPageVisible(document.visibilityState === 'visible');
    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  const animated = shouldReduceMotion === false && onScreen && pageVisible;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        background: 'radial-gradient(ellipse at 58% 100%, #d6a1fa, transparent 45%), radial-gradient(ellipse at 65% 0%, #d6a1fa, transparent 45%), #ea337b',
      }}
    >
      <TerrainFallback>
        <Canvas
          frameloop="demand"
          camera={{ position: [0, 0, 1] }}
          dpr={[1, 1.5]}
          flat
          fallback={null}
          gl={{ alpha: false, antialias: false, powerPreference: 'low-power' }}
        >
          <TerrainMesh animated={animated} />
        </Canvas>
      </TerrainFallback>
    </div>
  );
}
