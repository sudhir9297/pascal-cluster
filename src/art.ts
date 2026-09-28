import streetscapeIcon from './assets/streetscape-icon.webp'
import bollardLightThumbnail from './assets/bollard-light-thumbnail-v2.webp'
import canopySoffitLightThumbnail from './assets/canopy-soffit-light-thumbnail-v2.webp'
import catenarySuspendedLightThumbnail from './assets/catenary-suspended-light-thumbnail-v2.webp'
import decorativeCandelabraLightThumbnail from './assets/decorative-candelabra-light-thumbnail-v2.webp'
import wallPackBulkheadThumbnail from './assets/wall-pack-bulkhead-thumbnail-v2.webp'
import cobraHeadLightThumbnail from './assets/cobra-head-light-thumbnail-v2.webp'
import floodlightPoleThumbnail from './assets/floodlight-pole-thumbnail-v2.webp'
import globePostTopLightThumbnail from './assets/globe-post-top-light-thumbnail-v2.webp'
import highMastCrownLightThumbnail from './assets/high-mast-crown-light-thumbnail-v2.webp'
import heritageCrookLightThumbnail from './assets/heritage-crook-light-thumbnail-v2.webp'
import multiHeadAreaLightThumbnail from './assets/multi-head-area-light-thumbnail-v2.webp'
import pathGardenLightThumbnail from './assets/path-garden-light-thumbnail-v2.webp'
import postTopLightThumbnail from './assets/post-top-light-thumbnail-v2.webp'
import shoeboxAreaLightThumbnail from './assets/shoebox-area-light-thumbnail-v2.webp'
import solarStreetLightThumbnail from './assets/solar-street-light-thumbnail-v2.webp'
import streetLightThumbnail from './assets/street-light-thumbnail-v2.webp'
import traditionalPostTopLanternThumbnail from './assets/traditional-post-top-lantern-thumbnail-v2.webp'
import wallArmLightThumbnail from './assets/wall-arm-light-thumbnail-v2.webp'
import twinArmMedianLightThumbnail from './assets/twin-arm-median-light-thumbnail-v2.webp'
import trussRoadwayLightThumbnail from './assets/truss-roadway-light-thumbnail-v2.webp'
import tunnelLuminaireThumbnail from './assets/tunnel-luminaire-thumbnail-v2.webp'
import utilityPoleThumbnail from './assets/utility-pole-thumbnail.webp'
import type { CatalogLampProjection } from './catalog-lamp-config'
import {
  CATALOG_LAMP_THUMBNAILS as CATALOG_LAMP_THUMBNAIL_SVGS,
  getCatalogLampThumbnail,
} from './catalog-lamp-thumbnails'
import directionalRoadSignThumbnail from './assets/directional-road-sign-thumbnail.webp'
import noEntryRoadSignThumbnail from './assets/no-entry-road-sign-thumbnail.webp'
import noParkingRoadSignThumbnail from './assets/no-parking-road-sign-thumbnail.webp'
import pedestrianCrossingRoadSignThumbnail from './assets/pedestrian-crossing-road-sign-thumbnail.webp'
import speedLimitRoadSignThumbnail from './assets/speed-limit-road-sign-thumbnail.webp'
import stopRoadSignThumbnail from './assets/stop-road-sign-thumbnail.webp'
import warningRoadSignThumbnail from './assets/warning-road-sign-thumbnail.webp'
import yieldRoadSignThumbnail from './assets/yield-road-sign-thumbnail.webp'
import roadNetworkThumbnail from './assets/road-network-thumbnail-v2.webp'
import trafficSignalThumbnail from './assets/traffic-signal-thumbnail-v2.webp'
import drainageInletThumbnail from './assets/drainage-inlet-thumbnail-v2.webp'
import manholeCoverThumbnail from './assets/manhole-cover-thumbnail-v2.webp'
import fireHydrantThumbnail from './assets/fire-hydrant-thumbnail-v2.webp'
import trafficBollardThumbnail from './assets/traffic-bollard-thumbnail-v2.webp'
import roadBarrierThumbnail from './assets/road-barrier-thumbnail-v2.webp'
import drivewayThumbnail from './assets/driveway-thumbnail-v2.webp'
import mailboxThumbnail from './assets/mailbox-thumbnail.webp'
import parcelBoxThumbnail from './assets/parcel-box-thumbnail.webp'
import commercialTrashBinThumbnail from './assets/commercial-trash-bin-thumbnail.webp'
import recyclingBinThumbnail from './assets/recycling-bin-thumbnail-v2.webp'
import drivewayGateThumbnail from './assets/driveway-gate-thumbnail-v2.webp'
import speedHumpThumbnail from './assets/speed-hump-thumbnail-v2.webp'

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

/** The Streetscape panel / section icon. */
export const STREETSCAPE_ICON = url(streetscapeIcon)

/** Catalog artwork for the placeable streetscape assets. */
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
export const TRAFFIC_BOLLARD_THUMBNAIL = url(trafficBollardThumbnail)
export const ROAD_BARRIER_THUMBNAIL = url(roadBarrierThumbnail)
export const DRIVEWAY_THUMBNAIL = url(drivewayThumbnail)
export const MAILBOX_THUMBNAIL = url(mailboxThumbnail)
export const PARCEL_BOX_THUMBNAIL = url(parcelBoxThumbnail)
export const COMMERCIAL_TRASH_BIN_THUMBNAIL = url(commercialTrashBinThumbnail)
export const RECYCLING_BIN_THUMBNAIL = url(recyclingBinThumbnail)
export const DRIVEWAY_GATE_THUMBNAIL = url(drivewayGateThumbnail)
export const SPEED_HUMP_THUMBNAIL = url(speedHumpThumbnail)
export const ROAD_NETWORK_THUMBNAIL = url(roadNetworkThumbnail)
/** Intentionally blank artwork for new residential-road assets awaiting thumbnails. */
export const BLANK_THUMBNAIL = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"%3E%3Crect width="640" height="640" fill="%23eef0ef"/%3E%3C/svg%3E'
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
