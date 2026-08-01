# Outdoor Lamp and Street-Light Taxonomy

This is a model-planning taxonomy for the Pascal Environment plugin. It is
intended to be comprehensive for roads, sidewalks, parks, plazas, parking
areas, and other public-realm scenes—not for every architectural or theatrical
light ever manufactured.

## Terminology

In everyday speech, “lamp” often means the entire object. Technically, FHWA
defines a **lamp** as the artificial light source, while a **luminaire** is the
complete lighting unit that holds, protects, powers, and distributes light.
The visible street object is an assembly of base, pole/support, bracket or arm,
and luminaire. [FHWA glossary](https://highways.dot.gov/safety/other/visibility/fhwa-lighting-handbook-august-2012/glossary-terms)
The plugin should therefore name catalog items by their recognizable assembly
archetype, not only by bulb technology.

There is no single official worldwide list of street-light shapes. FHWA treats
pole type, height, arm length, luminaire type, optical distribution, and layout
as separate choices. Its examples of luminaire type include cobra head,
decorative, tunnel, and wall pack. [FHWA Lighting Handbook 2023](https://highways.dot.gov/sites/fhwa.dot.gov/files/2023-05/FHWA-Lighting-Handbook_0.pdf)
The UK road inventory similarly records the support and mounting independently,
with single, double, triple, catenary, post-top, and wall-mounted brackets.
[UK Road Maintenance Management System, pp. 147–150](https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/580373/Annex_B.pdf)

## Core physical archetypes worth representing as models

### Roadway and large-area lighting

1. **Modern side-entry roadway light** — a tapered LED head on a horizontal,
   upswept, or gently curved arm. This is the plugin's existing model.
2. **Classic cobra-head street light** — the familiar rounded, swollen fixture
   on a straight mast arm, with either a flat or drop lens. It creates a visibly
   older mid-/late-20th-century streetscape than a thin modern LED head.
3. **Davit light** — a pole whose shaft bends or sweeps directly over the road;
   this can share the modern head but needs a distinctive continuous pole
   silhouette. NYC currently recognizes Davit and Octagonal poles as standard
   city-street supports. [NYC Street Design Manual: Lighting](https://www.nycstreetdesign.info/index.php/lighting)
4. **Truss- or decorative-bracket roadway light** — a long outreach supported
   by a brace/truss, common on broad or period streets. FHWA lists davit,
   mast-arm, and truss-style lighting as conventional roadway choices.
   [FHWA lighting applications](https://highways.dot.gov/safety/other/visibility/fhwa-lighting-handbook-august-2012/7-lighting-application)
5. **Twin/double-arm median light** — two opposing roadway heads on one pole;
   important for divided roads and also useful as a parameterized variant of
   the current model. NYC's Type M and Flatbush systems allow twin mounting,
   including on center medians. [NYC Type M](https://www.nycstreetdesign.info/lighting/type-m),
   [NYC Flatbush Avenue](https://www.nycstreetdesign.info/index.php/node/1907)
6. **Triple or four-way area pole** — several heads around one support for
   junctions, plazas, and parking areas. “Triple” is an explicit bracket class
   in the UK road-lighting inventory. [UK RMMS, pp. 147–150](https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/580373/Annex_B.pdf)
7. **High-mast crown** — a very tall pole with a circular or polygonal cluster
   of flood/road luminaires, used for interchanges and very large areas. FHWA's
   training distinguishes cobra-head, post-top, and high-mast forms and notes
   that high masts commonly carry multiple luminaires on poles around 100 feet
   or more. [FHWA Roadway Lighting Workshop, Module 2](https://highways.dot.gov/sites/fhwa.dot.gov/files/Module2Workbook.pdf)
8. **Parking/area “shoebox” pole** — a broad rectangular area luminaire, singly
   or in back-to-back clusters, generally shorter and visually different from a
   high-mast crown. DOE treats pole/arm-mounted area and roadway luminaires as
   an exterior-lighting category. [DOE exterior-lighting guidance](https://www.energy.gov/cmei/femp/purchasing-energy-efficient-exterior-lighting)
9. **Floodlight pole** — one or more visibly tilted projector heads, suitable
   for yards, façades, small sports areas, construction sites, and security
   lighting. DOE treats floodlight luminaires as a separate exterior category.
   [DOE exterior-lighting guidance](https://www.energy.gov/cmei/femp/purchasing-energy-efficient-exterior-lighting)

### Pedestrian, park, and decorative lighting

10. **Modern pedestrian post-top** — a shorter human-scale pole with the
    luminaire centered directly above it; common shapes include disc, cap,
    cylinder, and downward-facing “hat.” FHWA describes post-tops as lower,
    pedestrian-scale luminaires and notes that they may distribute light around
    the pole or in a chosen direction. [FHWA Roadway Lighting Workshop, Module 2](https://highways.dot.gov/sites/fhwa.dot.gov/files/Module2Workbook.pdf)
11. **Traditional post-top lantern** — a glazed four- or six-sided lantern on a
    fluted or decorative column, sometimes called Victorian or heritage style.
    This is a different silhouette from a modern post-top even when both use
    LEDs internally. NYC explicitly separates standard and historic/distinctive
    lighting families. [NYC selection criteria](https://www.nycstreetdesign.info/lighting/selection-criteria-design-review-process)
12. **Globe/acorn post-top** — a spherical or acorn-shaped translucent bowl on
    a decorative column. Treat this as its own visual model because the glowing
    bowl dominates both daytime silhouette and night appearance.
13. **Pendant teardrop on crook** — a hanging teardrop luminaire under a curved
    Bishop's Crook, reverse-scroll, or mast arm. NYC documents Bishop's Crook as
    a historic teardrop system and also records façade-mounted bracket versions.
    [NYC Bishop's Crook](https://www.nycstreetdesign.info/lighting/bishops-crook)
14. **Decorative candelabra** — two, three, or four lanterns on scroll arms,
    appropriate to plazas, promenades, parks, and ceremonial streets. It can
    reuse a traditional lantern head but requires a separate multi-arm crown.
15. **Path/garden light** — a short post, usually with a mushroom, hat, or
    louvered head, intended for footpaths and planting rather than roadway
    coverage. Manufacturer catalogs distinguish pathway/garden, post-top, road,
    wall, and flood applications. [Signify solar outdoor portfolio](https://www.signify.com/global/prof/outdoor-luminaires/solar/SMC_SOLAR_CA/category)
16. **Bollard light** — a knee- to waist-height cylinder or rectangular post
    with shielded slots or a luminous cap. It is distinct enough in scale and
    placement behavior to be a separate node. DOE treats bollards as a separate
    exterior-lighting category. [DOE exterior-lighting guidance](https://www.energy.gov/cmei/femp/purchasing-energy-efficient-exterior-lighting)

### Support-free and structure-mounted lighting

17. **Catenary/suspended street light** — a luminaire hung from a cable over the
    roadway, with support cables/anchors instead of a pole at the light's point.
    Catenary is an official mounting class in the UK inventory, and current road
    luminaires are offered in wire-suspended configurations.
    [UK RMMS, pp. 147–150](https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/580373/Annex_B.pdf),
    [Signify Copenhagen LED](https://www.signify.com/global/prof/outdoor-luminaires/urban/signify-copenhagen-led-gen2-large-mega/LP_CF_BDS562_EU/family)
18. **Wall-arm street light** — a roadway or lantern head projected from a
    building façade on a decorative or plain arm. It can reuse a head from
    another archetype, but placement, cabling, floorplan behavior, and support
    geometry differ.
19. **Wall pack/bulkhead** — a compact surface-mounted housing with no outreach
    arm, used on building exteriors, alleys, service areas, and underpasses.
    FHWA includes wall pack among luminaire types; DOE separately recognizes
    outdoor wall-mounted luminaires. [FHWA Lighting Handbook 2023](https://highways.dot.gov/sites/fhwa.dot.gov/files/2023-05/FHWA-Lighting-Handbook_0.pdf),
    [DOE exterior-lighting guidance](https://www.energy.gov/cmei/femp/purchasing-energy-efficient-exterior-lighting)
20. **Tunnel/underpass luminaire** — a robust ceiling- or wall-mounted linear or
    rectangular unit. FHWA treats tunnel as a luminaire type and explains that
    tunnel/underpass lighting has application-specific requirements.
    [FHWA roadway-lighting appendix](https://highways.dot.gov/safety/other/visibility/roadway-visibility-research-needs-assessment/appendix-roadway-lighting)
21. **Canopy/soffit light** — a recessed or surface square/round fixture under
    transit, fuel, parking, or building canopies. DOE separately categorizes
    canopy and parking-garage luminaires. [DOE exterior-lighting guidance](https://www.energy.gov/cmei/femp/purchasing-energy-efficient-exterior-lighting)
### Power-specific visible archetype

22. **Solar street light** — either an all-in-one head containing panel,
    battery, controller, and LED, or an all-in-two design with a separately
    angled panel. Solar is fundamentally a power-source option, but the panel
    and battery create enough visible geometry to justify a model family.
[Signify GreenVision all-in-one datasheet](https://www.signify.com/api/assets/v1/file/Signify/content/LP_CF_9268961_EU.en_HK.PROF.CF/GreenVision_All-in-one_Solar_Street_Light.pdf),
[Signify solar configurations](https://www.signify.com/global/prof/outdoor-luminaires/solar/SMC_SOLAR_CA/category)

## Implementation status

All 22 research archetypes are represented in the plugin catalog. The modern
side-entry and davit forms share `environment:street-light`; the remaining
forms have dedicated node kinds. Each kind has shared parametric placement,
preview, rendering, floorplan, and off-by-default lamp controls, while related
silhouettes reuse the same housing and support primitives.

The legacy roadway entries keep their separate node kinds, side-menu cards, and
thumbnails, but their implementation is shared through
`src/roadway-lamp-primitives.tsx`: one cobra-head fixture/light assembly,
reusable base and mast segments, and common material/selection behavior. The
street, twin-arm, multi-head, and truss entries only provide their distinctive
arm layout around those primitives.

The implementation uses a common 6 m installation-height default and a shared
0.5–30 m height range for every lamp node. Similar silhouettes are grouped into
roadway/area heads, post-top/civic heads, path-scale fixtures, and
structure-mounted fixtures; the catalog style control swaps those related
visuals without requiring a separate geometry implementation.

Every structure-mounted style includes the same reusable vertical pole/base
support, while its catenary, wall, tunnel, or canopy attachment remains style-specific.

String/festoon lights, façade wash lights, illuminated handrails, step lights,
tree lights, and seasonal decorative lighting are useful later environment
effects, but they are systems or architectural accessories rather than the next
street-lamp model.

## Do not turn these orthogonal choices into duplicate models

These should usually be inspector parameters, presets, or interchangeable
subcomponents:

- **Light source:** LED; high- or low-pressure sodium; metal halide; mercury
  vapor; fluorescent; induction; older incandescent/gas appearance. DOE notes
  that exterior fixtures have used HID (including HPS and metal halide),
  fluorescent, induction, and LED technologies. Source choice mainly changes
  the emitter/lens, color, startup/flicker behavior, and historic context—not
  the whole support. [DOE exterior-lighting guidance](https://www.energy.gov/cmei/femp/purchasing-energy-efficient-exterior-lighting)
- **Power:** mains, standalone solar, or solar/grid hybrid. Only visibly exposed
  solar hardware requires geometry.
- **Head count:** single, opposing double, parallel double, triple, or quad.
- **Mounting:** post-top, side-entry, straight arm, curved/davit, pendant,
  wall-arm, surface/wall, catenary, or ceiling.
- **Pole:** round, tapered, octagonal, fluted, straight, stepped, wood/utility,
  breakaway, hinged, or decorative cast base.
- **Height/application scale:** pedestrian/path, residential street, arterial,
  parking/area, or high mast.
- **Photometric distribution:** I–V lateral pattern, short/medium/long throw,
  symmetric/asymmetric, shielding, and backlight/uplight/glare. FHWA explicitly
  treats distribution as photometric behavior rather than housing taxonomy.
  [FHWA Roadway Lighting Workshop, Module 2](https://highways.dot.gov/sites/fhwa.dot.gov/files/Module2Workbook.pdf)
- **Style/era:** contemporary, mid-century/utilitarian, Art Deco, Victorian/
  heritage, or region-specific. These can swap pole, arm, and head kits.
- **Finish and condition:** galvanized, painted, powder-coated, weathered,
  rusty, stickered, damaged, missing access door, lamp off, or flickering.
- **Controls:** photocell, time schedule, dimming profile, motion/presence
  sensor, network controller, and remote monitoring. DOE documents both
  photocell-like external controllers and networked outdoor control systems.
  [DOE control primer](https://www.energy.gov/sites/prod/files/2015/09/f26/ssl_outdoor-lighting-control-tech-primer_0.pdf),
  [DOE networked-control specification](https://www.energy.gov/cmei/ssl/model-specification-networked-outdoor-lighting-control-systems)
- **Smart-pole accessories:** camera, environmental sensor, speaker, Wi-Fi/5G
  radio, EV charger, display, emergency button, banner, traffic signal, or sign.
  These are attachments to a support, not new lamp types.

## Recommended build order after the existing model

1. **Modern pedestrian post-top** — best next model. It provides the largest
   immediate contrast in scale, silhouette, placement context, and light spread
   without requiring a historical style system. Suggested defaults: 4 m tall,
   centered disc/hat head, downward symmetric light, optional shield.
2. **Heritage Bishop's Crook with pendant teardrop** — adds a strong period
   silhouette and establishes reusable decorative pole/arm components.
3. **Classic cobra-head on straight mast arm** — supports older contemporary,
   industrial, suburban, and North American street scenes.
4. **Twin-arm median variant** — high scene value for relatively little new
   geometry; reuse the current pole and head with opposing arms.
5. **Solar roadway light** — add both integrated all-in-one and separate-panel
   presets after the shared pole/head system is stable.
6. **Bollard/path light** — extends lighting from roads to sidewalks, parks, and
   plazas and needs different placement/height constraints.
7. **High-mast crown** — important for interchanges and large parking/industrial
   scenes, with a configurable ring of heads.
8. **Catenary light** — requires a two-anchor span/cable placement system, so it
   should follow simpler point-placed models.
9. **Wall-arm, wall pack, tunnel, and canopy families** — defer until the host
   supports reliable wall/ceiling attachment and orientation.
10. **Area/flood poles and decorative candelabra** — useful breadth after the
    core street and pedestrian families are covered.

The first five families cover the strongest roadway silhouettes. Architecturally,
they should share a small library of poles, bases, arms, heads, lenses, emitters,
and controls rather than becoming five unrelated implementations.

## Primary sources

- [FHWA Lighting Handbook 2023](https://highways.dot.gov/sites/fhwa.dot.gov/files/2023-05/FHWA-Lighting-Handbook_0.pdf)
- [FHWA Roadway Lighting Workshop, Module 2](https://highways.dot.gov/sites/fhwa.dot.gov/files/Module2Workbook.pdf)
- [FHWA Lighting Handbook: applications](https://highways.dot.gov/safety/other/visibility/fhwa-lighting-handbook-august-2012/7-lighting-application)
- [UK Road Maintenance Management System, road-lighting inventory](https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/580373/Annex_B.pdf)
- [NYC Street Design Manual: Lighting](https://www.nycstreetdesign.info/index.php/lighting)
- [U.S. DOE exterior-lighting purchasing guidance](https://www.energy.gov/cmei/femp/purchasing-energy-efficient-exterior-lighting)
- [U.S. DOE networked outdoor lighting controls](https://www.energy.gov/cmei/ssl/model-specification-networked-outdoor-lighting-control-systems)
- [Signify road, urban, and solar luminaire portfolios](https://www.signify.com/global/prof/outdoor-luminaires/road-and-street/SMC_NROADLUM_CA/category)
