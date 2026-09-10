# Landing page

The landing page introduces Sydney Essex, presents the about copy, lists projects and experience, and ends with a contact strip in one continuous browser page.

## Sub-features

- `landing-identity` shows the Sydney Essex document title and hero heading.
- `landing-about` renders the labeled about section.
- `landing-projects` renders the projects heading and entries.
- `landing-experience` renders the experience heading and entries.
- `landing-footer` renders the contact strip at the end of the page.

## How to get to it (user POV)

- Open `/` in a browser.
- Scroll down from the hero through About, Projects, Experience, and the contact strip.

## Driving it with verify.py

Preconditions:

- The production app is healthy at the URL reported by doctor.
- JavaScript is enabled and the entrance state has completed.

- **Open the site.** Navigate to `/` and wait for the network to settle. Run `python3 .agents/skills/verify-syd-online/scripts/verify.py --url "$URL" --evidence-dir "$EVIDENCE" --feature landing-page`. The title is `Sydney Essex - Product Engineer`.
- **Confirm identity.** Find the region `Introducing Sydney Essex` and level-one heading `SYDNEY ESSEX`. Both are visible.
- **Confirm the narrative.** Find the region `About Sydney Essex` and the level-two headings `projects` and `experience`. All are present in the rendered page.
- **Proof.** Require `01_landing_page.png`, `accessibility.aria.yml`, the walkthrough video, and a passing `landing-page` entry in `report.json`.

## Gotchas

- The entrance overlay can temporarily cover the hero; wait for `data-entrance="complete"` instead of using a fixed short sleep.
- The hero's visible title is an image whose accessible name comes from its alt text.
- A server response alone does not prove client rendering; wait for JavaScript and inspect the real page.
