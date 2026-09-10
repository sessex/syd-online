# Contact links

The footer gives users four labeled destinations, X, LinkedIn, GitHub, and email.

## Sub-features

- `contact-x` targets Sydney's X profile.
- `contact-linkedin` targets Sydney's LinkedIn profile.
- `contact-github` targets Sydney's GitHub profile.
- `contact-email` targets Sydney's email address with a `mailto:` URL.

## How to get to it (user POV)

- Scroll to the footer contact strip.
- Choose `x`, `linkedin`, `github`, or `email` in the Contact navigation.

## Driving it with verify.py

Preconditions:

- The production app is healthy and the carousel keyboard/blur hydration check has passed.
- The footer lettering images have loaded. Their alt text provides each link's accessible name.

- **Reach the footer.** Run `python3 .agents/skills/verify-syd-online/scripts/verify.py --url "$URL" --evidence-dir "$EVIDENCE" --feature contact-links`. Scroll the real footer into view.
- **Inspect destinations.** Match the four links by their exact accessible names and verify `https://x.com/waifu101`, `https://www.linkedin.com/in/sydneyessex/`, `https://github.com/sessex`, and `mailto:sydneyressex@gmail.com`.
- **Proof.** Require `06_contact_links.png`, all four destinations in `report.json`, the accessibility snapshot, and the walkthrough video.

## Gotchas

- Each contact link contains its own lettering image. Separators are decorative.
- Do not activate `mailto:` in automation; opening an external mail composer is outside the app and may change user state.
- Verifying hrefs proves this app's wiring, not the availability or ownership of third-party profiles.
