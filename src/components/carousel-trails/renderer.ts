import {
  LinearFilter,
  Mesh,
  NoToneMapping,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Texture,
  WebGLRenderer,
} from 'three';

import { TRAIL_STYLES, type TrailStyle } from './styles';

type TrailEmission = {
  image: HTMLImageElement;
  style: TrailStyle;
  x: number;
  y: number;
  width: number;
  height: number;
  time: number;
};

const MAX_STAMPS = 16;
// Extra transparent space lets the silhouette's edges warp beyond its image box.
const PADDING = 1.4;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uImage;
  uniform float uStyle;
  uniform float uAge;
  uniform float uTime;
  uniform float uSeed;
  uniform vec2 uSize;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  vec4 photo(vec2 p) {
    float inside = step(0., p.x) * step(p.x, 1.) * step(0., p.y) * step(p.y, 1.);
    return texture2D(uImage, clamp(p, 0., 1.)) * inside;
  }
  float mask(vec2 p) { return photo(p).a; }

  // The hero's pink frame, blue sky, green field and pale gem highlights.
  vec3 palette(float t) {
    float band = fract(t) * 6.;
    vec3 pink = vec3(1., .12, .73);
    vec3 lavender = vec3(.70, .49, 1.);
    vec3 blue = vec3(.18, .36, 1.);
    vec3 cyan = vec3(.20, .94, .86);
    vec3 lime = vec3(.73, .95, .26);
    vec3 cream = vec3(1., .96, .67);
    if (band < 1.) return mix(pink, lavender, band);
    if (band < 2.) return mix(lavender, blue, band - 1.);
    if (band < 3.) return mix(blue, cyan, band - 2.);
    if (band < 4.) return mix(cyan, lime, band - 3.);
    if (band < 5.) return mix(lime, cream, band - 4.);
    return mix(cream, pink, band - 5.);
  }
  float photoTone(vec3 color) {
    return dot(color, vec3(.299, .587, .114));
  }

  void main() {
    vec2 p = (vUv - .5) * 1.4 + .5;
    vec2 px = 1. / max(uSize, vec2(1.));
    float age = clamp(uAge, 0., 1.);
    float life = 1. - smoothstep(.28, 1., age);
    float grain = hash(floor(p * uSize) + uSeed);
    float alpha = 0.;
    vec3 color = vec3(1.);

    if (uStyle < .5) {
      // Keep the bunny's screen-printed echoes, with a little photographic grain.
      vec2 q = p;
      q.x += sin(p.y * 19. + uSeed) * .012 * age;
      q.y += sin(p.x * 15. + uTime * .8) * .009 * age;
      alpha = mask(q);
      float bands = floor((p.y * .22 + uSeed * .173 + age * .5) * 8.) / 8.;
      color = mix(palette(bands), photo(q).rgb, .20 * (1. - age));
      color = mix(color, vec3(1., .91, .56), grain * .12);
      alpha *= smoothstep(age * .42, age * .42 + .15, grain) * .62;
    } else if (uStyle < 1.5) {
      // Raster stars are anchored inside the cutout, then gently float upward.
      // Entire stars survive at the contour instead of being clipped into squares.
      vec2 drift = vec2(sin(uSeed) * 9., 20.) * age;
      vec2 pixel = p * uSize - drift;
      float cellSize = 28.;
      vec2 cell = floor(pixel / cellSize);
      float random = hash(cell + uSeed);
      vec2 center = (cell + .5) * cellSize;
      vec2 delta = abs(floor((pixel - center) / 2. + .5));
      float breath = .5 + .5 * sin(uTime * 2.2 + random * 18.);
      float arm = floor(mix(2., 6., random) * (.7 + breath * .3));
      float cross = max((1. - step(.5, delta.x)) * (1. - step(arm, delta.y)),
                        (1. - step(.5, delta.y)) * (1. - step(arm, delta.x)));
      float diamond = 1. - step(2., delta.x + delta.y);
      float diagonal = (1. - step(.5, abs(delta.x - delta.y)))
        * (1. - step(arm * .72, max(delta.x, delta.y))) * step(.76, random);
      float star = max(max(cross, diamond), diagonal);
      float anchored = mask(center / uSize) * step(.3, random);
      float twinkle = .52 + breath * .48;
      alpha = anchored * star * twinkle;
      color = palette(random);
      color = mix(color, vec3(1., 1., .87), (1. - step(.5, max(delta.x, delta.y))) * .85);
      // A light photo impression connects the constellation to its source image.
      vec4 source = photo(p);
      float impression = source.a * .12 * (1. - age);
      float combined = alpha + impression * (1. - alpha);
      color = (color * alpha + source.rgb * impression * (1. - alpha)) / max(combined, .001);
      alpha = combined;
    } else if (uStyle < 2.5) {
      // Widely spaced photographic prints: tonal color bands with a 1–2px edge flutter.
      vec2 q = p + vec2(sin(p.y * 18. + uSeed), cos(p.x * 14.)) * px * age * 2.;
      vec4 source = photo(q);
      float tone = photoTone(source.rgb);
      float ink = floor((tone * .72 + uSeed * .13) * 7.) / 7.;
      vec3 pigment = palette(ink) * (.65 + tone * .45);
      color = mix(pigment, source.rgb, .48);
      alpha = source.a * smoothstep(age * .35, age * .35 + .15, grain) * .66;
    } else if (uStyle < 3.5) {
      // Split the photograph itself into RGB channels, keeping faces and fabric legible.
      float row = floor(p.y * uSize.y / 9.);
      float tick = floor(uTime * 4.);
      float glitch = hash(vec2(row + uSeed, tick));
      vec2 q = p;
      q.x += (glitch - .5) * step(.79, glitch) * px.x * (8. + age * 14.);
      float shift = (2. + age * 9.) * px.x;
      vec4 red = photo(q + vec2(shift, 0.));
      vec4 green = photo(q);
      vec4 blue = photo(q - vec2(shift, 0.));
      alpha = max(red.a, max(green.a, blue.a));
      color = vec3(red.r * red.a, green.g * green.a, blue.b * blue.a) / max(alpha, .001);
      float fringe = max(0., alpha - min(red.a, min(green.a, blue.a)));
      color = mix(color, mix(vec3(.20, .94, .86), vec3(1., .12, .73), step(blue.a, red.a)), fringe * .55);
      float scan = .86 + .14 * step(.25, fract(p.y * uSize.y / 4.));
      alpha *= scan * smoothstep(age * .30, age * .30 + .12, grain) * .72;
    } else {
      // Pearlescent photo echoes pick up the hero's gem lettering and pink/cyan fringe.
      float wave = sin(p.y * 23. + sin(p.x * 13. + uTime) * 2. - uTime * 1.4);
      vec2 q = p;
      q.x += wave * (.003 + age * .012);
      q.y += cos(p.x * 19. + uTime * 1.1) * .005 * age;
      float a = mask(q);
      float ridge = sin(p.x * 16. + p.y * 11. + wave * 2. + uTime * .55);
      color = palette(ridge * .22 + uSeed * .13);
      float silver = pow(.5 + .5 * sin(ridge * 5. + wave), 8.);
      color = mix(color, vec3(1., .98, .88), silver * .8);
      color = mix(color, photo(q).rgb, .60);
      alpha = a * smoothstep(age * .35, age * .35 + .18, grain) * .65;
    }

    alpha *= life;
    if (alpha < .008) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

type Stamp = {
  mesh: Mesh<PlaneGeometry, ShaderMaterial>;
  born: number;
  lifetime: number;
  y: number;
  height: number;
};

export function createTrailRenderer(canvas: HTMLCanvasElement) {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  } catch {
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = NoToneMapping;
  const scene = new Scene();
  const camera = new OrthographicCamera(0, 1, 1, 0, .1, 10);
  camera.position.z = 5;
  const geometry = new PlaneGeometry(1, 1);
  const textures = new Map<string, Texture>();
  const stamps: Stamp[] = [];
  let viewHeight = 1;
  let sequence = 0;
  let disposed = false;

  function clear() {
    if (disposed) return;
    for (const stamp of stamps) stamp.mesh.visible = false;
    renderer.clear();
  }

  return {
    resize(width: number, height: number, pixelRatio: number) {
      if (disposed) return;
      viewHeight = Math.max(1, height);
      renderer.setPixelRatio(Math.min(2, Math.max(1, pixelRatio)));
      renderer.setSize(Math.max(1, width), viewHeight, false);
      camera.right = Math.max(1, width);
      camera.top = viewHeight;
      camera.updateProjectionMatrix();
      for (const stamp of stamps) stamp.mesh.position.y = viewHeight - stamp.y - stamp.height / 2;
    },
    emit({ image, style, x, y, width, height, time }: TrailEmission) {
      if (disposed || !image.complete || !image.naturalWidth || width <= 0 || height <= 0) return;
      const source = image.currentSrc || image.src;
      let texture = textures.get(source);
      if (!texture) {
        texture = new Texture(image);
        texture.minFilter = LinearFilter;
        texture.magFilter = LinearFilter;
        texture.generateMipmaps = false;
        texture.needsUpdate = true;
        textures.set(source, texture);
      }
      let stamp = stamps.find((entry) => !entry.mesh.visible);
      if (!stamp && stamps.length >= MAX_STAMPS) {
        stamp = stamps.reduce((oldest, entry) => entry.born < oldest.born ? entry : oldest);
      }
      if (!stamp) {
        const material = new ShaderMaterial({
          vertexShader,
          fragmentShader,
          transparent: true,
          depthTest: false,
          depthWrite: false,
          uniforms: {
            uImage: { value: texture },
            uStyle: { value: 0 },
            uAge: { value: 0 },
            uTime: { value: 0 },
            uSeed: { value: 0 },
            uSize: { value: [width, height] },
          },
        });
        stamp = { mesh: new Mesh(geometry, material), born: time, lifetime: 0, y, height };
        stamps.push(stamp);
        scene.add(stamp.mesh);
      }
      const { mesh } = stamp;
      const uniforms = mesh.material.uniforms;
      const definition = TRAIL_STYLES[style];
      stamp.born = time;
      stamp.lifetime = definition.lifetime;
      stamp.y = y;
      stamp.height = height;
      mesh.visible = true;
      mesh.renderOrder = sequence++;
      mesh.position.set(x + width / 2, viewHeight - y - height / 2, 0);
      mesh.scale.set(width * PADDING, height * PADDING, 1);
      uniforms.uImage.value = texture;
      uniforms.uStyle.value = definition.id;
      uniforms.uAge.value = 0;
      uniforms.uSeed.value = sequence * .6180339;
      uniforms.uSize.value = [width, height];
    },
    render(time: number) {
      if (disposed) return false;
      let active = false;
      for (const stamp of stamps) {
        if (!stamp.mesh.visible) continue;
        const age = Math.max(0, (time - stamp.born) / stamp.lifetime);
        if (age >= 1) {
          stamp.mesh.visible = false;
          continue;
        }
        stamp.mesh.material.uniforms.uAge.value = age;
        stamp.mesh.material.uniforms.uTime.value = time / 1000;
        active = true;
      }
      renderer.render(scene, camera);
      return active;
    },
    clear,
    dispose() {
      if (disposed) return;
      clear();
      disposed = true;
      for (const stamp of stamps) stamp.mesh.material.dispose();
      for (const texture of textures.values()) texture.dispose();
      geometry.dispose();
      scene.clear();
      renderer.dispose();
      textures.clear();
      stamps.length = 0;
    },
  };
}
