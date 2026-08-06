# Drainage-Grate Visual Research

This note translates primary roadway-drainage guidance and official standard
drawings into visual guidance for Pascal's `environment:drainage-inlet`
asset. It is a modeling reference, not hydraulic, structural, or ADA design
approval. Local agencies select grate dimensions, load class, openings, and
inlet spacing; the editor should expose those visual choices without implying
universal compliance.

## What a drainage grate represents

A surface grate covers a collection box below the gutter. It intercepts runoff
that crosses the grate, then sends the water through an underground storm-drain
network. FHWA describes grate, curb-opening, slotted, and combination inlets as
the principal roadway inlet families and recommends selecting among them using
hydraulic efficiency, traffic interference, pedestrian/bicycle safety, cost,
and debris clogging. [FHWA PDDM Chapter 7, inlet types and characteristics](https://highways.fhwa.dot.gov/sites/fhwa.dot.gov/files/Chapter_07.pdf)

The asset should therefore read as a framed opening set flush in pavement or
curb-and-gutter, rather than as a freestanding metal plate. A shallow dark
void under the bars, a visible frame/seating ledge, and a small concrete or
asphalt surround make the drainage function legible in 3D and in plan.

## Inlet families and useful presets

### Grate inlet

The rectangular grate sits in a frame over a catch basin. FHWA notes that on a
continuous grade, interception depends on flow direction, cross slope, grate
length, and velocity; in a sag, the grate behaves first as a weir and then as
an orifice. Debris reduces capacity in both situations. [FHWA PDDM Chapter 7](https://highways.fhwa.dot.gov/sites/fhwa.dot.gov/files/Chapter_07.pdf)

Use this as the default street-surface asset:

- rectangular cast-iron/ductile-iron frame with a thin seating lip;
- recessed grate face with a dark catch-basin void below;
- bars or vanes that remain inside the frame, with a small gap to the rim;
- optional shallow pavement depression around the frame, kept flush enough to
  avoid a visible trip edge;
- a slight bevel/highlight on the top frame so the opening reads at oblique
  camera angles.

### Curb-opening inlet

A curb-opening inlet is a vertical opening in the curb covered by a top slab.
FHWA says it is relatively resistant to clogging and causes little traffic
interference; it is often preferred where a surface grate would be hazardous
to pedestrians or cyclists. Its capture efficiency decreases on steeper
longitudinal grades. [FHWA PDDM Chapter 7](https://highways.fhwa.dot.gov/sites/fhwa.dot.gov/files/Chapter_07.pdf)

Represent it as a curb-height rectangular slot with a dark interior and a
short sill, not as a second grate floating beside the first. In a 2D symbol,
show the curb opening as a bold line/slot on the side of the curb and hide the
buried box.

### Combination inlet

Combination inlets include both a grate and a curb opening. FHWA distinguishes
equal-length combinations (same grate and curb-opening length, useful at sags)
from **sweeper** inlets, where the curb opening extends upstream of the grate
to intercept debris and improve on-grade capture. [FHWA PDDM Chapter 7](https://highways.fhwa.dot.gov/sites/fhwa.dot.gov/files/Chapter_07.pdf)

Make these materially different presets:

- `equal-combination`: grate and curb slot aligned with equal lengths;
- `sweeper-combination`: curb slot visibly longer/upstream of the grate;
- avoid implying that equal-length combinations always increase capacity on a
  continuous grade; FHWA says they are not recommended there because the gain
  over a grate alone is small.

### Slotted drain

Slotted inlets use a longitudinal pipe or channel with a continuous slot and
perpendicular retaining bars. FHWA notes that they act similarly to curb
openings on a continuous grade but are susceptible to clogging and are
discouraged in sag locations. [FHWA PDDM Chapter 7](https://highways.fhwa.dot.gov/sites/fhwa.dot.gov/files/Chapter_07.pdf)

Keep this as a future elongated preset: a narrow trench/channel with repeated
short crossbars, end cleanouts, and no oversized rectangular catch-basin box.

## Grate patterns and orientation

The patterns should be named for their actual geometry, and each must remain
bounded by the frame:

- **Bicycle-safe / ADA slot:** narrow openings or a diagonal/reticuline mesh;
  bars should not form slots parallel to bicycle travel. FHWA recommends
  replacing unsafe grates with bicycle-safe designs or adding perpendicular
  straps, and warns that bars perpendicular to a roadway must not be placed at
  curb cuts where wheelchair casters could catch. [FHWA Lesson 14, Drainage Grates](https://www.fhwa.dot.gov/publications/research/safety/pedbike/05085/chapt14.cfm)
- **Parallel/vaned:** repeated straight bars with direction chosen for the
  dominant surface-flow direction. Caltrans states that grate bars should run
  in the direction of greatest flow for maximum efficiency. [Caltrans Highway Design Manual, Chapter 830](https://dot.ca.gov/-/media/dot-media/programs/design/documents/chp0830-a11y.pdf)
- **Bi-directional vaned:** opposed angled bars for a cross-flow or valley
  condition; keep the two families visually symmetric and leave a clear frame
  margin.
- **Reticuline / herringbone:** diagonal bars crossing into a diamond or
  herringbone field. These can read as bicycle-safe when openings are narrow,
  but the editor should treat “bicycle-safe” as an explicit preset rather than
  assuming every decorative mesh meets a local standard.
- **Curved-vane / custom:** softly curved or swept bars for a decorative
  streetscape. Use fewer, thicker vanes than the safety mesh so the pattern
  remains legible at thumbnail scale and does not become noisy geometry.

Caltrans ADA guidance limits openings in the direction of pedestrian travel to
0.5 inch (12.7 mm) when a grate lies in a pedestrian path; it also notes that
small openings increase clogging risk, so local designs may require a clogging
factor or a specialty heel-guard grate. [Caltrans Highway Design Manual, Chapter 830](https://dot.ca.gov/-/media/dot-media/programs/design/documents/chp0830-a11y.pdf)

For Pascal, pattern generation should:

1. compute bar endpoints from an inset rectangle/rounded rectangle or clipped
   polygon;
2. keep every bar inside the frame by at least one bar half-width;
3. expose a `flowDirection`/rotation in the node so the bars can align with
   the road gutter without changing the node's overall orientation;
4. use the same pattern helper in the 3D renderer and 2D floorplan to prevent
   the editor symbol from lying about orientation;
5. separate grate, frame, void, and curb-slot surfaces by explicit Y/Z depth
   offsets to avoid z-fighting.

## Safety and surface details

FHWA recommends that grates in bicycle travel areas be bicycle-safe and that
street-surface grates remain flush with the roadway; after an overlay, inlets
should be raised to within 6 mm (0.25 in) of the new surface, or the pavement
should taper to avoid an abrupt edge. [FHWA Lesson 14](https://www.fhwa.dot.gov/publications/research/safety/pedbike/05085/chapt14.cfm)

Caltrans likewise says drainage grates in bicycle-use areas must meet bicycle
surface requirements and be maintained flush after resurfacing. [Caltrans Highway Design Manual, Chapter 1000](https://dot.ca.gov/-/media/dot-media/programs/design/documents/chp1000-a11y.pdf)

Useful visual controls are therefore:

- `surfaceCondition`: flush, slightly depressed, or raised-for-overlay;
- `bikeSafe`: narrow/heel-guard pattern with bars perpendicular to travel
  avoided;
- `frameStyle`: cast frame, angle frame, or curb-slot sill;
- `loadClass` as a visual label/finish only (do not treat it as engineering
  validation);
- `wetness`/`debris`: subtle dark water in the void, edge staining, or a few
  non-blocking leaves; never cover the bars with opaque clutter by default.

## Materials, frame, and seating

Official standard-plan libraries show the frame and grate as coordinated
assemblies rather than unrelated pieces. WSDOT publishes separate rectangular
frames, ADA grates, vaned and herringbone grates, circular grates, catch-basin
grate inlets, and welded/dual-vaned grate details. [WSDOT Standard Plans](https://wsdot.wa.gov/engineering-standards/all-manuals-and-standards/standard-plans)

Model the assembly with named layers:

1. pavement/concrete surround (slightly larger footprint, low roughness);
2. cast frame with broad outer flange and a recessed seating ledge;
3. dark catch-basin void or tray below the opening;
4. grate plate and bars/vanes with a small positive height above the void;
5. optional hinges, locking tabs, or lifting recesses on one short edge;
6. curb face and sill when the selected inlet includes a curb opening.

Ductile iron/cast iron should have high metalness and a rough, charcoal finish;
wetness can lower roughness and add a restrained dark sheen. Keep the void
nearly black but not pure black so the depth remains visible under studio
lighting. Avoid coplanar “painted” bars on the grate face: use shallow solid
bars or a single clipped mesh with explicit separation from the grate plate.

## 2D/floorplan guidance

The plan symbol should communicate drainage direction and inlet family at a
glance:

- draw the outer frame and a smaller inner opening/void;
- draw the selected pattern with the same bar count, angle, and clipping as the
  3D model (a simplified line version is acceptable at small scale);
- show a curb slot as a bold short rectangle/line on the curb side;
- for a sweeper combination, extend the curb slot upstream in the node's local
  coordinate system;
- add a subtle flow arrow or direction tick only if the UI already supports
  orientation cues; avoid non-visual legends that do not alter the geometry;
- preserve node rotation, with selection highlighting framing the whole inlet;
- keep optional safety/clearance overlays off by default so the symbol remains
  compact in a dense plan.

## Recommended Pascal implementation sequence

1. Centralize an inlet layout resolver that returns frame dimensions, opening
   dimensions, curb-slot length/offset, bar endpoints, flow direction, and
   explicit depth layers.
2. Implement and test four visible presets: grate, equal-combination,
   sweeper-combination, and curb-opening (reserve slotted drain for a later
   dedicated elongated asset).
3. Replace unbounded bar boxes with clipped/inset bars for bicycle-safe,
   parallel, reticuline, bi-directional, and curved-vane patterns.
4. Add frame seating, underside void, curb sill, and optional hinge/lock cues;
   keep wetness and surface-condition styling visual and reversible.
5. Render every setting through the same resolver in 3D and floorplan, then
   exercise the side-menu matrix for all inlet types, patterns, dimensions,
   curb heights, colors, wetness, and node rotations.
6. Verify no bars overlap the frame, no coplanar surfaces z-fight, and no
   combination variant silently uses the wrong curb-slot length or direction.

## Sources

- [FHWA PDDM Chapter 7 — Hydrology and Hydraulics](https://highways.fhwa.dot.gov/sites/fhwa.dot.gov/files/Chapter_07.pdf)
- [FHWA University Course, Lesson 14 — Shared Roadways / Drainage Grates](https://www.fhwa.dot.gov/publications/research/safety/pedbike/05085/chapt14.cfm)
- [Caltrans Highway Design Manual, Chapter 830 — Highway Drainage](https://dot.ca.gov/-/media/dot-media/programs/design/documents/chp0830-a11y.pdf)
- [Caltrans Highway Design Manual, Chapter 1000 — Bicycle Transportation](https://dot.ca.gov/-/media/dot-media/programs/design/documents/chp1000-a11y.pdf)
- [WSDOT Standard Plans — drainage frames and grate families](https://wsdot.wa.gov/engineering-standards/all-manuals-and-standards/standard-plans)
- [FHWA HIF-24-006 — Bicycle and Pedestrian Safe Drainage Grates](https://www.fhwa.dot.gov/engineering/hydraulics/pubs/hif24006.pdf)
