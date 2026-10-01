# Shower assemblies — research and implementation

Browser research captured 2026-10-01 before implementation. Columns and panels now have visual implementations; complete shower kits remain pending.

## Google Images

- Column: `shower column pipe system round square adjustable thermostatic`, [screenshot](column-google-images.png).
- Panel: `shower panel tower body jets waterfall round square`, [screenshot](panel-google-images.png).
- Kit: `shower set kit overhead hand shower concealed exposed`, [screenshot](kit-google-images.png).

## Manufacturer references

- [GROHE Tempesta system](https://pro.grohe.com/en_pj/tempesta-system-200-shower-system-with-diverter-for-wall-mounting-27389000.html), [browser screenshot](column-grohe.png): horizontal arm, overhead and hand shower, height-adjustable gliding holder and diverter.
- [Kohler HydroRail specification](https://resources.kohler.com/webassets/kpna/catalog/pdf/en/K-45212_spec_US-CA_Kohler_en.pdf): adjustable handset height/angle; head, handset and hose sold separately. This distinguishes a column from its included bundle.
- [Jaquar Project panel](https://global.jaquar.com/en/project-shower-panel), [browser screenshot](panel-jaquar.png): integrated overhead, waterfall, hand shower, body jets and spout with multifunction diverter.
- [Jaquar panel specification](https://uae.jaquar.com/ViewAttachment/25583): a 1500 × 200 mm black-glass example with two adjustable body massage jets and a shampoo shelf.
- [Jaquar wellness catalogue](https://www.jaquar.com/pdf/wellness.pdf): curved panel forms and side/front drawings.
- [Kohler Purist kit](https://la.kohler.com/en/product-detail/22181-G?skuid=K-22181-G-CP), [browser screenshot](kit-kohler.png): actual included components are head, handset, hose, slidebar, arm/diverter and valve trim.

## Implemented columns and panels

Eight presets are available: round thermostatic, square thermostatic, curved and classic cross-handle columns; flat, rounded, curved and waterfall panels. These are procedural interpretations of the researched product families, not manufacturer replicas.

Inspector settings include body height, panel width/depth/profile, column projection and tube size, overhead projection, brackets/flanges, holder height/side/offset/tilt, mixer style, jet count/shape/size/tilt, shelf, spout and waterfall options. Heads, handsets and hoses are separate persisted component nodes with their own inspectors. Switching an assembly preset preserves existing child identity and chosen child models.

Stable head, handset and hose targets follow the current body and holder geometry. Named supply, jet and spout targets describe the remaining connections. One placement transaction creates the body and its enabled children; undo and redo handle that transaction together. Wall-only placement clamps the assembly body to the wall height and width, rejecting walls too short or narrow. Front/back attachment transforms and fitted mounting height are shared by the model, floorplan and hose connection calculations.

## Rendered evidence and verification

- Neutral-material model gallery: [upper variants](assembly-models-top.png), [lower variants](assembly-models-lower.png). This gallery checks silhouette and detail; it does not represent editor materials.
- [Actual editor panel rendering](assembly-editor-panel.png): wall-mounted flat panel with independent overhead head, hand shower and connected hose, three body jets and two controls.
- Focused tests: 11 passing across four files, covering finite geometry at dimension limits, stable target transforms, JSON persistence, wall bounds, replacement and hose endpoint transfer, and atomic scene creation/undo/redo.
- Editor interactions verified: a ground click cannot place the panel; a wall face click creates the body and children; undo removes their targets and redo restores them. The tall panel renders at a fitted base height of 1 m on a 2.5 m wall.
- Latest full package suite: 180 passing, one failure in the separate bath dimension/drawing test. The full suite is not green.

Full pointer-based resizing, component replacement and host movement remain in the final assembled editor audit. Remote pipe routing and hydraulic behavior are not proven by these visual models.

## Next: complete kits

Kits should create documented bundles of real components in one scene transaction, with correct wall parents and slot relationships. Record the actual included parts per preset. The research above includes a kit with a separate arm, head, handset, hose, slidebar and valve trim; do not substitute a column or panel for all kit types.
