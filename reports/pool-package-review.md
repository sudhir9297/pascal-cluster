# Pool plugin improvement review

Date: 2026-10-05. Package: `packages/pool` (`@pascal-app/plugin-pool`).

Reviewed the current working tree, including its existing uncommitted changes. Scope covers the manifest and public exports, schemas, procedural shell and features, fittings and equipment, attachment and opening synchronization, pipe planning, editor panels and tools, floorplan rendering, water effects, animation export, tests, documentation, and build/release scripts. This is a source and local-check review; no host-browser visual acceptance or GPU benchmark was performed.

The package has a substantial foundation: twelve registered node kinds, preset/custom/freehand outlines, sloped floors, entry features, benches, multiple coping styles, equipment ports, routing, connected pools, animated water, and portable animation export. The main opportunity is consistency and complete workflows, followed by performance and documentation outputs.

## Verification

| Check | Observed result |
| --- | --- |
| `bun test` | 998 passed, 0 failed, across 86 files |
| `bun run check-architecture` | Passed; checked 199 production source modules |
| `bun run check-docs` | Passed |
| `bun run check-types` | Failed: unsupported `independent` property on `MovableParentFrame` |
| `bun run build` | Failed at declaration generation on the same type error |
| `bun run check-package` | Failed consumer type checking on the same error |

The existing workspace dependencies changed during the review: a later reproduction could no longer import `@pascal-app/core`; its local symlink resolved to an editor worktree without `dist`. Earlier test/check results above are the results actually observed. Dependencies were not installed, rebuilt, or relinked. Resolve the host binding before reproducing checks again.

Only this review document was added intentionally. The build attempt generated ignored build output; existing source edits were left intact.

## Highest-priority changes

### 1. Restore host compatibility and a passing release baseline

**Confirmed by checks.** `src/rendering/plan-frame.ts:13` assigns `independent: true` to `MovableParentFrame`, but the resolved host type does not declare it. This blocks type checking, declaration generation, and consumer validation.

Determine the intended movement contract and align the plugin and host API. Do not suppress the error with a cast without checking movement behavior. The package advertises a broad host peer-version range; validate the oldest supported host and the current target, or narrow that range to versions actually supported. Keep the linked editor build and published-package consumer checks separate so local development does not accidentally validate only a custom host branch.

Acceptance: type, build, package-consumer checks pass against the declared host versions; nested fittings move correctly in 2D and 3D.

### 2. Give circulation equipment an explicit relationship to a pool or system

**Confirmed from source.** `src/editor/systems-panel.tsx:57` and `src/editor/review-panel.tsx:22` include equipment when it shares the pool's parent level. Both pick the last matching filter; Systems also picks the last heater and pump. Two pools on one level can therefore show the same equipment, and selecting a filter model can modify equipment that serves another pool.

Introduce a circulation-system identity and equipment membership, supporting shared systems explicitly. Derive the selected pool's equipment from membership and connected ports. Use one shared inventory selector for Systems and Review. Present a selectable equipment list with names and a locate/select action instead of implicitly editing the last item.

Acceptance: two independent pools and one intentionally shared system have correct counts, equipment editing targets, and capacity summaries.

### 3. Make Review evaluate the actual design

**Confirmed from source.** `src/editor/review-panel.tsx:52` scores only the outline, fitting counts, and issues from the proposed automatic layout. It does not inspect actual fitting spacing or pipe continuity, require a pump/filter, or evaluate equipment membership. The filter-capacity warning is outside the scored checks (`:79–104`), so the headline can say Ready while capacity needs attention. The clearance check evaluates a suggested layout even when placed fittings use a different arrangement.

Extract a pure design-check engine returning stable issue IDs, affected node IDs, severity, explanation, and an available action. Check actual fittings and circuits: disconnected outlets, open ends, missing equipment, incompatible ports, capacity, placement clearances, and invalid feature geometry. Integrate capacity into the headline status. Keep design completeness and hydraulic sizing results clearly identified.

Acceptance: correctly counted but disconnected fixtures do not pass circulation checks; an undersized filter changes the headline; selecting a finding locates its objects.

### 4. Share one elevation, depth, feature, and quantity model

**Reproduced and confirmed from source.** The committed shell is raised by `finishedDeckElevation`, while its water surface remains at `designWaterElevation`. However:

- `src/design/pool-fitting-layout.ts:25` estimates volume using `depth + designWaterElevation`, ignoring deck elevation. Its cache key also omits deck elevation.
- For an 8 × 4 m flat pool with depth 1.5 m and water elevation −0.12 m, deck elevation 0 gives 44.16 m³. Changing deck elevation to 1 leaves the reported value at 44.16 m³, although the rendered floor/water levels imply 12.16 m³ before feature/cove displacement.
- Adding a tanning shelf leaves that same reported volume unchanged. Steps, benches, coves, and connected-region removal are not integrated into the estimate.
- Volume uses triangle-centroid sampling without splitting triangles at floor-slope breakpoints. This is an approximation for piecewise sloped floors, even before feature displacement.
- Placement preview code adds deck elevation to a geometry already translated by water elevation (`src/core/geometry.ts:1162–1172`); committed geometry subtracts deck elevation from the water's local position (`:1318`). For a nonzero deck elevation, the two surfaces differ by that elevation.
- Fields labelled entry/bench “Water depth” position the feature below the deck, rather than below the water surface. With the default waterline, a shelf setting of 0.25 m produces approximately 0.13 m of water above its top.

Resolve deck, waterline, basin floor, visible feature surfaces, offsets, and warnings in a shared domain model. Use it for 3D, placement ghosts, section diagrams, fittings, and quantities. Integrate volume by slope regions and occupied feature geometry; expose approximation limits where needed.

Acceptance: changing elevation gives matching ghost/committed geometry and correct quantities; shelf/bench submergence matches its displayed value; representative sloped and concave pools have independently checked volumes.

### 5. Repair bench placement controls and share section calculations

**Reproduced.** Selecting `benchWall: 'min-x'` versus `'max-x'` on a default parsed pool produces identical bench bounds, at the max-X wall. The sidebar changes `benchWall`, but modern nodes have `benchBoundaryT` and geometry uses that value instead (`src/core/geometry.ts:1295`). The parametric derivation does not convert the wall selection to a boundary station.

Use one canonical boundary anchor. Convert wall selection into that anchor or remove the ineffective wall control. Label boundary position accurately: the current sidebar calls a perimeter fraction “Position from shallow end.” Reuse the feature model for the section instead of reconstructing entry and bench geometry independently in `src/editor/pool-section-model.ts`.

Acceptance: each wall selection moves the bench to that wall in plan, section, and 3D; subsequent outline editing preserves a sensible anchor.

### 6. Stabilize the spillover renderer's store selector

**Source-level defect; host rendering not exercised.** `src/spillover/editor/preview.tsx:21` selects a freshly allocated array from `useLiveNodeOverrides` without shallow equality. The installed Zustand hook passes selector results directly to React's external-store snapshot API. Identical store reads therefore return different snapshot references, risking repeated updates or a render loop. The array also invalidates the expensive placement/geometry memo dependencies.

Use `useShallow` for the tuple, or select each override separately. Add a real React mounting test that updates an unrelated node and verifies the spillover does not rebuild.

### 7. Preserve invalid authored connections and expose geometry warnings

**Confirmed from source.** `src/spillover/design/sync.ts:52` deletes a spillover if the current pool arrangement cannot resolve a placement. A move can consequently remove its authored connection and appearance settings. `src/editor/opening-system.tsx:200` applies derived synchronization while history is paused; verify the complete undo/redo behavior before relying on that deletion as reversible UX.

Keep temporarily invalid connectors with a diagnostic state and allow repair or explicit deletion. Delete automatically when endpoints truly disappear, using the host's relationship/cascade rules. Surface reduced shell/coping/construction-opening offsets from `src/design/outlines.ts`; today they are stored in `group.userData.outlineWarnings` and are not shown by the pool panels. Likewise, report persistent CSG failures rather than treating every failure as transient.

Acceptance: moving pools apart shows a repairable connection issue; restoring the arrangement restores the connection; reduced geometry offsets appear in Review.

## Workflow and performance improvements

### Bring the full circulation workflow into Systems

The Systems Plumbing section currently offers a valve; the three connection forms live in the separate parametric inspector. Make Systems show suction, skimmer, and return circuits, their connection status, free ends, and assigned pump/filter/heater. Let users preview routes, connect equipment, repair partial circuits, and understand what a delete operation removes. Retain the existing read-only and shared-network protections.

For automatic fittings, distinguish “add missing,” “reflow generated,” and “manual.” `sync-pool-fittings.ts` intentionally retains existing slots rather than regenerating missing ones, whereas comments in the default-attachment module suggest resize adds/removes slots. Document the actual behavior and provide explicit reflow, per-fitting locks, and a preview of additions/moves. Plan around actual existing manual fittings to avoid duplicate placement at recommended stations.

### Move expensive work off render and index scene relationships

`connect-pool-pipes.tsx:29` runs pipe preparation synchronously in a render memo. `pool-pipe-plan.ts:41` can try roughly 150 adjusted layouts after a collision. Equipment insertion already has a routing worker, but generated pool-circuit planning does not use that path. Move it to cancellable asynchronous preparation, cache by relevant pool/network revision, and revalidate before commit.

Opening synchronization compares whole-scene node maps and runs multiple global passes. Automatic fitting sync scans all nodes for each pool. Systems/Review reconstruct inventories on each scene update. Introduce shared indices for pools, attachments, equipment membership, owned openings, and circuits; update only affected relationships. Keep the current appearance-only fast path.

Retain the existing good optimizations: stable geometry signatures, separate coping rebuilds, in-place water uniforms, inexpensive resize previews, frustum checks, simulation throttling, adaptive water resolution, and disposal ownership. Add benchmarks for real editor interactions and large scenes before undertaking broad refactors.

### Make water effects consistent across frames and visibility

Pool water and waterfall rendering already include visibility/adaptive work controls. Spillover animation currently updates and invalidates every frame whenever its node is visible, without a frustum/distance check. Share the animation scheduling policy and consider reduced-motion/pause controls.

Waterfall impacts convert a world-space point to pool coordinates by subtracting `pool.position` and undoing only pool yaw (`water-feature/waterfall/editor/preview.tsx`). That does not account for ancestor transforms. Use the rendered pool's inverse world matrix and validate translated/rotated levels and buildings. This is a source-derived concern, not a measured visual failure.

Give water texture loading a failure callback and a visible fallback/diagnostic. Define cache disposal ownership at plugin/runtime scope; the current module-level texture cache has no reset path. Measure long-session mount/unmount behavior rather than assuming a leak from caching alone.

## Product improvements after correctness

1. **Design outputs:** coping length and stone counts, interior finish area, shell/floor quantities, excavation estimate, equipment schedule, pipe lengths/fittings, annotated plan/section, and exportable quantities. Build these on the corrected quantity model.
2. **Equipment data:** the pump is predominantly a geometric model with connector/body dimensions; add catalog ratings and operating information if hydraulic selection is in scope. Connect filter/heater choices to one coherent product record and distinguish catalog dimensions from custom geometry.
3. **Better shape/feature editing:** selectable shallow-end direction and entry location, dimensioned outline editing, feature clearance overlays, and reliable cross-view selection. Current floor slope and entry are organized along local X.
4. **Reusable designs:** save a pool plus its features/system settings as a preset, duplicate with reference remapping, and support intentionally shared pool/spa systems.
5. **Accessible editing:** finish the tab keyboard/tabpanel relationships, disable editing controls visibly in read-only mode, and provide keyboard/numeric alternatives for all drawing and feature-placement operations.

## Maintainability and release work

- Split the large shell/waterfall builders by mesh layer or feature at existing domain seams. Keep the shared assembly plan and resource ownership explicit; avoid a rewrite solely to reduce file sizes.
- Reduce drift between schema defaults, creation defaults, sidebar ranges, inspector ranges, handle limits, feature interpretation, and render signatures. A typed descriptor/shared model can supply these consistently. Keep deliberate legacy defaults explicit.
- Preserve pure geometry/planning APIs by passing scene/parent transforms rather than reading `useScene` inside helpers such as `connectionPorts`.
- Make scene migrations explicit and fixture-backed. The pool is at schema version 26, while compatibility currently includes scattered aliases, defaults, and runtime attachment normalization. Test import → normalize → edit → export for old scenes.
- Document the public compatibility contract. The barrel exports editor stores, UI components, geometry helpers, and authoring helpers under one entry; consider stable authoring/editor subpaths while preserving existing exports. Validate a real clean consumer, including lazy modules, worker loading, assets, SSR, and GLB export.
- Restore the missing `docs/pool-fitting-layout.md` referenced by the fitting planner, or replace the reference. Record assumptions, units, supported pool types, and the scope of recommendation checks. The documentation checker currently passes despite this source-comment reference.
- Add host integration tests for two-pool ownership, real React selectors, plan/3D parity, rotated ancestors, drag cancellation, resize/move with connections, read-only behavior, and full undo/redo. Existing hook-mocked tests and numerical geometry tests are valuable but do not exercise the complete React/store/GPU path.
- Add an automated verification/release workflow if this monorepo does not supply one. The package has verification scripts and Dependabot configuration; no package-local verification workflow was found. Keep GPU benchmarks and representative visual scenes as explicit acceptance evidence.

## Suggested implementation sequence

1. Fix the host contract and restore passing checks. Stabilize the spillover selector and add focused regressions for the reproduced bench/elevation defects.
2. Introduce the shared pool/feature quantity model, circulation membership, and actual-scene design checks.
3. Bring circuit creation/repair into Systems; preserve invalid connections; add full undo/redo and multi-pool acceptance tests.
4. Profile routing, synchronization, geometry rebuilds, and water effects; optimize the measured bottlenecks.
5. Add quantities, schedules, annotated outputs, presets, and deeper equipment catalogs.

This order makes additional product features depend on trustworthy geometry, ownership, and review results.
