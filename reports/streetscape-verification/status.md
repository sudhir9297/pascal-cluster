# Streetscape verification

The map workspace is being aligned with the editor's existing UI. The goal remains active; visual accuracy is not yet verified.

## Verified

- Existing app: `http://localhost:3002`.
- Real location: Place Charles de Gaulle, Paris, center `48.8738, 2.2950`, radius 250 m.
- Import preview: 127 street segments, 270 mapped objects (172 lights, 94 signals, 4 signs).
- Saved scene: `/scene/21ffeff88e16`, version 2, 274 nodes, 9,503,722 stored bytes.
- Compact component identities reduced the uncompressed project from 309,049,864 to 41,593,044 bytes without discarding source evidence.
- Editor theme variables, workflow progress, driving-side labels, responsive map layout, and fractional-zoom selection radius were corrected.
- Property overlap validation uses a path trie; UI document readers share an immutable validated snapshot while command readers remain detached.
- Package validation: 803 tests pass, 0 fail; `bun run check-types` passes.

## Evidence

- `paris-aerial.jpg`: real aerial reference.
- `paris-map-review.jpg`: import preview and review UI.
- `paris-import-size-error.jpg`: original decoded-size failure before correction.

## Outstanding

- External browser scene repeatedly recompiles/reloads; the 3D canvas has not produced a usable comparison image. The saved graph and UI confirm the imported nodes, but do not establish rendering correctness.
- Inspect and correct the roundabout, connecting avenues, road widths, sidewalks, crossings, elevations, and mapped objects against the aerial reference.
- Verify additional straight/grid, curved, bridge, and left-driving locations.
- Verify current UI at narrow viewport widths and across editor themes.
- Review compatibility of compact road component identities with previously accepted source documents.
- Existing unrelated scene has a stale projection reference (`street-light_batch-a`); import correctly refused that scene. The Paris test uses a separate scene.
