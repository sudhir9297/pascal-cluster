# Patio

## Current behavior

- Click **Ground & access → Patio** to place a rectangular patio on the selected level.
- The sidebar edits defaults before placement and edits the selected patio afterward.
- The inspector exposes size, base thickness and elevation, material, paver size,
  grid or running bond pattern, joint width, field color, border, and drainage slope.
- Width, depth, thickness, elevation, and rotation have in-scene handles. Ordinary editor
  movement and duplication are available.
- Magnetic placement aligns a patio center or an axis-aligned edge with nearby
  patios and pergolas on the same level. Holding Alt bypasses placement snapping.
- **Create patio around pergola** sizes the patio to the pergola's full roof
  footprint plus a chosen clearance, copies its rotation, and sets a level
  surface beneath its posts. Fitting an existing selected patio updates it.
- A patio sits over the existing ground surface. Grass and other ground areas
  remain intact beneath it.

## Design references

- [Belgard paving patterns](https://www.belgard.com/outdoor-living/patios/patio-paver-patterns-designs-layout/): grid, running bond, other patterns, and border courses.
- [Belgard borders and edging](https://www.belgard.com/outdoor-living/patios/paver-borders-edging-options/): contrasting borders and edge restraints.
- [Unilock patio installation](https://contractor.unilock.com/installation/paver-installation/how-to-install-patio-on-grade/): paver joints, cuts, borders, and grading.
- [Unilock drainage guidance](https://unilock.com/construction/common-paver-installation-mistakes/): grade and runoff direction.
- [This Old House pergola installation](https://www.thisoldhouse.com/patios/pergola-installation): pergola posts need independent structural footings; patio paving is a visual surface, not a post foundation.

## Remaining work

- Draw and reshape a custom patio outline, including concave corners and holes.
- Add herringbone, basket weave, modular layouts, and border course units.
- Add pathway and step transition rules, including elevation matching and
  explicit connection affordances.
- Represent post footings independently from patio paving.
- Show drainage direction and high/low elevations in floor plan, and connect
  the slope to terrain grading or drains where those tools exist.
- Add surface material presets and realistic stone/brick textures.

The pergola fit action is a one-time alignment. Later changes to either node
do not automatically resize or move the other.
