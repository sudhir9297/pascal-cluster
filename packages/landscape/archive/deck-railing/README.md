# Deck railing archive

These snapshots preserve the deck-integrated railing implementation before it was removed. They are deliberately outside `src` and use `.snapshot` extensions so they are not part of the plugin build.

- `schema.ts.snapshot`: railing styles, dimensions, color, and selected edges.
- `geometry.ts.snapshot`: wood, metal, cable, and glass 3D railings, plus floor plan lines and edge labels.
- `panel.tsx.snapshot` and `parametrics.ts.snapshot`: side panel and inspector controls.
- `edit.ts.snapshot`: selected-edge remapping when the deck outline changes.
- `boundary-system.tsx.snapshot` and `floorplan-affordances.ts.snapshot`: edit integration.

The snapshots include surrounding deck code to retain exact context. For a standalone railing item, extract the railing portions and replace deck-specific outline and height assumptions with a drawn railing path and attachment elevation.
