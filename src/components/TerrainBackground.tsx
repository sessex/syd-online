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
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uColors[6];
  uniform float uFieldScale;
  uniform float uWarpStrength;
  uniform float uDetail;
  uniform float uContrast;
  uniform float uColorBias;
  uniform float uDitherStrength;
  uniform float uGrainStrength;
  uniform float uDitherPixelSize;
  uniform float uLoopRadius;
  varying vec2 vUv;

  vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec2 mod289(vec2 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec3 permute(vec3 x) {
    return mod289(((x * 34.0) + 1.0) * x);
  }

  float snoise(vec2 v) {
    const vec4 C = vec4(
      0.211324865405187,
      0.366025403784439,
      -0.577350269189626,
      0.024390243902439
    );
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y)
      ? vec2(1.0, 0.0)
      : vec2(0.0, 1.0);
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

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.52;
    mat2 rotation = mat2(0.80, -0.60, 0.60, 0.80);

    for (int octave = 0; octave < 6; octave++) {
      float enabled = 1.0
        - step(uDetail, float(octave) + 0.5);
      value += amplitude * snoise(p) * enabled;
      p = rotation * p * 2.03 + vec2(7.13, 3.71);
      amplitude *= 0.5;
    }

    return value;
  }

  float random(vec2 p) {
    return fract(
      sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123
    );
  }

  float bayer4(vec2 coordinate) {
    vec2 cell = mod(floor(coordinate), 4.0);
    float x = cell.x;
    float y = cell.y;
    float value = 0.0;

    if (y < 1.0) {
      if (x < 1.0) value = 0.0;
      else if (x < 2.0) value = 8.0;
      else if (x < 3.0) value = 2.0;
      else value = 10.0;
    } else if (y < 2.0) {
      if (x < 1.0) value = 12.0;
      else if (x < 2.0) value = 4.0;
      else if (x < 3.0) value = 14.0;
      else value = 6.0;
    } else if (y < 3.0) {
      if (x < 1.0) value = 3.0;
      else if (x < 2.0) value = 11.0;
      else if (x < 3.0) value = 1.0;
      else value = 9.0;
    } else {
      if (x < 1.0) value = 15.0;
      else if (x < 2.0) value = 7.0;
      else if (x < 3.0) value = 13.0;
      else value = 5.0;
    }

    return (value + 0.5) / 16.0;
  }

  vec3 palette(float index) {
    if (index < 0.5) return uColors[0];
    if (index < 1.5) return uColors[1];
    if (index < 2.5) return uColors[2];
    if (index < 3.5) return uColors[3];
    if (index < 4.5) return uColors[4];
    return uColors[5];
  }

  void main() {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 p = vUv - 0.5;
    p.x *= aspect;
    p *= uFieldScale;

    vec2 orbit = vec2(cos(uTime), sin(uTime)) * uLoopRadius;
    vec2 perpendicularOrbit = vec2(-orbit.y, orbit.x);

    vec2 firstWarp = vec2(
      fbm(p + orbit + vec2(0.0, 0.8)),
      fbm(p + perpendicularOrbit + vec2(5.2, 1.3))
    );

    vec2 secondWarp = vec2(
      fbm(
        p
        + uWarpStrength * firstWarp
        + orbit * 0.65
        + vec2(1.7, 9.2)
      ),
      fbm(
        p
        + uWarpStrength * firstWarp
        + perpendicularOrbit * 0.65
        + vec2(8.3, 2.8)
      )
    );

    float detailedField = fbm(
      p
      + uWarpStrength * 1.15 * secondWarp
      + orbit * 0.45
    );
    float broadField = snoise(
      p * 0.38
      - perpendicularOrbit * 1.8
      + vec2(2.4, -1.6)
    );
    float field = detailedField * 0.74 + broadField * 0.26;
    float elevation = field * 0.5 + 0.5;
    elevation = (elevation - 0.5) * uContrast
      + 0.5
      + uColorBias;
    elevation = clamp(elevation, 0.0, 0.9999);

    float scaledBand = elevation * 5.0;
    float lowerBand = floor(scaledBand);
    float transition = fract(scaledBand);
    float orderedThreshold = bayer4(
      gl_FragCoord.xy / max(uDitherPixelSize, 1.0)
    );
    float threshold = mix(
      0.5,
      orderedThreshold,
      uDitherStrength
    );
    float colorIndex = lowerBand + step(threshold, transition);
    vec3 color = palette(colorIndex);

    float grain = random(gl_FragCoord.xy);
    color += (grain - 0.5) * uGrainStrength;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function TerrainMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  const phaseRef = useRef(0);
  const size = useThree((state) => state.size);
  const shouldReduceMotion = useReducedMotion();
  const {
    colors,
    fieldScale,
    warpStrength,
    detail,
    contrast,
    colorBias,
    ditherStrength,
    grainStrength,
    ditherPixelSize,
    loopSeconds,
    loopRadius,
  } = siteContent.terrain;

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: {
        value: new THREE.Vector2(size.width, size.height),
      },
      uColors: {
        value: colors.map((color) => new THREE.Color(color)),
      },
      uFieldScale: { value: fieldScale },
      uWarpStrength: { value: warpStrength },
      uDetail: { value: detail },
      uContrast: { value: contrast },
      uColorBias: { value: colorBias },
      uDitherStrength: { value: ditherStrength },
      uGrainStrength: { value: grainStrength },
      uDitherPixelSize: { value: ditherPixelSize },
      uLoopRadius: { value: loopRadius },
    }),
    [
      colorBias,
      colors,
      contrast,
      detail,
      ditherPixelSize,
      ditherStrength,
      fieldScale,
      grainStrength,
      loopRadius,
      size.height,
      size.width,
      warpStrength,
    ]
  );

  useFrame((_, delta) => {
    if (!meshRef.current || shouldReduceMotion) {
      return;
    }

    phaseRef.current =
      (phaseRef.current + (delta * Math.PI * 2) / loopSeconds)
      % (Math.PI * 2);
    const material = meshRef.current.material as THREE.ShaderMaterial;
    material.uniforms.uTime.value = phaseRef.current;
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
