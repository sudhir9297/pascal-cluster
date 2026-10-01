# Body jets and grouped sprays

Researched and implemented 2026-10-01. Generic visual models with configurable nozzle patterns; no water simulation.

## Research

Google Images query `shower body jet round square flush adjustable spray`: [screenshot](body-jet-google-images.png).

- [Kohler WaterTile body sprays](https://www.kohler.com/en/products/showers/shop-watertile-body-sprays), [browser screenshot](body-jet-kohler.png): round and square low-profile forms.
- [Kohler square 22-nozzle body spray](https://www.kohler.com/en/products/showers/shop-body-sprays/watertile-square-22-nozzle-single-function-body-spray-2-5-gpm-8003?skuId=8003-CP): example flush square spray face.
- [Kohler Middle East catalogue](https://me.kohler.com/wp-content/uploads/2021/04/Kohler-ME-Product-Catalogue-2021.pdf): round/square WaterTile forms and grouped wall sprays.

[Rendered models](body-jet-models.png), using neutral preview materials.

## Models and settings

Eight presets share `bath-space:body-jet`: round/square flush, round/square adjustable, rectangular spray, massage dome, three vertical square jets and three horizontal round jets.

Settings include face width/height/depth, minimum face pivot from wall, pitch/yaw, nozzle spacing/diameter/visibility, one to four jets, group direction/spacing and cover dimensions. Geometry fits the requested pivot outward when necessary to keep tilted faces clear of the wall. Group spacing expands when needed to separate faces and cover plates. Body, flange, face and nozzles have separate paint slots.

## Placement and connections

Jets are wall-only fixtures on either face, using the shared placement and floorplan movement tools. Each member has stable `water-inlet-N` and `spray-N` targets. Spray target position and orientation follow resizing and tilt. Preset/setting changes cannot remove occupied child slots. Remote water connections remain pending.

## Verification

Tests exercise every preset at dimension limits, opposite aspect ratios, maximum tilt, smallest projection and grouped spacing. Exact transformed geometry bounds verify wall clearance; target identities, rotations, finite geometry, persistence, preset identity and floorplan geometry are checked. The full Bath Space suite passed 165 tests and TypeScript passed. Rendered models were inspected in the collaborative browser.

Full pointer interaction and assembled connections remain in the active goal's final audit.
