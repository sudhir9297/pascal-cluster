# Shower arm flanges and wall covers

Separate covers attach to the arm's `wall-cover` slot. The catalog provides round, square, soft-square, raised-round, stepped-round, deep-bell and oversized round presets. Inspector parameters are width, depth, tube clearance and soft-square corner radius. These are generic procedural interpretations, not exact manufacturer replicas.

## Research evidence

- [Google Images reference](shower-research/flange-google-images.png): representative round, square and oversized covers.
- [Kohler Pinstripe arm and flange](https://www.kohler.com/en/products/showers/shop-shower-fittings/pinstripe-shower-arm-and-flange-13136?skuId=13136-CP): square cover with sharp edges. [Captured page](shower-research/flange-kohler.png).
- [Kohler 7395 arm and flange](https://www.kohler.com/en/products/showers/shop-shower-fittings/shower-arm-and-flange-5-3-8-long-7395?skuId=7395-CP): round cover.
- [Moen 147572 flange](https://shop.moen.com/products/147572): separate replacement cover and multiple finish options. [Captured page](shower-research/flange-moen.png).

Raised, stepped and bell profiles are generic cover variations. Their editable dimensions do not imply compatibility with a particular manufacturer's plumbing hardware.

## Attachment behavior and validation

The opening is hollow and follows the parent arm's round or square tube, including clearance. Width expands when necessary to retain a rim around larger tubes. There is one separate cover per arm. Replacing or moving it preserves the independent shower-head slot. The arm's integrated cover is hidden while a visible separate cover is attached and returns when that cover is removed or hidden.

The placement preview resolves the hovered arm's tube dimensions. Geometry rebuilding watches parent tube size and shape; covers remain at the wall origin while the head follows the arm outlet.

Focused tests verify all presets at dimension limits with round and square hosts, finite geometry, true hollow openings, serialization, replacement/movement identity, independent head targets and fitted plan outlines. TypeScript checking passes. [Rendered gallery](shower-research/flange-models.png) and [oversized preset](shower-research/flange-models-wide.png) provide visual evidence.

The running editor exposes all seven cover entries in its Shower catalog; [catalog screenshot](shower-research/flange-catalog.png). A deep-bell cover was attached to the square kit arm, then replaced with a square plate. Runtime inspection confirmed one cover at local `[0,0,0]`, a square-tube fit signature, a retained head target and the hidden integrated flange. Undo restored the bell's 40 mm depth; redo restored the square plate's 6 mm depth. [Bell placement](shower-research/flange-editor-bell.png), [square replacement](shower-research/flange-editor-square.png).

Changing the parent tube through its section inspector from 25 to 26 mm rebuilt the square opening from 27 to 28 mm, retaining the configured 1 mm clearance on each side. The runtime fit signature changed from `[0.025,true]` to `[0.026,true]`.

Cover movement still requires runtime verification before this checklist item is marked complete.
