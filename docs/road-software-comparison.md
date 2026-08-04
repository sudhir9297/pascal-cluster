# Road authoring software comparison

Research date: 2026-08-03

This report compares the current road-network plugin with official workflows documented for Revit, SketchUp, Civil 3D, InfraWorks, RoadRunner, CityEngine, Vectorworks Landmark, Rhino, Unreal Engine, and Bentley OpenRoads Designer. Product behavior is taken from first-party documentation. Statements about our plugin are based on the current source in `src/road-network-*`.

## Executive finding

We should **not copy Revit or SketchUp literally**.

- Current Revit represents a road primarily as a closed subdivision of a terrain surface. It is useful for BIM sketch precision, types, properties, and terrain coordination, but it is not a connected semantic road network.
- SketchUp represents roads with generic edges, arcs, faces, offsets, and terrain projection. It is excellent at inference snapping, typed dimensions, and direct manipulation, but intersections are mostly manual geometry cleanup.
- Our plugin is already ahead of both in one important respect: roads are semantic centerline graphs. Connected roads merge into one network, crossings split edges, T and + junctions are derived automatically, and disconnected networks select independently.
- InfraWorks is the closest reference for the **simple drawing experience** we want: click points of intersection, preview tangents and curves, create curves automatically, edit radius/length in the canvas, and create intersections automatically.
- Civil 3D and OpenRoads show the right **long-term road model**: horizontal alignment, vertical profile, station-based cross-section, generated corridor, and a separately editable junction object.
- RoadRunner and CityEngine provide the clearest precedents for **topology and cleanup**: automatic T/+ creation, explicit suppression of unwanted joins, graph cleanup, elevation tolerances, and visible conflicts.

The recommended product is therefore a hybrid:

> SketchUp/Revit interaction precision + InfraWorks drawing + RoadRunner/CityEngine topology + Civil 3D/OpenRoads road data.

## How the products work

| Product | Persistent road representation | Drawing experience | Junction behavior | Terrain and vertical design | Main lesson for us |
| --- | --- | --- | --- | --- | --- |
| Revit, current | Closed Toposolid subdivision | Sketch or pick a closed loop; lines, arcs, fillets, offsets, constraints, and typed dimensions | No documented native semantic centerline junction solver | Subdivision follows the host terrain; points and offsets edit elevation | Copy sketch precision, constraints, properties, and undo—not the boundary-only road model |
| Revit Site Designer, historical | Host centerline plus family-driven road section | Draw a model/detail line, convert it into a street | Detects exact connected centerlines, requests a connection radius, regenerates streets and terrain | Road normally follows/regrades terrain | Relevant precedent, but regeneration could overwrite local edits |
| SketchUp | Generic edges, segmented arcs, faces, groups, and solids | Draw connected geometry, use inference locks and typed measurements, then Offset | Intersect Faces/Solid Tools followed by manual trimming and erasing | Drape onto a terrain mesh or Stamp a blended flat pad | Copy inference and direct manipulation; do not copy manual topology |
| Civil 3D | Horizontal alignment + profile + assembly + corridor + intersection | Lay out tangents/PIs; create or insert curves and spirals; grip or numerically edit constrained entities | Wizard creates offsets, curb returns, profiles, targets, and corridor regions; through road becomes primary at a T | Full profiles, surfaces, stations, sections, superelevation, and criteria checking | Correct long-term engineering data model |
| InfraWorks | Component-road alignment and editable cross-section assembly | PI Based auto-generates curves/spirals; Element Based creates individual tangents/curves; live colored preview and numeric annotations | Intersections appear automatically and expose curb radii, lanes, widening, turn zones, design vehicle, and roundabout conversion | In-canvas horizontal/vertical grips, Profile View, cut/fill, superelevation | Best reference for our default drawing UX |
| RoadRunner | 2D reference curves with separate height and road attributes | Draw/edit planar reference curves, then edit heights | Endpoint near another road makes T; overlapping roads make four-way; Stack Level and Overlap Group suppress joins | Height is authored separately; joining considers compatible elevation | Best reference for explicit grade-separation and “do not connect” controls |
| CityEngine | Graph nodes/segments generating street, node, sidewalk, and lane shapes | Draw or import graph geometry, then edit curves and street attributes | Cleanup can intersect, snap, merge, and resolve conflicting shapes; principal road can control the junction | Cleanup uses horizontal and vertical tolerances and warns about non-planar situations | Best reference for repair tools and visible topology conflicts |
| Vectorworks Landmark | Dedicated parametric road objects, including Poly, Tee, NURBS, and Custom Curb | Click a center polyline; double-click for an open road; edit width, curb, stations, and grading in properties | Simple types have dedicated tools; complex junctions use a free-form Custom Curb object | Station elevations, site pads, grade limits, and site-model sections | A useful manual fallback when automatic junction solving is insufficient |
| Rhino | Generic curves/NURBS and swept surfaces | Draw/blend a curve, create a cross-section, Sweep1 in Roadlike mode | Manual intersect, trim, split, blend, and join | Project or Pull curves onto terrain | Good curve tools, not a semantic road system |
| Unreal Landscape Splines | Editable spline control points and mesh segments | Ctrl-click points, edit tangents, split/join segments, width and falloff | No documented semantic road-junction solver | Splines can raise/lower and blend the landscape | Good reference for tactile spline and terrain handles |
| OpenRoads Designer | Horizontal and vertical geometry + templates + terrain + superelevation + corridor | Constraint- and snap-driven civil geometry with persistent dependencies | Reusable Civil Cells encode rule-driven junctions such as T intersections | Dynamic sections, terrain, templates, profiles, and corridor processing | Best reference for reusable junction rules and dependency ownership |

## What is implemented in our plugin today

### Drawing and topology

- Point-click centerline drawing with continued clicks for straight, L, V, and polyline roads.
- Straight/curve mode toggle. A curve currently stores a start point, one quadratic control point, and an end point.
- Full-width preview, grid snapping, endpoint snapping, end-on-edge splitting for T junctions, and through-cross splitting for + junctions.
- Semantic graph nodes and edges rather than one independent mesh per stroke.
- One scene node per connected component. Connected roads select together; disconnected roads are separate selectable objects.
- Automatic derived classification for L, V, T, Y, +, X, and multi-leg topology.
- Different bridge/ground/tunnel modes do not connect when their modes or logical levels differ.
- Per-leg undo, Enter/double-click completion, and keyboard mode changes.

### Generated road appearance

- Procedural road surface, narrowed sidewalks, median option, solid markings, and preset styles.
- Render-time smoothing at degree-two corners.
- Generic junction surfaces at nodes with three or more incident roads.
- Roundabout conversion for the busiest junction.
- Basic curve control handles in floor-plan view.

### Current editing and validation

- Network/component selection works, but individual edge and individual junction selection do not yet exist.
- Inspector edits active network style, can apply a style to all networks, and exposes snap tolerance.
- Pure validation detects several malformed graph cases, but errors are not presented as in-canvas drawing feedback or repair actions.

## Exact differences from professional road tools

| Capability | Professional reference | Our current behavior | Gap |
| --- | --- | --- | --- |
| Default curve authoring | InfraWorks PI mode creates tangent curves or spirals automatically | User switches to a single quadratic control-point curve | We lack automatic tangent fillets, authored radius, and spiral support |
| Advanced horizontal geometry | Civil 3D/OpenRoads store lines, arcs, and spirals as constrained alignment elements | Straight or quadratic edge only | No fixed/free/floating constraints, bearing, tangent, radius, or continuity model |
| Numeric entry | Revit, SketchUp, InfraWorks, Civil 3D allow typed lengths, angles, radii, and curve values during drawing | Mostly pointer-driven | No heads-up length/bearing/radius input |
| Curved topology hit testing | Road design products intersect the actual horizontal alignment | Endpoint/crossing projection currently uses the edge endpoint chord | A curved edge can snap, split, or intersect in the wrong place |
| Grade separation | RoadRunner uses height plus Stack Level/Overlap Group; civil tools use profiles | Connectivity compares logical `level` and `elevationMode` | Two geometrically separated ground roads may connect; users cannot explicitly suppress a join |
| Junction object | InfraWorks/Civil 3D expose primary road, curb returns, lanes, profiles, and turn behavior | Degree-3+ nodes receive a generic circular junction surface | No curb-return solver or editable junction parameters |
| Unequal roads at a junction | InfraWorks transitions lane groups/components; Civil 3D targets offsets and profiles | Road ribbons meet a generic node surface | Widths, medians, sidewalks, and markings are not mapped through the junction |
| Corner smoothing | Civil tools retain designed arc/spiral geometry | Degree-2 bends use a render-time heuristic radius based on road width | Radius is not a persistent editable design value and can fail at short or sharp legs |
| Cross-section | InfraWorks assemblies and OpenRoads templates contain lanes, curbs, gutters, medians, shoulders, sidewalks | Fixed style properties generate one road section | No component hierarchy, per-side components, reusable assembly, or transition/taper |
| Vertical design | Civil 3D/InfraWorks/OpenRoads have profiles, PVIs, vertical curves, stations, and cut/fill | Bridge/tunnel use fixed rendering offsets | No terrain following, grade, vertical curve, station, or earthwork model |
| Selection | Civil tools distinguish corridor, baseline, region, alignment element, junction, and grip | Selection stops at connected component | Users cannot edit one edge, one node, one corner, or one control constraint |
| Conflict feedback | CityEngine shows conflicting shapes; Civil 3D marks design violations | Validation is mostly silent | No visible invalid radius, overlap, self-crossing, short-edge, or unsolved-junction state |
| Regeneration ownership | Civil tools distinguish generated content and overrides, and warn when rebuilds overwrite edits | No override ownership model | Future automatic junction regeneration could unexpectedly replace manual fixes |
| Cleanup/import | CityEngine has intersect/snap/merge/conflict cleanup | Creation-time topology only | No bulk cleanup, tolerance preview, repair queue, or road-network import workflow |

## Recommended drawing experience

### 1. Default mode: PI-based smart road

This should feel like InfraWorks with SketchUp-style inference:

1. Drag **Road** from the side panel or activate the Road tool.
2. Click the starting point.
3. Move the pointer. Show the road at full width, centerline, length, bearing, active style, elevation mode, and snap target.
4. Click subsequent points of intersection. At an L/V bend, generate a tangent circular curve automatically when space permits.
5. Show an in-canvas radius handle and a numeric radius label. Drag it or type a value without leaving the canvas.
6. When hovering near topology, preview the operation before committing:
   - `Extend road`
   - `Join endpoint`
   - `Create T junction`
   - `Create cross junction`
   - `Grade-separated: no connection`
   - `Overlap group: no connection`
7. Double-click or Enter to finish. Escape cancels only the current uncommitted leg; Undo reverses one committed leg.

The user should not need separate L, T, +, Y, or V tools. Those are results of graph topology, not primitive objects.

### 2. Advanced mode: alignment elements

Provide an optional Element mode for precise work:

- Tangent line.
- Circular arc by radius.
- Spiral-curve-spiral later.
- Fixed, floating, or tangent-constrained element relationships.
- Typed length, bearing, radius, deflection, and station values.
- Explicit continuity badges: connected, tangent, curvature-continuous, or broken.

### 3. Editing after drawing

Selection should be hierarchical and predictable:

- First click: connected road network.
- Second click or Tab: road edge/alignment segment.
- Junction badge or third-level selection: junction object.
- Control handle: PI, tangent, radius, endpoint, width, or elevation control.
- Double-click: enter network edit mode, muting unrelated networks.

Inspector properties should follow selection:

- Network: style, default elevation behavior, cleanup, export.
- Edge: road type, cross-section, width, curve constraints, profile.
- Junction: primary road, corner radii, joining/suppression, lane mapping, roundabout.
- Control: exact coordinate, station, elevation, radius, tangent length.

### 4. Junction behavior

Automatic creation should remain the default, but a junction must become a real editable object rather than only a mesh patch.

For T, +, Y, and multi-leg nodes it should store:

- Primary/through road.
- Incident edge order and approach angle.
- Per-corner curb-return radius.
- Join state for each pair of approaches.
- Road-surface and sidewalk boundary solution.
- Median and lane termination/continuation rules.
- User overrides and which generated values they replace.
- Solver state: solved, warning, conflict, or manual boundary.

If the automatic solver cannot make a valid junction, preserve the centerline graph and offer a Vectorworks-like manual boundary fallback. Do not silently produce crossed polygons or internal seams.

## Scenarios and required behavior

| Scenario | Expected behavior |
| --- | --- |
| Endpoint lands on an edge | Split the actual line/arc at the projected point and create a T; preview it before click |
| New road passes through an existing road | Split both actual alignments and create + only when vertical separation permits |
| Two roads cross at different heights | Keep separate; show `No connection — vertical separation` and allow explicit Stack Level/Overlap Group |
| Two “ground” roads have different Y/profile elevation | Use geometric/profile tolerance, not only a symbolic mode string |
| Endpoint nearly reaches another road | Offer extend-and-join inside tolerance; otherwise show the measured gap |
| Endpoint slightly overshoots another road | Offer trim-to-T without leaving a tiny dangling edge |
| New path crosses itself | Detect before commit; offer split into a junction, keep as grade-separated, or reject |
| Curve radius does not fit between adjacent PIs | Reduce preview radius with a warning, ask to move PI, or retain a sharp corner; never create inverted geometry |
| Road width exceeds available tangent length | Flag junction/fillet overlap and prevent invalid mesh generation |
| Two junction influence areas overlap | Merge into a compound junction or require a manual solution |
| Roads have unequal widths or components | Transition boundaries and explicitly map lanes/medians/sidewalks |
| Sidewalk/median terminates at a junction | Generate curb ramps/end caps/median noses according to junction rules |
| A regenerated junction has manual edits | Retain owned overrides or present a clear replace/reset decision |
| Imported graph has near misses, duplicates, or vertical crossings | Run a previewable cleanup pass with separate horizontal and vertical tolerances |
| Dense road network affects performance | Delay corridor regeneration during multiple edits, show stale state, and rebuild explicitly |

## Recommended implementation sequence

### Implementation status — 2026-08-03

Phase 0 is implemented and verified:

- Curve-aware snapping, intersection, and curve-preserving edge splits.
- Actual vertical-tolerance checks plus stack levels, overlap groups, and persistent no-join policy.
- Pre-click new/extend/join/T/cross/no-connection operation classification and live color feedback.
- Network, edge, junction, graph-node, and curve-control selection/edit handles.
- Persistent bend radius and tangent length with circular tangent-arc rendering.
- Red/amber 3D and floor-plan validation markers with blocking of invalid graph commits.
- Full automated suite and live Pascal editor browser verification.

### Phase 0 — make the current topology trustworthy

- Intersect and split the real line/curve geometry rather than endpoint chords.
- Replace symbolic-only elevation matching with actual vertical/profile tolerance.
- Add explicit `connect`, `do not connect`, stack level, and overlap-group state.
- Add pre-click operation previews for extend, endpoint join, T, +, and no-connection.
- Add individual edge, junction, and control-point selection.
- Store bend radius/tangent geometry as authored alignment data instead of only render-time smoothing.
- Surface validation in the canvas and block invalid mesh generation.

### Phase 1 — real junctions and cross-sections

- Introduce a persistent junction object with primary road and per-corner radii.
- Solve road and sidewalk boundaries for unequal widths and skewed approaches.
- Add explicit lane, median, shoulder, curb, gutter, and sidewalk cross-section components.
- Support station-based cross-section transitions and tapers.
- Add graph cleanup and manual junction-boundary fallback.
- Add stop lines, crossings, directional arrows, and marking continuity rules.

### Phase 2 — civil/terrain behavior

- Add vertical profiles, PVIs, grades, and vertical curves.
- Add stations, terrain following, cut/fill, bridge/tunnel clearance, and superelevation.
- Add design-speed and minimum-radius criteria with visible violations.
- Add design-vehicle turning checks for junction radii.
- Add import/export adapters for common semantic road data, keeping the internal graph independent of file format.

## What not to copy

- Do not convert the system to Revit-style closed road polygons; centerlines should remain the source of truth.
- Do not require SketchUp-style manual face intersection and erasing for every junction.
- Do not create separate primitive tools for every visual shape. L, V, T, Y, and + should remain derived topology.
- Do not regenerate away local edits. Store which values are generated, inherited, or explicitly overridden.
- Do not hide failed topology behind a plausible mesh. A visible conflict is safer than silent invalid geometry.
- Do not attempt the full Civil 3D corridor feature set before fixing curve-aware topology, grade separation, selection, and junction ownership.

## Recommended target

The immediate milestone should be:

> A user draws one centerline continuously, receives tangent curves automatically, sees exactly whether the next click will extend, join, create a T/+, or remain grade-separated, and can later select the network, one road, one junction, or one curve control independently.

That milestone keeps the approachable behavior of SketchUp/Revit, preserves the semantic advantage already present in our plugin, and establishes the data seams needed for civil-grade profiles, cross-sections, and corridors later.

## Official sources

### Autodesk Revit

- [Sub-divide a Toposolid](https://help.autodesk.com/cloudhelp/2026/ENU/Revit-Model/files/GUID-BA7C38A7-7E8B-45CC-B4A3-950D19B48C66.htm)
- [Create a Toposolid by Sketching](https://help.autodesk.com/cloudhelp/2026/ENU/Revit-Model/files/GUID-E69DE397-E2DF-491C-8B52-ACE952286DAD.htm)
- [About Sketching Elements](https://help.autodesk.com/cloudhelp/2026/ENU/Revit-Model/files/GUID-ED1582A8-E1A3-4561-AD8D-50DAC39F43F6.htm)
- [Toposolid operation failures](https://help.autodesk.com/cloudhelp/2026/ENU/RevitLT-Troubleshoot/files/GUID-858EA2C5-9FE8-422C-981A-D9D017F82E3B.htm)
- [Historical Site Designer concepts](https://help.autodesk.com/cloudhelp/2016/ENU/Revit-SiteDesigner/files/GUID-9C0D532F-BBA2-458A-B5C6-ECBFFFDE4606.htm)
- [Historical Site Designer streets and intersections](https://help.autodesk.com/cloudhelp/2016/ENU/Revit-SiteDesigner/files/GUID-95AFD97B-668C-4265-A6B5-AF546DF7885D.htm)

### SketchUp

- [Drawing arcs](https://help.sketchup.com/en/sketchup/drawing-arcs)
- [Offsetting geometry](https://help.sketchup.com/en/sketchup/offsetting-line-existing-geometry)
- [Solid Tools and Intersect](https://help.sketchup.com/en/sketchup/modeling-complex-3d-shapes-solid-tools)
- [Placing objects on terrain with Drape and Stamp](https://help.sketchup.com/en/sketchup/placing-models-and-objects-your-terrain)
- [Selecting connected geometry](https://help.sketchup.com/en/sketchup/selecting-geometry)
- [Coplanar-face and z-fighting behavior](https://help.sketchup.com/en/sketchup/clipping-and-missing-faces)

### Autodesk civil products

- [Civil 3D alignments](https://help.autodesk.com/cloudhelp/2023/ENU/Civil3D-UserGuide/files/GUID-6C5C6DC0-3C2D-4825-8BA8-4FA58941F560.htm)
- [Civil 3D Alignment Layout Tools](https://help.autodesk.com/cloudhelp/2025/ENG/Civil3D-UserGuide/files/GUID-1481F228-A59C-427A-A4B0-B83CA74A401E.htm)
- [Civil 3D intersections](https://help.autodesk.com/cloudhelp/2024/ENU/Civil3D-UserGuide/files/GUID-4DD6FCBD-5F3A-4C14-8233-862B872049AB.htm)
- [Civil 3D criteria-based alignment design](https://help.autodesk.com/cloudhelp/2025/ENU/Civil3D-UserGuide/files/GUID-888F1041-0B17-464B-BBAC-4472FAB8F8D1.htm)
- [InfraWorks: Add a Component Road](https://help.autodesk.com/cloudhelp/ENU/InfraWorks-RoadsandHighways/files/GUID-B08689A1-C4A8-4F1F-BF82-CD95A4ED2A9C.htm)
- [InfraWorks intersections](https://help.autodesk.com/cloudhelp/ENU/InfraWorks-RoadsandHighways/files/GUID-6871B3B2-93EC-4276-A0D9-4CBEDB06874B.htm)
- [InfraWorks component-road assemblies](https://help.autodesk.com/cloudhelp/ENG/InfraWorks-RoadsandHighways/files/GUID-75F9DBE1-08B7-4644-9A90-3B212727C13B.htm)
- [InfraWorks vertical curve editing](https://help.autodesk.com/cloudhelp/ENU/InfraWorks-RoadsandHighways/files/GUID-F2C30D0C-B542-4B79-A128-830D693CFC7C.htm)

### Other road and modeling references

- [RoadRunner Road Plan Tool](https://www.mathworks.com/help/roadrunner/ref/roadplantool.html)
- [CityEngine graph model](https://doc.arcgis.com/en/cityengine/latest/help/help-graph-layer.htm)
- [CityEngine street graph cleanup](https://doc.arcgis.com/en/cityengine/latest/help/help-cleanup-streets.htm)
- [Vectorworks polyline roadways](https://app-help.vectorworks.net/2024/eng/VW2024_Guide/SiteModel2/Creating_polyline_roadways.htm)
- [Vectorworks Custom Curb junctions](https://app-help.vectorworks.net/2022/eng/VW2022_Guide/SiteModel2/Joining%20roadways_with_a_custom_curb.htm)
- [Rhino Sweep1 Roadlike mode](https://docs.mcneel.com/rhino/8/help/en-us/commands/sweep1.htm)
- [Unreal Engine Landscape Splines](https://dev.epicgames.com/documentation/en-us/unreal-engine/landscape-splines-in-unreal-engine)
- [OpenRoads corridor modeling](https://bentleysystems.service-now.com/community?id=kb_article_view&sysparm_article=KB0020067)
- [OpenRoads T-intersection Civil Cells](https://bentleysystems.service-now.com/community?id=kb_article_view&sysparm_article=KB0019928)
