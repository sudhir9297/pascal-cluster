import environmentIcon from './assets/environment-icon.webp'
import bollardLightThumbnail from './assets/bollard-light-thumbnail-v2.png'
import canopySoffitLightThumbnail from './assets/canopy-soffit-light-thumbnail-v2.png'
import catenarySuspendedLightThumbnail from './assets/catenary-suspended-light-thumbnail-v2.png'
import decorativeCandelabraLightThumbnail from './assets/decorative-candelabra-light-thumbnail-v2.png'
import wallPackBulkheadThumbnail from './assets/wall-pack-bulkhead-thumbnail-v2.png'
import cobraHeadLightThumbnail from './assets/cobra-head-light-thumbnail-v2.png'
import floodlightPoleThumbnail from './assets/floodlight-pole-thumbnail-v2.png'
import globePostTopLightThumbnail from './assets/globe-post-top-light-thumbnail-v2.png'
import highMastCrownLightThumbnail from './assets/high-mast-crown-light-thumbnail-v2.png'
import heritageCrookLightThumbnail from './assets/heritage-crook-light-thumbnail-v2.png'
import multiHeadAreaLightThumbnail from './assets/multi-head-area-light-thumbnail-v2.png'
import pathGardenLightThumbnail from './assets/path-garden-light-thumbnail-v2.png'
import postTopLightThumbnail from './assets/post-top-light-thumbnail-v2.png'
import shoeboxAreaLightThumbnail from './assets/shoebox-area-light-thumbnail-v2.png'
import solarStreetLightThumbnail from './assets/solar-street-light-thumbnail-v2.png'
import streetLightThumbnail from './assets/street-light-thumbnail-v2.png'
import traditionalPostTopLanternThumbnail from './assets/traditional-post-top-lantern-thumbnail-v2.png'
import wallArmLightThumbnail from './assets/wall-arm-light-thumbnail-v2.png'
import twinArmMedianLightThumbnail from './assets/twin-arm-median-light-thumbnail-v2.png'
import trussRoadwayLightThumbnail from './assets/truss-roadway-light-thumbnail-v2.png'
import tunnelLuminaireThumbnail from './assets/tunnel-luminaire-thumbnail-v2.png'
import utilityPoleThumbnail from './assets/utility-pole-thumbnail.webp'
import type { CatalogLampProjection } from './catalog-lamp-config'
import {
  CATALOG_LAMP_THUMBNAILS as CATALOG_LAMP_THUMBNAIL_SVGS,
  getCatalogLampThumbnail,
} from './catalog-lamp-thumbnails'
import directionalRoadSignThumbnail from './assets/directional-road-sign-thumbnail.svg'
import noEntryRoadSignThumbnail from './assets/no-entry-road-sign-thumbnail.svg'
import noParkingRoadSignThumbnail from './assets/no-parking-road-sign-thumbnail.svg'
import pedestrianCrossingRoadSignThumbnail from './assets/pedestrian-crossing-road-sign-thumbnail.svg'
import speedLimitRoadSignThumbnail from './assets/speed-limit-road-sign-thumbnail.svg'
import stopRoadSignThumbnail from './assets/stop-road-sign-thumbnail.svg'
import warningRoadSignThumbnail from './assets/warning-road-sign-thumbnail.svg'
import yieldRoadSignThumbnail from './assets/yield-road-sign-thumbnail.svg'
import roadNetworkThumbnail from './assets/road-network-thumbnail.svg'
import trafficSignalThumbnail from './assets/traffic-signal-thumbnail-v2.png'
import drainageInletThumbnail from './assets/drainage-inlet-thumbnail-v2.png'
import manholeCoverThumbnail from './assets/manhole-cover-thumbnail-v2.png'
import fireHydrantThumbnail from './assets/fire-hydrant-thumbnail-v2.png'

/**
 * Bundled preset artwork. Raster assets live in `./assets` and travel with the
 * package — no CDN, no per-app `public/` mirroring. Both consumers are Next, so
 * `transpilePackages` runs these imports through the image pipeline and `.src`
 * is the hashed, cached URL. The panel renders each as an `<img src>`.
 */
const url = (asset: { src: string }): string => asset.src

const catalogLampThumbnailOverrides: Partial<Record<CatalogLampProjection, string>> = {
  bollard: url(bollardLightThumbnail),
  canopy: url(canopySoffitLightThumbnail),
  catenary: url(catenarySuspendedLightThumbnail),
  candelabra: url(decorativeCandelabraLightThumbnail),
  floodlight: url(floodlightPoleThumbnail),
  globe: url(globePostTopLightThumbnail),
  'high-mast': url(highMastCrownLightThumbnail),
  lantern: url(traditionalPostTopLanternThumbnail),
  path: url(pathGardenLightThumbnail),
  shoebox: url(shoeboxAreaLightThumbnail),
  solar: url(solarStreetLightThumbnail),
  tunnel: url(tunnelLuminaireThumbnail),
  'wall-arm': url(wallArmLightThumbnail),
  'wall-pack': url(wallPackBulkheadThumbnail),
}

/** The Environment panel / section icon. */
export const ENVIRONMENT_ICON = url(environmentIcon)

/** Catalog artwork for the placeable environment assets. */
export const STREET_LIGHT_THUMBNAIL = url(streetLightThumbnail)
export const WALL_ARM_LIGHT_THUMBNAIL = url(wallArmLightThumbnail)
export const CATENARY_SUSPENDED_LIGHT_THUMBNAIL = url(catenarySuspendedLightThumbnail)
export const WALL_PACK_BULKHEAD_THUMBNAIL = url(wallPackBulkheadThumbnail)
export const POST_TOP_LIGHT_THUMBNAIL = url(postTopLightThumbnail)
export const HERITAGE_CROOK_LIGHT_THUMBNAIL = url(heritageCrookLightThumbnail)
export const COBRA_HEAD_LIGHT_THUMBNAIL = url(cobraHeadLightThumbnail)
export const TWIN_ARM_MEDIAN_LIGHT_THUMBNAIL = url(twinArmMedianLightThumbnail)
export const MULTI_HEAD_AREA_LIGHT_THUMBNAIL = url(multiHeadAreaLightThumbnail)
export const TRUSS_ROADWAY_LIGHT_THUMBNAIL = url(trussRoadwayLightThumbnail)
export const TUNNEL_LUMINAIRE_THUMBNAIL = url(tunnelLuminaireThumbnail)
/** Standard 640px catalog art for every configurable lamp projection. */
export const CATALOG_LAMP_THUMBNAILS = Object.fromEntries(
  Object.entries(CATALOG_LAMP_THUMBNAIL_SVGS).map(([projection]) => [
    projection,
    catalogLampThumbnailOverrides[projection as CatalogLampProjection] ??
      getCatalogLampThumbnail(projection as keyof typeof CATALOG_LAMP_THUMBNAIL_SVGS),
  ]),
) as Record<CatalogLampProjection, string>

/** Backwards-compatible default artwork for consumers that do not pick a projection. */
export const CATALOG_LAMP_THUMBNAIL = CATALOG_LAMP_THUMBNAILS.shoebox
export const UTILITY_POLE_THUMBNAIL = url(utilityPoleThumbnail)
export const TRAFFIC_SIGNAL_THUMBNAIL = url(trafficSignalThumbnail)
export const DRAINAGE_INLET_THUMBNAIL = url(drainageInletThumbnail)
export const MANHOLE_COVER_THUMBNAIL = url(manholeCoverThumbnail)
export const FIRE_HYDRANT_THUMBNAIL = url(fireHydrantThumbnail)
export const ROAD_NETWORK_THUMBNAIL = url(roadNetworkThumbnail)
export const ROAD_SIGN_THUMBNAILS = {
  directional: url(directionalRoadSignThumbnail),
  'no-entry': url(noEntryRoadSignThumbnail),
  'no-parking': url(noParkingRoadSignThumbnail),
  'pedestrian-crossing': url(pedestrianCrossingRoadSignThumbnail),
  'speed-limit': url(speedLimitRoadSignThumbnail),
  stop: url(stopRoadSignThumbnail),
  warning: url(warningRoadSignThumbnail),
  yield: url(yieldRoadSignThumbnail),
} as const
