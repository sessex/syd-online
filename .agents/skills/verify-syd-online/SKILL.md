---
name: verify-syd-online
description: "Launch and verify the Syd Online Next.js portfolio through its real browser UI. Use after changing the landing page, hero motion, photo carousel, portfolio links, contact links, styling, assets, or responsive behavior."
---

# Verify Syd Online

Use this skill to prove the user-facing behavior of the Syd Online portfolio. The primary surface is the single-page browser UI at `/`; there is no authentication, database, API, CLI, or seeded data. Read [`features/README.md`](features/README.md) before choosing coverage.

## Launch

Run from the repository root. Use a unique run ID and a free port for every instance; never drive a server you did not start.

```bash
SYD_VERIFY_RUN_ID="$(date +%Y%m%d-%H%M%S)-$$"
SYD_VERIFY_PORT=4173
.agents/skills/verify-syd-online/scripts/server.sh start "$SYD_VERIFY_RUN_ID" "$SYD_VERIFY_PORT"
```

`start` performs a production build, launches that build on `127.0.0.1`, and waits until the page serves the expected Sydney Essex title. Runtime state is isolated at `/tmp/syd-online-verify-<run-id>/`. The helper deliberately refuses a second concurrent verification run because production builds share the repository's `.next` output; clean up the active owner before starting another run.

The ready signal is:

```text
READY http://127.0.0.1:<port> pid=<pid>
```

If the build or readiness check fails, run cleanup before trying again. Do not fall back to an existing server on the same port.

## Doctor

Run the read-only doctor before browser actions and whenever the instance looks stale:

```bash
.agents/skills/verify-syd-online/scripts/server.sh doctor "$SYD_VERIFY_RUN_ID"
```

Doctor requires the recorded PID to be alive, confirms that exact process is the recorded Next.js server, verifies the configured port and expected page title, and checks that Python Playwright plus Chromium can launch. A healthy instance prints `HEALTHY` with its URL, PID, and build ID. Treat any other result as undriveable.

## Drive

Drive the app with the bundled headless Playwright verifier. It uses accessible roles and names from the real rendered page, sends real pointer and keyboard input, and records the states it observes.

Run all mapped features:

```bash
SYD_VERIFY_EVIDENCE="$PWD/.verification/evidence/$SYD_VERIFY_RUN_ID"
python3 .agents/skills/verify-syd-online/scripts/verify.py \
  --url "http://127.0.0.1:$SYD_VERIFY_PORT" \
  --evidence-dir "$SYD_VERIFY_EVIDENCE"
```

Run one mapped feature with `--feature landing-page`, `--feature motion-control`, `--feature photo-carousel`, `--feature portfolio-links`, or `--feature contact-links`. Repeat `--feature` to combine selected features. The default is all features.

The verifier waits for JavaScript and the entrance sequence, proves the page identity and content, toggles motion and observes synchronized pressed/paused state, focuses the carousel and scrolls it by keyboard, verifies every portfolio/contact destination, and safely proves one representative external-link handoff by aborting only after the browser emits the expected outbound request.

For the editorial rows, also run `scripts/editorial.py` with the same `--url` and a new `--evidence-dir`. It checks the full hit targets, keyboard order, interrupted motion, chroma wave, reduced motion, touch, and six viewport widths. The `prove.sh` helper runs both verifiers.

## Evidence

Keep proof under `.verification/evidence/<run-id>/`. A successful full run contains:

- `report.json`: pass/fail status, exact actions, observed state, checked destinations, page errors, and console errors.
- `accessibility.aria.yml`: the rendered accessibility tree after JavaScript settles.
- `01_landing_page.png`: the loaded real page.
- `02_motion_before.png` and `03_motion_paused.png`: the action boundary and resulting pressed/paused state.
- `04_carousel_keyboard.png`: the focused carousel after a real `ArrowRight` key press.
- `05_portfolio_links.png` and `06_contact_links.png`: the two destination groups as rendered.
- `browser_walkthrough.webm`: the complete browser drive for the selected features.

Proof is valid only when `report.json` says `passed`, the actions were performed against the launched URL, every requested feature has a passing entry, and the screenshots/video exist. The UI controls—not React state setters or test-only routes—must produce the result. This app has no persistent writes; link side effects are outbound browser handoffs, so the verifier records their destinations and intercepts the representative network handoff at the production boundary instead of depending on third-party uptime. Do not claim an external site itself was verified.

## Cleanup

Stop only the exact PID recorded for this run:

```bash
.agents/skills/verify-syd-online/scripts/server.sh stop "$SYD_VERIFY_RUN_ID"
```

Cleanup terminates the recorded server and removes only `/tmp/syd-online-verify-<run-id>/`. It never removes `.verification/evidence/`. After cleanup, confirm proof survived:

```bash
test -s "$SYD_VERIFY_EVIDENCE/report.json"
test -s "$SYD_VERIFY_EVIDENCE/browser_walkthrough.webm"
```

Never kill by process name, never reuse another run's runtime directory, never remove another run's ownership lock, and never delete the evidence directory during cleanup.

## Helpers

All helpers are executable and live in [`scripts/`](scripts/):

- `server.sh start|doctor|stop <run-id> [port]` owns the production build instance and its scratch state.
- `verify.py --url <url> --evidence-dir <dir> [--feature <id>]` performs the browser drive and writes durable proof.
- `prove.sh <run-id> [port] [evidence-dir]` runs launch, doctor, the full browser drive, cleanup, and post-cleanup evidence checks in one command.

For the shortest complete proof:

```bash
.agents/skills/verify-syd-online/scripts/prove.sh \
  "$(date +%Y%m%d-%H%M%S)-$$" \
  4173
```
