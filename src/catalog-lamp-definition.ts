import { buildCatalogLampFloorplan } from './catalog-lamp-floorplan'
import {
  BOLLARD_LIGHT_DIMENSIONS,
  resolveBollardLightLayout,
} from './bollard-light-geometry'
import {
  CATENARY_SUSPENDED_LIGHT_DIMENSIONS,
  resolveCatenarySuspendedLightLayout,
} from './catenary-suspended-light-geometry'
import {
  CANOPY_SOFFIT_LIGHT_DIMENSIONS,
  resolveCanopySoffitLightLayout,
} from './canopy-soffit-light-geometry'
import {
  getCatalogLampConfig,
  resolveCatalogLampProjection,
  type CatalogLampVariant,
} from './catalog-lamp-config'
import { catalogLampParametrics } from './catalog-lamp-parametrics'
import { FLOODLIGHT_POLE_DIMENSIONS } from './floodlight-pole-geometry'
import { SHOEBOX_AREA_LIGHT_DIMENSIONS } from './shoebox-area-light-geometry'
import { resolveHighMastCrownLightLayout } from './high-mast-crown-light-geometry'
import { SOLAR_STREET_LIGHT_DIMENSIONS } from './solar-street-light-geometry'
import {
  PATH_GARDEN_LIGHT_DIMENSIONS,
  resolvePathGardenLightLayout,
} from './path-garden-light-geometry'
import {
  resolveTraditionalPostTopLanternLayout,
  TRADITIONAL_LANTERN_DIMENSIONS,
} from './traditional-post-top-lantern-geometry'
import {
  resolveWallPackLightLayout,
  WALL_PACK_LIGHT_DIMENSIONS,
} from './wall-pack-light-geometry'
import {
  resolveWallArmLightLayout,
  WALL_ARM_LIGHT_DIMENSIONS,
} from './wall-arm-light-geometry'

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

const wallPackDepthHandle = {
  kind: 'linear-resize',
  axis: 'x',
  anchor: 'min',
  min: WALL_PACK_LIGHT_DIMENSIONS.minDepth,
  currentValue: (node: any) => resolveWallPackLightLayout(node.armLength).depth,
  apply: (initial: any, depth: number) => ({
    armLength: resolveWallPackLightLayout(depth).depth,
  }),
  placement: {
    position: (node: any) => [
      resolveWallPackLightLayout(node.armLength).depth + 0.14,
      0,
      0,
    ],
  },
}

const wallArmReachHandle = {
  ...armHandle,
  currentValue: (node: any) => resolveWallArmLightLayout(node.armLength).armLength,
  placement: {
    position: (node: any) => [
      resolveWallArmLightLayout(node.armLength).armLength + WALL_ARM_LIGHT_DIMENSIONS.headEndX,
      node.height + 0.05,
      0,
    ],
  },
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
  const isWallHosted = variant.projection === 'wall-arm' || variant.projection === 'wall-pack'

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
      ...(isWallHosted
        ? {}
        : {
            movable: {
              axes: ['x', 'z'],
              gridSnap: true,
            },
            rotatable: {
              axes: ['y'],
              snapAngles: Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4),
            },
          }),
      ...(isWallHosted
        ? {
            hostable: { parents: ['wall'], align: 'face' },
            hostRefFields: ['wallId', 'wallT'],
          }
        : variant.projection === 'tunnel' || variant.projection === 'canopy'
          ? {
              hostable: { parents: ['ceiling'], align: 'bottom' },
              hostRefFields: ['ceilingId'],
            }
          : {}),
      selectable: { hitVolume: 'bbox' },
      duplicable: true,
      deletable: true,
      groupable: true,
      snappable: {},
      floorPlaced: {
        footprint: (node: any) => {
          const isShoebox = node.type === 'environment:shoebox-area-light' && (node.visualStyle ?? 'shoebox') === 'shoebox'
          const isFloodlight = resolveCatalogLampProjection(node.type, node.visualStyle) === 'floodlight'
          const isHighMast = resolveCatalogLampProjection(node.type, node.visualStyle) === 'high-mast'
          const isSolar = resolveCatalogLampProjection(node.type, node.visualStyle) === 'solar'
          const isPath = resolveCatalogLampProjection(node.type, node.visualStyle) === 'path'
          const isBollard = resolveCatalogLampProjection(node.type, node.visualStyle) === 'bollard'
          const isCatenary = resolveCatalogLampProjection(node.type, node.visualStyle) === 'catenary'
          const isCanopy = resolveCatalogLampProjection(node.type, node.visualStyle) === 'canopy'
          const isWallPack = resolveCatalogLampProjection(node.type, node.visualStyle) === 'wall-pack'
          const isWallArm = resolveCatalogLampProjection(node.type, node.visualStyle) === 'wall-arm'
          const isTraditionalLantern = node.type === 'environment:traditional-post-top-lantern'
            && resolveCatalogLampProjection(node.type, node.visualStyle) === 'lantern'
          const highMastLayout = isHighMast ? resolveHighMastCrownLightLayout(node) : undefined
          const traditionalLanternLayout = isTraditionalLantern
            ? resolveTraditionalPostTopLanternLayout(node)
            : undefined
          const highMastDiameter = highMastLayout
            ? (highMastLayout.fixtureCenterRadius + highMastLayout.fixtureLength / 2) * 2
            : 0
          const pathLayout = isPath
            ? resolvePathGardenLightLayout(node.height, node.armLength)
            : undefined
          const bollardLayout = isBollard
            ? resolveBollardLightLayout(node.height)
            : undefined
          const catenaryLayout = isCatenary
            ? resolveCatenarySuspendedLightLayout(node.height, node.armLength)
            : undefined
          const canopyLayout = isCanopy
            ? resolveCanopySoffitLightLayout(node.height, node.armLength)
            : undefined
          const wallPackLayout = isWallPack
            ? resolveWallPackLightLayout(node.armLength)
            : undefined
          const wallArmLayout = isWallArm
            ? resolveWallArmLightLayout(node.armLength)
            : undefined
          const genericDimensions = [
            Math.max(0.4, node.armLength ?? 1),
            Math.max(0.1, node.height ?? 1),
            Math.max(0.4, node.armLength ?? 1),
          ]
          return {
            dimensions: traditionalLanternLayout
              ? [
                  TRADITIONAL_LANTERN_DIMENSIONS.roofWidth,
                  traditionalLanternLayout.totalHeight,
                  TRADITIONAL_LANTERN_DIMENSIONS.roofWidth,
                ]
              : isHighMast
              ? [highMastDiameter, Math.max(0.1, node.height ?? 18), highMastDiameter]
              : isShoebox
              ? [
                  (node.armLength ?? SHOEBOX_AREA_LIGHT_DIMENSIONS.defaultArmLength) + SHOEBOX_AREA_LIGHT_DIMENSIONS.housingEndX,
                  Math.max(0.1, node.height ?? 1),
                  Math.max(SHOEBOX_AREA_LIGHT_DIMENSIONS.housingWidth, SHOEBOX_AREA_LIGHT_DIMENSIONS.basePlateWidth),
                ]
              : isFloodlight
                ? [
                    (node.armLength ?? 0.9) + FLOODLIGHT_POLE_DIMENSIONS.headCenterOffsetX + FLOODLIGHT_POLE_DIMENSIONS.housingLength / 2,
                    Math.max(0.1, node.height ?? 1),
                    Math.max(FLOODLIGHT_POLE_DIMENSIONS.basePlateSize, FLOODLIGHT_POLE_DIMENSIONS.housingWidth),
                  ]
                : isSolar
                  ? [
                      (node.armLength ?? 1.3) + SOLAR_STREET_LIGHT_DIMENSIONS.housingEndX,
                      Math.max(0.1, (node.height ?? 6) + SOLAR_STREET_LIGHT_DIMENSIONS.housingHeight),
                      Math.max(SOLAR_STREET_LIGHT_DIMENSIONS.basePlateSize, SOLAR_STREET_LIGHT_DIMENSIONS.housingWidth),
                    ]
                  : pathLayout
                    ? [
                        pathLayout.headSpan,
                        pathLayout.height,
                        PATH_GARDEN_LIGHT_DIMENSIONS.headDepth,
                      ]
                  : canopyLayout
                    ? [
                        canopyLayout.fixtureSize,
                        CANOPY_SOFFIT_LIGHT_DIMENSIONS.housingDepth
                          + CANOPY_SOFFIT_LIGHT_DIMENSIONS.trimDepth
                          + CANOPY_SOFFIT_LIGHT_DIMENSIONS.gasketDepth
                          + CANOPY_SOFFIT_LIGHT_DIMENSIONS.faceplateDepth
                          + CANOPY_SOFFIT_LIGHT_DIMENSIONS.opticCoverDepth,
                        canopyLayout.fixtureSize,
                      ]
                  : wallPackLayout
                    ? [
                        wallPackLayout.depth,
                        WALL_PACK_LIGHT_DIMENSIONS.housingHeight,
                        WALL_PACK_LIGHT_DIMENSIONS.width,
                      ]
                  : wallArmLayout
                    ? [
                        wallArmLayout.headOriginX + WALL_ARM_LIGHT_DIMENSIONS.headEndX,
                        Math.max(
                          0.1,
                          (node.height ?? 4) + Math.max(
                            WALL_ARM_LIGHT_DIMENSIONS.mountPlateHeight / 2,
                            WALL_ARM_LIGHT_DIMENSIONS.armTopAtBase,
                          ),
                        ),
                        Math.max(
                          WALL_ARM_LIGHT_DIMENSIONS.mountPlateWidth,
                          WALL_ARM_LIGHT_DIMENSIONS.headWidth,
                        ),
                      ]
                  : bollardLayout
                    ? [
                        BOLLARD_LIGHT_DIMENSIONS.basePlateRadius * 2,
                        bollardLayout.height,
                        BOLLARD_LIGHT_DIMENSIONS.basePlateRadius * 2,
                      ]
                    : catenaryLayout
                      ? [
                          catenaryLayout.span + CATENARY_SUSPENDED_LIGHT_DIMENSIONS.basePlateSize,
                          catenaryLayout.height + CATENARY_SUSPENDED_LIGHT_DIMENSIONS.poleCapHeight,
                          Math.max(
                            CATENARY_SUSPENDED_LIGHT_DIMENSIONS.basePlateSize,
                            CATENARY_SUSPENDED_LIGHT_DIMENSIONS.bodyWidth,
                          ),
                        ]
                : genericDimensions,
            rotation: node.rotation,
          }
        },
        applies: (node: any) =>
          variant.projection === 'tunnel' || variant.projection === 'canopy'
            ? !node.ceilingId
            : !(isWallHosted && node.wallId),
        collides: false,
      },
    },
    parametrics: catalogLampParametrics,
    floorplan: buildCatalogLampFloorplan,
    handles: variant.projection === 'tunnel' || variant.projection === 'canopy'
      ? [armHandle, rotateHandle]
      : variant.projection === 'wall-pack'
        ? [wallPackDepthHandle]
        : variant.projection === 'wall-arm'
          ? [heightHandle, wallArmReachHandle]
          : [heightHandle, armHandle, rotateHandle],
    renderer: { kind: 'parametric', module: () => import('./catalog-lamp-renderer') },
    preview: () => import('./catalog-lamp-preview'),
    tool: () => import('./catalog-lamp-tool'),
    toolHints: [
      { key: 'Left click', label: `Place ${variant.label.toLowerCase()}` },
      ...(isWallHosted ? [] : [{ key: 'R', label: 'Rotate 45°' }]),
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
