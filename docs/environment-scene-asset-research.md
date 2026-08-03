# Environment Scene Asset Research

This is a plugin-oriented inventory for building convincing outdoor urban and
suburban scenes. The plugin's first P0 street-furniture asset is a procedural
street light; the recommendations below expand it into a layered environment
system.

## Core principle

A believable scene needs more than a large prop catalog. Build the spatial and
functional systems first, then add context, activity, variation, motion, sound,
and traces of use. NACTO's street guide similarly treats the street as a system
of sidewalks, lanes, transit, crossings, signals, and stormwater elements rather
than as an assortment of isolated props. [NACTO Street Design Elements](https://nacto.org/publication/urban-street-design-guide/street-design-elements/)

## Comprehensive asset checklist

### 1. Terrain and ground

- Base terrain, slopes, embankments, cuttings, verges, vacant ground, and lots
- Asphalt, concrete, pavers, gravel, compacted soil, mud, sand, mulch, and grass
- Retaining walls, steps, ramps, handrails, guardrails, and terrain edging
- Ditches, culverts, channels, creek beds, ponds, canals, and shore edges where relevant
- Background terrain, skyline silhouettes, and distant low-detail scenery

### 2. Roads and vehicle circulation

- Straight and curved road modules or a road-spline generator
- One-way and two-way travel lanes, turn lanes, shoulders, and service roads
- Intersections, T-junctions, roundabouts, medians, refuge islands, and slip lanes
- Parking bays, loading zones, lay-bys, driveways, alleys, and garage entrances
- Curbs, curb extensions, gutters, traffic islands, speed humps, and raised tables
- Bicycle lanes, cycle tracks, shared-use paths, and bicycle crossings
- Bridges, tunnels, underpasses, barriers, crash rails, and delineator posts where relevant

FHWA treats signs, signals, and road-surface markings as devices that regulate,
warn, and guide road users. [MUTCD Part 3](https://highways.dot.gov/media/111806)

### 3. Road markings and traffic control

- Center, lane, edge, parking, bus-lane, and cycle-lane lines
- Stop/yield bars, crosswalks, arrows, text, symbols, hatch zones, and colored pavement
- Regulatory, warning, directional, parking, street-name, and wayfinding signs
- Traffic signals, pedestrian signals, push buttons, countdown displays, and controllers
- Bollards, cones, temporary barriers, roadwork signs, barricades, and warning lamps
- Parking meters, pay stations, enforcement cameras, and speed displays

The markings and hardware must be shipped as regional packs because their
shape, color, wording, placement, and driving side vary by jurisdiction.

### 4. Sidewalks and accessible pedestrian routes

- Sidewalk surfaces, frontage zones, clear walking zones, and furnishing zones
- Curb ramps or blended transitions, level landings, and driveway crossings
- Tactile/detectable warning paving and directional tactile paving where used locally
- Crosswalk connections, refuge-island cut-throughs, and accessible parking connections
- Stairs, pedestrian ramps, handrails, guardrails, and pedestrian bridges
- Plazas, shared streets, arcades, promenades, and park paths

NACTO divides sidewalks into frontage, pedestrian-through, furniture/curb, and
buffer zones. [NACTO Sidewalk Zones](https://nacto.org/publication/urban-street-design-guide/street-design-elements/sidewalks/sidewalk-zones/)
The U.S. Access Board's PROWAG covers sidewalks, crosswalks, curb ramps,
pedestrian signals, and on-street parking; its technical requirements include
detectable warnings across curb-ramp or blended-transition widths.
[PROWAG overview](https://www.access-board.gov/prowag/) and
[technical requirements](https://www.access-board.gov/prowag/technical.html)

### 5. Drainage and visible utilities

- Storm-drain inlets, catch basins, trench drains, grates, and curb outlets
- Manholes, utility covers, valve covers, inspection hatches, and access panels
- Utility poles, overhead wires, transformers, telecom/electrical cabinets, and junction boxes
- Fire hydrants, water/gas meters, standpipes, hose connections, and downspouts
- Street-light and traffic-signal control boxes
- Sewer/water channels, ditches, headwalls, and pipe ends in rural or suburban scenes

FHWA identifies curbs, gutters, channels, ditches, headwalls, pipe ends, and
drop-inlet grates as visible drainage features. [FHWA Roadway Drainage](https://highways.dot.gov/safety/local-rural/maintenance-drainage-features-safety/i-introduction)

### 6. Street and pedestrian lighting

- Roadway light poles and luminaires
- Human-scale pedestrian lamps and bollard lights
- Wall-mounted lights, canopy lights, storefront lighting, and illuminated signs
- Signal, transit-stop, parking, park, path, and accent lighting
- Vehicle headlights, brake lights, indicators, and emergency lights
- Day/night switching, broken/flickering variants, and controllable color/intensity

FHWA recommends continuous or spot lighting at intersections, crossings, and
other pedestrian-conflict areas. [FHWA Lighting](https://highways.dot.gov/safety/proven-safety-countermeasures/lighting)

### 7. Street furniture and public amenities

- Benches, seats, stools, leaning rails, and picnic tables
- Litter, recycling, ash, dog-waste, and commercial bins
- Bicycle racks, bicycle lockers, scooter docks, and bike-share stations
- Bollards, chains, fences, gates, railings, tree guards, and planter barriers
- Planters, tree pits, tree grates, and watering bags
- Drinking fountains, bottle fillers, public toilets, clocks, and phone/charging points
- Mailboxes, parcel lockers, newspaper boxes, vending machines, and kiosks
- Maps, notice boards, information pylons, and advertising panels
- Public art, sculptures, murals, monuments, fountains, and memorials
- Café tables/chairs, umbrellas, awnings, market stalls, queues, and parklets
- Playground pieces, exercise equipment, chess/game tables, and pet amenities

Official street-design guidance places lighting, benches, kiosks, utility poles,
tree pits, bicycle parking, bus stops, and waste bins in the furnishing zone.
[NYC Street Design Manual](https://www.nycstreetdesign.info/index.php/furniture/furnishing-zone)

### 8. Transit

- Bus/tram stop pole and sign, route map, timetable, and real-time display
- Shelter, canopy, bench, bin, lighting, ticket machine, and advertisement panel
- Firm accessible boarding area, tactile edge, connecting sidewalk, and nearby crossing
- Bus bulb, dedicated lane, platform, rail, catenary pole/wire, and station entrance where needed
- Park-and-ride, taxi/rideshare stand, bicycle parking, and drop-off zone

FTA guidance emphasizes shelter circulation, passenger information, boarding
flow, and access for people using mobility aids. [FTA Stop Design](https://www.transit.dot.gov/research-innovation/stops-spacing-location-and-design)

### 9. Buildings, boundaries, and active edges

- Building masses with varied footprint, height, setback, roofline, and façade rhythm
- Doors, windows, balconies, porches, steps, ramps, canopies, awnings, and shutters
- Storefront glass, signs, displays, menu boards, and selective visible interiors
- Loading/service doors, vents, ducts, pipes, meters, fire escapes, and roof HVAC
- Boundary walls, fences, hedges, gates, retaining walls, and property markers
- Construction sites, scaffolding, hoarding, skips, portable cabins, and materials
- Lit/unlit, occupied/vacant, maintained/neglected, and open/closed variants

UK national design guidance links active ground-floor doors and windows, shops,
cafés, services, roofscapes, façades, materials, landscape, light, color, and
texture to attractive and lively places. [National Model Design Code](https://www.gov.uk/government/publications/national-model-design-code/national-model-design-code-part-2-guidance-notes-html-accessible-version)

### 10. Vegetation and green infrastructure

- Several tree species, ages, sizes, silhouettes, health states, and seasonal variants
- Shrubs, hedges, grasses, ground cover, flowers, weeds, vines, moss, and lawns
- Leaves, twigs, fallen branches, stumps, roots, mulch, soil, rocks, and boulders
- Planter beds, planted medians, green walls, green roofs, and community gardens
- Rain gardens, bioswales, bioretention cells, stormwater planters, and permeable paving
- Habitat details such as bird boxes, insect hotels, nests, and pollinator planting

EPA identifies permeable paving, bioswales, planter boxes, trees, rain gardens,
and bioretention as green-infrastructure elements. [EPA Green Infrastructure](https://www.epa.gov/green-infrastructure/types-green-infrastructure)

### 11. People, vehicles, and animals

- People walking, waiting, sitting, talking, shopping, working, jogging, and playing
- Adults, children, older people, wheelchair users, and other mobility-aid users
- Cyclists, scooter riders, delivery riders, vendors, maintenance crews, and road workers
- Parked and moving cars, vans, taxis, buses, trucks, motorcycles, bicycles, and emergency vehicles
- Vehicle color, age, cleanliness, occupancy, light-state, parked-state, and damage variants
- Contextual animals: leashed dogs, cats, birds, squirrels, insects, or farm/wildlife packs
- Density, route, behavior, clothing, and time-of-day variation

Epic's City Sample treats crowds, moving traffic, and parked vehicles as separate
populations and combines them with ambient urban audio. [Unreal City Sample](https://dev.epicgames.com/documentation/unreal-engine/city-sample-project-unreal-engine-demonstration?lang=en-US)

### 12. Sky, atmosphere, weather, and water

- Sun/moon directional light, sky light, sky/atmosphere, clouds, and fog
- Time-of-day, sun-angle, cloud-cover, exposure, and color-temperature controls
- Rain, snow, hail, dust, mist, smoke, steam, pollen, and wind-blown leaf particles
- Wet surfaces, puddles, reflections, tire spray, drips, runoff, and drain flow
- Rivers, ponds, fountains, sprinklers, canals, waves, foam, and ripples where relevant
- Seasonal presets: spring growth, summer fullness, autumn color/fall, winter bare/snow

Epic identifies directional light, skylight, sky atmosphere, volumetric clouds,
and fog as the main environment-lighting components for immersive worlds.
[Epic Environment Lighting](https://dev.epicgames.com/documentation/en-us/unreal-engine/environmental-light-with-fog-clouds-sky-and-atmosphere-in-unreal-engine)

### 13. Surface variation, wear, and human traces

- Asphalt repairs, cracks, potholes, patches, seams, and faded markings
- Dirt, dust, mud, oil stains, tire marks, gum, rust, mineral streaks, and curb scuffs
- Wall cracks, chipped paint, water damage, moss, soot, graffiti, posters, and stickers
- Leaf litter, windblown trash, cigarette ends, cups, bags, boxes, parcels, and pallets
- Parked bicycles, café dishes, temporary notices, event banners, and maintenance barriers
- Wet/dry and clean/dirty material variants; edge wear and contact grime

Decals are especially suitable for breaking repetition and adding grime or damage
without unique base geometry. [Epic Decal Materials](https://dev.epicgames.com/documentation/en-us/unreal-engine/decal-materials-in-unreal-engine)

### 14. Motion and behavior

- Wind animation for trees, shrubs, grass, flags, banners, hanging wires, and loose paper
- Traffic-light cycles, moving traffic, turning wheels, brake lights, and pedestrian crossings
- Doors, gates, shutters, fans, screens, fountains, sprinklers, and construction machinery
- Birds taking off/perching, insect swarms, drifting litter, steam, smoke, and water drips
- Time-based spawning, occupancy, opening hours, rush-hour density, and weather responses

### 15. Ambient and localized audio

- Global beds: traffic wash, wind, birds, rain, insects, distant voices, and city hum
- Local emitters: drains, fountains, HVAC, transformers, signs, cafés, shops, and construction
- Event sounds: horns, braking, footsteps, crosswalk beeps, doors, vehicles, dogs, and thunder
- Day/night, indoor/outdoor, weather, distance, occlusion, and district variations

Epic documents ambient looping and one-shot sounds with spatial falloff, plus
area-specific audio volumes. [Epic Ambient Sound](https://dev.epicgames.com/documentation/unreal-engine/ambient-sound-actor-user-guide-in-unreal-engine?lang=en-US)

## Scene-making systems the plugin should provide

These are as important as the individual assets:

- Spline-based roads, curbs, sidewalks, fences, guardrails, wires, and markings
- Modular intersections, corners, curb ramps, driveways, and transit stops
- Surface-aware scattering for trees, shrubs, grass, rocks, litter, and parked vehicles
- Exclusion zones for doors, crossings, sight lines, accessible routes, and utilities
- Rule-based clusters, such as stop + shelter + bench + timetable + waiting people
- Presets for urban core, neighborhood, suburb, park, industrial, rural, and waterfront
- Regional packs for road rules, signs, markings, street furniture, utilities, and plants
- Climate/season packs and day/night/weather state switching
- Seeded variation in model, color, scale, rotation, age, wear, and occupancy
- Instancing, batching, LODs, billboards/impostors, culling, and density budgets
- 2D floorplan symbols, selection proxies, previews, undoable placement, and inspector controls

## Recommended implementation roadmap

### P0 — make a coherent street possible

1. Terrain/ground materials and spline-based road surfaces
2. Curbs, gutters, sidewalks, corners, crossings, curb ramps, and tactile paving
3. Lane markings, common signs, signals, and road/pedestrian lights
4. Drainage grates, manholes, utility poles/boxes, hydrants, bollards, and barriers
5. Trees plus shrubs, grass, ground cover, planters, rocks, and scatter rules
6. Day/night sky, sun, clouds, fog, shadows, and basic wet/dry material states

### P1 — make it recognizable and pleasant

1. Benches, bins, bicycle racks, transit stops, wayfinding, and café/parklet kits
2. Building-edge props, storefronts, awnings, fences, gates, and rooftop utilities
3. Parked vehicles, a small moving-traffic system, and low-cost pedestrian crowds
4. Material variation, decals, wear, litter, and a small library of story clusters
5. Ambient audio zones and localized emitters

### P2 — make it feel alive over time

1. Traffic/pedestrian behaviors and activity scheduling
2. Weather particles, runoff, water effects, and seasonal state changes
3. Birds, pets, insects, service activity, construction, and event variants
4. Advanced animation, interactive props, and regional/climate content packs

## Product recommendation for this repository

Do not turn every item into a bespoke node. A deeper plugin interface would use
a few reusable node families: `surface`, `spline`, `scatter`, `prop`, `light`,
`decal`, `audio`, `weather`, and `activity`. Presets can then supply the actual
road, sidewalk, lamp, bench, shrub, bin, marking, or sound. Repeated environment
assets should use seeded variants, instancing, and shared materials.

## Scope caveat

Most engineering references above are from the United States, with one UK design
reference. They are useful for identifying asset categories, not for making a
globally valid street kit. Final geometry and placement rules must follow the
target country's current standards and the target climate, biome, land use, and
era. Avoid combining road markings, signs, tactile systems, utilities, plants,
and street furniture from incompatible places.

## Implementation audit and master checklist

Audit date: 2026-08-03. This is a source-and-test audit of the current working
tree, including uncommitted work. It describes what exists in this repository,
not what may exist elsewhere in the Pascal host application.

Checklist rules:

- `[x]` means the item is implemented in this plugin and verified by source or
  tests.
- `[ ]` means work remains. A line marked **Partial** stays unchecked until the
  complete item described by that line is delivered.
- Research, documentation, or a host-application capability does not count as
  a plugin implementation.

### Current implementation summary

The plugin currently registers 24 node kinds: 21 lighting kinds, one reusable
road-sign kind, one utility-pole kind, and one hidden utility-wire-span kind.
The road-sign kind supplies eight catalog presets. The utility pole supplies
four assembly roles and automatically creates or splits conductor spans.

The strongest completed vertical slice is lighting: all 22 lamp archetypes in
the lamp taxonomy are represented, with the modern side-entry and davit forms
sharing one node. Supported assets generally include procedural 3D geometry,
placement tools and previews, parametric editing, selection, and 2D floorplan
symbols. The current automated baseline passes 135 tests and TypeScript type
checking.

The wider environment system is not yet implemented. Terrain, roads,
sidewalks, markings, signals, drainage, vegetation, furniture, transit,
buildings, people, vehicles, atmosphere, weather, wear, behavior, and audio
remain the main bodies of work.

### A. Plugin foundation and editor integration

- [x] Register the stable `pascal:environment` plugin manifest.
- [x] Register an Environment host panel.
- [x] Separate the panel catalog into Lighting, Signs, and Utilities.
- [x] Support single-placement and continuous-placement modes.
- [x] Provide procedural 3D renderers for the registered visible assets.
- [x] Provide placement previews for user-placeable assets.
- [x] Provide parametric inspector controls for supported asset properties.
- [x] Provide selection, movement, rotation, duplication, and deletion capabilities.
- [x] Provide 2D floorplan symbols for every registered node kind.
- [x] Keep placement-preview identities separate from persistent road-sign identities.
- [x] Normalize duplicate road-sign child IDs loaded from stale scenes.
- [x] Provide catalog thumbnails for the lighting and road-sign entries.
- [x] Verify the current code with automated tests.
- [x] Verify the current code with TypeScript type checking.
- [ ] Add end-to-end tests inside the full Pascal host application.
- [ ] Add performance budgets for geometry, lights, draw calls, and large scenes.
- [ ] Add accessibility tests for the Environment panel controls.
- [ ] Add persisted scene fixtures that exercise every node migration.
- [ ] Add release/version documentation for each shipped asset family.

### B. Lighting catalog — implemented

- [x] Modern side-entry roadway light.
- [x] Davit/swept-arm roadway form through the shared street-light node.
- [x] Modern pedestrian post-top light.
- [x] Heritage Bishop's Crook pendant light.
- [x] Classic cobra-head roadway light.
- [x] Twin-arm median light.
- [x] Three- or four-head area light.
- [x] Truss/bracket roadway light.
- [x] Six-head high-mast lowering crown.
- [x] Shoebox parking/area light.
- [x] Tilted floodlight pole.
- [x] Traditional post-top lantern.
- [x] Globe/acorn post-top light.
- [x] Three-lantern decorative candelabra.
- [x] Twin-head path/garden light.
- [x] Shielded bollard light.
- [x] Two-support catenary/suspended street light.
- [x] Wall-arm architectural street light.
- [x] Full-cutoff wall-pack/bulkhead light.
- [x] Ceiling-hosted tunnel/underpass luminaire.
- [x] Ceiling-hosted canopy/soffit light.
- [x] Integrated solar street light.
- [x] Group related lights into roadway, post-top, path-scale, and structure-mounted style families.
- [x] Share roadway pole, mast, base, head, material, selection, and light primitives.
- [x] Keep lights off by default.
- [x] Expose lamp on/off state.
- [x] Expose light color.
- [x] Expose light intensity.
- [x] Expose installation height where applicable.
- [x] Expose arm length, reach, or fixture span where applicable.
- [x] Support three- and four-head count options on the multi-head area pole.
- [x] Support wall-local placement for wall-arm and wall-pack fixtures.
- [x] Support ceiling-aware placement for tunnel luminaires.
- [x] Preserve purpose-scaled defaults for high-mast, path, bollard, wall-pack, and canopy lights.
- [x] Emit live scene lights only for committed fixtures whose lamp state is on.
- [x] Keep placement previews visually detailed without adding live scene lights.
- [ ] Add automatic day/night or photocell switching.
- [ ] Add time schedules and dimming profiles.
- [ ] Add motion/presence sensor behavior.
- [ ] Add broken-lamp state.
- [ ] Add flickering-lamp behavior.
- [ ] Add weathered, rusty, stickered, damaged, and missing-access-door variants.
- [ ] Add interchangeable lamp-source appearances such as sodium, metal-halide, fluorescent, and gas/incandescent.
- [ ] Add configurable photometric distributions and shielding.
- [ ] Add parallel-double and other head-count layouts beyond the current radial and opposing options.
- [ ] Add separate-panel and solar/grid-hybrid presets.
- [ ] Add smart-pole attachments such as cameras, radios, speakers, sensors, emergency buttons, and displays.
- [ ] Add façade wash lights.
- [ ] Add storefront lighting.
- [ ] Add illuminated handrails.
- [ ] Add step lights.
- [ ] Add string/festoon lighting systems.
- [ ] Add tree and seasonal decorative lighting.
- [ ] Add vehicle headlight, brake-light, indicator, and emergency-light assets.

### C. Road signs and traffic control

- [x] Provide one reusable procedural road-sign node.
- [x] Provide a stop-sign preset.
- [x] Provide a yield/give-way preset.
- [x] Provide a speed-limit preset with editable display text.
- [x] Provide a no-entry preset.
- [x] Provide a no-parking preset.
- [x] Provide a pedestrian-crossing warning preset.
- [x] Provide a general-warning preset.
- [x] Provide a directional/wayfinding preset with editable display text.
- [x] Support single-post road-sign mounting.
- [x] Support double-post road-sign mounting.
- [x] Keep road-sign graphics vector-based.
- [x] Escape user-provided road-sign text before rendering it into SVG.
- [x] Provide placement previews, inspector controls, selection handles, and floorplan symbols for signs.
- [ ] Add street-name signs.
- [ ] Add parking-zone and loading-zone sign families beyond the single no-parking preset.
- [ ] Add roadwork and temporary warning-sign families.
- [ ] Add jurisdiction-specific sign packs.
- [ ] Add driving-side-aware sign orientation and placement rules.
- [ ] Add center lines.
- [ ] Add lane-divider lines.
- [ ] Add edge lines.
- [ ] Add parking-bay lines.
- [ ] Add bus-lane markings.
- [ ] Add cycle-lane markings.
- [ ] Add stop and yield bars.
- [ ] Add zebra and other crosswalk markings.
- [ ] Add pavement arrows.
- [ ] Add pavement text and symbols.
- [ ] Add hatch zones and colored pavement.
- [ ] Add vehicle traffic signals.
- [ ] Add pedestrian signals.
- [ ] Add pedestrian push buttons.
- [ ] Add countdown displays.
- [ ] Add signal-controller cabinets.
- [ ] Add traffic-signal phase and timing behavior.
- [ ] Add traffic cones.
- [ ] Add temporary barriers and barricades.
- [ ] Add portable roadwork warning lamps.
- [ ] Add parking meters and pay stations.
- [ ] Add enforcement cameras and speed displays.

### D. Utility poles, conductors, and visible utilities

- [x] Provide a tapered wood three-phase distribution pole.
- [x] Use a realistic default exposed height for a nominal 35-foot pole.
- [x] Provide a primary crossarm with braces and pin insulators.
- [x] Provide a lower neutral crossarm.
- [x] Expose stable left, center, right, and neutral conductor anchors.
- [x] Provide an optional pole-mounted transformer.
- [x] Provide a transformer-free configuration using the same pole structure.
- [x] Provide tangent assembly role geometry.
- [x] Provide small-angle assembly role geometry.
- [x] Provide junction assembly role geometry with tap-rack cues.
- [x] Provide dead-end assembly role geometry with strain-insulator cues.
- [x] Provide guy and anchor cues for angle/dead-end roles.
- [x] Automatically orient new crossarms perpendicular to the connected main span.
- [x] Automatically connect a new pole to the nearest eligible pole within the urban span limit.
- [x] Create three primary conductors and one lower neutral conductor per span.
- [x] Render visible conductor sag.
- [x] Re-resolve conductor curves when connected pole geometry changes.
- [x] Split an existing through-span when a pole is inserted inline.
- [x] Support shared-pole T-junctions and multi-way graph topology.
- [x] Keep generated utility-wire-span nodes hidden from the placement catalog.
- [ ] Add engineering sag/tension calculations.
- [ ] Add voltage, conductor-size, loading-district, terrain, and clearance inputs.
- [ ] Add configurable rural span rules.
- [ ] Add multi-crossarm/double-circuit wood poles.
- [ ] Add explicit double-arm dead-end/angle assemblies.
- [ ] Add single-phase roadside poles.
- [ ] Add concrete pole variants.
- [ ] Add galvanized-steel pole variants.
- [ ] Add composite pole variants.
- [ ] Add secondary service conductors and service drops.
- [ ] Add telecommunications lines and attachments.
- [ ] Add capacitors, regulators, switches, arresters, grounds, and additional cutout equipment.
- [ ] Add electrical and telecom cabinets.
- [ ] Add junction boxes.
- [ ] Add street-light and traffic-signal control boxes.
- [ ] Add storm-drain inlets and catch basins.
- [ ] Add trench drains and grates.
- [ ] Add curb outlets.
- [ ] Add manholes and utility covers.
- [ ] Add valve covers, inspection hatches, and access panels.
- [ ] Add fire hydrants.
- [ ] Add water and gas meters.
- [ ] Add standpipes and hose connections.
- [ ] Add downspouts.
- [ ] Add rural ditches, headwalls, and exposed pipe ends.

### E. Terrain and ground

- [ ] Add a base terrain node or terrain system.
- [ ] Add editable slopes.
- [ ] Add embankments and cuttings.
- [ ] Add verges, vacant ground, and lot surfaces.
- [ ] Add asphalt material presets.
- [ ] Add concrete material presets.
- [ ] Add paver material presets.
- [ ] Add gravel and compacted-soil presets.
- [ ] Add mud, sand, mulch, and grass ground presets.
- [ ] Add retaining walls.
- [ ] Add terrain steps and ramps.
- [ ] Add terrain handrails and guardrails.
- [ ] Add terrain edging.
- [ ] Add ditches, culverts, and channels.
- [ ] Add creek beds, ponds, canals, and shore edges.
- [ ] Add background terrain and skyline silhouettes.
- [ ] Add distant low-detail scenery.

### F. Roads and vehicle circulation

- [ ] Add a road-spline generator.
- [ ] Add straight and curved road modules if a spline system is not used.
- [ ] Add one-way road layouts.
- [ ] Add two-way road layouts.
- [ ] Add turn lanes.
- [ ] Add shoulders and service roads.
- [ ] Add four-way and irregular intersections.
- [ ] Add T-junctions.
- [ ] Add roundabouts.
- [ ] Add medians, refuge islands, and slip lanes.
- [ ] Add parking bays.
- [ ] Add loading zones and lay-bys.
- [ ] Add driveways, alleys, and garage entrances.
- [ ] Add curbs and curb extensions.
- [ ] Add gutters and traffic islands.
- [ ] Add speed humps and raised tables.
- [ ] Add bicycle lanes and protected cycle tracks.
- [ ] Add shared-use paths and bicycle crossings.
- [ ] Add bridges.
- [ ] Add tunnels and underpasses as scene structures.
- [ ] Add crash barriers and guardrails.
- [ ] Add roadside delineator posts.

### G. Sidewalks and accessible pedestrian routes

- [ ] Add sidewalk-surface generation.
- [ ] Add frontage, clear-walking, furnishing, and buffer zone controls.
- [ ] Add curb ramps and blended transitions.
- [ ] Add level landings.
- [ ] Add accessible driveway crossings.
- [ ] Add tactile/detectable warning paving.
- [ ] Add directional tactile paving.
- [ ] Connect crosswalks to accessible sidewalk routes.
- [ ] Add refuge-island cut-throughs.
- [ ] Add accessible parking connections.
- [ ] Add pedestrian stairs and ramps.
- [ ] Add pedestrian handrails and guardrails.
- [ ] Add pedestrian bridges.
- [ ] Add plazas and shared streets.
- [ ] Add arcades, promenades, and park paths.
- [ ] Add accessibility rule validation for slopes, clear widths, landings, and obstructions.

### H. Street furniture and public amenities

- [ ] Add benches, seats, stools, leaning rails, and picnic tables.
- [ ] Add litter, recycling, ash, dog-waste, and commercial bins.
- [ ] Add bicycle racks and lockers.
- [ ] Add scooter docks and bike-share stations.
- [ ] Add non-lighting bollards, chains, fences, gates, and railings.
- [ ] Add tree guards and planter barriers.
- [ ] Add planters, tree pits, tree grates, and watering bags.
- [ ] Add drinking fountains and bottle fillers.
- [ ] Add public toilets.
- [ ] Add public clocks and phone/charging points.
- [ ] Add mailboxes and parcel lockers.
- [ ] Add newspaper boxes and vending machines.
- [ ] Add kiosks.
- [ ] Add maps, notice boards, and information pylons.
- [ ] Add advertising panels.
- [ ] Add public art, sculptures, murals, monuments, fountains, and memorials.
- [ ] Add café tables, chairs, umbrellas, awnings, market stalls, and queues.
- [ ] Add parklet kits.
- [ ] Add playground and exercise equipment.
- [ ] Add chess/game tables and pet amenities.

### I. Transit

- [ ] Add bus/tram stop poles and signs.
- [ ] Add route maps and timetables.
- [ ] Add real-time passenger-information displays.
- [ ] Add transit shelters and canopies.
- [ ] Add shelter benches, bins, lighting, ticket machines, and advertising panels.
- [ ] Add accessible boarding areas and tactile platform edges.
- [ ] Add stop-to-sidewalk and stop-to-crossing connections.
- [ ] Add bus bulbs and dedicated transit lanes.
- [ ] Add tram platforms and rails.
- [ ] Add transit catenary poles and wire systems.
- [ ] Add station entrances.
- [ ] Add park-and-ride layouts.
- [ ] Add taxi/rideshare stands.
- [ ] Add bicycle parking and drop-off zones at stops.

### J. Buildings, boundaries, and active edges

- [ ] Add building-mass presets with varied footprints, heights, setbacks, and rooflines.
- [ ] Add façade rhythm and material controls.
- [ ] Add doors, windows, balconies, porches, and shutters.
- [ ] Add building steps, ramps, canopies, and awnings.
- [ ] Add storefront glass, signs, displays, and menu boards.
- [ ] Add selective visible interiors.
- [ ] Add loading and service doors.
- [ ] Add vents, ducts, pipes, meters, fire escapes, and roof HVAC.
- [ ] Add boundary walls, fences, hedges, gates, and property markers.
- [ ] Add construction sites, scaffolding, hoarding, skips, and portable cabins.
- [ ] Add construction materials and equipment props.
- [ ] Add lit/unlit and occupied/vacant building states.
- [ ] Add maintained/neglected and open/closed building states.

### K. Vegetation and green infrastructure

- [ ] Add tree species, age, size, silhouette, health, and seasonal variants.
- [ ] Add shrubs and hedges.
- [ ] Add grasses, ground cover, flowers, weeds, vines, moss, and lawns.
- [ ] Add leaves, twigs, fallen branches, stumps, and visible roots.
- [ ] Add mulch, soil, rocks, and boulders.
- [ ] Add planted medians and planter beds.
- [ ] Add green walls and green roofs.
- [ ] Add community gardens.
- [ ] Add rain gardens and bioswales.
- [ ] Add bioretention cells and stormwater planters.
- [ ] Add permeable paving.
- [ ] Add bird boxes, insect hotels, nests, and pollinator planting.
- [ ] Add surface-aware vegetation scatter rules.
- [ ] Add exclusion zones around doors, crossings, sight lines, routes, and utilities.

### L. People, vehicles, and animals

- [ ] Add people walking, waiting, sitting, talking, shopping, working, jogging, and playing.
- [ ] Add adult, child, and older-person character variants.
- [ ] Add wheelchair users and other mobility-aid users.
- [ ] Add cyclists, scooter riders, delivery riders, vendors, crews, and road workers.
- [ ] Add parked and moving cars.
- [ ] Add vans, taxis, buses, trucks, motorcycles, bicycles, and emergency vehicles.
- [ ] Add vehicle color, age, cleanliness, occupancy, light-state, parked-state, and damage variants.
- [ ] Add contextual dogs, cats, birds, squirrels, insects, and regional wildlife.
- [ ] Add density, route, behavior, clothing, and time-of-day variation.
- [ ] Add a moving-traffic system.
- [ ] Add a pedestrian-crowd system.

### M. Sky, atmosphere, weather, water, and seasons

- [ ] Add sun/moon directional lighting.
- [ ] Add sky light and sky/atmosphere rendering.
- [ ] Add clouds and fog.
- [ ] Add time-of-day and sun-angle controls.
- [ ] Add cloud-cover, exposure, and color-temperature controls.
- [ ] Add rain, snow, hail, dust, mist, smoke, steam, pollen, and windblown particles.
- [ ] Add wet surfaces and puddles.
- [ ] Add reflections, tire spray, drips, runoff, and drain flow.
- [ ] Add rivers, ponds, fountains, sprinklers, canals, waves, foam, and ripples.
- [ ] Add spring, summer, autumn, and winter scene presets.
- [ ] Add seasonal material and vegetation state changes.

### N. Surface variation, wear, and traces of use

- [ ] Add asphalt cracks, potholes, patches, seams, and faded markings.
- [ ] Add dirt, dust, mud, oil stains, tire marks, gum, rust, mineral streaks, and curb scuffs.
- [ ] Add wall cracks, chipped paint, water damage, moss, soot, graffiti, posters, and stickers.
- [ ] Add leaf litter and windblown trash.
- [ ] Add cups, bags, boxes, parcels, pallets, and cigarette waste.
- [ ] Add parked-bicycle, café-dish, temporary-notice, event-banner, and maintenance-barrier story props.
- [ ] Add wet/dry and clean/dirty material variants.
- [ ] Add edge wear and contact grime.
- [ ] Add a reusable decal system.
- [ ] Add reusable seeded story clusters.

### O. Motion and behavior

- [ ] Add wind animation for trees, shrubs, grass, flags, banners, wires, and loose paper.
- [ ] Add traffic-light cycles.
- [ ] Add vehicle routing, wheel rotation, turning, and braking behavior.
- [ ] Add pedestrian crossing behavior.
- [ ] Add animated doors, gates, shutters, fans, and screens.
- [ ] Add animated fountains, sprinklers, and construction machinery.
- [ ] Add birds taking off and perching.
- [ ] Add insect swarms, drifting litter, steam, smoke, and water drips.
- [ ] Add time-based spawning and occupancy.
- [ ] Add opening hours, rush-hour density, and weather responses.
- [ ] Add interactive props.

### P. Ambient and localized audio

- [ ] Add global traffic, wind, bird, rain, insect, voice, and city-hum beds.
- [ ] Add localized drain, fountain, HVAC, transformer, sign, café, shop, and construction emitters.
- [ ] Add horn, braking, footstep, crosswalk, door, vehicle, dog, and thunder events.
- [ ] Add day/night, indoor/outdoor, and weather-dependent audio states.
- [ ] Add distance falloff and occlusion.
- [ ] Add district-specific audio variation.
- [ ] Add reusable audio zones.

### Q. Reusable environment systems and optimization

- [ ] Add reusable `surface` nodes.
- [ ] Add reusable `spline` nodes.
- [ ] Add reusable `scatter` nodes.
- [ ] Add reusable generic `prop` nodes.
- [x] Add reusable parametric `light` node families.
- [ ] Add reusable `decal` nodes.
- [ ] Add reusable `audio` nodes.
- [ ] Add reusable `weather` nodes.
- [ ] Add reusable `activity` nodes.
- [ ] Add spline-based roads, curbs, sidewalks, fences, guardrails, and markings.
- [x] Add an automatically connected wire-span graph for utility conductors.
- [ ] Generalize the utility conductor logic into a reusable wire/spline system.
- [ ] Add modular intersections, corners, curb ramps, driveways, and transit stops.
- [ ] Add surface-aware scattering for vegetation, rocks, litter, and parked vehicles.
- [ ] Add general exclusion zones.
- [ ] Add rule-based prop clusters.
- [ ] Add urban-core, neighborhood, suburb, park, industrial, rural, and waterfront scene presets.
- [ ] Add regional content packs.
- [ ] Add climate and season packs.
- [ ] Add scene-wide day/night/weather switching.
- [ ] Add seeded model, color, scale, rotation, age, wear, and occupancy variation.
- [ ] Add geometry instancing and batching.
- [ ] Add levels of detail.
- [ ] Add billboards or impostors for distant assets.
- [ ] Add culling and density budgets.

### R. Priority completion checklist

#### P0 — coherent street

- [ ] Deliver terrain and ground materials.
- [ ] Deliver spline-based roads.
- [ ] Deliver curbs and gutters.
- [ ] Deliver sidewalks, corners, crossings, curb ramps, and tactile paving.
- [ ] Deliver road-surface markings.
- [x] Deliver a starter road-sign catalog.
- [ ] Deliver traffic and pedestrian signals.
- [x] Deliver roadway, pedestrian, area, path, structure-mounted, and solar lighting.
- [ ] Deliver drainage grates and manholes.
- [x] Deliver utility poles, primary conductors, neutral conductors, and optional transformers.
- [ ] Deliver utility boxes, hydrants, traffic bollards, and barriers.
- [ ] Deliver trees, shrubs, grass, ground cover, planters, rocks, and scatter rules.
- [ ] Deliver day/night sky, sun, clouds, fog, and shadows.
- [ ] Deliver basic wet/dry material states.

#### P1 — recognizable and pleasant place

- [ ] Deliver benches, bins, bicycle racks, transit stops, and wayfinding kits.
- [ ] Deliver café and parklet kits.
- [ ] Deliver building-edge props, storefronts, awnings, fences, gates, and rooftop utilities.
- [ ] Deliver parked vehicles.
- [ ] Deliver a small moving-traffic system.
- [ ] Deliver low-cost pedestrian crowds.
- [ ] Deliver material variation, decals, wear, and litter.
- [ ] Deliver a starter library of story clusters.
- [ ] Deliver ambient audio zones and localized emitters.

#### P2 — alive over time

- [ ] Deliver traffic and pedestrian behaviors.
- [ ] Deliver activity scheduling.
- [ ] Deliver weather particles, runoff, and water effects.
- [ ] Deliver seasonal state changes.
- [ ] Deliver birds, pets, insects, service activity, construction, and event variants.
- [ ] Deliver advanced animation and interactive props.
- [ ] Deliver regional and climate content packs.
