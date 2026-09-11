# Pixel Wishes cursor

The Pixel Wishes cursor adds a pixel butterfly follower and falling heart trail for fine-pointer users. It does not replace the native cursor or intercept page input.

## Sub-features

- `pixel-wishes-layers` renders direct sibling inversion and color canvases above the page.
- `pixel-wishes-motion` follows mouse movement, boosts emission while pressed, drains particles, and sleeps when settled.
- `pixel-wishes-gates` clears and disables under reduced motion, coarse pointers, pointer leave, and blur.
- `pixel-wishes-boundaries` preserves clicks, focus order, native cursor visibility, viewport sizing, and narrow-page width.

## Driving it

Run `python3 .agents/skills/verify-syd-online/scripts/pixel_wishes.py --url "$URL" --evidence-dir "$EVIDENCE"` against the production server reported by `server.sh doctor`.

The verifier uses real Playwright mouse, press, click, resize, and touch input. It checks both canvases for painted pixels, compares unpressed and pressed emission, waits for the runtime to settle with no particles, verifies click-through to the scenery control, and checks backing dimensions at a device scale above the production cap. Separate reduced-motion and mobile touch contexts prove suppression.

## Proof

Require `report.json` with `status` set to `passed`, `01_pixel_wishes_hero.png`, `02_pixel_wishes_editorial.png`, and `pixel_wishes_walkthrough.webm`.

The report must show two direct canvas siblings, difference blending only on the inversion layer, nonzero pixels on both layers, materially higher pressed emission, zero particles after settlement, no horizontal overflow, cleared canvases after leave and blur, and no page or console errors.

## Gotchas

- A settled butterfly may remain painted after its requestAnimationFrame loop stops. Pointer leave, blur, hidden-document state, and motion gates clear it.
- CSS visibility alone does not prove the engine stopped. Check the disabled reason, emitted count, and blank backing buffers.
- The touch context verifies the browser's coarse primary-pointer media query. It does not emulate every hybrid hardware combination.
