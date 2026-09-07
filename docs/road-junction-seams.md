# Step 2: automatic junction joins

Automatic 3D junctions now share exact mouth coordinates with their approach ribbons. The road ribbons stop at the junction boundary instead of continuing beneath it. The junction boundary follows the sampled approach position, tangent, width and height, including curved and sloping approaches.

The junction polygon uses contour triangulation instead of a center fan. Each corner's roadside bands interpolate between the actual adjoining left/right cross-sections and triangulate their complete inner/outer contours. This prevents a tight warped return from creating a diagonal plane outside the curb cutout. A narrow or absent sidewalk no longer inherits the widest sidewalk elsewhere in the intersection. Curbs and sidewalks have vertical faces down to road height.

When requested cuts exceed 90% of a connecting profile's length, both cuts shrink proportionally. This keeps a forward connecting segment and moves the adjoining junction mouths to its endpoints.

Overlapping junction footprints are grouped into one shared asphalt region. The merged region is triangulated from the combined footprint, while each source junction keeps its own approach cuts and roadside bands. A merge key derived from signed OSM layer and bridge/tunnel identity prevents elevated or underground junctions from being fused with an at-grade road.

The surface triangulator now accepts interior contours as holes. Imported or manually supplied traffic-island outlines can therefore remain open instead of being filled by the merged asphalt region; holes are retained only when they fall inside the merged footprint.

Validation includes exact asphalt and roadside endpoint agreement, curved and graded approaches, unequal side widths, concave polygon area, and oversized cuts. The captured Times Square fixture covers 61 segments and 19 junctions, with matching mouths and triangulated areas for every junction. A production renderer test also renders all 19 junctions.

Browser verification initially used a fresh 250 m import with 55 segments and 11 mapped objects. After the user's saved-scene requirement, verification moved to `http://localhost:3002/scene/cf6d2f09712a`. A 250 m fetch there returned HTTP 504, so a fresh 100 m Times Square import at 40.75701, -73.98597 was used. That scene contains 19 segments and 3 mapped traffic signals, inspected in both 2D and 3D. No browser console errors were captured.

Final automated checks: 482 tests pass and `bun run check-types` passes. Browser tests must use saved scenes, as recorded in `AGENTS.md`.

Manual junction boundaries retain their existing rendering path. Generated corner shapes remain inferred from centerlines and cross-sections. This step does not add surveyed curb outlines or redesign traffic markings. The 2D floorplan still uses its existing junction geometry.
