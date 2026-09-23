# Pathways and walkways

This folder owns the pedestrian pathway tool: drawing, curves, branches,
automatic connections, editing, paving geometry, and feature-specific tests.
The first implementation is registered as `landscape:pathway` in the Landscape panel.

- [Research](./research.md) compares documented drawing workflows with sources.
- [Behavior and implementation plan](./design.md) records the proposed behavior.

`domain/` owns saved junctions, cubic curves, splitting, snapping, and network edits.
`editor/` owns drawing, transient session state, and controls. `rendering/` owns
the unioned paving footprint, plan drawing, 3D mesh, and preview. Tests live beside
the domain code. `definition.ts` connects the feature to the host registry.

Scope includes straight paths, angular paths, arcs, smooth curves, T and Y
branches, crossings, loops, and joining separately drawn paths. Vehicle road
design is outside this feature's current scope. The mention of "doorway" is
interpreted as a walkway approaching an entrance; door modeling is not planned.

## Drawing

1. Select a building level, open Landscape → Pathways & walkways, and choose
   Straight / polyline or Smooth curve. The catalog only chooses the drawing
   gesture; click the canvas to start.
2. In straight mode, each click after the start immediately saves a leg and
   continues from its endpoint. In smooth-curve mode, click as many spline
   points as needed; press Enter, double-click, or use Finish path to save.
   Press C to switch modes. The curve uses the same centripetal Catmull–Rom
   interpolation as Streetscape's spline street tool.
3. End on an existing path to make a branch. Same-level crossings split both
   paths automatically. The tool follows the editor's grid, angle, and alignment
   snapping modes; hold Alt to bypass snapping. L enters an exact length and A
   an exact bearing. Backspace removes the last uncommitted spline point. Press
   Escape to stop drawing.
4. Select the finished paving to open its floating walkway inspector. There you
   can change finish, corner treatment, color, thickness, elevation, junction
   coordinates, and segment width, or remove a segment. Select the paving in
   plan view to see junction labels. In plan and 3D views, drag an arrow at an
   open end to lengthen or shorten that leg along its outgoing tangent. Drag a
   junction grip to reshape an end, L bend, or T branch freely in the plane;
   every attached leg follows. Branch junctions have no length arrow.

Disconnected drawings are separate scene items: selecting or deleting one does
not affect the others. A stroke joining two existing items merges them into one
connected item. Older saved pathway nodes containing disconnected components
are split when the pathway panel opens. Removing a bridge segment splits the
remaining components into separate items again.

Each straight leg and each completed spline updates one node in one history
operation. The graph stores
stable junction and edge IDs with Bézier controls; geometry is derived. Round
caps and joins use polygon union through `polygon-clipping`. Plan and 3D share
the same outline, including loop holes. The node has no additional position or
rotation transform; its points are in its parent level's XZ coordinates.

The floating inspector offers smooth concrete, running-bond brick, square-cut stone slabs,
and gravel. Brick and stone show joints in 2D and procedural surface
textures in 3D. Square/mitered corners use flush ends and a sharp outside turn
by default. Rounded corners remain an explicit option for softer paths. Saved
paths without a corner setting now resolve to square corners.

## Current limits

- One network per connected item, with one elevation and paving color. Segment
  widths are independent. Level-separated networks never connect to each other.
- Curves use multi-point spline interpolation. Dedicated arcs, tangent dragging,
  mixed straight/curve gestures, and terrain following are not implemented.
- Junctions can be moved on canvas or through numeric controls. Screen-space
  snap distance for reshaping remains follow-up work.
- Rounded outer joins are supported; custom junction fillet radii and border
  materials are not implemented. Paving footprints merge wherever they overlap,
  but centerlines acquire shared nodes only where they meet.
- Crossing detection uses adaptively sampled curves and refines detected hits
  on the original Bézier segments. Near-tangent interior contacts and coincident
  curved overlaps need further coverage before expanding editing tools.

Run `bun test src/pathways` for connection, geometry, serialization, and host
undo/redo checks; run `bun run check-types` for integration types.
