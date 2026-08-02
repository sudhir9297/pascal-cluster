import type { AnyNodeDefinition, Plugin } from '@pascal-app/core'
// Side-effect: keeps the placement brush in sync with "find in catalog".
import './find-sync'
import './normalize-road-signs'
import './purge-removed-lamps'
import { cobraHeadLightDefinition } from './cobra-head-light-definition'
import { ENVIRONMENT_ICON } from './art'
import { heritageCrookLightDefinition } from './heritage-crook-light-definition'
import { postTopLightDefinition } from './post-top-light-definition'
import { multiHeadAreaLightDefinition } from './multi-head-area-light-definition'
import { streetLightDefinition } from './street-light-definition'
import { twinArmMedianLightDefinition } from './twin-arm-median-light-definition'
import { trussRoadwayLightDefinition } from './truss-roadway-light-definition'
import {
  bollardLightDefinition,
  canopySoffitLightDefinition,
  catenaryStreetLightDefinition,
  decorativeCandelabraLightDefinition,
  floodlightPoleDefinition,
  globePostTopLightDefinition,
  highMastCrownLightDefinition,
  pathGardenLightDefinition,
  shoeboxAreaLightDefinition,
  solarStreetLightDefinition,
  traditionalPostTopLanternDefinition,
  tunnelLuminaireDefinition,
  wallArmLightDefinition,
  wallPackLightDefinition,
} from './catalog-lamp-definition'
import { utilityPoleDefinition } from './utility-pole-definition'
import { utilityWireDefinition } from './utility-wire-definition'
import { roadSignDefinition } from './road-sign-definition'

type PluginHostPanel = {
  id: string
  label: string
  icon: { kind: 'url'; src: string }
  component: () => Promise<{ default: React.ComponentType }>
  pluginId: string
  description: string
  creator: {
    name: string
    url?: string
  }
  pluginUrl: string
  defaultInstalled: boolean
}

/**
 * The Environment plugin manifest — the entire public surface of this package. A host
 * loads it through the same `loadPlugin` path the built-ins use: environment
 * node kinds plus one left-rail panel (`Environment`). Cast
 * mirrors the built-in bundle: `AnyNodeDefinition` is the
 * hand-maintained union today; the registry derives it post-migration.
 */
export const environmentPlugin: Plugin = {
  id: 'pascal:environment',
  apiVersion: 1,
  nodes: [
    streetLightDefinition as unknown as AnyNodeDefinition,
    postTopLightDefinition as unknown as AnyNodeDefinition,
    heritageCrookLightDefinition as unknown as AnyNodeDefinition,
    cobraHeadLightDefinition as unknown as AnyNodeDefinition,
    twinArmMedianLightDefinition as unknown as AnyNodeDefinition,
    multiHeadAreaLightDefinition as unknown as AnyNodeDefinition,
    trussRoadwayLightDefinition as unknown as AnyNodeDefinition,
    highMastCrownLightDefinition as unknown as AnyNodeDefinition,
    shoeboxAreaLightDefinition as unknown as AnyNodeDefinition,
    floodlightPoleDefinition as unknown as AnyNodeDefinition,
    traditionalPostTopLanternDefinition as unknown as AnyNodeDefinition,
    globePostTopLightDefinition as unknown as AnyNodeDefinition,
    decorativeCandelabraLightDefinition as unknown as AnyNodeDefinition,
    pathGardenLightDefinition as unknown as AnyNodeDefinition,
    bollardLightDefinition as unknown as AnyNodeDefinition,
    catenaryStreetLightDefinition as unknown as AnyNodeDefinition,
    wallArmLightDefinition as unknown as AnyNodeDefinition,
    wallPackLightDefinition as unknown as AnyNodeDefinition,
    tunnelLuminaireDefinition as unknown as AnyNodeDefinition,
    canopySoffitLightDefinition as unknown as AnyNodeDefinition,
    solarStreetLightDefinition as unknown as AnyNodeDefinition,
    utilityPoleDefinition as unknown as AnyNodeDefinition,
    utilityWireDefinition as unknown as AnyNodeDefinition,
    roadSignDefinition as unknown as AnyNodeDefinition,
  ],
}

export const environmentHostPanel: PluginHostPanel = {
  id: 'pascal:environment:environment',
  label: 'Environment',
  icon: { kind: 'url', src: ENVIRONMENT_ICON },
  component: () => import('./presets-panel'),
  pluginId: environmentPlugin.id,
  description: 'Procedural street furniture for outdoor scenes.',
  creator: {
    name: 'Pascal',
    url: 'https://github.com/pascalorg',
  },
  pluginUrl: 'https://github.com/pascalorg/plugin-environment',
  defaultInstalled: true,
}

export {
  CobraHeadLightNode,
  HeritageCrookLightNode,
  MultiHeadAreaLightNode,
  PedestrianPostLightNode,
  StreetLightNode,
  TwinArmMedianLightNode,
  TrussRoadwayLightNode,
  HighMastCrownLightNode,
  ShoeboxAreaLightNode,
  FloodlightPoleNode,
  TraditionalPostTopLanternNode,
  GlobePostTopLightNode,
  DecorativeCandelabraLightNode,
  PathGardenLightNode,
  BollardLightNode,
  CatenaryStreetLightNode,
  WallArmLightNode,
  WallPackLightNode,
  TunnelLuminaireNode,
  CanopySoffitLightNode,
  SolarStreetLightNode,
  UtilityPoleNode,
  UtilityPoleAssembly,
  UtilityWireSpanNode,
  RoadSignNode,
  createRoadSignNode,
  createRoadSignPreviewNode,
  ROAD_SIGN_PREVIEW_ID,
} from './schema'
export { cobraHeadLightDefinition } from './cobra-head-light-definition'
export { heritageCrookLightDefinition } from './heritage-crook-light-definition'
export { postTopLightDefinition } from './post-top-light-definition'
export { streetLightDefinition } from './street-light-definition'
export { twinArmMedianLightDefinition } from './twin-arm-median-light-definition'
export { trussRoadwayLightDefinition } from './truss-roadway-light-definition'
export { multiHeadAreaLightDefinition } from './multi-head-area-light-definition'
export {
  bollardLightDefinition,
  canopySoffitLightDefinition,
  catenaryStreetLightDefinition,
  decorativeCandelabraLightDefinition,
  floodlightPoleDefinition,
  globePostTopLightDefinition,
  highMastCrownLightDefinition,
  pathGardenLightDefinition,
  shoeboxAreaLightDefinition,
  solarStreetLightDefinition,
  traditionalPostTopLanternDefinition,
  tunnelLuminaireDefinition,
  wallArmLightDefinition,
  wallPackLightDefinition,
} from './catalog-lamp-definition'
export { utilityPoleDefinition } from './utility-pole-definition'
export { utilityWireDefinition } from './utility-wire-definition'
export { roadSignDefinition } from './road-sign-definition'
export {
  ROAD_SIGN_CATALOG,
  ROAD_SIGN_IDS,
  getRoadSignConfig,
  resolveRoadSignText,
  type RoadSignCatalogEntry,
  type RoadSignId,
  type RoadSignPostStyle,
} from './road-sign-config'
export {
  resolveRoadSignLayout,
  resolveRoadSignBracketWidth,
  resolveRoadSignPostPositions,
  ROAD_SIGN_BRACKET_DEPTH_M,
  ROAD_SIGN_BRACKET_HEIGHT_M,
  ROAD_SIGN_BACK_FACE_GAP_M,
  ROAD_SIGN_BRACKET_EDGE_CLEARANCE_M,
  ROAD_SIGN_EDGE_BEVEL_M,
  ROAD_SIGN_FACE_GRAPHIC_GAP_M,
  ROAD_SIGN_PLATE_THICKNESS_M,
  ROAD_SIGN_POST_DEPTH_M,
  ROAD_SIGN_POST_RADIUS_M,
  ROAD_SIGN_POST_THICKNESS_M,
  ROAD_SIGN_POST_WIDTH_M,
  type RoadSignLayout,
} from './road-sign-geometry'
export {
  CATALOG_LAMP_STYLE_OPTIONS,
  CATALOG_LAMP_VARIANTS,
  LAMP_VISUAL_FAMILIES,
  getCatalogLampConfig,
  getCatalogLampStyleOptions,
  resolveCatalogLampProjection,
} from './catalog-lamp-config'
export {
  STANDARD_LAMP_HEIGHT_M,
  STANDARD_LAMP_HEIGHT_MAX_M,
  STANDARD_LAMP_HEIGHT_MIN_M,
} from './lamp-constants'
export {
  findNearestUtilityPoleForConnection,
  findUtilityPoleInlineInsertion,
  resolveUtilityPoleAutoConnect,
  resolveUtilityPolePlacementRotation,
  STANDARD_UTILITY_POLE_AUTO_CONNECT_DISTANCE_M,
  STANDARD_UTILITY_POLE_INLINE_INSERT_DISTANCE_M,
  utilityPoleCrossarmRotationY,
} from './utility-wire-auto-connect'
export {
  resolveUtilityPoleLayout,
  STANDARD_UTILITY_POLE_CROSSARM_LENGTH_M,
  STANDARD_UTILITY_POLE_EMBEDMENT_M,
  STANDARD_UTILITY_POLE_EXPOSED_HEIGHT_M,
  STANDARD_UTILITY_POLE_TOTAL_LENGTH_M,
  type UtilityPoleWireAttachment,
} from './utility-pole-geometry'
