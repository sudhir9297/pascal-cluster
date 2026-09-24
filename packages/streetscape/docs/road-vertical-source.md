# Step 6: vertical source facts

Imported edges now retain the OSM vertical facts that were previously reduced to a non-negative graph stack level: signed `layer`, numeric `ele`, and bridge/tunnel flags. The graph still uses `stackLevel` only for safe overlap ordering. A negative OSM layer is never treated as a negative height or as metres.

This keeps the data needed for the next reconstruction pass without changing terrain placement or inventing a clearance. Existing bridge elevation interpolation continues to use the sampled terrain endpoints. The raw facts travel through graph editing and road JSON exchange, so a later solver can build explicit bridge decks and tunnel cuts from them.

Validation covers bridge, tunnel, signed-layer, and elevation parsing alongside the existing import and graph tests. The connected editor on port 3002 continues to load the persisted Streetscape scene in 3D at `http://localhost:3002/scene/c2403fb07b04`. Browser warnings are limited to existing viewer and image-performance notices.
