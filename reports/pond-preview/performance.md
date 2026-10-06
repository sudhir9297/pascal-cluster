# Landscape pond performance changes

Implemented and checked on 5 October 2026, using the editor at `http://localhost:3004`.

## Editing

The editor's native `SliderControl` handles numeric settings, including rock size, spacing and seed. Changes use `useLiveNodeOverrides` immediately and stay out of the scene store until the editor control commits. Release or Enter commits the accumulated patch once; Escape, unmount, stale source data and read-only transitions discard it. Circle width and depth stay coupled. Colour uses the existing native colour input with a transient preview and final change/blur commit.

Water appearance uses uniforms, and motion settings update the existing wave field. Rock colour and moss also use uniforms. Shape changes rebuild the basin, rock geometry changes replace only the rocks, and fish count/size changes replace only the school. Rock placement updates fish habitat and wave obstacles independently of the water mesh.

## Rendering and terrain

- Individually generated border silhouettes are merged into at most eight palette batches. Original local coordinates and normals remain available to the rock shader, preserving texture projection. Legacy shoreline and shelf clusters each use one batch. Logical rock obstacles and plan symbols remain individual.
- Water is indexed, with lower tessellation during basin previews and full detail restored on commit. Production construction skips attributes and normals for the discarded terrain plane.
- Terrain invalidation ignores water, rock and fish settings. Renderer context keys track relevant parents and terrain references without serializing the whole terrain buffer. Ground invalidation stays within the affected site.
- Terrain appearance profiles are cached. Host mesh discovery runs at four checks per second, or immediately after profile changes, rather than every animation frame; geometry and transform changes still invalidate mesh attributes.
- Reflection resolution falls from half to quarter scale during interaction or for small projected ponds. Waves keep fixed 1/120-second physics steps and publish their texture at approximately 30 Hz; wind and fish rendering continue per frame.
- Hidden documents, hidden ancestors, paused ponds and ponds outside the camera frustum do not advance simulation. Resuming does not accumulate the skipped time.

## Verification

Browser checks after the implementation stages established:

- Width previews altered the rendered pond while canonical scene data remained unchanged; cancellation restored the canonical value, and commit saved it.
- Water clarity previews preserved the pond group and water mesh.
- Rock size previews replaced the rock group while preserving water.
- Fish count previews preserved water and rocks and produced the requested school.
- Water previews and commits preserved terrain geometry, blend attributes and material.
- The test resize reduced water vertices from 5,371 to 1,555 during preview. Native numeric text entry, Escape cancellation and Enter commit were also exercised in the browser.
- Moss previews preserved water and rock mesh identities. Legacy rocks rendered as shoreline and shelf batches, alongside instanced pebbles.

The pond test suite passes **53 tests**. It covers simulation stability, fish habitat, resource disposal, terrain restoration/history, input invalidation, edit cancellation, subsystem identity, indexed preview detail and texture upload frequency. Typechecking reports existing host/React compatibility errors; there are no errors in `src/pond` in the final checked output.

## Measurements and limits

Local Bun CPU benchmark: 6 × 4 m oval, six koi; continuous border uses both contours. Five warm builds per mode. These numbers describe CPU work and mesh submission counts, not measured GPU FPS.

| Measure | Clusters | Continuous border |
| --- | ---: | ---: |
| Meshes before this work | 71 | 119 |
| Meshes after this work | 29 | 36 |
| Shadow-casting meshes after | 2 | 9 |
| Warm full build range | 106–153 ms | 104–133 ms |
| Water uniform edit average | 0.004 ms | 0.001 ms |
| Simulation CPU average per rendered frame | 0.44 ms | 0.25 ms |
| Rock rebuild including habitat/mask update | 31 ms | 33 ms |

Earlier full builds were roughly 330–670 ms, but differing warmup and system load prevent a controlled speedup claim. The collaborative browser did not deliver a usable continuous animation-frame sample; no FPS number is claimed. Structural edits still rebuild the affected basin or rock subsystem, and full rebuilds retain a visible CPU cost. GPU reflection and host post-processing costs depend on the surrounding scene and hardware.

## Further koi optimization — 6 October 2026

Navigation now indexes clearance-expanded rock bounds by spatial cell and runs the existing exact distance and depth checks only against nearby rocks. Offsets are allocated once per habitat rather than once per movement. A test compares the result with the previous full scan at 3,721 positions around a dense 384-rock border and concave bank.

Each koi's two eyes are merged into one mesh, preserving their positions and geometry. Pattern textures are shared within a school by the six deterministic marking variants. A 24-koi school therefore saves 24 meshes and uses six pattern textures rather than 24; disposal still releases each owned texture exactly once. Fish world matrices are updated in one school traversal before layered capture passes instead of recalculating ancestors for every fish.

The full pond suite now passes **55 tests**. Browser checks at port 3004 confirmed 24 koi with three meshes each, six shared pattern textures, unchanged water mesh identity after a fish-count edit, successful feeding, and finite world matrices after the transform update.

A local CPU microbenchmark using 384 obstacles, 10,000 deterministic positions and five passes measured **365 ms for the previous full scan versus 17 ms for the spatial lookup**. Both returned 10,020 safe results over 50,000 checks. This is a clearance-query benchmark, not an overall FPS measurement; scenes with few rocks will see a smaller benefit.

## Multiple fish types and replacement textures — 6 October 2026

The old koi marking generator has been removed. A new deterministic 640 × 256 atlas supplies two appearances each for koi, goldfish, carp, perch and trout. Three-pixel tile padding, inset UVs and linear filtering prevent neighbouring tiles from bleeding together. These are stylized procedural species textures, with different colour patterns, body proportions and matching fin colours; they are not photographic textures.

The editor's existing segmented controls select Mixed, Koi, Goldfish, Carp, Perch or Trout. Mixed schools distribute all five types deterministically. Selection is saved on the pond as `fishType`; data without that field defaults to Mixed. Count, size, habitat clearance, feeding, avoidance, wave response and the swimming shader retain the shared implementation.

All schools retain one immutable atlas with reference-counted disposal. Changing species retains the atlas through the overlapping replacement commit and replaces only the fish subsystem. Body geometry is shared by species/variant; fins and eyes are shared by species. Each fish still uses three meshes, with independently animated materials. The atlas occupies 640 KiB of RGBA pixel data, compared with 768 KiB for the preceding six textures per school, and multiple schools share that allocation.

Browser checks at port 3004 confirmed a 24-fish mixed school containing all five types, one atlas texture, successful feeding, and single-species switches to Trout and Goldfish. The final Goldfish switch retained atlas, water and rock identities. The full pond suite passes **61 tests**, including atlas determinism/UV bounds, species persistence, subsystem isolation and final-owner texture disposal.

The Landscape package typecheck also passes for this change.

### Individual fish movement (2026-10-06)

Replaced fixed-speed home circles with deterministic individual burst/coast rhythms, smoothly damped acceleration and turning, changing safe destinations, nearest forward-neighbour attraction and short-range repulsion. Added look-ahead bank/rock steering, varied depth preferences, gentle pitch/banking, and effort-dependent tail beats. Feeding and startle responses retain priority. Traits are calculated at creation; destinations are selected on arrival or every 5–13 seconds; existing shared geometry and atlas remain unchanged, with no additional draw calls.

Research: [burst-and-coast experiments](https://www.nature.com/articles/s42003-020-01521-z) and [experimental schooling interactions](https://pmc.ncbi.nlm.nih.gov/articles/PMC3219116/). This is an artistic approximation of observed principles, not measured species-specific locomotion.

Validation: 62 pond tests pass, including two reproducible 24-fish schools simulated for 60 seconds, varied speed envelopes, finite turns, submerged safe positions, and repeated-timestamp stability. Landscape TypeScript check passed. Browser at localhost:3004 loaded 24 mixed-species fish with finite transforms and feeding activated 24 food instances. Browser observations are functional checks, not an FPS benchmark.

### Pond panel cleanup (2026-10-06)

Applied the unslop skill to shorten labels and help text. Basin, border, water motion, rock variation and water lighting use the editor's existing collapsible PanelSection. Species uses the shared PanelSelect instead of two segmented rows. Feeding and ripple actions use the editor ActionButton. Removed rendering implementation notes and shortened the area/volume footer. Slider preview and commit handlers are unchanged.

Validation: 62 pond tests and Landscape TypeScript check pass. Browser at localhost:3004 verified collapsed sections, expanded rock variation controls, species selection changing all 24 fish to trout, and feeding confirmation. Restored mixed fish and cluster rocks after checks.

### More visible species and movement (2026-10-06)

The first species proportions and cruising speeds were too subtle at scene scale. Goldfish now have broader bodies and larger tails, perch have deeper bodies and taller dorsal fins, carp are bulkier, and trout are slimmer. Fin geometry is still shared by species and the original atlas is retained. Cruising speed now scales with fish length and species pace, and coasting retains more forward speed. Increased habitat depth and vertical clearance for the larger fins.

Validation: 63 pond tests and Landscape TypeScript check pass. A new test checks five distinct body and fin bounds while retaining three meshes per fish. At localhost:3004, inspected all five species and all 24 fish moved between samples with finite transforms. Feeding remained functional. Close-view screenshot saved in the browser artifact directory. No extra draw calls or textures.

### Removed fish feeding (2026-10-06)

Removed the panel action, feeding API and geometry re-export, feeding state and steering branches, food instance mesh and material, particle updates and bite ripples. Fish continue roaming and responding to disturbances. School matrices now update through the fish parent rather than the removed food mesh.

Validation: 63 pond tests and Landscape TypeScript check pass. Browser at localhost:3004 confirms no feeding button or food mesh, with all 24 fish still present. No feeding references remain in pond source.

### Low-poly fish detail (2026-10-06)

Reshaped the body rings for a clearer head and narrow tail base. Added curved gill-cover shading in the existing atlas, vertex-coloured fin rays, and small iris/pupil/highlight/mouth geometry merged into the existing face mesh. Reduced the body to 24 × 16 segments and each fin to 12 × 3 segments. Each fish now has 1,396 triangles compared with the prior 3,048, retains three meshes, and shares geometry per species/atlas variant. No extra textures or draw calls.

Validation: 64 pond tests and Landscape TypeScript check pass. Added a triangle-budget and shared-detail-geometry check. At localhost:3004 inspected all five species close up, confirmed 1,396 triangles per fish, finite transforms, 24 fish moving, and no feeding mesh. Restored the prior camera afterward.

### Pool water shader layers in the pond (2026-10-06)

Reviewed PoolWaterEffect and adapted its opposing dual normal panners, noise-distorted dual caustic samples, and narrow depth contact shading. Pool's normal2, caustic1 and noise4 maps are packaged with Landscape with source attribution and license. The pond retains its irregular terrain mask, wave solver, depth-dependent absorption/tint, foreground-safe refraction, real scene reflection and sunlight shading. Caustics sample the submerged hit position and fade near the surface and in deeper water. Ripple strength controls the added normal detail; underwater light controls caustics. No new panel controls or render passes.

The three immutable maps are shared across ponds, with idempotent last-owner disposal. Validation: 65 pond tests and Landscape TypeScript check pass. New lifetime test verifies sharing and disposal without damaging another live pond. At localhost:3004 verified the new material and all three 1024 × 1024 loaded maps, inspected rendered water, and previewed/cancelled clarity while retaining the same water mesh. No new console errors appeared in the preview snapshot. This check does not establish an FPS gain; the shader adds texture samples but no additional simulation or capture passes.

### Low flat stone border (2026-10-06)

Added Stone as the default border for new ponds, with existing saved Rocks and Clusters layouts retained. Adapted the Pool coping approach into fitted shoreline strips: low bevelled stones, small joints, restrained width/height variation, warm-grey shading and reduced moss. Sharp corners receive one fitted corner stone. Water-edge, outer-bank and both placements use deterministic layouts capped at 384 stones and eight material batches. Plan view uses the same stone footprints.

The panel uses existing editor controls with preview/commit handlers. Stone exposes border width, joints, size/height/colour variation, moss and arrangement seed; boulder-only controls stay with Rocks. Set the existing pond to Stone in external Chrome at localhost:3004, checked 3D water and the fitted plan-view outline, and saved stone-border.png. Also fixed premature null-image texture uploads exposed by Chrome's WebGL fallback; TextureLoader now owns upload readiness.

Validation: all 66 pond tests pass; the final targeted border suite passes nine tests. Landscape TypeScript check passes. These checks verify geometry, deterministic layouts, corner fitting and batching; no FPS improvement is claimed.

### Pond visual revision (2026-10-06)

Replaced the flat coping's dark double-tinted boulder shader with Pool-inspired mineral/grain/fracture shading, a warm stone pigment, subtle moss and a wet contact band. Added restrained irregular outer edges and two-segment softer bevels while retaining fitted joints, corner ownership and eight batches. Revised water absorption to preserve bed colour, strengthened dual normal-map detail and submerged caustics, and added Pool-style depth-coloured transmission so the centre reads blue-green while shelves and fish remain visible.

Validation: 66 pond tests pass and Landscape TypeScript check passes. Inspected the revised pond in external Chrome on localhost:3004, then adjusted the initial overly pale result. External Chrome intermittently timed out during framing and final screenshot saving; the last visible preview showed the revised border and depth-coloured water, but no new screenshot file was saved. No FPS gain claimed.

### Pond settings simplification (2026-10-06)

Removed the numeric seed, ripple test action/status, wave speed/decay, rain, disturbance response, redundant help text and misleading bank-finish selector from the panel. Retained saved settings compatibility. Main sections are Dimensions, Basin and bank, Border, Water and collapsed Fish. Motion is within Water; Variation and Lighting use aligned nested host PanelSections. Removed outer section gaps and double horizontal padding, matched fieldset spacing to the host, and styled the native colour input consistently with editor controls. Colour edits now correctly mark the preset Custom. Uses existing PanelSection, SliderControl, SegmentedControl, ActionButton, SceneToggleControl and shared PanelSelect; no new UI components. Slider preview/commit/cancel handlers are retained.

Validation: all 66 pond tests pass. Landscape TypeScript passes. External Chrome automation returned Debugger unattached, preventing final visual spacing verification or a new screenshot.

### Pond polygon reduction (2026-10-06)

Measured expanded triangle counts including instance multiplication. With six fish, a 6 × 4.5 m pond used 221,230 triangles (171,900 pebbles, 28,120 shelf rocks); an 18 × 13.5 m pond used 239,096. Replaced the 300-triangle scanned pebble with a 20-triangle icosahedron and reduced placement attempts from 1,600 to an area-scaled 48–256. The bed texture carries fine gravel. Reduced shelf rocks from 12 to six, smooth boulders from 40 × 28 to 12 × 8 segments, and rounded border rocks from 20 × 14 to 12 × 8. Submerged rocks no longer cast or receive shadows. Material batching and fish detail retained.

Terrain/water grid now uses .15 m spacing, 32–128 segments (preview .22 m, 24–64), compared with .075 m and 64–192. Shoreline crossings solve against the actual curved bed with a small inward bias. Fixed the existing shoreline test to inspect indexed triangles rather than arbitrary triples of unique vertices. After reduction, example pond-object totals are approximately 23,454 and 41,026 triangles (89.4% and 82.8% reduction). Separate terrain grids are 4,080 and 25,600 triangles; their previous grids were 16,146 and 73,728. These totals exclude the host's complete terrain and other scene objects, and are not measured FPS gains.

Validation: all 67 pond tests and Landscape TypeScript pass. Added polygon budgets including expanded instance counts, bounded pebble density and submerged shadow checks for 6/18/30 m ponds. External Chrome at localhost:3004 visually confirms sparse underwater rocks, intact stone border and rendered pond next to the Pool; screenshot reduced-polygons.png. No extra draw calls were added.

### Basement/site datum alignment (2026-10-06)

Pond parent-frame conversion now uses Core getLevelElevations for level Y, matching the viewer's computed storey stack rather than missing serialized position.y. Parent-context keys include computed baseY, so adding/removing a sibling basement, changing its height or a foundation displacement rebuilds pond geometry. Water, rock and fish local elevations all compensate the same parent datum and stay at site elevation. Renderer compensates only live level presentation offsets (actual level mesh Y minus computed baseY), keeping exploded views and level lerping out of persisted site excavation. Ancestor level IDs/base heights are cached; no new per-frame hierarchy traversal or allocation.

Validation: 69 pond tests and Landscape TypeScript pass. Added regressions for basement creation, 2.5/4 m heights, removal, world water/bed alignment and context invalidation from sibling levels. External Chrome localhost:3004 shows the existing pond seated in its site basin with Basement present. Screenshot basement-alignment.png. The separate Pool object's elevation behavior is outside this pond fix.

### Pond resize-arrow datum (2026-10-06)

Resize handle placement now resolves pondSiteDesign with the host SceneApi node snapshot. Both width/length arrows use the same site-relative local elevation as the pond contents, plus their existing .2 m visual clearance, rather than raw floor-relative elevation. Existing handle rendering, drag math and size patches remain unchanged. Added regression checks for both axes with a 3 m basement and after basement removal.

Validation: all 70 pond tests and Landscape TypeScript pass; final targeted site-terrain suite also passes. External Chrome localhost:3004 reloaded the updated plugin descriptors and shows the resize arrow beside the pond at site height with Basement present; arrow-alignment.png.

### Pool water appearance structure (2026-10-06)

Reviewed PoolWaterEffect buildMaterial in packages/pool/src/shader/water-effect.ts, particularly depth colours/scalar absorption, reflection radiance/confidence, Fresnel and planar pixel-normal animation. Replaced the pond's channel absorption/scatter and extra body tint with shallow/deep water colours derived from the existing colour setting and Pool's -.62 scalar absorption. Blend depth-attenuated scene transmission to keep fish/shelves visible. Pool's sky gradient backs the existing real planar reflection, weighted with screen-edge/angle confidence, and reflection response uses a cubic Fresnel curve. Increased existing dual normal detail. Surface now stays planar with animated fragment normals, avoiding coarse-grid displacement facets and removing vertex wave/terrain sampling. Existing wave solver, clipped shoreline, captures and submerged-hit caustics retained. No new textures, UI, render passes or polygons.

Validation: 70 pond tests and Landscape TypeScript pass. External Chrome localhost:3004 shows rendered water, visible fish and shallow/deep colour transition using the user's existing Custom preset. Screenshot pool-style-water.png. Appearance remains dependent on camera angle, lighting and authored settings; no measured FPS gain claimed.

### Actual Pool surface shader replacement (2026-10-06)

Replaced the entire former pond fragment shader with PoolWaterEffect's createWaterMaterial, normalSample, worldWaterUv and environmentIllumination methods copied from packages/pool/src/shader/water-effect.ts. Equations are unchanged; viewport captures are provided as instance inputs. Copied Pool Crystal clear preset settings and normal1/noise2/white textures, with asset attribution updated. The renderer passes the editor SceneAtmosphereSource, matching Pool lighting and sky radiance. Pool surface transparency, depth absorption, refraction, screen-space reflection, Fresnel, intersection/shoreline bands and specular highlights are now the pond's material. No old pond absorption/scatter/reflection equations or nested planar reflector remain.

Adapter supplies the pond's existing shoreline-clipped UV geometry and CPU wave slopes, preserving fish/pond interactions without adding Pool's separate GPU solver passes. Existing controls map to Pool uniforms; custom water colour supplies shallow/deep colour settings. Removed the underwater-light control because the surface replacement does not expose liner caustic lighting. Texture lifetime tests now check the actual normal/noise/shoreline maps; obsolete reflector lifetime/quality checks removed. Added a parity test comparing all four copied method bodies with Pool source.

Validation: 71 pond tests and Landscape TypeScript pass. External Chrome localhost:3004 shows the replacement shader with strong Pool surface highlights, blue centre, shallow edge band and visible fish. Screenshot pool-water-replacement.png. No new polygons or render passes; nested reflection rendering was removed. FPS was not measured.

### Adaptive Pool quality and shared captures (2026-10-06)

Implemented the first two remaining rendering optimizations. Pond water selects Pool's original Medium branch below a 140 px projected radius or while inputDragging is active, and returns to High above 200 px, with hysteresis in between. Materials are created once per quality and cached; switching preserves shared uniforms, simulation and settings and respects temporary material overrides. In Medium the Pool shader uses one normal sample and its sky reflection instead of the extra local scene reflection sample. Existing source-parity tests still pass.

All ponds retain the same viewport colour/depth base nodes, so those capture graphs can be updated once per renderer target rather than once per pond. Per-target texture sources remain isolated for differently sized editor targets. Reference-counted, idempotent release keeps captures alive until the last owner is removed. Cached inactive quality materials dispose with the pond.

Validation: 74 pond tests and Landscape TypeScript pass. New tests check quality hysteresis/editing, material reuse, preserved simulation/uniforms, disposal and shared capture lifetime. Existing nested render-target dimension tests pass. External Chrome localhost:3004 shows the pond with the Pool appearance intact; adaptive-water.png. Browser FPS was not measured. Fish instancing, distant simulation/steering and slider rebuild optimization remain separate follow-up work.

## Pond preset and water shading repair

- Fixed identical preset palette: Natural, Glass, Cinematic and Playful now author colour, clarity, reflection, refraction, highlights and wave motion together, and enable animation.
- Removed the preset/custom colour branch that changed hue when editing unrelated sliders. Every colour edit uses the same shallow/deep colour calculation.
- Retained Pool surface equations with explicit pond adaptations: basin texture bounds optical depth, depth attenuation reduces scene transmission, and Fresnel includes a small baseline reflection. Softer normals, highlights and shoreline bands suit natural water.
- Wave speed now drives normal-map motion as well as simulation. Preset changes participate in live uniform updates. Materials, captures and waves are reused.
- External Chrome verified all four presets and live clarity typing/Escape cancellation. Full pond suite: 75 passing tests; TypeScript passes. No measured FPS claim.
- Updated boulder variety regression to use actual rock count (the new 0.20 m default gap yields fewer than 30 stones).

## Pond bed finish choices

Added Basin and bank → Pond bed with Earth & silt (existing default), Sand, Fine gravel, River stones and Algae-covered stone. Uses existing shared sand/gravel/river mineral/grass scans with metre-based mapping; sand reduces normal relief. Finishes affect submerged terrain, preserving the exposed bank. Per-vertex bed selection supports different pond finishes on one site, while appearance invalidation is separate from excavation invalidation. No geometry or water simulation rebuild for bed edits; shader compiles only finishes present on each terrain mesh.

Verified in separate external Chrome tab at localhost:3004: persisted river-stone selection, sand, fine gravel and algae changes, no console errors. Temporarily increased clarity for inspection then restored 0.50. 76 pond tests pass and Landscape TypeScript passes. Screenshot: pond-bed-options.png.
