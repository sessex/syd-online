'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useReducedMotion } from 'framer-motion';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { siteContent } from '@/content/site';

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
  uniform vec2 uResolution;
  uniform vec3 uPalette[6];
  uniform float uScale;
  uniform float uWarp;
  uniform float uDetail;
  uniform float uContrast;
  uniform float uSpread;
  uniform float uSeed;
  uniform float uGrain;
  uniform float uBlockiness;
  uniform float uBands;
  uniform float uMotionIntensity;
  uniform float uLoopSeconds;
  varying vec2 vUv;

  float fadeCubic(float value) {
    return value * value * (3.0 - 2.0 * value);
  }

  // Dave Hoskins-style integer-cell hash. It avoids the visible sine lattice
  // produced by the common fract(sin(dot())) shortcut.
  float hash41(vec4 cell, float seed) {
    vec4 p = fract(
      (cell + seed * 0.0137)
      * vec4(0.1031, 0.1030, 0.0973, 0.1099)
    );
    p += dot(p, p.wzxy + 33.33);
    return fract((p.x + p.y) * (p.z + p.w));
  }

  float valueNoise4(vec4 point, float seed) {
    vec4 cell = floor(point);
    vec4 fraction = fract(point);
    vec4 blend = vec4(
      fadeCubic(fraction.x),
      fadeCubic(fraction.y),
      fadeCubic(fraction.z),
      fadeCubic(fraction.w)
    );

    float n0000 = hash41(cell + vec4(0.0, 0.0, 0.0, 0.0), seed);
    float n1000 = hash41(cell + vec4(1.0, 0.0, 0.0, 0.0), seed);
    float n0100 = hash41(cell + vec4(0.0, 1.0, 0.0, 0.0), seed);
    float n1100 = hash41(cell + vec4(1.0, 1.0, 0.0, 0.0), seed);
    float n0010 = hash41(cell + vec4(0.0, 0.0, 1.0, 0.0), seed);
    float n1010 = hash41(cell + vec4(1.0, 0.0, 1.0, 0.0), seed);
    float n0110 = hash41(cell + vec4(0.0, 1.0, 1.0, 0.0), seed);
    float n1110 = hash41(cell + vec4(1.0, 1.0, 1.0, 0.0), seed);
    float n0001 = hash41(cell + vec4(0.0, 0.0, 0.0, 1.0), seed);
    float n1001 = hash41(cell + vec4(1.0, 0.0, 0.0, 1.0), seed);
    float n0101 = hash41(cell + vec4(0.0, 1.0, 0.0, 1.0), seed);
    float n1101 = hash41(cell + vec4(1.0, 1.0, 0.0, 1.0), seed);
    float n0011 = hash41(cell + vec4(0.0, 0.0, 1.0, 1.0), seed);
    float n1011 = hash41(cell + vec4(1.0, 0.0, 1.0, 1.0), seed);
    float n0111 = hash41(cell + vec4(0.0, 1.0, 1.0, 1.0), seed);
    float n1111 = hash41(cell + vec4(1.0, 1.0, 1.0, 1.0), seed);

    float x000 = mix(n0000, n1000, blend.x);
    float x100 = mix(n0100, n1100, blend.x);
    float x010 = mix(n0010, n1010, blend.x);
    float x110 = mix(n0110, n1110, blend.x);
    float x001 = mix(n0001, n1001, blend.x);
    float x101 = mix(n0101, n1101, blend.x);
    float x011 = mix(n0011, n1011, blend.x);
    float x111 = mix(n0111, n1111, blend.x);
    float y00 = mix(x000, x100, blend.y);
    float y10 = mix(x010, x110, blend.y);
    float y01 = mix(x001, x101, blend.y);
    float y11 = mix(x011, x111, blend.y);
    float z0 = mix(y00, y10, blend.z);
    float z1 = mix(y01, y11, blend.z);
    return mix(z0, z1, blend.w);
  }

  float fbm4(vec4 point, float seed, float octaves) {
    float amplitude = 0.5;
    float frequency = 1.0;
    float sum = 0.0;
    float normalization = 0.0;

    for (int octave = 0; octave < 7; octave++) {
      float enabled = 1.0
        - step(octaves, float(octave) + 0.5);
      float octaveSeed = seed + float(octave) * 1319.0;
      vec4 samplePoint = vec4(
        point.xy * frequency,
        point.zw
      );
      sum += amplitude
        * valueNoise4(samplePoint, octaveSeed)
        * enabled;
      normalization += amplitude * enabled;
      amplitude *= 0.5;
      frequency *= 2.0;
    }

    return sum / max(normalization, 0.0001);
  }

  vec3 paletteColor(float index) {
    if (index < 0.5) return uPalette[0];
    if (index < 1.5) return uPalette[1];
    if (index < 2.5) return uPalette[2];
    if (index < 3.5) return uPalette[3];
    if (index < 4.5) return uPalette[4];
    return uPalette[5];
  }

  void main() {
    vec2 pixel = gl_FragCoord.xy;
    if (uBlockiness >= 1.0) {
      pixel = floor(pixel / uBlockiness) * uBlockiness;
    }

    // Both axes divide by width, matching playgrnd's isotropic field domain.
    vec2 domain = pixel / uResolution.x * uScale;
    float angle = fract(uTime / uLoopSeconds) * 6.28318530718;
    vec2 extra = vec2(cos(angle), sin(angle)) * uMotionIntensity;

    float warpX = fbm4(
      vec4(domain + vec2(5.2, 1.3), extra),
      uSeed + 11.0,
      2.0
    );
    float warpY = fbm4(
      vec4(domain + vec2(9.1, 7.7), extra),
      uSeed + 29.0,
      2.0
    );
    vec2 warpedDomain = domain
      + uWarp * (vec2(warpX, warpY) - 0.5) * 2.0;

    float height = fbm4(
      vec4(warpedDomain, extra),
      uSeed,
      uDetail
    );
    height = clamp(
      (height - 0.5) * uContrast + 0.5,
      0.0,
      1.0
    );

    // Static device-pixel grain perturbs the scalar before quantization.
    // Pixels at a boundary become one neighboring palette ink or the other.
    float grain = hash41(
      vec4(floor(gl_FragCoord.xy), 1.0, 1.0),
      uSeed + 97.0
    );
    height = clamp(
      height + (grain - 0.5) * uGrain,
      0.0,
      1.0
    );
    height = pow(height, exp2(-uSpread));

    float colorIndex = clamp(
      floor(height * uBands),
      0.0,
      uBands - 1.0
    );
    vec3 color = paletteColor(colorIndex);

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

function TerrainMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  const elapsedRef = useRef(0);
  const size = useThree((state) => state.size);
  const dpr = useThree((state) => state.viewport.dpr);
  const shouldReduceMotion = useReducedMotion();
  const {
    palette,
    scale,
    warp,
    detail,
    contrast,
    spread,
    seed,
    grain,
    blockiness,
    bands,
    motion,
  } = siteContent.terrain;

  const resolution = useMemo(
    () => new THREE.Vector2(size.width * dpr, size.height * dpr),
    [dpr, size.height, size.width]
  );

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: resolution },
      uPalette: {
        value: palette.map((color) => new THREE.Color(color)),
      },
      uScale: { value: scale },
      uWarp: { value: warp },
      uDetail: { value: detail },
      uContrast: { value: contrast },
      uSpread: { value: spread },
      uSeed: { value: seed },
      uGrain: { value: grain },
      uBlockiness: { value: blockiness },
      uBands: { value: bands },
      uMotionIntensity: { value: motion.intensity },
      uLoopSeconds: { value: motion.loopSeconds },
    }),
    [
      bands,
      blockiness,
      contrast,
      detail,
      grain,
      motion.intensity,
      motion.loopSeconds,
      palette,
      resolution,
      scale,
      seed,
      spread,
      warp,
    ]
  );

  useFrame((_, delta) => {
    if (!meshRef.current || shouldReduceMotion) {
      return;
    }

    elapsedRef.current =
      (elapsedRef.current + delta) % motion.loopSeconds;
    const material = meshRef.current.material as THREE.ShaderMaterial;
    material.uniforms.uTime.value = elapsedRef.current;
  });

  return (
    <mesh ref={meshRef} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        toneMapped={false}
      />
    </mesh>
  );
}

export default function TerrainBackground() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <Canvas
        camera={{ position: [0, 0, 1], fov: 75 }}
        dpr={[1, 1.5]}
        flat
        gl={{
          alpha: false,
          antialias: false,
          powerPreference: 'high-performance',
        }}
      >
        <TerrainMesh />
      </Canvas>
    </div>
  );
}
