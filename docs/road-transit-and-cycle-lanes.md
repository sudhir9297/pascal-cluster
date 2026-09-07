# Step 5: transit and protected cycle lanes

OSM imports now turn explicit `busway:left=lane`, `busway:right=lane`, and side-specific bus lane tags into a dedicated blue bus lane band. A bus lane is part of the side cross-section, so its width participates in the mapped roadway width calculation and remains continuous through junction bands.

`cycleway=track` now maps to the existing green cycle band in the same way as a marked cycle lane. Side-specific widths still win, and a protected track is kept separate from the vehicle carriageway in the 3D section. The original OSM tags remain on each imported edge for later refinement.

The implementation is conservative. A generic `bus:lanes` value without a side or a physical `busway` tag does not invent a side allocation. Bus lane access rules, lane connectivity relations, painted transit symbols, and platform geometry remain future work. Existing authored styles remain unchanged because the new width is optional.

Validation covers side-specific bus lanes, protected cycle tracks, width accounting, legacy cross-sections, the full test suite, and TypeScript. Browser verification used the dedicated saved scene workflow on port 3002; the existing persisted Streetscape scene still loads in 3D after the update.
