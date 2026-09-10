# Syd Online verification map

This directory is the maintained source for verifying the user-facing behavior of the Syd Online portfolio. Read this index before driving the app, then use the matching feature recipe.

## Baseline preconditions

- Build and launch the real production app with `scripts/server.sh start <run-id> <port>`.
- Use a unique run ID and port; runtime state belongs only to `/tmp/syd-online-verify-<run-id>/`.
- Run only one verifier at a time. The launcher owns `/tmp/syd-online-verify.lock` because concurrent production builds would share `.next`.
- Require `scripts/server.sh doctor <run-id>` to print `HEALTHY` for the same URL and PID.
- Use a fresh Playwright browser context at a 1440×1000 viewport with motion enabled.
- Never drive an instance the verification run did not start.
- The app has no auth, database, seed data, or persistent user mutations.

## Driving conventions

- Start every recipe from `/` after `networkidle` and `[data-entrance="complete"]`.
- Prefer ARIA roles and accessible names; use data attributes only for visual state with no semantic equivalent.
- Send real clicks, focus, keyboard presses, and scroll actions through `scripts/verify.py`.
- Entries configured with `#` render status copy without anchors; verify that they cannot navigate.
- Intercept representative external navigation only after the browser emits the requested URL; do not depend on third-party uptime.
- Restore the motion control to playing after a pause-state check.

## Proof and skip reporting

- Capture the action boundary and resulting state, not only a final screenshot.
- Require `report.json`, the accessibility snapshot, relevant screenshots, and `browser_walkthrough.webm`.
- Record the exact selected feature IDs and launched URL.
- Treat browser page exceptions as failures. Preserve console errors in the report for diagnosis.
- Do not claim an external destination's content was verified when only the app's handoff was checked.
- Report an unreachable user path with the failed selector, action, and unmet precondition.
- Cleanup runtime state after every attempt; retain evidence after cleanup.

## Feature entry contract

Each feature file describes what the user can do, every visible entry point, the exact verifier command, the observable proof, and traps that can invalidate the run. A full verification run covers all files; a focused run must name the selected feature explicitly.

## Features

- [Landing page](./landing-page.md) covers the complete rendered portfolio structure and identity.
- [Motion control](./motion-control.md) covers pause/play input and synchronized visual state.
- [Photo carousel](./photo-carousel.md) covers keyboard focus and manual horizontal scrolling.
- [Portfolio links](./portfolio-links.md) covers project and experience destinations plus a representative outbound handoff.
- [Contact links](./contact-links.md) covers X, LinkedIn, GitHub, and email destinations.
