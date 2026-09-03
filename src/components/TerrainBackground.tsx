'use client';

import { Canvas, useFrame } from '@react-three/fiber';
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
  uniform float uTime;
  uniform vec3 uColors[5];
  uniform float uContourBands;
  uniform float uNoiseScale;
  varying vec2 vUv;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(
      0.211324865405187,
      0.366025403784439,
      -0.577350269189626,
      0.024390243902439
    );
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
      + i.x
      + vec3(0.0, i1.x, 1.0)
    );
    vec3 m = max(
      0.5 - vec3(
        dot(x0, x0),
        dot(x12.xy, x12.xy),
        dot(x12.zw, x12.zw)
      ),
      0.0
    );
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159
      - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vec2 uv = vUv;

    float noise = 0.0;
    noise += snoise(
      (uv + vec2(uTime * 0.1, 0.0)) * uNoiseScale
    ) * 0.5;
    noise += snoise(
      (uv + vec2(0.0, uTime * 0.15)) * uNoiseScale * 2.0
    ) * 0.25;
    noise += snoise(
      (uv + vec2(uTime * 0.05)) * uNoiseScale * 4.0
    ) * 0.125;

    float contours = fract(noise * uContourBands);
    contours = smoothstep(0.4, 0.6, contours);

    float colorMix = (noise + 1.0) * 0.5;
    vec3 color1 = mix(
      uColors[0],
      uColors[1],
      smoothstep(0.0, 0.25, colorMix)
    );
    vec3 color2 = mix(
      uColors[2],
      uColors[3],
      smoothstep(0.25, 0.5, colorMix)
    );
    vec3 color3 = mix(
      color2,
      uColors[4],
      smoothstep(0.5, 1.0, colorMix)
    );
    vec3 finalColor = mix(color1, color3, colorMix);

    float grain = fract(
      sin(dot(uv * 1000.0, vec2(12.9898, 78.233))) * 43758.5453
    );
    finalColor += (grain - 0.5) * 0.05;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

function TerrainMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { colors, animationSpeed, contourBands, noiseScale } =
    siteContent.terrain;

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColors: {
        value: colors.map((color) => new THREE.Color(color)),
      },
      uContourBands: { value: contourBands },
      uNoiseScale: { value: noiseScale },
    }),
    [colors, contourBands, noiseScale]
  );

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value =
        state.clock.elapsedTime * animationSpeed * 100;
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
    <div className="pointer-events-none absolute inset-0 h-full w-full">
      <Canvas
        camera={{ position: [0, 0, 1], fov: 75 }}
        gl={{ antialias: false, alpha: false }}
      >
        <TerrainMesh />
      </Canvas>
    </div>
  );
}
