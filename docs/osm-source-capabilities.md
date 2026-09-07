# OSM data available for road reconstruction

Reviewed 2026-09-07 against OSM's own tagging documentation and this checkout's importer. This note describes capabilities and query coverage; it does not claim that every tag exists in the selected New York area.

## What the map can supply

| Information | Meaning and reconstruction use |
| --- | --- |
| Linear road ways and shared nodes | Keep these as the editable network and connectivity source. OSM separately documents road outlines as supplemental geometry; a line is not a surveyed curb boundary. [OSM area:highway](https://wiki.openstreetmap.org/wiki/Key:area:highway) |
| `area:highway` polygons / multipolygons | Describe a road's 2D outline, including mapped traffic islands. These can constrain a surface mesh where present. They supplement the linear network; the documented street-area scheme excludes separately mapped parking and sidewalks. [OSM area:highway](https://wiki.openstreetmap.org/wiki/Key:area:highway) |
| `width`, `est_width`, side widths | Road width normally means carriageway edge-to-edge, including on-road parking and cycle lanes, excluding sidewalks. Historical tagging is ambiguous. `est_width` explicitly denotes an estimate; `maxwidth` is a vehicle restriction. Parse units and retain provenance. [OSM width](https://wiki.openstreetmap.org/wiki/Key:width) |
| Lane-specific attributes | Lane tags can express turn movements, lane width, permitted changes, and placement relative to the mapped line. `lanes` and lane-suffix lists need careful interpretation: a bicycle lane may appear in the list without counting toward motor-vehicle lane count. [OSM lanes scheme](https://wiki.openstreetmap.org/wiki/Lanes) |
| Separate sidewalks and crossings | Sidewalks may be separate `highway=footway` ways with `footway=sidewalk`; crossing ways can carry kerb, tactile-paving and surface detail. A road's `sidewalk:*=separate` signals separately mapped geometry, not its width or offset. [OSM sidewalks](https://wiki.openstreetmap.org/wiki/Sidewalks) |
| `layer`, bridge and tunnel tags | `layer` expresses ordering of overlapping features, not metres or a terrain elevation. Preserve signed layers and structure identity before deciding which road surfaces can meet. [OSM layer](https://wiki.openstreetmap.org/wiki/Key:layer) |
| `ele` | Elevation is a separate tag, normally metres above the EGM96 geoid. OSM is not a general elevation database, so road node coordinates cannot be assumed to include road-surface height. Terrain and bridge profiles require additional evidence or explicit estimates. [OSM elevation](https://wiki.openstreetmap.org/wiki/Key:ele) |

## What this plugin actually fetches and uses

- [The query](../src/osm-import.ts) selects motor-road highway ways and point lamps, traffic signals, traffic signs, stop and give-way nodes. It requests `out geom`; the parser retains way tags and latitude/longitude/node IDs.
- It now selects `area:highway` ways, mapped footway/cycleway/pedestrian paths, and kerb ways alongside the motor-road query. Relations, kerb nodes and lane-connectivity relations are still outside the import. Parsed supplemental ways are retained as provenance-tagged `mappedSurfaces`, carried into placed road networks, and used as hole contours and tapered station-by-station overrides for nearby roadside strips without treating them as vehicle roads. [Query and parser](../src/osm-import.ts)
- [Style conversion](../src/osm-road-style.ts) consumes total/directional lane counts, total width, a subset of sidewalk/bike/parking tags, and lane-marking presence. It reduces directional counts to a total and uses a single uniform lane width. It does not consume lane-specific widths, turn arrays, placement, separate cycle-track geometry or surface tags.
- Missing urban sidewalks become 1.8 m strips; `sidewalk=separate` also becomes a strip. Cycle and parking widths have defaults. Explicit dimensions outside its accepted range fall back to estimates. These are generated design choices, not retrieved dimensions. [Style conversion](../src/osm-road-style.ts)
- [Tag conversion](../src/osm-import.ts) retains bridge status, but clamps negative layers to zero and does not parse tunnel identity. [Graph construction](../src/osm-import.ts) initializes graph Y coordinates to zero. Its optional elevation baking samples terrain and linearly interpolates bridge alignment points between sampled endpoints; this is not a measured bridge-deck profile.

## Recommendations inferred from the evidence

1. Keep the importer and editable graph; introduce a normalized road record that preserves raw tags, source way/node IDs, per-lane direction/use/width, signed layer and structure identity. Attach a source or estimate marker to dimensions before generating geometry.
2. Expand fetching to separate sidewalks, crossings, kerbs, cycleways and available road-area polygons. Resolve their association with the road before rendering, so imported sidewalks do not duplicate synthetic strips.
3. Use mapped outlines when available; otherwise solve contiguous carriageway and junction surfaces from centerlines and width constraints. Make curbs, sidewalks and markings share those boundaries. This is a mesh-generation problem even where map data is sparse.
4. Treat turns, widths and placement as station-dependent profiles along the road instead of collapsing everything to one symmetric section. Preserve exact way shape unless a bounded smoothing operation is justified.
5. Keep a clean flat reconstruction as a baseline. Add terrain and bridge profiles only with explicit vertical constraints. Never convert `layer=1` directly into a supposedly measured height.

These are implementation proposals, not claims that OSM contains complete curb geometry or that richer queries alone fix the current 3D renderer. Check actual tag coverage in the captured payload before deciding which enhancements offer the most benefit.
