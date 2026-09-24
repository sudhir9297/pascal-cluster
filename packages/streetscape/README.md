# Pascal Streetscape Plugin

Pascal Streetscape is the first-party plugin for building complete
streetscapes in the Pascal editor. It provides procedural systems and
configurable assets for roads, lighting, signs, utilities, and roadside
infrastructure, with a host-side Streetscape panel for placing and editing them.

```bash
git clone https://github.com/sudhir9297/streetscape-pascal-plugin.git
cd streetscape-pascal-plugin
bun install
bun run check-types
bun test
```

The package uses only public `@pascal-app/*` APIs and is structurally identical
to a third-party plugin.

## What it contributes

- **Map street import** — opens a searchable 3D globe and street map from the
  Roads panel. Choose a 50–600 m radius, preview the clipped OpenStreetMap roads
  and tagged objects, then import editable road networks, street lamps, traffic
  signals, and road signs. The importer reuses the previewed data, keeps road
  classes, one-way direction, junctions, bridges, object direction and lamp
  height where mapped. Each imported street keeps its own editable cross-section,
  using mapped lane counts, pavement width, sidewalks, on-road cycle lanes and
  parking lanes. Widths in metres and feet are supported. Missing dimensions use
  estimated defaults; medians, cycle lanes and parking are not added without tags.
  Lane-specific widths, directions and bus/bicycle uses retain their mapped
  provenance. Separately mapped sidewalks, cycleways, crossings, kerbs and
  `area:highway` polygons are matched to the full road corridor, clipped to the
  selected radius and rendered as continuous solid surfaces without duplicating
  inferred roadside strips. Multipolygon cut-outs and lane-connectivity relations
  are retained with their source IDs.
  One-way streets use lane dividers without an opposing-traffic centerline.
  Curb returns shrink to fit closely spaced imported junctions.
  Live imports sample terrain relative to the selected origin, respect explicit
  `ele` tags, and add clearly marked estimated clearance profiles where mapped
  bridges or tunnels cross ordinary roads. Common sign tags map to the built-in
  sign catalog; unknown sign codes use the generic warning sign.
  After import, the editor selects the new nodes and fits them in a north-up 2D
  view. The complete import is one
  undoable editor change. Imports on the same level share a geographic origin,
  so adjacent selections line up. The preview reports streets already in the
  editor; importing skips complete road duplicates, trims partial overlaps, and
  skips objects already imported from the same OpenStreetMap node.

  Standalone hosts use the public map services directly. Production hosts can
  route geocoding, street data, and raster tiles through one
  same-origin caching gateway:

  ```ts
  import { configureMapImportGateway } from '@pascal-app/plugin-streetscape-lab'

  configureMapImportGateway('/api/map')
  ```

- **`streetscape:road-sign`** — a reusable catalog-driven roadside sign with
  procedural plate geometry, single- or double-post mounting, adjustable sign
  scale and mounting height, editable display text, vector face graphics, a
  placement preview, selection handles, and a 2D floorplan symbol. The starter
  catalog includes stop, yield, speed-limit, no-entry, no-parking, pedestrian
  crossing, warning, and directional signs; add a jurisdiction-specific pack by
  extending the exported catalog table without changing the node or renderer.

- **`streetscape:street-light`** — a swept-arm roadway pole with an integrated
  low-profile, full-cutoff LED luminaire and operational scene light.
- **`streetscape:pedestrian-post-light`** — a modern pedestrian-scale post-top
  lamp with a circular downward-facing luminaire.
- **`streetscape:heritage-crook-light`** — a heritage Bishop's Crook pole with
  a suspended teardrop lantern and ornamental metalwork.
- **`streetscape:cobra-head-light`** — a classic swept-arm roadway lamp with a
  broad die-cast housing, photocell, and dropped prismatic cobra-head optic.
- **`streetscape:twin-arm-median-light`** — a balanced wishbone crown with
  opposing slim LED heads for divided roads and medians.
- **`streetscape:multi-head-area-light`** — a configurable three- or four-head
  radial pole for junctions, plazas, and parking areas.
- **`streetscape:truss-roadway-light`** — a fitted pipe-truss roadway pole with
  separate structural brackets and a full-cutoff LED luminaire.
- **Large-area families** — `streetscape:high-mast-crown-light`,
  `streetscape:shoebox-area-light`, and `streetscape:floodlight-pole` cover
  serviceable high-mast lowering crowns, low-profile LED parking-area poles,
  and tilted projector heads.
- **Pedestrian and civic families** — `streetscape:traditional-post-top-lantern`,
  `streetscape:globe-post-top-light`, `streetscape:decorative-candelabra-light`,
  `streetscape:path-garden-light`, and `streetscape:bollard-light` cover
  heritage streets, parks, paths, and plazas.
- **Architectural and suspended families** — `streetscape:catenary-street-light`,
  `streetscape:wall-arm-light`, `streetscape:wall-pack-light`,
  `streetscape:tunnel-luminaire`, and `streetscape:canopy-soffit-light` cover
  overhead, facade, soffit, and tunnel mounting conditions.
- **`streetscape:solar-street-light`** — a single-sided roadway pole with one
  integrated photovoltaic luminaire and an off-by-default lamp state.
- **`streetscape:utility-pole`** — a procedural three-phase distribution pole
  with tangent, small-angle, junction, and dead-end assembly roles; primary and
  lower neutral crossarms; braces; pin insulators; optional transformer; and
  stable conductor attachment points. Its default is a standard 35 ft
  residential pole with 29.5 ft (8.99 m) visible above grade. Connected poles
  automatically orient their crossarms perpendicular to the main span.
- Junction roles show a three-cutout tap rack, and dead-end roles use
  strain-style primary insulators with guy/anchor cues.
- **`streetscape:utility-wire-span`** — an automatically generated three-phase
  primary span plus lower neutral with visible conductor sag. A newly placed
  pole is inserted into a nearby through-span or connects to the nearest
  same-level pole within the 45.72 m urban connection limit, allowing shared-pole
  T-junctions.
- **`streetscape:traffic-signal`** — a field-detailed modular vehicle signal
  with post, rigid mast-arm, or span-wire mounting; one or two heads; three-
  section, protected-turn, four-section, and five-section face layouts;
  circular and directional indications; cap/tunnel/no-visor options; reflective
  backplates, street-name sign, controller cabinet, configurable finishes,
  placement preview, and matching 2D floorplan symbol.
- **`streetscape:drainage-inlet`** — a shallow road inlet with grate-only or
  curb-opening combination construction and bicycle-safe, reticuline,
  parallel-bar, or curved-vane surface patterns.
- **`streetscape:manhole-cover`** — a flush round cast-metal access cover with
  adjustable diameter, radial/grid/ring tread patterns, utility designation,
  wetness, placement preview, and floorplan representation.
- **`streetscape:fire-hydrant`** — a modular dry-barrel hydrant with one-,
  two-, or three-outlet layouts, independent body/bonnet/cap finishes,
  optional protective guards, weathering, placement preview, and floorplan
  footprint.
- **Expanded Utilities catalog** — utility poles, vehicle signals, drainage
  grates, manhole covers, and hydrants share the existing Utilities side-menu
  category and remain grouped by function.
- **Categorized placement panel** — separate Lighting, Signs, and Utilities
  catalogs, including reusable road-sign placement tools.
- **Placement settings** — light height/arm/lamp state and utility-pole
  height/crossarm/transformer state.
- **Lamp height** — standard lamp archetypes start at 6 m; the high-mast crown
  starts at a realistic 18 m. All expose the same 0.5–30 m editing range.
  Related catalog families expose a side-menu style switch (roadway head,
  civic post-top, path-scale, or structure-mounted).
- **Shared roadway implementation** — street, cobra-head, twin-arm, multi-head,
  and truss lamps reuse one roadway head/base/mast primitive set; each keeps
  its own arm arrangement and thumbnail, so adding a new roadway variant does
  not duplicate the fixture geometry or lighting logic.
- **Inspector settings** — geometry, equipment state, colours, light intensity,
  and position.
- **Rendering support** — procedural geometry, placement preview, operational
  spotlight, selection, and 2D floorplan symbols.
- **Structural supports** — catenary, wall-arm, wall-pack, tunnel, and canopy
  styles all include a reusable vertical pole and base.

## Manifest

```ts
import { streetscapeLabPlugin } from '@pascal-app/plugin-streetscape-lab'

setPluginDiscovery(async () => [streetscapeLabPlugin])
```

The editor app separately imports `streetscapeLabHostPanel` to surface the
Streetscape Lab placement panel. Panels are not part of the v1 core plugin manifest.
