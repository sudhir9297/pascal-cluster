# Fire-Hydrant Visual Research

This note translates current water-utility standards, municipal installation
details, and first-party hydrant product documentation into visual guidance for
Pascal's `environment:fire-hydrant` asset. It is a modeling reference, not a
water-system design or fire-code compliance tool. Exact dimensions, colors,
threads, and placement are regional and should remain configurable.

## Recommended visual default

The most useful first preset is a North American **post-type dry-barrel
hydrant**:

- a cast-iron/ductile-iron lower barrel with a visible ground-line or traffic
  flange;
- a two-piece upper barrel with a shallow domed bonnet and a centered
  pentagonal operating nut;
- two smaller hose outlets and one visibly larger pumper outlet, all closed by
  threaded caps;
- short cap chains, gaskets, and a small wrench nut on each cap;
- a contrasting bonnet/cap color for flow capacity, while the barrel remains a
  high-visibility utility color;
- a breakaway traffic flange and a small concrete pad at grade;
- optional reflective marker, valve-box cover, guard posts, and out-of-service
  bag rather than permanently baked-in clutter.

Mueller's current Super Centurion is a representative dry-barrel product: its
post-type body, dry top, operating nut, traffic safety coupling, O-ring-sealed
flanges, field-replaceable nozzles, and dual drains are all documented product
features. [Mueller Super Centurion product page](https://www.muellercompany.com/water-works/hydrants/fire-hydrants/super-centurionr/),
[Mueller Super Centurion product datasheet](https://www.muellercompany.com/sites/muellercompany.com/files/uploads/media/mueller_super_centurion_datasheet.pdf)

The model should make the large pumper outlet easy to identify in a three-
quarter view. Default caps can face the camera at a modest angle, while a
`nozzleRotation` or `streetFacing` control can orient the pumper toward the
road/fire-lane. This is a visual affordance; it does not replace local
installation requirements.

## Hydrant types and what must change visually

### Dry barrel (freeze-protected)

In a dry-barrel hydrant the main valve is at the base. When closed, the exposed
barrel drains, leaving the above-ground body dry; when opened, the barrel is
pressurized. The visible result is a taller post with a bonnet, one top stem,
and a distinct ground-line/traffic flange. American Fire Control describes the
main valve, pressurization, and drain behavior for its AWWA C502 dry-barrel
product. [American Fire Control dry-barrel hydrant](https://american-afc.com/product/dry-barrel-hydrant/)

For Pascal, this should be the base preset for climates with freezing weather:

- lower barrel and shoe are one structural assembly below the breakaway flange;
- bonnet has a hold-down/weather seal and an operating nut, with an optional
  oil-fill plug;
- nozzle section sits above the flange and is separated by a seam or bolts;
- show a small drain-ring cue near the lower barrel only when the camera can
  see it; do not model a large open hole;
- give the body a subtle taper and a wider flange/shoe at grade rather than a
  uniform pipe.

### Wet barrel (warm-climate)

In a wet-barrel hydrant the barrel remains pressurized and each outlet is
individually valved. The silhouette is shorter and more crown-like: several
outlet heads and their operating nuts are distributed around a common barrel,
without the tall dry-barrel bonnet/upper stem arrangement. AMERICAN's Sequoia
manual documents the wet-barrel design, individually serviced outlet valves,
2.5-inch hose and 4/4.5-inch pumper options, replaceable nozzles, and 60-degree
three-way valve spacing. [AMERICAN Sequoia wet-barrel manual and submittal](https://american-usa.com/assets/section-2c-sequoia-wet-barrel-fire-hydrant.pdf)

Reserve `barrelType: wet` as a real geometry variant, not only a material
switch. It should replace the dry bonnet/stem with a lower crown and make each
outlet/operating nut independently visible. A wet barrel is especially useful
for warm-climate/West Coast scenes.

### Flush/underground and yard hydrants

Flush hydrants are represented by a ground box and lid, not by shrinking a
post-type body. NFPA 291 notes that flush-hydrant location markers should use
the same capacity-color background as above-ground hydrants, with additional
stenciled data where needed. [NFPA 291 marking guidance](https://www.nfpa.org/api/files?path=%2Ffiles%2FAboutTheCodes%2F291%2F291_A2021_AUT_PRI_PIReport.pdf)

Keep flush, UK underground, small yard, and industrial monitor hydrants as
later presets. Their top-down geometry and marker/signage requirements differ
enough that they should not be inferred from a dry-barrel scale slider.

## Visible component breakdown

### Barrel, flange, and ground interface

- **Lower barrel/shoe:** slightly tapered cylindrical body, with a seam at the
  upper barrel or nozzle section.
- **Traffic/breakaway flange:** a broad ring just above grade with a visible
  joint, bolt heads, and a small offset between the upper and lower bodies.
  Mueller documents a safety flange and stainless-steel stem coupling that
  separate when struck, protecting the main valve and limiting uncontrolled
  water flow. [Mueller product datasheet](https://www.muellercompany.com/sites/muellercompany.com/files/uploads/media/mueller_super_centurion_datasheet.pdf)
- **Shoe/inlet:** mostly below grade in the scene; show a shallow concrete pad
  or collar and an optional valve-box lid in the floorplan rather than a large
  buried pipe.
- **Bonnet:** a shallow dome or faceted cap with a narrow seam/gasket shadow.
  Add a small oil-fill plug or cast arrow only in a higher-detail LOD.

### Operating nut and outlet caps

- Center a small **pentagonal operating nut** on the bonnet. The operating nut
  shape and open-left/open-right direction are product options, not decorative
  bolts. [Mueller Super Centurion product page](https://www.muellercompany.com/water-works/hydrants/fire-hydrants/super-centurionr/)
- Use one large pumper/steamer outlet and two smaller hose outlets for the
  default dry preset. Mueller's product matrix documents configurations from
  one pumper plus two hose nozzles through multiple pumper/hose combinations.
  [Mueller Super Centurion product datasheet](https://www.muellercompany.com/sites/muellercompany.com/files/uploads/media/mueller_super_centurion_datasheet.pdf)
- Model each outlet as a short neck, dark threaded opening behind a gasket, and
  a removable cap with a small wrench nut. The cap should project from the
  curved body enough to read in three-quarter view; avoid flush decals.
- Add a short zinc-plated chain from each cap to the barrel. Both Mueller and
  AMERICAN parts lists identify cap chains as real hardware. [Mueller Super
  Centurion parts/specification](https://www.muellercompany.com/sites/muellercompany.com/files/uploads/media/mueller_super_centurion_250_dry_barrel_fire_hydrants_form_12921.pdf),
  [AMERICAN Sequoia parts list](https://american-usa.com/assets/section-2c-sequoia-wet-barrel-fire-hydrant.pdf)

### Surface and material cues

- Cast iron/ductile iron should have a slightly rough, powder-coated surface;
  caps and bonnet can be glossier from handling and repainting.
- Use separate materials for body, bonnet, each cap, gasket, thread interior,
  operating nut, flange bolts, and chain. This creates readable highlights
  without requiring dense geometry.
- Add a restrained seam/bolt normal or low-poly detail at the upper barrel,
  bonnet, flange, and nozzle retainers. The asset should read as assembled,
  not as a single smooth red cylinder.
- Optional conditions: chipped paint on flange edges, dark grime under caps,
  wet streaking below a recently opened outlet, light rust at fasteners, and a
  red/black out-of-service bag. Keep these as state controls, not permanent
  decoration.

## Color coding and operational states

NFPA 291 recommends chrome-yellow public barrels unless another local color is
already adopted. It recommends capacity colors on the bonnet/top and nozzle
caps: **light blue for Class AA (1,500 gpm or more), green for Class A
(1,000–1,499 gpm), orange for Class B (500–999 gpm), and red for Class C (under
500 gpm)**. It also recommends reflective paint for nighttime identification
and black pressure stenciling below 20 psi. Private hydrants on public streets
are recommended to use red or another distinguishing body color. [NFPA 291,
Sections 5.2.1 and 5.2.5](https://www.nfpa.org/api/files?path=%2Ffiles%2FAboutTheCodes%2F291%2F291_A2021_AUT_PRI_PIReport.pdf)

Treat this as a selectable **NFPA-style flow preset**, not as a universal
hydrant type. Municipal standards legitimately override the body color or use
bonnet/cap colors for other data. For example, Cotati's design standard keeps
the body Cotati Green but applies the light-blue/green/orange/red flow classes
to the top and nozzle caps. [City of Cotati Design Standards, Standard 857](https://www.cotaticity.gov/DocumentCenter/View/472/Volume-1---Design-Standards-PDF)

Expose these visual states independently:

- `serviceStatus`: active, temporarily out-of-service, permanently removed;
- `flowClass`: AA, A, B, C, or local/custom;
- `bodyColor`, `bonnetColor`, and `capColors[]`;
- `reflectiveMarking`: none, bonnet band, cap band, or marker plate;
- `weathering`: clean, worn, wet, rusty, or chipped;
- `security`: ordinary cap chains or tamper/security straps.

NFPA's guidance says permanently unusable hydrants should be removed and
temporarily unusable hydrants should be wrapped or otherwise visibly marked;
this makes an out-of-service bag a meaningful state rather than an arbitrary
prop. [NFPA 291](https://www.nfpa.org/api/files?path=%2Ffiles%2FAboutTheCodes%2F291%2F291_A2021_AUT_PRI_PIReport.pdf)

## Placement and safety cues for the scene

Keep a clear, visually legible operating zone around the hydrant. Washington
state rules specify 36 inches of clear area around a hydrant for wrench and
control-valve operation and require access/visibility from the vehicle
approach. [Washington Administrative Code 246-293-650](https://app.leg.wa.gov/wac/default.aspx/default.aspx?cite=246-293-650)

Municipal details vary, but a useful modeling default is a three-foot radial
clear zone, a small pad, and the pumper nozzle oriented toward the street or
fire lane. Chandler's standard detail also keeps obstructions out of the curb-
to-hydrant line and calls for three feet of unobstructed clearance. [City of
Chandler Detail C-305](https://www.chandleraz.gov/sites/default/files/documents/imported/UDM_SupptoMAG.pdf)

Do not hard-code a universal curb offset or exposed height. Instead, provide
`streetFacing`, `curbOffset`, and `grade/extension` controls. The floorplan
should show the hydrant body, flange/pad, outlet directions, and an optional
clearance ring/guard footprint; it should not draw buried pipes unless a future
utility-network feature explicitly requests them.

## 3D implementation guidance

Build the asset from named reusable modules:

1. `hydrantShoe`/inlet and grade pad;
2. lower barrel and upper barrel with a visible ground-line seam;
3. breakaway traffic flange with bolt ring;
4. bonnet, gasket, operating nut, and optional oil plug;
5. hose/pumper outlet necks with thread/gasket recesses;
6. caps, wrench nuts, and optional chains;
7. optional marker plate, valve-box cover, bollards, and out-of-service bag.

The first dry-barrel mesh should use a modestly faceted silhouette and a soft
fillet at the bonnet/neck transitions. A three-quarter camera should see one
large pumper cap and at least one hose cap; rotate the other hose cap toward
the road rather than hiding all outlets behind the body. Keep chains as thin
curves or instanced links and disable them at a distant LOD.

Wet-barrel geometry should reuse outlet/cap primitives but replace the dry
bonnet and long stem with individually valved outlet heads. The AMERICAN
Sequoia reference documents 60-degree valve spacing on a three-way wet hydrant,
which is a useful default radial layout. [AMERICAN Sequoia manual](https://american-usa.com/assets/section-2c-sequoia-wet-barrel-fire-hydrant.pdf)

## 2D/floorplan guidance

The plan symbol must communicate more than a colored circle:

- draw a filled body/flange footprint with a thin outer grade pad;
- draw the pumper and hose outlets as short radial rectangles or circles,
  oriented by `streetFacing` and `nozzleRotation`;
- show a small center operating-nut mark for the dry preset;
- draw cap color/flow class as small colored outlet rings or caps;
- optionally draw a dashed three-foot clear-zone ring and guard/bollard
  footprints, with the zone hidden by default if the scene is dense;
- for wet barrel, distribute outlet symbols around the center rather than
  reusing the dry top-down silhouette;
- for flush/underground, use a square/round box lid plus a marker/arrow symbol,
  never a shrunken above-ground body.

The floorplan should preserve outlet direction and state when the node rotates,
and selected nodes should highlight the body, outlets, and clearance ring as a
single group. Use the same body/bonnet/cap color properties as the 3D renderer
so the 2D view can serve as a quick flow/availability legend.

## Minimum first implementation

Implement `environment:fire-hydrant` with:

- `barrelType`: `dry` initially, with `wet` and `flush` reserved;
- `outletLayout`: `two-hose-one-pumper`, `two-hose`, or `one-hose`;
- shared body, bonnet, cap, nut, chain, flange, and pad primitives;
- independent body, bonnet, and cap colors, including optional NFPA-style flow
  classes;
- `streetFacing`/`nozzleRotation` and grade/extension controls;
- service status, weathering, chain/security, reflective marking, and
  clearance/guard options;
- a floorplan group with body, outlet direction, cap indicators, and optional
  clear-zone ring;
- a catalog thumbnail that favors a readable three-quarter dry-barrel view.

## Later variants and QA

1. Wet-barrel warm-climate preset with individually valved outlets.
2. Flush/underground hydrant with marker plate and lid symbol.
3. UK hydrant marker plate/post and regional thread/cap presets.
4. Yard/small post hydrant and industrial monitor hydrant.
5. Guard posts, security straps, smart cap/monitoring cap, and valve-box
   accessory.
6. Regional color packs and custom cap/bonnet flow legends.

Visual QA should cover:

- three-quarter and top views where at least one pumper and one hose cap are
  visible;
- wet/dry geometry differences, flange and chain readability, and nozzles that
  do not intersect the barrel;
- active/out-of-service/wet/weathered material states;
- body/bonnet/cap color changes reflected in both 3D and 2D;
- selected floorplan footprint, outlet orientation, and optional clearance ring;
- scale against a curb, sidewalk, vehicle, and human-height reference.

## Primary references

- [American Water Works Association standards list — C502-24 Dry-Barrel and C503-21 Wet-Barrel Fire Hydrants](https://www.awwa.org/standards/standards-list/)
- [Mueller Super Centurion dry-barrel product page](https://www.muellercompany.com/water-works/hydrants/fire-hydrants/super-centurionr/)
- [Mueller Super Centurion product datasheet](https://www.muellercompany.com/sites/muellercompany.com/files/uploads/media/mueller_super_centurion_datasheet.pdf)
- [American Fire Control dry-barrel hydrant](https://american-afc.com/product/dry-barrel-hydrant/)
- [AMERICAN Sequoia wet-barrel hydrant manual/submittal](https://american-usa.com/assets/section-2c-sequoia-wet-barrel-fire-hydrant.pdf)
- [NFPA 291 fire-hydrant marking guidance](https://www.nfpa.org/api/files?path=%2Ffiles%2FAboutTheCodes%2F291%2F291_A2021_AUT_PRI_PIReport.pdf)
- [City of Cotati Design Standards, Standard 857](https://www.cotaticity.gov/DocumentCenter/View/472/Volume-1---Design-Standards-PDF)
- [City of Chandler Detail C-305 — hydrant locations](https://www.chandleraz.gov/sites/default/files/documents/imported/UDM_SupptoMAG.pdf)
- [Washington Administrative Code 246-293-650 — access and clear area](https://app.leg.wa.gov/wac/default.aspx/default.aspx?cite=246-293-650)
- [City of Gresham Standard Detail 501C — fire-hydrant clear zone](https://www.greshamoregon.gov/globalassets/city-departments/environmental-services/public-works-standards/2026-standard-details---water-systems.pdf)

All dimensions and clearances above are product- or jurisdiction-specific
references for visual plausibility. Pascal should label them as defaults and
allow regional packs to replace them.
