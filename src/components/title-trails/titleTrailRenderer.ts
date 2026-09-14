import * as THREE from 'three';

const SETTINGS = {
  opacity: 73,
  strength: 57,
  travel: 32,
  spread: 128,
  brush: 33,
  fade: 1253,
  softness: 27,
  feather: 55,
} as const;

export type PointerSample = Readonly<{
  x: number;
  y: number;
  dx: number;
  dy: number;
  top: number;
  bottom: number;
}>;

const vertexShader = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const fieldShader = `
precision highp float;
uniform sampler2D uField;
uniform vec2 uSize;
uniform vec2 uTexel;
uniform vec2 uPointer;
uniform vec2 uDelta;
uniform vec2 uBand;
uniform float uDecay;
uniform float uDiffusion;
uniform float uActive;
uniform float uTextBrush;
uniform float uTextGain;
uniform float uTextMax;
varying vec2 vUv;
void main() {
  vec2 value = texture2D(uField, vUv).xy;
  vec2 average = (
    texture2D(uField, vUv + vec2(uTexel.x, 0.0)).xy +
    texture2D(uField, vUv - vec2(uTexel.x, 0.0)).xy +
    texture2D(uField, vUv + vec2(0.0, uTexel.y)).xy +
    texture2D(uField, vUv - vec2(0.0, uTexel.y)).xy
  ) * 0.25;
  value = mix(value, average, uDiffusion) * uDecay;
  vec2 point = vec2(vUv.x, 1.0 - vUv.y) * uSize;
  vec2 previous = uPointer - uDelta;
  float along = clamp(dot(point - previous, uDelta) / max(dot(uDelta, uDelta), 0.001), 0.0, 1.0);
  vec2 nearest = previous + along * uDelta;
  float distanceFromStroke = length(point - nearest);
  float brush = exp(-distanceFromStroke * distanceFromStroke / (2.0 * uTextBrush * uTextBrush));
  brush *= 1.0 - smoothstep(uTextBrush * 1.1698113, uTextBrush * 1.5849057, distanceFromStroke);
  brush *= smoothstep(uBand.x - 10.0, uBand.x - 4.0, point.y);
  brush *= 1.0 - smoothstep(uBand.y + 4.0, uBand.y + 10.0, point.y);
  value += uDelta * brush * uActive * uTextGain;
  float maximum = uTextMax;
  float magnitude = length(value);
  value *= min(1.0, maximum / max(magnitude, 0.001));
  if (length(value) < 0.018) value = vec2(0.0);
  gl_FragColor = vec4(value, 0.0, 1.0);
}`;

const imageShader = `
precision highp float;
uniform sampler2D uSource;
uniform float uTextOpacity;
uniform float uTextSeparation;
uniform float uTextFeather;
uniform sampler2D uField;
uniform vec2 uSize;
varying vec2 vUv;
vec4 sourceAt(vec2 uv) {
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
  return texture2D(uSource, clamp(uv, vec2(0.00001), vec2(0.99999)));
}
float inkAt(vec2 shift, float amount) {
  float crisp = sourceAt(vUv - shift * amount).a;
  float trail = sourceAt(vUv - shift * amount * 0.76).a;
  return mix(crisp, trail, uTextFeather);
}
void main() {
  vec2 flow = texture2D(uField, vUv).xy;
  vec2 shift = flow * vec2(1.0, -1.0) / uSize;
  vec3 masks = vec3(inkAt(shift, 0.53 + 0.82 * uTextSeparation), inkAt(shift, 0.53), inkAt(shift, 0.53 + 0.49 * uTextSeparation));
  float neutral = min(min(masks.r, masks.g), masks.b);
  vec3 fringes = max(masks - vec3(neutral), vec3(0.0));
  float alpha = max(max(fringes.r, fringes.g), fringes.b);
  vec3 color = vec3(1.0) - fringes / max(alpha, 0.00001);
  float visibility = smoothstep(0.15, 2.5, length(flow));
  gl_FragColor = vec4(color, alpha * uTextOpacity * visibility);
}`;

export function createTitleTrailRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, premultipliedAlpha: false });
  if (!renderer.extensions.has('EXT_color_buffer_float')) {
    renderer.dispose();
    throw new Error('Floating-point rendering is unavailable');
  }
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;
  const camera = new THREE.Camera();
  const scene = new THREE.Scene();
  const geometry = new THREE.PlaneGeometry(2, 2);
  const size = new THREE.Vector2();
  const source = new THREE.CanvasTexture(document.createElement('canvas'));
  source.minFilter = THREE.LinearFilter;
  source.magFilter = THREE.LinearFilter;
  source.generateMipmaps = false;
  source.colorSpace = THREE.NoColorSpace;
  const fieldUniforms = {
    uField: { value: null as THREE.Texture | null },
    uSize: { value: size },
    uTexel: { value: new THREE.Vector2() },
    uPointer: { value: new THREE.Vector2() },
    uDelta: { value: new THREE.Vector2() },
    uBand: { value: new THREE.Vector2() },
    uDecay: { value: 1 },
    uDiffusion: { value: 0 },
    uActive: { value: 0 },
    uTextBrush: { value: SETTINGS.brush },
    uTextGain: { value: SETTINGS.strength / 100 },
    uTextMax: { value: SETTINGS.travel },
  };
  const fieldMaterial = new THREE.RawShaderMaterial({ vertexShader, fragmentShader: fieldShader, uniforms: fieldUniforms, depthTest: false, depthWrite: false, blending: THREE.NoBlending });
  const imageUniforms = {
    uTextOpacity: { value: SETTINGS.opacity / 100 },
    uTextSeparation: { value: SETTINGS.spread / 100 },
    uTextFeather: { value: SETTINGS.feather / 100 },
    uSource: { value: source },
    uField: { value: null as THREE.Texture | null },
    uSize: { value: size },
  };
  const imageMaterial = new THREE.RawShaderMaterial({ vertexShader, fragmentShader: imageShader, uniforms: imageUniforms, depthTest: false, depthWrite: false, blending: THREE.NoBlending });
  const quad = new THREE.Mesh(geometry, fieldMaterial);
  quad.frustumCulled = false;
  scene.add(quad);
  const options = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false, generateMipmaps: false };
  const targets = [new THREE.WebGLRenderTarget(1, 1, options), new THREE.WebGLRenderTarget(1, 1, options)];
  let [read, write] = targets;

  function draw() {
    imageUniforms.uField.value = read.texture;
    quad.material = imageMaterial;
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(scene, camera);
  }

  function clear() {
    for (const target of targets) {
      renderer.setRenderTarget(target);
      renderer.clear();
    }
    draw();
  }

  return {
    resize(atlas: HTMLCanvasElement, width: number, height: number) {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      if (Math.max(width, height) * ratio > renderer.capabilities.maxTextureSize) {
        throw new Error('Title atlas exceeds the texture limit');
      }
      size.set(width, height);
      renderer.setPixelRatio(ratio);
      renderer.setSize(width, height, false);
      source.dispose();
      source.image = atlas;
      source.needsUpdate = true;
      const fieldWidth = Math.round(160 * width / Math.max(1, width - 108));
      const fieldHeight = Math.max(64, Math.min(384, Math.round(fieldWidth * height / width)));
      for (const target of targets) target.setSize(fieldWidth, fieldHeight);
      fieldUniforms.uTexel.value.set(1 / fieldWidth, 1 / fieldHeight);
      clear();
    },
    frame(seconds: number, sample: PointerSample | null) {
      fieldUniforms.uField.value = read.texture;
      fieldUniforms.uPointer.value.set(sample?.x ?? -1000, sample?.y ?? -1000);
      fieldUniforms.uDelta.value.set(sample?.dx ?? 0, sample?.dy ?? 0);
      fieldUniforms.uBand.value.set(sample?.top ?? 0, sample?.bottom ?? 0);
      fieldUniforms.uActive.value = Number(sample !== null);
      fieldUniforms.uDecay.value = Math.pow(0.5, seconds / (SETTINGS.fade / 1000));
      fieldUniforms.uDiffusion.value = 1 - Math.pow(1 - SETTINGS.softness / 100 * 0.14, seconds * 60);
      quad.material = fieldMaterial;
      renderer.setRenderTarget(write);
      renderer.render(scene, camera);
      [read, write] = [write, read];
      draw();
    },
    clear,
    dispose() {
      for (const target of targets) target.dispose();
      source.dispose();
      geometry.dispose();
      fieldMaterial.dispose();
      imageMaterial.dispose();
      renderer.dispose();
    },
  };
}

export type TrailRenderer = ReturnType<typeof createTitleTrailRenderer>;
