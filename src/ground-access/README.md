# Ground and access

The Landscape catalog provides the items below. Landscape-owned items have
their own schemas and geometry. Stairs and Retaining wall start editor tools.

| Item | Current 3D geometry | Next work |
| --- | --- | --- |
| Patio | Placeable rectangle with materials, grid/running bond paving, adjustable joints, contrasting border, drainage slope, resize/rotate handles, and pergola fit | Custom outlines, additional patterns, pathway/step transitions, post footing detail |
| Deck | Raised timber boards and frame | Posts, joists, rails, stairs, board direction |
| Concrete slab | Solid rectangular slab | Drawn outline, finish, joints, edge profile |
| Stairs | Opens the editor's native Stair Tool | Managed by the editor |
| Landing | Solid rectangular platform | Connect to steps and paths, elevation controls |
| Edging | Connected or closed drawn runs; continuous, separated, or woven construction; mitered continuous corners; paintable finish | Curved segments, junction editing |
| Retaining wall | Editor Wall tool with linked masonry courses and a top cap | Terrain cut and fill, corner cap miters |

Paving and stepping stones already have 3D geometry in `../pathways/`.
Grass and other soft ground surfaces are in `../ground-areas/`.

These are starter shapes. Drawn items use connected points on the selected level;
click to add points, press Enter or double-click to finish, Backspace to undo,
and Escape to cancel. Dimensions can be edited in the inspector, and shapes
appear in both 3D and floor plan. They do not yet connect to one another or
reshape the terrain.

Retaining walls remain editor Wall nodes for drawing, snapping, measurements,
and reshaping. The landscape plugin links a finish node to each wall marked as
a retaining wall. Select the wall and open the Retaining wall inspector section
to choose stacked block, fieldstone, or smooth concrete and adjust the cap.
The editor's room detector ignores these marked walls, including after edits.

Patio design decisions and current interaction details are in [`patio/README.md`](./patio/README.md).
