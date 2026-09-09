export const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  precision highp float;
  uniform sampler2D uLandscape;
  uniform sampler2D uClouds;
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  uniform float uHover;
  uniform float uTime;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
               mix(hash(i + vec2(0,1)), hash(i + 1.0), f.x), f.y);
  }

  // Artwork coordinates use a top-left origin. Convert only at texture lookup:
  // CanvasTexture's default flipY already places the canvas top at texture v=1.
  vec3 artwork(vec2 p) {
    // The pink bevel is part of the sampled artwork, so the same displacement
    // and channel separation passes across the frame and its inner boundary.
    vec2 inset = vec2(clamp(uResolution.x * .011, 7.0, 16.0)) / uResolution;
    vec2 edgePixel = min(p, 1.0 - p) * uResolution;
    float frameDepth = min(edgePixel.x, edgePixel.y) / (inset.x * uResolution.x);
    if (frameDepth < 1.0) {
      vec3 pink = vec3(1.0, .055, .68);
      if (frameDepth < .25) pink = vec3(1.0, .28, .81);
      else if (frameDepth > .72) pink = vec3(.79, .015, .47);
      if (p.x + p.y > 1.0) pink += vec3(.1, .035, .06);
      return pink;
    }
    p = (p - inset) / (1.0 - inset * 2.0);
    float crop = min(1.0, (uResolution.x / uResolution.y) / (4.0 / 3.0));
    vec2 uv = vec2((p.x - .5) * crop + .5, 1.0 - p.y);
    vec3 land = texture2D(uLandscape, uv).rgb;
    float drift = sin(uTime * .045) * .006;
    vec2 cloudUv = uv + vec2(drift, 0.0);
    vec4 cloud = texture2D(uClouds, cloudUv);
    // One-to-two artwork pixels of magenta registration bleed follow only
    // the cloud silhouettes and wisps; the clear upper sky stays untouched.
    float rowShift = 1.0 + step(.65, hash(vec2(floor(cloudUv.y * 360.0), 7.0)));
    vec2 fringeOffset = vec2(rowShift / 480.0, 1.0 / 360.0);
    float fringe = max(texture2D(uClouds, cloudUv + fringeOffset).a,
                       texture2D(uClouds, cloudUv - fringeOffset).a);
    fringe = max(0.0, fringe - cloud.a);
    float pinkBleed = .58 + noise(cloudUv * vec2(65.0, 90.0)) * .20;
    land = mix(land, vec3(1.0, .13, .81), fringe * pinkBleed);
    float shadow = smoothstep(.08, .42, 1.0 - cloud.g);
    vec3 cloudColor = mix(cloud.rgb, vec3(1.0, .48, .87), shadow * .18);
    return mix(land, cloudColor, cloud.a);
  }

  float sparkle(vec2 p, vec2 center, float size, float phase) {
    vec2 pixel = floor(p * vec2(480.0, 360.0));
    vec2 delta = abs(pixel - floor(center * vec2(480.0, 360.0)));
    float breath = .5 + .5 * sin(uTime * .68 + phase);
    float arm = size * (.65 + .35 * breath);
    float cross = max((1.0 - step(.75, delta.x)) * (1.0 - step(arm, delta.y)),
                      (1.0 - step(arm, delta.x)) * (1.0 - step(.75, delta.y)));
    float core = (1.0 - step(1.8, delta.x)) * (1.0 - step(1.8, delta.y));
    float halo = exp(-dot(delta, delta) / (size * size * .9)) * .22;
    return (max(cross, core * .6) + halo) * (.35 + .65 * breath);
  }

  // The glitch owns only its sampling offset and color overlay. It never moves
  // the landscape geometry, lettering, or carousel, and can be tuned in isolation.
  vec3 glitch(vec2 p) {
    float sideFocus = exp(-pow((p.y - uPointer.y) * 5.0, 2.0)) * uHover;
    float endFocus = exp(-pow((p.x - uPointer.x) * 5.0, 2.0)) * uHover;
    float leftPush = sideFocus * exp(-uPointer.x * 4.0);
    float rightPush = sideFocus * exp(-(1.0 - uPointer.x) * 4.0);
    float bottomPush = endFocus * exp(-(1.0 - uPointer.y) * 4.0);
    float topPush = endFocus * exp(-uPointer.y * 4.0);
    float localWave = sin(p.y * 47.0 + uTime * .45);
    float left = .069 + (noise(vec2(p.y * 10.0, 2.0)) - .5) * .035 + leftPush * localWave * .021;
    float right = .948 + (noise(vec2(p.y * 12.0, 9.0)) - .5) * .033 + rightPush * localWave * .021;
    float bottom = .936 + sin(p.x * 14.0) * .019 + noise(vec2(p.x * 31.0, 3.0)) * .016
      + bottomPush * sin(p.x * 42.0 + uTime * .45) * .023;
    float top = .008 + noise(vec2(p.x * 23.0, 4.0)) * .005 + topPush * sin(p.x * 42.0) * .008;
    float distanceToEdge = min(min(p.x - left, right - p.x), min(bottom - p.y, p.y - top));
    float edge = 1.0 - smoothstep(-.014, .022, distanceToEdge);
    // Pointer influence belongs to the perimeter. Even its falloff cannot
    // displace the middle of the landscape or the quiet area behind the text.
    float quiet = smoothstep(.24, .34, p.y);
    float response = edge * max(max(leftPush, rightPush), max(bottomPush, topPush));
    float fine = noise(vec2(p.y * 90.0, floor(p.x * 9.0))) - .5;
    float bend = sin(p.y * 72.0 + noise(p * 7.0) * 7.0 + uTime * .10);
    vec2 offset = vec2((bend * .006 + fine * .007) * edge, sin(p.x * 50.0) * .004 * edge);
    offset += response * vec2(sin(p.y * 65.0), sin(p.x * 55.0)) * .015;
    float split = .0006 + edge * .007 + response * .012;
    vec2 sampleAt = clamp(p + offset, .001, .999);
    vec3 col = vec3(artwork(sampleAt + vec2(split, 0)).r,
                    artwork(sampleAt).g,
                    artwork(sampleAt - vec2(split, 0)).b);

    float etched = noise(p * vec2(165.0, 115.0)) + noise(p * vec2(340.0, 290.0)) * .35;
    float contour = clamp(-distanceToEdge * 17.0 + (etched - .6) * .12, 0.0, 1.0);
    vec3 ribbon = mix(vec3(.02,.81,.65), vec3(.91,.0,.86), smoothstep(.0,.22,contour));
    ribbon = mix(ribbon, vec3(1.0,.025,.13), smoothstep(.28,.46,contour));
    ribbon = mix(ribbon, vec3(1.0,.35,.015), smoothstep(.50,.72,contour));
    ribbon = mix(ribbon, vec3(.92,.015,.62), smoothstep(.78,1.0,contour));
    float lower = smoothstep(.84,.94,p.y);
    vec3 floorRibbon = mix(vec3(.04,.82,.24),vec3(.56,.01,.75),smoothstep(.15,.75,contour));
    ribbon = mix(ribbon, floorRibbon, lower * .8);
    float grain = hash(floor(p * uResolution));
    // Broad translucent color bands and narrow neon contour lines reproduce
    // the liquid optical tearing of the reference, rather than a blurred glow.
    float rim = min(min(p.x,1.0-p.x)*uResolution.x,min(p.y,1.0-p.y)*uResolution.y);
    float rimInk = mix(.3,1.0,smoothstep(2.0,16.0,rim));
    col = mix(col, ribbon, edge * (.44 + etched * .23) * rimInk);
    float neon = exp(-abs(distanceToEdge + .004 + fine * .003) * 400.0);
    float echo = exp(-abs(distanceToEdge - .010 + fine * .002) * 480.0);
    col = mix(col, vec3(1.0, .015, .84), neon * .90);
    col = mix(col, vec3(.015, .96, .69), echo * .55);
    // Fine colored tracking scratches remain anchored instead of flashing.
    float row = floor(p.y * 360.0);
    float line = step(.947, hash(vec2(row, 12.0))) *
                 step(fract(p.y * 360.0), .45);
    float streak = pow(max(0.0, sin(p.x * 11.0 + row)), 8.0);
    col = mix(col, vec3(.94, .04, .78), line * streak * (.26 + edge * .6) * max(quiet, edge));
    float engraving = sin(etched * 54.0 + p.y * 880.0) * .5 + .5;
    col += (grain - .5) * (.012 + edge * .07) + (engraving - .5) * edge * .12;

    // Keep a legible pink frame beneath the bleeding optics. Its inner bevel
    // ripples by a few CSS pixels, while the outer silhouette stays continuous.
    // This stays in the effect pass: the rim inherits local color interference,
    // tracking scratches, grain, and the pointer-driven edge response.
    float frameWidth = clamp(uResolution.x * .011, 7.0, 16.0);
    float seam = (bend * .65 + fine * .8 + response * localWave * 1.3);
    float frameMask = 1.0 - smoothstep(frameWidth - 1.0 + seam, frameWidth + 1.0 + seam, rim);
    float bevel = clamp(rim / frameWidth, 0.0, 1.0);
    vec3 framePink = mix(vec3(1.0,.30,.83), vec3(1.0,.035,.66), smoothstep(.08,.30,bevel));
    framePink = mix(framePink, vec3(.83,.015,.51), smoothstep(.73,1.0,bevel));
    float interference = .14 + engraving * .10 + line * .12 + response * .09;
    framePink = mix(framePink, col, interference);
    framePink += (grain - .5) * .045;
    col = mix(col, framePink, frameMask);
    return col;
  }

  void main() {
    vec2 p = vec2(vUv.x, 1.0 - vUv.y);
    vec3 color = glitch(p);
    float stars = 0.0;
    stars += sparkle(p, vec2(.055,.30), 7.0, .0);
    stars += sparkle(p, vec2(.38,.34), 4.0, 2.2);
    stars += sparkle(p, vec2(.69,.32), 3.5, 4.1);
    stars += sparkle(p, vec2(.90,.30), 7.0, 1.2);
    stars += sparkle(p, vec2(.41,.48), 3.0, 5.5);
    stars += sparkle(p, vec2(.23,.61), 3.0, 1.8);
    stars += sparkle(p, vec2(.84,.72), 4.0, 3.2);
    stars += sparkle(p, vec2(.06,.81), 4.0, 4.8);
    stars += sparkle(p, vec2(.60,.91), 3.5, 2.8);
    stars += sparkle(p, vec2(.92,.93), 2.5, 6.0);
    color = mix(color, vec3(1.0, 1.0, .90), clamp(stars, 0.0, 1.0));
    // Display-referred palette: textures intentionally use NoColorSpace and this
    // final pass writes their sRGB values directly, without tone mapping.
    gl_FragColor = vec4(color, 1.0);
  }
`;
