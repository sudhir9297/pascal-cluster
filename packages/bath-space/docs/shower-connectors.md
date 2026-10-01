# Shower connectors and adapters

Research captured on 2026-10-01. Seven procedural presets and their persistent schema are implemented in `src/shower-connector`: coupling, extension, 45/90-degree elbows, ball swivel, articulated extension and reducer. Outlet transforms follow angle, azimuth and length; articulated extensions retain a parallel downstream outlet. Catalog, inspector, registration and placement/move tools are implemented; rendered editor verification remains pending; the supporting-parts checklist remains open.

Insertion/replacement helpers preserve a downstream head's identity and reparent it before deleting a replaced connector. Scene-store tests verify insertion, replacement, undo/redo, cycle rejection and subsequent head replacement without deleting the adapter. Head floorplans compose adapter outlet transforms; the connector system derives child transforms from current adapter parameters. The editor catalog now exposes these overhead insertion paths. Connector plan outlines and previewing downstream heads still need verification. Hose adapters, explicit thread compatibility, destination conflicts and connector-chain handling still need completion and broader verification.

## Reference evidence

The running editor renders all seven connector catalog entries; [catalog screenshot](shower-research/connectors-editor-catalog.png). Focused connector/head tests pass, including atomic insertion/replacement. Package TypeScript checking passes after integration. Pointer insertion and an inspector variant change have runtime evidence below; moving attachments and the full rendered variant gallery remain to be verified.

Runtime checks: a 120 mm straight extension was inserted on the square kit arm, retaining its head as a child at `[0,-0.12,0]`. Changing the adapter through its inspector to a 90-degree elbow retained adapter ID `bath-space-shower-connector_phgdwni282uwsdag`; the target and head both moved to `[0,-0.031831,0.031831]` with matching 90-degree outlet rotation. [Extension placement](shower-research/connectors-editor-extension.png), [elbow inspector and rendered scene](shower-research/connectors-editor-elbow.png). Runtime adapter movement and broader connection scenarios remain pending.

[Google Images screenshot](shower-research/connectors-google-images.png) shows compact angled adapters, ball swivels, threaded couplings and extensions. Search: `shower head swivel adapter extension elbow connector`. Image-search listings establish visual variety only; manufacturer references below establish product-specific parameters.

| Reference | Verified parameters | Modeling implication |
| --- | --- | --- |
| [Delta U4002-WH-PK pin-mount swivel](https://www.deltafaucet.com/parts/product/U4002-WH-PK.html) | Female 1/2-inch IPS inlet, male 1/2-inch IPS outlet; pin-mount use; overall height 2-1/8 inches | Compact swivel with distinct inlet collar, joint and outlet. Pin mount is a separate support interface. |
| [Hansgrohe 96044000 hose connection](https://www.hansgrohe.com/articledetail-hg-hose-connection-chrome-96044000) | G 1/2 connection, chrome; manufacturer lists compatible products | Short hose fitting; do not treat G and IPS as interchangeable thread standards. |
| [Delta UA902-PK adjustable arm](https://www.deltafaucet.com/bathroom/product/UA902-PK.html) | Brass construction, advertised 18-inch vertical adjustment | Articulated extension with two joints and adjustable reach; the stated adjustment is not the tube length. |

Captured manufacturer pages: [Delta swivel](shower-research/connectors-delta-swivel.png), [Hansgrohe hose fitting](shower-research/connectors-hansgrohe.png), [Delta extension](shower-research/connectors-delta-extension.png).

## Implementation requirements

Provide separate short coupling, straight extension, angled elbow and ball-swivel models. Add articulated extensions and reducing adapters with explicit parameter and connection semantics. Elbow angles and generic dimensions are editable modeling choices, not manufacturer replicas.

Parameters must distinguish body diameter, inlet/outlet diameter, body length, collar length, angle, swivel orientation and thread family/nominal size. Nominal pipe sizes must not be converted directly into modeled outside diameters.

Insertion between a host and an existing head or hose must preserve the downstream item's identity and reparent it in one undoable transaction. The adapter inlet sits on the original host slot; its outlet has its own stable slot that follows adapter shape and dimensions. Moving or replacing an adapter must retain compatible downstream attachments, reject cycles and enforce capacity. Unsupported combinations must be rejected before committing a placement.

Heads and hose endpoints must resolve adapter outlets through the same connection contract as direct hosts. Verify both direct and adapted connections, host resizing, adapter variant changes, endpoint movement, deletion, serialization and undo/redo in the actual editor.

Reducing adapters and thread conversion require verified connector pairs. Do not advertise a generic visual model as certified compatibility for a manufacturer's system. Tee/diverter fittings additionally need multiple independently identified outlets and remain part of the broader connection audit.
