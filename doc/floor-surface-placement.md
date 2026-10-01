# Floor surface placement

Floor fixtures use the editor’s shared support lookup. Saved Y is clearance above the supporting surface; slab elevation is applied at render time. Changing slab elevation therefore moves fixtures without resizing them or accumulating offsets. Slab thickness extends below the top elevation.

## Coverage

- [x] All bathtub shapes
- [x] Bath decks and their nested baths
- [x] Freestanding and corner vanities
- [x] Independently placed countertop and inset basins
- [x] Floor-standing toilets
- [x] Full pedestal basins
- [x] Shower dividers
- [x] Attached basins, bath fittings and wall tap height calculations

Placement previews and committed positions use the same surface calculation. Slab selection accounts for fixture footprint, holes, stacked slabs and terrain. Removed supports fall back to an available floor. Wall-attached floor fixtures evaluate their own footprint and subtract the wall’s existing base lift.

Eligible patio and item top surfaces can be picked during placement. These use the editor’s frozen clearance above the underlying floor; subsequent changes to the arbitrary item’s own height are not a live attachment. Slab elevation changes remain live.

## Verification

Regression tests cover every bath preset, support elevation changes, stacked slabs, holes, removal, terrain, attached fixtures and wall tap offsets. TypeScript checks pass. Browser screenshot verification could not complete because the collaborative preview snapshot repeatedly failed, including after reopening the preview.
