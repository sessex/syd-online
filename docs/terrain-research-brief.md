# Terrain hero — implementation brief

Research-only. Do **not** implement the site from this file; a coding agent should be able to ship a fullscreen R3F fragment shader from it without guessing dither or color.

**Reference captures (primary source, 2026-09-03):**
- [`playgrnd-refs/terrain-default.png`](playgrnd-refs/terrain-default.png) — default variation 7, 6-band psychedelic field, grainy band edges
- [`playgrnd-refs/terrain-psychedelic.png`](playgrnd-refs/terrain-psychedelic.png) — Animate=DRIFT + Dither panel ON, frame 22/30
- Live tool: [https://www.playgrnd.tools/terrain](https://www.playgrnd.tools/terrain) (inline JS, not a minified bundle — algorithm below is transcribed from that source)

Playgrnd itself is a **CPU 2D canvas** (coarse fBm field + per-pixel grain, optional Bayer post). Port the **same math** to a GLSL fragment shader on a fullscreen quad. Do not copy their UI.

---

## Goal / aesthetic criteria

### What “good” looks like
A psychedelic **contour landscape** filling the hero: organic, marble-like topographic blobs of **flat ink**, not a smooth gradient. Distinct color regions (hot pink, orange, yellow, lime/neon green, cyan, royal blue/purple) with **speckled, print-like grain only at band boundaries**. Motion is a slow in-place morph that **loops exactly**. It should feel like a risograph / early-screen print of a warped height field — tactile, curated, high-chroma.

Match the wireframe + playgrnd captures:
- Filled **bands**, not thin isoline strokes.
- Grain is **colored** (adjacent palette inks mixed as pixels), never grey snow.
- Edges are noisy but the interiors of bands are mostly solid.
- Colors are neon and saturated, not washed, muddy, or pastel-shifted.
- Animation breathes; it does not crawl, shimmer, or pan the whole image.

### What “jank” looks like (Sydney’s named failures)
| Complaint | What it usually is in a custom simplex-contour shader | Fix in this brief |
|---|---|---|
| **Dithering incorrect** | `fract(sin(dot(uv,t)))` snow; dither in UV (not pixel) space; dither animated every frame; Bayer indexed with `uv*res` floats; grey overlay after color; error-diffusion attempted in a fragment shader | Two-stage pipeline below. Grain is **scalar**, hashed in **integer pixel coords**, **not** time-varying. Bayer is optional and **index-space**, not RGB-cube. |
| **Colors wrong** | Smooth `mix()` along a cosine palette; linear vs sRGB mismatch in `ShaderMaterial`; per-channel RGB quantization to 3 tones (destroys the 6 inks); wrong band order | Hard `floor` into a `vec3` palette of exact hex. Output linear + `colorspace_fragment`. |
| **Looks jank, not aesthetic** | Simplex blobs with no warp; contour *lines* via `fract(h*N)`; `smoothstep` band edges; crawling grain; aliasing on `step`; 4K fBm melting the GPU | Value-noise fBm + IQ-style domain warp; hard bands + grain; 4D circle loop; `highp`; 4–5 octaves. |

**Do not** draw topographic linework. Playgrnd type label is “Contour landscape” but the picture is **posterised colour fields with dithered edges** (their own OG description).

---

## How playgrnd-like terrain likely works (pipeline stages)

Verified against the inline `renderInto()` / `__dither()` in `https://www.playgrnd.tools/terrain` (fetched 2026-09-03).

Playgrnd splits work in two layers, which maps cleanly to one fragment shader:

1. **Smooth field, coarse** (they sample every 5 px and bilinear-upsample). In GLSL, just evaluate per fragment — better quality, same formula.
2. **Per-pixel grain + palette floor** (cheap).
3. **Optional Bayer/noise post** on the finished RGB (their Dither panel). Default on load is **off**; Grain at 30% is **always on**. The psychedelic capture has the Dither panel on.

### Stage 0 — domain
Pixel → isotropic noise coordinates (their `ar = H/W`):

```
u = (x / W) * scale
v = (y / W) * scale          // not y/H — keeps cells round on a wide hero
```

`scale` default **2.6**. A seed integer (variation) offsets the hash.

### Stage 1 — value noise fBm (not simplex)

Playgrnd uses **value noise** (hash the lattice corners, Hermite-interpolate), **not** simplex/Perlin-gradient. This is why it looks blotchy/topographic rather than silky.

- Fade: `t*t*(3-2*t)` (cubic Hermite, Book of Shaders / IQ).
- fBm: amp `0.5`, lacunarity `2`, gain `0.5`, **normalize by sum of amplitudes**.
- `Detail` = octave count, default **5** (range 1–7). Warp lookups use **2** octaves.

2D for a still frame; **4D** when animating (`z,w` extra axes).

### Stage 2 — domain warp (IQ one-layer `q`)

Exactly:

```
wx = fbm(u+5.2, v+1.3, z, w, seed+11, oct=2)
wy = fbm(u+9.1, v+7.7, z, w, seed+29, oct=2)
h  = fbm(u + warp*(wx-0.5)*2.0,
         v + warp*(wy-0.5)*2.0,
         z, w, seed, oct=Detail)
```

Default `warp = 1.1` (UI “110%”). Offsets `5.2,1.3` / `9.1,7.7` are IQ’s classic “two 1D fBms standing in for a 2D warp field.” This is the swirly marble. Warp `0` = boring blobs.

They do **one** warp layer (`fbm(p + fbm(p))`), not the nested `fbm(p+fbm(p+fbm(p)))`. One layer is enough and cheaper.

### Stage 3 — contrast remap (before any color)

```
h = clamp((h - 0.5) * contrast + 0.5, 0.0, 1.0)
```

Default `contrast = 1.7` (UI “170%”). Pushes mass toward 0/1 so bands read as hard inks instead of a muddy mid-grey field.

### Stage 4 — grain (this is the 30% “Dither” slider under Grain)

**This is the look.** It is **not** Bayer. It is white-noise perturbation of the scalar **before** quantization:

```
h += (hashi(int(x), int(y), shimmerFrame, 1, seed) - 0.5) * grain
h = clamp(h, 0.0, 1.0)
```

Default `grain = 0.3`. Hash is in **device-pixel integer coordinates**, independent of UV and (except Shimmer mode) **independent of time**. Result: speckled **band edges**; interiors stay flat ink.

`Blockiness` (default 0) snaps `(x,y)` to an N×N grid before sampling the field — pixelate the landscape, not the grain. Leave at 0 for the hero.

### Stage 5 — spread + posterize to N inks

```
q   = pow(h, pow(2.0, -spread))     // spread=0 → Even → identity
idx = clamp(int(floor(q * float(nBands))), 0, nBands-1)
color = palette[idx]                // NO mix(), NO cosine palette
```

Default 6 bands. `spread` UI “Spread / Even” (`balance` in source, −1.2…1.2). Negative = later bands eat more area.

**Rotate** = `palette.push(palette.shift())` — same inks, different height. **New colors** reshuffles; the hero should **pin** a palette, not randomize on load.

### Stage 6 — seamless loop (Animate)

`t = frame / loopLength` in `[0,1)`, `A = intensity` (default 0.60), `TAU = 2π`.

| Mode | What it does | Use for hero? |
|---|---|---|
| **DRIFT** (default) | `z=cos(TAU*t)*A`, `w=sin(TAU*t)*A` — 4D noise on a circle | **Yes. This is the one.** |
| TIDE | Drift + `h += 0.28*A*sin(TAU*t)` (bands slide) | Optional, more aggressive |
| WARP | Modulate warp amount + smaller 4D orbit | Optional |
| SHIMMER | Feeds `frame` into the grain hash | **No** — crawling grain, reads as jank |

Loop length 30 frames @ 12 fps ⇒ 2.5 s period. “Every loop closes exactly” because extra noise axes walk a **circle**, not `uTime` unbounded. In GLSL use `t = fract(uTime / uLoopSeconds)`.

### Stage 7 — Dither panel (optional RGB post)

Playgrnd’s second dither, applied **after** the image exists:

- Pattern: **Bayer 8** (default) / Bayer 4 / white Noise
- Pixel size **2** (in *on-screen* pixels; they scale by `min(W,H)/700` on export)
- Tones **3** per RGB channel
- Amount **100%**
- Rides PNG/video; SVG stays smooth (no pixels)

They build a LUT: for Bayer index `i` of `n×n` and 8-bit channel `v`:

```
thresh = (i + 0.5) / (n*n)
q = (v/255) * (levels-1)
out = round(min(L, floor(q) + ((q-floor(q)) > thresh ? 1 : 0)) / L * 255)
```

**Do not use this RGB-cube quantizer on the hero.** 3 tones/channel = 27 possible RGB values and it **will** nudge `#78FC4C` lime off-palette. That is a prime “colors wrong” failure. Playgrnd can get away with it as a print filter; a branded site cannot.

If extra print texture is wanted, Bayer-dither **between adjacent palette indices** (see Dithering), not per-channel.

---

## Recommended GLSL / R3F approach (step-by-step)

Fullscreen quad, one fragment shader, no lighting, no post stack required.

### 1. Scene shell
- Next.js client component.
- `@react-three/fiber` `Canvas` with `orthographic`, `dpr={[1, 1.5]}` (cap — dither is pixel-sized; 3× DPR just burns fillrate).
- `gl={{ antialias: false, alpha: false }}` — AA blurs Bayer/grain into mud.
- A single plane (or fullscreen triangle) whose size tracks `useThree().size`, camera looking down −Z.
- `prefers-reduced-motion`: freeze `uTime` at 0.

Do **not** put this through `EffectComposer` unless you already have one; if you do, output **linear** and let `OutputPass` do color, do not double-encode.

### 2. Material
- `shaderMaterial` from `@react-three/drei` **or** `THREE.ShaderMaterial`.
- `toneMapped = false` **or** include `#include <tonemapping_fragment>` + `#include <colorspace_fragment>` at the end. Pick one path and stick to it.
- Palette uniforms as `vec3 uPalette[6]` populated from `THREE.Color('#510BF5')` so Three converts sRGB hex → **linear working space**. Hardcoding `vec3(0.318, 0.043, 0.961)` from hex/255 without the transfer function is how neon turns dirty.

Fragment must end with the colorspace chunk if `toneMapped` is left true:

```glsl
gl_FragColor = vec4(color, 1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
```

### 3. Precision + derivatives
```glsl
precision highp float;
```
`mediump` mantissa (~10 bit) stair-steps fBm when `uv * scale` grows. Always `highp` for the noise domain. Keep coordinates O(1)–O(10), never `uv * 1000.0`.

### 4. Noise (port of playgrnd `hashi` / `vnoise` / `fbm`)

Integer hash (2D still, 4D animated). Classic IQ-style is fine if the constants differ slightly; **do not swap in simplex** as the default — Sydney’s current shader is simplex and that is part of the jank. Value noise’s cubic cells + warp = topographic blotches.

GLSL sketch (4D value noise, 16 corners; acceptable for a hero at 4–5 octaves):

```glsl
float fade(float t) { return t*t*(3.0-2.0*t); }

float hash41(ivec4 p, int seed) {
  // integer mix; return [0,1)
  uint n = uint(p.x)*374761393u ^ uint(p.y)*668265263u
         ^ uint(p.z)*1440662683u ^ uint(p.w)*1274126177u
         ^ uint(seed)*1013904223u;
  n = (n ^ (n >> 15u)) * 2246822519u;
  n = (n ^ (n >> 13u)) * 3266489917u;
  n ^= n >> 16u;
  return float(n) * (1.0/4294967296.0);
}

float vnoise4(vec4 p, int seed) {
  ivec4 i = ivec4(floor(p));
  vec4  f = fract(p);
  vec4  u = vec4(fade(f.x), fade(f.y), fade(f.z), fade(f.w));
  float n0000 = hash41(i, seed);
  // ... 16 corners, 4 nested mixes along u.xyzw
  // (unroll; do not recurse)
}

float fbm4(vec4 p, int seed, int oct) {
  float a = 0.5, f = 1.0, sum = 0.0, nrm = 0.0;
  for (int i = 0; i < 7; i++) {
    if (i >= oct) break;
    sum += a * vnoise4(vec4(p.xy * f, p.zw), seed + i * 1319);
    nrm += a; a *= 0.5; f *= 2.0;
  }
  return sum / nrm;
}
```

Still frames can use a 2D-only path (`p.zw = 0`) to cut hashes from 16 → 4.

**Perf budget:** warp = 2 octaves × 2 axes + field = 5 octaves ≈ 9 noise calls. 4D value noise is the heavy part. If it misses 60 fps on integrated GPUs: drop field octaves to 4, or evaluate warp in 2D even while the field is 4D.

### 5. Field → color (one function, this order, no steps skipped)

```glsl
vec2 p = gl_FragCoord.xy / uResolution.x * uScale;   // isotropic
float ang = uTime / uLoopSeconds * 6.2831853;
vec2  extra = vec2(cos(ang), sin(ang)) * uIntensity; // DRIFT
vec4  q = vec4(p, extra);

float wx = fbm4(vec4(p + vec2(5.2, 1.3), extra), uSeed + 11, 2);
float wy = fbm4(vec4(p + vec2(9.1, 7.7), extra), uSeed + 29, 2);
vec2  pw = p + uWarp * (vec2(wx, wy) - 0.5) * 2.0;

float h = fbm4(vec4(pw, extra), uSeed, uDetail);
h = clamp((h - 0.5) * uContrast + 0.5, 0.0, 1.0);

// GRAIN — integer pixels, NOT uv, NOT time
float g = hash41(ivec4(ivec2(gl_FragCoord.xy), 1, 1), uSeed);
h = clamp(h + (g - 0.5) * uGrain, 0.0, 1.0);

h = pow(h, pow(2.0, -uSpread));

// optional index-space Bayer (see Dithering); then:
float n = float(uBands);
float fx = h * n;
int   i0 = int(clamp(floor(fx), 0.0, n - 1.0));
vec3  col = uPalette[i0];
```

### 6. R3F wiring
`useFrame` writes `uTime` (seconds). Uniforms come from a frozen config object (next section). Resize writes `uResolution`. Do not regenerate the material every frame.

A good file split: `terrainConfig.ts`, `terrain.vert.glsl`, `terrain.frag.glsl`, `TerrainHero.tsx`.

---

## Dithering: which method + why

### Use these two, in this order

**A. Primary — ordered scalar grain (playgrnd Grain @ 30%). Required.**
- White-hash in **integer `gl_FragCoord`**, amplitude `uGrain` (0.3).
- Applied to height **before** `floor`.
- Why: this is literally the speckled contour edge in both reference screenshots. Palette inks stay exact; only the *boundary* breaks into the neighboring ink. Interiors stay flat. Reads as print, not as a dirty overlay.

**B. Optional — 8×8 Bayer in *index space* (not RGB).**
If the grain-only edge feels too stochastic and you want the playgrnd Dither-panel “screen” texture without wrecking color:

```glsl
float bayer8(vec2 frag) {
  // standard 8×8 Bayer, values 0..63
  int x = int(mod(floor(frag.x / uDitherPixel), 8.0));
  int y = int(mod(floor(frag.y / uDitherPixel), 8.0));
  int idx = /* matrix[y][x] */;
  return (float(idx) + 0.5) / 64.0;   // playgrnd centering
}

float fx = h * n;
float i0 = floor(fx);
float f  = fract(fx);
float t  = bayer8(gl_FragCoord.xy);
int   i  = int(clamp(i0 + step(t, f), 0.0, n - 1.0));
vec3 col = uPalette[i];
```

This **dithers which band**, so every pixel is still one of the 6 hexes. `uDitherPixel = 2.0`. Mix with grain by keeping grain low (~0.15) if both are on, otherwise edges double-speckle.

Default recommendation for v1: **A on, B off**. Turn B on only if grain-only looks too photographic/noisy compared to the captures.

### Do not use
- **Floyd–Steinberg / error diffusion** — sequential; not fragment-shader legal.
- **Animated white noise** (`random(uv+time)`) — crawling snow = jank.
- **`fract(sin(dot(uv,…)))` as the only hash** — visible sine lattice.
- **Bayer on RGB channels quantized to 3 tones** — playgrnd Dither panel. Shifts branded inks. This is the #1 “colors wrong” trap if you cargo-cult the UI labels.
- **Grey film-grain overlay after color** — looks like a CSS `filter: contrast()` meme, not a contour print.
- **Dither in UV/world space** — pattern scales/swims on resize.
- **`discard`-based dither** — kills early-Z, useless here (opaque hero).

### Common mistakes that look “wrong”
1. **Indexing Bayer with `uv * resolution` floats** instead of `floor(gl_FragCoord)`. Subpixel drift → shimmer on any layout/DPR change.
2. **Forgetting `(i+0.5)/N²`**. Uncentered thresholds bias every band toward the darker neighbour.
3. **Animating the grain hash** (Shimmer). Grain must be a locked screen pattern so the *field* moves under it.
4. **Grain after `floor`**. Adding noise to RGB cannot create band-edge speckle; it dirty-filters the whole image.
5. **`smoothstep` across bands “to anti-alias.”** Destroys the print look; you get a cheap gradient. AA the *geometry of the quad*, not the inks. Grain *is* the AA.
6. **Contour lines** (`1.0 - smoothstep(0.0, w, abs(fract(h*N)-0.5))`). Wireframe said landscape, not topo map strokes.
7. **Pixel size not integer.** `uDitherPixel` must be `1,2,3…`. Fractional sizes shear the matrix.
8. **DPR mismatch.** Bayer in backing-store pixels at `dpr=3` looks like dust; at `dpr=1` with `pixelSize=2` it looks like print. Cap DPR.

---

## Color: mapping bands to the wireframe palette

### Method
Hard lookup. `idx = floor(h * 6)` into a uniform array. No interpolation, no IQ cosine palette (`a+b*cos(2π(c·t+d))` is great for smooth ramps and **wrong** here).

### Canonical 6 inks (playgrnd default, matches wireframe + `terrain-default.png`)

Low field → high field (rotate to taste, do not reshuffle on load):

| idx | hex | role |
|---|---|---|
| 0 | `#510BF5` | royal violet / purple |
| 1 | `#75FBFA` | cyan / aqua |
| 2 | `#78FC4C` | lime / neon green |
| 3 | `#EAFE53` | yellow |
| 4 | `#EE7F31` | orange |
| 5 | `#EA337B` | hot pink |

If the hero reads “upside down” vs the wireframe, **rotate** once or twice (cycle the array) rather than picking new hexes. Saturation is the point; do not “tasteful-ize” them.

Playgrnd also ships named palettes (Reef, Bloom, Riso, Ash, Acid) — ignore for the hero. Pin the six hexes above.

### Color management (the other “colors wrong”)
- Author hex in **sRGB**.
- Feed via `new THREE.Color(hex)` (Three Color Management on in modern r3f).
- Shader works in **linear**.
- Convert to display with `#include <colorspace_fragment>` (or `toneMapped=false` **and** manually `LinearTosRGB` — don’t skip both).
- Never `gl_FragColor = vec4(hex/255,1)` and also enable renderer outputColorSpace sRGB — double encode = neon crush or pastel wash.
- Do not apply ACES/filmic tonemapping to a 6-color poster. `toneMapped = false` is the safer default for this material.

### Contrast vs palette
Contrast 1.7 is doing the tonal work. Do not also lift/gamma the palette. If yellow vanishes, lower contrast slightly (1.4–1.6) or nudge `uSpread`; do not desaturate.

---

## Tunables — config object

Ship as a frozen object the shader reads. Names below match playgrnd knobs so a designer can A/B against the live tool. Values are playgrnd defaults unless noted.

```ts
export const TERRAIN = {
  // Field
  scale: 2.6,          // Field scale  (0.6–9)
  warp: 1.1,           // Warp 110%    (0–3)  — keep ≥1.0 or it blobs
  detail: 5,           // Detail octaves (1–7); 4 if GPU-bound
  contrast: 1.7,       // Contrast 170% (0.5–4)
  spread: 0,           // Spread Even   (−1.2 later-bands … +1.2 earlier)
  seed: 7,             // Variation; integer. Wireframe-match start.

  // Grain (scalar, pre-floor) — this is playgrnd's left-rail "Dither 30%"
  grain: 0.3,          // 0–1.2
  blockiness: 0,       // 0 = off; >0 pixelates the field

  // Color
  bands: 6,
  palette: [
    '#510BF5', '#75FBFA', '#78FC4C',
    '#EAFE53', '#EE7F31', '#EA337B',
  ],

  // Motion (DRIFT). Loop closes exactly.
  motion: {
    mode: 'drift',     // 'drift' | 'tide' | 'warp'  — never 'shimmer'
    intensity: 0.6,    // 0.05–2.5
    fps: 12,           // visual cadence; shader can run at display Hz
    loopFrames: 30,    // period = loopFrames/fps = 2.5s
  },

  // Optional index-space Bayer (playgrnd Dither panel analogue)
  dither: {
    enabled: false,    // v1 off; grain already supplies the edge
    pattern: 'bayer8', // 'bayer8' | 'bayer4' | 'noise'
    pixelSize: 2,      // device pixels, integer
    // do NOT expose "tones: 3" — that was RGB-cube and it wrecks the palette
    amount: 1.0,
  },
} as const
```

Loop seconds for the shader: `loopFrames / fps` → **2.5**. Drive with real time (`useFrame` elapsed), not a 12 fps stepped clock — stepping the field at 12 fps looks like a GIF and reads as jank on a marketing hero. The *period* is 2.5 s; the *samples* can be 60 fps. (Playgrnd steps because it is CPU.)

Expose in a debug panel during build (leva is fine); freeze for prod.

---

## Anti-jank checklist

**Aliasing**
- [ ] `antialias: false` on the canvas.
- [ ] No `smoothstep` / `fwidth` on band edges.
- [ ] Grain (and Bayer, if on) in `gl_FragCoord` integers.
- [ ] `uDitherPixel` and any blockiness are integers.
- [ ] Cap DPR at 1.5.

**Shimmer / crawl**
- [ ] Grain hash does **not** include `uTime`.
- [ ] Bayer does **not** include `uTime`.
- [ ] Motion is `cos/sin(2π t / T)` extra axes, not `p + t`.
- [ ] Loop: `h(t=0)` equals `h(t=T)` (circle, not ping-pong).
- [ ] `prefers-reduced-motion` freezes time.

**Banding artifacts (the bad kind)**
- [ ] `highp` on, domain coordinates small.
- [ ] Contrast remap **then** grain **then** floor — never floor then filter.
- [ ] fBm **normalized** (`sum/norm`), otherwise octave count changes mean height and the palette slides.
- [ ] Aspect: divide **both** axes by `resolution.x` so a wide hero does not stretch blobs into sausages.

**Color**
- [ ] Palette via `THREE.Color`, linear in-shader, colorspace chunk on output.
- [ ] `toneMapped = false`.
- [ ] Every pixel is one of the 6 hexes (plus browser display convert). Eyeball with a color picker.

**Performance**
- [ ] Unroll / cap fBm at 5.
- [ ] Warp octaves stay at 2.
- [ ] No 4D noise when intensity=0 (2D path).
- [ ] One draw call, no `discard`, no extra blit.
- [ ] If < 30 fps on Intel iGPU: `detail: 4`, `dpr: 1`, still 2D-warp + 4D-field.

**Integration**
- [ ] Shader lives *behind* type/photos (`pointer-events: none`, z-index under hero UI).
- [ ] Rounded hero clip is CSS (`border-radius` + `overflow: hidden`) on the canvas wrapper, not a signed-distance in the shader (keeps dither aligned to pixels).

---

## Pass to coding agent — visual acceptance tests

Compare against `playgrnd-refs/terrain-default.png` and `playgrnd-refs/terrain-psychedelic.png` plus the site wireframe. Pause animation (`intensity=0` or `t=0`) for stills.

1. **Filled bands, not lines.** Six (or fewer, if contrast crushes) solid color regions. No black/white stroke outlines, no rainbow cosine smear.
2. **Palette lock.** A screenshot color-picked in band interiors hits the six hexes (± display/OS profile). No brown, no grey, no washed mint standing in for `#78FC4C`.
3. **Grain is edge-only.** Zoom 400%: interiors are flat; the pink/orange (etc.) border is a speckle of *those two inks*, 1 px (or 2 px if Bayer-on) dots. No full-frame film grain.
4. **Grain is static in screen space.** Pause the field, grain holds. Play the field, grain does **not** swim; the landscape morphs *under* a locked screen hash.
5. **Warp is doing work.** Set `warp=0` in debug: blobs become rounder/cell-like. At `warp=1.1` they marble/swirl like the captures. If 0 and 1.1 look the same, warp never landed.
6. **Contrast.** At 1.7, a few bands may dominate (good). At 0.5 the frame should look muddier/more equal-area. If both look identical, contrast remap is missing.
7. **Seamless loop.** Record ~5 s. No cut at the 2.5 s mark. No speed hitch (ping-pong). Drift, not pan.
8. **No crawl.** Grain/Bayer must not sparkle at 60 Hz on a still field.
9. **Aspect.** Hero is wide: blobs are roughly circular in pixel space, not stretched with the rectangle.
10. **Motion preference.** OS “reduce motion”: frozen first frame, still pretty.
11. **Jank vs aesthetic gut check.** Side-by-side with `terrain-psychedelic.png`. If it looks like a Shadertoy default (rainbow, swirling UV, simplex clouds), reject. If it looks like a risograph topo poster, pass.
12. **Perf.** 60 fps on M-series / recent Android at hero size; ≥30 fps on integrated GPU with the fallback (`detail:4`, `dpr:1`).

Fail the PR if dither is a grey overlay, if colors are a smooth gradient, or if the loop does not close.

---

## References

### Primary (this look)
- [https://www.playgrnd.tools/terrain](https://www.playgrnd.tools/terrain) — live tool; algorithm transcribed from inline JS 2026-09-03. UI: Field scale 2.6, Warp 110%, Detail 5, Contrast 170%, Spread Even, Grain/Dither 30%, Blockiness 0, Bands 6, DRIFT, Intensity 0.60, 12 fps, 30-frame loop, Dither panel Bayer 8 / pixel 2 / 3 tones.
- Local captures: `playgrnd-refs/terrain-default.png`, `playgrnd-refs/terrain-psychedelic.png`

### Noise / warp / fBm
- Inigo Quilez, *Domain Warping*: [https://iquilezles.org/articles/warp](https://iquilezles.org/articles/warp) — `fbm(p + fbm(p))`, and exposing `q`/`r`. Shadertoys: [4s23zz](https://www.shadertoy.com/view/4s23zz), [lsl3RH](https://www.shadertoy.com/view/lsl3RH)
- Book of Shaders, *Noise*: [https://thebookofshaders.com/11/](https://thebookofshaders.com/11/) — value vs gradient vs simplex (use **value**)
- Book of Shaders, *fBm + warp*: [https://thebookofshaders.com/13/](https://thebookofshaders.com/13/)

### Color (what not to do for this hero)
- Inigo Quilez, *Palettes*: [https://iquilezles.org/articles/palettes/](https://iquilezles.org/articles/palettes/) — cosine ramps; **too smooth** here. Useful only if you later want a debug “unquantized” view.

### Dither / quantization
- Maxime Heckel, *The Art of Dithering and Retro Shading for the Web* (2024): [https://blog.maximeheckel.com/posts/the-art-of-dithering-and-retro-shading-web/](https://blog.maximeheckel.com/posts/the-art-of-dithering-and-retro-shading-web/) — Bayer vs white vs blue noise; why error diffusion is not a fragment job; pixel snap
- Alex Charlton, *Dithering on the GPU*: [http://alex-charlton.com/posts/Dithering_on_the_GPU/](http://alex-charlton.com/posts/Dithering_on_the_GPU/) — hue/lightness palette dither (overkill; index-space Bayer is enough)
- Acerola, *Color Quantization and Dithering* (video): search “Acerola dithering quantization”
- Martins Upitis, *GLSL dithering*: [http://devlog-martinsh.blogspot.com/2011/03/glsl-dithering.html](http://devlog-martinsh.blogspot.com/2011/03/glsl-dithering.html)
- Codrops, *Building a Real-Time Dithering Shader* (2025): [https://tympanus.net/codrops/2025/06/04/building-a-real-time-dithering-shader/](https://tympanus.net/codrops/2025/06/04/building-a-real-time-dithering-shader/)

### R3F / Three wiring
- Adam Karlsten, *Shader backgrounds in R3F*: [https://adamkarlsten.com/blog/creating-shader-backgrounds/](https://adamkarlsten.com/blog/creating-shader-backgrounds/)
- Codrops, *Subtle shader background in R3F*: [https://tympanus.net/codrops/2024/10/31/how-to-code-a-subtle-shader-background-effect-with-react-three-fiber/](https://tympanus.net/codrops/2024/10/31/how-to-code-a-subtle-shader-background-effect-with-react-three-fiber/) — fullscreen quad + `colorspace_fragment`
- Three.js, *Color management*: [https://threejs.org/manual/en/color-management.html](https://threejs.org/manual/en/color-management.html)
- Three.js forum, ShaderMaterial + color management: [https://discourse.threejs.org/t/color-management-with-shadermaterials/83893](https://discourse.threejs.org/t/color-management-with-shadermaterials/83893)

### Do not cargo-cult
- Infinite-terrain R3F Bayer `discard` fades ([mesqme/infinite-terrain](https://github.com/mesqme/infinite-terrain)) — different problem (LOD circle fade), not posterised inks.
- Simplex-noise.js CPU libraries — wrong device, wrong noise family.

---

## Coding-agent summary (do this, not that)

**Do:** value-noise fBm → IQ domain warp → contrast → **static pixel-hash grain** → `pow` spread → `floor` into 6 linear `vec3`s → output via Three color space. Animate extra noise axes on a `cos/sin` circle so the loop closes.

**Don’t:** simplex default, cosine palette, RGB 3-tone Bayer, animated grain, contour *lines*, `smoothstep` bands, unbounded `uTime` in the noise domain.
