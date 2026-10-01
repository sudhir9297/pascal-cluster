# Parametric shower catalog

Implemented on 2026-10-01.

The Shower catalog reduces 104 variant cards to 25 cards for component families and complete kit layouts. Select a placed item to change its shape, dimensions and options in the settings panel. Existing preset shapes remain available there, and saved scenes retain their node types, IDs, styles and attachment slots.

## Catalog grouping

| Catalog item | Settings available after placement |
| --- | --- |
| Shower arm | Round or square adjustable body, straight/angled/elbow outlet angle, curved or gooseneck shape, projection, tube size, drop/rise, bend radius, connector and flange |
| Overhead shower head | Round rain, square rain, soft square, rectangular, compact or bell shape; dimensions, tilt, swivel and nozzles |
| Hand shower mount | Wall holder, supply outlet or slide rail; round/square body, optional holder supply outlet, adjustment lever, cradle dimensions and tilt, rail length and slider position, rail supply, shelf and wall flange |
| Hand shower | Round, square, soft square, oval or wand shape; head and grip dimensions, head angle, insertion, connector, selector and nozzles |
| Concealed control | Single/dual/button layout, mixer/diverter/flow function, plate and handle shapes, dimensions and outlet count |
| Exposed mixer | Bar/bridge/single-lever layout, body and handle shapes, dimensions, optional bath spout and hose outlet |
| Wall spout | Round/square/curved/arched/tapered/waterfall shape, dimensions, flange, diverter and optional hose outlet |
| Bib tap | Spout shape and dimensions, handle style/angle and flange |
| Arm cover | Flat round, square, soft square, raised, stepped or bell shape; width, depth, corner radius and tube clearance |
| Shower head adapter | Coupling, extension, elbow, swivel, articulated or reducer; dimensions, angle, rotation and connection reference |
| Shower hose adapter | Coupling or elbow; dimensions, angle and connection reference |
| Concealed valve families | Pressure balancing, thermostatic, transfer, stop or installation box; body dimensions, ports, service stops and housing |
| Shower column | Profile, height, arm, holder, controls, optional jets, shelf and spout; separate attached head, handset and hose |
| Shower panel | Profile, dimensions, holder, controls, jets, shelf, spout and waterfall; separate attached head, handset and hose |
| Body jet | Flush/swivel/rectangle/dome shape, dimensions, aim, count, grouping direction and spacing, flange and nozzles |
| Shower hose | Smooth, ribbed metal or ribbon appearance; length, diameter, collars, ribs, drape and endpoints |
| Shower divider | Width, height, grid rows/columns, frame and glass dimensions |

Five valve family cards remain because placement checks their function against the selected control trim. The pressure-balancing valve with service stops shares the pressure-balancing card. Head and hose adapters retain separate cards because their attachment targets differ. Columns and panels retain separate defaults. Complete kits retain their four layout cards because each creates several independently editable scene nodes.

Searching a variant name finds its family card. Search does not change the placement variant. Adding another item in a family uses that family's current placement selection, or its first default when another family is selected. Parameter changes on a placed item do not become defaults for new items.

Changing a head's shape preserves its dimensions and nozzle settings. Compact and bell placement defaults remain available through saved styles and existing kit/assembly presets; width and bell height remain editable in the settings panel.

## Hand shower mount settings

The nine former mounting cards share one Hand shower mount card. Mounting type, body shape and water supply are independent choices in its inspector. Adjustment levers can be enabled on round or square holders, combined holders and rail cradles. Legacy `adjustable-holder` scenes retain their lever until the user changes it.

The original `hand-shower` and `hose` slots retain their IDs. A shape change keeps attached items. Changes that would remove an occupied slot are disabled; move or remove that item first. Switching to a rail carries the current supply setting into `railSupply`. Rail position, tilt and dimensions continue to move the handset's existing target, and the hose follows its connected fittings.

## Square spout bends

Square straight and angled spouts use a single continuous body. Their square profiles meet at a shared mitre, so the bend has no overlapping end caps or gaps between separate boxes. Short outlet drops remain valid when the tube is thicker than the drop. The outlet position and orientation retain the existing attachment coordinates.

Square pull-up diverters use the same corrected body. On angled spouts, the diverter sits on the flat section before the bend so its vertical stem and cap stay seated. Raising it extends the stem and moves the cap by 15 mm. Tests check the body for closed mesh edges and full width through the bend across the size limits. Section drawings use this geometry automatically.

## Section drawings

Every individual Shower component inspector now has Section A-A. Kit parts use their own component inspectors. Columns and panels draw their assembled head, handset and hose, using existing child nodes when available.

Shower drawings use the same local mesh builders as the scene. Plan shows projected mesh outlines in X/Z. A-A intersects each mesh with the fixture's X=0 plane and displays the cut in Z/Y. Faint projected outlines show parts away from the cut plane. Separate paths retain hollow openings without cancelling overlapping components. The cut marker follows the actual fixture axis, including asymmetric fittings.

Dimensions edit the existing node fields through the inspector's update callback. Primary sizes have drag and keyboard handles; other relevant numeric settings are in Section details. Changes use live previews, commit on release or blur, and cancel with Escape. Schema bounds supply the limits for the newly added component drawings. Angles and count settings retain degrees or unitless inputs. Wall fixtures include a mounting datum and a floor-context view. Hose length is an arc length, so it is a numeric detail rather than a vertical resize handle.

The drawings are schematic views of the visual models. They do not add hidden plumbing, manufacturer internals or plumbing compatibility simulation. A disconnected or too-short hose has an empty drawing and retains editable dimensions and its connection status. The section renderer disposes temporary mesh geometry and uncached materials, and keeps viewer-cached materials alive. Drawing calculations are memoized in the accordion.

## Verification

Focused tests cover family search, default selection, legacy mount normalization, independent square holder options, geometry-derived sections across every shower preset, rail/holder/shelf changes, schema-bounded edits and missing hose connections. Existing arm, head, handset and mount tests cover geometry and attachment behavior.

The connector geometry test now checks the appropriate head or hose target for each preset.

- TypeScript check passed.
- The shower audit passed 60 tests across 22 files, including connected hose sections and adjustable head/handset orientation.
- The full package run passed all 244 tests across 62 files. The general section audit also passes: touchless flush plates omit the inactive button-seam dimension, and walk-in bath sections include the seat backrest at its configured lean angle.
- In the running editor, the Shower catalog showed family cards, including one Hand shower mount card. An existing kit rail exposed the new type and shape controls, editable section dimensions and attachment guards. Switching square to round changed the section path, and switching back restored the square shape. A supply-only change was disabled while the handset remained attached. Editing the section projection from 0.060 m to 0.090 m changed the drawing depth from 0.105 m to 0.135 m; the original value was restored after verification.

The browser audit covered the catalog and an existing mounted rail. It did not repeat placement and interactive edits for every family; their preset geometry and attachment behavior were checked by the tests above.
