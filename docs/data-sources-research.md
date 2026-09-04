# Free/open data sources for a real-world 3D streetscape

Research checked 4 September 2026. Links below point to first-party documentation or the official project site.

## What teams commonly do

The practical pipeline is usually:

1. Download an OSM extract for a small area or region (`.osm.pbf`).
2. Filter/clip it offline to the area of interest.
3. Convert OSM ways and tags into application features: roads, buildings, POIs, land use, and street furniture.
4. Reproject longitude/latitude into a local metric coordinate system before generating meshes.
5. Sample a DEM for terrain height and either drape roads on it or apply a height profile.
6. Build simple buildings by extruding footprints; use a hosted 3D Tiles service only when streaming/global coverage is more important than owning the data.

For this Pascal/Three.js plugin, this means keeping the runtime format small and local (the existing road graph or GeoJSON-like intermediate data), while doing heavy parsing and filtering during import.

## OpenStreetMap acquisition

### Overpass API: best for targeted queries and prototyping

[Overpass API's official manual](https://dev.overpass-api.de/overpass-doc/en/) describes it as a read/query service for selecting OSM objects by tags, location, and other criteria. [Overpass Turbo](https://dev.overpass-api.de/overpass-doc/en/targets/turbo.html) is the browser-based query and preview tool.

Use it for a small bounding box or a specific feature query, for example roads with `highway=*` and buildings with `building=*`. It is not a bulk-download backend: the public instance asks users to stay below roughly 10,000 requests and 1 GB/day, and recommends planet dumps or extracts for large workloads ([public-instance guidance](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html)). Cache results and avoid one-request-per-feature patterns.

### Main OSM API: editing-oriented, not a bulk importer

The [OSM API v0.6 documentation](https://wiki.openstreetmap.org/wiki/Api06) provides map-by-bounding-box retrieval, but [OSM's download guidance](https://wiki.openstreetmap.org/wiki/Downloading_data) explicitly says the main API is dedicated to editing and should not be used for mass downloads. Treat it as unsuitable for the plugin's regional import path.

### Geofabrik extracts: recommended starting point for regional data

[Geofabrik's official download server](https://download.geofabrik.de/) offers free OSM extracts, normally updated daily, by continent and country. The files are commonly `.osm.pbf`, much smaller and easier to process than a planet dump. Geofabrik says its public extracts omit contributor names, IDs, and changeset IDs; full-metadata history extracts have separate access requirements.

### Offline processing tools

- [Osmium Tool](https://osmcode.org/osmium-tool/manual) is a free/open-source command-line utility for inspecting, converting, filtering by tags, and creating geographic extracts from OSM files. Its [extract command](https://docs.osmcode.org/osmium/latest/osmium-extract.html) accepts a bounding box or polygon. A useful import step is to clip a country extract to the project AOI before parsing it.
- [pyrosm](https://pyrosm.readthedocs.io/en/latest/reading_osm_data.html) reads local `.osm.pbf` files into GeoPandas and directly exposes networks, buildings, POIs, land use, natural features, boundaries, custom filters, and bounding-box reads. Its API is a good fit for a one-time Python preprocessing script that emits compact JSON/GeoJSON for the TypeScript plugin.
- [OSMnx](https://osmnx.readthedocs.io/en/stable/) downloads, models, analyzes, and visualizes street networks and other OSM features. It is especially useful when road topology, routing graphs, simplification, or network analysis matters. For repeatable large/regional imports, local PBF + pyrosm/osmium avoids depending on repeated Overpass calls.

## Terrain / elevation

- [NASA SRTM](https://www.earthdata.nasa.gov/s3fs-public/2025-05/SRTM_Quick_Guide.pdf) provides global 1-arc-second and 3-arc-second products (approximately 30 m and 90 m postings; coverage is roughly 60°N to 56°S). It is a good baseline DEM for terrain shaping, but it is not a detailed city-grade surface model.
- [Copernicus DEM](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM) provides worldwide GLO-30 and GLO-90 products with a free license. The official page documents GeoTIFF/DTED delivery and the required source notice. Access/download eligibility and registration should be checked before building an automated downloader.

For an initial editor, SRTM or Copernicus GLO-30 is adequate for broad terrain. Use a higher-resolution local government DEM where road elevation and curb-level accuracy matter; do not assume a global DEM captures buildings, bridges, or road surfaces.

## Buildings and 3D representation

The lowest-cost and most controllable approach is to read OSM `building=*` footprints with pyrosm (or an OSM query), then extrude each polygon. Use `building:levels` or `height` when present, with a documented fallback height when absent. This keeps geometry editable and avoids a hosted-data dependency, but OSM building coverage and height tags vary by location.

[Cesium OSM Buildings](https://cesium.com/platform/cesium-ion/content/cesium-osm-buildings/) is a ready-to-stream global 3D Tiles layer derived from OSM, with per-building metadata and quarterly updates. It is convenient for a viewer or contextual backdrop, but it requires Cesium ion access/token and network connectivity. The [free Community plan](https://cesium.com/platform/cesium-ion/pricing/) is for individual personal/non-commercial projects and has quotas (including 5 GB storage and 15 GB/month streaming). Check current terms before using it in a commercial product. Required attribution is `© OpenStreetMap contributors`.

## Licensing and attribution

[OpenStreetMap's copyright page](https://www.openstreetmap.org/copyright) says OSM data is under the Open Data Commons Open Database License (ODbL). Any product using OSM data must credit OpenStreetMap and contributors and make the ODbL availability clear. If distributing a derivative database, ODbL share-alike obligations may apply; obtain legal review for the exact packaging and whether the result is a produced work or derivative database. The [OSMF attribution guidelines](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines) provide implementation examples.

Terrain datasets have their own terms. In particular, follow the Copernicus source notice on distribution, and retain source/license metadata alongside downloaded DEM tiles. Do not use Google/Bing imagery or building data as an unlicensed substitute for OSM; imagery/provider terms are separate from OSM's license.

## Recommendation for this project

Start with this import stack:

`Geofabrik .osm.pbf → Osmium AOI clip → pyrosm feature extraction → local WGS84-to-metre projection → Pascal road/building/POI records → procedural Three.js meshes`

Use Overpass Turbo/Overpass for early experiments and small AOIs. Add NASA SRTM or Copernicus GLO-30 as an optional terrain-import step. Generate simple editable building extrusions first; evaluate Cesium OSM Buildings later if the product needs global streaming context. Keep attribution visible in the UI/export metadata and store the source date, extract URL, and license with every imported project.
