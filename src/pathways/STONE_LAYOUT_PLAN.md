# Natural stone walkway layouts

The existing `laidStone` finish remains a regular, bordered rectangular paving pattern. Three distinct layouts from the reference images remain as finishes, all using the same editable path graph and width control.

## Implementation sequence

1. Add three finish IDs and distinct initial sizes, gaps, colors, and border choices. Keep older walkway nodes valid by resolving missing layout fields at render time.
2. Generate polygons by arc length in the local frame of each path edge. Grass flagstones use irregular large shapes, river stones use rounded rows with small filler pieces, and stepping stones use one center row whose diameter follows path width.
3. Clip the polygons to the joined outline and the miter region at each junction. Subtract previously accepted stones, then keep one stable shade and shape per stone using the saved pattern seed.
4. Draw the same polygons in 3D and in the floorplan. Grass remains intact beneath every walkway and shows between all three natural stone layouts.
5. Expose the five layout controls in the floating Walkways panel. Verify serialization, width and endpoint edits, bends, junctions, finite geometry, visible stones, and no overlap.

Implementation status: all five steps are present. Automated pathway tests and type checking pass.

| Finish | Placement | Ground between stones | Edge treatment |
| --- | --- | --- | --- |
| Grass flagstones | Two or more loose rows of large irregular slabs | Open, showing terrain | No border by default |
| River stones | Dense mixed-size oval pebbles, including smaller infill stones | Open, showing terrain | No border by default |
| Stepping stones | One broad stone per stride along the centerline | Open, showing terrain | No border by default |

## Shared geometry rules

1. Sample each straight or curved edge by arc length. Stone centers follow its local tangent and normal, so widening and endpoint edits regenerate the layout in place.
2. Derive stone shapes and colors from the saved path ID, edge ID, row, and column. Reopening and reselecting must not reshuffle them. A seed control can deliberately reshuffle them.
3. Construct every stone as an independent clipped polygon. Clip against the joined walkway outline, respect mitered junction ownership, and subtract previously accepted stones to prevent overlap.
4. Extrude each stone with its selected bevel. Batch geometry by a small shade palette to control draw calls. All three natural stone layouts omit the full backing slab.
5. Draw the same polygons in the 2D floorplan. Keep endpoint arrows, selection, undo, and serialization on the existing walkway node.

## Controls and validation

The floating panel shows finish-specific stone size, spacing, irregularity, shade variation, and pattern seed controls. Defaults come from each finish; older nodes without these fields use the same runtime defaults. Verify every layout on straight, spline, L and T paths, at narrow and wide widths, and after saving. Check that stones remain visible, finite, inside the footprint, and non-overlapping.

Older saved curved-cobble paths load as river stones. The duplicate finish and raised-edge control have been removed.
