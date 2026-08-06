# Street Infrastructure Implementation Plan

This plan turns the source survey in
[`street-infrastructure-research.md`](./street-infrastructure-research.md) into
small, independently shippable changes for the Pascal Environment plugin. The
scope is deliberately visual: credible street assets, placement, editing, and
road alignment. It does not claim traffic-engineering, drainage-capacity, fire-
flow, clearance, or code compliance.

In this document, **drainage grate** is used for the requested “drainage gate.”

## Outcome

Ship four first-class procedural asset families:

1. `environment:traffic-signal`
2. `environment:drainage-inlet`
3. `environment:manhole-cover`
4. `environment:fire-hydrant`

Each family must have a stable schema, procedural 3D model, placement preview,
placement tool, inspector controls, selection and transformation behavior, a 2D
floor-plan symbol, catalog artwork, unit coverage, and live-editor visual QA.
Variants belong in configuration tables and reusable primitives rather than in
separate node kinds.

## Source-backed first catalog

| Family | First catalog entry | First visible options | Deferred options |
| --- | --- | --- | --- |
| Vehicle traffic control | Vertical three-section red/yellow/green signal | Roadside post or single mast arm, circular or turn face, visors, optional backplate and cabinet, active indication, configurable finishes | Horizontal and clustered faces, span wire, hybrid beacon, portable signal, synchronized phases |
| Drainage inlet | Rectangular bicycle-safe gutter grate | Bicycle-safe, reticuline, parallel-bar, or curved-vane grate; grate-only or combination curb opening; dry/wet/rust/silt condition | Standalone curb opening, sweeper inlet, continuous trench drain, blocked-flow behavior |
| Manhole cover | Round flush cast-metal cover and frame | Diameter, tread, utility legend, lift holes, rotation, patch ring, dry/wet/rust condition | Square, twin-leaf, vault, UK paver-infill, deep shaft behavior |
| Fire hydrant | Breakaway dry-barrel post hydrant | Outlet layout, body/bonnet/cap colors, cap chains, weathering, valve cover, marker, protective bollards | Wet barrel, UK underground hydrant and marker, flush hydrant, yard hydrant, monitor hydrant |

The initial dimensional presets should follow the researched visual scale
anchors, but the UI must call them scene presets rather than engineering
defaults. Regional packs can replace them later.

## Product and architecture decisions

### Node boundaries

- Use a dedicated node for each of the four families. Their inspector fields,
  floor footprints, and future road behavior are different enough that one
  generic “street prop” schema would become shallow and conditional.
- Keep each family internally catalog-driven. For example, adding a UK gully
  changes a drainage configuration table and geometry projection, not the
  plugin manifest.
- Reuse `usePlacement`, selection materials, floor placement, rotate handles,
  renderer/preview boundaries, and the definition structure already used by
  road signs and utility poles.
- Keep the existing **Utilities** catalog category and group the new cards into
  Traffic control, Drainage, and Fire safety sections alongside utility poles.
  Do not add another top-level side-menu category.
- Keep all first-release assets manually placeable. Road-aware snapping and
  automatic junction layouts are a later integration gate, after independent
  placement is stable.

### Visual ownership

- A traffic-signal node owns its support, arm, visible heads, backplates,
  cabinet, and attachment anchors. It does not own an entire intersection.
- A drainage-inlet node owns the surface frame, grate, optional curb throat,
  and a shallow visual recess. It does not cut or simulate the storm network.
- A manhole-cover node owns the frame, cover, relief pattern, legend, and
  optional pavement patch. It does not generate a shaft.
- A hydrant node owns the above-ground assembly and optional nearby guards or
  valve cover. It does not model underground water mains or fire flow.
- Color is editable appearance data. Do not encode traffic authority, utility,
  hydrant capacity, or service status solely from a universal color assumption.

### Performance rules

- Reuse geometries and materials for repeated head sections, grate bars,
  hydrant bolts, caps, and chains.
- Use instancing or a merged shallow relief geometry for repeated grate and
  tread elements; do not create hundreds of standalone mesh children.
- Use emissive materials only on the active signal lens. Inactive lenses remain
  visibly dark without contributing live scene lights.
- Keep recesses and surface hardware slightly separated from the host surface
  to prevent z-fighting in 3D and floor plan.
- Treat weathering as bounded material controls and a few reusable overlays,
  not unique high-resolution textures per asset.

## Dependency-ordered implementation steps

### Step 0 — lock the first-release contract

1. Confirm the four node kinds above and reserve their object-ID prefixes.
2. Record the initial enum values in configuration modules before building UI.
3. Confirm that the first traffic pack is U.S./MUTCD-inspired and that later
   regional packs may change dimensions, face layouts, mounting, and finishes.
4. Confirm that signal timing, hydraulic calculations, and hydrant engineering
   checks are explicit non-goals.

**Gate:** schema field names and first catalog entries can be reviewed without
seeing renderer code.

### Step 1 — add shared catalog and placement foundations

1. Keep `EnvironmentPanelCategory` unchanged and reuse `utilities`.
2. Add grouped catalog-card support for Traffic control, Drainage, and Fire
   safety, retaining single and continuous placement modes.
3. Add shared constants for metal finish, condition, surface offset, and common
   eight-angle rotation snapping where semantics match.
4. Add thumbnail exports and stable artwork keys.
5. Add a manifest test that makes any omitted or reordered node registration
   intentional.

**Gate:** the expanded Utilities category renders grouped cards without
regressing Roads, Lights, Signs, or existing utility-pole controls.

### Step 2 — build traffic-signal geometry primitives

Create reusable procedural primitives for:

- pole, base plate, anchor-bolt ring, mast arm, brackets, and end caps;
- signal housing, lens bezel, dark lens, circular LED disc, and arrow LED;
- cap, tunnel, and open-bottom visor silhouettes;
- plain and reflective-border backplates;
- controller cabinet and concrete pad;
- named face and accessory anchors.

The three-section face should be assembled from the same signal-section
primitive used by later four- and five-section faces. Geometry helpers must
return finite dimensions and named positions without depending on React.

**Gate:** geometry tests cover all primitive presets, scale anchors, head
spacing, mast-arm reach, backplate bounds, and left/right arrow mirroring.

### Step 3 — ship the first traffic-signal node

Add a schema broadly covering:

- `mount`: `post | mast-arm | span-wire`;
- `headLayout`: `three-section | three-section-turn | four-section-turn |
  five-section-cluster`;
- left/right turn direction;
- support height, arm reach, head count, and head spacing;
- `signalState`: `dark | red | yellow | flashing-yellow | green | green-arrow`;
- cap, tunnel, and no-visor styles plus a reflective-border backplate;
- optional controller cabinet;
- optional street-name sign;
- support, housing, backplate, and cabinet finishes;
- bounded weathering.

Then add the definition, renderer, model, preview, tool, inspector, placement
brush state, rotate/height/reach handles, floor-plan symbol, thumbnail, catalog
card, exports, and README entry.

The first version displays a selected static indication. It must not expose a
phase scheduler or imply coordinated intersection behavior.

**Gate:** a user can place post, mast-arm, and span-wire variants, change the active
indication and turn direction, toggle the backplate/cabinet, edit finishes,
rotate and move the node, and see matching 2D output. Night QA confirms that
only the selected indication is emissive and inactive lenses remain legible.

### Step 4 — build drainage-inlet primitives

Create reusable procedural primitives for:

- rectangular frame and shallow inlet recess;
- bicycle-safe transverse, reticuline, parallel-bar, and curved-vane patterns;
- curb throat, optional hood, and combination-inlet back;
- flat and locally depressed gutter surrounds;
- shallow wetness, silt, rust, and leaf overlays.

Keep grate direction explicit in the geometry result so 3D, floor plan, and
future road-edge alignment cannot disagree.

**Gate:** tests verify finite geometry, pattern orientation, bar spacing at the
selected visual scale, curb-opening bounds, and no empty mesh submissions.

### Step 5 — ship the first drainage-inlet node

Add a schema broadly covering:

- `inletType`: `grate | combination`;
- `gratePattern`: `bicycle-safe | reticuline | parallel | curved-vane`;
- width, length, frame depth, curb-opening height, and gutter depression;
- rotation and surface offset;
- frame/grate finish, wetness, rust, silt, and optional leaf debris.

Add the complete definition/model/renderer/preview/tool/inspector/floorplan/
thumbnail/catalog/export path.

The first placement tool stays planar and manually aligned. It should provide
a clear flow-direction or curb-facing editor cue without rendering that cue in
the committed scene.

**Gate:** all grate patterns and both inlet types place cleanly on road-adjacent
surfaces, remain selectable, do not flicker against the ground, and have a
readable directional floor-plan symbol.

### Step 6 — ship the manhole-cover node

Create a separate shallow-surface asset with:

- initial round cover and frame;
- diameter, frame-ring width, relief/tread preset, lift-hole preset, rotation,
  and flush offset;
- blank, storm, sanitary, water, electric, and custom short legend options;
- optional pavement patch ring;
- cast-metal finish, wetness, rust, and shallow puddle controls.

Text or legends must use escaped generated SVG/decal content or bounded shallow
geometry, following the safety pattern already used by road-sign text.

**Gate:** the cover reads at close and medium distance, stays flush without
z-fighting, exposes a true outer-frame floor-plan footprint, and safely handles
custom legend input.

### Step 7 — build and ship the first fire-hydrant node

Create modular primitives for:

- lower/upper barrel, ground and breakaway flanges, bolt ring, and seams;
- bonnet and top operating nut;
- hose and pumper nozzles, caps, optional chains, and nozzle anchors;
- optional valve-box cover, reflective marker, and protective bollards.

Add a schema broadly covering:

- initial `barrelType: dry`, reserving `wet | underground` for migrations;
- `outletLayout`: `two-hose-one-pumper | two-hose | one-hose`;
- exposed height, body scale, nozzle-facing rotation, and curb-facing cue;
- independent body, bonnet, and cap colors;
- chains, valve cover, marker, and guards;
- weathering, rust, chipped paint, wetness, and out-of-service bag.

Add the complete node, placement, panel, floorplan, thumbnail, export, test, and
README path.

**Gate:** every outlet layout renders in preview and committed states; optional
parts change the 3D and 2D footprints correctly; colors remain independent;
chains are disabled or simplified at distance; scale is visually verified
beside a road, sidewalk, person, and vehicle reference.

### Step 8 — integrate with the existing road system

Use the existing generic `RoadEdgeAttachment` seam instead of inventing a new
topology system.

1. Add optional road-edge attachment for drainage inlets, manhole covers, and
   hydrants so graph splits preserve the asset station.
2. Align drainage inlets to the selected gutter edge, side, and crossfall.
3. Keep manholes movable across lane, sidewalk, and verge surfaces.
4. Let hydrants face the curb while retaining manual setbacks.
5. For a junction whose visible treatment is `signal`, offer a reviewable
   “Place signal assets” action that proposes poles and faces using the active
   driving-side regional pack.
6. Store generated signal assets as ordinary editable nodes plus attachment
   metadata; do not regenerate away user edits.
7. Validate missing hosts and detached attachments without blocking unrelated
   road rendering.

**Gate:** splitting, merging, moving, or deleting a road preserves or cleanly
detaches attached assets; no automatic action silently changes a manually
edited assembly.

### Step 9 — visual QA and browser acceptance

Build one representative scene containing:

- a signalized four-way junction with post and mast-arm signals;
- a road-edge grate and combination inlet;
- dry, wet, rusty, and leaf-obstructed drainage examples;
- round manholes in asphalt and sidewalk paving;
- clean and weathered hydrants with and without guards.

Verify:

- day and night signal legibility;
- inactive lens, visor, and backplate readability;
- realistic scale and clear silhouettes at editor zoom levels;
- correct shadows, selection highlighting, duplication, deletion, and undo;
- floor-plan symbols and hit areas;
- thumbnails at catalog size;
- no z-fighting, empty meshes, non-finite geometry, or console errors;
- no regressions in road, sign, light, or utility placement.

**Gate:** automated tests and type checking pass, and screenshots are captured
for full scene, detail, floor plan, and day/night comparison.

### Step 10 — document, migrate, and close the P0 items

1. Document all four asset families and their non-engineering scope in README.
2. Export public node/config/geometry types that third-party regional packs
   need, while keeping renderer internals private.
3. Add schema migrations before changing any shipped enum or default.
4. Update the environment master checklist only after implementation and
   visual verification.
5. Record regional follow-ups as separate milestones rather than expanding the
   first release indefinitely.

**Gate:** a new project and a saved/migrated project both load the assets, and
the documentation matches what is actually registered.

## Recommended commit sequence

Keep every commit testable and visually reviewable:

1. `docs: research street infrastructure asset types`
2. `feat: add infrastructure catalog foundation`
3. `feat: add modular traffic signal primitives`
4. `feat: add traffic signal placement and editing`
5. `feat: add procedural drainage inlet`
6. `feat: add configurable manhole covers`
7. `feat: add modular dry barrel hydrant`
8. `feat: attach street infrastructure to roads`
9. `test: cover street infrastructure editor workflows`
10. `docs: document street infrastructure catalog`

Do not combine all four nodes into one commit. Each node should be usable and
verified before the next asset family begins.

## First implementation target

Start with Steps 0–3 and stop at this user-visible milestone:

> A user opens Utilities → Traffic control, places either a roadside-post
> or mast-arm three-section vehicle signal, selects the visible indication,
> adjusts its support and finishes, and sees a matching selectable floor-plan
> symbol with a credible day/night appearance.

Once that milestone passes visual QA, proceed to the drainage inlet, manhole
cover, and hydrant in that order.
