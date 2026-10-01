# Bath catalog thumbnails

Completed 2026-10-01 for all ten existing bathtub presets. No new catalog items were added.

## Capture and generation

A new saved scene, `42afcc7b02f6` (Bath Space · bath thumbnail studio), was used. Each capture replaced the prior product with an empty studio, then inserted exactly one bath. Drop-in and undermount captures include their actual deck assembly. The studio was cleared after the last capture.

The browser renderer uses the production bath and deck geometry builders, a neutral floor, studio lighting, and a perspective camera at a three-quarter angle. Camera directions relative to the product center: ordinary baths `(0.8, 1.3, -1.5)`, walk-in `(-1, 2, -1.4)` to reveal the seat and door, slipper `(-1, 0.9, -1.5)`. FOV 32°, distance 2.35 times the largest model dimension, screenshot viewport 1280 × 800. Defaults come from `scripts/bath-thumbnail-scene.ts`.

Each screenshot was inspected and passed individually to the image generation tool as a geometry and angle reference. Images use glossy white bath finishes, chrome existing hardware, pale stone existing decks, and transparent backgrounds. Generated images are illustrative catalog thumbnails; the model geometry remains authoritative.

## Completed checklist

| Done | Bath | Scene reference | Catalog image |
| --- | --- | --- | --- |
| [x] | oval | [Screenshot](thumbnail-references/bath-oval-scene.png) | [Thumbnail](../src/bathtub/assets/oval.png) |
| [x] | rectangle | [Screenshot](thumbnail-references/bath-rectangle-scene.png) | [Thumbnail](../src/bathtub/assets/rectangle.png) |
| [x] | slipper | [Screenshot](thumbnail-references/bath-slipper-scene.png) | [Thumbnail](../src/bathtub/assets/slipper.png) |
| [x] | clawfoot | [Screenshot](thumbnail-references/bath-clawfoot-scene.png) | [Thumbnail](../src/bathtub/assets/clawfoot.png) |
| [x] | back-to-wall | [Screenshot](thumbnail-references/bath-back-to-wall-scene.png) | [Thumbnail](../src/bathtub/assets/back-to-wall.png) |
| [x] | alcove | [Screenshot](thumbnail-references/bath-alcove-scene.png) | [Thumbnail](../src/bathtub/assets/alcove.png) |
| [x] | drop-in | [Screenshot](thumbnail-references/bath-drop-in-scene.png) | [Thumbnail](../src/bathtub/assets/drop-in.png) |
| [x] | undermount | [Screenshot](thumbnail-references/bath-undermount-scene.png) | [Thumbnail](../src/bathtub/assets/undermount.png) |
| [x] | corner | [Screenshot](thumbnail-references/bath-corner-scene.png) | [Thumbnail](../src/bathtub/assets/corner.png) |
| [x] | walk-in | [Screenshot](thumbnail-references/bath-walk-in-scene.png) | [Thumbnail](../src/bathtub/assets/walk-in.png) |

## Reproduce captures

Run `bun scripts/bath-thumbnail-studio.ts` from this package with the editor scene API running on port 3002. Open `http://localhost:5191/?shape=oval`, substituting a preset shape. The server creates a new studio unless `BATH_THUMBNAIL_SCENE_ID` identifies an existing studio. Visit `/clear` after capture. Renderer and scene setup are retained in `scripts/bath-thumbnail-*.ts`.

`BathPreview` uses the generated assets for both catalog cards and placed bath previews.
