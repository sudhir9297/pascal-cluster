# Shower components

Research reference and implementation checklist for Bath Space. Recorded on 2026-10-01. Checked items have implemented visual models; verification limits are recorded in the working notes. The order is a starting point for working through components individually.

A shower arm and an overhead shower head are separate components. The arm carries water and supports the head; the head produces the spray. Not every shower setup needs every item below.

## Parametric catalog

Shape variants now share component-family cards in the Shower catalog. Their settings panels retain the available shapes and options, and every individual component has a geometry-derived Section A-A drawing. See [catalog grouping and section behavior](shower-parametric-catalog.md). Complete kit layouts remain separate bundles.

## Individual components

| Status | Component | Purpose | Common variants and names |
| --- | --- | --- | --- |
| [x] | Shower arm | Connects and supports the overhead head | Wall-mounted, ceiling-mounted, curved, extended |
| [x] | Overhead shower head | Produces the fixed shower spray | Standard, rain shower, multifunction |
| [x] | Shower mixer | Mixes hot and cold water and controls the shower | Concealed, exposed wall mixer, single-lever, thermostatic |
| [x] | Diverter / transfer valve | Selects the water outlet | Overhead shower, hand shower, spout or body jets; outlet combinations depend on the valve |
| [x] | Control trim | Visible handles, knobs, buttons and cover plate | Mixer trim, diverter trim, thermostatic trim |
| [x] | Concealed valve body | Working valve inside the wall | Rough-in body; requires compatible trim |
| [x] | Flow control / stop valve | Turns water on or off, or adjusts flow | Volume control, concealed stop cock |
| [x] | Hand shower | Handheld spray head | Single-function, multifunction, wand-style |
| [x] | Shower hose | Connects the hand shower to its outlet | Flexible metal or smooth hose |
| [x] | Hand shower holder | Holds the hand shower | Fixed, adjustable, combined with water outlet |
| [x] | Wall outlet / supply elbow | Supplies water from the wall to the hose | Wall union, hose outlet; separate or combined with holder |
| [x] | Slide rail / shower bar | Adjusts hand shower mounting height | Slidebar, wall bar, sliding holder |
| [x] | Bath / bucket spout | Fills a bath or bucket | Plain spout, waterfall spout |
| [x] | Spout with diverter | Pours water and redirects it to a shower outlet | Button or pull-up diverter |
| [x] | Bath and shower wall mixer | Exposed controls and shower connections, often with a spout | Two-handle, single-lever, 3-in-1 with overhead and hand shower connections |
| [x] | Bib tap / bib cock | Separate wall tap for bucket or utility use | Optional alongside shower fixtures |
| [x] | Body shower / body jet | Sprays sideways from the wall | Individual body sprays, grouped jets |

## Complete assemblies

Keep assemblies distinguishable from individual components. Their included parts vary by product.

| Status | Assembly | Description |
| --- | --- | --- |
| [x] | Shower column / shower pipe system | Exposed vertical water pipe carrying an overhead shower, usually with a hand shower and diverter |
| [x] | Shower panel | Wall-mounted unit combining overhead shower, hand shower, body jets and controls |
| [x] | Shower set / shower kit | Bundle of components; record the actual included parts |

## Supporting parts

- [ ] Shower arm flange / wall cover plate — seven presets implemented; [research and validation](shower-flanges.md), editor verification pending
- [ ] Connectors and adapters — seven model presets and schema implemented; [manufacturer research, screenshots and connection requirements](shower-connectors.md); editor integration pending
- [ ] Check valves / vacuum breakers, where required by the selected system

## Naming clarification

The initial description of a "spout connected to the hand shower" could refer to either:

- A bath spout or wall mixer with a hand shower connection, if it also pours water into a bath or bucket.
- A wall outlet / supply elbow, if it only connects the hose to the wall. Some outlets include a hand shower holder.

This is a plumbing connection, usually through a flexible hose. "Hard wiring" is not the usual product term. Confirm the intended component when we reach this item.

## Sources

- [Kohler shower fittings](https://www.kohler.com/en/products/showers/shop-shower-fittings): arms, holders, hoses, supply elbows, slidebars, columns and supporting fittings.
- [Jaquar shower range](https://global.jaquar.com/en/showers): overhead showers, hand showers, body showers and shower pipe concepts.
- [Kohler valves and trim](https://experience.kohler.com/en/products/showers/shop-shower-trims-valves?facets=Collections%3AComponents): concealed valves, visible trim, temperature, volume and outlet controls.
- [Jaquar 3-in-1 wall mixer](https://www.jaquar.com/en/solo-spout-wall-mixer-with-overhead-and-hand-shower-provision): overhead and hand shower provisions, connecting legs, bend pipe and flanges.
- [Jaquar technical catalogue](https://www.jaquar.com/pdf/technical-catalogue.pdf): bib cocks, stop cocks, bath spouts, mixers and diverters.
- [GROHE shower pipe system](https://pro.grohe.com/en_pj/tempesta-system-200-shower-system-with-diverter-for-wall-mounting-27389000.html): combined head and hand shower system with diverter.
- [Jaquar shower panels](https://uae.jaquar.com/en/jaquar-shower-panels): integrated overhead shower, hand shower, body jets and controls.
- [Kohler shower kit](https://la.kohler.com/en/product-detail/22181-G?skuid=K-22181-G-CP): example bundle of shower head, hand shower, hose, slidebar, arm with diverter and valve trim.
- [Kohler system diagram](https://resources.kohler.com/onlinecatalog/pdf/116716_2.pdf): thermostatic mixer, volume control, transfer valve, spouts, body sprays and vacuum breaker.

## Working notes

Before implementing each component, decide its geometry variants, dimensions, placement surface, attachment points and inspector controls. Record completed work and decisions here as we proceed. This checklist does not yet define plumbing simulation or compatibility rules.

### Shower arm implementation

The catalog now has four wall-mounted arm families: round adjustable, square adjustable, round curved and round gooseneck. Straight, angled and elbow configurations share the adjustable model, with a 0–90° outlet-angle slider and 0°/45°/90° shortcuts. Primary parameters are wall projection, tube size, outlet angle and drop; curved/arched models additionally expose bend radius/rise. Connector length, mounting height and flange settings remain editable. Legacy saved styles retain their original shape until edited. Ceiling-mounted arms remain a future variant.

The arm centerline, connector and head target now share one direction calculation. Head local -Y follows the outgoing connector tangent: straight arms point away from the wall, intermediate angles point out/down and elbows point down. Square tube bends use continuous mitered geometry; all arms have a round outlet connector. Fourteen focused tests cover finite geometry, every legacy and current style at 0/1/15/45/89/90°, slot identity, head direction, wall placement, covers and complete kits.

The outlet exposes a stable `shower-head` slot of type `showerhead`, capacity 1, using the empty target `showerhead_target_shower-head`. Its transform follows the current arm geometry. Future heads use this slot and the arm as their parent; their inlet is at the origin and their spray direction is local -Y.

Editor verification of the adjustable square arm confirms slot directions `[0,0,1]` at 0°, `[0,-0.7071,0.7071]` at 45° and `[0,-1,0]` at 90°. [Updated arm panel and scene](shower-research/shower-arm-adjustable-editor.png). The catalog shows the four families and retains the requested Shower category order.

Shower arms use wall-only placement. In 3D, click a wall side face; ground clicks cannot create an arm. In plan view, placement and movement resolve a nearby wall and retain that wall as the parent. Moving into empty space clears the preview and cannot commit.

### Overhead shower heads

Six visual variants are implemented with head dimensions, connector dimensions, orientation and nozzle controls. See [research and screenshot evidence](shower-research/overhead-shower.md). [Rendered model gallery](shower-research/overhead-shower-models.png) uses neutral preview materials for shape inspection. Editor interaction verification is still in progress; the full shower goal remains active.

### Hand showers, holders, outlets and rails

Six handset variants and nine wall fitting variants are implemented with compatible handset slots and prepared hose targets. See [research, screenshot evidence and verification limits](shower-research/hand-showers-and-mounts.md). Hoses and full editor interaction verification remain in progress.

### Shower hoses

Smooth, metal-ribbed and ribbon hoses now connect supply outlets to handset inlet targets, with adjustable drape and one hose per endpoint. See [research and connection verification](shower-research/shower-hoses.md). Pointer interaction and obstacle/floor routing remain in the final audit.

### Visible shower controls

Twelve mixer, diverter and flow-control trim presets are implemented. See [research, models and slot verification](shower-research/shower-controls.md). These checked items cover visible controls; concealed valve bodies, remote pipe connections and full editor interaction remain separate pending work.

### Spouts, bib taps and body jets

Fifteen wall-spout/bib presets and eight body-jet presets are implemented with wall-only placement, editable dimensions and stable socket targets. See [spout and bib research](shower-research/wall-spouts.md) and [body-jet research](shower-research/body-jets.md). Remote water connections and the assembled editor audit remain pending.

### Bath and shower wall mixers

Six bath-mixer presets extend the visible control family with integrated spouts, diverters and optional hose/overhead connections. See [research, model screenshots and verification limits](shower-research/bath-shower-mixers.md). The assembled connection audit remains pending.

### Shower columns and panels

Eight column and panel presets now create a wall-mounted body with separate replaceable head, handset and hose nodes. Dimensions, holder transforms, controls, jets, spout, shelf and waterfall options are editable. See [research, rendered evidence and verification limits](shower-research/assemblies.md). The final assembled editor audit remains pending.

### Complete shower kits

Four kit layouts now create real arms, heads, mounts, handsets, hoses and controls together, with per-component inspectors and original included-part records. See [research and current verification](shower-research/shower-kits.md). Square kit wall placement and editor undo/redo are verified. Other variants and the final connection audit remain pending.

### Concealed valve bodies

Six rough-in presets now attach to compatible concealed control trim, with editable shapes, body dimensions, depth, ports, stops and housing. Editor attachment, inspector variant checks and undo/redo are verified. See [research, models and verification limits](shower-research/concealed-valves.md). Supporting fittings, remote water connections and the final assembled audit remain pending.
