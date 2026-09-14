# Chromatic title trails

Sweep across any project or experience title with a mouse. The black letters remain fixed while colored trails follow the pointer movement. The trail persists after exit, fades, and stops rendering when it becomes transparent. A stationary hover or keyboard focus does not create motion.

The approved preset uses opacity 73, strength 57, travel 32, spread 128, brush 33, fade 1253, softness 27, and feather 55. Production has no tuning controls or saved user overrides.

Run scripts/chromatic_trails.py with --url and a new --evidence-dir after server.sh start and doctor. It uses actual pointer strokes, keyboard activation, scrolling, viewport resize, and browser motion preferences. Pillow reads the captured pixels. The script verifies that solid black glyph pixels remain unchanged during a persistent trail, opposite strokes produce different output, and the canvas clears before its lifecycle reports idle.

The same drive covers all seven titles, disclosure reflow, a narrow layout, touch, reduced motion, forced colors, and a Chromium instance with WebGL disabled. The data-chromatic-trail canvas exposes its real lifecycle through data-state. No React state setters or app test hooks are used. Canvas image reads observe rendered output.

Retain report.json, desktop screenshots, phone-static.png, and chromatic-trails.webm. Run editorial.py for all row hit targets, keyboard order, interrupted transitions, and six viewport widths. Run pixel_wishes.py to check the existing cursor alongside this effect.
