# Portfolio disclosures and links

Scroll to projects or experience and activate a row by its name, blurb, date, or padding.
The row reveals the description and a lowercase visit link when a destination exists.
Iris shows "coming soon". Goldman Sachs shows no link or fallback status.
Unavailable entries render no placeholder anchors.

Run the portfolio-links feature in scripts/verify.py. It opens all seven disclosures,
checks five HTTPS destinations, one status message, and one empty unavailable state. It
also observes Trouvaille's outbound request from its visit link. The external response is
intentionally not verified.

Run scripts/editorial.py for click targets, keyboard navigation, transition interruption,
chroma animation, reduced motion, emulated touch, responsive widths, and screenshots.
Pass --url and --evidence-dir as with verify.py. Retain its report and recording.
