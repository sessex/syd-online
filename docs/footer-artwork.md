# Silver gem footer

The footer has four linked word images and three decorative stars. Each record in `siteContent.footer.links` owns its destination, image path, and native dimensions. The renderer inserts the shared star between adjacent links.

The artwork derives from the silver gem footer strip selected by the user. That strip used `public/brand/subtitle-sparkle.png` as its lettering and material reference. The separate assets and background removal passes use the built-in imagegen tool.

## Artwork prompts

Use the approved strip as the input. Extract each word separately, substituting `x`, `linkedin`, `github`, or `email`.

> Extract only this word as a separate image. Preserve the selected lettering, proportions, gem placement, silver color, and sparkle rays. Remove the other words and stars. Do not change the font or add details.

Extract the first star from the same strip for the shared separator.

The short background-removal prompt was more reliable than the detailed extraction prompt.

> Remove background, keep everything else the same.

GitHub and the star needed a second pass.

> Remove the background. Make it transparent. Keep everything else the same.

X needed an intermediate flat green background because repeated direct removals kept returning opaque checkerboards. A final pass with the short removal prompt produced real transparency.

The final files use `footer-<word>-v2.png` and `footer-star-v2.png` so image optimization caches cannot serve the previous artwork.

Check the actual alpha channel after every pass. A displayed checkerboard can be painted into an opaque image. Keep the final PNG alpha channels when replacing or exporting these assets.

## Verify the footer

Use an isolated checkout and an unused port. Start the production app in one terminal.

```sh
npm ci
npm run build
npm run start -- -H 127.0.0.1 -p 42871
```

The browser verifier requires Python Playwright and Chromium. Run it in a second terminal.

```sh
python3 -m pip install playwright
python3 -m playwright install chromium
python3 scripts/verify-footer.py --url http://127.0.0.1:42871 --evidence-dir /tmp/syd-footer-evidence
```

The check covers four distinct loaded word images, unchanged destinations, three stars outside every link rectangle, pointer hit targets, 44 pixel minimum targets, keyboard focus, and outbound browser requests. It also reads the decoded pixels of all seven rendered images and requires fully transparent corners and more than 20% fully transparent pixels. Each viewport report records those measurements.

It captures the actual page at 320, 390, 768, and 1440 pixels. It intercepts external requests and does not open the email application. It verifies this site's handoff, not third-party page content.

The initial reproduction failed with `FAIL: x must contain one word image`.

## Browser evidence

Desktop at 1440 pixels.

![Silver gem footer at 1440 pixels](footer-desktop.png)

Phone at 390 pixels.

![Silver gem footer at 390 pixels](footer-mobile.png)
