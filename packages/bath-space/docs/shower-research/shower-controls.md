# Shower mixers, diverters and visible controls

Researched and implemented 2026-10-01. These are generic visual models, not replicas or hydraulic/temperature simulations. Hidden valve bodies remain a separate checklist item.

## Browser research

Each component was searched in Google Images before implementation:

| Component | Query | Screenshot |
| --- | --- | --- |
| Mixer | concealed exposed shower mixer thermostatic bar round square | [Image results](mixer-google-images.png) |
| Diverter | shower diverter trim round square 2 way 3 way | [Image results](diverter-google-images.png) |
| Control trim | shower control trim push button lever cross handle plate | [Image results](control-trim-google-images.png) |
| Flow / stop control | shower volume control stop valve trim round square | [Image results](flow-control-google-images.png) |

Manufacturer references:

- [Hansgrohe ShowerSelect Comfort E](https://www.hansgrohe.com/articledetail-showerselect-comfort-e-thermostat-for-concealed-installation-for-2-functions-15572670?HGxH430=1): concealed push-button control and temperature knob. [Saved browser screenshot](control-hansgrohe.png).
- [Kohler transfer trims](https://www.kohler.com/en/products/showers/shop-transfer-shower-trims-valves?facets=Functionality%3ADiverter): round/square plates and varied handle forms. [Saved browser screenshot](diverter-kohler.png).
- [Kohler volume-control trims](https://www.kohler.com/en/products/showers/shop-shower-trims-valves?back=K-T10360-4-CP&facets=Functionality%3AVolume+Control): visible flow controls with lever, cross and industrial handles. [Saved browser screenshot](flow-control-kohler.png).
- [Kohler Parallel transfer trim specification](https://techcomm.kohler.com/techcomm/pdf/K-T23509-4_spec_US-CA_Kohler_en.pdf): two/three-outlet configuration and separate required valve. This reinforces separating visible trim from the hidden body; simultaneous-outlet behavior depends on the actual valve and is not inferred by this visual model.
- [GROHE product catalogue](https://cdn.cloud.grohe.com/Literature/Brochures/lt_LT/GROHE_projekti-toodete-valik_20211209_web/original/GROHE_projekti-toodete-valik_20211209_web.pdf): Grohtherm exposed bar shapes and inlet dimensions.

## Models and parameters

Twelve presets share `bath-space:shower-control`:

- Round and square single-lever mixer trims.
- Twin controls on round and rectangular thermostat plates.
- Push-button thermostat trim with one to three outlet buttons.
- Round and square exposed bar thermostats.
- Exposed two-handle mixer.
- Round and square diverter trims.
- Round volume control and square stop control.

[Rendered model screenshot](control-models.png), using neutral preview materials. Plate shape can be round, square, rectangular or softly rounded. Lever, cross and knob handles are configurable; knobs have round/square sections. Settings include plate dimensions, cover thickness, handle dimensions/projection/angles, control spacing, markings and mount height. Exposed models add body width/section, projection and inlet centres. Control spacing and knob diameter fit the plate; inlet centres fit the exposed body at smaller widths. The inspector names these fitted dimensions explicitly.

Outlet count and selected diverter outlet are persisted. Selecting a diverter outlet rotates its handle while keeping connection identities stable. This represents the visual control state only.

## Placement and attachment slots

Controls use the shared wall-only placement and plan-dragging tools on either wall face. They follow wall thickness/face changes, and cannot be placed by clicking the ground in 3D.

Concealed trim exposes one `valve-body` slot of type `shower_valve`. Exposed mixers expose one `riser` slot of type `shower_riser`. Water outlet targets use stable `outlet-1` through `outlet-3` IDs and type `shower_water`; remote pipe binding is pending the nonvisual connection work.

An optional integrated hose outlet exposes the same `hose` / `shower_hose` slot as a supply elbow. Existing hose placement, endpoint replacement and following work for this source too. Source projection, section size and wall position edits update the hose endpoint. Preset/setting changes that remove an occupied child slot are prevented. The hidden valve and column/riser consumers will be implemented later.

## Verification

Tests cover all 12 presets at dimensional limits, finite geometry, generated node identity, preset changes preserving identity, socket transforms, source hose connection/following, front/back wall mounting, floorplan generation, JSON persistence and diverter selection without slot changes. Current full Bath Space suite: 157 tests pass; TypeScript passes. Rendered models were inspected in the collaborative browser. The [editor Shower catalog](control-editor-catalog.png) and the twin-control placement tool load successfully after fixing client directive import order.

Full pointer placement, inspector resizing and assembled connection behavior remain in the active goal's editor audit. Concealed valve bodies, pipes, routing and temperature/flow simulation are not supplied by these visible controls.

## Parametric control consolidation

The catalog now groups the 18 legacy presets into two visual families: concealed controls and exposed mixers. Preset identifiers and saved node data remain compatible. The inspector offers single/twin/button concealed layouts and end-knob/twin-handle/single-lever exposed layouts, plus mixer/diverter/flow functions, plate/body profiles, lever/cross/knob styles and round/square knobs. Bath spouts are visual parameter choices instead of additional catalog models. Occupied connection and concealed-valve compatibility guards remain in place.

Geometry includes control collars and inset caps, textured cylindrical knobs, tapered round levers, rounded cross-handle ends, framed buttons, inlet collars and threaded hose outlets. All 18 variations were inspected in the standalone rendered gallery. Four focused control tests pass, including dimensional limits, slot identity, bath spout orientation and linked hose behavior.
