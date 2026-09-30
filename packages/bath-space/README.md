# Bath Space

A procedural bathroom furniture plugin registered in the adjacent Pascal editor on `plugin-testing`.

Choose **Freestanding**, **Wall-mounted**, or **Corner** in the Bath Space sidebar. Freestanding and wall-mounted designs include Modern, Shaker, Fluted, and Open Console. Press **Place** and click in the scene; wall-mounted vanities require a wall. Changing the type or design during placement updates the preview. Select the cabinet and expand its inspector to customize it; the blue-purple scene arrows resize its dimensions.

Freestanding and wall-mounted vanities include:

- Drawer stacks, doors with shelves, mixed storage, drawers on either side, and an open console layout.
- Adjustable drawer rows and columns with equal-height or shallow-top drawers. Drawer boxes include solid rectangular bottoms, side walls, backs, and slide rails. The cabinet has a solid back panel without plumbing cutouts.
- **Individual opening:** click a drawer or door front to animate just that part. Select a vanity and press E to open or close everything together. Clicking or pressing E during an animation reverses it. Opening sliders control all drawers or all doors.
- **Custom sections:** choose Custom sections under Storage to start from the existing layout. Use up to three sections arranged left to right; choose drawers, doors, or open shelves for each. Adjust section width proportions, individual drawer height proportions, drawer counts, door counts, and shelf counts. Dimensions remain bounded by the overall cabinet size.
- Flat, Shaker, or fluted fronts; inset or overlay mounting; adjustable gaps, panel thickness, frame width, and flute spacing.
- Bar pulls, round knobs, edge pulls, or handleless fronts.
- Freestanding models have square, tapered, or round legs, or a recessed plinth. Leg height, width, inset, and an optional shelf between the legs are adjustable.
- Freestanding placement and dragging magnetically align the cabinet back flush with a nearby straight wall in Grid or Lines snapping mode. Dragging uses the editor's shared 3D/2D move resolver; moving away releases the snap. The vanity stays on the floor as a child of the level.
- Wall-mounted models have no legs or plinth. **Floor clearance** sets the bottom of the cabinet; **Top height from floor** sets its top. Open Console has suspended side supports and a shelf. Placement snaps the cabinet back to either face of a straight wall and centers it at the pointer's height. In 3D, drag it horizontally and vertically along the wall while preserving the grab offset and cabinet size. Plan-view dragging preserves its elevation. It can transfer onto another nearby wall and follows its parent wall when the wall moves or rotates. Resizing keeps the back flush and constrains width to the wall length. Press R to switch wall faces.
- An optional countertop with adjustable thickness, overhang, edge profile, and backsplash.

Every part starts white, with no preassigned finish or texture. Use the editor's paint tool to apply materials independently to the fronts, carcass, drawer interiors/shelves, countertop/backsplash, legs/base, and handles/fittings. Paint assignments use the same `slots` and shared scene-material references as kitchen cabinets. The inspector contains no finish, color, or material controls; changing a design preset preserves paint assignments.

The **Corner** starter is a floor-standing five-sided cabinet with two perpendicular rear panels, an angled front, a recessed plinth, one or two doors, interior shelves, and an optional countertop. Adjust its equal wall-return lengths, height, plinth height, fronts, handles, and shelves in the inspector. Click individual doors or press E to animate them. Placement and 3D/2D dragging snap into nearby right-angle corners formed by joined straight wall endpoints in Grid or Lines mode. It remains a child of the level and can be moved freely away from a corner.

Basins remain separate objects. The vanities have no plumbing cutouts. Existing dimension-only vanity nodes acquire defaults for the added parameters.

Reference designs: [Kohler freestanding cabinetry](https://www.kohler.com/en/products/vanities/shop-freestanding-vanities), [Winnow tapered legs and optional shelf](https://la.kohler.com/en/product-detail/33581-ASB?skuid=K-33581-ASB-0), [Bayliss fluted fronts and mixed storage](https://www.signaturehardware.com/72-in-bayliss-vanity---stoneware-white---vanity-cabinet-only/497807.html), and [Kohler's tailored vanity brochure with split top drawers](https://resources.kohler.com/webassets/kpna/brochures/TailoredVanites_US_FINAL.pdf).

Run `bun run check-types` and `bun run test` from this package to check the plugin and its geometry.
