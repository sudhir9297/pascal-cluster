# Traffic-Signal Visual Research

This note translates current North American traffic-signal standards and
first-party hardware specifications into visual guidance for Pascal's
`environment:traffic-signal` asset. It is a scene-modeling reference, not an
intersection-design or regulatory-compliance tool.

## Recommended visual default

The strongest first default is a **modern North American mast-arm signal**:

- one tapered galvanized-steel pole with a rigid, subtly tapered mast arm;
- one plumb vertical, modular three-section 12-inch circular signal head;
- black housing, three tunnel visors, and a dull-black rectangular backplate;
- a narrow yellow retroreflective perimeter border;
- realistic mounting collars, section seams, hinge/latch details, base plate,
  anchor bolts, handhole cover, and capped arm end;
- a muted aluminum roadside controller cabinet on a shallow concrete pad;
- red active by default, with inactive amber and green lenses remaining dark
  but visibly glassy.

This combination is visually legible at Pascal's normal camera distance,
looks contemporary without tying the asset to one city's paint scheme, and
uses accessories that have genuine traffic-signal functions rather than
invented decoration. Black provides strong contrast; the reflective yellow
border gives the silhouette a crisp night-readable edge. Pole, housing, and
border colors should remain editable because agencies use galvanized,
painted, yellow, dark-green, and black equipment.

For a visually representative scene preset, use approximately:

| Part | Suggested Pascal dimension | Source anchor |
| --- | ---: | --- |
| Lens diameter | 0.305 m | MUTCD 12-inch indication |
| One housing section | 0.356 × 0.356 × 0.168 m | Econolite 12-inch section, excluding visor |
| Complete 3-section housing | about 0.36 × 1.07 × 0.17 m | Three modular 14-inch sections |
| Tunnel visor projection | about 0.28 m | McCain 11-inch standard visor depth |
| Backplate border around housing | about 0.127 m | McCain 5-inch border option |
| Reflective perimeter strip | about 0.051 m | FDOT 2-inch requirement; within MUTCD 1–3-inch option |
| Clearance to bottom of overhead face | about 4.9 m | Above the MUTCD 4.57 m minimum |
| Mast-arm height | about 6.0 m | Allows housing, mounting hardware, and clearance |
| Initial arm reach | about 5.5–7 m | Plausible single-lane overhead composition; user-editable |

The measurements above are asset proportions, not a claim that a placed
Pascal object satisfies roadway clearances.

## Common North American signal faces

| Variant | Distinguishing silhouette | Best Pascal role |
| --- | --- | --- |
| Vertical three-circular | Tall three-module stack | Default through signal |
| Horizontal three-circular | Wide three-module row | Regional/low-clearance option |
| Three-arrow protected turn | Tall stack with arrow optics | Left/right protected-turn preset |
| Four-arrow FYA | Taller four-module arrow stack | Protected/permissive-turn preset |
| Five-section doghouse | Centered red above two two-section columns | Visually distinctive legacy/shared-turn preset |
| Pedestrian hybrid beacon | Two red lenses over one centered yellow | Separate specialized preset |

The vertical three-circular face offers the cleanest combination of instant
recognition, simple inspector state, reuse of one section primitive, and good
legibility from a three-quarter camera view. The remaining faces should be
variants of the same modular head system rather than unrelated meshes.

### Three-section circular through face

The most recognizable general traffic face is a straight stack of red,
yellow, and green circular indications. The current MUTCD normally requires
12-inch circular indications on new faces and permits signal faces with three,
four, or five sections. In a vertical face, red is above yellow and green; in a
horizontal face, red is to their left. This is the correct default catalog
silhouette. [FHWA, MUTCD 11th edition, Sections 4E.02–4E.05](https://mutcd.fhwa.dot.gov/pdfs/11th_Edition/part4.pdf)

**Model details:** three separately molded square-ish sections joined into a
continuous stack; shallow horizontal seam at each join; one door ring, visor,
hinge pair, and latch pair per section; a lens that sits slightly behind the
door bezel rather than flat on its front.

### Horizontal three-section face

Horizontal red-yellow-green faces are a standard-compliant alternative and
can appear on the same approach as vertical faces when placement requirements
are met. Their ordering is red, yellow, green from left to right. They are
especially characteristic of some regions and low-clearance compositions, so
this should be the first additional orientation rather than a separate node
kind. [FHWA, MUTCD 11th edition, Sections 4E.03 and 4E.05](https://mutcd.fhwa.dot.gov/pdfs/11th_Edition/part4.pdf)

**Model details:** rotate the section layout, backplate, and mounting frame as
a unit; do not rotate arrow artwork incorrectly. Visors remain attached to
each face and should still shade from above.

### Three-section protected-turn arrow face

A separate protected-turn face uses red, yellow, and green arrow indications.
The MUTCD requires 12-inch arrows and fixes their relative positions just as
it does circular indications. Arrow direction is meaningful visible geometry,
not merely a state label. [FHWA, MUTCD 11th edition, Sections 4E.01–4E.05 and 4F.02–4F.15](https://mutcd.fhwa.dot.gov/pdfs/11th_Edition/part4.pdf)

**Model details:** build the arrow from a masked or emissive LED field inset in
an otherwise dark circular optical module. It should not look like a solid
painted arrow floating in front of the lens.

### Four-section flashing-yellow-arrow turn face

The familiar protected/permissive left-turn version is a four-section vertical
stack: red arrow, steady yellow arrow, flashing yellow arrow, and green arrow.
The MUTCD also supports configurations that reduce the face to three sections
using a dual-arrow optical section. A four-section preset creates the clearest
visual distinction in Pascal. [FHWA flashing-yellow-arrow approval and arrangement guidance](https://mutcd.fhwa.dot.gov/resources/interim_approval/ia_10_flashyellarrow.htm), [FHWA three-section FYA approval](https://mutcd.fhwa.dot.gov/resources/interim_approval/ia17/index.htm)

**Model details:** add a fourth repeatable housing module and let the selected
state illuminate one optical section; an animation system can later flash the
permissive yellow arrow without changing geometry.

### Five-section clustered “doghouse” face

The older/shared-turn “doghouse” silhouette uses a centered red section above
two side-by-side columns of yellow and green circular/arrow indications. The
MUTCD permits limited same-color clustering in vertical faces, though an
inline vertical or horizontal arrangement remains the normal construction.
This is a valuable later preset because its outline is instantly distinct.
[FHWA, MUTCD 11th edition, Sections 4E.03–4E.05 and Figures 4F-1–4F-14](https://mutcd.fhwa.dot.gov/pdfs/11th_Edition/part4.pdf)

**Model details:** the backplate must follow the cluster outline or use a
properly sized rectangular target board; the top red section remains centered.
Do not fake it by overlapping two independent three-section heads.

### Specialized faces to keep separate from the default

- A pedestrian hybrid beacon has two red indications above a centered yellow
  indication and therefore deserves its own recognizable preset.
- Bicycle signals use a smaller 4-inch indication under the current MUTCD and
  should use a bicycle symbol, not a scaled-down vehicle head.
- Pedestrian signal heads are normally box-like symbol/countdown displays and
  should attach to the signal pole but not be treated as another vehicle lens.
- Single or paired flashing beacons, ramp-meter heads, and lane-use-control
  signals have different silhouettes and operating meanings.

[FHWA, MUTCD 11th edition, Chapters 4H, 4J, 4K, 4S, and 4T](https://mutcd.fhwa.dot.gov/pdfs/11th_Edition/part4.pdf)

## Common support and mounting types

### Rigid mast arm

A steel pole and cantilevered arm carry one or more faces over traffic lanes.
Official state details show dedicated mast-arm clamps/tenons and different
mounting assemblies for one through four heads and five-section faces. Mast
arms can also carry a street-name sign, detector, or luminaire, but those
attachments should be optional so the default does not become cluttered.
[WSDOT Standard Plan J-75.20-01, mast-arm and span-wire mountings](https://wsdot.wa.gov/publications/fulltext/Standards/english/PDF/j75.20-01_e.pdf)

**Visual construction:** use a tapered vertical shaft rather than a uniform
cylinder; give the arm a slight taper and modest upward sweep or manufactured
elbow; add a robust pole-to-arm collar, a small head tenon/plumbizer, and an arm
end cap. The head must hang plumb even if the arm slopes.

### Pole-mounted and post-top

A roadside pole can carry a head above its cap or on a side bracket. This is
the compact alternative for narrow streets and supplemental/near-side faces.
WSDOT publishes separate standard details for pole and post-top mounting,
confirming that the visible bracket structure differs from an overhead mast
arm. [WSDOT Standard Plans index, J-75.10-02](https://wsdot.wa.gov/engineering-standards/all-manuals-and-standards/standard-plans)

**Visual construction:** show a pole cap, top/bottom mounting pipe or side
bracket, serrated joint collars, and a short cable-entry fitting. For a plain
post mount, the face bottom should remain high enough that the composition does
not resemble a pedestrian signal.

### Span wire

Signal heads can hang from a messenger cable stretched between strain poles.
Official mounting sheets distinguish span-wire types for one through four
heads and clustered five-section heads. This changes placement and silhouette
enough that it should be a later two-support system rather than a checkbox on a
single-pole node. [WSDOT Standard Plan J-75.20-01](https://wsdot.wa.gov/publications/fulltext/Standards/english/PDF/j75.20-01_e.pdf)

**Visual construction:** two strain poles, a visibly sagging messenger wire,
short hangers, and a second stabilizing/tether wire where appropriate. The
heads should remain upright and appear suspended, not fused directly into a
rigid bar.

### Combined signal and lighting standard

Many mast-arm standards also carry a higher luminaire arm. State pole charts
separately locate vehicle displays, street-name signs, luminaires, detectors,
pedestrian displays, terminal cabinets, and pushbuttons. Those named anchor
points are a good Pascal architecture, but only the head and support need to
ship in the base preset. [WSDOT Traffic Signal Standard Chart IS-13X](https://wsdot.wa.gov/publications/fulltext/Standards/PSL/is-13/IS-13X.pdf)

## Signal-head construction details

### Modular housing

First-party signal housings are modular: one to five separately complete
sections can be bolted together in vertical, horizontal, clustered, or hybrid
configurations. A current Econolite 12-inch section is approximately 14 inches
high, 14 inches wide, and 6.6 inches deep before the visor. McCain lists a
similar 13.5 × 13.5 × 7-inch section. Aluminum housings are cast and powder
coated; polycarbonate housings are molded from UV/heat-stabilized material.
[Econolite vehicle-signal datasheet](https://www.econolite.com/wp-content/uploads/2022/09/Signals-datasheet_vehicle-2022-1.pdf), [McCain traffic-signal housings](https://www.mccain-inc.com/products/signals/traffic-signals/traffic-signal-housings)

For Pascal, the current single smooth slab should become three modular bodies.
Each section benefits from a tiny side hinge, opposite eye-bolt latch, gasket
shadow, top/bottom joining collar, and subtle reinforcement ribs on its back.
These details create realistic highlights while remaining cheap geometry.

### Lens and LED optics

The lens opening is nominally 12 inches, but the door/bezel and housing are
wider. Active lenses should show a bright inner LED field, a softer colored
glass surface, and controlled bloom/emission. Inactive lenses should be nearly
black with a dim colored tint, concentric optical rings or an LED-dot normal
pattern, and a faint upper reflection. A flat saturated disk reads as a toy.

Only the active module needs meaningful emissive intensity. A subtle warm
amber is more credible than pure yellow; red should be deep rather than pink;
green traffic modules tend toward a blue-green rather than neon lime. The
standard constrains chromaticity and shape, but material tuning remains a
rendering decision. [FHWA, MUTCD 11th edition, Section 4E.01](https://mutcd.fhwa.dot.gov/pdfs/11th_Edition/part4.pdf)

### Visors

Visors improve visibility in sunlight. Manufacturers supply tunnel, full-
circle, cap, and angled types; McCain's standard 12-inch-class visor is about
11 inches deep and uses a slight downward tilt. Both MUTCD and manufacturer
specifications call for a dull/flat black interior to reduce reflections.
[McCain signal visors](https://www.mccain-inc.com/products/signals/signal-accessories/signal-visors), [FHWA, MUTCD 11th edition, Section 4D.06](https://mutcd.fhwa.dot.gov/pdfs/11th_Edition/part4.pdf)

The default should use **individual tunnel visors** with open lower portions
and visible wall thickness. Avoid three perfect half-cylinders with no side
depth. Cap and full-circle styles can be inspector variants.

### Backplates and reflective borders

The MUTCD explains that backplates improve contrast against bright sky or a
complex background. Their front face and visor interiors must be dull black.
It permits a yellow retroreflective strip 1–3 inches wide around the perimeter.
[FHWA, MUTCD 11th edition, Section 4D.06](https://mutcd.fhwa.dot.gov/pdfs/11th_Edition/part4.pdf)

McCain supplies flat-black backplates with 5- or 8-inch borders and optional
reflective tape. FDOT's specification uses a black 5–6-inch backplate border,
rounded exterior corners, and a 2-inch yellow retroreflective perimeter strip.
[McCain backplates](https://www.mccain-inc.com/products/signals/signal-accessories/backplates), [FDOT Specification 650, Vehicular Traffic Signal Assemblies](https://www.fdot.gov/docs/default-source/programmanagement/Implemented/WorkBooks/History/Jan15/Files/6500000.impl.pdf)

The most attractive default is a thin, rounded rectangular backplate, five
inches beyond the housing, with a two-inch yellow border inset slightly from
the outer edge. Model the retroreflective strip as a separate shallow surface
so its night material can differ from the plate. Optional louvers/flanged
edges can add realism later.

### Housing color and hardware

Current commercial housings are offered in dark olive green, Federal yellow,
flat black, gloss black, or custom colors. Doors may hinge on either side;
hinge pins, latches, visor screws, and reinforcement are typically stainless
steel. [Econolite vehicle-signal datasheet](https://www.econolite.com/wp-content/uploads/2022/09/Signals-datasheet_vehicle-2022-1.pdf), [McCain traffic-signal housings](https://www.mccain-inc.com/products/signals/traffic-signals/traffic-signal-housings)

Recommended presets:

1. **Contemporary black:** black housing and backplate, yellow reflective edge,
   galvanized pole. Best default for clarity and material contrast.
2. **Federal yellow:** yellow housing/visor exterior, black backplate, galvanized
   support. Strong classic North American appearance.
3. **Urban black:** black housing and backplate on a satin-black pole and arm.
   Elegant but needs roughness variation so it does not become one flat shape.
4. **Signal green:** dark olive-green housing/support with a black face. Useful
   for agency or parkway styling.

### Pole base, access, and cabinet

A believable support needs a flared or welded base plate, 4–8 visible anchor
bolts/nuts, a short concrete foundation lip, and an access handhole/cover near
the pole base. These details should be instanced or low-sided geometry.

The signal controller is usually housed in a separate outdoor aluminum
cabinet. Current cabinet products use rectangular aluminum enclosures; McCain,
for example, lists a 46 × 24 × 20-inch cabinet. A cabinet should have a slight
roof overhang or sloped cap, recessed front door, hinge, lock/handle, lower
vent louvers, seam shadow, and concrete pad rather than being a plain box.
[McCain 346 cabinet](https://www.mccain-inc.com/products/cabinets/its-cabinets/346-its-cabinet)

Keep this as an optional roadside accessory. If enabled, place it behind the
pole rather than under the mast arm's lane-side reach, and use muted aluminum
with darker vents and hardware.

## Mounting and scene proportions

The current MUTCD requires the bottom of an overhead vehicular signal housing
and its attachments to be at least 15 feet (4.57 m) above pavement. A face that
is not over the roadway must be at least 8 feet (2.44 m) above the sidewalk or
reference roadway grade. The top of an overhead housing should generally not
exceed 25.6 feet (7.80 m). [FHWA, MUTCD 11th edition, Section 4D.09](https://mutcd.fhwa.dot.gov/pdfs/11th_Edition/part4.pdf)

The existing Pascal dimensions are already close for the face itself
(`0.42 × 1.16 × 0.24 m` with `0.145 m` lens radius). The largest visual gains
will come from changing construction and proportion rather than scaling the
whole head:

- lower the lens radius slightly only if a thicker door/bezel is introduced;
- replace the continuous housing with three 0.36 m modules and narrow seams;
- increase the tunnel-visor projection toward 0.25–0.28 m;
- give the optional backplate a roughly 0.12 m border plus a separate 0.05 m
  reflective perimeter;
- use a tapered pole around 0.22–0.30 m diameter at its base, narrowing upward;
- use a mast arm that is visibly narrower than the shaft and tapers toward its
  end;
- keep the bottom of the default overhead head around 4.8–5.0 m, yielding an
  arm height around 6.0 m with mounting hardware;
- use a larger, bolted base plate than the shaft and a shallow foundation pad;
- hang the face slightly below the arm on a real bracket rather than attaching
  its center directly to the arm.

## Recommended Pascal inspector model

Improve the existing node without fragmenting it into multiple catalog cards:

- `mount`: `mast-arm | post` initially; later `span-wire` as a system;
- `facePreset`: `three-circular | protected-left | protected-right |
  flashing-left | flashing-right | doghouse-left | doghouse-right`;
- `orientation`: `vertical | horizontal` where allowed by the face preset;
- `housingStyle`: `black | yellow | signal-green | custom`;
- `visorStyle`: `tunnel | cap | full-circle | none`;
- `backplate`: `none | plain | reflective-border`;
- `supportFinish`: `galvanized | black-painted | signal-green | custom`;
- `activeIndication`: explicit circular or arrow state plus `dark`;
- `cabinet`: off/on, with separate finish if needed;
- optional later attachments: pedestrian head, pushbutton, street-name sign,
  detector camera, luminaire.

Avoid separate fields that permit impossible visual combinations. Selecting a
face preset should determine its ordered optical sections; the active state
should then be chosen only from indications that exist in that preset.

## Visual quality checklist

Use this checklist when comparing the browser screenshot with the source-backed
target:

1. At medium distance, does the head read as a real three-part assembly rather
   than a rounded rectangular toy?
2. Does the mast arm have taper, a believable collar, a capped end, and a
   hanging bracket?
3. Is the head plumb and its bottom at a believable roadway clearance?
4. Do lens bezels, glass depth, visors, section seams, hinges, and latches
   create readable edge highlights?
5. Is the active lens luminous without washing out the housing, and are
   inactive lenses still visible?
6. Is the visor interior and backplate face dull black?
7. Is the reflective border thin and inset, not a thick painted outline?
8. Does the pole base include a plate, nuts, foundation lip, and handhole?
9. If the cabinet is enabled, does it have a door, lock, hinge, vents, and pad?
10. From a three-quarter rear view, are backs, fasteners, and cable/mounting
    joints present rather than an empty shell?
11. Does the asset retain a clean silhouette without excessive micro-geometry
    at Pascal's normal viewing scale?
12. Do black, yellow, galvanized, and active-lens materials have distinct
    roughness and reflectivity, rather than differing only by flat color?

## Implementation priority

1. Rebuild the three-section head as repeated modules with deep tunnel visors,
   lens/bezel depth, section seams, hinges, and latches.
2. Add a proper backplate with rounded corners and a separate reflective
   perimeter material.
3. Replace the uniform pole and arm cylinders with tapered shafts, a base,
   bolts, access cover, collar, head bracket, and end cap.
4. Upgrade active/inactive lens materials and add restrained optical detail.
5. Upgrade the cabinet from a cuboid to a recognizable enclosure and pad.
6. Add horizontal, protected-arrow, and four-section flashing-yellow-arrow
   presets from the same modular section primitive.
7. Add optional pedestrian, street-name, detector, and luminaire attachments.
8. Treat span-wire as a later two-anchor support system.

## Primary sources

- [FHWA, Manual on Uniform Traffic Control Devices, 11th edition, Part 4](https://mutcd.fhwa.dot.gov/pdfs/11th_Edition/part4.pdf)
- [WSDOT Standard Plan J-75.20-01, Mast Arm and Span Wire Mountings](https://wsdot.wa.gov/publications/fulltext/Standards/english/PDF/j75.20-01_e.pdf)
- [WSDOT Traffic Signal Standard Chart IS-13X](https://wsdot.wa.gov/publications/fulltext/Standards/PSL/is-13/IS-13X.pdf)
- [FDOT Specification 650, Vehicular Traffic Signal Assemblies](https://www.fdot.gov/docs/default-source/programmanagement/Implemented/WorkBooks/History/Jan15/Files/6500000.impl.pdf)
- [Econolite, Vehicle Signal Faces datasheet](https://www.econolite.com/wp-content/uploads/2022/09/Signals-datasheet_vehicle-2022-1.pdf)
- [SWARCO McCain, Traffic Signal Housings](https://www.mccain-inc.com/products/signals/traffic-signals/traffic-signal-housings)
- [SWARCO McCain, Signal Visors](https://www.mccain-inc.com/products/signals/signal-accessories/signal-visors)
- [SWARCO McCain, Backplates](https://www.mccain-inc.com/products/signals/signal-accessories/backplates)
- [SWARCO McCain, 346 Traffic/ITS Cabinet](https://www.mccain-inc.com/products/cabinets/its-cabinets/346-its-cabinet)
