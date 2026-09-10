# Editorial portfolio

The About, projects, and experience sections use the selected editorial prototype's
layout, final copy, and dates. The prototype remains a scratch artifact; production
content lives in `src/content/site.ts`.

## Interaction decisions

- Each row is one native button with its title as the accessible name and its date
  and blurb as the description. Enter and Space toggle it. The description panel
  remains mounted for interrupted transitions, but is inert and aria-hidden as soon
  as it closes. Links appear only for real destinations.
- Opening interpolates a CSS grid track from 0fr to 1fr over 320ms; closing takes
  280ms. A decelerating curve settles without bounce. The text fades over 240ms on
  entry and 160ms on exit. There is no guessed max-height or timed DOM removal.
- Two decorative copies of each letter move at most 0.04em horizontally. The base
  glyph stays dark and stationary. A 20ms stagger carries one 380ms pulse through
  the title on hover or keyboard focus. Word boundaries remain valid wrap points.
- Coarse pointers do not trigger a hover wave. Reduced motion disables the wave
  and transitions; forced colors hides decorative letter layers.

## Tool research, September 10, 2026

The [Fancy Components reference](https://www.fancycomponents.dev/docs/components/text/letter-3d-swap)
uses per-character staggering with Motion. This implementation keeps the stagger
and replaces rotation with small pink/green offsets.

[web.dev's animation guidance](https://web.dev/articles/animations-guide) recommends
transform and opacity for animation that can avoid layout and paint. The colored
glyph copies follow that guidance. Disclosure height necessarily changes layout
because it moves subsequent content; only the panel's grid track does that work.

[Motion supports auto-height animation](https://motion.dev/docs/react-animation)
and is already installed for the hero. CSS grid transitions are enough for these
seven simple disclosures and avoid measurement callbacks or another animation
runtime in the index. No dependency was added.

[MDN lists interpolate-size as limited availability](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/interpolate-size),
so the disclosures do not depend on that newer intrinsic-size feature.
[Grid tracks support interpolation](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/grid-template-rows).
The button semantics follow the [WAI accordion pattern](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/).

## Verification

Use `.agents/skills/verify-syd-online/scripts/server.sh` to build and launch an owned
production instance, then run `verify.py` for the site baseline and `editorial.py`
for disclosure, chroma, keyboard, touch, responsive, and reduced-motion coverage.
Both accept `--url` and a new `--evidence-dir`.
