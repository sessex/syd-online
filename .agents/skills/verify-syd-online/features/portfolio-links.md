# Portfolio disclosures and links

Scroll to projects or experience and activate a row by its name, blurb, date, or padding.
The row reveals the description and a Visit link when a destination exists.
Iris shows "in development for iOS"; Goldman Sachs and VBN show "link coming soon".
These entries render no placeholder anchors.

Run the portfolio-links feature in scripts/verify.py. It opens all seven disclosures,
checks four HTTPS destinations and three status messages, and observes Trouvaille's
outbound request from its Visit link. The external response is intentionally not verified.

Run scripts/editorial.py for click targets, keyboard navigation, transition interruption,
chroma animation, reduced motion, emulated touch, responsive widths, and screenshots.
Pass --url and --evidence-dir as with verify.py. Retain its report and recording.
