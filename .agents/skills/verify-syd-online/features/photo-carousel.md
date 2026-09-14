# Photo carousel

The hero photo carousel continuously moves while unfocused, including under a pointer, and becomes a native horizontally scrollable gallery when a keyboard user focuses it.

## Sub-features

- `carousel-label` exposes the carousel as a labeled region.
- `carousel-hover-autoplay` keeps the carousel moving while a pointer hovers over it.
- `carousel-focus` accepts keyboard focus.
- `carousel-keyboard-scroll` moves horizontally after an `ArrowRight` key press.
- `carousel-images` exposes five descriptive image alternatives in the primary group.

## How to get to it (user POV)

- Open `/` and move keyboard focus to `Sydney’s photo carousel. Scroll to explore.`.
- Move the pointer over the carousel and observe that its automatic motion continues.
- Press `ArrowRight` or `ArrowLeft` to browse manually.

## Driving it with verify.py

Preconditions:

- The production app is healthy and the carousel keyboard/blur hydration check has passed.
- The browser viewport is wide enough for the hero and carousel to render normally.

- **Hover the gallery.** Find the region `Sydney’s photo carousel. Scroll to explore.`. Run `python3 .agents/skills/verify-syd-online/scripts/verify.py --url "$URL" --evidence-dir "$EVIDENCE" --feature photo-carousel`. Move keyboard focus away if another recipe left the gallery focused. Move the real pointer over it, sample the rendered track position, wait, and require the track to keep moving.
- **Focus the gallery.** Focus the same region directly through the browser input API.
- **Record position.** Read the native `scrollLeft` value while the real element has focus.
- **Scroll by keyboard.** Press `ArrowRight`, then observe `scrollLeft` again. The second value must be greater than the first.
- **Proof.** Require `04_carousel_keyboard.png`, the hover autoplay positions, the keyboard before/after scroll positions and positive distance in `report.json`, and the walkthrough video.

## Gotchas

- Do not mutate `scrollLeft` from JavaScript; that bypasses the user path.
- The duplicate marquee group is intentionally hidden from accessibility. Count the five primary image alternatives, not ten DOM images.
- Hover must not focus the carousel. Focus changes the CSS animation mode, so verify autonomous motion before the keyboard check.
