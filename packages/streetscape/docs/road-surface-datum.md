# Step 1: shared driving-surface elevation

Road graph Y now means finished asphalt height. Style `surfaceThickness` is pavement depth below that height, rather than an offset added above it. Roads with different thicknesses therefore share their junction elevation.

The variable-width asphalt renderer and junction renderer now include downward pavement bottoms and boundary walls. Markings, roadside strips, generated attachments, bridge supports and earthworks use the same datum. Bridge clearance accounts for both pavement and structural deck depth.

Existing graph coordinates are preserved. Existing roads render lower by their former thickness; independently placed objects are not automatically migrated. Generated or attached objects follow the updated surface rules.

Validation: 475 unit tests pass; TypeScript passes. Regression tests cover thickness-independent surface and markings, varying pavement depth, closed pavement shells and junction bottoms. Browser smoke check at localhost:3002 confirmed existing curved roads and markings visible in 3D, with no captured console errors. This was not a fresh end-to-end OSM import test.

Next step remains intersection footprint trimming and continuous curb/sidewalk geometry. This change does not resolve existing intersection overlaps or missing source elevation data.
