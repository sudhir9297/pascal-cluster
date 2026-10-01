# Framed shower dividers

The first divider is a fixed, floor-standing glass partition. Draw its centre line with two clicks and continue clicking to add connected segments. Press Enter to finish a chain, R to switch to a rectangle, and Escape to cancel the current draft or exit when no draft is active. Hold Alt to bypass snapping. Each segment remains independently selectable and editable.

## Construction references

- [Hietakari Vetro 501](https://www.hietakari.com/en/shower_screen?frame=P0501) describes a fixed glass sheet enclosed by mounting profiles, with wall, floor and ceiling attachments.
- [Gridscape GS2](https://divided.style/collections/shower-screens/products/gridscape-gs2-shower-screen-in-black-with-clear-glass) uses an aluminum alloy frame and fixed glass panel, attached to one wall and the base, with an open walk-in entry.
- [Aston Matthews grid panel specification](https://www.astonmatthews.co.uk/content/TIS-3-Grid-fixed-panel.pdf) describes a powder-coated aluminum grid on the outside of 8 mm toughened glass.

These manufacturer references informed the outer frame, continuous glass sheet and grid bars. The procedural model uses rectangular frame profiles and bars over one continuous glass infill. Frame and glass have separate paint slots. Frames start white to follow the Bath Space paint workflow.

## Model and drawing

One catalog entry starts a plain framed glass divider. Rows and columns are inspector settings, rather than separate catalog designs. Drawn length determines overall width. The inspector controls length, height, rows, columns, outer frame width, frame depth, grid bar width and glass thickness. Dense layouts automatically narrow frame and bars to retain positive openings.

The shared drawing session runs once across 2D and 3D, including split view. It uses the editor's wall draft snap helper for grid, angle and magnetic snaps, and includes existing divider endpoints as snap candidates. Each line click creates one scene-history transaction. A rectangle creates four segments atomically. Drawing follows the wall continuation setting and uses the shared consume-or-exit cancellation path. Preview segments contain only poses, without scene IDs or generated geometry. The 3D preview reuses four unit boxes and changes their transforms; the placed model merges every frame bar into one mesh alongside the glass mesh. Alignment references refresh when scene nodes change, rather than scanning and parsing nodes on every pointer move. A cancelled preview creates no scene nodes. Lengths outside 0.2–8 m cannot be committed.

This is a layout model. Hinged or sliding doors, seals, support arms, detailed channels and fixings, unequal panel proportions, and fabrication constraints are not implemented. It does not split or alter architectural walls and does not create rooms. Connected segments have independent end profiles rather than welded or mitred corner joints.
