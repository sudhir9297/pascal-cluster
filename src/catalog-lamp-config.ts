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

const SHARED_HEIGHT = [
  STANDARD_LAMP_HEIGHT_MIN_M,
  STANDARD_LAMP_HEIGHT_MAX_M,
  STANDARD_LAMP_HEIGHT_M,
] as const

export const CATALOG_LAMP_VARIANTS = [
  {
    kind: 'environment:high-mast-crown-light',
    label: 'High-mast crown',
    description: 'Tall crown of radial floodlights for interchanges and yards.',
    family: 'roadway',
    schema: HighMastCrownLightNode,
    height: SHARED_HEIGHT,
    arm: [0.6, 3, 1.4],
    projection: 'high-mast',
  },
  {
    kind: 'environment:shoebox-area-light',
    label: 'Shoebox area',
    description: 'Broad rectangular parking-lot luminaire on an area pole.',
    family: 'roadway',
    schema: ShoeboxAreaLightNode,
    height: SHARED_HEIGHT,
    arm: [0.6, 3.5, 1.5],
    projection: 'shoebox',
  },
  {
    kind: 'environment:floodlight-pole',
    label: 'Floodlight pole',
    description: 'Tilted projector head for sports, yards, and façades.',
    family: 'roadway',
    schema: FloodlightPoleNode,
    height: SHARED_HEIGHT,
    arm: [0.4, 2.5, 0.9],
    projection: 'floodlight',
  },
  {
    kind: 'environment:solar-street-light',
    label: 'Solar street light',
    description: 'Standalone roadway lamp with an angled photovoltaic panel.',
    family: 'roadway',
    schema: SolarStreetLightNode,
    height: SHARED_HEIGHT,
    arm: [0.5, 3, 1.3],
    projection: 'solar',
  },
  {
    kind: 'environment:traditional-post-top-lantern',
    label: 'Traditional lantern',
    description: 'Pitched-roof post-top lantern for heritage streetscapes.',
    family: 'pedestrian',
    schema: TraditionalPostTopLanternNode,
    height: SHARED_HEIGHT,
    arm: [0.4, 1.4, 0.7],
    projection: 'lantern',
  },
  {
    kind: 'environment:globe-post-top-light',
    label: 'Globe / acorn',
    description: 'Globe or acorn post-top lamp for parks and civic paths.',
    family: 'pedestrian',
    schema: GlobePostTopLightNode,
    height: SHARED_HEIGHT,
    arm: [0.3, 1, 0.55],
    projection: 'globe',
  },
  {
    kind: 'environment:decorative-candelabra-light',
    label: 'Decorative candelabra',
    description: 'Three-arm ornamental lamp for plazas and promenades.',
    family: 'pedestrian',
    schema: DecorativeCandelabraLightNode,
    height: SHARED_HEIGHT,
    arm: [0.5, 2, 1.15],
    projection: 'candelabra',
  },
  {
    kind: 'environment:path-garden-light',
    label: 'Path / garden',
    description: 'Compact hooded path light for planting beds and walkways.',
    family: 'pedestrian',
    schema: PathGardenLightNode,
    height: SHARED_HEIGHT,
    arm: [0.2, 0.8, 0.35],
    projection: 'path',
  },
  {
    kind: 'environment:bollard-light',
    label: 'Bollard',
    description: 'Low cylindrical marker light for paths and plazas.',
    family: 'pedestrian',
    schema: BollardLightNode,
    height: SHARED_HEIGHT,
    arm: [0.15, 0.5, 0.25],
    projection: 'bollard',
  },
  {
    kind: 'environment:catenary-street-light',
    label: 'Catenary / suspended',
    description: 'Street luminaire suspended from an overhead catenary span.',
    family: 'structure',
    schema: CatenaryStreetLightNode,
    height: SHARED_HEIGHT,
    arm: [2, 12, 6],
    projection: 'catenary',
  },
  {
    kind: 'environment:wall-arm-light',
    label: 'Wall-arm',
    description: 'Facade-mounted outreach arm with roadway luminaire.',
    family: 'structure',
    schema: WallArmLightNode,
    height: SHARED_HEIGHT,
    arm: [0.5, 3, 1.4],
    projection: 'wall-arm',
  },
  {
    kind: 'environment:wall-pack-light',
    label: 'Wall-pack / bulkhead',
    description: 'Compact direct-mount exterior wall luminaire.',
    family: 'structure',
    schema: WallPackLightNode,
    height: SHARED_HEIGHT,
    arm: [0.2, 0.8, 0.35],
    projection: 'wall-pack',
  },
  {
    kind: 'environment:tunnel-luminaire',
    label: 'Tunnel / underpass',
    description: 'Linear fixture for tunnel and underpass soffits.',
    family: 'structure',
    schema: TunnelLuminaireNode,
    height: SHARED_HEIGHT,
    arm: [0.8, 4, 2.2],
    projection: 'tunnel',
  },
  {
    kind: 'environment:canopy-soffit-light',
    label: 'Canopy / soffit',
    description: 'Recessed broad-beam fixture under a canopy or soffit.',
    family: 'structure',
    schema: CanopySoffitLightNode,
    height: SHARED_HEIGHT,
    arm: [0.4, 2.5, 1],
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
      'environment:street-light',
      'environment:cobra-head-light',
      'environment:twin-arm-median-light',
      'environment:multi-head-area-light',
      'environment:truss-roadway-light',
      'environment:high-mast-crown-light',
      'environment:shoebox-area-light',
      'environment:floodlight-pole',
      'environment:solar-street-light',
    ],
  },
  {
    id: 'post-top',
    label: 'Post-top and civic heads',
    kinds: [
      'environment:pedestrian-post-light',
      'environment:traditional-post-top-lantern',
      'environment:globe-post-top-light',
      'environment:heritage-crook-light',
      'environment:decorative-candelabra-light',
    ],
  },
  {
    id: 'path-scale',
    label: 'Path and low-scale lights',
    kinds: ['environment:path-garden-light', 'environment:bollard-light'],
  },
  {
    id: 'structure-mounted',
    label: 'Structure-mounted lights',
    kinds: [
      'environment:catenary-street-light',
      'environment:wall-arm-light',
      'environment:wall-pack-light',
      'environment:tunnel-luminaire',
      'environment:canopy-soffit-light',
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
