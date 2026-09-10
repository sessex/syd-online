# Smooth scrolling

Wheel input eases the page toward its destination on devices with a fine pointer. Reduced motion and horizontal carousel input keep native browser scrolling.

## Entry points

- Scroll vertically over the page with a mouse wheel or trackpad.
- Interrupt easing with a pointer press or keyboard input.
- Enable reduced motion and scroll vertically.
- Focus the photo carousel and scroll horizontally.

## Run the check

Use a healthy production instance and a fresh browser context at 1440×1000 with motion enabled.

```bash
python3 .agents/skills/verify-syd-online/scripts/verify.py \
  --url "$URL" --evidence-dir "$EVIDENCE" --feature smooth-scroll
```

The verifier records a trusted 600px wheel event and samples the page position over time. It requires an intermediate position, the expected destination, and a stable final position. Pointer and Escape input must stop an active scroll. An external document scroll during easing must keep its new position.

The reduced-motion check requires a trusted wheel event that the app does not prevent, followed by native page movement. The horizontal check requires the carousel to move without changing the page's vertical position.

## Proof

Require a passing `smooth-scroll` entry in `report.json`, the recorded actions and samples, `02_scroll_before.png`, `03_scroll_after.png`, and the walkthrough video.

The external-scroll regression uses `window.scrollTo` during a real wheel gesture. This checks integration with other scroll callers. It does not substitute for the wheel, pointer, keyboard, or carousel actions.

There is no nested vertical scroll container on this page. The report names that coverage gap. The browser check does not claim touch-device coverage.
