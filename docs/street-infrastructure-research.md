# Street Infrastructure Asset Research

This note scopes three visually important asset families for the Pascal
Environment plugin: vehicle traffic-control hardware, surface-drainage
hardware, and fire hydrants. It is a model-planning reference, not an
engineering design standard. Real installations must follow the owning road,
water, and fire authority's current requirements.

The central implementation recommendation is to model each family as a small
kit of interchangeable visible parts. Mounting, indication state, finish,
regional convention, and weathering are mostly parameters; they should not
become unrelated node kinds.

## Recommended first catalog

Build these four entries first:

1. **Vehicle traffic signal** — a North American three-section vertical
   red/yellow/green head with visors, optional backplate, and a choice of
   roadside post or single mast-arm support.
2. **Road drainage inlet** — a rectangular bicycle-safe gutter grate with an
   optional curb-opening/combination-inlet back.
3. **Manhole cover** — a flush circular cast-metal cover and frame with a
   configurable utility legend and tread pattern.
4. **Fire hydrant** — a two-piece breakaway dry-barrel post hydrant with two
   hose nozzles, one pumper nozzle, capped outlets, and configurable paint.

These four silhouettes cover the most recognizable street scene while still
establishing reusable primitives for later regional variants.

## 1. Vehicle traffic signals and control hardware

### Meaningful visible types

#### Signal faces

- **Three-section circular face:** the default stop-and-go head. The current
  U.S. MUTCD normally permits three-, four-, or five-section faces, with signal
  sections in a vertical or horizontal straight line. It requires red above
  yellow and green in a vertical face, or red to their left in a horizontal
  face. [FHWA MUTCD 11th edition with Revision 1, Sections 4E.03–4E.05](https://highways.dot.gov/media/151331)
- **Separate turn face:** use three-section red/yellow/green arrows for a fully
  protected turn and a four-section face when a flashing yellow arrow is
  required for a permissive turn. Arrow direction is meaningful geometry, not
  merely color; the MUTCD defines straight, left/right turn, and U-turn arrow
  directions and documents the relative positions of arrow indications.
  [FHWA MUTCD 11th edition with Revision 1, Sections 4E.01 and 4F.02–4F.15](https://highways.dot.gov/media/151331)
- **Combined or clustered face:** useful later for older or locally distinctive
  installations. The MUTCD permits limited same-color clusters but treats a
  vertical or horizontal straight line as the normal arrangement.
  [FHWA MUTCD 11th edition with Revision 1, Sections 4E.03–4E.05](https://highways.dot.gov/media/151331)
- **Flashing beacon:** a single or paired red/yellow indication used with an
  intersection, warning, speed-limit, or stop application. The MUTCD treats
  flashing beacons as a separate family with 8- or 12-inch indications.
  [FHWA MUTCD 11th edition with Revision 1, Chapter 4S](https://highways.dot.gov/media/151331)
- **Hybrid beacon and lane-use signals:** visually strong but specialized later
  assets. A U.S. pedestrian hybrid beacon has two horizontal red indications
  above one centered yellow indication; lane-use control uses symbols such as a
  green down arrow and red X. [FHWA MUTCD 11th edition with Revision 1, Sections 4J.02 and 4T.03](https://highways.dot.gov/media/151331)

#### Supports and attachments

- **Roadside post:** a simple pole with one or more bracket-mounted faces. This
  should be the lowest-complexity placement option.
- **Mast arm:** a rigid pole-and-arm assembly carrying one or more overhead
  faces, often with street-name signs, a luminaire, or a detector attached.
- **Span wire:** cable-suspended faces between poles. This needs two-anchor
  placement and visible cable sag, so it should follow the mast-arm version.
- **Combined signal-and-lighting standard:** reuse the plugin's lighting heads
  and arm primitives on a signal pole instead of creating a duplicate pole.
- **Portable trailer signal:** a temporary, self-contained signal with an
  adjustable shaft, overhead arm, controller, communication equipment, and
  primary/backup power. Caltrans requires at least two vertically arranged
  12-inch heads on its portable unit, one on the shaft and one on the mast arm.
  [Caltrans 2024 Standard Specifications, Section 12](https://dot.ca.gov/-/media/dot-media/programs/design/documents/2024_stdspecs-locked-a11y.pdf)

Caltrans' current standard-plan index confirms that permanent installations
are assembled from separate signal-head mountings, controller-cabinet pads,
detectors, poles, mast arms, span-wire poles, pull boxes, and attachments. That
is a useful precedent for a modular plugin kit rather than a single monolithic
intersection model. [Caltrans 2024 Standard Plans, sheets ES-3 through ES-19](https://dot.ca.gov/programs/design/2018-ccs-standard-plans-and-standard-specifications/2024-standard-plans-toc)

#### Visually important accessories

- **Visors/hoods:** include tunnel, cap, and open-bottom silhouettes as a style
  control. FHWA recommends visors to aim the indication and reduce false
  illumination caused by sunlight. [FHWA MUTCD 11th edition with Revision 1, Section 4D.06](https://highways.dot.gov/media/151331)
- **Backplate:** an optional dull-black target board around the face. A yellow
  retroreflective perimeter strip may be 1–3 inches wide in U.S. practice.
  [FHWA MUTCD 11th edition with Revision 1, Section 4D.06](https://highways.dot.gov/media/151331)
- **Controller cabinet and concrete pad:** a roadside weatherproof enclosure is
  a scene-visible part of the system, not just decoration. FHWA describes the
  cabinet as the enclosure for the controller, conflict monitor, detector rack,
  load switches, flashers, and power supply. [FHWA Traffic Signal Program Handbook, “Traffic Signal Cabinet”](https://highways.dot.gov/media/89711)
- **Detection camera/radar and pre-emption sensor:** later pole attachments.
  **Inductive loops and piezoelectric sensors should not be catalog cards**;
  they are mostly pavement markings/cuts and belong to the behavior or road
  system. Caltrans separates loop detectors, other detectors, and signal-head
  mountings in its plan set. [Caltrans 2024 Standard Plans, sheets ES-4 and ES-5](https://dot.ca.gov/programs/design/2018-ccs-standard-plans-and-standard-specifications/2024-standard-plans-toc)

### Essential scale anchors

- New U.S. vehicle faces normally use **12-inch (305 mm) circular and arrow
  indications**. Eight-inch circular indications remain allowed only in the
  specific exceptions listed by the MUTCD; 4-inch indications are reserved for
  bicycle faces. [FHWA MUTCD 11th edition with Revision 1, Section 4E.02](https://highways.dot.gov/media/151331)
- A U.S. face over any motor-vehicle portion of a highway has at least **15 ft
  (4.57 m)** clearance to the bottom of the housing. A roadside face has at
  least **8 ft (2.44 m)** clearance above a sidewalk or roadway reference grade.
  The recommended maximum top-of-housing height over a roadway is **25.6 ft
  (7.80 m)**. [FHWA MUTCD 11th edition with Revision 1, Section 4D.09](https://highways.dot.gov/media/151331)
- The UK permanent-head diagram uses a compact **200 mm aspect** and normally
  mounts a roadside head with at least **2.1 m** clearance below the assembly.
  The standard roadside installation permits the amber center up to 4 m; an
  overhead installation places it in the 6.1–9 m range. [UK Department for Transport, Traffic Signs Manual Chapter 6, Figure 3-5](https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/851465/dft-traffic-signs-manual-chapter-6.pdf)

The plugin values should be visually representative defaults. They must not be
presented as a signal-design or clearance calculator.

### Regional variation that changes the model

- **U.S./MUTCD pack:** 12-inch three-section vertical face, optional horizontal
  orientation, arrow faces, dull-black backplate, and roadside, mast-arm, or
  span-wire mounting. U.S. rules require at least two primary faces for a
  signalized through movement on an approach. [FHWA MUTCD 11th edition with Revision 1, Sections 4D.05 and 4E.02–4E.05](https://highways.dot.gov/media/151331)
- **UK pack:** smaller vertical head, primary signal near the stop line on the
  left side of the approach, and a secondary signal commonly on the opposite
  side. UK guidance normally calls for a primary signal on the left and a
  secondary on the right, uses a red-and-amber phase before green, and permits
  a black backing board with an optional white or retroreflective border.
  [UK Department for Transport, Traffic Signs Manual Chapter 6, Sections 3.1–3.4](https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/851465/dft-traffic-signs-manual-chapter-6.pdf),
  [UK Highway Code traffic signals](https://www.gov.uk/government/publications/know-your-traffic-signs/traffic-signals)
- **Color and finish:** housing, pole, and cabinet colors are agency choices.
  Keep them configurable rather than claiming a worldwide yellow, black, gray,
  or striped default.

### Minimum first implementation

Create one `environment:traffic-signal` family with:

- `mount`: `post | mast-arm | span-wire`;
- `headLayout`: `three-section | three-section-turn | four-section-turn | five-section-cluster`;
- `headCount`: one or two overhead heads, with per-head offset along the arm;
- `backplate`: off, black, or black with reflective border;
- `signalState`: red, yellow, green, flashing-yellow, green-arrow, or dark;
- `visorStyle`: cap, tunnel, or none, plus configurable red, yellow, and green lens colors;
- support finish, housing finish, and support geometry;
- optional cabinet, luminaire, street-name sign, and detector attachment points;
- named anchors for later pedestrian heads, push buttons, span wires, and road
  lane alignment.

The visual model should light only the active LED disc or arrow while retaining
a dark lens texture on inactive indications. Floorplan output needs the pole
base, mast-arm reach, head locations, and cabinet footprint, not internal
electronics.

### Later variants

1. Horizontal and clustered faces.
2. UK compact head and left-side primary/secondary placement preset.
3. Span-wire system with two poles and sagging support/messenger cables.
4. Signal-and-lighting combination pole.
5. Detector camera/radar, emergency pre-emption receiver, and larger cabinet
   styles.
6. Portable trailer signal.
7. Flashing beacon, pedestrian hybrid beacon, and lane-use signal families.

## 2. Drainage grates, inlets, and manhole covers

### Meaningful visible inlet types

FHWA's current HEC-22 groups road inlets into four visually useful classes:

1. **Grate inlet:** a rectangular opening in the gutter covered by bars or a
   lattice. Use transverse/reticuline or otherwise bicycle-safe openings near
   cycle traffic; FHWA warns that inlets in vehicle, pedestrian, and bicycle
   paths need grates that do not trap users or wheels.
   [FHWA HEC-22, Chapter 7](https://www.fhwa.dot.gov/engineering/hydraulics/pubs/hif24006.pdf),
   [FHWA drainage-feature safety guidance](https://highways.dot.gov/safety/local-rural/maintenance-drainage-features-safety/iv-correcting-unsafe-drainage-features)
2. **Curb-opening inlet:** a vertical slot in the curb with no grate in the
   wheel path. HEC-22 says curb openings are less susceptible to clogging than
   grates and create little traffic interference; it gives **4–6 inches
   (102–152 mm)** as a typical maximum opening height.
   [FHWA HEC-22, Section 7.2.2](https://www.fhwa.dot.gov/engineering/hydraulics/pubs/hif24006.pdf)
3. **Combination inlet:** a grate plus curb opening. The curb opening catches
   debris and reduces grate-clogging potential; a “sweeper” version extends the
   curb opening upstream of the grate.
   [FHWA HEC-22, Section 7.2.4](https://www.fhwa.dot.gov/engineering/hydraulics/pubs/hif24006.pdf)
4. **Slotted or grated line drain:** a narrow continuous slot or trench across
   a broad area. HEC-22 notes that a slot can intercept flow across a wide
   section but is vulnerable to sediment/debris clogging. Caltrans separately
   standardizes slotted pipes and grated line drains, including a 4-inch nominal
   polymer-concrete line-drain family.
   [FHWA HEC-22, Section 7.2.3](https://www.fhwa.dot.gov/engineering/hydraulics/pubs/hif24006.pdf),
   [Caltrans 2024 Standard Plans, sheets D98A–D98J](https://dot.ca.gov/programs/design/2018-ccs-standard-plans-and-standard-specifications/2024-standard-plans-toc)

These types may be flush or installed in a visibly depressed gutter. Caltrans'
current plans explicitly separate cast-in-place and precast inlet bodies,
multiple grate families, grate details, and gutter/inlet depressions; those
construction differences can share the same surface model in Pascal.
[Caltrans 2024 Standard Plans, sheets D72–D78](https://dot.ca.gov/programs/design/2018-ccs-standard-plans-and-standard-specifications/2024-standard-plans-toc)

### Grate patterns worth modeling

- **Transverse-bar / bicycle-safe:** best general default because it reads
  clearly at scene scale and avoids long wheel-catching slots.
- **Reticuline/lattice:** a dense rectangular grid, useful as a second style.
- **Parallel longitudinal bars:** visually common in restricted/non-cycle
  contexts but should not be the default near bike routes.
- **Curved-vane grate:** adds a directional industrial pattern and should expose
  a rotation control because grate orientation affects how the asset reads.
- **Decorative cast grate:** tree-lined or historic district pattern, deferred
  until the functional catalog is stable.

FHWA's current HEC-22 calculations distinguish parallel-bar, modified
parallel-bar, curved-vane, and reticuline grate geometries, so these are useful
surface-pattern presets rather than invented ornament.
[FHWA HEC-22, Chapter 7](https://www.fhwa.dot.gov/engineering/hydraulics/pubs/hif24006.pdf)

### Manhole and access-cover types

- **Circular solid cover:** the first model. Include frame ring, shallow bevel,
  lift/key holes, anti-slip relief, and an embossed utility legend. NYC's sewer
  standard uses a **27-inch (686 mm)** cast-iron frame and cover as its current
  standard, demonstrating a credible North American scale anchor.
  [NYC DEP Sewer Design Standards, September 2025](https://www.nyc.gov/assets/ddc/downloads/publications/NYCDEPSEWERDESIGNSTANDARDS_RevisedSep2025.pdf)
- **Square/rectangular cover:** important for UK and utility-vault scenes.
- **Recessed paver/infill cover:** a metal perimeter frame filled with matching
  paving, leaving lift points and seams visible. Birmingham City Council keeps
  a dedicated standard detail for a single-leaf pavior-infill cover, confirming
  that this should be a distinct visual style rather than a texture on a solid
  plate. [Birmingham City Council drainage standard drawings, HW5.04](https://www.birmingham.gov.uk/downloads/download/616/standard_detail_drawings_series_500_drainage)
- **Twin-leaf or large vault cover:** later utility/plant-room access asset.

Do not hard-code “SEWER” into the mesh. Storm, sanitary, water, gas, electric,
telecom, and local authority marks should be interchangeable embossed decals
or shallow geometry. A blank generic option avoids false regional specificity.

### Regional variation that changes the model

- **North American street pack:** circular manhole cover plus rectangular
  gutter grate, curb opening, or combination catch basin. Caltrans alone lists
  OS, OL, GOL, G1–G6, GT1–GT4, GO, and GDO inlet constructions, illustrating
  why the plugin should expose a few silhouettes rather than reproduce every
  agency construction code. [Caltrans 2024 Standard Plans, sheets D72–D74](https://dot.ca.gov/programs/design/2018-ccs-standard-plans-and-standard-specifications/2024-standard-plans-toc)
- **UK street pack:** compact kerbside road gully, square/rectangular hinged
  grating, square access cover, and paver-infill cover. UK highway authorities
  publish separate details for trapped road/footpath gullies, frames/covers,
  manholes, catchpits, and linear drainage.
  [Nottinghamshire County Council drainage standard drawings](https://www.nottinghamshire.gov.uk/transport/roads/highway-design-guide/standard-drawings),
  [Birmingham City Council drainage standard drawings](https://www.birmingham.gov.uk/downloads/download/616/standard_detail_drawings_series_500_drainage)
- **Finish:** cast iron/ductile iron, galvanized steel, stainless steel, polymer
  concrete, painted, rusted, wet, silted, leaf-covered, or surrounded by patched
  asphalt. Material and condition are parameters shared by all styles.

### Minimum first implementation

Create two node families rather than one oversized drainage node:

#### `environment:drainage-inlet`

- `inletType`: `grate | combination` initially;
- `gratePattern`: `bicycle-safe | reticuline | parallel | curved-vane`;
- width, length, frame depth, curb-opening height, gutter depression, and curb
  alignment;
- grate and frame materials, rust/wetness/silt controls, and optional leaf
  debris;
- snap/align to the road gutter edge, inherit the road crossfall visually, and
  expose a flow-direction arrow only in editor/debug mode;
- floorplan symbol showing the frame outline and grate direction.

#### `environment:manhole-cover`

- `shape`: `round` initially, with square reserved;
- diameter, ring width, tread pattern, utility legend, lift-hole pattern, and
  rotation;
- flush offset, surrounding patch ring, rust/wetness, and optional shallow
  puddle;
- snap to road/sidewalk surface without cutting a deep physical shaft;
- floorplan symbol using the true outer frame footprint.

### Later variants

1. Standalone curb-opening and upstream “sweeper” combination inlet.
2. Continuous slotted/trench drain with polyline placement.
3. UK hinged road gully.
4. Square, rectangular, twin-leaf, and paver-infill access covers.
5. Raised roadside/drop inlet and median inlet.
6. Decorative cast patterns and authored agency/utility legend packs.
7. Wet-weather behavior: pooled water, active runoff cues, blocked/grate-clogged
   state, and leaf/debris scatter.

## 3. Fire hydrants

### Meaningful visible types

#### Above-ground hydrants

- **Dry-barrel post hydrant:** the best first model and the dominant
  freeze-tolerant North American archetype. AWWA maintains the current C502-24
  standard specifically for dry-barrel hydrants, and its published scope covers
  post-type hydrants for all climates, including freezing conditions.
  [AWWA standards list](https://www.awwa.org/standards/standards-list/),
  [AWWA C502-24 scope](https://www.awwa.org/AWWA-Articles/awwa-comment-period-on-awwa-c502-dry-barrel-fire-hydrants/)
- **Wet-barrel hydrant:** usually a shorter, chunkier body with independently
  operated outlets and no tall dry standpipe. AWWA maintains C503-21 for wet
  barrels; Mueller describes its wet-barrel products as intended for
  non-freezing climates. [AWWA standards list](https://www.awwa.org/standards/standards-list/),
  [Mueller fire-protection product portfolio](https://www.muellercompany.com/sites/muellercompany.com/files/uploads/media/mueller_fire_protection_products_brochure_english_form_12999.pdf)
- **Monitor hydrant:** a taller/high-flow industrial variant with monitor-style
  hardware. Defer it to industrial and airfield packs. Mueller's current
  catalog distinguishes monitor-style dry- and wet-barrel variants from normal
  post hydrants. [Mueller hydrant drawings index](https://www.muellercompany.com/support/drawings/)
- **Small post/yard hydrant:** a one- or two-outlet dry-barrel silhouette for
  estates, parks, private sites, and utility functions. Mueller's current
  two-way post model uses one or two 2.5-inch hose nozzles.
  [Mueller 2-1/8-inch post hydrant](https://www.muellercompany.com/water-works/hydrants/fire-hydrants/muellerr-2-18-post-type-fire-hydrant/)

#### Flush and underground hydrants

- **Flush hydrant:** the operating equipment sits in a ground box with a lid;
  this is a distinct low-profile North American utility asset.
- **UK-style underground hydrant:** the visible scene element is normally a
  small cover marked `FH`, paired with a yellow `H` marker plate on a wall,
  fence, or short post. UK fire services describe the hydrant as below ground
  and connected by a standpipe when used.
  [Devon and Somerset Fire and Rescue Service hydrant guide](https://www.dsfire.gov.uk/safety/hydrants),
  [Northamptonshire Fire and Rescue Service hydrant guide](https://www.northantsfire.gov.uk/hydrants/)

The UK marker plate is visually important: the upper number denotes water-main
size and the lower number the distance to the hydrant; some plates add a
direction arrow. [Scottish Fire and Rescue Service hydrant identification](https://www.firescotland.gov.uk/contact-us/report-an-issue-with-a-fire-hydrant/),
[Avon Fire and Rescue Service hydrant guide](https://www.avonfire.gov.uk/safety/outdoors/fire-hydrant/)

### Reusable visible parts

- lower and upper barrel/body;
- ground flange and breakaway coupling/bolt ring;
- domed, faceted, or shallow bonnet;
- top operating nut and optional tamper-resistant cap;
- one or two hose nozzles plus optional larger pumper nozzle;
- threaded caps with optional chains;
- cast ribs, manufacturer/date panels, and body seams;
- optional guard posts/fenders, nearby valve-box cover, and reflective marker;
- paint by body, bonnet, and individual cap, plus chipped paint, rust, grime,
  wetness, and out-of-service bag.

A real current dry-barrel product provides a good modular reference: Mueller's
Super Centurion uses a post body, dry top, breakaway traffic feature, replaceable
operating nut options, and compression main valve. [Mueller Super Centurion](https://www.muellercompany.com/water-works/hydrants/fire-hydrants/super-centurionr/)

### Essential scale and placement anchors

- Treat outlet sizes as preset geometry. A small post hydrant can use one or
  two **2.5-inch (63.5 mm)** hose nozzles; full-size municipal models commonly
  add a visibly larger pumper nozzle. [Mueller post-hydrant product page](https://www.muellercompany.com/water-works/hydrants/fire-hydrants/muellerr-2-18-post-type-fire-hydrant/),
  [Mueller hydrant drawings index](https://www.muellercompany.com/support/drawings/)
- NYC's installation specification provides a credible municipal assembly
  reference: its new hydrants are two-piece breakaway dry-barrel types connected
  by a **6-inch (152 mm)** branch and 6-inch valve; nozzles face the curb at a
  45-degree angle and the breakaway system remains accessible at grade.
  [NYC DDC hydrant specification, Section 62.12](https://www.nyc.gov/assets/ddc/downloads/publications/infrastructure/SB_21-002_HYDRANTS_WITH%20ATTACHMENTS_SIGNED.pdf)

There is no justified universal exposed height, barrel diameter, nozzle count,
or curb offset. The model should ship with a visually plausible product-derived
default and let future regional packs replace the dimensional preset.

### Color is a regional/data layer, not a hydrant type

Do not make red, yellow, or blue into separate models. Authorities can use body,
bonnet, cap, or band colors for visibility, ownership, water-main size, flow,
or service status. For example, Jacksonville uses red public bodies with
flow-coded bands and yellow private hydrants, while Fresno uses bonnet color to
communicate water-main size and also identifies special high-pressure or
recycled-water hydrants by color. [City of Jacksonville hydrant program](https://jacksonvillenc.gov/755/Hydrants),
[City of Fresno hydrant information](https://www.fresno.gov/fire/prevention/fire-hydrant-information/)

Offer a common U.S. flow-marking preset—light blue, green, orange, and red
bonnet/caps in descending flow classes—but label it as an optional NFPA-style
visual preset, not a worldwide rule. Municipal implementations document those
four classes, while local barrel colors still differ.
[City of Aubrey technical construction specifications, Section 5](https://www.aubreytx.gov/DocumentCenter/View/1342/Aubrey-Technical-Construction-Standard-Specifications),
[City of Jacksonville hydrant program](https://jacksonvillenc.gov/755/Hydrants)

### Minimum first implementation

Create `environment:fire-hydrant` with:

- `barrelType`: `dry` initially, with `wet` and `underground` reserved;
- `outletLayout`: `two-hose-one-pumper | two-hose | one-hose`;
- interchangeable bonnet, barrel, cap, nut, and flange primitives;
- breakaway flange visible at grade;
- body, bonnet, and cap colors controlled independently;
- cap chains optional because they add visual noise and geometry cost at a
  distance;
- weathering, rust, chipped paint, wetness, and out-of-service bag states;
- optional valve-box cover, reflective marker, and two protective bollards;
- nozzle-direction and curb-facing rotation controls;
- floorplan footprint including body and optional guards.

### Later variants

1. Wet-barrel hydrant for warm-climate/West Coast scenes.
2. UK underground `FH` cover plus configurable yellow marker plate/post.
3. Flush ground-box hydrant.
4. Small post/yard hydrant.
5. Industrial monitor hydrant.
6. Historic decorative castings and city-specific body kits.
7. Smart/monitoring cap, tamper-resistant nut, guard posts, and winter marker
   pole accessories.

## Shared implementation sequence

1. **Shared asset conventions:** establish scale units, surface offsets,
   selection materials, wetness/rust controls, LOD rules, and floorplan output.
2. **Traffic-signal primitives:** pole/base, mast arm, head housing, visor, LED
   disc/arrow, backplate, brackets, and attachment anchors.
3. **Traffic-signal node:** property schema, preview, render, state switching,
   post and mast-arm placement, cabinet option, thumbnail, and catalog card.
4. **Drainage-inlet primitives:** frame, four grate patterns, curb opening,
   gutter depression, and surface-conforming placement.
5. **Drainage-inlet node:** road-edge alignment, condition controls, floorplan,
   thumbnail, and catalog card.
6. **Manhole-cover node:** circular frame/cover, tread/legend system, patch ring,
   surface offset, condition controls, floorplan, thumbnail, and catalog card.
7. **Hydrant primitives and node:** modular body/bonnet/outlets/caps/flange,
   independent colors, curb-facing rotation, accessories, floorplan, thumbnail,
   and catalog card.
8. **Scene integration:** sensible default placement beside existing roads,
   sidewalks, curbs, and crossings; verify scale beside vehicles and people.
9. **Visual QA:** day/night signal legibility, inactive-lens appearance,
   wet/dry drainage materials, shallow z-fighting resistance, hydrant scale,
   thumbnails, and selection highlighting.
10. **Regional follow-up:** UK signal and underground-hydrant pack, horizontal
    signal faces, span wire, UK gullies/covers, and continuous trench drains.

## Primary sources

- [FHWA Manual on Uniform Traffic Control Devices, 11th edition with Revision 1](https://highways.dot.gov/media/151331)
- [FHWA Traffic Signal Program Handbook](https://highways.dot.gov/media/89711)
- [UK Department for Transport, Traffic Signs Manual Chapter 6](https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/851465/dft-traffic-signs-manual-chapter-6.pdf)
- [Caltrans 2024 Standard Plans](https://dot.ca.gov/programs/design/2018-ccs-standard-plans-and-standard-specifications/2024-standard-plans-toc)
- [FHWA HEC-22 Urban Drainage Design, fourth edition](https://www.fhwa.dot.gov/engineering/hydraulics/pubs/hif24006.pdf)
- [NYC DEP infrastructure design standards](https://www.nyc.gov/site/ddc/resources/publications.page)
- [AWWA standards list](https://www.awwa.org/standards/standards-list/)
- [Mueller fire-hydrant product and reference documents](https://www.muellercompany.com/support/drawings/)
- [UK fire-service hydrant identification guidance](https://www.dsfire.gov.uk/safety/hydrants)
