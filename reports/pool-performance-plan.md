# Pool performance and interaction plan

Date: 2026-10-05. Scope: faster drawing, dragging, settings changes, routing, and scene navigation in `packages/pool`. Recommendations follow source inspection and local CPU measurements; they are not measured browser FPS improvements. No plugin implementation was changed.

## Measurements

Bun process, current machine and linked dependencies, 8 × 4 m pools, 3 warm-up iterations then 20 measured samples. Geometry timings include builder work and water-effect construction, but exclude cleanup, React, GPU uploads, shader compilation, browser rendering, and host synchronization. No overlaps/CSG connections were included. Fitting-plan cache misses were induced by varying turnover hours slightly. A repeated kidney series that hit the cache was excluded from the table.

| Operation | Median CPU time | Sample p95 CPU time |
| --- | ---: | ---: |
| Rectangle, continuous coping | 3.29 ms | 7.87 ms |
| Kidney, continuous coping | 3.82 ms | 9.33 ms |
| Kidney, rock coping + bench | 8.12 ms | 10.10 ms |
| Lagoon, rock coping + bench | 6.49 ms | 12.68 ms |
| Rectangle fitting plan, uncached | 1.55 ms | 5.02 ms |
| Kidney fitting plan, uncached | 5.25 ms | 5.76 ms |
| Lagoon fitting plan, uncached | 12.13 ms | 19.24 ms |
| Pump geometry | 1.13 ms | 3.43 ms |

A 60 FPS frame has 16.67 ms for all CPU/GPU work. One uncached planning call can consume that budget. These small samples identify work to remove from interaction paths; they do not establish end-to-end bottleneck rankings or speedup percentages.

## Recommended changes, in order

### 1. Make continuous edits lightweight and commit once

The main pool renderer already reuses committed geometry during native horizontal/depth resizing. Extend that approach consistently to settings sliders, section handles, outline controls, and mounted features.

- Store active edits as transient state; update handles, dimensions, a simple basin/feature preview, and transforms on animation frames.
- Produce full shell, rock coping, clipping, derived openings, and final fixture synchronization after release. Where the shape cannot be represented by a transform, use a low-detail mesh/outline during editing.
- Keep one final scene write and one undo entry. Escape/pointer cancellation restores the prior design.
- Show an immediate pending preview for costly commits. If final CPU geometry remains costly, move pure mesh-data generation to a worker using transferable typed arrays; create Three objects and materials on the main thread.

Evidence: `editor/shell-settings.tsx` writes directly to the scene on every control update. `editor/pool-section-bar.tsx` publishes full-geometry previews approximately every 80 ms. `editor/renderer.tsx` rebuilds for those section previews. `editor/outline-controls.tsx` samples/validates and writes live overrides on every native pointer event.

Do not debounce the visible cursor or handles: their feedback should follow every displayed frame. Schedule the expensive work independently.

### 2. Separate summary calculations from fitting-placement searches

Systems and Review call `planPoolFittings` to display metrics/counts, but that function also performs boundary searches and evaluates a 64 × 64 floor candidate grid. Changing turnover or flow can invalidate the layout cache even though the outline remains unchanged.

Split inexpensive metrics/recommendations from detailed placement. Cache outline/depth-derived data separately from hydraulic inputs. Search for actual fitting positions only when adding/reflowing fittings or preparing an explicit layout preview. Use one result shared by panels and synchronization consumers.

Evidence: `design/pool-fitting-layout.ts`; consumers in `editor/systems-panel.tsx` and `editor/review-panel.tsx`. The uncached lagoon measurement reached 19.24 ms at sample p95.

### 3. Keep route planning out of React rendering

`editor/connect-pool-pipes.tsx` prepares a circuit synchronously inside `useMemo`; collision adjustment in `editor/pool-pipe-plan.ts` can attempt roughly 150 alternate layouts. Equipment insertion already has a worker, but this circuit preparation path does not.

Prepare routes asynchronously with immediate feedback. Retain the last usable preview while a new one computes, reject stale results, and allow cancellation. Cache by the pool, fitting, obstacle, and circuit revisions rather than the entire scene-map identity. Revalidate the relevant scene data before committing.

The current planner accepts a fitting-port callback, which cannot be sent to a worker. Extract a serializable planning model or precompute the required fitting geometry/port data. Keep registry access and scene writes on the main thread.

The existing routing client discards superseded queued requests but does not interrupt a calculation already running. Measure that latency and add bounded/cooperative cancellation where it matters.

### 4. Rebuild only when geometry changes

`editor/geometry-preview.tsx` keys equipment geometry by the entire node object. Committed position, rotation, name, or metadata changes can therefore rebuild the mesh. Give each equipment/feature a geometry-specific signature or canonical geometry input. Update transforms separately, apply material-only changes in place where possible, and preserve resource ownership.

Fix the fresh-array selector in `spillover/editor/preview.tsx` with shallow equality or separate selectors. It creates unstable snapshot/memo dependencies and risks repeated React updates. Memoize live attachment pool values and derived placement inputs when their actual data has not changed. Subscribe outline controls to the fields they need instead of the entire control store.

Acceptance: moving/renaming equipment performs zero geometry builds; unrelated scene/override edits perform zero spillover builds.

### 5. Eliminate drawing-buffer churn

`editor/tool.tsx` disposes/recreates draft line geometries as the cursor moves and reconstructs the filled preview shape. It also sends multiple state/store updates for every grid event.

- Use growable position buffers, `drawRange`, and in-place buffer updates for the draft lines.
- Build a preset ghost once in local coordinates and move/rotate it with a transform.
- Coalesce drawing/outline pointer work to one update per animation frame, preserving the final pointer position on commit.
- Preserve raw stroke points needed for fidelity, but publish the displayed stroke once per frame. Perform smoothing and complete validation at deliberate boundaries.
- Memoize recovered spline tangents per outline revision; current recovery tests several sampled strengths when tangents are absent.

Acceptance: steady drawing does not create/dispose line geometry each event; high-frequency pointer input does not trigger more than one preview update per frame.

### 6. Limit synchronization to affected pools

`editor/opening-system.tsx` compares whole-scene node maps and runs multiple global synchronization passes. `design/sync-pool-fittings.ts` scans the node collection for each automatic pool. Panels rebuild inventories from the whole scene.

Use shared indices for pool attachments, connections, equipment, and managed openings. Carry affected IDs through synchronization; batch all derived changes into one commit. Separate invalidation for geometry, pose, hydraulic settings, and appearance. Preserve existing safeguards for ground/slab ownership, connection consistency, and undo/redo.

Acceptance: changing one pool updates that pool and its connected neighbors; unrelated geometry is neither parsed nor regenerated. Validate this in scenes with 1, 10, and 30 pools mixed with non-pool objects.

### 7. Spend animation work where it is visible

Keep the existing adaptive water resolution, frustum checks, reduced simulation frequencies, and drag fallback. Extend consistent culling/scheduling to spillovers and mounted effects. Spillovers currently invalidate every rendered frame while visible, without checking the frustum.

When distant water uses a simplified material, lower or stop simulation only after checking whether shell caustics or other visible consumers still use the field. Allocate water quality by screen coverage and measured cost, using hysteresis to prevent repeated quality changes. Suspend appropriate effects during interaction and when the browser is hidden; provide a user pause/reduced-motion preference.

Profile shadow work and framebuffer copies in the host before changing them. The package already suppresses pool shadows during dragging, so the first step is confirming where those protections do and do not apply.

## Experience details that help speed feel consistent

- Immediate cursor/handle movement while a detailed preview computes.
- Keep the last valid route visible with a small pending state; avoid blank/flickering previews.
- Preserve selection and camera position through commits.
- Predictable snapping with hysteresis; avoid alternating targets near boundaries.
- Show progress for genuinely expensive final builds, while allowing navigation/cancellation where safe.
- Prewarm lazy tool/worker modules when entering the relevant workflow if measurements show first-use stalls; avoid speculative loading of every renderer or shader.

## Verification and implementation sequence

First profile the actual editor in four representative scenes: a simple rectangle; a freehand rock pool with features; connected pools with spillovers and complete plumbing; and a larger scene with many pools and landscape/building objects. Record pointer-to-preview latency, p95 frame time, long tasks, geometry builds per gesture, synchronization duration, route latency, and resource counts over repeated edits.

Proposed acceptance targets, to be validated on an agreed reference machine:

- Cursor/handles respond on the next frame; aim for 60 FPS during common edits.
- No repeated full-resolution basin/coping builds during continuous dragging.
- Zero geometry rebuilds for equipment pose/name changes and unrelated scene edits.
- Routing never blocks input and obsolete results never replace current previews.
- Final geometry, connections, cancellation, and undo/redo remain correct.
- Geometry/material/render-target counts return to baseline after repeated creation/deletion, apart from explicitly owned caches.

Implement in small passes: selector/geometry reuse and buffer updates; cheap edit previews and final commits; split metrics/layout plus asynchronous routing; affected-pool synchronization; measured GPU/animation improvements. Repeat the same scenarios after each pass. Report measured deltas, not a promised multiplier.
