# BURNED original art

All sprite illustrations, SVG drawing code, and the WARDEN card back were authored from scratch by Astra for BURNED. They are original pixel illustrations built from integer-coordinate rectangles and filled polygons, with a restrained ink, cream, teal, burgundy, gold, and lilac palette. No external copyrighted art or icon library was used.

Run `node assets-src/build-art.mjs` from the repository root to regenerate the assets.

- `public/assets/art/cards/{id}.svg`: 30 original exploit illustrations, aligned to `src/data.js` card IDs.
- `public/assets/art/rigs/{id}.svg`: 20 original rig illustrations, aligned to `src/data.js` rig IDs.
- `public/assets/art/{concept-slug}.svg`: individual concept sources, including eight alternate rig illustrations.
- `public/assets/sprites.svg`: optional symbol sprite sheet; each symbol ID is a concept slug.
- `public/assets/card-back.svg`: original ornamental WARDEN eye card back, 100 × 140 units.
- `assets-src/contact-sheet.svg`: labeled visual inventory of all 58 illustrations.

Individual sprite SVGs use a native 64 × 48 viewBox with `shape-rendering="crispEdges"`. Render them with `<img src="/assets/art/cards/pretext.svg">` or `<img src="/assets/art/rigs/mask.svg">`. Prefer integer scale factors and CSS `image-rendering: pixelated` for consistent pixel edges. The transparent art sits on a cream card surface.

## Background provenance

`public/assets/under-plasma.png` was generated using the built-in imagegen tool, then copied into this repository. Its prompt was:

> Original widescreen 1536x1024 dark teal/burgundy marbled CRT pixel plasma background, charcoal #101a1c/deep teal #153d3c/burgundy #49212c, ordered dithering, dark center, no text/UI/objects.

The background is separate from the procedural sprite generator and is not modified by it. No external copyrighted art was used.

`public/assets/under-plasma.webp` is a delivery-optimized conversion of the same original PNG, preserving its dimensions. Run `node assets-src/optimize-background.mjs` to regenerate it with Sharp WebP quality 90, effort 6, and smart chroma subsampling. The original PNG is preserved; the conversion introduces no new art content.
