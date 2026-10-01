# Vanity catalog thumbnails

Completed 2026-10-01 for all nine existing vanity catalog items. No new presets were added.

Studio scene: `8d89fd3ca068` (Bath Space · vanity thumbnail studio).

Each item is inserted alone into a newly cleared studio. The browser renderer uses the production vanity geometry, a neutral floor, studio lighting, a 32° perspective camera facing the front at direction `(0.85, 0.85, -1.5)`, and a 1280 × 800 screenshot. The scene is cleared between items and after the final item.

Images are generated individually with the built-in image generation tool, using each screenshot as a geometry and camera reference. Generated images are illustrative catalog thumbnails; model geometry remains authoritative.

## Prompt

Use case: product-mockup. Generate a polished photorealistic bathroom vanity catalog thumbnail using the supplied screenshot as strict geometry and three-quarter camera-angle reference. Preserve exact cabinet silhouette, drawer or door count, front details, handles, legs or floor clearance, and countertop outline. White satin cabinetry, pale white stone countertop, metallic hardware. Isolated single vanity centered fully visible with comfortable padding on a genuinely transparent background. Soft studio lighting and crisp readable details. Do not add basin, faucet, mirror, walls, props, text, or watermark.

Final regeneration constraint for freestanding Fluted and wall-mounted Open console: produce a clean product cutout with no cast shadow, glow, halo, or gradient backdrop; all pixels outside the cabinet silhouette must be fully transparent.

## Assets

- freestanding--modern: [reference](thumbnail-references/vanity-freestanding--modern-scene.png), [thumbnail](../src/freestanding-vanity/assets/freestanding--modern.png)
- freestanding--shaker: [reference](thumbnail-references/vanity-freestanding--shaker-scene.png), [thumbnail](../src/freestanding-vanity/assets/freestanding--shaker.png)
- freestanding--fluted: [reference](thumbnail-references/vanity-freestanding--fluted-scene.png), [thumbnail](../src/freestanding-vanity/assets/freestanding--fluted.png)
- freestanding--console: [reference](thumbnail-references/vanity-freestanding--console-scene.png), [thumbnail](../src/freestanding-vanity/assets/freestanding--console.png)
- wall--modern: [reference](thumbnail-references/vanity-wall--modern-scene.png), [thumbnail](../src/freestanding-vanity/assets/wall--modern.png)
- wall--shaker: [reference](thumbnail-references/vanity-wall--shaker-scene.png), [thumbnail](../src/freestanding-vanity/assets/wall--shaker.png)
- wall--fluted: [reference](thumbnail-references/vanity-wall--fluted-scene.png), [thumbnail](../src/freestanding-vanity/assets/wall--fluted.png)
- wall--console: [reference](thumbnail-references/vanity-wall--console-scene.png), [thumbnail](../src/freestanding-vanity/assets/wall--console.png)
- corner--angled: [reference](thumbnail-references/vanity-corner--angled-scene.png), [thumbnail](../src/freestanding-vanity/assets/corner--angled.png)

## Reproduce

Run `bun scripts/vanity-thumbnail-studio.ts` from this package with the scene API on port 3002. Open `http://localhost:5192/?shape=freestanding--modern`, substituting an asset ID above. `/clear` removes the vanity. Set `VANITY_THUMBNAIL_SCENE_ID` to reuse the studio.
