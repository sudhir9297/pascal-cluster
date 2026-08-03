# Road System Research and Authoring UX

This note researches how roads and junctions should be represented, drawn, and
edited in the Pascal Environment plugin. It uses first-party product
documentation and public road-design guidance. Sourced behavior is separated
from the implementation recommendations for Pascal.

## Executive recommendation

Build **one smart centerline-drawing tool backed by a road graph**, not separate
L-road, T-road, plus-road, Y-road, and V-road objects. Those visible forms are
outcomes of the same few actions:

- click in empty space to start or extend a road;
- click along the way to add a bend or curve;
- end on an existing road to split it and create a three-leg junction;
- draw through an existing road to split both roads and create a four-leg
  junction;
- connect an additional road to the same node to create a fork or multi-leg
  junction;
- convert a selected junction to a roundabout when desired.

Persist semantic centerlines, cross-section presets, elevation/level, and a
small set of user overrides. Derive meshes, curbs, sidewalks, intersection
patches, markings, and the friendly shape label. This makes the system editable
and avoids storing fragile generated triangles as source data.

The first release should be an urban scene-layout tool, not an engineering road
design package. Exact radii, lane widths, cross slopes, design vehicles,
markings, and accessibility geometry are jurisdiction-dependent. Pascal should
offer visually plausible presets and clearly avoid representing them as
construction-ready designs.

## 1. What “road type” means

The phrase mixes three independent dimensions. The data model should not.

1. **Alignment geometry:** straight, circular or spline curve, compound curve,
   S-curve, corner, or hairpin.
2. **Network topology:** dead end, two-leg joint, three-leg junction, four-leg
   junction, multi-leg junction, roundabout, or grade-separated crossing.
3. **Road cross-section/function:** local street, collector, arterial, highway,
   alley, one-way road, divided road, ramp, path, and their lane/median/curb/
   sidewalk composition.

Autodesk likewise separates an alignment from the roadway assembly. Civil 3D
uses centerline, offset, and curb-return alignments plus profiles, corridors,
assemblies, and subassemblies for intersection models. InfraWorks component
roads are assemblies of lanes, curbs, gutters, medians, shoulders, and
sidewalks. [Civil 3D intersection objects](https://help.autodesk.com/cloudhelp/2025/ENU/Civil3D-UserGuide/files/GUID-0757C2A9-B439-43D3-9EB0-BFB50F237E6A.htm)
and [InfraWorks component roads](https://help.autodesk.com/cloudhelp/ENG/InfraWorks-RoadsandHighways/files/GUID-75F9DBE1-08B7-4644-9A90-3B212727C13B.htm)

### Recommended visual and topological taxonomy

The degree below is the number of road edges incident on one graph node. The
shape labels should be derived hints, not persisted object types.

| User-facing form | Graph interpretation | How it should be created | Important distinction |
| --- | --- | --- | --- |
| Straight road | A degree-1 end at each end with one straight edge between them | Two clicks | “Straight” describes alignment, not road function. |
| Curved road | One edge with curved alignment, or several tangent/curve elements | Place points of intersection and let Auto Curve fit them; Advanced mode draws elements directly | Store an editable centerline, not a baked bent mesh. |
| L-shaped/corner road | Usually a degree-2 node whose two tangents make a strong turn | Continue drawing through a corner point | It is normally one continuous road, not an intersection. The corner can be sharp, chamfered, or filleted. |
| T-shaped junction | Degree 3 with one visually continuous opposite pair and one terminating stem | End a new centerline on the middle of an existing road | The through pair is the likely main road, but the user must be able to override priority. |
| Plus/cross junction | Degree 4 with two approximately opposite pairs | Draw one road through another at the same level | A skewed four-leg intersection is topologically identical but looks like an X. |
| Y-shaped junction | Degree 3 with three oblique approaches and no convincing right-angle stem | Branch obliquely from an existing node/segment | “Y” is a visual subtype of a three-leg junction, not a unique primitive. |
| V-shaped fork | If there is an incoming stem, it is the same degree-3 topology as Y; without a stem, it is only a degree-2 corner | Draw two arms from a shared endpoint, or branch twice from a stem | Ask what connects to the bottom of the V before treating it as a junction. |
| X/skewed junction | Degree 4 with oblique approach angles | Draw through at the same level | FHWA notes safety and sight-line problems with skew; Pascal should warn, not prohibit. |
| Multi-leg/star junction | Degree 5 or more | Attach further roads to the same node | It needs a manual or roundabout fallback because automatic corner generation becomes ambiguous. |
| Cul-de-sac/dead end | Degree 1 with a terminal treatment | End a road, then choose plain, bulb, hammerhead, or turnaround | A plain endpoint and a designed turnaround need different terminal geometry. |
| Roundabout | A dedicated junction treatment with a central island and circulating carriageway, connected to approach edges | Convert a selected eligible junction or insert a roundabout template | A real roundabout is not just a circular texture on a single node. |
| Ramp/slip road | One-way edge connecting roads, often with merge/diverge tapers | Draw with a ramp cross-section and attach endpoints to eligible approaches | At-grade channelized turns and grade-separated ramps need distinct elevation semantics. |
| Bridge/underpass crossing | Two centerlines cross in plan but do not share a graph node | Set different levels or choose “Keep grade-separated” at the crossing | A visual crossing must not automatically mean a traffic connection. |

The leg-count distinction has operational meaning. FHWA illustrates three-leg
and four-leg intersections and reports substantially more potential conflicts at
four legs; it also warns that intersections become more complex beyond four
legs. [FHWA Signalized Intersections Informational Guide, number of legs](https://www.fhwa.dot.gov/publications/research/safety/04091/03.cfm)

Shape alone is not a safe design rule. FHWA guidance prefers approximately
right-angle intersections; one current handbook recommends 90 degrees where
right-of-way is unrestricted and at least 75 degrees where it is restricted.
Another FHWA manual describes 60 degrees or less as skewed and lists longer
crossing exposure, worse sight angles, and lane-encroachment risks.
[FHWA intersecting-angle guidance](https://highways.dot.gov/safety/other/older-road-user/desk-reference-handbook-designing-roadways-aging-population/chapter-2)
and [FHWA skewed-geometry discussion](https://highways.dot.gov/safety/local-rural/intersection-safety-manual-local-rural-road-owners/3-safety-analysis)

## 2. What established tools do

### Source comparison

| Product/source | Source representation | Authoring and editing UX | Automatic junction behavior | Lesson for Pascal |
| --- | --- | --- | --- | --- |
| MathWorks RoadRunner | A 2D reference curve whose plan and height can be edited separately; automatic or explicit curve forms | Right-click creates control points; points and control lines move the road; automatic curves use lines/arcs, while explicit curves expose line, arc, spiral, cubic, length, curvature, and tangent controls | Overlapping similar-height roads make junctions: a road ending inside another makes a T and two roads crossing make a four-way junction; Stack Level and Overlap Group can suppress automatic joining; a Custom Junction Tool handles exceptions | This is the closest direct precedent for the requested gestures. Separate shape-control points from topological junction nodes, and make join suppression explicit. |
| Autodesk InfraWorks | Component-road alignment plus a reusable cross-section assembly | Choose PI-based drawing, which fits curves/spirals where possible, or element-based drawing for explicit tangents and curves; click points, double-click to finish; edit radii in canvas and use grips for horizontal/vertical geometry | Automatically adds an intersection wherever component roads intersect; selected intersections can be converted to roundabouts; lane density helps choose an initial roundabout style | Offer a simple point-based mode and a precise advanced mode. Generate junctions immediately but keep them editable. |
| Autodesk Civil 3D | Two intersecting centerline alignments, optional profiles, offsets, curb-return alignments, corridor regions, assemblies | Select the intersection point and use a wizard to choose road priority, offsets, curb returns, profiles, and corridor generation | Can generate offsets, curb returns, profiles, targeting, and corridor regions; a through alignment is automatically primary in a T; the source alignments must meet precisely | Make topology repair automatic in a scene tool, but preserve explicit primary-road and corner overrides. Do not expose an engineering-sized wizard on every draw. |
| Esri CityEngine | Street graph of nodes and edges; lane and intersection shapes are dynamic children of the graph | Polygonal and freehand tools; clicks create vertices; double-click/Enter finishes; snapping, length lock, parallel/perpendicular guides, curve handles, node movement, and height edits | Can create a node where segments intersect; creates drive/pedestrian shapes dynamically; Cleanup Graph intersects segments, snaps nodes to segments, merges nearby nodes/segments, and reports/resolves conflicts | The closest model for Pascal: graph-first drawing, live generated shapes, repair tools, and visible conflict feedback. |
| Epic Unreal Landscape Splines | Control points joined by spline segments, with per-point width/rotation/falloff and per-segment meshes | Ctrl-click creates and extends; clicking a segment inserts a point; splines can join/split; points and tangents remain editable | Deforms terrain and meshes along a spline, but the cited Landscape Spline workflow does not describe road-lane or intersection-patch solving | Reuse its direct manipulation ideas for alignments and terrain, but do not confuse a mesh spline with a road-network solver. |
| SideFX Labs Road Generator | Curves or OpenStreetMap input transformed into generated procedural geometry | Primarily a procedural-node workflow with width and road-module inputs | Handles intersecting curves and creates crossings; exposes intersection length, roundness, convexity, and resolution; outputs road geometry, sidelines, and an instancing point cloud | Intersection shape controls can be few and high-level. Preserve derived sidelines for sidewalks/curbs and decoration placement. |
| FHWA/NACTO guidance | Physical roads and conflict areas rather than an editor data model | Design is evaluated by approach count/angle, sight lines, turning paths, crossing distance, users, and context | No software automation prescription | Treat auto-geometry as a starting proposal and expose validation/overrides rather than claiming one universal “correct” result. |

### MathWorks RoadRunner: the most direct automatic-junction precedent

RoadRunner's Road Plan Tool edits the 2D reference curve on which a road is
based, while height is edited separately. Right-clicking creates road control
points, points can be inserted in an existing control line, and moving a point
updates the road. Its default **Automatic** form uses fitted straight lines and
circular arcs. **Explicit** form exposes straight, circular-arc, clothoid, and
parametric-cubic segments plus editable tangents, length, and curvature.
[RoadRunner: Road Plan Tool](https://www.mathworks.com/help/roadrunner/ref/roadplantool.html)

Its automatic topology matches the requested UX particularly well. At similar
heights, two crossing roads create a four-way junction and a road ending inside
another creates a T. A self-crossing road must first be chopped or represented
as multiple end-connected roads. Different **Stack Level** values prevent a
junction at an overpass; roads in the same **Overlap Group** can also be kept
from automatically joining. RoadRunner offers a separate Custom Junction Tool
when automatic geometry is insufficient.
[RoadRunner: Road Plan Tool, intersections and join suppression](https://www.mathworks.com/help/roadrunner/ref/roadplantool.html)

### Autodesk InfraWorks: fast layout plus precise editing

InfraWorks exposes two creation methods. **PI Based** places points of
intersection and automatically generates horizontal curves or spirals when the
design geometry permits. **Element Based** draws tangents and curves
individually. Canvas annotations show curve length/radius, the radius is directly
editable, length can be constrained, and existing road endpoints accept snapped
extensions. [InfraWorks: add a component road](https://help.autodesk.com/cloudhelp/ENU/InfraWorks-RoadsandHighways/files/GUID-B08689A1-C4A8-4F1F-BF82-CD95A4ED2A9C.htm)

The cross-section is not baked into the line. Users can add, split, delete, and
modify assembly components such as lanes, shoulders, medians, gutters, curbs,
and sidewalks, save assemblies for reuse, and create transitions where those
components begin or end. [InfraWorks: component roads](https://help.autodesk.com/cloudhelp/ENG/InfraWorks-RoadsandHighways/files/GUID-75F9DBE1-08B7-4644-9A90-3B212727C13B.htm)

InfraWorks automatically creates an intersection where two or more component
roads intersect. The selected junction can be edited in canvas/the Stack or
converted to a roundabout; InfraWorks chooses an initial roundabout style using
lane count and surrounding-road density, then permits further editing.
[InfraWorks: intersections](https://help.autodesk.com/cloudhelp/ENU/InfraWorks-RoadsandHighways/files/GUID-6871B3B2-93EC-4276-A0D9-4CBEDB06874B.htm)
and [convert an intersection to a roundabout](https://help.autodesk.com/cloudhelp/ENU/InfraWorks-RoadsandHighways/files/GUID-87498D3F-4DE8-4E3C-81A5-D771568BE1F8.htm)

### Autodesk Civil 3D: explicit intersection objects

Civil 3D creates a basic intersection from two alignments that intersect. Its
workflow can automatically create road-edge offsets, curb-return alignments,
their profiles, corridor regions, and vertical targeting. It can lock the
secondary-road profile to the primary-road elevation. The documentation also
notes that regeneration can overwrite manual corridor-region edits, an
important warning for Pascal's override model.
[Civil 3D: creating intersections](https://help.autodesk.com/cloudhelp/2024/ENU/Civil3D-UserGuide/files/GUID-4DD6FCBD-5F3A-4C14-8233-862B872049AB.htm)

For a three-way T, Civil 3D expects the alignments to meet precisely without
overlap or undershoot. An overlap becomes a four-way intersection. The
alignment that passes through is automatically considered primary; a four-way
intersection asks which alignment is primary. [Civil 3D: create an intersection](https://help.autodesk.com/cloudhelp/2022/ENU/Civil3D-UserGuide/files/GUID-6C3D8C2B-890B-4A78-90D6-DC71AC82FDC3.htm)

Civil 3D supports chamfer, circular-fillet, and three-centered-arc curb returns
with configurable radii/lengths. [Civil 3D intersection settings](https://help.autodesk.com/cloudhelp/2025/ENU/Civil3D-UserGuide/files/GUID-DF93823E-0231-4001-AE05-077DFCB7C30B.htm)

### Esri CityEngine: the strongest graph-editing precedent

CityEngine explicitly describes streets as a graph of nodes and edges. When
the graph changes, dynamic driving-lane and pedestrian-lane shapes are created
automatically. [CityEngine: create streets](https://doc.arcgis.com/en/cityengine/latest/help/help-graph-overview.htm)

Its polygonal tool clicks vertices and finishes with double-click or Enter.
Streets snap to nodes, segments, shape vertices/edges, and guides; length can be
locked; segments can align parallel/perpendicular to guides; drawing can reuse
neighbor settings; and **Intersect Segments** creates a node at segment
crossings. [CityEngine: polygonal street creation](https://doc.arcgis.com/en/cityengine/latest/help/street-creation-polygonal-street.htm)

Editing exposes node movement, curve direction handles, curvature, height, and
snapping. Junctions of degree three or more also expose “principle street”
handles so the user can change which approaches form the main street.
[CityEngine: edit streets and curves](https://doc.arcgis.com/en/cityengine/latest/help/help-edit-street-curves.htm)

Its cleanup operation is unusually relevant. It can create nodes at segment
intersections, snap nearby nodes to segments, merge close nodes, and resolve
shape conflicts. Horizontal and vertical tolerances are separate, and the docs
warn that planar cleanup should not be applied indiscriminately to networks on
different vertical levels. [CityEngine: Cleanup Graph](https://doc.arcgis.com/en/cityengine/latest/help/help-cleanup-streets.htm)

CityEngine marks shape conflicts with red dashed geometry. Close nodes can
cause one generated junction shape to overlap another; suggested remedies are
cleanup, moving the network, or changing width/shape parameters.
[CityEngine: node shapes and conflicts](https://doc.arcgis.com/en/cityengine/latest/help/help-street-and-crossing-shapes.htm)

### Epic Unreal Landscape Splines: useful manipulation, limited semantics

Landscape Splines create continuous features using control points and segments.
Ctrl-click creates/extends, Ctrl-clicking a segment splits it, one spline can be
joined to another, and auto-rotation can preserve smoothness. Control points
expose position, tangent rotation, half-width, side falloff, and terrain-raise/
lower behavior. The workflow is non-destructive and points remain editable.
[Unreal Engine: Landscape Splines](https://dev.epicgames.com/documentation/en-us/unreal-engine/landscape-splines-in-unreal-engine)

The official page describes spline meshes and terrain deformation, not lane
connectivity or automatic intersection surfaces. The defensible inference is
that Unreal's manipulation model is reusable, while Pascal still needs its own
topology and junction solver.

### SideFX Labs: a procedural generation precedent

The official Labs Road Generator accepts curves or OpenStreetMap data, handles
intersecting curves, and creates crossings automatically. It provides
high-level intersection controls for solved length, roundness, convexity, and
resolution. Its outputs separate road geometry, sidelines usable for sidewalks,
and an instancing point cloud. [SideFX Labs Road Generator](https://www.sidefx.com/docs/houdini/nodes/sop/labs--road_generator.html)

### Road-design guidance that affects the editor

NACTO emphasizes that curb radius changes turning speed and crossing distance,
and that effective turning radius depends on adjacent lanes, parking, cycle
lanes, and curb extensions—not just the curb arc drawn at the corner.
[NACTO: Corner Radii](https://nacto.org/publication/urban-street-design-guide/intersection-design-elements/corner-radii/)

The implication for Pascal is not to ship one “correct” corner radius. A radius
belongs to the junction/corner and road context, should have a preset default,
must remain directly editable, and should be constrained by available approach
length and widths.

An at-grade intersection joins/crosses roadways at the same level; grade
separation carries traffic over or under another roadway. OpenStreetMap's
topology expresses the same key rule: same-level intersecting ways share a
node, while different-height crossings do not. [FHWA terminology](https://highways.dot.gov/sites/fhwa.dot.gov/files/Chapter_01-20251007.pdf)
and [OpenStreetMap node model](https://wiki.openstreetmap.org/wiki/Node)

## 3. Recommended Pascal drawing UX

Everything from this section onward is a **product recommendation inferred from
the sources**, not a statement that an external standard requires this exact UI.

### Tool entry

Add a **Roads** category to the Environment panel with:

- a single **Draw road** tool;
- cross-section presets such as two-way local, one-way local, divided avenue,
  alley/service road, pedestrian path, and ramp;
- **Auto Curve** (default) and **Straight Segments** toggles;
- elevation mode: **Follow terrain**, **Fixed elevation**, **Bridge**, or
  **Tunnel**;
- snapping toggles for nodes, centerlines, endpoints, grid, angles, and guides;
- a compact overflow for **Precise Tangent/Curve** mode and import/cleanup.

Do not make users choose “T road” or “plus road” before drawing. Optionally add
templates under **Insert layout** for quick examples, but a template should
instantiate the same graph state as ordinary drawing.

### Reuse Pascal's existing drafting language

The current Pascal host already has useful wall-drafting primitives: endpoint
priority, grid/angle snapping, segment splitting, duplicate prevention, and
transactional migration of attachments when a segment is split. The road tool
should reuse those gestures, snap indicators, and transaction boundaries so it
feels native. Road-specific code should extend the shared drafting operations
with curves, cross-sections, elevation, and generated junction surfaces rather
than creating a second incompatible interaction system.

Keep two concepts visibly and structurally separate:

- **alignment control point/PI:** shapes one road and may exist only to control
  a curve;
- **topology node:** connects one or more road edges and determines routing and
  junction generation.

Inserting a curve control point must not create a junction. Splitting an edge
at an attachment or crossing must create a topology node and transactionally
remap dependent attachments. A point can play both roles at an endpoint, but
its responsibilities remain distinct in the state and selection UI.

### Drawing interaction

1. Hover shows a ghost centerline, road-width envelope, predicted junction
   patch, length, heading, and—when curved—radius.
2. First click starts a road. Starting on an existing endpoint extends it;
   starting on a segment creates a branch node after confirmation/commit.
3. Each click adds a control point or PI. Angle guides offer 0/45/90-degree and
   parallel/perpendicular snaps. Holding a modifier temporarily disables snap.
4. Auto Curve previews a tangent fillet through a PI. Straight Segments keeps a
   sharp polyline; dragging while placing can set a tangent/radius.
5. Hovering an existing road previews the operation in plain language:
   **Join endpoint**, **Create T-junction**, **Create four-way junction**, or
   **Cross without connecting (different level)**.
6. Double-click or Enter commits. Escape removes the last uncommitted point;
   Escape again cancels. Backspace also removes the last point.
7. Creation is one undoable transaction, including all automatic edge splits
   and generated junction state.

### How common shapes emerge

| Desired result | User gesture | Automatic result |
| --- | --- | --- |
| Straight | Click start, double-click end | One centerline edge and two degree-1 nodes |
| Curved | Click start, one or more PIs, double-click end with Auto Curve on | Tangent/curve alignment with editable PI and radius handles |
| L | Draw through a corner PI | Degree-2 joint; corner fillet if enabled |
| T | Draw a road and finish on the middle of another | Existing edge splits at the hit; the new edge attaches to the new degree-3 node |
| Plus | Draw through an existing road | Both centerlines split at the crossing; four incident edges share one node |
| Y | Branch from a road/node at an oblique angle | Degree-3 node classified as a fork/Y preview |
| V | Draw two edges from one endpoint | Degree-2 corner until an incoming stem is added; then it becomes the same fork topology as Y |
| Multi-leg | Attach another approach to an existing junction | Node degree increases; solver regenerates or warns when no clean patch fits |
| Roundabout | Select junction, choose **Convert to roundabout** | Replace the simple patch with a roundabout subgraph/treatment while retaining approaches |

### Crossing ambiguity

A 2D floorplan cannot always reveal whether crossed centerlines connect. Apply
this rule:

- same level and sufficiently close elevation: default to **Create
  intersection**;
- explicit bridge/tunnel/different level: default to **No connection**;
- ambiguous vertical separation: show a non-blocking choice chip at the preview,
  with both outcomes visible before commit;
- never silently turn a bridge crossing into a plus junction during cleanup.

### Selection and editing

Selecting a **road segment** should expose:

- move/add/remove control point;
- tangent and radius handles;
- straight/curve conversion;
- cross-section preset and per-side component editing;
- road direction, one-way direction, level, elevation/profile, and terrain mode;
- split, join, reverse direction, detach from junction, and extend actions;
- start/end transition controls when lane count or width changes.

Selecting a **junction** should expose:

- derived label and approach count: T, Y/fork, cross, skewed cross, or multi-leg;
- primary/through-road pairing, edited with an in-canvas handle;
- simple, stop/yield/signal placeholder, roundabout, or manual treatment;
- per-corner radius/fillet type and a linked-corners toggle;
- auto/manual lane connections and prohibited turns;
- corner/sidewalk/crosswalk generation toggles;
- **Rebuild automatic geometry**, **Reset overrides**, and **Validate** actions.

Dragging a node should regenerate its dependent geometry live. During the drag,
show lightweight preview meshes; perform high-resolution triangulation and
terrain updates on release.

### Feedback and validation

Use three levels:

- **Blue/neutral:** predicted snap, split, or intersection.
- **Amber:** valid scene geometry with a design concern, such as severe skew,
  tight radius, abrupt lane mismatch, or short segment between junctions.
- **Red:** geometry cannot be generated, such as self-intersection, zero-length
  edge, overlapping junction envelopes, invalid curve, or unresolved same-level
  overlap.

Warnings should explain a repair action: **Reduce corner radius**, **Move
junctions apart**, **Merge nodes**, **Change width**, **Choose bridge**, or
**Use manual junction**. A selection-scoped **Clean up roads** command should
merge near-duplicate nodes, split same-level crossings, snap near endpoints,
remove tiny duplicate edges, and report every mutation before applying it.

## 4. Recommended state model

Use one reusable `environment:road-network` node for a connected network or a
manageable spatial tile. The graph is the authored source; generated meshes are
cached output. Stable IDs are essential because junction edits, undo/redo,
decorations, crossings, and future traffic routes refer to nodes and edges.

```ts
type RoadNetworkState = {
  schemaVersion: 1
  nodes: Record<RoadNodeId, RoadNode>
  edges: Record<RoadEdgeId, RoadEdge>
  junctionOverrides: Record<RoadNodeId, JunctionOverride>
  stylePresets: Record<RoadStyleId, RoadCrossSection>
}

type RoadNode = {
  id: RoadNodeId
  position: [number, number, number]
  level: number
  elevationMode: 'terrain' | 'fixed' | 'bridge' | 'tunnel'
  terminal?: 'plain' | 'bulb' | 'hammerhead' | 'turnaround'
}

type RoadEdge = {
  id: RoadEdgeId
  startNodeId: RoadNodeId
  endNodeId: RoadNodeId
  alignment: AlignmentElement[]
  styleId: RoadStyleId
  direction: 'two-way' | 'start-to-end' | 'end-to-start'
  roadClass: 'path' | 'alley' | 'local' | 'collector' | 'arterial' | 'highway' | 'ramp'
  parentEdgeId?: RoadEdgeId
}

type AlignmentElement =
  | { kind: 'line'; end: [number, number, number] }
  | { kind: 'arc'; end: [number, number, number]; radius: number; clockwise: boolean }
  | { kind: 'bezier'; end: [number, number, number]; handleIn: Vec3; handleOut: Vec3 }

type RoadCrossSection = {
  components: Array<{
    id: string
    kind: 'lane' | 'median' | 'shoulder' | 'gutter' | 'curb' | 'sidewalk' | 'verge'
    side: 'left' | 'center' | 'right'
    width: number
    materialId: string
    travelDirection?: 'with-edge' | 'against-edge'
    turnUse?: Array<'left' | 'through' | 'right' | 'uturn'>
  }>
}

type JunctionOverride = {
  treatment?: 'auto' | 'simple' | 'roundabout' | 'manual'
  throughPairs?: Array<[RoadEdgeId, RoadEdgeId]>
  primaryEdgeId?: RoadEdgeId
  cornerRadii?: Record<CornerId, number>
  cornerStyle?: 'circular' | 'three-center' | 'chamfer'
  allowedMovements?: LaneMovement[]
  terrainPolicy?: 'primary-crown' | 'blended-plane' | 'manual'
}
```

Do **not** persist `shape: 'T' | 'Y' | 'PLUS'`. Derive it from degree and
approach directions. Do not persist generated vertices, indices, UVs, curb
meshes, or intersection triangles except as disposable caches.

`AlignmentElement` endpoints and handles are **shape controls inside an edge**;
`RoadNode` objects are **network topology**. This distinction avoids turning
every curve PI into a false junction and aligns with RoadRunner's editable
reference curve while retaining CityEngine-style graph topology.

### Derived junction classification

For a node, compute the outgoing tangent angle of each incident edge and sort
the approaches around the node.

- degree 1: dead end;
- degree 2: straight joint if tangents are almost opposite, otherwise
  corner/L;
- degree 3: choose the pair closest to 180 degrees as the likely through road;
  if that opposition is strong, label T/skewed T, otherwise label Y/fork;
- degree 4: find the minimum-cost pairing into two opposite pairs; label plus
  when both pairs are close to perpendicular, otherwise X/skewed cross;
- degree 5+: multi-leg;
- explicit treatment `roundabout`: roundabout regardless of degree.

Use road class, width, continuity of edge identity, and the saved user override
as tie-breakers. The label can change as the node moves; the network topology
and overrides remain stable.

## 5. Automatic topology and geometry algorithm

### A. Commit the authored centerline

1. Convert clicks/PIs into line/arc/Bezier elements and validate finite,
   non-zero geometry.
2. Query a spatial index for nearby endpoints, nodes, and edge bounds.
3. Resolve explicit endpoint snaps first. Merge only within a screen-aware and
   world-space tolerance; never merge solely because two points look close at a
   distant zoom.
4. Compute intersections between the candidate centerline and nearby existing
   centerlines. Filter candidates by level, elevation mode, and vertical
   separation.
5. Sort intersection parameters along every affected edge. Split each edge once
   per ordered hit, reusing a node when several hits coincide within tolerance.
6. Preserve the old edge ID on one child and record `parentEdgeId` on the other,
   or use an explicit remap table, so attached props and undo history survive.
7. Insert the candidate edge pieces and atomically update node incidence.
8. Remove accidental zero-length pieces and report rather than silently delete
   meaningful short roads.

This automatically creates L, T, plus, Y, and multi-leg topologies without a
separate shape command.

### B. Establish junction semantics

1. Collect outgoing tangent, width envelope, cross-section, class, direction,
   and level for each approach.
2. Derive the visual classification and through pairs.
3. Choose a primary road by explicit override first, then continuous parent
   alignment, higher road class, wider carriageway, and smallest deflection.
4. Preserve valid user overrides after edits. If an override references a
   deleted approach, mark it stale and request repair rather than guessing.

### C. Trim approaches and construct the patch

1. Offset each approach centerline into carriageway, curb, sidewalk, and verge
   boundaries from its cross-section.
2. Estimate a junction envelope from the widest incident cross-sections and
   requested corner radii.
3. Trim approach ribbons at stable cut lines outside the central overlap.
4. Between adjacent approaches, solve the curb return as the requested circular
   fillet, three-center approximation, or chamfer. Clamp it to the available
   tangent length and surface a warning when clamped.
5. Union the trimmed carriageway envelopes with the corner regions in a robust
   2D plane, triangulate the result, then restore elevation.
6. Generate separate semantic surfaces for roadway, median termination,
   sidewalk corners, curb faces, gutters, islands, and later markings. Avoid one
   undifferentiated mesh because materials, selection, UVs, and replacement
   rules differ.
7. Keep the derived approach cut positions and sidelines as outputs for
   sidewalks, stop lines, crossings, guardrails, lights, signs, and procedural
   decoration.

For the first implementation, polygon offset/union plus circular fillets is a
better robustness target than a comprehensive design-vehicle solver. Add
three-centered arcs and swept-path validation later.

### D. Match lanes and movements

Intersection pavement can be generated before full traffic simulation, but the
state should be ready for lane connectivity.

1. Expand each road cross-section into directed incoming and outgoing lane
   endpoints at the approach cut.
2. Generate candidate movements from each incoming lane to legal outgoing lanes,
   excluding immediate reversal unless U-turns are enabled.
3. Use the through-road pairing to classify through movements; classify the
   remaining signed-angle movements as left or right according to the regional
   driving side.
4. Prefer monotone lane ordering so adjacent connectors do not cross
   unnecessarily. Match lane counts outward-in and create explicit merge/drop
   transitions when counts differ.
5. Fit connector curves tangent to the lane endpoints. Reject or warn on curves
   that self-intersect, overlap incompatible movements, or exceed the patch.
6. Keep generated movements editable and allow prohibitions. Geometry cannot
   reliably infer stop/yield control, turn restrictions, or local traffic law.

### E. Resolve elevation and terrain

For ordinary at-grade junctions, keep the primary alignment/profile stable and
blend secondary approaches into the junction surface, similar in principle to
Civil 3D's primary-road behavior. Provide a blended-plane alternative for
simple scene layouts. Sample enough terrain outside the junction to avoid a
visible lip, but store the authored vertical profile independently from the
terrain-deformation cache.

At every plan crossing, topology is decided before mesh generation:

- same `level` and compatible elevation produces a shared junction node;
- different level or bridge/tunnel modes produce independent edges;
- inconsistent metadata produces an actionable ambiguity warning.

### F. Regeneration and overrides

Every generated part records dependencies: edge geometry, cross-section,
junction node, terrain sample version, and relevant override revision. Moving a
control point invalidates only neighboring edge strips and junctions. Preserve
manual decisions as semantic overrides—radius, primary pair, treatment,
movement prohibition—not as hand-edited generated triangles. This avoids the
Civil 3D-style failure mode where regeneration replaces unsafely mixed manual
mesh edits.

## 6. Edge cases to design before implementation

- A road endpoint lands just short of another road.
- Two endpoints nearly coincide but sit on different levels.
- A new road overlaps an existing centerline for a distance instead of crossing
  once.
- Two crossings are so close that their junction envelopes overlap.
- A very wide arterial meets a narrow alley.
- A road width changes immediately before a junction.
- A divided road needs two physical intersection nodes rather than one abstract
  point.
- Two divided roads cross, producing a small internal network rather than one
  giant polygon.
- A spline touches another road tangentially without actually crossing it.
- Multiple new edges cross at almost the same location.
- A self-intersecting road loops back across itself.
- A node moves past another node and reverses edge order.
- An L corner's desired radius is longer than either adjacent segment.
- A Y junction has no obvious primary pair.
- A degree-4 node changes from plus-like to highly skewed X geometry.
- Five or more approaches cannot form non-overlapping automatic corners.
- A roundabout has too little space for its chosen island/approach widths.
- A bridge approach intersects terrain after centerline editing.
- Terrain is missing, discontinuous, or too steep for the current follow mode.
- Deleting one approach turns a plus into a T or a T into a corner.
- Undo must restore the exact pre-split edge IDs and attached props.
- Import produces duplicate nodes, duplicate edges, tiny gaps, or crossings
  without nodes.
- Left-driving and right-driving regional packs reverse lane movement and
  marking logic.

## 7. Validation rules and repair actions

| Check | Severity | Suggested repair |
| --- | --- | --- |
| Zero-length or non-finite edge | Error | Remove point or restore previous alignment |
| Duplicate same-level edge | Error | Merge or choose which road to keep |
| Same-level geometric crossing without node | Error | Split at intersection or mark grade-separated |
| Different-level crossing with a shared node | Error | Disconnect or make elevation compatible |
| Curve radius cannot fit adjacent elements | Warning/error if no mesh can form | Reduce radius, lengthen approaches, or use chamfer |
| Junction envelopes overlap | Error | Move nodes apart, reduce widths/radii, or merge nodes |
| Severe skew | Warning | Realign approach or accept as a scene-layout exception |
| Abrupt lane-count/width mismatch | Warning | Add a transition or set manual lane mapping |
| No clear through pair | Information/warning | Choose primary approaches manually |
| Junction patch self-intersects | Error | Reduce radius, change treatment, or use manual junction |
| Road surface departs terrain unexpectedly | Warning | Reproject, change profile, or switch elevation mode |
| Stale junction override after edge deletion | Warning | Reassign/reset the affected override |
| Multi-leg auto-solve is unstable | Warning/error | Convert to roundabout, separate into nearby nodes, or use manual mode |

These checks are scene-model checks, not an engineering design approval. FHWA
and NACTO considerations such as sight distance, design vehicle, accessibility,
drainage, and operating speed need jurisdiction-specific design inputs before
they can become meaningful compliance checks.

## 8. Recommended implementation sequence

### P0 — graph and basic road surface

- `environment:road-network` schema with stable node/edge IDs and migrations.
- Straight/polyline centerline drawing with endpoint, node, segment, angle, and
  grid snapping.
- Same-level edge intersection, splitting, T/plus/Y derivation, and undo/redo.
- One two-way local-road cross-section and procedural ribbon mesh.
- Degree-1 caps, degree-2 joints/corners, and simple degree-3/4 intersection
  polygon generation.
- Node/edge selection, move, split, join, delete, and extend.
- Clear crossing preview and level-aware no-connection behavior.
- Geometry validation with red/amber canvas feedback.
- Unit tests for graph mutation and deterministic mesh fixtures.

#### P0 acceptance criteria

- Drawing two points in empty space creates one selectable road with a stable
  centerline, width envelope, procedural surface, and undo/redo.
- Adding one or more intermediate points creates an editable polyline; moving a
  shape control updates the surface without changing network connectivity.
- Ending a new road on the middle of an existing road splits the existing edge
  once, creates one shared degree-3 node, preserves attachments through the
  host's transactional remap, and generates a watertight T patch.
- Drawing a road fully through an existing same-level road splits both at the
  exact crossing, creates one shared degree-4 node, and generates a watertight
  four-way patch.
- Drawing an oblique branch creates the same degree-3 graph operation and the UI
  labels it T or Y from angles without persisting that label.
- A same-plan crossing on a different level remains two independent edges and
  renders an over/under crossing without a junction patch.
- Hover preview states the pending operation before commit: extend, merge,
  split/T, cross/four-way, or no connection.
- Endpoint, grid, and angle snapping use Pascal's existing drafting cues and
  priority. Duplicate or zero-length segments are rejected before commit.
- Deleting or moving an approach deterministically reclassifies and rebuilds
  only affected neighboring geometry. One undo restores the exact prior graph
  and dependent references.
- The inspector can change road width/preset and select/reset the inferred
  primary road at a junction.
- Invalid overlaps, same-level crossings without nodes, and junctions too close
  to solve show actionable red/amber feedback rather than leaving broken mesh.
- Automated tests cover straight, L, T, Y, plus, skew, edge split, node merge,
  bridge crossing, duplicate prevention, ID/attachment migration, deletion,
  regeneration, and undo/redo.
- A representative network of at least 100 simple road edges remains
  interactively editable under the performance budget agreed with the Pascal
  host; the exact frame/cook-time budget must be recorded before implementation.

### P1 — curves and configurable streets

- Auto Curve PI workflow plus editable radius/tangent handles.
- Line/arc representation; Bezier/freehand only if a real use case requires it.
- Cross-section presets for one-way, two-way, divided, alley, path, and ramp.
- Per-side curb, gutter, shoulder, verge, and sidewalk components.
- Primary-road inference/override and per-corner fillets.
- Lane/width transition zones.
- Terrain following plus simple primary-road elevation blending.
- Selection-scoped Cleanup Roads with a reviewable change list.
- Import/export of semantic graph data.

### P2 — junction systems

- Directed lanes and editable lane-to-lane movements.
- Median handling, islands, turn pockets, slip lanes, and crosswalk/stop-line
  anchors.
- Roundabout conversion and dedicated roundabout state.
- Divided-road intersection expansion into multiple linked nodes.
- Bridges, tunnels, vertical profiles, embankment/cut behavior, and clearance
  checks.
- Three-centered curb returns and design-vehicle/swept-path-informed presets.
- Manual junction boundary editor for solver exceptions.
- Regional packs for driving side, markings, typical widths, and controls.

### P3 — simulation and scale

- Traffic routing over the directed lane graph.
- Signals, stop/yield controls, turn restrictions, pedestrian/bicycle movements,
  and conflict scheduling.
- Roadside-decoration and marking rules driven by semantic sidelines/stations.
- Network tiling, background mesh generation, LODs, and streaming.
- Large-network profiling, incremental regeneration budgets, and cache
  invalidation diagnostics.

## 9. Decision summary

- Use a graph of editable centerlines and cross-sections.
- Use one main drawing tool; let L/T/plus/Y/V emerge from snapping and splitting.
- Provide point-based Auto Curve and a later precise element-based mode.
- Automatically create junctions only at compatible levels.
- Derive visual shape labels; never make them the source of truth.
- Infer a primary road but make it easy to override in canvas.
- Generate intersection surfaces from trimmed approach offsets and filleted
  adjacent boundaries.
- Keep semantic overrides; regenerate disposable meshes.
- Treat roundabouts and divided-road crossings as richer subgraphs/treatments,
  not single decorative meshes.
- Validate visibly and propose repairs. Do not market scene presets as roadway
  engineering compliance.

## Primary sources

- [MathWorks RoadRunner — Road Plan Tool](https://www.mathworks.com/help/roadrunner/ref/roadplantool.html)
- [MathWorks RoadRunner — Create Traffic Signals at Junctions](https://www.mathworks.com/help/roadrunner/ug/create-traffic-signals-at-junctions.html)
- [Autodesk Civil 3D — About Intersections](https://help.autodesk.com/cloudhelp/2025/ENU/Civil3D-UserGuide/files/GUID-0757C2A9-B439-43D3-9EB0-BFB50F237E6A.htm)
- [Autodesk Civil 3D — About Creating Intersections](https://help.autodesk.com/cloudhelp/2024/ENU/Civil3D-UserGuide/files/GUID-4DD6FCBD-5F3A-4C14-8233-862B872049AB.htm)
- [Autodesk Civil 3D — To Create an Intersection](https://help.autodesk.com/cloudhelp/2022/ENU/Civil3D-UserGuide/files/GUID-6C3D8C2B-890B-4A78-90D6-DC71AC82FDC3.htm)
- [Autodesk Civil 3D — Intersection Feature Settings](https://help.autodesk.com/cloudhelp/2025/ENU/Civil3D-UserGuide/files/GUID-DF93823E-0231-4001-AE05-077DFCB7C30B.htm)
- [Autodesk InfraWorks — Add a Component Road](https://help.autodesk.com/cloudhelp/ENU/InfraWorks-RoadsandHighways/files/GUID-B08689A1-C4A8-4F1F-BF82-CD95A4ED2A9C.htm)
- [Autodesk InfraWorks — Component Roads](https://help.autodesk.com/cloudhelp/ENG/InfraWorks-RoadsandHighways/files/GUID-75F9DBE1-08B7-4644-9A90-3B212727C13B.htm)
- [Autodesk InfraWorks — Intersections](https://help.autodesk.com/cloudhelp/ENU/InfraWorks-RoadsandHighways/files/GUID-6871B3B2-93EC-4276-A0D9-4CBEDB06874B.htm)
- [Autodesk InfraWorks — Convert an Intersection to a Roundabout](https://help.autodesk.com/cloudhelp/ENU/InfraWorks-RoadsandHighways/files/GUID-87498D3F-4DE8-4E3C-81A5-D771568BE1F8.htm)
- [Esri CityEngine — Create Streets](https://doc.arcgis.com/en/cityengine/latest/help/help-graph-overview.htm)
- [Esri CityEngine — Draw a Polygonal Street](https://doc.arcgis.com/en/cityengine/latest/help/street-creation-polygonal-street.htm)
- [Esri CityEngine — Edit Streets and Curves](https://doc.arcgis.com/en/cityengine/latest/help/help-edit-street-curves.htm)
- [Esri CityEngine — Cleanup Graph](https://doc.arcgis.com/en/cityengine/latest/help/help-cleanup-streets.htm)
- [Esri CityEngine — Node Shapes and Conflicts](https://doc.arcgis.com/en/cityengine/latest/help/help-street-and-crossing-shapes.htm)
- [Epic Games — Landscape Splines](https://dev.epicgames.com/documentation/en-us/unreal-engine/landscape-splines-in-unreal-engine)
- [SideFX — Labs Road Generator](https://www.sidefx.com/docs/houdini/nodes/sop/labs--road_generator.html)
- [FHWA — Signalized Intersections Informational Guide](https://www.fhwa.dot.gov/publications/research/safety/04091/03.cfm)
- [FHWA — Intersection Geometry and Skew](https://highways.dot.gov/safety/local-rural/intersection-safety-manual-local-rural-road-owners/3-safety-analysis)
- [FHWA — Designing Roadways for the Aging Population, Intersections](https://highways.dot.gov/safety/other/older-road-user/desk-reference-handbook-designing-roadways-aging-population/chapter-2)
- [FHWA — Highway Terminology](https://highways.dot.gov/sites/fhwa.dot.gov/files/Chapter_01-20251007.pdf)
- [NACTO — Corner Radii](https://nacto.org/publication/urban-street-design-guide/intersection-design-elements/corner-radii/)
- [OpenStreetMap Wiki — Node Topology](https://wiki.openstreetmap.org/wiki/Node)
