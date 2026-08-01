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
