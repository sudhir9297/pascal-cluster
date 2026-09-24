# Step 4: mapped lane arrows

New OSM imports retain each edge's original way ID and raw tags. The importer attaches `turn:lanes:forward`, `turn:lanes:backward`, and one-way `turn:lanes` to the appropriate original way endpoint. Clipping, junction splitting, graph editing, and overlap removal discard indications at newly created endpoints. Scene serialization and road JSON exchange retain this metadata.

The renderer draws straight, left, right, and combined arrows in driver-relative lane order. Imported approaches without supported indications have no automatic direction arrows. Blank lanes, `none`, unsupported directions, and lane-count mismatches do not become invented straight arrows. Hand-authored and legacy roads without import metadata keep their previous illustrative arrows.

Interpretation follows the [OSM turn documentation](https://wiki.openstreetmap.org/wiki/Key:turn) and [lane ordering documentation](https://wiki.openstreetmap.org/wiki/Lanes). These tags describe indications, not legal turn restrictions, and can represent signage rather than painted arrows. The generated pavement symbols are illustrative representations of those indications.

This step does not reconstruct unequal directional lane layouts, bus lanes, or connectivity relations. Odd-lane bidirectional imports omit mapped arrows until their lane allocation is modeled. Slight/sharp turns, merges, U-turns, and vehicle-specific indications remain unsupported. Short approaches without room for the existing arrow placement omit the arrow. Reimport older roads to recover source tags discarded by previous versions.

The synthetic `src/__fixtures__/road-turn-arrows.json` intersection exercises a three-lane `left|through|right` approach. The offline Manhattan regression separately replays the captured OSM response and verifies West 48th Street's `through|through|right` data. Browser testing uses the dedicated scene at http://localhost:3002/scene/015307600dd0.

Validation: 499 tests pass and TypeScript passes. Browser checks verified the synthetic intersection in both 3D and 2D, then returned through the scenes list and reopened it to confirm that the arrows persist. No browser errors were reported in the final check. A development refresh during editing cleared the first fixture placement; the final settled-build import saved and reopened successfully.
