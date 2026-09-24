# Proposed pathway behavior

This records the intended behavior beyond the first implementation. The
current feature and its limits are documented in [README.md](./README.md).
These are project recommendations, not claims about another product.

## Drawing

Draw an editable centerline and give it a width. Show the full paving width
while drawing. Let the user switch between straight segments, circular arcs,
and smooth curves within a route. Start with straight segments and cubic
Bézier curves; add a dedicated radius-based arc mode after the basic workflow.

Click to place points. In curve mode, drag to set the tangent handles. Allow
corner and smooth points, moving points, inserting points, deleting points,
and numeric width changes. Preview the result before committing it. Escape
cancels the current unfinished operation. A completed draw, connection, or
drag should each be one undoable action.

| Shape               | How the user creates it                                          |
| ------------------- | ---------------------------------------------------------------- |
| Straight            | Place a start and end point                                      |
| Angular or L-shaped | Place several corner points                                      |
| Arc                 | Set endpoints and a bend or radius                               |
| Smooth or S-shaped  | Place curve points and adjust tangent handles                    |
| T junction          | End a branch on an existing path                                 |
| Y junction          | Join three branches at a common point, with independent tangents |
| Crossing            | Draw across an existing path at the same elevation               |
| Loop                | Snap the final point to the first point                          |

T and Y junctions should result from connections. Preset shapes can come later.
Smooth curve handles control the route; corner rounding controls the paving
boundary. These are separate settings.

## Automatic connections

Show a visible snap target before a connection happens. Use a screen-space
capture distance so zooming does not make targets hard to acquire. Keep the
geometry precision tolerance separate and expressed in scene units. Tune both
in the editor before settling on defaults.

| Situation                                         | Proposed result                                                                                 |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Endpoint approaches endpoint                      | Snap both to one shared junction                                                                |
| Endpoint approaches the middle of a path          | Project onto that path, split it there, and create a shared junction                            |
| New path crosses another at the same elevation    | Split both at the intersection and create a junction                                            |
| Three branches meet                               | Reuse one junction; do not stack duplicate junctions                                            |
| User moves an existing endpoint onto another path | Apply the same connection rules as drawing                                                      |
| Connected junction moves                          | Update every attached branch                                                                    |
| Paths cross at different elevations               | Keep them separate                                                                              |
| Paving edges touch but centerlines do not         | Highlight the contact; do not silently invent a centerline connection                           |
| Paths overlap along a length                      | Detect the overlap and avoid duplicate same-style paving; preserve source ownership for editing |

Allow temporarily disabling snapping and an explicit detach operation. Curves
must split without changing shape. A Y junction has three independent branch
tangents; it cannot use the same two-handle constraint as an ordinary smooth
point. Different materials may share a junction, but their visible boundary
needs a deterministic ownership rule before implementation.

## Saved data and generated geometry

Keep junctions and centerline segments as the editable source of truth. Store
stable IDs, endpoints, curve controls, width, material, and elevation. Generate
paving and meshes from that data. Do not infer connectivity from mesh overlap.

This separates two operations supported by established geometry tools: JTS
documents that line union introduces nodes at crossings and removes duplicate
linework, while polygon union merges covered areas. That is a useful model for
separating editable connections from visible paving. It does not select JTS as
our browser dependency. [JTS UnaryUnionOp](https://locationtech.github.io/jts/javadoc/org/locationtech/jts/operation/union/UnaryUnionOp.html)

Proposed generation sequence:

1. Resolve snapped endpoints and intersections; update the connection graph.
2. Sample curves to an explicit geometric error tolerance. Retain the original
   controls and curve parameters for editing and accurate splitting.
3. Expand each centerline by half its width to create a paving footprint.
4. Union compatible footprints at the same elevation. Preserve holes in loops.
5. Triangulate the result for plan and 3D rendering. Generate outer borders from
   the merged outline so borders do not run across junction interiors.

Clipper2 documents open-path offsets, configurable joins and ends, and cleanup
requirements. In particular, intersecting closed outlines should be unioned
before further offsetting; redundant short segments can cause artifacts. These
rules matter for paving outlines and subsequent border generation.
[ClipperOffset documentation](https://www.angusj.com/clipper2/Docs/Units/Clipper.Offset/Classes/ClipperOffset/_Body.htm)

A plain union removes overlaps but does not guarantee attractive fillets in
every acute Y junction. Junction rounding needs its own design and preview.
Evaluate a browser-compatible geometry library with representative fixtures
before choosing a dependency. No geometry dependency is selected yet.

## Build order and acceptance cases

1. Straight routes with width, plan/3D preview, selection, and undo.
2. Editable curves with predictable handles and shape-preserving splitting.
3. Endpoint joins, endpoint-to-middle joins, and T/Y/crossing junctions.
4. Merged paving, outer borders, width changes, and material boundaries.
5. Loops, overlap cleanup, detach, and robustness under repeated edits.

Verify straight-to-straight, curved-to-straight, and curved-to-curved joins;
unequal widths; acute Y branches; nearby but separate paths; elevated crossings;
and loop holes. Check tight bends where width exceeds the inside bend radius,
zero-length segments, duplicate points, and nearly coincident intersections.
Moving or deleting a branch must leave the remaining network valid. Undo and
redo must restore both the connections and the generated paving. Reloading a
saved scene must preserve IDs, curves, widths, and junctions.

The first implementation should use a flat plane. Terrain-following paths,
steps, and ramps require a separate elevation design. Widths here are editing
parameters, not accessibility or construction compliance claims.
