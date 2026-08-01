import { buildCatalogLampFloorplan } from './catalog-lamp-floorplan'
import { getCatalogLampConfig, type CatalogLampVariant } from './catalog-lamp-config'
import { catalogLampParametrics } from './catalog-lamp-parametrics'

type GenericDefinition = Record<string, any>

const heightHandle = {
  kind: 'linear-resize',
  axis: 'y',
  anchor: 'min',
  min: 0.08,
  currentValue: (node: any) => node.height,
  apply: (initial: any, height: number) => {
    const bounds = getCatalogLampConfig(initial.type)?.height ?? [0.1, 20, 4]
    return { height: Math.max(bounds[0], Math.min(bounds[1], height)) }
  },
  placement: { position: (node: any) => [0, node.height + 0.2, 0] },
}

const armHandle = {
  kind: 'linear-resize',
  axis: 'x',
  anchor: 'min',
  min: 0.15,
  currentValue: (node: any) => node.armLength,
  apply: (initial: any, armLength: number) => {
    const bounds = getCatalogLampConfig(initial.type)?.arm ?? [0.2, 3, 1]
    return { armLength: Math.max(bounds[0], Math.min(bounds[1], armLength)) }
  },
  placement: { position: (node: any) => [node.armLength + 0.35, node.height - 0.3, 0] },
}

const rotateHandle = {
  kind: 'arc-resize',
  axis: 'angular',
  shape: 'rotate',
  apply: (initial: any, delta: number) => {
    const rotation = initial.rotation ?? [0, 0, 0]
    return { rotation: [rotation[0], rotation[1] - delta, rotation[2]] }
  },
  placement: { position: () => [0.35, 0.2, 0.35], rotationY: () => -Math.PI / 4 },
  decoration: { kind: 'ring', radius: () => 0.5, y: () => 0.2 },
}

export function makeCatalogLampDefinition(variant: CatalogLampVariant): GenericDefinition {
  return {
    kind: variant.kind,
    schemaVersion: 1,
    schema: variant.schema,
    category: 'furnish',
    snapProfile: 'item',
    defaults: () => {
      const parsedDefaults = variant.schema.parse({}) as Record<string, unknown>
      const { id: _id, ...defaults } = parsedDefaults
      return defaults
    },
    capabilities: {
      movable: { axes: ['x', 'z'], gridSnap: true },
      rotatable: { axes: ['y'], snapAngles: Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4) },
      selectable: { hitVolume: 'bbox' },
      duplicable: true,
      deletable: true,
      groupable: true,
      snappable: {},
      floorPlaced: {
        footprint: (node: any) => ({
          dimensions: [Math.max(0.4, node.armLength ?? 1), Math.max(0.1, node.height ?? 1), Math.max(0.4, node.armLength ?? 1)],
          rotation: node.rotation,
        }),
        collides: false,
      },
    },
    parametrics: catalogLampParametrics,
    floorplan: buildCatalogLampFloorplan,
    handles: [heightHandle, armHandle, rotateHandle],
    renderer: { kind: 'parametric', module: () => import('./catalog-lamp-renderer') },
    preview: () => import('./catalog-lamp-preview'),
    tool: () => import('./catalog-lamp-tool'),
    toolHints: [
      { key: 'Left click', label: `Place ${variant.label.toLowerCase()}` },
      { key: 'Esc', label: 'Stop' },
    ],
    presentation: {
      label: variant.label,
      description: variant.description,
      icon: { kind: 'iconify', name: 'lucide:lamp-ceiling' },
      paletteSection: 'furnish',
      hidden: true,
    },
    mcp: {
      description: `${variant.description} Adjustable height, reach, colors, intensity, orientation, and on/off state.`,
    },
  }
}

export const highMastCrownLightDefinition = makeCatalogLampDefinition(getCatalogLampConfig('environment:high-mast-crown-light')!)
export const shoeboxAreaLightDefinition = makeCatalogLampDefinition(getCatalogLampConfig('environment:shoebox-area-light')!)
export const floodlightPoleDefinition = makeCatalogLampDefinition(getCatalogLampConfig('environment:floodlight-pole')!)
export const traditionalPostTopLanternDefinition = makeCatalogLampDefinition(getCatalogLampConfig('environment:traditional-post-top-lantern')!)
export const globePostTopLightDefinition = makeCatalogLampDefinition(getCatalogLampConfig('environment:globe-post-top-light')!)
export const decorativeCandelabraLightDefinition = makeCatalogLampDefinition(getCatalogLampConfig('environment:decorative-candelabra-light')!)
export const pathGardenLightDefinition = makeCatalogLampDefinition(getCatalogLampConfig('environment:path-garden-light')!)
export const bollardLightDefinition = makeCatalogLampDefinition(getCatalogLampConfig('environment:bollard-light')!)
export const catenaryStreetLightDefinition = makeCatalogLampDefinition(getCatalogLampConfig('environment:catenary-street-light')!)
export const wallArmLightDefinition = makeCatalogLampDefinition(getCatalogLampConfig('environment:wall-arm-light')!)
export const wallPackLightDefinition = makeCatalogLampDefinition(getCatalogLampConfig('environment:wall-pack-light')!)
export const tunnelLuminaireDefinition = makeCatalogLampDefinition(getCatalogLampConfig('environment:tunnel-luminaire')!)
export const canopySoffitLightDefinition = makeCatalogLampDefinition(getCatalogLampConfig('environment:canopy-soffit-light')!)
export const solarStreetLightDefinition = makeCatalogLampDefinition(getCatalogLampConfig('environment:solar-street-light')!)
