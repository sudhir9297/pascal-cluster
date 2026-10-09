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
- Package validation after the prepare-import repair: 805 tests pass, 0 fail; `bun run check-types` passes.
- Port 3004 map import reproduced end-to-end on October 9: searched Paris coordinates, previewed 127 street segments and 270 objects, confirmed right-driving policy, prepared the baseline, and accepted it. The dialog closed and the editor reported the added data. `map-import-3004-success.png` records the imported selection and success message.
- Import usability follow-up: Map tab now reports street segments instead of an incorrect zero count; preparation/final import labels and prerequisite instructions are explicit; atomic placement presents busy feedback. Type checking passed; 79 import, placement, and persistence tests passed.
- Prepare-import repair: removed the attempted polygon-clipping dependency after the browser reported an invalid export build error. Junction merging still requires a solution without an external geometry library, as requested.
- Elevation tile loading now has a 12-second deadline and cancellation independent of loader cooperation. A browser test on port 3004 deliberately stalled elevation requests: preparation completed and reported 0/17 samples available as estimates (`prepare-import-elevation-timeout.png`). Restored normal requests and prepared the same area (`48.8775, 2.295`, 50 m radius) with 17/17 samples available; the final import action was enabled for 12 street segments and one object. Elevation/import tests: 62 passed; type checking passed.
- Preparation now shows an animated spinner and indeterminate bar above the map, a live stage message, and a cancellation action. Verified on port 3004 with delayed elevation requests (`prepare-import-loading.png`); the indicator disappeared and the import action became ready afterward. Reduced-motion preferences disable the animations.
- Replaced hull-based junction merging with local triangle subtraction, without a new geometry dependency. Ring/concavity/duplicate/partial-hole tests pass. Saved Paris junction compilation takes approximately 183 ms and contains zero asphalt triangles over the central origin. Browser visual comparison of this geometry change remains pending. Current package tests: 809 passed; type checking passed.
- Live source/compiler audits now cover Manhattan (34 segments), San Francisco (45 segments), and London Tower Bridge (29 segments, including two compiled bridge spans). All produced finite, non-empty canonical geometry; pending and unmatched inventory counts remain recorded in the audit reports.

## Evidence

- `paris-aerial.jpg`: real aerial reference.
- `paris-map-review.jpg`: import preview and review UI.
- `paris-import-size-error.jpg`: original decoded-size failure before correction.
- `*-compiler-audit.json`: live source identity, inventory and normalization counts, compiler bounds and diagnostics for each location. These are data/compiler evidence, not visual approval.

## Outstanding

- The roundabout is visibly incorrect: a filled junction occupies the central island and sections of the ring/avenues disappear beneath the flat ground. Browser inspection identified the central fill as `road-junction-surface`. Geometry and elevation/ground alignment still require correction against the aerial reference.
- Chrome reconnected during the follow-up audit. The reopened Paris scene still shows a blank 3D canvas, slow control actions, and empty-position-buffer warnings. T3 preview separately reports no automation host.
- Inspect and correct the roundabout, connecting avenues, road widths, sidewalks, crossings, elevations, and mapped objects against the aerial reference.
- Import and visually verify the audited straight/grid, curved, bridge, and left-driving locations in scene views.
- Verify current UI at narrow viewport widths and across editor themes.
- Review compatibility of compact road component identities with previously accepted source documents.
- Existing unrelated scene has a stale projection reference (`street-light_batch-a`); import correctly refused that scene. The Paris test uses a separate scene.

### Minimal map UI
Applied Emil design engineering and unslop: removed workflow narration, duplicate zoom/location controls, map legend/debug zoom, and launch-card subtext. Kept radius, driving side, street/object counts, primary action, cancel, and compact animated loading feedback. Source controls, baseline options, and diagnostics remain available in collapsed Details; project inspectors sit under Project details. Blocking diagnostics are signaled on the Details label. Native map attribution remains intact.

Verified browser layouts at 1280 × 800 and 391 × 844 on port 3004. Dialog width matches its scroll width on desktop and mobile; primary action fits the mobile viewport. Verified Details exposes source selector and baseline checkbox. Typecheck and diff whitespace checks passed. Screenshots: map-ui-minimal-desktop.png and map-ui-minimal-mobile.png.


### Junction elevations and fitted seams
The compiler previously discarded the fitted road-mouth asphalt mesh when merging junctions and replaced it with a flat boundary. It now merges fitted meshes, translates all three coordinates into the owner junction's frame, and interpolates original triangle heights at clipped vertices. Island holes remain part of the fitted asphalt triangulation. No external clipping dependency is used.

Package tests: 812 passed, 0 failed. Added coverage for both triangle windings on sloped unions, translated junction elevations, and compiled asphalt matching sampled road-mouth heights. Saved Paris scene audit: 55 junctions, 3,799 triangles, 42 junction meshes with varying heights, finite coordinates, zero asphalt triangles over the center of the roundabout. See paris-junction-height-audit.json and scripts/audit-saved-junctions.ts. This proves compiler behavior, not browser visual accuracy.

Port verification: 3002 is listening; 30000 has no listener. Port 3004's current app renders and acquires the Paris preview (127 streets, 270 objects). Development reloads reset the temporary import dialog during geometry edits. A fresh completed import and screenshot comparison remain required. Site terrain is not currently generated by map import; the flat ground can still conceal negative-elevation road sections.

### Left panel cleanup
Simplified Streetscape workflow tabs, hid empty count badges, removed idle instructions and road-card subtext, and removed hover scaling from catalog cards. Road controls remain accessible under Road settings and More settings; alignment stays visible. Source/project map controls remain grouped. Brief placement instructions appear only while a tool is active. Browser DOM verification on port 3004 confirms the default draw panel is compact, disclosures expose preset/infrastructure/data tools, and panel width equals scroll width (277 px). Screenshot capture failed twice in the current preview session; no new screenshot is claimed.

### Background-tab preparation repair
Reproduced a stalled Prepare import while document.visibilityState was hidden: a requestAnimationFrame probe received zero callbacks and the UI remained at Building road network. Replaced unbounded paint waits in preparation and final acceptance with a shared helper that yields immediately for hidden tabs and bounds the visible-tab frame wait at 50 ms. A regression test uses a frame scheduler that never calls back and verifies completion and cleanup. Browser preparation of Paris (127 segments, 270 objects) completed within five seconds while hidden, and preparation also completed in external Chrome. Package validation: 813 tests passed; typecheck passed. Removed two stale tests asserting old UI copy while retaining control/state assertions.

Final acceptance was attempted once in each browser. External Chrome exposed a concrete remaining failure: Imported baseline must use the existing project coordinate frame. The level's import context currently derives its origin from projected network nodes; a retained site document can outlive those nodes and still own the authoritative frame. Inspect and use that frame when reviewing subsequent imports before loosening persistence validation. Screenshot: paris-existing-frame-error.jpg. This is an import-error/UI screenshot, not completed 3D visual verification.

### Small real-road verification (current priority)
User requested the smallest useful real T/L examples before larger imports. Default selection is now 50 m, minimum 20 m. Captured fresh OSM snapshots, normalized import results, compiler plans, and geometric SVG inspection artifacts under small-roads/paris-t-junction and small-roads/paris-l-bend. Rue d’Argentine T-junction: center 48.8752303, 2.2904686, 20 m radius, six segments including a nearby service-road connection. Villa de la Grande Armée bend: center 48.8758739, 2.2906664, 20 m radius, one segment, way 51556901 / bend node 1986828644. Supporting acquisition margin is 25 m; supporting ways are retained as source evidence.

The L example exposed source centerlines being interpolated as Catmull-Rom splines. Legacy imported edges now preserve their polyline vertices. The compiled reference path matches the three selected source positions exactly; intentionally designed profiles retain their spline behavior. Regression test uses this actual mapped bend. 815 package tests pass; TypeScript passes. Missing widths/elevations remain estimated; this is not a claim of surveyed dimensions.

Browser verification remains incomplete: collaborative preview evaluation found 13,151 meshes in the saved Paris scene and a camera at [10,10,10], despite road bounds approximately ±251 m. A diagnostic camera fit was attempted; screenshot then reported no connected preview host. External Chrome navigation and tab inspection subsequently timed out. No successful 3D comparison or screenshot is claimed for the small examples. SVG artifacts are compiler geometry inspections, not browser screenshots. Next: verify isolated examples in the browser, inspect corner offsets/curb joins and T-junction trimming, and correct those against map/imagery before expanding scenarios.

### Small bend browser preparation and history storage
Browser selected Villa de la Grande Armée at radius 20 m and reported one street / zero objects. Confirmed right-driving policy, observed Loading elevations feedback, and reached Import streets. Acceptance on the existing large Paris scene first failed Report exceeds decoded byte limit. Saved Paris metadata decodes to 42,137,889 JSON characters, of which 37,245,964 are baseline revisions. Adding a copied baseline crosses the 64 MB report limit. Persistence now stores revisions as separately bounded lossless reports only when the full document exceeds that report limit; reading expands them before domain validation. A >64 MB two-revision round-trip test passes, and corrupt report/scene-size protections remain. Full suite: 816 pass, zero failures; typecheck and whitespace checks pass.

Browser retry progressed beyond the decoded-report failure to the actual complete-scene limit: 14,300,082 bytes versus 10,485,760. No import was committed. This large scene must not be used for isolated road testing. Navigation to Saved scenes to create an independent small scene timed out and the preview host disconnected. Retained screenshots small-roads/l-bend-preparing.png and small-roads/existing-scene-size-limit.png prove preparation/UI and the acceptance limit respectively, not correct 3D geometry. Ports 3002 and 3004 listen; port 30000 has no listener. Next verification must create a fresh scene, import only the small bend, then compare rendered road/curb offsets before repeating with the T-junction.

### Fresh small-road imports and bus-lane count correction
Created fresh scene df1e5283f093 through the browser, selected Villa de la Grande Armée at 20 m, confirmed policy, prepared and accepted one street / zero objects. Saved graph API reports four nodes, version 2, 1,345,202 bytes. browser-3d.png and browser-map.png in small-roads/paris-l-bend show source bend topology agreeing with the rendered spans. Width/elevation remain estimates; this is map-topology verification, not aerial dimensional verification.

Created fresh T scene 0f37de3b7936, accepted six segments, and captured map and pre-fix 3D evidence. Actual source includes lanes=6, lanes:forward=3, lanes:backward=3, busway:both=lane. Renderer incorrectly added two bus side bands beyond the six lanes. OSM Key:lanes documentation explicitly includes bus/PSV lanes in the total (https://wiki.openstreetmap.org/wiki/Key:lanes). Mapped lane counts now represent bus lanes through laneUses within the count. Ordinary bus access=yes no longer declares a dedicated bus lane; designated bus/PSV evidence does. Regression tests cover the real Grande Armée tags and ordinary versus designated access.

Reimported the corrected T in fresh scene fae054fa9bf4. Acceptance succeeded, and saved scene styles confirm six lanes with two bus uses and zero extra bus side bands. Before/after screenshots in small-roads/paris-t-junction show the narrower road and removed duplicated blue bands. 818 tests pass, typecheck passes, whitespace checks pass. Remaining verification: curb return and short-segment joins against imagery, elevation/terrain, other small scenarios and the original roundabout.

### Imagery and one-way branch estimate
Downloaded Esri World Imagery tiles at z19 (265479,180328) and z18 context (132739,90164), recorded exact URLs and tile coordinates. Images agree with T/service-road orientation and connectivity; trees obscure portions of the curb, and no surveyed width/capture date is established. Retained aerial-reference.jpg, aerial-context.jpg and metadata alongside the T case.

The actual Rue d’Argentine source is oneway=yes with no lane count. Its previous fallback was two traffic lanes. Uncounted one-way roads now use an explicit one-lane estimate; mapped lane counts still override it. Fresh browser scene a326b1cd2f04 accepted six segments; saved styles confirm one lane with default provenance. Screenshot browser-3d-after-oneway-estimate.png. Full suite: 819 pass, zero failures. The 20 m selected radius includes n299015572, a second junction roughly 19.7 m from the T at n299018405. Tiny boundary stubs at that second junction should be distinguished from a defect at the T itself. Next: tighter isolated T selection, then verify return geometry against imagery without nearby scope-boundary stubs.

### Isolated T and curb-return allocation
Lowered minimum radius to 10 m and changed radius step to 5 m so a 15 m selection can isolate three arms and one T-junction. Fresh acquisition paris-isolated-t retains raw source/context, import, compiler and geometric artifact. Browser scene 192d3c4f7b6b accepted three segments and zero objects, with one tee and no neighboring four-way junction. Saved map/3D screenshots confirm the isolated topology.

Found curb fitting reserved 55% of every approach for an opposing patch, including open/scope-boundary ends. It now allocates 90% when no opposing junction exists, retaining 45% when two patches share an edge. Actual isolated T estimated radii changed from 0.5 to 2.535 m. 3D shows rounded connected returns rather than the collapsed corners. Radius is explicitly an estimate; imagery is partly occluded by trees and cannot prove exact curb dimensions. Regression covers a clipped wide T and existing nearby-junction test continues to pass. Full suite: 820 pass, zero failures.


### Small circular route
Captured actual Place Georges-Moustaki, Paris (48.8392482, 2.3500942), radius 30 m. Ten selected segments contain five circular-ring edges, four connecting streets and one detached boundary fragment. Eight mapped point objects are street lamps. Raw source, normalized import and compiler artifacts are retained in small-roads/paris-moustaki-circle. The initial approximate Furstemberg candidate was actually a straight Rue Jacob fragment; it is retained as paris-jacob-straight and is not circle verification.

Ordinary OSM bends retain source polylines. Explicit junction=circular or junction=roundabout routes now interpolate through their alignment vertices to avoid visibly faceted circular spans; interpolation remains derived geometry, not surveyed curvature. Regression checks both tags, mapped vertex retention and endpoints; the real L-polyline test still passes. Full suite: 821 passed, zero failures; typecheck passed. Recompiled captured source: two plans, 289 finite surface polygons.

Fresh browser scene 76c2d44b6c71 accepted ten streets and eight lamps. browser-3d-before-curve.png and browser-3d-after-curve.png record the curve iteration; the final view uses an oblique camera fit after a development reload reset the camera. Ring connectivity and open center are visible. Aerial-reference.jpg and metadata retain an official Esri tile for comparison. Central plaza/fountain and some surrounding pavement are missing; width, curvature and return radii are estimates. No claim of complete real-world visual accuracy. Next work remains small-case island/pavement resolution, additional Y/four-way and elevated examples, and terrain handling. No external geometry library was added.


### Small four-way reveals flat-ground occlusion
Captured actual OSM node 299015572 (48.8750696, 2.2903565), radius 15 m: four segments, one four-way-plus junction. Fresh browser scene 3758524b338d acquired, prepared and accepted four streets/zero objects. Browser-map.png shows selected source connection; browser-3d-terrain-failure.png is an actual 3D view after explicitly switching from the import-focused 2D view. Saved API node heights span -0.764 to +0.915 m after display lift. A negative-height approach disappears under the flat editor ground. This case FAILS visual verification. The previous plan-view image must not be used to claim 3D correctness. Supporting aerial tiles are copied from the immediately neighboring T case, with their exact source URLs retained.

Also audited the circular-source omissions: Fontaine Guy Lartigue is OSM node 246512365, amenity=fountain, retained unsupported with point geometry but no dimensions/plaza outline. Saved unsupported-selected-features.json enumerates all 31 unsupported points within 30 m. Source tags explicitly say junction=circular, not a roundabout. Do not invent surveyed fountain/plaza geometry from that point. Ports rechecked: 3002 and 3004 listening; 30000 absent. Next correction must integrate estimated native terrain with road grades and preserve terrain evidence; changing only display lift would conceal the mismatch instead of correcting it.


### Native estimated terrain under imported roads
Added osm-import-terrain.ts and atomic site terrain updates during acceptance. Ground roads shape a native heightfield in host/building coordinates; ground-profile-derived provenance is stored as estimated-road-grade-v1. Bridge-only networks do not create deck-height terrain. Existing fields are decoded, retained outside the grading corridor and expanded/resampled if needed; corrupt existing fields fail before scene changes. Non-horizontal building poses fail clearly rather than misplacing terrain. The current bounded grid is at most 257 x 257; spacing and road IDs are retained. This is estimated ground shaped from accepted road grades, not a surveyed raster.

Fresh UI scene 80461196e967 imported the same four-way with identical road coordinates and native terrain. An asphalt clearance audit found ten small overlaps (minimum -0.032 m) at fitted junction mouths despite all arms being visible. Terrain now lowers against the actual compiled ground-junction triangle planes as well as centerline grades. Regenerated this verification scene through the same helper and a version-guarded API update, then reloaded the browser. Final audit: 216 asphalt vertices/triangle centroids, zero buried samples, minimum clearance 0.145744 m. Saved terrain-clearance-audit.json, terrain-browser-verification.json and browser-3d-after-terrain.png. The audit excludes mapped surfaces and applies to this identity-pose case. It is not exhaustive terrain fidelity proof.

Full package suite after implementation: 826 pass, zero failures; TypeScript passes. Five new terrain regressions cover sloped cross-section clearance, rotated/translated placement, bridges, fitted-junction interiors and existing field preservation. Site-owned acceptance tests additionally assert native terrain/provenance are committed with the roads and restored in the same undo. Remaining visible discrepancy: some mapped crossing/sidewalk ramp pieces sit above the sloping asphalt; source/model placement needs further correction. Original complete visual/import goal remains unproven.
