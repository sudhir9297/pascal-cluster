# Imported street cross-sections

The importer builds editable road meshes from OSM centerlines and per-way styles.
Imported curb-return radii shrink when nearby junctions leave too little room for
the default corners. Extremely short or contradictory mapped segments can still
need manual correction. It preserves separate styles when placing the result in the scene. Manual road
presets are unchanged.

Supported tags:

- `lanes`, or the sum of `lanes:forward`, `lanes:backward` and `lanes:both_ways`.
- `width`, with `est_width` as a fallback. Metres and explicit `ft` units are read.
- `sidewalk`, `sidewalk:left`, `sidewalk:right`, `sidewalk:both` and their widths.
- `cycleway:left/right/both=lane` and `opposite_lane`, with tagged widths.
- `parking:left/right/both=lane`, plus legacy `parking:lane:*` values.
- `lane_markings=no`.

The pavement width is apportioned to vehicle lanes after subtracting mapped
parking and on-road bike lanes. Sidewalks sit outside that width. Contradictory
widths or dimensions outside the editor schema use estimates instead of producing
invalid geometry. Unknown lane counts use one lane for service roads and links,
and two for other roads. Urban sidewalk estimates are 1.8 m; bike lanes, parking,
medians and verges are not invented. A separately mapped sidewalk tag indicates
that a sidewalk exists, so the road section still includes it.

These estimates are not a survey. The importer does not reconstruct buildings,
separate cycle tracks, turn-lane allocation, traffic islands or exact curb outlines.
Elevation still uses the existing flat-floor import behavior. Re-import an area in
a fresh scene to get the new styles; existing authored roads are not migrated.

Tag references: [OSM lanes](https://wiki.openstreetmap.org/wiki/Key:lanes) and
[OSM width](https://wiki.openstreetmap.org/wiki/Key:width).

Regression coverage includes a New York-coordinate avenue with three mapped lanes,
asymmetric sidewalks, bicycle and parking width accounting, a single-lane ramp,
feet conversion, malformed tags, preserved scene styles and one-way lane markings.
