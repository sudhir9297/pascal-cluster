# Wall spouts, diverter spouts and bib taps

Researched and implemented 2026-10-01. Generic visual models with editable dimensions; no hydraulic simulation.

## Research

Google Images searches were captured before implementation:

- `wall bath bucket spout round square curved waterfall`: [screenshot](spout-google-images.png).
- `bath spout diverter pull up button hand shower connection`: [screenshot](diverter-spout-google-images.png).
- `wall bib tap cock round square cross lever`: [screenshot](bib-google-images.png).

Manufacturer references:

- [Hansgrohe Finoris bath spout](https://www.hansgrohe.com/articledetail-finoris-bath-spout-76410700?HGxH430=1), [browser screenshot](spout-hansgrohe.png).
- [Jaquar taps](https://www.jaquar.com/en/taps), [browser screenshot](bib-jaquar.png): round and square tap forms, including bib taps.
- [Jaquar Florentine Prime catalogue](https://www.jaquar.com/pdf/florentine-prime.pdf): bib taps, two-way bib taps and button spouts with hand-shower provision.
- [AXOR catalogue](https://assets.hansgrohe.com/mam/celum/celum_assets/16__ardd0122_pdf.pdf?10=): waterfall modules and separate control/body requirements.

[Rendered models](spout-models.png), [remaining spout and bib models](spout-models-lower.png), using neutral preview materials.

## Models and settings

Fifteen catalog presets share `bath-space:wall-spout`: round straight, curved, arched and tapered; square straight and angled; open and slit waterfall; round and square pull-up diverters; round button/hose and waterfall button; round lever, square lever and cross-handle bib taps.

Settings cover projection, section size, drop, rise, bend radius, waterfall width/height/slope, flange shape/size/thickness, aerator visibility, diverter style/state, optional hose outlet and bib handle style/length/angle. Preset changes retain node identity, wall placement and materials. Painted slots distinguish body, flange, outlet, aerator, diverter, handle and connector.

## Placement and connections

Wall-only placement uses either wall face. Floorplan movement retains a wall parent and cannot commit in empty space. Mount height and face are editable.

Stable `water-inlet` and `water-outlet` targets follow geometry. Diverter spouts add a prepared `shower-outlet`; optional hose connectors expose `hose` of type `shower_hose`. Existing hose placement and endpoint-following supports this supply host. Occupied child slots cannot be removed by a preset or setting change. Remote water binding remains pending.

The angled square outlet rim and aerator rotate with the outlet target. Waterfall targets use the actual rotated lip position.

## Verification

Tests cover all presets at dimension limits, finite geometry, matching target transforms, identity-preserving preset changes, persistence, front/back wall placement, floorplans and hose source updates. The complete Bath Space suite passed 165 tests; TypeScript passed. The outlet orientation adjustment also passed the three spout tests. Catalog loading was checked in the editor: [screenshot](spout-editor-catalog.png).

Full pointer placement, assembled connections and routing remain part of the active shower goal's final audit.
