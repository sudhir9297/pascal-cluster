# Guided bathroom builder

The guided builder covers the wash area (vanity → basin → tap), followed by
the toilet area (toilet → flush control → optional paper holder) and the
bathing area (shower/bath → review → optional glass divider). The existing
catalog remains available through **Browse all**, including Placed and Inventory.

## Wash area behavior

- Choose a vanity mounting type and style, then place it in the scene. Selecting
  a catalog card does not enable Next; a committed vanity does.
- Continue to the basin step. Only vanity-mounted basin categories appear, and
  placement is restricted to the current vanity. Existing placement and fit
  rules remain responsible for the actual pose.
- A committed basin opens the tap choices automatically. Countertop taps must
  attach to this basin; wall taps must resolve a binding to this basin.
- A committed tap completes the wash area. Placement exits after every accepted
  fixture so another click does not create a duplicate.
- **Use a basin without a vanity** starts a separate path with wall-hung and
  pedestal basin categories.
- Back and the numbered steps reopen available earlier steps. Existing fixtures
  can be edited through the inspector; returning to a completed step does not
  require placing another fixture.
- **Add another wash area** starts fresh progress without deleting the previous
  assembly. Those fixtures remain available in the full catalog's Placed tab.

Progress is stored in the selected level's `metadata.bathSpaceWashArea`, including
the step, branch, vanity ID and basin ID. Completion is derived from the current
assembly, including wall tap service bindings. Missing fixtures return the flow
to the relevant placement step. Browse mode and read-only views release guided
placement restrictions.

## Toilet area behavior

- **Next: Choose toilet** opens the toilet area after wash-area completion.
- Choose **Wall-hung** or **Floor-standing**, then a style and place it against
  a wall. Next stays disabled until placement succeeds, and placement then exits.
- **Next: Review flush control** selects the control already created by the
  toilet tool. **Edit my flush control** opens its existing inspector, without
  creating another control. A deleted control can be explicitly restored.
- Continue to the optional holder step. Place a holder to complete automatically,
  or choose **Skip paper holder**. Back and numbered steps preserve existing items.
- Completion offers fixture editing, another toilet area, and the full catalog.
  **Back to wash area** preserves the previous assembly.

The level stores `metadata.bathSpaceStage` and `metadata.bathSpaceToilet`.
Missing toilets, controls and tracked holders reopen their relevant steps.

## Bathing area behavior

- **Next: Shower or bath** opens the bathing area after toilet completion.
- Choose **Shower**, **Bath**, or **Bath + shower**. The combined path places the
  bath first, then the shower. Back preserves tracked fixtures; starting another
  area keeps previous fixtures in the scene.
- Show complete shower kits by default. Each kit creates its real arm, head,
  mount, handset, hose and mixer together. **Shower column or panel** uses the
  existing assembly tool and its automatically created children.
- **Build a custom shower** guides arm → attached head → wall control. Head
  placement is restricted to the selected arm (including compatible connectors),
  and control placement to its wall. Browse and move tools release restrictions.
- Next requires successful placement, not a catalog selection. Accepted placement
  exits the tool; custom arm and head placement open the next component step.
- Review offers editing of the current fixtures through their existing inspectors.
  The bath inspector handles tap mounting and optional bath-shower additions.
- Shower paths offer an optional drawn glass divider. A committed line or rectangle
  completes the area; all rectangle segments are tracked together. **Skip glass
  divider** completes without adding glass. Bath-only paths finish after review.

The level stores `metadata.bathSpaceStage = "bathing"` and
`metadata.bathSpaceBathingArea`. Missing baths, custom shower components, kit
parts and tracked dividers reopen their relevant steps. Kit readiness uses its
recorded included-node IDs rather than treating any shower arm as a complete kit.

## Accessories and final bathroom review

Bathing completion continues to wash-area accessories (mirror, light, hand towel),
toilet accessories (paper holder), then bathing accessories (bath towel).
Each item can be added, edited, or skipped. Committed accessories retain
`bathSpaceAccessoryArea` metadata; shared towel rails count only for their assigned
area. Existing unassigned rails can be assigned explicitly. Choices and skips live
on the selected level in `bathSpaceAccessories` and survive navigation and saves.

Review bathroom is available during every core stage. It checks every fixture on
the selected level, including earlier assemblies added before restarting a guide.
Missing basins, basin/bath taps, toilet flush controls and shower components have
Fix actions that restore the corresponding host and step. Custom shower controls
retain `bathSpaceShowerId` so adding another shower does not lose their ownership.
Absent areas can be explicitly marked Not included; this never hides incomplete
fixtures already in the scene. Optional accessories show added/skipped states and
return to their relevant catalog. Finish bathroom requires all basic prompts to be
resolved. Geometry clearances and advanced optional plumbing components are not
validated by this checklist.

The shower screen defaults to a recommended complete shower with one scene
placement. Alternative columns and custom construction are under Other shower
options. Custom construction labels its arm, head and water control as three
numbered steps. Bathing review shows one My shower entry; Adjust shower parts
reveals its individual fixtures for editing.
