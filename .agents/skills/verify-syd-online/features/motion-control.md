# Motion control

The hero motion control lets a user pause and resume both the pixel background and photo carousel from one labeled button.

## Sub-features

- `motion-pause` changes the control from `Pause motion` to `Play motion`.
- `motion-synchronize` marks the hero and carousel as paused together.
- `motion-resume` restores the control and both animated regions to playing.

## How to get to it (user POV)

- Open `/` and use the `Pause motion` button at the lower-right of the hero.
- Use the same control, now named `Play motion`, to resume.

## Driving it with verify.py

Preconditions:

- The production app is healthy and the entrance state has completed.
- Browser motion preference is `no-preference`.

- **Observe the initial state.** Find the `Pause motion` button. Run `python3 .agents/skills/verify-syd-online/scripts/verify.py --url "$URL" --evidence-dir "$EVIDENCE" --feature motion-control`. Its `aria-pressed` value is `false`; `02_motion_before.png` captures this action boundary.
- **Pause.** Click `Pause motion`. The button becomes `Play motion` with `aria-pressed="true"`; the hero frame and photo carousel both expose `data-motion-paused="true"`.
- **Resume.** Click `Play motion`. The accessible name returns to `Pause motion` with `aria-pressed="false"`.
- **Proof.** Require `02_motion_before.png`, `03_motion_paused.png`, the walkthrough video, the two click actions, and a passing `motion-control` entry in `report.json`.

## Gotchas

- The accessible name changes after every click; reacquire the button by its new name.
- Visual animation samples are timing-sensitive. Prove the semantic pressed state and the two synchronized paused attributes, not pixel-by-pixel movement.
- Restore playing state so later feature recipes begin from the normal experience.
