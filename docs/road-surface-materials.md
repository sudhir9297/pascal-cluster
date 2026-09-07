# Step 3: mapped road materials

The importer now retains the `surface` tag alongside its normalized material. Asphalt, concrete, concrete plates, and paving stones select distinct colours and roughness. Asphalt has restrained grain, concrete has slab joints, and paving stones have a staggered block pattern. The original tag survives scene serialization and road JSON exchange.

Missing, broad, mixed or unsupported tags keep the preset appearance. The roadway inspector distinguishes mapped material from an absent or unresolved surface tag. Existing styles without material metadata keep their previous appearance; reimporting is needed to recover tags that older scenes discarded.

Roads and junctions use plan coordinates in metres for texture mapping, including junction origin offsets. Shared boundaries therefore sample the same texture coordinates. Small procedural tiles are cached and shared, with mipmaps for distant views. Colour, texture pattern and joint spacing are illustrative material defaults, not surveyed details. Junction material follows the existing primary-road choice.

These interpretations follow [OpenStreetMap's surface documentation](https://wiki.openstreetmap.org/wiki/Key:surface). Broad `paved` tags do not identify a specific material. The two-track `concrete:lanes` representation is not treated as a continuous concrete surface.

Validation: 491 tests pass; TypeScript passes. Tests cover tag mapping, fallback provenance, import assembly, JSON roundtrip, legacy styles, texture determinism/reuse, and matching road/junction UVs. Browser material comparison uses `http://localhost:3002/scene/c2403fb07b04` and the synthetic fixture in `src/__fixtures__/road-material-comparison.json`. Verified the distinct materials in 3D, retained colours in 2D, the concrete source label in the inspector, and persistence after reload. No new browser errors were captured after the development build recovered.

The connected editor's Turbopack root was widened to include the linked Streetscape worktree, following its installed Next.js documentation. Its previous root excluded `~/.t3` and prevented the editor from compiling.
