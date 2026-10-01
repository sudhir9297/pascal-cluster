# Shower hoses

Researched and implemented 2026-10-01. Generic visual models; no water flow or installation compliance simulation.

## References and visual evidence

- [Google Images screenshot](hose-google-images.png), query: `shower hose smooth metal ribbed flexible`, searched before implementation.
- [Kohler hoses and breakers](https://www.kohler.com/en/products/showers/shop-hoses-breakers-shower-fittings), [saved browser screenshot](hose-kohler.png): smooth, metal and ribbon variants in 60- and 72-inch lengths.
- [Hansgrohe Isiflex](https://www.hansgrohe.com/articledetail-isiflex-shower-hose-160-cm-28276990): plastic-coated hose, 1.60 m length, pivot connector, conical nuts and G ½ thread.
- [Hansgrohe Metaflex](https://www.hansgrohe.com/articledetail-metaflex-shower-hose-160-cm-28266000?HGxH430=1): alternate ribbed surface reference.
- [Rendered model screenshot](hose-models.png): all three hoses connected to a combined outlet/holder and handset. Standalone studio uses neutral materials for shape inspection.

## Implemented behavior

Three catalog variants use one `bath-space:shower-hose` node: smooth, ribbed metal and ribbon. Controls include flexible hose length, diameter, rib spacing where applicable, connector length and forward drape. Defaults are a 1.6 m hose and 14 mm diameter. Flexible length excludes the two end collars.

Placement selects a supply outlet first, then a mounted handset. Hovering the handset previews the hose; the catalog reports which endpoint to choose next. The source is the hose's parent at its `hose` slot; supply elbows and integrated mixer outlets are supported. The handset is referenced by `targetId`; its bottom `hose-end` target remains stable across shape and size edits. Each endpoint has capacity one. Connecting to an occupied endpoint replaces the corresponding hose in one transaction. Reconnection is available through the move tool and inspector.

The curve is derived from both fittings in level coordinates. Wall position, thickness, face, rail length, slider, tilt and handset insertion edits update the connected curve without adding history entries. The flexible curve length is solved from the requested length, with separate legs at close endpoints. Hose surface ribs are merged into one mesh rather than individual scene objects.

Handset replacement transfers an attached hose to the replacement inlet atomically. Moving a handset that already has a hose into an occupied holder keeps its own hose and removes the displaced handset's hose, preserving one connection per inlet. Undo restores the prior handset and hose binding.

Missing, hidden or cross-level endpoints cannot produce a connected model. If endpoints are missing after an edit/import, the hose remains reconnectable through settings. A hose too short for the selected endpoints and drape has no stretched model; the inspector explains how to restore reach.

## Verification and remaining audit

Tests cover finite geometry for the three surfaces, collar endpoints, requested curve length, capacity replacement, slider/tilt following, JSON persistence, invalid hosts, missing/cross-level targets and handset replacement/movement with connected hoses. Scene-store tests verify binding transfer and undo. Current full Bath Space suite: 152 passing tests; TypeScript passes. The editor catalog and lazy-loaded hose tool render successfully.

Full editor pointer connection and live movement still require the goal's interaction audit. The curve does not yet route around walls, other objects or the floor; extreme lengths or fittings on opposing wall faces may intersect surfaces. Manufacturer-specific thread variants and breakers remain later checklist items.
