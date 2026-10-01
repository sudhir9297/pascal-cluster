# Item panel cleanup

All item inspectors share controls from `src/inspector-controls.tsx`. Dropdowns, sliders, number fields and checkboxes use 12 px text and a 36 px row height. Action and model buttons share borders, selected states, keyboard focus and disabled styling. Section dimensions keep their numeric font and preview/commit/cancel behavior.

Titles use sentence case. Repeated placement instructions, keyboard hints and descriptive filler were removed. Attachment errors, hose warnings and vanity clearance status remain.

Every inspector places its section first. Bath decks and bath screens now have geometry-based section previews. Deck dimensions retain the fit limits of attached baths.

## Coverage

- [x] Freestanding, wall-mounted and corner vanities; custom storage
- [x] Countertop, undermount, drop-in and semi-recessed basins; tap slots
- [x] Wall-hung, half-pedestal and full-pedestal basins
- [x] Wall-hung and floor-standing toilets; linked flush controls
- [x] Wall flush plates and cistern controls
- [x] Toilet paper holders
- [x] Shower heads, hand showers, arms and mounts
- [x] Shower controls, valves, connectors and flanges
- [x] Shower hoses, body jets and dividers
- [x] Shower assemblies and bath showers
- [x] Bathtubs, decks and screens
- [x] Basin taps, wall spouts and bib taps
- [x] Catalog category and item label font sizes

## Validation

- Package TypeScript check passed.
- 13 focused tests passed: dimension edit transactions, deck fit, screen geometry, attachments and new section bounds.
- Browser keyboard check: Space toggled the paper-roll checkbox off and on again.
- Source audit confirmed the section is the first child in all 27 panel wrappers; bath shower delegates to the assembly inspector. Shared inspectors cover the remaining variants.
- Browser review covered 32 placed fixture entries across Vanity, Basin, Toilet, Shower, Bath and Taps. Each showed a section; dropdowns consistently measured 36 px high with 12 px text.

The temporary review scene was removed after checking, and the browser returned to the original scene. It used default fixtures to exercise panel rendering, rather than a finished bathroom layout. Its autosave returned HTTP 400, so browser checks establish rendering and local editing behavior, not persistence of that generated review scene.
