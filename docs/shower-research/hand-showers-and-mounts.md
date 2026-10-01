# Hand showers and mounting fittings

Research and implementation checkpoint, 2026-10-01. Visual models are generic representations, not exact manufacturer products. Ranges in the inspector are modelling limits rather than installation recommendations.

## Browser research

Each component was searched in Google Images in the collaborative browser before implementation:

| Component | Image query | Saved screenshot |
| --- | --- | --- |
| Hand shower | hand shower round square baton wand shower head | [Image results](hand-shower-google-images.png) |
| Holder | hand shower holder wall round square adjustable outlet | [Image results](holder-google-images.png) |
| Supply elbow | shower wall outlet supply elbow round square | [Image results](supply-elbow-google-images.png) |
| Slide rail | shower slide rail bar round square adjustable holder | [Image results](slide-rail-google-images.png) |
| Hose, next component | shower hose smooth metal ribbed flexible | [Image results](hose-google-images.png) |

Manufacturer references:

- [Kohler shower fittings](https://www.kohler.com/en/products/showers/shop-shower-fittings): separate and combined supply elbows, fixed and adjustable holders and slidebars. [Saved browser screenshot](mounting-kohler.png).
- [Kohler slidebars](https://www.kohler.com/en/products/showers/shop-slidebars-trim-shower-fittings?back=K-26313-CP): multiple rail lengths and integrated supply variants.
- [Hansgrohe bathroom catalogue](https://assets.hansgrohe.com/celum/web/UK_hansgrohe_Bathroom_Sales_Manual_2022.pdf): round multi-jet handsets, baton handsets, holder sets, rails and shelves.
- [Kohler hoses and breakers](https://www.kohler.com/en/products/showers/shop-hoses-breakers-shower-fittings): smooth, metal and ribbon hose variants and different lengths; implemented in the subsequent [hose checkpoint](shower-hoses.md).
- [GROHE catalogue](https://cdn.cloud.grohe.com/Literature/Brochures/en_US/GROHE_Pricelist_en_US/original/GROHE_Pricelist_en_US.pdf): wall unions and union/holder combinations.

## Implemented variants and controls

`bath-space:shower-mount` covers round and square holders, an adjustable holder, round/square combined outlet holders, separate round/square supply elbows and round/square rails. Mount height, wall face, projection, section size and wall-cover dimensions are adjustable. Holder diameter and tilt, rail length and slider position, integrated supply and optional shelf settings appear where applicable.

`bath-space:hand-shower` covers round, square, rounded-square, oval, round-wand and square-baton models. Controls include head dimensions and angle, handle diameter and length, grip insertion, nozzles and selector visibility. Wand geometry derives from the handle dimensions rather than the plate dimensions.

[Rendered variant gallery](hand-shower-mount-models.jpg). Neutral preview materials are used in the standalone gallery; editor paint uses the normal material references.

## Placement and connections

All mounting fittings use the shared wall-only placement tool on either wall face. Plan placement and dragging resolve a nearby wall; empty-space clicks cannot commit. Wall edits keep the fitting flush to its face.

Holders expose one stable `hand-shower` slot of type `hand_shower`. Handsets are owned by their holder or rail and inherit the slot's full local orientation. Rail length, slider and tilt edits update that slot. Handset replacement is one transaction, and moving a handset transfers its existing identity between holders. Separate supply elbows reject handsets.

Supply-capable fittings expose a separate `hose` slot of type `shower_hose`. Each handset exposes a bottom `hose-end` target. [Hose endpoint occupancy and linkage are now implemented](shower-hoses.md). Inspector variant changes that would remove an occupied slot are disabled.

## Verification and remaining work

Finite geometry and matching socket transforms checked across all variants, minimum/maximum handset sizes and both rail slider limits. Tests cover front/back wall mounting, JSON persistence, handset replacement, invalid hosts, hierarchy transfer and scene-store undo/redo. TypeScript passes. The full current Bath Space suite passes 146 tests. Models were inspected in the collaborative browser, and the editor Shower catalog loads all six handsets and nine mounting variants without a build error.

Full editor pointer placement, live resizing and connected hose behavior remain part of the active goal audit. Magnetic retention, spray simulation and manufacturer-specific threaded compatibility are not implemented by these visual models.

## Mounting model upgrade

All nine holders, combined outlets, supply elbows and slide rails now include layered wall covers, body collars and detailed mounting hardware. Holders have deep open cradles with two lips and pivot caps; the adjustable holder includes a locking lever. Rail variants have inset support brackets, end caps, slider locks and an optional shelf with raised edges. Supply connectors include shoulders and visible thread rings. Their hose target terminates at the nipple end.

New controls: cradle depth (18–60 mm), outlet connector length (12–45 mm), rail bracket inset (15–120 mm, clamped to one quarter of the rail length), and shelf depth (60–160 mm). Existing style names and attachment slot identities remain compatible. Model choices now show illustrated cards; wall settings start collapsed. Five focused model and attachment tests pass, including connector alignment at dimensional limits.

## Hand shower model upgrade

The six handset variants now have tapered or softly edged grips, shoulder transitions, detailed hose connector collars and thread rings. Round heads retain a circular face; oval presets use a taller head; rounded square faces clip nozzle placement to their corners. Wand spray faces remain aligned with the straight body. Added adjustable corner radius, connector length and optional round grip rings. The hose endpoint follows connector length while retaining its slot identity.

The inspector matches the shower head and arm: illustrated shape cards, grouped dimensions, collapsed connection/grip and spray controls, and an editable schematic plan/section drawing. The standalone six-model gallery was inspected after the upgrade. Geometry-limit and attachment tests pass.
