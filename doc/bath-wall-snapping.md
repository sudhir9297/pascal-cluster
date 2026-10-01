# Bath wall snapping

Bath placement and movement follow the editor item snapping context: grid and magnetic (lines) modes allow wall attachment; off mode preserves free position and rotation. All wall fits use the core `WALL_SNAP_DISTANCE_M`, level wall segments, and wall face thickness. The existing generic move tools invoke the bath/deck rotation-aware snap capability in 3D and grouped 2D moves; custom bath 2D movement uses the same mode gates.

| Bath | Wall behavior |
| --- | --- |
| Back-to-wall | Rear face aligns flush with either face of a straight wall. |
| Walk-in | Rear face aligns flush; the access door remains on the open front. |
| Alcove | Fits and centers within a complete three-wall bay with matching length. Incomplete or narrow bays do not force a fit. |
| Corner | Both straight shell faces align with adjoining perpendicular wall faces. |
| Drop-in / undermount | Placement and movement of the deck assembly align the outer enclosure to the wall. The bath retains its fitted position within the deck. |
| Oval / rounded rectangle / slipper / clawfoot | Freestanding; retain ordinary editor grid and alignment behavior without forced wall orientation. |

Hidden, curved, moving, out-of-range, or too-short walls are excluded. The bath remains level-parented, so moving away releases the magnetic fit rather than permanently attaching it to a wall.

Checks: existing bath geometry and corner/alcove fits; walk-in fitting on both wall sides and release beyond range; disabled 2D snapping; deck bounds at maximum size; free placement of freestanding shapes.
