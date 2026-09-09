# 🎞 Sprite Animator

Turn **one still sprite** — including AI-generated character art from GPT Images / Gemini etc. — into a **seamless, looping animation**, entirely in your browser.

**Live: https://jaxjixmix.github.io/sprite-animator/**

No uploads. No tracking. Every pixel is processed locally on the page (strict CSP, zero external requests, single self-contained JS file).

## What it does

- **Drop in one still sprite** (PNG / WebP / JPEG, or paste from clipboard)
- **Cleans AI-art baggage automatically**: removes baked checkerboard / flat backgrounds from JPEGs (border flood-fill with adjustable strength), auto-trims empty margins
- **Finds the actual sprite**: if the image contains several separate figures (or 16 identical grid copies — a classic GPT Images failure), it detects them and lets you pick one; it also flags when the copies are all the same pose
- **Synthesizes motion** with procedural presets — every waveform is a harmonic of the loop frequency, so the animation is mathematically seamless forever:
  - Idle · Bounce · Hop · Walk · Run · Float · Sway · Pulse · Shake
- **Preview** smooth motion or step through the exact exported frames; scrub, tempo, zoom, crisp-pixels toggle, checker/white/black backdrop
- **Export**:
  - **Animated GIF** (loop forever; transparent when the sprite has alpha)
  - **Video** (WebM VP9/VP8, MP4 fallback)
  - **Game-ready sprite sheet PNG + `frames.json`** (uniform frame cells, Phaser-compatible: `frameWidth`, `frameHeight`, `fps`, layout)

## Why "generate" instead of frame-by-frame

Image models still can't draw consistent multi-frame animation: they repeat the same pose (16 identical copies) or drift on later frames. Sprite Animator sidesteps this — the image provides the *look*, and the animator provides the *motion*, with guaranteed loopable results and exportable frames.

## Development

Pure static, no build step for deployment:

```
python3 build.py        # inlines vendored gifenc + demo sprite into app.js
python3 -m http.server  # serve the folder, open localhost:8000
```

- `index.html` — markup + styles (CSP: no network allowed)
- `app.template.js` → `app.js` — app code (build injects the encoder & demo asset)
- `samples/demo-sprite.png` — bundled "Try demo sprite" asset
- GIF encoding uses [gifenc](https://github.com/mattdesl/gifenc) (MIT), vendored and inlined.
