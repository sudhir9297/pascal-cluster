# Bath and shower wall mixers

Researched and implemented 2026-10-01. These extend the existing shower-control models with an integrated visual spout and diverter.

## Research

Google Images query `bath shower wall mixer spout two handle single lever 3 in 1`: [saved results](bath-shower-mixer-google-images.png).

- [Jaquar Queen's Prime three-in-one wall mixer](https://www.jaquar.com/en/wall-mixer-3-in-1-system?Id=4564), [browser screenshot](bath-shower-mixer-jaquar.png): two controls, spout, hand-shower provision and overhead bend pipe. Heads and handsets are separate supplied items.
- [Jaquar Opal Prime single-lever bath/shower mixer](https://global.jaquar.com/en/single-lever-bath-shower-mixer-3-in-1-system-opp-chr-15118pm?Id=7903): single-lever wall-mounted variation with overhead and handset provisions.
- [Jaquar customer guide](https://www.jaquar.com/pdf/customer-guide-vol18.2.pdf): wall mixers with hand-shower arrangements, overhead provision and three-in-one forms.
- [GROHE SPA catalogue](https://cdn.cloud.grohe.com/Literature/Brochures/G/GRO/GROHE-SPA-LookBook_en_Master/original/GROHE-SPA-LookBook_en_Master.pdf): wall-mounted single-lever bath mixers and separate spouts.

## Models and settings

Six new catalog presets use `bath-space:shower-control`: round/square two-handle bath mixers, round/square single-lever bath mixers, a thermostatic bath mixer and a waterfall three-way wall mixer.

[Rendered models](bath-shower-mixer-models.png) use neutral preview materials. [Editor catalog](bath-shower-mixer-editor.png) shows the new presets. The placement tool loads successfully and presents wall-placement hints.

Existing body width, inlet spacing, projection, section size, handle dimensions, handle angles, wall height and cover settings remain available. The bath-spout panel adds seven spout shapes, length/drop/rise, waterfall width/height/slope, swivel angle, aerator, pull-up/button diverter and raised state. Optional overhead connections have an adjustable riser connector height. Spout, outlet rim, aerator and diverter have separate finish slots.

## Placement and connections

All models use the shared wall-only placement tool, on either wall face. The embedded spout is part of the mixer geometry; it has no independent wall parent. Swivelling the spout rotates its geometry and the stable `bath-spout` outlet target together. Target orientation composes swivel and tip angle in the same order as the actual model.

Optional `hose` and `riser` targets retain their identities during spout changes. The hose connection is offset beside the spout, and the overhead target is at the top of its visible connector. Removing occupied child slots is prevented by the existing inspector guard. Head, handset and hose consumers are separate components. Remote water binding and the riser/column consumer remain pending.

## Verification

Four focused control/mixer tests pass, including all 18 presets and six bath forms at size/swivel limits. They check finite geometry, exact target positions/orientations, no duplicate nested spout targets, stable identities, persistence, cache keys, wall placement and hose endpoint following. Rendered forms and editor catalog/tool loading were checked in the collaborative browser.

A full-suite run found 168 passing tests and one failure in the concurrently edited bathtub dimension test (requested width 0.65 m, generated width 0.70 m). A subsequent TypeScript check passed after the concurrent bath edits settled. The subsequent full run had 170 passing tests and one failing bath section-dimension test; the earlier bath geometry failure was resolved. The full suite must be rerun after that concurrent work settles. Full assembled pointer interaction remains in the active shower goal's final audit.
