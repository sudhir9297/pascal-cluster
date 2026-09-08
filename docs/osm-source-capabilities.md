# OSM data available for road reconstruction

Reviewed 2026-09-08 against OSM's own tagging documentation and this checkout's importer. This note describes capabilities and query coverage; it does not claim that every tag exists in the selected area.

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

- [The query](../src/osm-import.ts) selects motor-road ways; `area:highway` ways and relations; explicit sidewalks, crossings, cycleways, pedestrian areas and kerbs; lane-connectivity relations; and supported point objects. It requests `out geom`; the parser retains raw tags and source way/node/relation IDs. Gateway failures are retried as four smaller bounding boxes and merged by source identity.
- [Corridor association](../src/osm-road-corridors.ts) compares each supplemental feature with complete road polylines, including distance, overlap, direction, side and bridge/tunnel/layer compatibility. It assigns one graph owner, records confidence and matched edges, clips geometry to the selected import radius, and prevents a nearby parallel road from claiming the feature.
- [Style conversion](../src/osm-road-style.ts) consumes total and directional lane counts, total and per-lane widths, per-lane direction and bus/bicycle use, turn arrays, road surface, and a subset of sidewalk/cycle/parking tags. Each dimension records whether it was mapped, derived or defaulted. Variable lane widths feed the carriageway, markings, junctions, terrain and decoration offsets.
- Missing ordinary urban sidewalks become 1.8 m estimated strips. `sidewalk=separate` does not create a synthetic strip; the separately mapped geometry is rendered when it can be associated. Cycle and parking widths use bounded defaults when their presence is tagged without a valid width. [Style conversion](../src/osm-road-style.ts)
- Mapped line features render as joined ribbons with solid depth. Closed road and pedestrian areas are triangulated, including multipolygon holes. Mapped crossings locally suppress inferred curbs and sidewalks, and lowered/flush kerb nodes generate ramp geometry.
- [Vertical reconstruction](../src/osm-import.ts) preserves signed OSM layer and bridge/tunnel identity as source facts. Live imports sample terrain relative to the import origin, apply explicit `ele` values, and generate a 4.5 m estimated clearance profile only at plan intersections between mapped structures and ordinary roads. `layer` is never treated as metres.

## Remaining limits

- OSM coverage is uneven. A missing width, kerb or outline remains an estimate or an omitted feature, not a surveyed fact.
- Lane connectivity relations are retained for later editing and routing but are not yet a traffic-simulation model.
- Estimated structure clearance is deliberately labeled as estimated. It is not a measured bridge deck, tunnel bore or engineering-grade vertical alignment.
- The importer does not infer buildings, street furniture beyond the supported point catalog, or legal access rules into a full transport network.

Check the retained raw tags and provenance before treating an imported scene as authoritative.
