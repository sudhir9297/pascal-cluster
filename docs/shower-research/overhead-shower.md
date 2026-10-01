# Overhead shower head research

Research captured 2026-10-01 before implementation.

- [Google Images search](https://www.google.com/search?udm=2&q=overhead+shower+head+round+square+rectangular+bell), [saved results screenshot](overhead-shower-google-images.png). The visible results show round, sharp square, rounded square and rectangular spray plates, with both flat and thicker bodies.
- [Hansgrohe overhead showers](https://www.hansgrohe-usa.com/bathroom/products/showers/overhead-showers), [browser screenshot](overhead-shower-hansgrohe.png). Manufacturer range includes circular and linear heads, with one or multiple spray modes.
- [Hansgrohe Raindance 260 × 260](https://www.hansgrohe.com.sg/articledetail-raindance-overhead-shower-260-260-1jet-26472000?HGxH430=1): square size reference.
- [AXOR overhead showers brochure](https://assets.hansgrohe.com/celum/web/axw-showers-brochure-en.pdf): rectangular 460 × 300 and 250 × 580 heads with separate spray areas.
- [GROHE catalogue](https://cdn.cloud.grohe.com/Literature/Brochures/brochures_gb/MPL_UK_2021_03_31_lr/original/MPL_UK_2021_03_31_lr.pdf): compact, circular and classic profiles; ball-joint turning angles are product-specific.

## Implemented visual range

Round rain, square rain, rounded square, rectangular rain, compact round and classic bell. These are generic procedural interpretations, not exact manufacturer replicas. Width/diameter, depth, thickness or bell height, corner radius, connector length/diameter, tilt, swivel, nozzle spacing/diameter and grid/ring layout are editable. Tilt limits are visual modeling limits, not a compatibility claim about a real fixture. Spray simulation and manufacturer-specific hydraulic modes remain outside the current visual implementation.

Heads attach exclusively to a shower arm's `shower-head` slot. Creation or transfer replaces the slot occupant through the shared attachment transaction. Shape and dimension edits preserve host/slot identity. The arm system resolves the child's position and full outlet orientation every frame, including previewed arm edits. The head's own tilt and swivel are inside its geometry so they survive outlet following.

Automated checks cover all six shapes at minimum/maximum sizes, finite positions/normals/UVs, nozzle positions, single-slot replacement, transfer identity, invalid hosts, and outlet transforms under a rotated parent.
