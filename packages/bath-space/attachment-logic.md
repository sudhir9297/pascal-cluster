# Bathroom attachment and slot logic

Reference: `/Users/sudhir/Desktop/create/Configurator/bathroom-config`.
Read from `logic.md`, `shared/socket-mount.js`, `shared/socket-child-resolution.js`, `shared/attachment-graph.js`, `shared/wall-tap-link.js`, `store/domains/attachments.js`, `store/domains/furniture.js`, and `components/Viewport/TapPlacementTool.jsx`.

## 1. The assembly model

A part attaches to a host. The stored mount is authoritative; the renderer, scene tree, and saved scene derive from it. Category decides what supports an item below it. Sockets independently describe what can attach above it. A wall hung basin can therefore expose a countertop tap socket even though the basin itself is wall supported.

## 2. Mount types

- World: an independent position and rotation.
- Surface: a host plus a local transform on its supporting surface.
- Socket: a host, socket name and type, with an optional local override.
- Wall: a wall host plus binding coordinates (along-wall position, wall side, and vertical offset).
- Alignment is a separate, weak relationship. A wall tap can serve a basin while remaining mounted to a wall.

## 3. Socket authoring and identity

The reference reads mesh-less transform nodes from GLB models. Current names follow `<type>_target_<slot>`, such as `tap_target_0`, `tap_target_1`, or `tap_target_wall`. Omitting the suffix gives slot `0`. Recognized types are `tap`, `showerhead`, and `hand_shower`. Meshes and unrecognized names are ignored.

Names provide stable saved identity. Type determines compatibility. Each slot holds one part. Multiple basin holes are independent slots, rather than one indivisible faucet set.

## 4. Socket transforms

The reference caches sockets in model-local coordinates and reads live world coordinates for placement. It inherits socket position and rotation and strips socket scale. The part keeps its own physical size. Nesting under the host makes parent movement and rotation cascade.

## 5. Countertop tap placement

The reference raycasts basin roots, identifies the owning basin, collects sockets, excludes occupied names, then chooses the free socket closest to the hit point. The click recomputes the candidate to avoid a stale preview. Placement remains armed for repeated additions. The current tool returns no candidate when no basin or free socket exists; the design document describes a broader prior-position fallback.

Our procedural basins currently expose one generated tap slot per basin. Our requested policy replaces the existing occupant in one scene transaction, rather than rejecting an occupied slot. Slot replacement deletes the scene record; it does not merely hide the old tap. A countertop tap also replaces a wall tap whose service link identifies that basin.

## 6. Wall tap placement

A wall tap uses a wall binding, never a basin socket. The reference raycasts walls, resolves the face and along-wall coordinate, snaps coordinates when enabled, and clamps the model within wall ends using its bounds. Away from a basin, pointer height drives placement. The ghost and final tap use the same binding math, including wall features.

Our wall taps store the wall as `parentId` and `wallId`, a wall-local position, side, and yaw. The spout projects away from the selected wall face. Plan placement preserves elevation. A render system recomputes the wall-face offset when thickness changes. Basin creation helpers reject wall tap designs.

## 7. Basin-service links and replacement

The reference selects the nearest basin on the same wall side, within 1.5 m both along the wall and perpendicular to it. It uses the basin's rendered rim height when available. The link stores the basin identity and the along-wall drop offset. Subsequent alignment can follow the basin without making it the tap's parent.

Reference `addTap` removes socket taps and other linked wall taps already serving the selected basin. Adding a socket tap removes linked wall taps serving that basin. Generic socket reparenting rejects an occupied socket, so replacement is a specific furniture action rather than a universal graph operation.

Our wall placement uses the same basin selection distances and stores a separate service slot and offset. Both wall and countertop taps reserve an explicit host/slot identity. Replacement uses that identity in one transaction and excludes the tap being moved. Free wall points have persistent IDs; the 1 cm proximity threshold only identifies which existing point was clicked. Linked wall taps now follow basin movement and height changes while preserving the chosen offset.

## 8. Attach, detach, and reparent

The reference validates that the item and host exist, rejects self-parenting and descendant cycles, and rejects an occupied socket. Detach converts the item to a world mount using its world transform. Local edits update the existing mount type. Changing a mount clears a matching gesture draft.

## 9. Swap and resize

The design calls for discrete model swaps. Direct socket children re-resolve against the new sockets; deeper descendants follow through the scene hierarchy. The resolver keeps the saved socket when compatible and free, otherwise assigns the next free compatible socket. Slots are assigned only once. Optional override reset removes prior manual offsets. Excess children with no compatible free slot are not assigned by this resolver.

Our models are procedural and allow continuous dimensions, which differs from the reference's discrete-model design. Basin tap targets are recomputed from the current geometry parameters.

## 10. Delete and weak-link cleanup

The reference builds a graph of owned children and separate alignment dependents. Removing an owner collects its subtree, removes records, prunes selection and matching drafts, and clears weak links on surviving followers. Deleting a weak alignment target does not generally delete the follower. Toilet accessory dependents have a special cascading removal policy.

The design distinguishes stored data, live scene instances, and cached source assets: delete data, dispose instance-owned resources, retain cached source assets. Shared cached resources must not be disposed with one instance.

## 11. Basin categories and support

The design table specifies: vessel basins use a vanity counter without cutting; under-counter basins use the counter and cut it; pedestal basins use the floor and remove the vanity; wall basins use the wall and remove the vanity. Basin sockets remain independent of these policies. The design also specifies stable first-entry defaults and resetting to the default vanity when returning to a vanity-supported category. These reference rules are not all automatic policies in the current Bath Space catalog.

## 12. Counter cutouts

The reference design uses model-authored cutter proxies and `three-bvh-csg`. Cutters trigger cutting; absence means no cut. Resolve the named `countertop` mesh first, otherwise use the whole vanity. Always derive the result from pristine geometry and the union of current cutters. Recut on placement/drag commit, not every pointer frame. Cutter proxies must pass through both slab faces. Preserve surviving material groups and use the cutter material for cut faces.

## 13. Persistence and gestures

Canonical scene records drive saving and rendering. Shape changes require persistence migrations in the reference store. Gesture drafts provide temporary previews; begin/commit history grouping makes a drag or slider operation one undo step. Cancellation clears drafts and placement state. Replacement should be a single atomic mutation so undo restores both the previous occupant and the slot.

## Boundary of this change

This implementation adds a shared attachment operation, stable slots, mount/service separation, shared pose resolution, linked wall-tap following, and deletion cleanup to Bath Space. It documents the reference's broader architecture; it does not port its GLB pipeline, full alignment engine, category defaults, or CSG engine.

## Shared attachment implementation

- `attachments/slots.ts` provides the shared host/slot identity, type and capacity validation, cycle checks, and atomic create/move/replacement transaction builder.
- Tap mounting uses `parentId`/`wallId`/`slotId`; service links use `servesBasinId`/`serviceSlotId`/`linkOffset`. Service links never change the mounting parent.
- Basins support a generated single or three-slot layout through the inspector, plus explicit named `tapSlots` in scene data. Generated positions follow dimensions. Each slot holds one tap. Older scenes default to the original `tap` slot.
- `taps/binding.ts` resolves wall candidates and following transforms. Preview, creation, movement, 3D rendering and plan rendering share this resolver. Free wall mounting points receive persistent IDs. Proximity only picks a previously authored wall point; it no longer decides occupancy.
- Countertop tap moves can select another basin slot. Both plan and 3D placement use explicit slot identity for replacement.
- Linked wall taps preserve along-wall and height offsets as the served basin moves or resizes. Old links acquire offsets from their saved position when the attachment system mounts, avoiding a visible jump.
- Basin deletion hooks freeze surviving wall taps at their last resolved pose and clear service links within the deletion undo step. Owned children follow the editor's existing subtree deletion.
- Single/three-slot changes preserve matching occupants, reassign available slots, and delete excess occupants in one transaction.
- Saved node fields contain relationships; world positions are derived. View-only following updates do not create undo entries every frame.
