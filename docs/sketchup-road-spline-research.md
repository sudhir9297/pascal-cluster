# SketchUp road-spline and elevation editing research

Research date: 2026-08-04

This note examines current, officially documented SketchUp behavior that is relevant to editing a road centerline in plan and elevation. Sources are limited to SketchUp Help, SketchUp Developer documentation, and author-maintained listings in SketchUp's official Extension Warehouse.

## Executive answer

SketchUp's useful precedent is not a single native "road spline" tool. It is a combination of:

- native segmented curves and arcs;
- the native Move tool plus SketchUp's inference and axis-lock system;
- native Sandbox operations for projecting geometry onto terrain, creating a blended pad, and sculpting terrain;
- optional Bézier/spline extensions.

Current official SketchUp documentation does **not** describe a native Bézier, B-spline, or NURBS drawing tool in the SketchUp 3D modeler. It documents Freehand curves and four Arc tools as native drawing tools, while the Bézier Curve Tool is a separately installed extension published by the SketchUp Team. SketchUp's own developer documentation also states that its model has no truly curved geometry: curves are sequences of straight edges that approximate a curve. [Drawing Freehand Shapes](https://help.sketchup.com/en/sketchup/drawing-freehand-shapes), [Drawing Arcs](https://help.sketchup.com/en/sketchup/drawing-arcs), [SketchUp Developer: Entity Overview](https://developer.sketchup.com/article-entity-overview), [Bezier Curve Tool](https://extensions.sketchup.com/extension/8b58920d-0923-42f8-9c72-e09f2bba125e/bezier-curve-tool)

The main interaction worth copying is SketchUp's 3D constraint model: select a point, drag it freely, or lock movement to an axis/inferred direction; show the constraint with a colored line; accept an exact distance or coordinate; and allow a terrain operation to project or blend the result. For our editor, that means keeping the green control dot for obvious direct manipulation, then exposing a distinct vertical constraint and terrain modes rather than trying to infer every 3D drag from the camera.

## What is native and what is not

| Capability | Status in SketchUp | Verified behavior | Product lesson |
| --- | --- | --- | --- |
| Freehand curve | Native | A stroke becomes one curve entity made from multiple line segments. Segment point/edge inferences remain available. Its endpoint can be moved to change length if it does not bound a face. A drawing plane can be selected with the arrow keys. | Treat a road as one editable object while retaining meaningful points; avoid showing every sampled render vertex as a permanent handle. |
| Arc, 2 Point Arc, 3 Point Arc, Pie | Native | Arcs are segmented entities. A 2 Point Arc is defined by endpoints and a bulge; a 3 Point Arc uses start, pivot, and end. The midpoint and endpoints can be dragged with Move. Radius and segment count can be edited numerically. | Give semantic handles distinct jobs: endpoint for length, on-curve point for shape, and numeric values for precision. |
| Move and inference locks | Native | Shift locks the active inference. Up locks Blue, Left locks Green, Right locks Red, and Down locks a parallel/perpendicular inferred direction. Moves accept exact signed distances and global or relative 3D coordinates. | Add explicit horizontal, vertical, and reference-direction constraints, visible while dragging. |
| Bézier Curve Tool | **Extension**, published by SketchUp Team | The official listing documents a four-click cubic Bézier workflow: start, end, first curvature adjustment, second curvature adjustment. It creates smooth shapes not limited to a circular arc. | Bézier tangent controls are useful as an advanced mode, but are not evidence of a native SketchUp spline editor or a terrain-road workflow. |
| FredoSpline | **Third-party extension**, Fredo6 | Its listing documents Bézier, fit-spline, Polycorner, and Polyline families. Curves can be created and later edited by adjusting control points. A fit spline passes through its control points; a Bézier does not. | Keep our current on-road control points as the simple default; consider separate tangent handles only as an advanced curve model. |
| Drape | Native Sandbox tool | Transfers selected edges from above onto the curved surface of a TIN terrain mesh. | Provide a `Conform to terrain` operation that projects/resamples a road profile onto the terrain. |
| Stamp | Native Sandbox tool | Creates a flat pad matching an object's bottom, blends it into surrounding terrain using an offset, and lets the user move the pad up/down before committing. | Provide a `Grade terrain to road` operation with a road corridor and adjustable shoulder/falloff, separate from conforming the road to terrain. |
| Smoove | Native Sandbox tool | Raises or lowers TIN vertices within an adjustable radius; exact signed values can be entered. | A local elevation brush can be useful, but it should be a terrain tool, not hidden inside spline-point dragging. |
| Add Detail | Native Sandbox tool | Adds a vertex and moves it up/down with precise input; Shift changes the movement behavior to horizontal. | A selected road point can expose an explicit elevation drag and exact value instead of only a camera-plane drag. |

Sources: [Drawing Freehand Shapes](https://help.sketchup.com/en/sketchup/drawing-freehand-shapes), [Drawing Arcs](https://help.sketchup.com/en/sketchup/drawing-arcs), [Moving Entities Around](https://help.sketchup.com/en/sketchup/moving-entities-around), [Introducing Drawing Basics and Concepts](https://help.sketchup.com/en/sketchup/introducing-drawing-basics-and-concepts), [Bezier Curve Tool](https://extensions.sketchup.com/extension/8b58920d-0923-42f8-9c72-e09f2bba125e/bezier-curve-tool), [FredoSpline](https://extensions.sketchup.com/extension/d4d62410-cea7-4fdf-9503-dee7a0aea2e9/fredo-spline), [Placing Models and Objects on Terrain](https://help.sketchup.com/en/sketchup/placing-models-and-objects-your-terrain), [Sculpting and Fine Tuning Terrain](https://help.sketchup.com/en/sketchup/sculpting-and-fine-tuning-terrain)

### Do not confuse SketchUp with LayOut

SketchUp's companion application, LayOut, has a 2D path editor with visible points and Bézier curvature controls. It supports dragging a point or segment, adding a point with Alt/Cmd-click, deleting points, moving multiple points, constraining movement, and numeric coordinate entry. Those are good interaction references, but LayOut is a page/vector-layout application, not the SketchUp 3D modeling viewport, and its controls are not proof of a native 3D spline tool. [LayOut: Bending Lines and Shapes with Paths and Points](https://help.sketchup.com/en/layout/bending-lines-and-shapes-paths-and-points)

## How SketchUp makes 3D movement understandable

SketchUp's approach combines four signals instead of relying on an unconstrained screen-space drag:

1. **A reference point.** The user clicks a specific point on the geometry before moving it.
2. **Inference feedback.** The move line and tooltip communicate an axis or a relationship to nearby geometry.
3. **A lock.** Shift freezes the current inference; arrow keys directly select Red, Green, Blue, or an inferred parallel/perpendicular direction.
4. **Numeric override.** The Measurements box accepts a positive or negative distance, or an exact global/relative 3D coordinate.

This is why upward/downward placement is reliable even in a perspective view: the motion is constrained to the vertical Blue axis rather than interpreted from an arbitrary pointer ray. SketchUp for iPad reinforces the same idea with visible one-shot X, Y, and Z inference-lock modes for Freehand, which is a useful precedent for users who do not know keyboard shortcuts. [Moving Entities Around](https://help.sketchup.com/en/sketchup/moving-entities-around), [Introducing Drawing Basics and Concepts](https://help.sketchup.com/en/sketchup/introducing-drawing-basics-and-concepts), [SketchUp for iPad: Freehand Tool](https://help.sketchup.com/en/sketchup-ipad/freehand-tool)

## How the terrain workflows differ

The three native Sandbox behaviors solve different problems and should remain distinct in our UI:

### Drape: road follows existing terrain

Drape transfers edges positioned above a terrain TIN onto that curved surface. Applied to a road editor, the closest behavior is `Conform to terrain`: project the alignment vertically onto the terrain and apply a clearance offset. This is suitable for a quick path, trail, curb marking, or rough road that is allowed to inherit terrain undulation. [Placing Models and Objects on Terrain](https://help.sketchup.com/en/sketchup/placing-models-and-objects-your-terrain)

### Stamp: terrain follows designed road

Stamp creates a flat pad at a chosen elevation and transitions it into the surrounding terrain over an offset distance. A road equivalent should preserve the authored centerline/profile, calculate the road cross-section, and blend the terrain out from the road edge. It should not flatten the entire road to one elevation; the "pad" should advance along the road's designed vertical profile. [Placing Models and Objects on Terrain](https://help.sketchup.com/en/sketchup/placing-models-and-objects-your-terrain)

### Smoove: local terrain sculpting

Smoove raises or lowers a selected region of the terrain with an adjustable radius and signed numeric amount. This suggests a separate terrain-sculpt brush for cleaning local humps, depressions, or transition zones. It should not silently rewrite a road spline's authored points. [Sculpting and Fine Tuning Terrain](https://help.sketchup.com/en/sketchup/sculpting-and-fine-tuning-terrain)

## Current editor: what already supports 3D and what blocks it

The road data and renderer are closer to supporting elevation editing than the current controls imply:

- `RoadGraphNode.position` and every `RoadGraphEdge.alignment` entry are already 3D tuples.
- `sampleRoadAlignmentPoints` already evaluates a centripetal Catmull-Rom curve in 3D through the authored points.
- Road rendering already consumes the sampled point elevation.
- The current handle controller deliberately fixes a horizontal drag plane at the point's elevation and writes the original Y value.
- `moveRoadSplinePoint` also deliberately restores `originalPoint[1]`, so elevation is discarded even if a caller supplies it.
- Spline handles are currently created only for `edge.alignment` points; endpoint elevation belongs to `graphNodes`, so endpoint elevation requires a graph-node edit path as well.

Relevant source: `src/schema.ts`, `src/road-network-geometry.ts`, `src/road-network-spline-controls.tsx`, and `src/road-network-spline-handles.ts`.

The immediate blocker is therefore interaction/update logic, not the basic coordinate schema or Catmull-Rom sampler.

## Recommended spline improvements

### Priority 0: make each point genuinely 3D-editable

1. Keep the **green circular dot** as the primary, high-contrast point handle.
2. A normal drag of the green dot continues to reshape the road in the horizontal XZ plane.
3. When a point is active, reveal a **Blue vertical rail** through it with a small upper/lower circular grip. Dragging that grip changes only Y. Blue follows SketchUp's established vertical-axis convention; the green dot remains the selection target, not an axis-color claim.
4. Support `Up Arrow` while dragging the green dot to switch/lock to vertical movement. `Shift` locks the currently inferred direction.
5. Show a live label such as `Elevation 3.40 m  (Δ +0.65 m)` and accept a typed signed delta or absolute elevation.
6. Make one pointer drag one undoable history operation. Escape cancels and restores the starting profile.
7. Add equivalent endpoint controls. Moving an endpoint vertically must update the shared graph node and every incident road consistently, not only one edge's private alignment array.

This delivers the user's requested up/down editing without requiring a new curve representation.

### Priority 1: add SketchUp-style constraints and feedback

1. Show a colored constraint line during a drag:
   - Blue: vertical/Y;
   - Red: world X;
   - Green: world Z in our Three.js coordinate system.
2. Keyboard locks:
   - Up: vertical/Y;
   - Right: X;
   - Left: Z;
   - Down: parallel/perpendicular to a hovered road edge or terrain feature;
   - Shift: freeze the currently highlighted constraint.
3. Offer visible X/Z/Y lock buttons near the active handle for discoverability and touch input, following the official SketchUp for iPad precedent.
4. Snap to useful elevations: terrain under cursor, neighboring road endpoint, level datum, and user-configured vertical increment.
5. Display the snap target and value before commit. Never change elevation merely because the cursor crossed a surface that was not visibly acquired.

### Priority 2: add two explicit terrain commands

#### `Conform road to terrain`

- Raycast/project along the world vertical direction, not the camera ray.
- Sample the terrain along station values of the rendered alignment rather than projecting only the sparse authored control points.
- Apply a configurable vertical offset such as `0.00 m`, `+curb`, or bridge clearance.
- Provide `Live linked` and `Bake profile` choices so later terrain edits have predictable ownership.
- Smooth/filter tiny terrain triangles, or the road will inherit visually noisy grades.

#### `Grade terrain to road`

- Treat the designed road profile as authoritative.
- Modify terrain under the full road width, then blend to existing terrain over a configurable left/right falloff.
- Preview cut and fill before commit.
- Preserve bridges and tunnels by default; those modes should not stamp the terrain unless explicitly requested.

These are the road-specific equivalents of SketchUp Drape and Stamp. Combining them into one automatic "place on surface" switch would obscure which geometry is authoritative.

### Priority 3: improve control-point editing

1. Add a point by double-clicking or Alt/Cmd-clicking the centerline at the picked curve parameter.
2. Delete selected interior points; protect topology endpoints unless the user chooses a network operation.
3. Drag a segment to move a local span, and Shift-select multiple points for batch elevation/plan movement.
4. Add numeric position editing (`X`, `Y/elevation`, `Z`) and relative deltas.
5. Add `Flatten selected`, `Set constant grade`, `Match terrain`, and `Distribute elevations` commands.
6. Keep only authored points visible in edit mode. Do not expose Catmull-Rom render samples as handles; SketchUp likewise treats a segmented curve as one entity while retaining inferable segments.

The add/delete/multi-point patterns are directly analogous to LayOut's path editor, while the 3D constraints must come from SketchUp's Move/inference model. [LayOut: Bending Lines and Shapes with Paths and Points](https://help.sketchup.com/en/layout/bending-lines-and-shapes-paths-and-points), [Moving Entities Around](https://help.sketchup.com/en/sketchup/moving-entities-around)

### Priority 4: provide an advanced horizontal-curve mode

The current Catmull-Rom implementation is a **fit spline**: it passes through every authored green dot. That is appropriate for the simple road workflow and matches the vocabulary in the FredoSpline listing. A cubic Bézier instead normally passes through its endpoints while interior controls govern tangency. [FredoSpline](https://extensions.sketchup.com/extension/d4d62410-cea7-4fdf-9503-dee7a0aea2e9/fredo-spline), [Bezier Curve Tool](https://extensions.sketchup.com/extension/8b58920d-0923-42f8-9c72-e09f2bba125e/bezier-curve-tool)

Do not replace the green on-road points with Bézier controls by default. If added, make it an advanced segment mode with:

- paired tangent handles;
- joined/mirrored/broken tangent continuity;
- numeric tangent length and curve radius where meaningful;
- a clear visual distinction between an on-road interpolation point and an off-road tangent control;
- conversion between fit-spline and Bézier only when the approximation/error is acceptable.

### Priority 5: introduce a true vertical road profile

Allowing Y on each 3D control point is the right first release, but a production road eventually needs horizontal alignment and vertical profile to be separate:

- horizontal alignment: plan control points, tangents, arcs/splines;
- vertical profile: station/elevation points, grade tangents, and vertical curves;
- generated 3D centerline: horizontal position evaluated at station plus profile elevation;
- optional terrain-derived profile as a generated/linked input.

This prevents an elevation edit from unexpectedly changing plan curvature, supports constant-grade sections, and enables grade validation. It also makes terrain conforming reversible rather than destructively overwriting sparse 3D spline points.

## Required safeguards for elevated roads

These safeguards are our engineering recommendations, inferred from the 3D and terrain workflows above:

- warn when grade exceeds a configurable limit;
- detect abrupt grade breaks and offer a vertical curve/smoothing operation;
- keep junction elevations shared and validate grade transitions on every incident edge;
- do not connect roads merely because their plan projections cross—include elevation/stack-level compatibility;
- prevent a terrain snap from pulling bridge/tunnel control points to ground;
- retain the pre-conform authored profile so `Undo` and `Detach from terrain` are reliable;
- sample terrain/profile densely enough for visual accuracy, but keep authored handles sparse and stable;
- show occluded control dots with depth-independent rendering, while still using a visible stem/drop line to communicate their actual 3D position.

## Suggested interaction sequence

1. Select a spline road and choose `Edit spline`.
2. Authored green dots appear; hovered/selected dots enlarge and show a tooltip.
3. Drag a green dot for horizontal reshaping.
4. Click a dot to reveal axis locks and the Blue elevation rail.
5. Drag the Blue grip, or press Up while dragging, to raise/lower it. A live elevation/grade label appears.
6. Optionally click `Snap to terrain` for that point or `Conform road to terrain` for the whole road.
7. If the road design should control the land, use the separate `Grade terrain to road` command and preview the falloff.
8. Enter/Escape commits/cancels; the whole drag is one undo step.

This preserves the simple green-dot interaction already requested, while adding the explicit constraint, numeric precision, and terrain semantics that make SketchUp's 3D workflows dependable.

## Sources

- [SketchUp Help — Introducing Drawing Basics and Concepts](https://help.sketchup.com/en/sketchup/introducing-drawing-basics-and-concepts)
- [SketchUp Help — Moving Entities Around](https://help.sketchup.com/en/sketchup/moving-entities-around)
- [SketchUp Help — Drawing Arcs](https://help.sketchup.com/en/sketchup/drawing-arcs)
- [SketchUp Help — Drawing Freehand Shapes](https://help.sketchup.com/en/sketchup/drawing-freehand-shapes)
- [SketchUp for iPad — Freehand Tool](https://help.sketchup.com/en/sketchup-ipad/freehand-tool)
- [SketchUp Help — Placing Models and Objects on Terrain](https://help.sketchup.com/en/sketchup/placing-models-and-objects-your-terrain)
- [SketchUp Help — Sculpting and Fine Tuning Terrain](https://help.sketchup.com/en/sketchup/sculpting-and-fine-tuning-terrain)
- [SketchUp Help — Creating 3D Terrain](https://help.sketchup.com/en/sketchup/creating-terrain-scratch)
- [SketchUp Developer — Entity Overview](https://developer.sketchup.com/article-entity-overview)
- [SketchUp Extension Warehouse — Bezier Curve Tool, SketchUp Team](https://extensions.sketchup.com/extension/8b58920d-0923-42f8-9c72-e09f2bba125e/bezier-curve-tool)
- [SketchUp Extension Warehouse — FredoSpline, Fredo6](https://extensions.sketchup.com/extension/d4d62410-cea7-4fdf-9503-dee7a0aea2e9/fredo-spline)
- [SketchUp LayOut Help — Bending Lines and Shapes with Paths and Points](https://help.sketchup.com/en/layout/bending-lines-and-shapes-paths-and-points)
