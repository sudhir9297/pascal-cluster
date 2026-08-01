# Electrical Distribution Pole Research

This note scopes the first procedural utility pole and the variants that should
follow it. “Utility pole” is used in the implementation to distinguish these
electrical distribution structures from roadway street-light poles.

## What varies in real distribution structures

Pole silhouettes are driven by several independent choices:

- **Circuit phase count:** single-, two-, or three-phase primary distribution.
- **Line geometry and load:** tangent/small-angle supports, larger angle or
  suspension structures, single and double dead-ends, feed-throughs, junctions,
  and taps use different insulator and bracing arrangements.
- **Circuit count:** a single circuit may use one arm while double circuits use
  several arms or vertical post-insulator layouts.
- **Support and arm material:** wood, steel, concrete, and composite poles can
  carry wood, steel, or composite crossarms.
- **Equipment:** transformers, cutouts, arresters, switches, capacitors,
  regulators, telecom lines, street lights, grounds, and service drops create
  visibly different equipment-bearing poles.
- **Neutral placement:** the neutral can be mounted below the primary assembly
  or included on a crossarm, depending on the system and standard assembly.

The USDA Rural Utilities Service construction index provides a useful formal
taxonomy: its standard assemblies separately list tangent single supports,
double supports, suspension angles, dead-end angles, single and double
dead-ends, junction guides, neutral-on-crossarm variants, and double-circuit
structures. These are construction references, not a single worldwide style.

## First model: wood three-phase tangent pole

The first procedural asset represents a common straight-line distribution pole:

- tapered round wood pole;
- one wood crossarm with metal diagonal braces;
- two outside pin insulators on the crossarm;
- one higher pin insulator on a pole-top pin;
- a smaller lower crossarm carrying the neutral conductor;
- optional gray pole-mounted “can” transformer and mounting rails;
- four named conductor anchors: three primary phases plus the lower neutral.

### Installed scale

The default represents a nominal **35 ft (10.668 m) pole** set **5.5 ft
(1.6764 m) into the ground**, leaving **29.5 ft (8.9916 m) visible above grade**.
This follows the widely used setting-depth convention of 10% of total pole
length plus 2 ft. The procedural `height` property is explicitly the visible
height, because the editor places the mesh at ground level. Its default wood
crossarm is **8 ft (2.4384 m)** long. The ground-line and top diameters were
also reduced to realistic wood distribution-pole proportions; the earlier
oversized shaft made the asset read much shorter than its numeric height.

Pascal's default storey height is 2.5 m. The 8.9916 m exposed pole is therefore
about 3.6 bare storey heights: clearly taller than a two-storey building, but
roughly comparable to the roofline of a three-storey residential building. The
previous 10.3632 m default was about 4.1 storey heights and read too tall in the
editor even though it accurately represented a nominal 40 ft utility pole.

The two-outside-plus-raised-center arrangement matches the user's first visual
reference and is a documented common tangent arrangement. Four named local
attachment points—`phase-left`, `phase-center`, `phase-right`, and `neutral`—are
exposed by `resolveUtilityPoleLayout`. The wire system consumes those anchors
without reverse-engineering mesh positions. The neutral is modeled separately
from the three primary phases; secondary service drops and communications lines
remain future additions.

## Connection topology and assemblies

The line is a graph, not a chain. A straight run is a tangent span between two
poles, but official construction indexes also define junction guides, taps,
angle structures, single/double dead-ends, and double-circuit structures. A
branch is therefore represented by another span sharing an existing pole: one
pole can have two spans in a through-run and three or more at a junction. There
is no rule that every pole can connect to only one neighbor.

The placement heuristic now follows two rules:

1. If the new pole lands on an existing span, the old span is replaced by two
   spans, preserving a clean through-run and avoiding overlapping wires.
2. Otherwise, the new pole connects to the nearest same-level pole within the
   urban span limit. Repeating that operation near an existing pole naturally
   creates a T or multi-way branch.

This is intentionally a scene-layout heuristic, not a full line-design
solver. Angle/dead-end hardware, guy wires, fused taps, and regional clearance
rules should be represented by explicit pole assembly variants rather than
inferred from distance alone. The plugin now exposes tangent, small-angle,
junction, and dead-end roles. New tangent-like poles align their crossarms
perpendicular to the connected main span; small-angle and dead-end roles also
show a guy and ground-anchor cue. Junction poles show a compact three-cutout tap
rack, while dead-end poles use strain-style primary insulators. These are visual
assembly cues rather than engineering construction drawings.

## Automatic span distance

There is no universal pole-to-pole “standard distance.” Maximum span depends on
conductor type and size, sag/tension, voltage, pole-top assembly, weather/loading
district, terrain, and required ground and phase clearances. USDA RUS Bulletin
1724E-154 therefore describes a calculation process rather than one fixed
number. Its examples use design ruling spans of 350–375 ft, but those are
engineering examples rather than a placement default.

For this street-oriented plugin, automatic connection uses the **150 ft
(45.72 m) maximum recommended urban span** stated in the referenced 13.2 kV
overhead distribution standard. Rural spans remain a future configurable mode.
When a pole is placed, the plugin inserts it into a nearby through-span or
connects it to the nearest unconnected pole on the same level within that
distance. It creates separate hidden `environment:utility-wire-span` nodes
containing three primary conductor curves plus a lower neutral. Those curves
resolve the poles' named anchors and update when either pole moves, rotates, or
changes height. Visual sag defaults to 3.5% of horizontal span and is capped for
scene readability; it is not an engineering sag/tension result.

## Recommended model sequence

1. Current single-crossarm, transformer-equipped three-phase tangent pole.
2. Transformer-free tangent pole preset using the same structure.
3. Multi-crossarm/double-circuit wood pole, matching the second reference.
4. Double-arm dead-end/angle pole with strain insulators and guy attachment.
5. Simple single-phase roadside pole with primary and neutral.
6. Concrete and galvanized-steel regional variants.

## Primary references

- [USDA RUS Bulletin 1728F-803 — 24.9/14.4 kV distribution construction](https://www.rd.usda.gov/media/file/download/uep-bulletin-1728f-803.pdf)
- [USDA Rural Development electrical guidance documents](https://www.rd.usda.gov/resources/regulations/guidance-documents)
- [U.S. DOE — Distribution transformer types and demand](https://www.energy.gov/oe/articles/energy-department-researches-distribution-transformer-types-and-demand-drivers)
- [City Utilities — Electric distribution construction standards](https://www.cityutilities.net/630/Electric-Distribution-Construction-Stand)
- [Snohomish PUD — 7.2 kV single tangent arm assembly](https://esr.snopud.com/Content/Assembly/OHPriDist/1ph/12F121.htm)
- [California Public Utilities Commission — minimum pole setting depths](https://ia.cpuc.ca.gov/gos/GO95/Go_95_rule_49_1.html)
- [PacifiCorp — 45-foot basic joint-use pole and above-ground height](https://pscdocs.utah.gov/electric/09docs/0903552/062909ExhibitB.pdf)
- [USDA RUS Bulletin 1724E-154 — distribution conductor clearances and span limitations](https://www.rd.usda.gov/media/file/download/uep-bulletin-1724e-154.pdf)
- [Puerto Rico public distribution manual — 150 ft recommended urban span](https://d1fdloi71mui9q.cloudfront.net/XIybFoSbREudp8QfZfEB_4301.001_Overhead%20Electrical%20Distribution%20Manual%20-%20FINAL-%20Signed-%2006142022%20-%20SECURED%20%28REV%20AUG%201%202022%29.pdf)

Dimensions and electrical clearances in the plugin are visually representative,
not engineering specifications. A regional pack should derive exact geometry
from the target utility's current standards.
