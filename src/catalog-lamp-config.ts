import {
  BollardLightNode,
  CanopySoffitLightNode,
  CatenaryStreetLightNode,
  DecorativeCandelabraLightNode,
  FloodlightPoleNode,
  GlobePostTopLightNode,
  HighMastCrownLightNode,
  PathGardenLightNode,
  ShoeboxAreaLightNode,
  SolarStreetLightNode,
  TraditionalPostTopLanternNode,
  TunnelLuminaireNode,
  WallArmLightNode,
  WallPackLightNode,
} from './schema'
import {
  STANDARD_LAMP_HEIGHT_M,
  STANDARD_LAMP_HEIGHT_MAX_M,
  STANDARD_LAMP_HEIGHT_MIN_M,
} from './lamp-constants'
import { BOLLARD_LIGHT_DIMENSIONS } from './bollard-light-geometry'
import { WALL_ARM_LIGHT_DIMENSIONS } from './wall-arm-light-geometry'

const SHARED_HEIGHT = [
  STANDARD_LAMP_HEIGHT_MIN_M,
  STANDARD_LAMP_HEIGHT_MAX_M,
  STANDARD_LAMP_HEIGHT_M,
] as const

export const CATALOG_LAMP_VARIANTS = [
  {
    kind: 'streetscape:high-mast-crown-light',
    label: 'High-mast lowering crown',
    description: 'Tapered high mast with a serviceable carrier ring and six outward-aimed LED luminaires.',
    family: 'roadway',
    schema: HighMastCrownLightNode,
    height: [STANDARD_LAMP_HEIGHT_MIN_M, STANDARD_LAMP_HEIGHT_MAX_M, 18],
    arm: [0.9, 3, 1.8],
    projection: 'high-mast',
  },
  {
    kind: 'streetscape:shoebox-area-light',
    label: 'LED area pole',
    description: 'Single-sided parking-area pole with one low-profile multi-cell LED luminaire.',
    family: 'roadway',
    schema: ShoeboxAreaLightNode,
    height: SHARED_HEIGHT,
    arm: [0.35, 2.5, 0.65],
    projection: 'shoebox',
  },
  {
    kind: 'streetscape:floodlight-pole',
    label: 'Floodlight pole',
    description: 'Braced pole with an adjustable yoke-mounted LED projector for sports, yards, and façades.',
    family: 'roadway',
    schema: FloodlightPoleNode,
    height: SHARED_HEIGHT,
    arm: [0.4, 2.5, 0.9],
    projection: 'floodlight',
  },
  {
    kind: 'streetscape:solar-street-light',
    label: 'Solar street light',
    description: 'Single-sided solar roadway pole with one all-in-one PV, battery, control, and LED head.',
    family: 'roadway',
    schema: SolarStreetLightNode,
    height: SHARED_HEIGHT,
    arm: [0.5, 3, 1.3],
    projection: 'solar',
  },
  {
    kind: 'streetscape:traditional-post-top-lantern',
    label: 'Traditional lantern',
    description: 'Pitched-roof post-top lantern for heritage streetscapes.',
    family: 'pedestrian',
    schema: TraditionalPostTopLanternNode,
    height: SHARED_HEIGHT,
    arm: [0.4, 1.4, 0.7],
    projection: 'lantern',
  },
  {
    kind: 'streetscape:globe-post-top-light',
    label: 'Globe / acorn',
    description: 'Traditional prismatic acorn post-top lamp for parks, campuses, and civic paths.',
    family: 'pedestrian',
    schema: GlobePostTopLightNode,
    height: SHARED_HEIGHT,
    arm: [0.3, 1, 0.55],
    projection: 'globe',
  },
  {
    kind: 'streetscape:decorative-candelabra-light',
    label: 'Decorative candelabra',
    description: 'Three-light heritage lamp with cast scroll arms for plazas and promenades.',
    family: 'pedestrian',
    schema: DecorativeCandelabraLightNode,
    height: SHARED_HEIGHT,
    arm: [0.5, 2, 1.15],
    projection: 'candelabra',
  },
  {
    kind: 'streetscape:path-garden-light',
    label: 'Path / garden',
    description: 'Professional twin-head path light with opposed warm pools for walkways and planting beds.',
    family: 'pedestrian',
    schema: PathGardenLightNode,
    height: [0.55, 1.05, 0.78],
    arm: [0.32, 0.65, 0.46],
    projection: 'path',
  },
  {
    kind: 'streetscape:bollard-light',
    label: 'Bollard',
    description: 'Shielded architectural bollard with a louvered 360-degree optic for paths and plazas.',
    family: 'pedestrian',
    schema: BollardLightNode,
    height: [
      BOLLARD_LIGHT_DIMENSIONS.minHeight,
      BOLLARD_LIGHT_DIMENSIONS.maxHeight,
      BOLLARD_LIGHT_DIMENSIONS.defaultHeight,
    ],
    arm: [0.15, 0.5, 0.25],
    projection: 'bollard',
  },
  {
    kind: 'streetscape:catenary-street-light',
    label: 'Catenary / suspended',
    description: 'Aerodynamic twin-optic roadway luminaire with a serviceable cable saddle and tapered support poles.',
    family: 'structure',
    schema: CatenaryStreetLightNode,
    height: SHARED_HEIGHT,
    arm: [2, 12, 6],
    projection: 'catenary',
  },
  {
    kind: 'streetscape:wall-arm-light',
    label: 'Architectural wall-arm',
    description: 'Tapered facade bracket with a curved lower tie and low-profile LED roadway head.',
    family: 'structure',
    schema: WallArmLightNode,
    height: SHARED_HEIGHT,
    arm: [0.5, 3, WALL_ARM_LIGHT_DIMENSIONS.defaultArmLength],
    projection: 'wall-arm',
  },
  {
    kind: 'streetscape:wall-pack-light',
    label: 'Wall-pack / bulkhead',
    description: 'Full-cutoff architectural LED wall pack with a shielded downward optic.',
    family: 'structure',
    schema: WallPackLightNode,
    height: [1.8, 6, 2.7],
    arm: [0.22, 0.38, 0.3],
    projection: 'wall-pack',
  },
  {
    kind: 'streetscape:tunnel-luminaire',
    label: 'Tunnel / underpass',
    description: 'Sealed continuous-line LED fixture with clip mounts and dual optics.',
    family: 'structure',
    schema: TunnelLuminaireNode,
    height: SHARED_HEIGHT,
    arm: [0.8, 4, 2.2],
    projection: 'tunnel',
  },
  {
    kind: 'streetscape:canopy-soffit-light',
    label: 'Canopy / soffit',
    description: 'Compact ceiling-hosted canopy light with twin glare-controlled optical modules.',
    family: 'structure',
    schema: CanopySoffitLightNode,
    height: SHARED_HEIGHT,
    arm: [0.34, 0.62, 0.42],
    projection: 'canopy',
  },
] as const

/**
 * Catalog-level merges: these silhouettes share a support/head language and
 * are intentionally represented by one configurable visual family.
 */
export const LAMP_VISUAL_FAMILIES = [
  {
    id: 'roadway-head',
    label: 'Roadway and area heads',
    kinds: [
      'streetscape:street-light',
      'streetscape:cobra-head-light',
      'streetscape:twin-arm-median-light',
      'streetscape:multi-head-area-light',
      'streetscape:truss-roadway-light',
      'streetscape:high-mast-crown-light',
      'streetscape:shoebox-area-light',
      'streetscape:floodlight-pole',
      'streetscape:solar-street-light',
    ],
  },
  {
    id: 'post-top',
    label: 'Post-top and civic heads',
    kinds: [
      'streetscape:pedestrian-post-light',
      'streetscape:traditional-post-top-lantern',
      'streetscape:globe-post-top-light',
      'streetscape:heritage-crook-light',
      'streetscape:decorative-candelabra-light',
    ],
  },
  {
    id: 'path-scale',
    label: 'Path and low-scale lights',
    kinds: ['streetscape:path-garden-light', 'streetscape:bollard-light'],
  },
  {
    id: 'structure-mounted',
    label: 'Structure-mounted lights',
    kinds: [
      'streetscape:catenary-street-light',
      'streetscape:wall-arm-light',
      'streetscape:wall-pack-light',
      'streetscape:tunnel-luminaire',
      'streetscape:canopy-soffit-light',
    ],
  },
] as const

export type CatalogLampVariant = (typeof CATALOG_LAMP_VARIANTS)[number]
export type CatalogLampKind = CatalogLampVariant['kind']
export type CatalogLampProjection = CatalogLampVariant['projection']
export type CatalogLampFamily = CatalogLampVariant['family']

export type CatalogLampStyleOption = {
  value: CatalogLampProjection
  label: string
}

/** Related silhouettes that can be swapped from one shared placement brush. */
export const CATALOG_LAMP_STYLE_OPTIONS: Record<CatalogLampFamily, readonly CatalogLampStyleOption[]> = {
  roadway: [
    { value: 'high-mast', label: 'High mast' },
    { value: 'shoebox', label: 'Shoebox' },
    { value: 'floodlight', label: 'Floodlight' },
    { value: 'solar', label: 'Solar' },
  ],
  pedestrian: [
    { value: 'lantern', label: 'Lantern' },
    { value: 'globe', label: 'Globe' },
    { value: 'candelabra', label: 'Candelabra' },
    { value: 'path', label: 'Path' },
    { value: 'bollard', label: 'Bollard' },
  ],
  structure: [
    { value: 'catenary', label: 'Catenary' },
    { value: 'wall-arm', label: 'Wall arm' },
    { value: 'wall-pack', label: 'Wall pack' },
    { value: 'tunnel', label: 'Tunnel' },
    { value: 'canopy', label: 'Canopy' },
  ],
}
export type CatalogLampNode =
  | HighMastCrownLightNode
  | ShoeboxAreaLightNode
  | FloodlightPoleNode
  | TraditionalPostTopLanternNode
  | GlobePostTopLightNode
  | DecorativeCandelabraLightNode
  | PathGardenLightNode
  | BollardLightNode
  | CatenaryStreetLightNode
  | WallArmLightNode
  | WallPackLightNode
  | TunnelLuminaireNode
  | CanopySoffitLightNode
  | SolarStreetLightNode

export const CATALOG_LAMP_CONFIG_BY_KIND = Object.fromEntries(
  CATALOG_LAMP_VARIANTS.map((variant) => [variant.kind, variant]),
) as Record<CatalogLampKind, CatalogLampVariant>

export function isCatalogLampKind(kind: string): kind is CatalogLampKind {
  return kind in CATALOG_LAMP_CONFIG_BY_KIND
}

export function getCatalogLampConfig(kind: string): CatalogLampVariant | undefined {
  return isCatalogLampKind(kind) ? CATALOG_LAMP_CONFIG_BY_KIND[kind] : undefined
}

export function getCatalogLampStyleOptions(kind: string): readonly CatalogLampStyleOption[] {
  const config = getCatalogLampConfig(kind)
  return config ? CATALOG_LAMP_STYLE_OPTIONS[config.family] : []
}

export function resolveCatalogLampProjection(kind: string, visualStyle?: string): CatalogLampProjection | undefined {
  const config = getCatalogLampConfig(kind)
  if (!config) return undefined
  return visualStyle && getCatalogLampStyleOptions(kind).some((option) => option.value === visualStyle)
    ? visualStyle as CatalogLampProjection
    : config.projection
}

export function parseCatalogLamp(kind: CatalogLampKind, input: unknown = {}): CatalogLampNode {
  return CATALOG_LAMP_CONFIG_BY_KIND[kind].schema.parse(input) as CatalogLampNode
}
