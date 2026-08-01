import { BaseNode, generateId, nodeType, objectId } from '@pascal-app/core'
import { z } from 'zod'
import {
  STANDARD_UTILITY_POLE_CROSSARM_LENGTH_M,
  STANDARD_UTILITY_POLE_EXPOSED_HEIGHT_M,
} from './utility-pole-geometry'
import {
  STANDARD_LAMP_HEIGHT_M,
  STANDARD_LAMP_HEIGHT_MAX_M,
  STANDARD_LAMP_HEIGHT_MIN_M,
} from './lamp-constants'
import { ROAD_SIGN_IDS } from './road-sign-config'

/** A planar road centerline point stored in the road node's local X/Z frame. */
export const RoadSplinePoint = z.tuple([z.number(), z.number()])
export const RoadPathMode = z.enum(['spline', 'orthogonal'])

/** A procedural road generated from a smooth planar centerline. */
export const RoadSplineNode = BaseNode.extend({
  id: objectId('road-spline'),
  type: nodeType('environment:road-spline'),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  pathMode: RoadPathMode.default('spline'),
  points: z.array(RoadSplinePoint).min(2).default([
    [0, 0],
    [12, 0],
  ]),
  junctions: z.array(RoadSplinePoint).default([]),
  width: z.number().min(1).max(40).default(7),
  laneCount: z.number().int().min(1).max(6).default(2),
  centerLineStyle: z.enum(['none', 'single', 'double', 'dashed']).default('double'),
  edgeLines: z.boolean().default(true),
  thickness: z.number().min(0.03).max(0.5).default(0.12),
  surfaceColor: z.string().default('#35383d'),
  centerLineColor: z.string().default('#e6c84f'),
  laneLineColor: z.string().default('#e8e5d7'),
  textureScale: z.number().min(0.5).max(20).default(4),
})

export type RoadSplinePoint = z.infer<typeof RoadSplinePoint>
export type RoadPathMode = z.infer<typeof RoadPathMode>
export type RoadSplineNode = z.infer<typeof RoadSplineNode>

/** A catalog-driven roadside sign with a reusable plate, graphic, and post. */
export const RoadSignNode = BaseNode.extend({
  id: objectId('road-sign'),
  type: nodeType('environment:road-sign'),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  signId: z.enum(ROAD_SIGN_IDS).default('stop'),
  postHeight: z.number().min(1.2).max(4.5).default(2.1),
  scale: z.number().min(0.5).max(2.5).default(1),
  mounting: z.enum(['single-post', 'double-post']).default('single-post'),
  text: z.string().max(32).default(''),
  postColor: z.string().default('#687177'),
  backColor: z.string().default('#747d83'),
})

export type RoadSignNode = z.infer<typeof RoadSignNode>

export type RoadSignNodeInput = z.input<typeof RoadSignNode>

/**
 * Preview nodes are rendered locally and never inserted into the scene store.
 * Giving the preview a stable, clearly non-persistent ID keeps it out of the
 * same identity space as placed signs.
 */
export const ROAD_SIGN_PREVIEW_ID = 'road-sign_preview'

/**
 * Create a placed road sign with an ID that is fresh against the current
 * scene. The core schema generates IDs by default, but it cannot know which
 * IDs are already in the host scene; this boundary can.
 */
export function createRoadSignNode(
  input: RoadSignNodeInput,
  occupiedIds: Iterable<string> = [],
): RoadSignNode {
  const occupied = new Set(occupiedIds)
  const { id: _ignoredId, ...draft } = input

  let id = generateId('road-sign')
  while (occupied.has(id)) id = generateId('road-sign')

  return RoadSignNode.parse({ ...draft, id })
}

/** Create the local-only node used by the road-sign placement preview. */
export function createRoadSignPreviewNode(input: RoadSignNodeInput): RoadSignNode {
  const { id: _ignoredId, ...draft } = input
  return RoadSignNode.parse({ ...draft, id: ROAD_SIGN_PREVIEW_ID })
}

/** A freestanding, single-arm street light with a downward-facing luminaire. */
export const StreetLightNode = BaseNode.extend({
  id: objectId('street-light'),
  type: nodeType('environment:street-light'),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  height: z.number().min(STANDARD_LAMP_HEIGHT_MIN_M).max(STANDARD_LAMP_HEIGHT_MAX_M).default(STANDARD_LAMP_HEIGHT_M),
  armLength: z.number().min(0.3).max(3).default(1.2),
  poleColor: z.string().default('#30343b'),
  lightOn: z.boolean().default(false),
  lightColor: z.string().default('#ffd9a3'),
  intensity: z.number().min(0).max(5000).default(1200),
})

export type StreetLightNode = z.infer<typeof StreetLightNode>

/** A pedestrian-scale pole with a centered, downward-facing post-top luminaire. */
export const PedestrianPostLightNode = BaseNode.extend({
  id: objectId('pedestrian-post-light'),
  type: nodeType('environment:pedestrian-post-light'),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  height: z.number().min(STANDARD_LAMP_HEIGHT_MIN_M).max(STANDARD_LAMP_HEIGHT_MAX_M).default(STANDARD_LAMP_HEIGHT_M),
  poleColor: z.string().default('#30343b'),
  lightOn: z.boolean().default(false),
  lightColor: z.string().default('#ffd9a3'),
  intensity: z.number().min(0).max(3000).default(650),
})

export type PedestrianPostLightNode = z.infer<typeof PedestrianPostLightNode>

/** A heritage pole with a curved Bishop's Crook arm and pendant teardrop lamp. */
export const HeritageCrookLightNode = BaseNode.extend({
  id: objectId('heritage-crook-light'),
  type: nodeType('environment:heritage-crook-light'),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  height: z.number().min(STANDARD_LAMP_HEIGHT_MIN_M).max(STANDARD_LAMP_HEIGHT_MAX_M).default(STANDARD_LAMP_HEIGHT_M),
  armReach: z.number().min(0.5).max(1.5).default(0.9),
  poleColor: z.string().default('#24272b'),
  lightOn: z.boolean().default(false),
  lightColor: z.string().default('#ffd5a0'),
  intensity: z.number().min(0).max(3500).default(750),
})

export type HeritageCrookLightNode = z.infer<typeof HeritageCrookLightNode>

/** A classic straight mast-arm roadway pole with a broad cobra-head luminaire. */
export const CobraHeadLightNode = BaseNode.extend({
  id: objectId('cobra-head-light'),
  type: nodeType('environment:cobra-head-light'),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  height: z.number().min(STANDARD_LAMP_HEIGHT_MIN_M).max(STANDARD_LAMP_HEIGHT_MAX_M).default(STANDARD_LAMP_HEIGHT_M),
  armLength: z.number().min(0.5).max(3).default(1.25),
  poleColor: z.string().default('#363b40'),
  lightOn: z.boolean().default(false),
  lightColor: z.string().default('#ffd39a'),
  intensity: z.number().min(0).max(5000).default(1400),
})

export type CobraHeadLightNode = z.infer<typeof CobraHeadLightNode>

/** A median pole carrying opposing cobra-head roadway fixtures. */
export const TwinArmMedianLightNode = BaseNode.extend({
  id: objectId('twin-arm-median-light'),
  type: nodeType('environment:twin-arm-median-light'),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  height: z.number().min(STANDARD_LAMP_HEIGHT_MIN_M).max(STANDARD_LAMP_HEIGHT_MAX_M).default(STANDARD_LAMP_HEIGHT_M),
  armLength: z.number().min(0.5).max(3).default(1.35),
  poleColor: z.string().default('#363b40'),
  lightOn: z.boolean().default(false),
  lightColor: z.string().default('#ffd39a'),
  intensity: z.number().min(0).max(5000).default(1400),
})

export type TwinArmMedianLightNode = z.infer<typeof TwinArmMedianLightNode>

/** A junction or parking-area pole with three or four radial roadway heads. */
export const MultiHeadAreaLightNode = BaseNode.extend({
  id: objectId('multi-head-area-light'),
  type: nodeType('environment:multi-head-area-light'),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  height: z.number().min(STANDARD_LAMP_HEIGHT_MIN_M).max(STANDARD_LAMP_HEIGHT_MAX_M).default(STANDARD_LAMP_HEIGHT_M),
  armLength: z.number().min(0.5).max(3).default(1.2),
  headCount: z.union([z.literal(3), z.literal(4)]).default(4),
  poleColor: z.string().default('#363b40'),
  lightOn: z.boolean().default(false),
  lightColor: z.string().default('#ffd39a'),
  intensity: z.number().min(0).max(5000).default(1200),
})

export type MultiHeadAreaLightNode = z.infer<typeof MultiHeadAreaLightNode>

/** A cobra-head roadway lamp carried on a visibly braced truss outreach. */
export const TrussRoadwayLightNode = BaseNode.extend({
  id: objectId('truss-roadway-light'),
  type: nodeType('environment:truss-roadway-light'),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  height: z.number().min(STANDARD_LAMP_HEIGHT_MIN_M).max(STANDARD_LAMP_HEIGHT_MAX_M).default(STANDARD_LAMP_HEIGHT_M),
  armLength: z.number().min(0.8).max(3.5).default(1.6),
  braceDepth: z.number().min(0.35).max(1.2).default(0.7),
  poleColor: z.string().default('#363b40'),
  lightOn: z.boolean().default(false),
  lightColor: z.string().default('#ffd39a'),
  intensity: z.number().min(0).max(5000).default(1400),
})

export type TrussRoadwayLightNode = z.infer<typeof TrussRoadwayLightNode>

/** High-mast crown lighting for large roads, yards, and interchange areas. */
export const HighMastCrownLightNode = BaseNode.extend({
  id: objectId('high-mast-crown-light'),
  type: nodeType('environment:high-mast-crown-light'),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  height: z.number().min(STANDARD_LAMP_HEIGHT_MIN_M).max(STANDARD_LAMP_HEIGHT_MAX_M).default(STANDARD_LAMP_HEIGHT_M),
  armLength: z.number().min(0.6).max(3).default(1.4),
  visualStyle: z.string().default('high-mast'),
  poleColor: z.string().default('#343a40'),
  lightOn: z.boolean().default(false),
  lightColor: z.string().default('#ffd39a'),
  intensity: z.number().min(0).max(10000).default(3800),
})

export type HighMastCrownLightNode = z.infer<typeof HighMastCrownLightNode>

/** Parking-area pole carrying broad rectangular shoebox luminaires. */
export const ShoeboxAreaLightNode = BaseNode.extend({
  id: objectId('shoebox-area-light'),
  type: nodeType('environment:shoebox-area-light'),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  height: z.number().min(STANDARD_LAMP_HEIGHT_MIN_M).max(STANDARD_LAMP_HEIGHT_MAX_M).default(STANDARD_LAMP_HEIGHT_M),
  armLength: z.number().min(0.6).max(3.5).default(1.5),
  visualStyle: z.string().default('shoebox'),
  poleColor: z.string().default('#363b40'),
  lightOn: z.boolean().default(false),
  lightColor: z.string().default('#ffd39a'),
  intensity: z.number().min(0).max(10000).default(2200),
})

export type ShoeboxAreaLightNode = z.infer<typeof ShoeboxAreaLightNode>

/** Projector/floodlight pole with a tilted rectangular floodlight head. */
export const FloodlightPoleNode = BaseNode.extend({
  id: objectId('floodlight-pole'),
  type: nodeType('environment:floodlight-pole'),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  height: z.number().min(STANDARD_LAMP_HEIGHT_MIN_M).max(STANDARD_LAMP_HEIGHT_MAX_M).default(STANDARD_LAMP_HEIGHT_M),
  armLength: z.number().min(0.4).max(2.5).default(0.9),
  visualStyle: z.string().default('floodlight'),
  poleColor: z.string().default('#343a40'),
  lightOn: z.boolean().default(false),
  lightColor: z.string().default('#fff0c2'),
  intensity: z.number().min(0).max(12000).default(2800),
})

export type FloodlightPoleNode = z.infer<typeof FloodlightPoleNode>

/** Traditional post-top lantern with a pitched cap and transparent panes. */
export const TraditionalPostTopLanternNode = BaseNode.extend({
  id: objectId('traditional-post-top-lantern'),
  type: nodeType('environment:traditional-post-top-lantern'),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  height: z.number().min(STANDARD_LAMP_HEIGHT_MIN_M).max(STANDARD_LAMP_HEIGHT_MAX_M).default(STANDARD_LAMP_HEIGHT_M),
  armLength: z.number().min(0.4).max(1.4).default(0.7),
  visualStyle: z.string().default('lantern'),
  poleColor: z.string().default('#25282d'),
  lightOn: z.boolean().default(false),
  lightColor: z.string().default('#ffd9a3'),
  intensity: z.number().min(0).max(3500).default(650),
})

export type TraditionalPostTopLanternNode = z.infer<typeof TraditionalPostTopLanternNode>

/** Globe/acorn post-top lamp for parks and civic streets. */
export const GlobePostTopLightNode = BaseNode.extend({
  id: objectId('globe-post-top-light'),
  type: nodeType('environment:globe-post-top-light'),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  height: z.number().min(STANDARD_LAMP_HEIGHT_MIN_M).max(STANDARD_LAMP_HEIGHT_MAX_M).default(STANDARD_LAMP_HEIGHT_M),
  armLength: z.number().min(0.3).max(1).default(0.55),
  visualStyle: z.string().default('globe'),
  poleColor: z.string().default('#30343b'),
  lightOn: z.boolean().default(false),
  lightColor: z.string().default('#ffe0ad'),
  intensity: z.number().min(0).max(3000).default(520),
})

export type GlobePostTopLightNode = z.infer<typeof GlobePostTopLightNode>

/** Decorative three-arm candelabra with matching pendant lanterns. */
export const DecorativeCandelabraLightNode = BaseNode.extend({
  id: objectId('decorative-candelabra-light'),
  type: nodeType('environment:decorative-candelabra-light'),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  height: z.number().min(STANDARD_LAMP_HEIGHT_MIN_M).max(STANDARD_LAMP_HEIGHT_MAX_M).default(STANDARD_LAMP_HEIGHT_M),
  armLength: z.number().min(0.5).max(2).default(1.15),
  visualStyle: z.string().default('candelabra'),
  poleColor: z.string().default('#25282d'),
  lightOn: z.boolean().default(false),
  lightColor: z.string().default('#ffd5a0'),
  intensity: z.number().min(0).max(6000).default(1100),
})

export type DecorativeCandelabraLightNode = z.infer<typeof DecorativeCandelabraLightNode>

/** Short path/garden light with a compact downward-facing hood. */
export const PathGardenLightNode = BaseNode.extend({
  id: objectId('path-garden-light'),
  type: nodeType('environment:path-garden-light'),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  height: z.number().min(STANDARD_LAMP_HEIGHT_MIN_M).max(STANDARD_LAMP_HEIGHT_MAX_M).default(STANDARD_LAMP_HEIGHT_M),
  armLength: z.number().min(0.2).max(0.8).default(0.35),
  visualStyle: z.string().default('path'),
  poleColor: z.string().default('#3e4644'),
  lightOn: z.boolean().default(false),
  lightColor: z.string().default('#ffe0b2'),
  intensity: z.number().min(0).max(1200).default(240),
})

export type PathGardenLightNode = z.infer<typeof PathGardenLightNode>

/** Low bollard light for pedestrian paths, plazas, and planting beds. */
export const BollardLightNode = BaseNode.extend({
  id: objectId('bollard-light'),
  type: nodeType('environment:bollard-light'),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  height: z.number().min(STANDARD_LAMP_HEIGHT_MIN_M).max(STANDARD_LAMP_HEIGHT_MAX_M).default(STANDARD_LAMP_HEIGHT_M),
  armLength: z.number().min(0.15).max(0.5).default(0.25),
  visualStyle: z.string().default('bollard'),
  poleColor: z.string().default('#343a40'),
  lightOn: z.boolean().default(false),
  lightColor: z.string().default('#ffe2b8'),
  intensity: z.number().min(0).max(1000).default(180),
})

export type BollardLightNode = z.infer<typeof BollardLightNode>

/** Suspended/catenary street lamp hung between two overhead anchor points. */
export const CatenaryStreetLightNode = BaseNode.extend({
  id: objectId('catenary-street-light'),
  type: nodeType('environment:catenary-street-light'),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  height: z.number().min(STANDARD_LAMP_HEIGHT_MIN_M).max(STANDARD_LAMP_HEIGHT_MAX_M).default(STANDARD_LAMP_HEIGHT_M),
  armLength: z.number().min(2).max(12).default(6),
  visualStyle: z.string().default('catenary'),
  poleColor: z.string().default('#363b40'),
  lightOn: z.boolean().default(false),
  lightColor: z.string().default('#ffd39a'),
  intensity: z.number().min(0).max(5000).default(1300),
})

export type CatenaryStreetLightNode = z.infer<typeof CatenaryStreetLightNode>

/** Wall-mounted outreach arm with a roadway luminaire. */
export const WallArmLightNode = BaseNode.extend({
  id: objectId('wall-arm-light'),
  type: nodeType('environment:wall-arm-light'),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  height: z.number().min(STANDARD_LAMP_HEIGHT_MIN_M).max(STANDARD_LAMP_HEIGHT_MAX_M).default(STANDARD_LAMP_HEIGHT_M),
  armLength: z.number().min(0.5).max(3).default(1.4),
  visualStyle: z.string().default('wall-arm'),
  poleColor: z.string().default('#363b40'),
  lightOn: z.boolean().default(false),
  lightColor: z.string().default('#ffd39a'),
  intensity: z.number().min(0).max(5000).default(1100),
})

export type WallArmLightNode = z.infer<typeof WallArmLightNode>

/** Compact wall-pack/bulkhead luminaire mounted directly to a facade. */
export const WallPackLightNode = BaseNode.extend({
  id: objectId('wall-pack-light'),
  type: nodeType('environment:wall-pack-light'),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  height: z.number().min(STANDARD_LAMP_HEIGHT_MIN_M).max(STANDARD_LAMP_HEIGHT_MAX_M).default(STANDARD_LAMP_HEIGHT_M),
  armLength: z.number().min(0.2).max(0.8).default(0.35),
  visualStyle: z.string().default('wall-pack'),
  poleColor: z.string().default('#454b50'),
  lightOn: z.boolean().default(false),
  lightColor: z.string().default('#fff0c2'),
  intensity: z.number().min(0).max(3000).default(700),
})

export type WallPackLightNode = z.infer<typeof WallPackLightNode>

/** Linear tunnel/underpass luminaire mounted to an overhead soffit. */
export const TunnelLuminaireNode = BaseNode.extend({
  id: objectId('tunnel-luminaire'),
  type: nodeType('environment:tunnel-luminaire'),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  height: z.number().min(STANDARD_LAMP_HEIGHT_MIN_M).max(STANDARD_LAMP_HEIGHT_MAX_M).default(STANDARD_LAMP_HEIGHT_M),
  armLength: z.number().min(0.8).max(4).default(2.2),
  visualStyle: z.string().default('tunnel'),
  poleColor: z.string().default('#4a5156'),
  lightOn: z.boolean().default(false),
  lightColor: z.string().default('#e9f2ff'),
  intensity: z.number().min(0).max(7000).default(1800),
})

export type TunnelLuminaireNode = z.infer<typeof TunnelLuminaireNode>

/** Recessed canopy/soffit fixture with a broad downward lens. */
export const CanopySoffitLightNode = BaseNode.extend({
  id: objectId('canopy-soffit-light'),
  type: nodeType('environment:canopy-soffit-light'),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  height: z.number().min(STANDARD_LAMP_HEIGHT_MIN_M).max(STANDARD_LAMP_HEIGHT_MAX_M).default(STANDARD_LAMP_HEIGHT_M),
  armLength: z.number().min(0.4).max(2.5).default(1),
  visualStyle: z.string().default('canopy'),
  poleColor: z.string().default('#596168'),
  lightOn: z.boolean().default(false),
  lightColor: z.string().default('#fff3d2'),
  intensity: z.number().min(0).max(5000).default(1200),
})

export type CanopySoffitLightNode = z.infer<typeof CanopySoffitLightNode>

/** Solar street lamp combining a photovoltaic panel and a cobra-head fixture. */
export const SolarStreetLightNode = BaseNode.extend({
  id: objectId('solar-street-light'),
  type: nodeType('environment:solar-street-light'),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  height: z.number().min(STANDARD_LAMP_HEIGHT_MIN_M).max(STANDARD_LAMP_HEIGHT_MAX_M).default(STANDARD_LAMP_HEIGHT_M),
  armLength: z.number().min(0.5).max(3).default(1.3),
  visualStyle: z.string().default('solar'),
  poleColor: z.string().default('#3c4348'),
  lightOn: z.boolean().default(false),
  lightColor: z.string().default('#ffd39a'),
  intensity: z.number().min(0).max(5000).default(1000),
})

export type SolarStreetLightNode = z.infer<typeof SolarStreetLightNode>

export const UtilityPoleAssembly = z.enum(['tangent', 'small-angle', 'junction', 'dead-end'])
export type UtilityPoleAssembly = z.infer<typeof UtilityPoleAssembly>

/** A wood, three-phase distribution pole with a lower neutral and optional transformer. */
export const UtilityPoleNode = BaseNode.extend({
  id: objectId('utility-pole'),
  type: nodeType('environment:utility-pole'),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  height: z.number().min(7.62).max(15.85).default(STANDARD_UTILITY_POLE_EXPOSED_HEIGHT_M),
  crossarmLength: z
    .number()
    .min(STANDARD_UTILITY_POLE_CROSSARM_LENGTH_M)
    .max(3.66)
    .default(STANDARD_UTILITY_POLE_CROSSARM_LENGTH_M),
  assembly: UtilityPoleAssembly.default('tangent'),
  woodColor: z.string().default('#765033'),
  transformerMounted: z.boolean().default(true),
  transformerColor: z.string().default('#66716d'),
})

export type UtilityPoleNode = z.infer<typeof UtilityPoleNode>

/** An automatically managed three-primary-plus-neutral span between two utility poles. */
export const UtilityWireSpanNode = BaseNode.extend({
  id: objectId('utility-wire-span'),
  type: nodeType('environment:utility-wire-span'),
  fromPoleId: z.string().min(1),
  toPoleId: z.string().min(1),
  conductorColor: z.string().default('#25292b'),
  sagRatio: z.number().min(0.01).max(0.08).default(0.035),
})

export type UtilityWireSpanNode = z.infer<typeof UtilityWireSpanNode>
