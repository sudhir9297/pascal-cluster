# Bath options research and implementation order

Research date: 1 October 2026

Project: `packages/bath-space`

## State at the start of research

Bath Space already supports freestanding, wall-mounted, and corner vanities, seven basin types, and basin taps. The catalog has a Bath category, but it currently displays an empty state. No bathtub definition is registered in `src/index.ts`, and there are no bath placement tools or inspectors.

This assessment describes the implementation before the first bath models were added. The checklist below tracks progress from that starting point.

## Implementation checklist

Checked items are implemented. Unchecked items remain planned. Existing basin taps can use the bath targets; dedicated bath fillers are still pending.

### Bath types and shapes

- [x] Freestanding oval soaking bath.
- [x] Freestanding rounded-rectangle soaking bath.
- [x] Freestanding slipper soaking bath.
- [x] Clawfoot bath and configurable feet/base styles.
- [x] Back-to-wall bath with wall snapping.
- [x] Alcove bath with front apron and three-wall fitting.
- [x] Corner bath with triangular or asymmetric shapes and corner snapping.
- [x] Drop-in bath with surrounding deck and opening.
- [ ] Undermount bath attached beneath a deck opening.
- [ ] Walk-in bath with door, seat, and low entry.
- [ ] Tub/shower combination assembly.

### Bath geometry and finishes

- [x] Hollow bowl, rounded rim, and sloped interior.
- [x] Editable length, width, height, bowl depth, and rim width.
- [x] Drain opening and optional drain cover.
- [x] Optional overflow trim.
- [x] Paint slots for the shell, drain cover, and overflow trim.
- [ ] Adjustable drain position and left/right handedness.
- [ ] Separate interior and feet/base finishes.
- [ ] Modeled overflow channel and plumbing connections.
- [ ] Additional adjustable backrest profiles.

### Fillers and attachment targets

- [x] Configurable rim-mounted fitting slot for an existing single-hole tap.
- [x] Wall-mounted fitting target using the existing wall tap catalog.
- [x] Occupied-slot replacement and attachment updates as the bath moves or resizes.
- [x] Wall fittings retain their wall parent and follow a bath service link.
- [x] Bath deletion clears service links and preserves wall fitting placement.
- [ ] Dedicated floor-mounted bath filler.
- [ ] Dedicated wall-mounted bath filler.
- [ ] Dedicated rim/deck-mounted bath filler.
- [ ] Bath hand shower, hose, and holder.
- [ ] Multi-hole bath mixer arrangements and mounting bores.

### Catalog and scene editing

- [x] Bath catalog cards, search, favorites, and shape presets.
- [x] Floor placement and placement previews.
- [x] Selection, movement, rotation, resize handles, and duplication.
- [x] Bath inspector and saved scene schema.
- [x] Plan footprints and Section A-A drawings.
- [ ] Installation-specific wall, alcove, corner, and deck placement.
- [ ] Deck opening and attached bath lifecycle.

### Supporting assemblies and advanced options

- [ ] Built-in bath decks, enclosures, and aprons.
- [ ] Bath-compatible showerhead and controls.
- [ ] Glass bath screen.
- [ ] Shower curtain and rail.
- [ ] Walk-in door interaction, seat, and grab handles.
- [ ] Whirlpool jets.
- [ ] Air-bubble fittings.
- [ ] Heated surface options.
- [ ] Water and hydrotherapy simulation, subject to a separate scope decision.

## Bath installation options

| Option | Description | Geometry and placement requirements |
| --- | --- | --- |
| Freestanding | Finished exterior exposed on all sides | Hollow bowl, finished shell, floor placement, rotation; oval, rounded rectangle, slipper, and clawfoot variants |
| Back-to-wall | Finished tub with a flat rear edge against a wall | Wall-flush rear face, exposed front and sides, wall snapping |
| Alcove | Tub enclosed by three walls | Rectangular body, front apron, wall fitting, left/right drain variants |
| Drop-in | Tub with a raised rim resting on a surrounding deck | Separate deck or enclosure, mounting rim, derived deck opening |
| Undermount | Tub mounted beneath a surrounding deck | Bowl below the deck, derived opening, attachment to the deck |
| Corner | Tub designed for two adjoining walls | Corner snapping, triangular or asymmetric exterior, shaped bathing well |
| Walk-in | Tub with an access door, often with a seat | Low entry, seat, sealed door geometry, grab handles, door animation |
| Tub/shower combination | Bathtub combined with shower fittings | Compatible tub, showerhead, controls, hand shower, glass screen or curtain |

Kohler's [bathtub buying guide](https://www.kohler.com/en/inspiration/buying-guides/bath-tub-buying-guide) describes freestanding, alcove, drop-in, undermount, corner, and walk-in installations. Duravit provides references for [back-to-wall baths](https://www.duravit.com/en-en/products/bathing/bathtubs/pre-wall-bathtubs/) and [corner baths](https://www.duravit.com/en-en/products/bathing/bathtubs/corner-bathtubs/). Kohler's [walk-in bath door reference](https://www.kohlerwalkinbath.com/features/safety/extra-wide-door/) also shows an optional bath/shower screen.

## Configurable bath features

Installation type and bathing features should be separate settings. A freestanding or built-in bath may be a simple soaking bath or support hydrotherapy.

- Soaking bowl without jets.
- Whirlpool water jets or air-bubble fittings.
- Heated surfaces where supported by a design.
- Shapes such as oval, rounded rectangle, slipper, and asymmetric corner designs.
- Length, width, overall height, internal bowl depth, rim thickness, and backrest profile.
- Drain position and left/right orientation where applicable.
- Paintable shell, interior, feet/base, drain, overflow trim, and fittings.

Kohler's [bath range](https://experience.kohler.com/en/products/bathtubs/shop-bathtubs?facets=Collections%3AEntity) includes hydrotherapy baths and acrylic, enameled cast iron, and solid-surface materials. Material choices are research references; Bath Space should continue using the editor's existing paint workflow.

## Gaps identified at the start of research

### Tub models

Procedural hollow interiors, rounded rims, sloped bowl floors and backrests, base support, and installation-specific exterior geometry. Each installation needs suitable presets rather than one exterior reused for every type.

### Bath fittings

Floor-mounted, wall-mounted, and deck-mounted bath fillers; hand showers; drain and overflow details. Existing taps are designed around basin placement and attachment. Bath fittings need their own compatible dimensions and attachment targets.

### Placement and attachments

Free floor placement for freestanding baths; wall snapping for back-to-wall baths; wall fitting for alcove baths; corner snapping; deck attachment and openings for drop-in and undermount baths. Attachment behavior should support movement, rotation, resizing, duplication, deletion, and undo.

### Catalog and editor controls

Bath catalog cards and presets, placement previews, inspectors, dimension and rotation handles, plan footprints, section drawings, paint slots, and saved scene schemas. Controls should follow the established Bath Space fixture conventions.

### Supporting assemblies

Decks and aprons for built-in baths, shower screens and shower fittings for tub/shower combinations, and accessibility fittings for walk-in baths. Deck cutouts need a defined host integration, similar in principle to existing inset basin support.

## Suggested implementation order

The freestanding bath models in step 1 are implemented, including a slipper preset. Dedicated bath fillers in step 2 are next. Use the checklist above for the status of individual items and work through one assembly at a time.

1. **Freestanding soaking baths.** Start with oval and rounded-rectangle presets. Include a hollow bowl, drain and overflow details, editable dimensions, floor placement, rotation, paint slots, plan footprint, and section drawing.
2. **Bath fillers.** Add a floor-mounted filler first to complete the freestanding assembly, then wall-mounted and deck-mounted variants. Include compatible attachment targets and an optional hand shower.
3. **Back-to-wall baths.** Add a wall-flush body and wall snapping, reusing established bath controls where appropriate.
4. **Alcove baths.** Add the front apron, three-wall fitting, and left/right drain variants.
5. **Corner baths.** Add corner-specific geometry and placement.
6. **Bath decks and drop-in baths.** Establish the deck/enclosure host, derived opening, and tub attachment lifecycle.
7. **Undermount baths.** Extend deck support with a bowl mounted beneath the deck.
8. **Tub/shower combinations.** Add shower fittings and screen or curtain options. Shower remains a separate catalog category; a combination assembly can connect the relevant fixtures.
9. **Walk-in baths.** Add door and seat geometry, accessibility fittings, and door interaction.
10. **Additional designs and hydrotherapy details.** Add clawfoot styles and visible jet or air-bubble fittings where supported. The slipper style is already implemented. Water and hydrotherapy simulation require a separate scope decision.

The first usable milestone is an oval or rounded-rectangle freestanding bath with a floor-mounted filler and drain/overflow details. It has fewer host dependencies than built-in baths and establishes the bath-specific geometry and editor behavior for later work.


## First implementation

Freestanding oval, rounded-rectangle, and slipper baths are now implemented. They include hollow shells, rounded rims, editable dimensions, drain and overflow trim, floor placement, resize and rotation handles, paint slots, plan footprints, and Section A-A controls.

The bath has a configurable rim or wall fitting target. Rim mounting accepts one existing single-hole countertop tap. Wall fittings retain their wall parent and use a weak bath service link. Slot replacement and bath deletion follow the shared attachment behavior. Dedicated bath fillers and hand showers remain the next work item; the first implementation reuses the existing tap catalog. Built-in bath types and decks remain pending.

## Clawfoot bath implementation references

Google Images search: [clawfoot bathtub ball claw feet pedestal](https://www.google.com/search?udm=2&q=clawfoot+bathtub+ball+claw+feet+pedestal).

- [Search screenshot](references/clawfoot-google-images.png): oval shells raised on four decorative feet, including ball-and-claw profiles.
- [Editor screenshot](references/clawfoot-editor.png): placed hollow clawfoot bath with four supports.
- [Section screenshot](references/clawfoot-section.png): editable bath dimensions and supported section profile.

Added a clawfoot catalog preset and configurable integrated, ball-and-claw, rounded-foot, and pedestal bases. Support height ranges from 80 to 200 mm. Feet and pedestal have a separate paint slot. Overall rim height stays fixed when supports change; bowl depth is limited to retain shell clearance above the supports. Decorative claws are procedural approximations of the reference shapes.

Verification: 132 tests passed, including support styles at minimum and maximum support heights, floor contact, rim height, bowl depth, and paint slot separation. Browser placement, catalog, inspector, and section rendering were inspected. Remaining checklist items are still pending.

## Back-to-wall bath implementation references

Google Images search: [back-to-wall bathtub flat back oval Duravit](https://www.google.com/search?udm=2&q=back+to+wall+bathtub+flat+back+oval+Duravit).

- [Search screenshot](references/back-to-wall-google-images.png): oval bathing wells, straight rear shells and rear ledges.
- [Editor screenshot](references/back-to-wall-editor.png): placed back-to-wall model alongside the clawfoot bath.
- [Section screenshot](references/back-to-wall-section.png): straight rear plan outline around the oval well and editable dimensions.

Added a distinct back-to-wall shell and catalog preset. Existing bath dimensions, paint, drain/overflow and rim/wall fitting targets remain available. Floor placement and direct dragging snap the rear face flush to nearby straight walls, rotate to either wall face, and clamp the bath length within wall ends. The bath stays level-parented; snapping does not create a permanent wall attachment. Curved, hidden and undersized walls are excluded.

Verification: 137 tests passed, including flat rear geometry, dimension extremes, and both faces of a rotated wall. Catalog, placement, model, inspector and plan/section drawing were inspected in the browser. The final package type check reported unrelated nullable basin-thumbnail arguments in `src/panel.tsx`; the earlier check passed before those concurrent edits.

## Alcove bath implementation references

Google Images search: [alcove bathtub apron left right drain three wall](https://www.google.com/search?udm=2&q=alcove+bathtub+apron+left+right+drain+three+wall).

- [Search screenshot](references/alcove-google-images.png): rectangular rims, front aprons, three-wall installations and end-drain designs.
- [Editor and section screenshot](references/alcove-editor-section.png): placed rectangular alcove bath, catalog entry, editable dimensions and plan/section drawing.

Added an alcove preset with a vertical rectangular exterior, rounded bathing well, separately paintable front apron and apron thickness from 15 to 50 mm. Left, centre and right drain settings move the actual drain bore and cover; end-drain variants also move the overflow trim to the selected end. Alcove models use an integrated floor-supported base and retain the existing rim and rear-wall fitting targets.

Placement and dragging snap to matching three-wall bays: the rear wall establishes orientation, perpendicular side walls establish the centre and must cover both bath-end corners, and the inner bay length must match the bath length within 40 mm. Hidden walls, missing side walls and mismatched lengths are rejected. Free floor placement remains available for modeling before walls are drawn. This is geometric snapping, not a permanent wall attachment or automatic resizing of the bath or room.

Verification: type checks and all 139 tests passed. Tests cover complete/incomplete bays, bay centring, size mismatch, open left/right drain bores, overflow handedness and the apron paint slot. Browser catalog, floor placement, rendered model, inspector and plan/section drawing were inspected; changing to Right drain produced the selected state in the inspector. A nullable argument in the existing basin-thumbnail helper was corrected to restore the package type check.

## Corner bath implementation

Google Images search: [corner bathtub quarter circle asymmetric shapes](https://www.google.com/search?udm=2&q=corner+bathtub+quarter+circle+asymmetric+shapes).

The search showed quarter-round corner shells and asymmetric offset baths. A [downloaded search thumbnail](references/corner-google-thumbnail.jpg), labeled “Acrylic corner symmetricl bathtub ExclusiveLine ORUNA 140x140 cm” in the results, was inspected for the straight rear sides and curved front. This is a downloaded reference image, not a browser screenshot.

Manufacturer references: [RIHO Neo product data sheet](https://www.riho.com/upload/media/default/a78a/5d/77604ab4e570a7e501263f9340c879a82061eb42.pdf) describes a quarter-round symmetrical bath in 140 × 140 and 150 × 150 cm sizes. [RAVAK's corner range](https://www.ravak.com/en/eshop/corner~1?start=1) includes equal-sided and asymmetric models. These references guide the category and proportions; the procedural model is not an exact replica of either product.

Added a corner catalog preset with a 1.4 × 1.4 m default, independent side lengths for asymmetric proportions, a quarter-elliptical front and two straight wall-facing sides. The hollow interior follows the corner outline. Width supports up to 1.8 m for corner baths. The integrated base, finishes, drain/overflow and rim/rear-wall fitting targets use existing bath controls. Placement and dragging align both straight shell faces with visible adjoining right-angle wall segments, accounting for each wall's thickness and rejecting walls too short to support the selected dimensions.

Verification so far: type checks passed. All 146 tests passed, including equal/asymmetric bounds, both straight wall planes, open drain, finite geometry at dimension extremes, and two-wall placement at three corner rotations. Browser catalog and placement were exercised, and the inspector reported the 1.400 × 1.400 m plan, dimensions and fitting controls.

Screenshot capture initially failed, then recovered. The [Google image search screenshot](references/corner-google-images.png), [editor model screenshot](references/corner-editor-model.png), and [editor section screenshot](references/corner-editor-section.png) have now been saved and inspected. The corner checklist item is checked.

## Drop-in bath and deck

Google Images search: [drop-in bathtub deck surround rim installation cutout](https://www.google.com/search?udm=2&q=drop+in+bathtub+deck+surround+rim+installation+cutout).

- [Google search screenshot](references/drop-in-google-images.png): deck construction, supported bowls and raised mounting rims.
- [Downloaded search thumbnail](references/drop-in-google-thumbnail.jpg): RONA platform construction reference from the search results, inspected before modeling.
- [Editor screenshot](references/drop-in-editor.png): separate deck and bath scene objects, with the bath seated inside the deck opening.
- [Deck inspector screenshot](references/drop-in-deck-inspector.png): editable surround dimensions, top thickness and enclosure panels.

Implemented a separate `bath-space:bath-deck` host with paint slots for its top and enclosure, plus a drop-in bath preset. One catalog placement creates both objects in a single scene transaction. The bath is a child of the deck; deck movement and rotation carry the bath, while deck height establishes the bath rim elevation. The raised rim extends beyond the recessed body. A genuine opening is generated from the bath outline, position and rotation, and updates from attached child geometry. Removing the bath restores a solid deck top. Rim and wall fitting calculations now include the deck parent transform.

Verification so far: type checks and all 153 tests passed. Tests cover derived holes, offset/rotated/resized openings, removal, out-of-bounds cut rejection, parent/fitting transforms, atomic creation, undo/redo and deletion of the deck subtree. Browser placement created separate deck and bath catalog entries; the rendered assembly and deck inspector were inspected. A client directive ordering error in the shared panel was corrected so the editor could load.

Bath and deck dimension controls now enforce the rim landing and floor clearance. Bath movement and its rotation handle validate the available surround; the generic rotation tool is disabled for a deck-parented bath. The inspector supports transfer to compatible decks and detachment onto the floor. Focused scene tests verify transfer, detachment, undo and duplication with fresh parent/child IDs. The type check and all 157 current package tests pass. Browser verification confirmed placement of both objects, deck-specific bath dimension limits, detachment and reattachment, and typed deck dimensions clamping to the minimum supported length (1.780 m) and height (0.555 m) for the default bath. Saved and inspected the [fit inspector screenshot](references/drop-in-fit-inspector.png) and [deck fit screenshot](references/drop-in-deck-fit.png). The drop-in checkbox is checked. The wider deck/enclosure checklist item also remains pending until all supported built-in bath types are verified.

## Undermount bath, implementation in progress

Google browser image search attempted: [undermount oval bathtub stone deck rim](https://www.google.com/search?udm=2&q=undermount+oval+bathtub+stone+deck+rim). Google returned a traffic challenge; the [saved challenge screenshot](references/undermount-google-challenge.png) is evidence of that failure, not an image-reference search screenshot. Do not check the item until the requested Google image evidence is available.

Inspected [Kohler's undermount guide](https://www.kohler.co.in/blog/bath-essentials/undermount-bathtubs-guide), saved its [browser page screenshot](references/undermount-kohler-reference.png), and rendered and inspected page 8 of the [Kohler K-817/K-892 installation guide](https://resources.kohler.com/onlinecatalog/pdf/1135400_2.pdf). The [installation drawing](references/undermount-kohler-installation.png) shows a rectangular bathing well beneath the counter, with the counter covering the bath rim. Manufacturer images of drop-in baths were excluded as undermount evidence because their rims remain exposed.

Implemented an undermount preset with selectable oval or rectangular bathing well. Its separate deck covers the outer rim; the real deck opening derives from well dimensions and rim width. The bath top sits below the deck underside with a 2 mm modeled seam. Deck thickness participates in bath height limits and minimum deck height; thickness edits raise the deck as necessary to preserve floor clearance, within the deck height limit. Built-in baths use an integrated base. Concealed rims reject tap attachments and disable the inspector's rim mounting choice; wall service targets remain available. Dedicated deck-mounted filler targets remain a separate checklist item.

Verification: type check and all 166 current package tests pass. Tests cover covered rim cutouts, empty well holes, restored deck surfaces after removal, both well outlines, height/thickness relationships, finite bath geometry at dimensional extremes and rejection of concealed-rim fittings. Browser checks confirmed placement of both objects, switching well shapes, disabled rim mounting, detach/reattach, bath height limits, and typed deck size clamping (minimum length 1.780 m and height 0.622 m for the default bath). Saved and inspected the [bath inspector](references/undermount-editor-inspector.png) and [deck inspector](references/undermount-deck-inspector.png).

Inspected the corrected [3D editor model screenshot](references/undermount-editor-model.png): the deck surrounds the well and covers the outer rim, with the bowl recessed beneath it. Explicit undermount transfer, duplication and undo lifecycle tests also pass (19 focused bath/deck tests).

Remaining before check-off: Google image-reference evidence. Google currently returns a traffic challenge, so this item remains unchecked.

## Walk-in bath, implementation in progress

Attempted the [Google Images search for walk-in bathtub inward door and seat](https://www.google.com/search?udm=2&q=walk+in+bathtub+inward+door+seat). Google again returned a traffic challenge; saved [challenge evidence](references/walk-in-google-challenge.png). The retry for undermount baths also returned a challenge, saved [here](references/undermount-google-retry-challenge.png). These are not accepted image-search reference screenshots.

Inspected Kohler's [extra-wide door reference](https://www.kohlerwalkinbath.com/features/safety/extra-wide-door/), its [browser screenshot](references/walk-in-kohler-door-reference.png), and a downloaded [close-up door photograph](references/walk-in-kohler-door.jpg). Rendered and inspected the first page of the [manufacturer dimensions PDF](https://www.kohlerwalkinbath.com/library/pdf/KWIB-specs-page.pdf), saved as a [dimension reference image](references/walk-in-kohler-dimensions.png). The photographed bath has a tall rectangular body, low front entry, an inward door, and a raised seat opposite the doorway. Its listed body height is 39 inches, entry 3 inches and seat 17 inches. The implemented defaults use approximately 0.99 m body height, 0.075 m threshold and 0.43 m seat height. This is a configurable generic model, not a certified manufacturer reproduction.

Implemented a walk-in catalog preset with an actual gap in the front shell above the threshold, an inward door pivot, visible perimeter seal and handle, raised seat with back support, and optional grab handle. The front opening and seat mirror with left/right entry. Door width, opening progress, threshold, seat height and depth, shell/rim dimensions, overall dimensions and component finishes are editable. The door button and E key toggle opening. A real floor drain bore remains when the cover is disabled. Seat, door, seal and handle use separate paint slots. Geometry limits keep the inward door clear of the seat; height handles and section edits have walk-in-specific bounds. The plan and section now show the seat, threshold and door pose, and inactive soaking-bowl controls are hidden.

Focused tests verify the actual entry gap, closed door coverage, inward hinge direction, seat clearance throughout opening, mirrored seat placement, open drain bore, finite geometry at dimensional limits and active section dimensions. The type check passes. The latest package-wide run has 170 passing tests and one failure in the separate floor-standing-toilet control test; no bath test fails.

Browser verification confirmed catalog placement, editing entry handedness, open/close button behavior, and E-key close/open behavior. Saved and inspected the [editor inspector screenshot](references/walk-in-editor-inspector.png) and [3D open-door model screenshot](references/walk-in-editor-open.png).

Additional verification now passes: door opening and entry handedness survive scene serialization; undo restores the closed left-entry bath and redo restores the edited state. Both handed layouts have finite geometry at dimensional limits. Browser section input accepts 0.850 m and 1.150 m body heights and rejects 1.250 m, preserving the last valid height. Saved and inspected the [height-limit screenshot](references/walk-in-editor-limits.png). All 27 focused bath/deck/section tests and the current type check pass. The walk-in type and interaction/seat/grab-handles checkboxes remain open solely for the requested Google image-reference evidence.

## Tub/shower combination, references inspected

Opened the [Google Images search for tub shower combination glass screen](https://www.google.com/search?udm=2&q=tub+shower+combination+glass+screen). It returned a traffic challenge; saved the [challenge screen](references/tub-shower-google-challenge.png), not accepted image-search evidence.

Inspected the official [Kohler shower package page](https://www.kohlerwalkinbath.com/features/comfort/shower-package/), captured its [browser screenshot](references/tub-shower-kohler-reference.png), downloaded and inspected the [package photograph](references/tub-shower-kohler-photo.jpg). The photograph shows a clear vertical bath screen with two wall hinges, a wall-mounted gooseneck arm and showerhead above the bath, wall control trim, and rim-mounted bath fittings. The screen is independent of the walk-in access door. Manufacturer descriptions offer regular/extended arms and three showerhead styles.

The full assembly remains unimplemented. Existing Bath Space shower arms, heads, controls and wall spouts can supply its fixtures, but they do not yet form a bath-linked combination assembly. Current arm systems already propagate outlet poses to attached heads and preserve wall binding. The assembly needs a real screen component, compatible bath fitting targets, explicit bath/fixture associations, placement on the correct wall face, updates after bath or wall edits, replacement by slot, and verified duplication/deletion/undo. Avoid representing the whole assembly as a single baked mesh: its fixtures need to retain their editable parameters and existing attachment semantics. The separate shower-assembly work in this worktree is still in progress; inspect its final registered capabilities before integrating it.


## Bath screen, implementation in progress

Attempted [Google Images for hinged glass bath screens](https://www.google.com/search?udm=2&q=glass+bath+screen+hinged+rounded); Google returned a traffic challenge. Saved [challenge evidence](references/bath-screen-google-challenge.png). This does not satisfy the requested Google image-reference screenshot.

Inspected [Merlyn MB1 single curved screen](https://www.merlynshowering.com/mb1-single-curved-bath-screen.html), its [browser reference screenshot](references/bath-screen-merlyn-reference.png), and [downloaded product photograph](references/bath-screen-merlyn-photo.png). Also rendered and inspected page 121 (PDF index 122) of the [manufacturer collection guide](https://www.merlynshowering.com/amfile/file/download/file/2058/product/6014/), saved as a [screen drawing reference](references/bath-screen-merlyn-drawing.png). The MB11 drawing shows a reversible rounded screen with 90° inward/outward swing and a bottom seal aligned with the bath inside edge. MB1 and MB11 have different glass specifications; the generic model supports 4–12 mm thickness rather than reproducing either product exactly.

Added an independent `bath-space:bath-screen` child, a capacity-one screen target on compatible baths, and inspector attachment/replacement. Square and rounded profiles have real glass thickness, separate hardware and bottom-seal paint slots, an optional frame that follows the curved perimeter, editable panel dimensions and corner radius, left/right/automatic hinge side, and opening from −90° to +90°. The screen follows bath size and parent deck transforms; undermount screens sit at the deck surface. Automatic handedness places a walk-in screen opposite its entry. E and the inspector button toggle opening. Floorplan dependencies include all ancestors. Corner baths reject this straight-screen layout and cannot switch to corner while a screen is attached.

Verification: all 26 focused bath, deck and screen tests pass, including rounded corner/frame shape, finite geometry at dimensions, both opening directions, mounting height, replacement capacity, subtree duplication, deletion and undo. Browser checks confirm attachment, rounded profile/frame controls, open/close and E-key interaction; [inspector screenshot](references/bath-screen-editor-inspector.png) and [model screenshot](references/bath-screen-editor-model.png) are saved. The latest package type check is currently blocked by an unrelated concurrent `shower-assembly/placement.ts` error (`wallHeight` possibly undefined), not by the screen files.

At this stage, screen check-off still required Google image-reference evidence and wall mounting integration. The later bath-end wall mounting section below records the implemented wall support. The glass screen and tub/shower combination boxes remain unchecked.


### Bath-end wall mounting

Retried the [Google Images search for bath-screen wall hinge installation](https://www.google.com/search?udm=2&q=bath+shower+screen+wall+hinge+installation). It again returned a traffic challenge, saved as [retry evidence](references/bath-screen-wall-google-retry.png). The previously inspected Merlyn installation diagram remains the shape/mounting reference.

Added a shared bath-end wall resolver for the combination assembly. It finds a straight wall perpendicular to the bath length, checks the wall face toward the well, bath-to-wall gap (at most 25 mm), station clearance and wall height, then places the fixed hinge against that face. It supports either wall direction, either bath end and deck parent transforms. Wall-bound screens retain a wall ID, include it in floorplan dependencies, and follow effective bath/deck/wall edits. Invalid support hides the screen in both renderers until the fit is restored. Unbound screens are explicitly labeled as preview placement; the inspector can bind a compatible end wall or return to preview.

Focused tests verify 24 combinations of bath rotation, wall direction, hinge side and deck parenting, and rejection of unsupported height, missing/hidden walls, a long-side/angled wall, excess gap and bath penetration. Wall association survives serialization and bath subtree cloning; wall deletion preserves the bath child but invalidates its mount, and undo restores support. Type checking passes after the concurrent shower-assembly type error was resolved.

Remaining for the combination: connect shower fittings to the shared resolver, retain independent replaceable fixture slots, and verify the complete assembly lifecycle and browser behavior. Google reference evidence remains outstanding.


Browser verification now passes: imported a bath/end-wall/screen scene through the editor's Load Build flow, selected the independent screen, and verified mounted status. Switching to the unsupported hinge end hides the panel and reports unavailable support; switching back restores it. Preview/unbind and mount controls also pass. Saved and inspected the [wall-mounted screenshot](references/bath-screen-wall-mounted.png) and [unsupported-wall screenshot](references/bath-screen-wall-unsupported.png). The full current package run has **185 passing tests and one failure** in the unrelated wall-flush-plate section dimension test (`seamWidth` does not change the drawing); screen and bath tests pass. No new checkbox was checked: Google image evidence and the complete shower-fitting assembly remain pending.


## Bath-linked tub/shower combination, implementation in progress

Retried [Google Images for bath shower columns and glass screens](https://www.google.com/search?udm=2&q=bath+shower+thermostatic+column+glass+screen). Google still returns a traffic challenge; saved [retry evidence](references/bath-shower-column-google-retry.png). The previously inspected [Kohler shower package photograph](references/tub-shower-kohler-photo.jpg) and [Merlyn bath-screen installation drawing](references/bath-screen-merlyn-drawing.png) guide the assembly relationship: a wall-mounted head and controls above the well, with an independent hinged screen at the front edge. Existing column/panel geometry supplies configurable generic fixtures rather than a manufacturer replica.

Added `bath-space:bath-shower`, owned by its bath, with an explicit end-wall association. The bath inspector creates or replaces a complete combination in one transaction at either compatible end. The host reuses parameterized shower columns/panels and their hardware/control finishes, with separate head, handset, hose and glass-screen children. Head and handset targets retain capacity-one replacement. The combination has no independent move action: move the bath or adjust its fixture parameters. Deleting the combination removes its children while retaining the bath; bath subtree duplication includes all parts.

A shared resolver validates the supporting end wall, floor-relative control height, ceiling clearance and conservative head footprint inside the bathing well. Effective bath/deck/wall edits update the host transform. Invalid fit hides the combination and its screen. Screen mounting is converted into its combination parent's frame so both hinge sides and rotated baths retain the correct front-edge position. Head/handset floorplans and hose endpoints now resolve bath-mounted hosts as well as ordinary wall fixtures.

Combination-owned hoses follow the host's handset slot instead of storing an internal handset ID. Generic host subtree cloning does not remap plugin-specific endpoint IDs; the slot association prevents duplicated hoses from connecting to the original bath. Explicit cross-host hose connections remain available. Handset replacement preserves this local association, while moving a handset outside its host converts the connection to an explicit endpoint.

Verification so far: 18 focused combination/screen/head/handset/hose tests passed before the added handset-replacement clone assertion; the latest combination lifecycle tests also pass. Checks cover both ends at three rotations, true child screen transforms, finite geometry, valid hose connections, slot replacement, save, atomic assembly replacement, duplication, deletion, undo and redo. Type checking passes. The current complete package run reports 193 passing tests and one unrelated wall-flush-plate section failure (`seamWidth`). Browser creation and independent screen editing/opening passed; saved and inspected the [combination screenshot](references/bath-shower-editor-combination.png) and [open-screen screenshot](references/bath-shower-editor-screen-open.png).

The tub/shower combination, bath-compatible showerhead/controls and glass-screen checkboxes remain unchecked pending Google image-reference evidence and final browser checks of the updated hose binding and component replacement. Curtain/rail is a separate remaining supporting option.


Final browser checks of the updated binding passed: the owned hose inspector reports a valid two-ended connection and selects its local handset; independent head editing switches to the compact shape with the selected preset reflected in the inspector. Saved and inspected the [hose screenshot](references/bath-shower-editor-hose.png) and [head screenshot](references/bath-shower-editor-head.png). All 18 focused tests now pass, including the added handset-replacement/clone assertion. Combination-owned screen and fixture transforms, lifecycle and component editing are implemented and verified for the supported straight end-wall layout. The requested Google image screenshot remains unavailable, so the related checkboxes remain open.


Additional fit verification rejects fixtures too close to a supporting wall's end and checks head tilt/connector offset in the footprint. Oval wells use their curved well boundary, so a head that fits the bath's outer rectangle can still be rejected when it would cross the well edge. This adds a focused clearance regression test.

The final focused run has **19 passing tests, zero failures**, and the type check passes. The package-wide result above predates the additional curved-well/wall-end regression test.


## Adjustable drain position and handedness, implementation in progress

Opened [Google Images for centre/end/offset bathtub drains](https://www.google.com/search?udm=2&q=bathtub+center+end+offset+drain+dimensions). Google returned a traffic challenge, saved as [challenge evidence](references/bath-drain-google-challenge.png). This is not accepted image-search reference evidence.

Downloaded, rendered and inspected the three-page [Kohler Avec K-25830-LA specification](https://techcomm.kohler.com/techcomm/pdf/K-25830-LA_spec_US-CA_Kohler_en.pdf): [product image](references/bath-drain-kohler-1.png), [technical data](references/bath-drain-kohler-2.png) and [dimensioned drain drawing](references/bath-drain-kohler-3.png). The drawing places the end drain inside the floor independently of the rim. It informs the configurable relationship rather than specifying an exact manufacturer reproduction. Existing left/right/centre presets remain available.

Added longitudinal drain distance and crosswise floor offset. Limits derive from the actual sampled flat floor outline, with 32 mm clearance for the 30 mm cover radius. Oval and rectangular wells, corner arcs and walk-in footwells use their own outlines. Requested positions are clamped after resizing or switching shape, keeping both the real floor bore and separate cover inside the usable floor. Walk-in default placement now uses the exposed footwell centre and avoids the seat; changing entry handedness recalculates its usable bounds. Slipper covers follow the raised floor height and tilt. Drain handedness continues to place the overflow on the corresponding end for soaking baths.

Inspector controls and typed section details expose active drain offsets; the plan includes the actual opening marker. Centre mode hides inactive longitudinal distance, and exhausted crosswise travel hides its control. Geometry cache keys include the new parameters. Saved scenes retain authored offset values.

Verification so far: 30 focused bath/deck/combination tests pass and type checking passes before the additional slipper-cover alignment adjustment. Tests exercise handed presets and extreme offsets across every bath preset at small/large dimensions, check clearance against the actual floor, raycast the open bore, verify cover positions, and confirm plan/cache/save changes. The checkbox remains open until the required Google image evidence is available and browser checks finish.


Browser verification passed: typed section edits set longitudinal distance to 0.200 m and crosswise offset to 0.080 m. Switching left to right preserves both authored values and mirrors the plan marker. Typing 1.000 m clamps to the derived floor limit (shown as 0.435 m), rather than cutting beyond the floor. Saved and inspected the [left drain inspector](references/bath-drain-editor-left.png) and [right drain model](references/bath-drain-editor-right.png). All 18 bath tests pass after slipper cover height/tilt alignment; the earlier broader focused bath/deck/combination run had 30 passing tests. The latest package-wide run has 199 passing tests and one unrelated wall-flush-plate section failure (`seamWidth`). The adjustable-drain checkbox remains unchecked solely because the requested Google image-reference evidence is unavailable.

### Separate bath surface finishes — implementation, 2026-10-01

Implemented independent exterior, interior/rim and feet/pedestal material regions. Existing triangle positions, normals, metre UVs, hollow wells and drain openings are preserved. Walk-in shells also separate their inward-facing walls and floor from the exterior; seats, doors, seals and handles keep their existing individual slots. The interior defaults to white when no interior finish is saved, including baths with an existing exterior finish.

The inspector offers gloss white, matt ivory, matt black, forest green, brushed brass and polished chrome presets for each surface. Support controls appear only when feet or a pedestal are present. Material edits use scene material references and preserve the other surface assignments.

Reference: [Cabuchon bath options](https://www.cabuchon.com/bath-tub-options/). Inspected its photographed Osbourne bath with dark exterior and a pale rim, interior and plinth; the manufacturer also describes colour combinations and gloss/matt options. Saved and inspected `references/bath-finishes-cabuchon-reference.png` and `references/bath-finishes-cabuchon-two-tone.png`. Google Images was opened for “two tone bathtub white interior colored exterior brass feet” but returned an unusual-traffic challenge, saved as `references/bath-finishes-google-search.png`. The checklist remains unchecked pending usable Google image evidence.

Validation: 21 bathtub tests pass, covering every shape's separate surface regions, interior/exterior ray hits, support meshes, independently committed material references and preservation after reset/rebuild. Editor presets were exercised on a clawfoot bath; the inspected unselected screenshot `references/bath-finishes-editor.png` shows a black exterior, white well/rim and brass feet. All 38 bath, deck, screen and bath-shower tests pass. Final package type checking passes. An intermediate run encountered concurrent empty PanelSection children errors in unrelated inspectors; those errors are resolved in the current worktree.

### Overflow channel and waste connections — implementation, 2026-10-01

Replaced the decorative overflow blob with a ring-shaped inlet, a through-opening cut into both well and exterior surfaces, and a hollow channel through the wall. Placement is resolved from the actual well surface, including handed drains, corner baths, slipper baths and translated walk-in wall parts. Cutting retains interpolated normals and metre UVs; disabling overflow restores the closed wall.

Added optional connected waste tailpiece, overflow hose/coupling and a hollow trap/outlet. They follow the derived drain position. The inspector exposes plumbing visibility, waste recess depth (100–250 mm), outlet length (80–400 mm) and direction (−180° to 180°). Typed section fields use metres and degrees, converting direction back to saved radians. Pipes have a separate finish slot and finish presets. An explicit `bath-waste-outlet` marker records endpoint, direction and 42 mm outside diameter; this is connection metadata, not an implemented pipe-attachment tool. These generic parts are visualization geometry rather than an exact manufacturer fitting or simulated water system.

The trap occupies a recess below the bath's floor datum. Default plumbing visibility is off; overflow inlet and channel remain modeled. A raised verification fixture was used solely to make the otherwise underfloor parts visible in editor screenshots. It is not an installation preset.

Reference: [McAlpine HC2650UK technical drawing](https://mcalpineplumbing.com/wp-content/uploads/2023/11/hc2650uk_website.pdf), downloaded to `references/bath-overflow-mcalpine.pdf`, rendered to `references/bath-overflow-mcalpine.png` and visually inspected. The drawing establishes the separate overflow fitting, hose, waste body and trap arrangement. Google Images was opened for “bathtub overflow waste pipe trap assembly”; the unusual-traffic challenge was saved and inspected as `references/bath-overflow-google-search.png`. The checklist remains unchecked pending usable Google image references.

Browser verification: enabled plumbing, typed 0.180 m recess depth and 45° outlet direction, and inspected the exposed pipes and open outlet. Saved `references/bath-overflow-editor-controls.png`, `references/bath-overflow-editor-render-options.png` and the raised inspection close-up `references/bath-overflow-editor-inspection.png`. Geometry tests cover through-openings for all ten bath shapes and three drain hands, closed-wall restoration, finite pipe attributes, drain alignment, open outlet centre, endpoint metadata and typed angle conversion. Existing drain geometry coverage retains all assertions; its timeout is increased to 15 seconds for the additional overflow cuts and shared-machine rendering load.

Saved and inspected the wider raised-fixture view `references/bath-overflow-editor-overview.png`, showing the bath, overflow hose and waste outlet together.

Final validation for overflow/waste: 41 related bath, deck, screen and bath-shower tests pass; package type checking passes.

### Stopped at user request — 2026-10-01

Feature work is paused. No additional catalog items should be added unless requested again.

Current backrest work is retained but unchecked: original curved, adjustable curved, straight, reclined and upright profiles; independent left/right slope parameters; updated well-floor/drain bounds and section drawing; adjustable inward walk-in seat-back lean. New profiles use a wider lower shell to contain their floor and drain bore. Three focused geometry tests pass, covering measured straight slopes, profile limits, open drains and both walk-in hands. The usable Google Images reference screenshot is saved and inspected as `references/bath-backrest-google-images.png` (query: “bathtub sloping backrest double ended straight curved”). Browser editing/visual verification was interrupted by the stop request and remains pending. Cleanup fixed the section-array compatibility issue, and final package type checking passes. An earlier run encountered concurrent tap material-slot errors, which are resolved in the current worktree.

The previously documented bath, finish and waste features remain in place. All incomplete checklist boxes retain their current status.
