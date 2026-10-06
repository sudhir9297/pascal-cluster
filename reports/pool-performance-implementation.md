# Pool performance implementation

Implemented on 2026-10-05 in `packages/pool`. Existing workspace changes were preserved.

1. **Transient edits:** selected-pool sliders merge transient patches and publish them once per animation frame. Release commits once; cancellation, read-only changes, stale scene values, and unmount clear previews. Section and outline edits use the same lightweight basin/feature geometry. Accurate floor slopes, entry features, and benches remain visible; full coping, water simulation and connection cuts rebuild after release.
2. **Geometry reuse:** equipment geometry signatures exclude pose/scene fields. Mounted-pool merges and spillover selectors keep stable references, and stair geometry depends only on mounting dimensions.
3. **Cheap summaries:** systems, review, and section volume use cached area/volume/count summaries, without placement searches. Hydraulic changes reuse placement arrays when counts remain unchanged. Review measures the actual placed fitting clearance.
4. **Async routing:** main-thread registry/socket validation prepares serializable worker inputs. Route and collision searches run in a module worker. Old previews remain visible during updates; only a result for the current options and scene snapshot can be committed. Obsolete jobs terminate on option changes, cancellation, or unmount. Both source and built distributions include the worker.
5. **Drawing:** line and outline guide buffers retain capacity; preset geometry stays local and moves by transforms. Hover updates coalesce to animation frames, freehand samples are retained, and release flushes pending input.
6. **Synchronization:** a single scene diff identifies affected pools, opening owners, and old/new levels. Snapshot inventories group attachments once, schemas dispatch by fitting type, and unrelated pools skip attachment/fitting reconciliation. Slab polygons and support assignments compute once per pass. Newly derived shared joints are resolved before their openings.
7. **Animation:** pool water, waterfalls, and spillovers pause for hidden documents and editor dragging. Spillovers gain frustum culling and distance-sensitive simulation cadence. Waterfall impacts convert through the registered pool's complete world transform.

## CPU measurements

Run `bun scripts/performance-benchmark.ts` from `packages/pool`. Bun 1.4.2; 5 warm-ups, 50 samples, 8 × 4 m pools, rock coping and enabled benches. Measurements exclude disposal, React, GPU work, shader compilation and host synchronization. These are same-run comparisons, not browser FPS claims; machine load affects absolute values.

| Shape | Detailed geometry median | Edit preview median | Cached summary median | Uncached placement median |
| --- | ---: | ---: | ---: | ---: |
| Rectangle | 21.147 ms | 1.512 ms | 0.001 ms | 5.884 ms |
| Kidney | 9.318 ms | 1.181 ms | 0.003 ms | 9.684 ms |
| Lagoon | 11.746 ms | 2.551 ms | 0.005 ms | 17.421 ms |

## Validation

- Type checking, production build, package-consumer/artifact, architecture, and documentation checks passed.
- Full pool suite: 1,016 tests passed, 0 failed, across 89 files.
- Tests include transient commit/cancel/stale/read-only behavior, buffer reuse, freehand sample retention, placement caching, affected-pool sync, native-vs-serialized sockets, and an actual worker round trip/cancellation.
- Browser smoke test: created a pool, previewed length 8.0 → 9.5 m, committed, and verified one undo restored 8.0 m. Preset placement and fittings rendered in both 3D and 2D.
- Local dependency links were aligned to the linked editor's React types to eliminate pre-existing duplicate React type declarations. The existing optional `independent` frame extension is explicitly typed for compatibility with the installed host declarations.
- Broad end-to-end GPU/FPS profiling on a populated production scene remains separate from the CPU and interaction checks above.
