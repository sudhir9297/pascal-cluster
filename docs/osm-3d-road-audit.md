# Road reconstruction audit: actual Times Square data

Reviewed 2026-09-07. Recommendation: retain the map workspace, import workflow,
editable graph and scene integration. Rebuild the generation of road surfaces,
curbs and junctions around shared boundaries and a consistent road-surface height.
Expand the imported source model before adding more visual detail.

This is an investigation, not a renderer implementation. No production code was
changed for this audit.

## What was fetched

The first request uses this checkout's actual `buildOverpassQuery` and bounding-box
calculation, centered on **40.758, -73.9855**, with a **250 m radius**. It was sent
to the plugin's configured standalone Overpass endpoint. The returned OSM base
snapshot is **2026-09-07T04:42:51Z**, with no server remark indicating an error.
A second request expands the feature selection over the same bounding box.

Counts below describe returned ways, not unique named streets. Overpass supplies
complete intersecting ways; some geometry extends outside the selection. The
existing importer then clips to its circular radius.

| Current request | Observed count |
| --- | ---: |
| Road ways | 70 |
| Point lamps/signals/signs | 21 |
| Ways with `lanes` | 52 |
| Ways with `oneway` | 57 |
| Ways with `surface` | 56 |
| Ways with `turn:lanes` | 17 |
| Ways with `width` or `est_width` | 0 |
| Ways with `ele` | 0 |
| Ways declaring a cycle track | 15 |

The material tags include **49 asphalt, 2 concrete and 5 paving-stone ways**;
14 have no surface tag. The importer currently derives material appearance from
road class, ignoring these explicit surface tags.

The broader request returns **134 sidewalk paths, 73 kerb ways, 65 crossing nodes,
7 pedestrian ways and 182 building ways**. These are missing from the current
explicit feature selection. There is one `area:highway` way, but it describes
**steps**, not an asphalt road outline. We cannot assume complete road polygons
exist here. The expanded request does not retrieve multipolygon relations and is
not an exhaustive inventory of all possible OSM detail.

Evidence: [current response](research/osm-road-audit/manhattan-response.json),
[broader response](research/osm-road-audit/manhattan-context-response.json), and
[both queries](research/osm-road-audit/).

## Specific examples

- [West 47th Street, way 5672036](https://www.openstreetmap.org/way/5672036):
  one lane, one way, asphalt, sidewalks mapped separately; no measured width.
- [6th Avenue, way 127693103](https://www.openstreetmap.org/way/127693103):
  four lanes, one bus lane, a left cycle track, concrete and separate sidewalks.
  Our section cannot express its lane uses or protected track and ignores concrete.
- [West 48th Street, way 167922074](https://www.openstreetmap.org/way/167922074):
  three lanes with `through|through|right`. We preserve total lane count but not
  this lane-by-lane movement information.
- [Broadway, way 35027232](https://www.openstreetmap.org/way/35027232):
  pedestrian-only paving stones. The motor-road query excludes it, leaving a
  recognizable part of Times Square absent from the reconstruction.

These links are live; the saved response is the evidence for the observed values.

## Why the 2D layout can work while 3D fails

Replaying the saved response through the real importer produces **61 edges,
19 junctions, one connected network and 10 mapped point assets** after clipping.
The following findings are from code inspection and numerical replay, not a new
browser visual test.

1. **Pavement thickness incorrectly changes the driving-surface height.**
   Imported graph points all start at Y=0. Road meshes place the top at
   `point.y + surfaceThickness`; presets use 0.10, 0.14 and 0.22 m. Fourteen of the
   19 junctions meet roads with different thicknesses, creating potential top
   discontinuities of **4–12 cm**. Junction patches use one primary road's height.
   Degree-three-plus junctions do not get endpoint height transitions.
   Thickness should extend below a shared top datum, rather than lift roads by
   different amounts. [Mesh generation](../src/road-network-model.tsx),
   [transition rules](../src/road-transition-profile.ts),
   [replay measurements](research/osm-road-audit/analysis.json).

2. **The ordinary road, curb and sidewalk surfaces are thin sheets.**
   Variable ribbons create two vertices per station and triangles between them,
   with no vertical curb faces or closed thickness. Double-sided materials hide
   missing back faces but do not create solid curbs. Sidewalks are offset 5.5 cm
   above asphalt while curb tops are offset 10.5 cm. From above these are colored
   strips; from a low view the missing faces and different heights are exposed.
   [Ribbon renderer](../src/road-network-model.tsx),
   [cross-section heights](../src/road-cross-section.ts).

3. **Some junction footprints still cannot fit.**
   One West 43rd Street connector is **1.76 m long**, while its two junction cuts
   total **4.80 m**. Another connection is **11.16 m** with **13.20 m** of cuts.
   Reducing curb radii cannot solve all such cases because road half-width itself
   creates a minimum cut. These need a shared junction region, with source
   connectivity retained, rather than independent overlapping patches.
   [Measured edges](research/osm-road-audit/analysis.json),
   [current radius fitting](../src/osm-junctions.ts).

4. **Asphalt overlaps beneath the junction patches.**
   The renderer trims roadside bands using `decorativeProfile`, but draws asphalt
   using the untrimmed `profile`. It then adds a junction patch 2 mm above a chosen
   road's surface. This is an overlay strategy, not a single connected mesh.
   It is especially fragile when incoming roads have different top heights.
   [Road and junction rendering](../src/road-network-model.tsx).

5. **Junction side bands lose side-specific detail.**
   `buildRoadJunctionBands` takes the maximum width of each component across both
   sides of every incoming road. That cannot faithfully represent, for example,
   a cycle track or sidewalk that exists on just one approach.
   [Band construction](../src/road-cross-section.ts).

The automatic junction patch uses a center triangle fan. The replay found no mixed
triangle winding in this sample, so this audit does not establish fan triangulation
as a reproduced bug. A replacement should still support concave boundaries and
islands without assuming every junction is star-shaped.

## What to build, in order

### 1. Preserve source facts and label estimates

Keep raw way IDs, tags and geometry alongside normalized lane uses/directions,
surface material, signed layer and bridge/tunnel identity. Keep a provenance field
for each dimension: mapped, derived or default. Zero tagged widths in this sample
means the current 3.2 m lane and 1.8 m sidewalk values are estimates, not observations.
Do not treat `layer` as height in metres.

### 2. Replace the surface builder, retaining the editing graph

Create one shared intermediate representation of carriageway boundaries, junction
regions and side-component boundaries. Feed both 2D and 3D from it. Group nearby
junctions whose footprints collide, while keeping individual source nodes and
turn connections in the editable graph. Clip/union surface polygons before
triangulation, preserve islands as holes, and share boundary vertices at seams.
Only combine compatible at-grade roads; never union a bridge and the road below.

Define the driving-surface height independently of pavement thickness. Extrude
pavement down from that height. Sweep curbs with top and vertical faces; build
sidewalk slabs at a consistent walking height, with deliberate ramps at crossings.
Markings should reference the finished road surface.

This is the part worth rewriting. The map UI, clipping, duplicate handling,
selection, undo and graph editing are useful existing components.

### 3. Incorporate the separately mapped street edges

Fetch kerbs, sidewalk/crossing paths, pedestrian areas and relevant cycleways.
Associate them spatially and topologically with roads. Prefer usable mapped kerb
boundaries over inferred widths, but detect missing, disconnected or contradictory
outlines. A sidewalk centerline alone is not its full outline. Avoid drawing both
an inferred sidewalk strip and the separately mapped sidewalk. Use road-area
polygons opportunistically, not as a required dependency.

### 4. Use the appearance data already in hand

Render asphalt, concrete and paving stones differently. Support protected cycle
tracks, bus-lane uses and mapped turn arrows. Add restrained texture and sidewalk
joints after topology and heights are correct. Building footprints can provide
optional context; they are not the fix for the road mesh.

### 5. Add vertical reconstruction separately

Preserve tunnels and negative layers now. Later, use terrain/elevation and explicit
structure constraints for grades and bridge decks, with any assumed clearance
identified as an estimate. This sample has no `ele`, so it cannot supply measured
road grades by itself.

## Acceptance checks for the rebuild

- Reuse these captured payloads so failures are independent of Overpass timeouts.
- Road-to-junction top seams match within 1 mm on flat cases, regardless of material
  thickness. Thickness extends downward.
- Short-connection junction regions contain no overlapping asphalt faces; legitimate
  source connectivity and traffic islands survive.
- Curbs have connected vertical faces; sidewalks meet without floating strips.
- Named lane counts and turn movements match captured tags. Missing width remains
  visibly identifiable as an estimate in editing metadata.
- Compare 2D, oblique 3D and low street-level views of the same geometry. Include
  asymmetric sidewalks, a width transition, an angled junction, the two short
  connectors, and a bridge-over-road case.
- Preserve selection, editing, serialization and undo behavior; measure build time
  before and after on this 61-edge sample and a larger import.

## Reproduce

Run `bun docs/research/osm-road-audit/replay.ts`. It reads the captured payload and
regenerates `analysis.json` and `imported-graphs.json` through the current importer.
The broader response is an inventory only and is not fed through the motor-road
parser as though pedestrian features were vehicle roads.

[OSM source semantics and official references](osm-source-capabilities.md) explain
which facts the data can establish. Snapshots contain OpenStreetMap contributor
data, available under the [ODbL](https://www.openstreetmap.org/copyright), as recorded
in their response headers.
