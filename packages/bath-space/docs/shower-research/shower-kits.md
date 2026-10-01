# Shower kits — research and implementation

Research captured 2026-10-01 before kit implementation.

## References

- Google Images query `shower kit concealed round square overhead hand shower slide rail`: [representative layouts](kit-google-images-detail.png). These show round/square overhead heads, separate arms and rails, and compact handset holders.
- [Kohler Purist Essentials kit](https://la.kohler.com/en/product-detail/22181-G?skuid=K-22181-G-CP): [browser screenshot](kit-kohler-detail.png). The manufacturer's included-parts list distinguishes head, handset, hose, slidebar, arm/diverter and visible valve trim from the separately purchased concealed valve body. Its hose is 60 inches and its slidebar is 30 inches.
- Additional column/panel and kit references are recorded in [assembly research](assemblies.md).

## Current implementation

Four procedural kit layouts are implemented: round rain with slide rail, square rain with slide rail, compact shower with a combined holder/outlet, and classic bath/shower with a cross-handle mixer and integrated spout. These are generic visual layouts, not replicas of the Kohler product or claims of equivalent hydraulic operation.

Each creates six actual nodes: arm, overhead head, rail/holder with supply outlet, handset, hose and control trim/mixer. The bath kit's spout is part of its existing mixer model. Each component keeps its own inspector. The head attaches to the arm; the handset and hose attach to the rail/holder; the hose retains the handset inlet reference. Arm, rail/holder and control keep direct wall parents. Original included parts are recorded in each node's `metadata.showerKit`; this is a creation record, not a live replacement ledger.

Catalog selection uses the wall arm placement tool with a complete kit preview and creates all parts in one scene transaction. Width and height limits fit the complete initial layout to either wall face. Parts can be repositioned independently afterward; there is currently no whole-kit move operation.

## Verification

Four kit tests pass: finite preview geometry for all presets, persisted included parts and host relationships, connected hose endpoints on both wall faces, head replacement, holder movement, unsuitable wall rejection, and one-step undo/redo through the real scene store. Combined focused kit/assembly/head/hose tests: 15 passing across six files. TypeScript passes.

The [neutral-material gallery](kit-models.png) shows all four layouts. The [actual editor catalog](kit-editor-catalog.png) loads all four kit cards. [Actual square kit wall placement](kit-editor-placement.png) renders the separate arm/head, rail/handset/hose and trim. One editor undo removed all six kit targets and redo restored them. Other kit variants and all pointer-based resize/replacement scenarios remain in the final audit. Remote concealed supply links, valve compatibility, floor/obstacle routing and the full assembled editor audit remain pending.
