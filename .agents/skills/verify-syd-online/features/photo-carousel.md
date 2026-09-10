# Photo carousel

The hero photo carousel continuously moves when unfocused and becomes a native horizontally scrollable gallery when a keyboard user focuses it.

## Sub-features

- `carousel-label` exposes the carousel as a labeled region.
- `carousel-focus` accepts keyboard focus.
- `carousel-keyboard-scroll` moves horizontally after an `ArrowRight` key press.
- `carousel-images` exposes five descriptive image alternatives in the primary group.

## How to get to it (user POV)

- Open `/` and move keyboard focus to `Sydney’s photo carousel. Scroll to explore.`.
- Press `ArrowRight` or `ArrowLeft` to browse manually.
- Swipe or horizontally scroll the same region on touch/pointer devices.

## Driving it with verify.py

Preconditions:

- The production app is healthy and the entrance state has completed.
- The browser viewport is wide enough for the hero and carousel to render normally.

- **Focus the gallery.** Find the region `Sydney’s photo carousel. Scroll to explore.`. Run `python3 .agents/skills/verify-syd-online/scripts/verify.py --url "$URL" --evidence-dir "$EVIDENCE" --feature photo-carousel`. Focus it directly through the browser input API.
- **Record position.** Read the native `scrollLeft` value while the real element has focus.
- **Scroll by keyboard.** Press `ArrowRight`, then observe `scrollLeft` again. The second value must be greater than the first.
- **Proof.** Require `04_carousel_keyboard.png`, the before/after scroll positions and positive distance in `report.json`, and the walkthrough video.

## Gotchas

- Do not mutate `scrollLeft` from JavaScript; that bypasses the user path.
- The duplicate marquee group is intentionally hidden from accessibility. Count the five primary image alternatives, not ten DOM images.
- Focus changes the CSS animation mode; verify native scrolling after focus rather than trying to sample the autonomous marquee.
