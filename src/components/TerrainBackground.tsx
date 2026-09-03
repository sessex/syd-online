'use client';

import { Canvas } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
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
  uniform float uTime;
  uniform vec3 uColors[5];
  uniform float uContourBands;
  uniform float uNoiseScale;
  uniform float uGrainStrength;
  varying vec2 vUv;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;

    for (int i = 0; i < 4; i++) {
      value += amplitude * snoise(p);
      p = p * 2.03 + vec2(17.1, 9.2);
      amplitude *= 0.5;
    }

    return value;
  }

  float random(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  void main() {
    vec2 uv = vUv;
    float drift = uTime;
    vec2 warp = vec2(
      fbm(uv * uNoiseScale + vec2(drift * 0.17, 1.7)),
      fbm(uv * uNoiseScale + vec2(8.3, -drift * 0.13))
    );
    vec2 p = uv + warp * 0.055;

    vec3 pink = uColors[0];
    vec3 orange = uColors[1];
    vec3 lime = uColors[2];
    vec3 purple = uColors[3];
    vec3 lavender = uColors[4];
    vec3 color = pink;

    // Broad vertical terrain folds along the left edge.
    float leftPath = 0.055
      + 0.075 * sin(p.y * 5.0 + drift * 0.32)
      + 0.025 * fbm(p * 3.0);
    float leftDistance = abs(p.x - leftPath);
    color = mix(color, orange, 1.0 - smoothstep(0.14, 0.31, leftDistance));
    color = mix(color, lime, 1.0 - smoothstep(0.055, 0.15, leftDistance));
    color = mix(color, purple, 1.0 - smoothstep(0.012, 0.065, leftDistance));

    // The lower-right contour pool mirrors the supplied terrain reference.
    vec2 poolCenter = vec2(0.91, 0.79);
    vec2 poolVector = p - poolCenter;
    poolVector.x *= 1.12;
    float poolDistance = length(poolVector);
    poolDistance += fbm(p * 3.2 + drift * 0.08) * 0.035;
    color = mix(color, orange, 1.0 - smoothstep(0.24, 0.40, poolDistance));
    color = mix(color, lime, 1.0 - smoothstep(0.15, 0.25, poolDistance));
    color = mix(color, purple, 1.0 - smoothstep(0.065, 0.16, poolDistance));

    // Secondary pools keep the field asymmetrical and predominantly pink.
    float topRight = distance(p, vec2(0.92, 0.08));
    color = mix(color, orange, (1.0 - smoothstep(0.08, 0.25, topRight)) * 0.9);

    vec2 lowerFoldVector = p - vec2(0.52, 1.08);
    lowerFoldVector.x *= 0.8;
    float lowerFold = length(lowerFoldVector);
    color = mix(color, lavender, 1.0 - smoothstep(0.10, 0.35, lowerFold));

    // A subtle contour texture and high-frequency dither avoid a flat gradient.
    float heightField = fbm(p * 2.1 + drift * 0.04);
    float contour = sin(heightField * uContourBands * 3.14159265) * 0.5 + 0.5;
    color *= 0.965 + contour * 0.07;

    float grain = random(gl_FragCoord.xy + mod(drift * 83.0, 997.0));
    color += (grain - 0.5) * uGrainStrength;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  }
`;

function TerrainMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  const {
    colors,
    animationSpeed,
    contourBands,
    noiseScale,
    grainStrength,
  } = siteContent.terrain;

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColors: {
        value: colors.map((c) => new THREE.Color(c)),
      },
      uContourBands: { value: contourBands },
      uNoiseScale: { value: noiseScale },
      uGrainStrength: { value: grainStrength },
    }),
    [colors, contourBands, grainStrength, noiseScale]
  );

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.elapsedTime * animationSpeed;
    }
  });

  return (
    <mesh ref={meshRef} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
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
        gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
      >
        <TerrainMesh />
      </Canvas>
    </div>
  );
}
