# Pathway and walkway drawing research

Researched 2026-09-23. Scope: pedestrian garden paths and walkways, including straight and curved segments, branches, and connections between separately drawn paths. This document records product precedents and proposed behavior; it does not claim that the feature is implemented.

## What existing tools document

| Tool                                | Documented drawing behavior                                                                                                                                                                                                                                                                                                                                                                                                                 | Implication for this project                                                                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vectorworks Landmark 2026 Hardscape | Draw a polyline and create the pathway centered on it, or aligned to its left or right edge. Width is a pathway parameter. Click successive vertices and double-click to finish. Existing arcs and polylines can be converted to hardscapes. [Official documentation](https://app-help.vectorworks.net/2026/eng/VW2026_Guide/SiteModel2/Creating_hardscapes.htm)                                                                            | Make the editable route and width the main controls. Center alignment is a sensible default; edge alignment helps trace a building or planting bed.               |
| Vectorworks 2026 Polyline           | A single polyline can mix straight segments, Bézier vertices, curves through control points, tangent arcs, three-point arcs, and radius-based fillets. Users can change modes during drawing and reshape afterward. [Official documentation](https://app-help.vectorworks.net/2026/eng/VW2026_Guide/Shapes1/Creating_polylines.htm)                                                                                                         | Straight and curved drawing should share one tool and editable model. Offer explicit corner and smooth-point choices.                                             |
| Realtime Landscaping Sidewalk       | Set width, then click points. Backspace removes the last point, Escape cancels, and Enter opens distance/angle input. Right-click finishes. The sidewalk initially lies to the left of the drawn line, with a switch-sides command. Edit Points changes its shape afterward. Materials, dimensions, curbing, and expansion joints are configurable. [Official documentation](https://ideaspectrum.com/help/realtime/adding-a-sidewalk.html) | Show the full-width preview while drawing. Keep point editing available after completion. Treat material and border controls separately from route geometry.      |
| SketchUp Arc                        | Two-point arcs use start, end, then bulge. Three-point arcs use start, an intermediate point, then end. Tangent inference helps an arc continue the direction of an existing edge. Radius and segmentation can be edited. [Official documentation](https://help.sketchup.com/en/sketchup/drawing-arcs)                                                                                                                                      | A three-point or bulge-based curve mode offers understandable curvature control. Tangent alignment supports smooth transitions between straight and curved parts. |
| SketchUp edge editing               | Crossing lines or arcs on a face split existing geometry. Weld Edges combines selected adjoining edges into a Curve entity. These are separate operations. [Official documentation](https://help.sketchup.com/en/sketchup/dividing-splitting-and-exploding-lines-and-faces)                                                                                                                                                                 | Detecting a meeting point and merging the visible walkway are distinct steps. Preserve the route network even when the surface looks continuous.                  |
| ArcGIS Pro snapping                 | Endpoint, vertex, edge, and intersection snap modes can be configured separately. [Official API documentation](https://pro.arcgis.com/en/pro-app/latest/sdk/api-reference/topic29535.html)                                                                                                                                                                                                                                                  | Connections need more than endpoint snapping: a branch must also attach partway along an existing route.                                                          |

These sources establish drawing, curve editing, splitting, and snapping precedents. They do not establish that Vectorworks or Realtime Landscaping automatically generates arbitrary T/Y walkway networks when independently drawn paths touch. The connection behavior below is our proposed design, based on the user's requirement.

## Implications

Use an editable route with width and a full-width preview. Let straight, arc, and smooth segments coexist, and make endpoint and route-interior snap targets visible before a connection is committed. Apply connections while drawing and while moving existing endpoints. The authoritative proposed behavior, connection model, and implementation sequence are in [design.md](./design.md).
# Paving finishes and corner treatments (September 2026)

Manufacturer pattern guides show running bond, herringbone, basket weave,
ashlar, and modular slab layouts as common paving choices. Running bond is
particularly apt for curved walkways because small rectangular units can follow
the curve; borders can distinguish the route. The first model set therefore
provides smooth concrete, running-bond brick, large stone slabs, and gravel.
Brick and slab joints are clipped to the paved outline in plan and drawn with
repeatable procedural textures in 3D. A square/mitered footprint option addresses
formal angular routes, while the original rounded treatment remains for soft
garden paths. These are visual design representations, not construction-ready
laying diagrams or drainage specifications.

Sources: [Belgard paver pattern guide](https://www.belgard.com/paver-pattern-guide/),
[Unilock walkway pavers](https://unilock.com/walkway-pavers/),
[Unilock curved walkway example](https://unilock.com/project/winding-walkway/),
[Unilock hatch patterns](https://commercial.unilock.com/resources/hatch-patterns/),
[RHS gravel garden guidance](https://www.rhs.org.uk/plants/for-places/gravel-gardens/).
