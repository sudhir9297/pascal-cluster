# Grass 2: lessons from the Environment plugin

Reviewed the installed `@pascal-app/plugin-environment` on 2026-09-29.
The editor pins `AxiomeCG/environment` at
`1aa0bc3cbed273dbf751e9af79e446f6de105c90`.
These are source-level findings, not comparative FPS measurements.

## Implemented improvements

1. **Shared wind.** Grass and complete flowers use common world-space broad
   waves and smaller ripples. Flower heads and stem tips receive the same
   displacement. Bounds include sway.

2. **Ground/root blending.** Both grass styles sample the same texture used
   by their ground surface at each root. The sample is computed in the vertex
   shader and interpolated. Blades blend toward their tip color; billboard
   tips retain atlas shading.

3. **Partial updates.** Live geometry rebuilds retain the existing stream.
   Unchanged tiles keep their meshes and instance buffers. Terrain edits
   upload changed height ranges; footprint edits replace affected tiles,
   including a margin for edge response. Wind-only edits update uniforms.
   The ground surface itself still rebuilds through the existing lifecycle.

4. **Projected-size detail and reduced geometry.** Detail uses physical screen
   pixels, camera projection, viewport size and object scale, with hysteresis.
   Thresholds are 24, 10 and 0.8 pixels. Blade tufts use 21, 4 and 2 triangles
   across visible levels, changing draw ranges without duplicating instance
   buffers. The far silhouette is crossed. Flowers retain their full count
   at every populated grass level and disappear only with the whole patch.

5. **Curved blades and lighting.** Near blades have curved profiles and
   root-pinned bending. Blade mode now defaults to scene lighting, with softer
   normals and restrained sunlight transmission at tips. The Scene lighting
   switch restores flat shading. Billboards retain their pre-shaded material.
   Near geometry increases from 7 to 21 triangles per tuft; distant geometry
   decreases to 4 or 2. Lighting adds shader work. These are quality/performance
   tradeoffs, not a measured universal speedup.

6. **Complete flowers and soft edges.** Each flower species merges its head
   and stem into one instanced mesh, removing one draw call per populated
   flower patch. Within 0.45 metres of boundaries, plants gently bend inward
   and shorten, while roots remain strictly excluded from pools and paving.

## Preserved behavior

Grass 2 retains blade/billboard selection, fixed density per square metre,
seeded placement, 8-metre live tiles, instancing, progressive streaming,
a bounded offscreen cache and padded culling bounds. Growing the area adds
plants rather than spreading existing plants farther apart.

## Validation

All 41 targeted Grass 2, streaming, improvement, footprint-invalidation and
pool-cutout tests pass, including the eight-angle flower visibility regression,
terrain buffer reuse and safe stream transfer during host geometry disposal.
Landscape TypeScript checks pass. Lit blades, flat blades and billboards
rendered in the live WebGPU viewer at maximum wind and height without reported
console errors. Temporary verification geometry was removed.

Large-scene before/after frame-time measurements remain necessary to quantify
performance gains and tune the close-up quality budget for target devices.
