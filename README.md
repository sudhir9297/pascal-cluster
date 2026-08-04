# Pascal Environment Plugin

Pascal Environment is the first-party environment-building plugin for the
Pascal editor. It provides procedural systems and configurable assets for
populating complete outdoor scenes, with a host-side Environment panel for
placing and editing them.

```bash
git clone https://github.com/pascalorg/plugin-environment.git
cd plugin-environment
bun install
bun run check-types
bun test
```

The package uses only public `@pascal-app/*` APIs and is structurally identical
to a third-party plugin.

## What it contributes

- **`environment:road-sign`** — a reusable catalog-driven roadside sign with
  procedural plate geometry, single- or double-post mounting, adjustable sign
  scale and mounting height, editable display text, vector face graphics, a
  placement preview, selection handles, and a 2D floorplan symbol. The starter
  catalog includes stop, yield, speed-limit, no-entry, no-parking, pedestrian
  crossing, warning, and directional signs; add a jurisdiction-specific pack by
  extending the exported catalog table without changing the node or renderer.

- **`environment:street-light`** — a swept-arm roadway pole with an integrated
  low-profile, full-cutoff LED luminaire and operational scene light.
- **`environment:pedestrian-post-light`** — a modern pedestrian-scale post-top
  lamp with a circular downward-facing luminaire.
- **`environment:heritage-crook-light`** — a heritage Bishop's Crook pole with
  a suspended teardrop lantern and ornamental metalwork.
- **`environment:cobra-head-light`** — a classic swept-arm roadway lamp with a
  broad die-cast housing, photocell, and dropped prismatic cobra-head optic.
- **`environment:twin-arm-median-light`** — a balanced wishbone crown with
  opposing slim LED heads for divided roads and medians.
- **`environment:multi-head-area-light`** — a configurable three- or four-head
  radial pole for junctions, plazas, and parking areas.
- **`environment:truss-roadway-light`** — a fitted pipe-truss roadway pole with
  separate structural brackets and a full-cutoff LED luminaire.
- **Large-area families** — `environment:high-mast-crown-light`,
  `environment:shoebox-area-light`, and `environment:floodlight-pole` cover
  serviceable high-mast lowering crowns, low-profile LED parking-area poles,
  and tilted projector heads.
- **Pedestrian and civic families** — `environment:traditional-post-top-lantern`,
  `environment:globe-post-top-light`, `environment:decorative-candelabra-light`,
  `environment:path-garden-light`, and `environment:bollard-light` cover
  heritage streets, parks, paths, and plazas.
- **Architectural and suspended families** — `environment:catenary-street-light`,
  `environment:wall-arm-light`, `environment:wall-pack-light`,
  `environment:tunnel-luminaire`, and `environment:canopy-soffit-light` cover
  overhead, facade, soffit, and tunnel mounting conditions.
- **`environment:solar-street-light`** — a single-sided roadway pole with one
  integrated photovoltaic luminaire and an off-by-default lamp state.
- **`environment:utility-pole`** — a procedural three-phase distribution pole
  with tangent, small-angle, junction, and dead-end assembly roles; primary and
  lower neutral crossarms; braces; pin insulators; optional transformer; and
  stable conductor attachment points. Its default is a standard 35 ft
  residential pole with 29.5 ft (8.99 m) visible above grade. Connected poles
  automatically orient their crossarms perpendicular to the main span.
- Junction roles show a three-cutout tap rack, and dead-end roles use
  strain-style primary insulators with guy/anchor cues.
- **`environment:utility-wire-span`** — an automatically generated three-phase
  primary span plus lower neutral with visible conductor sag. A newly placed
  pole is inserted into a nearby through-span or connects to the nearest
  same-level pole within the 45.72 m urban connection limit, allowing shared-pole
  T-junctions.
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
import { environmentPlugin } from '@pascal-app/plugin-environment'

setPluginDiscovery(async () => [environmentPlugin])
```

The editor app separately imports `environmentHostPanel` to surface the
Environment placement panel. Panels are not part of the v1 core plugin manifest.
