## Initial scope

- Procedural freestanding and wall-mounted vanities share storage, fronts, and paint controls.
- Corner vanity starter: equal wall returns, perpendicular rear panels, angled front, recessed plinth, one or two animated doors, shelves, and an optional countertop. Its dedicated inspector exposes the supported shape and storage controls. Placement and dragging snap into joined right-angle wall corners in Grid or Lines mode, with a matching five-sided 2D footprint. All parts start white and support the paint tool; basins remain separate.
- Keep basins as separate scene objects during this first pass; do not include a basin in the vanity geometry.
- Add integrated-basin vanity designs and their configurations later.
- Defer basin-to-counter cutouts (CSG) until the vanity models are established.

## Reference project

`/Users/sudhir/Desktop/create/Configurator/bathroom-config`

## Vanity implementation

- Four starting designs: Modern, Shaker, Fluted, and Open Console.
- Parametric storage layout, drawer and door configuration, fronts, hardware, legs/plinth, shelves, and countertop/backsplash.
- Custom layouts with up to three sections, independently configured as drawers, doors, or open shelves; adjustable width and drawer-height proportions.
- Click individual drawers/doors to animate them; E opens or closes everything. Part states persist in the scene and are excluded from geometry rebuild keys.
- Freestanding placement and 3D/2D dragging use magnetic wall snapping in Grid or Lines mode. Nearby straight walls align the cabinet back and yaw; leaving the capture radius restores free placement. The cabinet remains a floor-standing child of the level.
- Wall-mounted placement snaps to either face of a straight wall and parents the cabinet to that wall. Pointer height sets its elevation in 3D; dragging follows both wall-local axes, preserves the grab offset, and keeps the cabinet size unchanged. Plan-view dragging preserves elevation. Both views can transfer to another nearby wall. Resizing preserves attachment; R flips the wall face. Geometry omits the floor base and retains adjustable floor clearance.
- Rectangular drawer boxes, slide rails, hinged door geometry, and solid back panels; opening controls reveal the interiors.
- White default appearance and softened edges; no GLB assets. Apply finishes through the editor paint tool, using independent slots for each component group. No material controls in the inspector.
- Presets work during placement and on selected cabinets. Width, depth, and height retain the editor's standard blue-purple handles. Freestanding vanities support rotation; wall-mounted vanities use a wall-bound move handle.
- Model tests cover old-node defaults, presets, 144 extreme-size configurations, opening behavior, countertop removal, and geometry cache keys.
