Landscape feature completion — 6 October 2026

Implemented within existing editor components and panels:
- Ground areas can be named planting beds with selectable ground cover. Drawing uses existing rectangle, custom, freehand, circle and oval tools.
- Beds and paths retain plant mixtures, spacing, setback, pattern, seed and provenance on the source shape. Empty layouts can be saved and reopened. Regeneration and removal retain normal undo behavior. Pool openings are excluded from generated bed points.
- Mulch depth and bag capacity are authored properties. Net footprint produces installed volume, waste-adjusted ordering volume and whole bag counts. CSV and construction schedules include these values.
- Review has one collapsed cost section using native controls. Level metadata stores currency and per-item material/labour rates. Pricing supports surface area, linear runs, plants/equipment by count, and mulch by volume or bags. Unpriced and unknown quantities remain explicit.
- Estimate CSV and vector PDF include quantities, cost completeness and totals. Project PDFs include plants, ground areas and irrigation equipment schedules.

Verification:
- 139 focused Landscape tests passed across 43 files; 17 relevant tests passed after the final CSV edit.
- External Chrome at localhost:3004: drew a bed, generated 7 Daisy plants, reopened its layout after panel remount, removed/regenerated plants while retaining settings, saved mulch rates, exported material CSV, planting schedule PDF, estimate PDF and project plan PDF.
- Test bed: 7 m² × 0.075 m = 0.525 m³; 11 × 50 L bags. Material rate 120 USD/m³ and zero labour produced 63 USD priced subtotal, with four other unpriced groups clearly identified.
- Downloaded PDFs were parsed and rendered with PyMuPDF, and schedule/estimate pages inspected visually. Final refreshed browser build exposes bed surface options and native mulch controls.
- Package TypeScript check remains blocked by existing linked editor React CSSProperties and Three JSX type conflicts. No new errors reported in estimate modules, bed schema/panel, quantities, planting batch logic or schedule contributions.
- A broader test invocation from repository root also selected Pool tests: 427 passed and 2 Pool subprocess tests failed because React cannot resolve from repository root. The scoped Landscape run passed.

Prices are user-authored; estimates exclude supplier delivery charges and tax. Quantity overlap exclusions follow the existing modeled surface footprint rules.
