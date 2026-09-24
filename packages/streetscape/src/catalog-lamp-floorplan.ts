import type { FloorplanGeometry, GeometryContext } from '@pascal-app/core'
import { BOLLARD_LIGHT_DIMENSIONS } from './bollard-light-geometry'
import {
  CATENARY_HOUSING_PLAN_PROFILE,
  CATENARY_SUSPENDED_LIGHT_DIMENSIONS,
  resolveCatenarySuspendedLightLayout,
} from './catenary-suspended-light-geometry'
import {
  CANOPY_SOFFIT_LIGHT_DIMENSIONS,
  canopySoffitOpticOffsets,
  resolveCanopySoffitLightLayout,
} from './canopy-soffit-light-geometry'
import {
  resolveCatalogLampProjection,
  type CatalogLampNode,
  type CatalogLampProjection,
} from './catalog-lamp-config'
import {
  SHOEBOX_AREA_LIGHT_DIMENSIONS,
  SHOEBOX_AREA_LIGHT_HEAT_SINK_Z,
  SHOEBOX_AREA_LIGHT_HOUSING_SECTIONS,
  SHOEBOX_AREA_LIGHT_OPTIC_MODULE_CENTERS,
} from './shoebox-area-light-geometry'
import {
  FLOODLIGHT_HOUSING_PLAN_PROFILE,
  resolveFloodlightPoleLayout,
} from './floodlight-pole-geometry'
import {
  GLOBE_POST_TOP_LIGHT_DIMENSIONS,
  GLOBE_POST_TOP_LIGHT_RIB_ANGLES,
} from './globe-post-top-light-geometry'
import {
  getHighMastHousingSections,
  highMastCrownAngles,
  resolveHighMastCrownLightLayout,
} from './high-mast-crown-light-geometry'
import {
  CANDELABRA_LANTERN_DEPTH,
  CANDELABRA_LANTERN_WIDTH,
  resolveDecorativeCandelabraLayout,
} from './decorative-candelabra-light-geometry'
import type { DecorativeCandelabraLightNode, HighMastCrownLightNode } from './schema'
import {
  resolveSolarStreetLightLayout,
  SOLAR_PANEL_COLUMNS,
  SOLAR_PANEL_ROWS,
  SOLAR_STREET_LIGHT_DIMENSIONS,
  SOLAR_STREET_LIGHT_HOUSING_SECTIONS,
} from './solar-street-light-geometry'
import { TRADITIONAL_LANTERN_DIMENSIONS } from './traditional-post-top-lantern-geometry'
import {
  PATH_GARDEN_LIGHT_DIMENSIONS,
  resolvePathGardenLightLayout,
} from './path-garden-light-geometry'
import {
  resolveTunnelLuminaireLayout,
  TUNNEL_LUMINAIRE_DIMENSIONS,
} from './tunnel-luminaire-geometry'
import {
  resolveWallArmLightLayout,
  WALL_ARM_LIGHT_DIMENSIONS,
  WALL_ARM_LIGHT_HOUSING_SECTIONS,
  WALL_ARM_LIGHT_OPTIC_MODULE_CENTERS,
} from './wall-arm-light-geometry'
import {
  getWallPackPlanProfile,
  resolveWallPackLightLayout,
  WALL_PACK_LIGHT_DIMENSIONS,
} from './wall-pack-light-geometry'

type Point = readonly [number, number]

const CATENARY_BASE_BOLT_SIGNS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
] as const

function rotated(point: Point, center: Point, angle: number): Point {
  const dx = point[0] - center[0]
  const dy = point[1] - center[1]
  return [center[0] + dx * Math.cos(angle) - dy * Math.sin(angle), center[1] + dx * Math.sin(angle) + dy * Math.cos(angle)]
}

function rect(center: Point, width: number, depth: number, angle: number, fill: string, stroke: string): FloorplanGeometry {
  const halfW = width / 2
  const halfD = depth / 2
  const points = [
    [-halfW, -halfD],
    [halfW, -halfD],
    [halfW, halfD],
    [-halfW, halfD],
  ].map(([x, y]) => rotated([center[0] + (x ?? 0), center[1] + (y ?? 0)], center, angle))
  return { kind: 'polygon', points, fill, fillOpacity: 0.78, stroke, strokeWidth: 0.035 }
}

function localPoint(origin: Point, x: number, z: number, angle: number): Point {
  return [
    origin[0] + x * Math.cos(angle) - z * Math.sin(angle),
    origin[1] + x * Math.sin(angle) + z * Math.cos(angle),
  ]
}

/** Match Three.js positive Y rotation: local +X turns toward world -Z. */
function threeYPoint(origin: Point, x: number, z: number, angle: number): Point {
  return [
    origin[0] + x * Math.cos(angle) + z * Math.sin(angle),
    origin[1] - x * Math.sin(angle) + z * Math.cos(angle),
  ]
}

function chamferedSquarePoints(
  center: Point,
  size: number,
  angle: number,
  corner = size * CANOPY_SOFFIT_LIGHT_DIMENSIONS.cornerRatio,
): Point[] {
  const half = size / 2
  return [
    [-half + corner, -half],
    [half - corner, -half],
    [half, -half + corner],
    [half, half - corner],
    [half - corner, half],
    [-half + corner, half],
    [-half, half - corner],
    [-half, -half + corner],
  ].map(([localX, localZ]) => localPoint(center, localX ?? 0, localZ ?? 0, angle))
}

export function buildCatalogLampFloorplan(node: CatalogLampNode, ctx: GeometryContext): FloorplanGeometry {
  const projection = resolveCatalogLampProjection(node.type as string, node.visualStyle) ?? 'shoebox'
  let [x, , z] = node.position ?? [0, 0, 0]
  let angle = node.rotation?.[1] ?? 0

  if (
    (projection === 'wall-arm' || projection === 'wall-pack')
    && 'wallId' in node
    && node.wallId
    && ctx.parent?.type === 'wall'
  ) {
    const wall = ctx.parent as typeof ctx.parent & {
      start: [number, number]
      end: [number, number]
      thickness?: number
    }
    const dx = wall.end[0] - wall.start[0]
    const dz = wall.end[1] - wall.start[1]
    const wallLength = Math.max(1e-6, Math.hypot(dx, dz))
    const dirX = dx / wallLength
    const dirZ = dz / wallLength
    const faceSign = node.side === 'back' ? -1 : 1
    const surfaceOffset = ((wall.thickness ?? 0.1) / 2) * faceSign
    const normalX = -dirZ * faceSign
    const normalZ = dirX * faceSign
    x = wall.start[0] + dirX * node.position[0] + normalX * Math.abs(surfaceOffset)
    z = wall.start[1] + dirZ * node.position[0] + normalZ * Math.abs(surfaceOffset)
    angle = Math.atan2(normalZ, normalX)
  }

  const center: Point = [x, z]
  const view = ctx.viewState
  const palette = view?.palette
  const selected = view?.selected ?? false
  const stroke = selected
    ? palette?.selectedStroke ?? '#2563eb'
    : view?.hovered
      ? palette?.wallHoverStroke ?? '#60a5fa'
      : node.poleColor ?? '#363b40'
  const lampFill = node.lightOn ? node.lightColor ?? '#ffd39a' : '#6b7280'
  const children: FloorplanGeometry[] = []

  if (projection === 'catenary') {
    const layout = resolveCatenarySuspendedLightLayout(node.height ?? 6, node.armLength ?? 6)
    const dimensions = CATENARY_SUSPENDED_LIGHT_DIMENSIONS
    const leftPole = localPoint(center, -layout.span / 2, 0, angle)
    const rightPole = localPoint(center, layout.span / 2, 0, angle)
    const bodyPoints = CATENARY_HOUSING_PLAN_PROFILE.map(([localX, localZ]) =>
      localPoint(center, localX, localZ, angle),
    )
    const baseHalf = dimensions.basePlateSize / 2

    if (node.lightOn) {
      children.push({
        kind: 'circle',
        cx: x,
        cy: z,
        r: dimensions.lightPoolRadius,
        fill: node.lightColor ?? '#ffd39a',
        fillOpacity: 0.08,
        stroke: node.lightColor ?? '#ffd39a',
        strokeWidth: 0.018,
      })
    }

    children.push(
      {
        kind: 'line',
        x1: leftPole[0],
        y1: leftPole[1],
        x2: rightPole[0],
        y2: rightPole[1],
        stroke: '#22292d',
        strokeWidth: dimensions.cableRadius * 2,
        strokeLinecap: 'round',
      },
      ...([leftPole, rightPole] as const).flatMap((poleCenter) => {
        const basePoints = [
          localPoint(poleCenter, -baseHalf, -baseHalf, angle),
          localPoint(poleCenter, baseHalf, -baseHalf, angle),
          localPoint(poleCenter, baseHalf, baseHalf, angle),
          localPoint(poleCenter, -baseHalf, baseHalf, angle),
        ]
        return [
          {
            kind: 'polygon' as const,
            points: basePoints,
            fill: node.poleColor ?? '#343b40',
            fillOpacity: 0.76,
            stroke,
            strokeWidth: 0.035,
          },
          ...CATENARY_BASE_BOLT_SIGNS.map(([xSign, zSign]) => {
            const bolt = localPoint(
              poleCenter,
              xSign * dimensions.baseBoltOffset,
              zSign * dimensions.baseBoltOffset,
              angle,
            )
            return {
              kind: 'circle' as const,
              cx: bolt[0],
              cy: bolt[1],
              r: dimensions.baseBoltRadius,
              fill: '#8b9499',
              fillOpacity: 0.96,
              stroke,
              strokeWidth: 0.012,
            }
          }),
          {
            kind: 'circle' as const,
            cx: poleCenter[0],
            cy: poleCenter[1],
            r: dimensions.poleBottomRadius,
            fill: node.poleColor ?? '#343b40',
            fillOpacity: 0.94,
            stroke,
            strokeWidth: 0.03,
          },
        ]
      }),
      {
        kind: 'polygon',
        points: bodyPoints,
        fill: '#4b555c',
        fillOpacity: 0.94,
        stroke,
        strokeWidth: 0.04,
      },
    )

    const serviceStart = localPoint(center, -0.15, 0, angle)
    const serviceEnd = localPoint(center, 0.15, 0, angle)
    children.push({
      kind: 'line',
      x1: serviceStart[0],
      y1: serviceStart[1],
      x2: serviceEnd[0],
      y2: serviceEnd[1],
      stroke: '#a6afb3',
      strokeWidth: 0.018,
      strokeLinecap: 'round',
    })

    for (const xDirection of [-1, 1] as const) {
      const clamp = localPoint(center, xDirection * dimensions.clampOffset, 0, angle)
      const yokeEnd = localPoint(center, xDirection * 0.18, 0, angle)
      children.push(
        {
          kind: 'circle',
          cx: clamp[0],
          cy: clamp[1],
          r: dimensions.clampRadius,
          fill: '#7b858b',
          fillOpacity: 0.96,
          stroke,
          strokeWidth: 0.018,
        },
        {
          kind: 'line',
          x1: clamp[0],
          y1: clamp[1],
          x2: yokeEnd[0],
          y2: yokeEnd[1],
          stroke: '#59636a',
          strokeWidth: dimensions.yokeRadius * 2,
          strokeLinecap: 'round',
        },
      )
    }

    for (const moduleX of dimensions.opticModuleCenters) {
      const moduleCenter = localPoint(center, moduleX, 0, angle)
      children.push(rect(
        moduleCenter,
        dimensions.opticModuleLength,
        dimensions.opticModuleWidth,
        angle,
        lampFill,
        stroke,
      ))
      for (const offsetX of dimensions.opticCellXOffsets) {
        for (const offsetZ of dimensions.opticCellZOffsets) {
          const cell = localPoint(center, moduleX + offsetX, offsetZ, angle)
          children.push({
            kind: 'circle',
            cx: cell[0],
            cy: cell[1],
            r: 0.012,
            fill: node.lightOn ? '#fff8de' : '#dce2e3',
            fillOpacity: 0.98,
            stroke: node.lightOn ? node.lightColor ?? '#ffd39a' : '#7f898e',
            strokeWidth: 0.008,
          })
        }
      }
    }
  } else if (projection === 'tunnel') {
    const layout = resolveTunnelLuminaireLayout(node.armLength ?? 2.2, node.height ?? 6)
    const bodyFill = node.poleColor ?? '#7a8388'
    const leftEnd = localPoint(center, -layout.length / 2, 0, angle)
    const connectorEnd = localPoint(
      center,
      -layout.length / 2 - TUNNEL_LUMINAIRE_DIMENSIONS.connectorLength,
      0,
      angle,
    )

    if (node.lightOn) {
      const halfWidth = (layout.length + 0.18) / 2
      const halfDepth = (layout.bodyWidth + 0.18) / 2
      children.push({
        kind: 'polygon',
        points: [
          localPoint(center, -halfWidth, -halfDepth, angle),
          localPoint(center, halfWidth, -halfDepth, angle),
          localPoint(center, halfWidth, halfDepth, angle),
          localPoint(center, -halfWidth, halfDepth, angle),
        ],
        fill: node.lightColor ?? '#e9f2ff',
        fillOpacity: 0.08,
        stroke: node.lightColor ?? '#e9f2ff',
        strokeWidth: 0.012,
      })
    }

    children.push(
      rect(center, layout.length, layout.bodyWidth, angle, bodyFill, stroke),
      ...layout.opticStripOffsets.map((localZ) =>
        rect(
          localPoint(center, 0, localZ, angle),
          layout.opticLength,
          layout.opticStripWidth,
          angle,
          lampFill,
          selected ? stroke : '#485157',
        ),
      ),
      ...layout.moduleCenters.flatMap((localX) =>
        layout.opticStripOffsets.map((localZ) => {
          const optic = localPoint(center, localX, localZ, angle)
          return {
            kind: 'circle' as const,
            cx: optic[0],
            cy: optic[1],
            r: 0.011,
            fill: node.lightOn ? '#ffffff' : '#dce2e4',
            fillOpacity: 0.96,
            stroke: selected ? stroke : '#667177',
            strokeWidth: 0.007,
          }
        }),
      ),
      ...layout.mountingClipCenters.map((localX) =>
        rect(
          localPoint(center, localX, 0, angle),
          TUNNEL_LUMINAIRE_DIMENSIONS.mountingClipLength,
          TUNNEL_LUMINAIRE_DIMENSIONS.mountingClipWidth,
          angle,
          '#626c72',
          stroke,
        ),
      ),
      {
        kind: 'line',
        x1: leftEnd[0],
        y1: leftEnd[1],
        x2: connectorEnd[0],
        y2: connectorEnd[1],
        stroke: '#161c20',
        strokeWidth: TUNNEL_LUMINAIRE_DIMENSIONS.connectorRadius * 1.5,
        strokeLinecap: 'round',
      },
      {
        kind: 'circle',
        cx: connectorEnd[0],
        cy: connectorEnd[1],
        r: TUNNEL_LUMINAIRE_DIMENSIONS.connectorRadius,
        fill: '#257ca3',
        fillOpacity: 0.95,
        stroke,
        strokeWidth: 0.012,
      },
    )
  } else if (projection === 'wall-pack') {
    const layout = resolveWallPackLightLayout(node.armLength ?? WALL_PACK_LIGHT_DIMENSIONS.defaultDepth)
    const bodyFill = node.poleColor ?? '#454b50'
    const planProfile = getWallPackPlanProfile(layout.depth)
      .map(([localX, localZ]) => threeYPoint(center, localX, localZ, angle))

    if (node.lightOn) {
      children.push({
        kind: 'polygon',
        points: [
          threeYPoint(center, layout.depth, -WALL_PACK_LIGHT_DIMENSIONS.opticWidth / 2, angle),
          threeYPoint(center, layout.depth, WALL_PACK_LIGHT_DIMENSIONS.opticWidth / 2, angle),
          threeYPoint(center, layout.depth + WALL_PACK_LIGHT_DIMENSIONS.lightThrowLength, WALL_PACK_LIGHT_DIMENSIONS.lightThrowHalfWidth, angle),
          threeYPoint(center, layout.depth + WALL_PACK_LIGHT_DIMENSIONS.lightThrowLength, -WALL_PACK_LIGHT_DIMENSIONS.lightThrowHalfWidth, angle),
        ],
        fill: node.lightColor ?? '#fff0c2',
        fillOpacity: 0.08,
        stroke: node.lightColor ?? '#fff0c2',
        strokeWidth: 0.018,
      })
    }

    const wallLeft = threeYPoint(center, -0.035, -WALL_PACK_LIGHT_DIMENSIONS.width / 2 - 0.14, angle)
    const wallRight = threeYPoint(center, -0.035, WALL_PACK_LIGHT_DIMENSIONS.width / 2 + 0.14, angle)
    const plateHalfDepth = WALL_PACK_LIGHT_DIMENSIONS.backPlateDepth / 2
    const plateHalfWidth = WALL_PACK_LIGHT_DIMENSIONS.backPlateWidth / 2
    children.push(
      {
        kind: 'line',
        x1: wallLeft[0],
        y1: wallLeft[1],
        x2: wallRight[0],
        y2: wallRight[1],
        stroke,
        strokeWidth: 0.07,
        strokeLinecap: 'square',
      },
      {
        kind: 'polygon',
        points: [
          threeYPoint(center, -plateHalfDepth, -plateHalfWidth, angle),
          threeYPoint(center, plateHalfDepth, -plateHalfWidth, angle),
          threeYPoint(center, plateHalfDepth, plateHalfWidth, angle),
          threeYPoint(center, -plateHalfDepth, plateHalfWidth, angle),
        ],
        fill: '#252b2e',
        fillOpacity: 0.78,
        stroke,
        strokeWidth: 0.035,
      },
      {
        kind: 'polygon',
        points: planProfile,
        fill: bodyFill,
        fillOpacity: 0.92,
        stroke,
        strokeWidth: 0.035,
      },
    )

    for (let index = 0; index < WALL_PACK_LIGHT_DIMENSIONS.heatSinkFinCount; index += 1) {
      const localZ = -0.18 + index * 0.09
      const start = threeYPoint(center, 0.08, localZ, angle)
      const end = threeYPoint(center, layout.depth - 0.07, localZ, angle)
      children.push({
        kind: 'line',
        x1: start[0],
        y1: start[1],
        x2: end[0],
        y2: end[1],
        stroke: selected ? stroke : '#2a3033',
        strokeWidth: 0.014,
        strokeLinecap: 'round',
      })
    }

    const opticLeft = threeYPoint(center, layout.depth - 0.028, -WALL_PACK_LIGHT_DIMENSIONS.opticWidth / 2, angle)
    const opticRight = threeYPoint(center, layout.depth - 0.028, WALL_PACK_LIGHT_DIMENSIONS.opticWidth / 2, angle)
    const photocell = threeYPoint(center, 0.068, -0.205, angle)
    children.push(
      {
        kind: 'line',
        x1: opticLeft[0],
        y1: opticLeft[1],
        x2: opticRight[0],
        y2: opticRight[1],
        stroke: node.lightOn ? node.lightColor ?? '#fff0c2' : '#9aa1a3',
        strokeWidth: 0.045,
        strokeLinecap: 'round',
      },
      {
        kind: 'circle',
        cx: photocell[0],
        cy: photocell[1],
        r: WALL_PACK_LIGHT_DIMENSIONS.photocellRadius,
        fill: '#152025',
        fillOpacity: 0.96,
        stroke,
        strokeWidth: 0.012,
      },
    )
  } else if (projection === 'wall-arm') {
    const dimensions = WALL_ARM_LIGHT_DIMENSIONS
    const layout = resolveWallArmLightLayout(node.armLength)
    const bodyFill = node.poleColor ?? '#363b40'
    const plateCenter = localPoint(center, dimensions.mountPlateDepth / 2, 0, angle)
    const padCenter = localPoint(
      center,
      dimensions.mountPlateDepth + dimensions.mountPadDepth / 2,
      0,
      angle,
    )
    const armStartX = dimensions.mountPlateDepth + dimensions.mountPadDepth
    const armEndX = layout.armLength - dimensions.upperArmTipInset
    const armPoints = [
      localPoint(center, armStartX, -dimensions.armBaseHalfWidth, angle),
      localPoint(center, armEndX, -dimensions.armTipHalfWidth, angle),
      localPoint(center, armEndX, dimensions.armTipHalfWidth, angle),
      localPoint(center, armStartX, dimensions.armBaseHalfWidth, angle),
    ]
    const headPoints = [
      ...WALL_ARM_LIGHT_HOUSING_SECTIONS.map((section) =>
        localPoint(center, layout.headOriginX + section.x, -section.halfWidth, angle),
      ),
      ...[...WALL_ARM_LIGHT_HOUSING_SECTIONS].reverse().map((section) =>
        localPoint(center, layout.headOriginX + section.x, section.halfWidth, angle),
      ),
    ]
    const lightCenter = localPoint(center, layout.lightCenterX, 0, angle)

    if (node.lightOn) {
      children.push({
        kind: 'circle',
        cx: lightCenter[0],
        cy: lightCenter[1],
        r: 0.52,
        fill: node.lightColor ?? '#ffd39a',
        fillOpacity: 0.08,
        stroke: node.lightColor ?? '#ffd39a',
        strokeWidth: 0.018,
      })
    }

    children.push(
      rect(plateCenter, dimensions.mountPlateDepth, dimensions.mountPlateWidth, angle, bodyFill, stroke),
      rect(padCenter, dimensions.mountPadDepth, dimensions.mountPadWidth, angle, '#4b555c', stroke),
      {
        kind: 'polygon',
        points: armPoints,
        fill: bodyFill,
        fillOpacity: 0.94,
        stroke,
        strokeWidth: 0.028,
      },
      {
        kind: 'line',
        x1: localPoint(center, dimensions.lowerTieStartX, 0, angle)[0],
        y1: localPoint(center, dimensions.lowerTieStartX, 0, angle)[1],
        x2: localPoint(center, layout.armLength - 0.055, 0, angle)[0],
        y2: localPoint(center, layout.armLength - 0.055, 0, angle)[1],
        stroke: selected ? stroke : '#59636a',
        strokeWidth: dimensions.lowerTieRadius * 1.2,
        strokeLinecap: 'round',
      },
      {
        kind: 'circle',
        cx: localPoint(center, layout.armLength - 0.055, 0, angle)[0],
        cy: localPoint(center, layout.armLength - 0.055, 0, angle)[1],
        r: dimensions.jointRadius,
        fill: '#30383d',
        fillOpacity: 0.96,
        stroke,
        strokeWidth: 0.022,
      },
      {
        kind: 'polygon',
        points: headPoints,
        fill: '#49535a',
        fillOpacity: 0.94,
        stroke,
        strokeWidth: 0.03,
      },
      rect(
        localPoint(
          center,
          layout.headOriginX + (dimensions.lensStartX + dimensions.lensEndX) / 2,
          0,
          angle,
        ),
        dimensions.lensEndX - dimensions.lensStartX,
        dimensions.lensWidth,
        angle,
        lampFill,
        stroke,
      ),
    )

    for (const lateral of [-1, 1] as const) {
      const bolt = localPoint(center, dimensions.mountBoltX, lateral * dimensions.mountBoltZ, angle)
      children.push({
        kind: 'circle',
        cx: bolt[0],
        cy: bolt[1],
        r: dimensions.mountBoltRadius,
        fill: '#151a1e',
        fillOpacity: 0.98,
        stroke,
        strokeWidth: 0.012,
      })
    }

    for (const moduleX of WALL_ARM_LIGHT_OPTIC_MODULE_CENTERS) {
      children.push(
        rect(
          localPoint(center, layout.headOriginX + moduleX, 0, angle),
          0.17,
          0.225,
          angle,
          node.lightOn ? '#fff3cd' : '#aeb7bb',
          stroke,
        ),
      )
    }

  } else if (projection === 'globe') {
    const dimensions = GLOBE_POST_TOP_LIGHT_DIMENSIONS
    const globeRadius = dimensions.globeMaxRadius
    const baseHalf = dimensions.basePlateSize / 2
    const basePoints = [
      localPoint(center, -baseHalf, -baseHalf, angle),
      localPoint(center, baseHalf, -baseHalf, angle),
      localPoint(center, baseHalf, baseHalf, angle),
      localPoint(center, -baseHalf, baseHalf, angle),
    ]

    if (node.lightOn) {
      children.push({
        kind: 'circle',
        cx: x,
        cy: z,
        r: globeRadius + 0.11,
        fill: node.lightColor ?? '#ffe0ad',
        fillOpacity: 0.1,
        stroke: node.lightColor ?? '#ffe0ad',
        strokeWidth: 0.018,
      })
    }

    children.push(
      {
        kind: 'polygon',
        points: basePoints,
        fill: node.poleColor ?? '#30343b',
        fillOpacity: 0.72,
        stroke,
        strokeWidth: 0.035,
      },
      ...([-1, 1] as const).flatMap((localX) =>
        ([-1, 1] as const).map((localZ) => {
          const bolt = localPoint(
            center,
            localX * dimensions.baseBoltOffset,
            localZ * dimensions.baseBoltOffset,
            angle,
          )
          return {
            kind: 'circle' as const,
            cx: bolt[0],
            cy: bolt[1],
            r: 0.026,
            fill: '#171a1d',
            fillOpacity: 0.92,
            stroke,
            strokeWidth: 0.018,
          }
        }),
      ),
      {
        kind: 'circle',
        cx: x,
        cy: z,
        r: globeRadius,
        fill: lampFill,
        fillOpacity: node.lightOn ? 0.32 : 0.22,
        stroke,
        strokeWidth: 0.045,
      },
      ...GLOBE_POST_TOP_LIGHT_RIB_ANGLES.map((ribAngle) => ({
        kind: 'line' as const,
        x1: x + Math.cos(angle + ribAngle) * dimensions.fitterTopRadius,
        y1: z + Math.sin(angle + ribAngle) * dimensions.fitterTopRadius,
        x2: x + Math.cos(angle + ribAngle) * (globeRadius - 0.012),
        y2: z + Math.sin(angle + ribAngle) * (globeRadius - 0.012),
        stroke,
        strokeWidth: 0.018,
        strokeLinecap: 'round' as const,
      })),
      {
        kind: 'circle',
        cx: x,
        cy: z,
        r: dimensions.fitterBottomRadius,
        fill: node.poleColor ?? '#30343b',
        fillOpacity: 0.88,
        stroke,
        strokeWidth: 0.03,
      },
      {
        kind: 'circle',
        cx: x,
        cy: z,
        r: dimensions.shaftTopRadius,
        fill: '#171a1d',
        fillOpacity: 0.9,
        stroke,
        strokeWidth: 0.025,
      },
    )
  } else if (projection === 'lantern') {
    const dimensions = TRADITIONAL_LANTERN_DIMENSIONS
    const roofHalf = dimensions.roofWidth / 2
    const glassHalf = dimensions.glassBottomWidth / 2
    const roofCorners = [
      localPoint(center, -roofHalf, -roofHalf, angle),
      localPoint(center, roofHalf, -roofHalf, angle),
      localPoint(center, roofHalf, roofHalf, angle),
      localPoint(center, -roofHalf, roofHalf, angle),
    ]
    const glassCorners = [
      localPoint(center, -glassHalf, -glassHalf, angle),
      localPoint(center, glassHalf, -glassHalf, angle),
      localPoint(center, glassHalf, glassHalf, angle),
      localPoint(center, -glassHalf, glassHalf, angle),
    ]

    if (node.lightOn) {
      children.push({
        kind: 'circle',
        cx: x,
        cy: z,
        r: roofHalf + 0.12,
        fill: node.lightColor ?? '#ffd9a3',
        fillOpacity: 0.1,
        stroke: node.lightColor ?? '#ffd9a3',
        strokeWidth: 0.018,
      })
    }

    children.push(
      rect(center, dimensions.baseWidth, dimensions.baseWidth, angle, node.poleColor ?? '#25282d', stroke),
      {
        kind: 'polygon',
        points: roofCorners,
        fill: node.poleColor ?? '#25282d',
        fillOpacity: 0.2,
        stroke,
        strokeWidth: 0.045,
      },
      {
        kind: 'polygon',
        points: glassCorners,
        fill: lampFill,
        fillOpacity: node.lightOn ? 0.42 : 0.2,
        stroke,
        strokeWidth: 0.03,
      },
      ...roofCorners.map((corner) => ({
        kind: 'line' as const,
        x1: corner[0],
        y1: corner[1],
        x2: x,
        y2: z,
        stroke,
        strokeWidth: 0.022,
        strokeLinecap: 'round' as const,
      })),
      ...roofCorners.map((corner) => ({
        kind: 'circle' as const,
        cx: x + (corner[0] - x) * 0.84,
        cy: z + (corner[1] - z) * 0.84,
        r: 0.033,
        fill: node.poleColor ?? '#25282d',
        fillOpacity: 0.92,
        stroke,
        strokeWidth: 0.014,
      })),
      {
        kind: 'circle',
        cx: x,
        cy: z,
        r: TRADITIONAL_LANTERN_DIMENSIONS.poleTopRadius,
        fill: node.poleColor ?? '#25282d',
        fillOpacity: 0.95,
        stroke,
        strokeWidth: 0.025,
      },
      {
        kind: 'circle',
        cx: x,
        cy: z,
        r: 0.035,
        fill: '#8b6a3f',
        fillOpacity: 0.95,
        stroke,
        strokeWidth: 0.014,
      },
    )
  } else if (projection === 'path') {
    const layout = resolvePathGardenLightLayout(node.height, node.armLength)
    const bodyFill = node.poleColor ?? '#343b37'

    if (node.lightOn) {
      for (const side of [-1, 1] as const) {
        const pool = localPoint(
          center,
          side * PATH_GARDEN_LIGHT_DIMENSIONS.lightThrowOffset,
          0,
          angle,
        )
        children.push({
          kind: 'circle',
          cx: pool[0],
          cy: pool[1],
          r: 0.34,
          fill: node.lightColor ?? '#ffe0b2',
          fillOpacity: 0.1,
          stroke: node.lightColor ?? '#ffe0b2',
          strokeWidth: 0.016,
        })
      }
    }
    children.push(
      {
        kind: 'circle',
        cx: x,
        cy: z,
        r: PATH_GARDEN_LIGHT_DIMENSIONS.baseDiameter / 2,
        fill: '#252b28',
        fillOpacity: 0.82,
        stroke,
        strokeWidth: 0.026,
      },
      {
        kind: 'circle',
        cx: x,
        cy: z,
        r: PATH_GARDEN_LIGHT_DIMENSIONS.stemBottomRadius,
        fill: bodyFill,
        fillOpacity: 0.94,
        stroke,
        strokeWidth: 0.02,
      },
    )
    for (const side of [-1, 1] as const) {
      const headCenter = localPoint(center, side * layout.headCenterOffset, 0, angle)
      children.push({
        kind: 'line',
        x1: x,
        y1: z,
        x2: headCenter[0],
        y2: headCenter[1],
        stroke: selected ? stroke : '#222925',
        strokeWidth: 0.028,
        strokeLinecap: 'round',
      })
      children.push(
        rect(
          headCenter,
          layout.halfHeadLength,
          PATH_GARDEN_LIGHT_DIMENSIONS.headDepth,
          angle,
          bodyFill,
          stroke,
        ),
        rect(
          headCenter,
          layout.halfHeadLength - PATH_GARDEN_LIGHT_DIMENSIONS.lensInset * 2,
          PATH_GARDEN_LIGHT_DIMENSIONS.headDepth - PATH_GARDEN_LIGHT_DIMENSIONS.lensInset * 2,
          angle,
          lampFill,
          selected ? stroke : '#8b8170',
        ),
      )
    }
    children.push({
      kind: 'circle',
      cx: x,
      cy: z,
      r: PATH_GARDEN_LIGHT_DIMENSIONS.hubRadius,
      fill: '#303733',
      fillOpacity: 0.96,
      stroke,
      strokeWidth: 0.022,
    })
  } else if (projection === 'canopy') {
    const layout = resolveCanopySoffitLightLayout(0, node.armLength)
    const dimensions = CANOPY_SOFFIT_LIGHT_DIMENSIONS
    const moduleWidth = layout.fixtureSize * dimensions.opticModuleWidthRatio
    const moduleDepth = layout.fixtureSize * dimensions.opticModuleDepthRatio
    const moduleCenters = [
      -layout.fixtureSize * dimensions.opticModuleCenterXRatio,
      layout.fixtureSize * dimensions.opticModuleCenterXRatio,
    ]

    if (node.lightOn) {
      children.push({
        kind: 'circle',
        cx: x,
        cy: z,
        r: dimensions.lightThrowRadius,
        fill: node.lightColor ?? '#fff3d2',
        fillOpacity: 0.08,
        stroke: node.lightColor ?? '#fff3d2',
        strokeWidth: 0.018,
      })
    }

    children.push(
      {
        kind: 'polygon',
        points: chamferedSquarePoints(center, layout.fixtureSize, angle),
        fill: node.poleColor ?? '#d5d9d8',
        fillOpacity: 0.94,
        stroke,
        strokeWidth: 0.035,
      },
      {
        kind: 'polygon',
        points: chamferedSquarePoints(
          center,
          layout.fixtureSize * dimensions.gasketSizeRatio,
          angle,
        ),
        fill: '#171c1f',
        fillOpacity: 0.96,
        stroke: selected ? stroke : '#252b2f',
        strokeWidth: 0.024,
      },
      {
        kind: 'polygon',
        points: chamferedSquarePoints(
          center,
          layout.fixtureSize * dimensions.faceplateSizeRatio,
          angle,
        ),
        fill: '#4d585e',
        fillOpacity: 0.94,
        stroke,
        strokeWidth: 0.02,
      },
    )

    for (const moduleX of moduleCenters) {
      children.push(rect(
        localPoint(center, moduleX, 0, angle),
        moduleWidth,
        moduleDepth,
        angle,
        lampFill,
        stroke,
      ))
    }

    const serviceRailStart = localPoint(center, 0, -moduleDepth / 2, angle)
    const serviceRailEnd = localPoint(center, 0, moduleDepth / 2, angle)
    children.push({
      kind: 'line',
      x1: serviceRailStart[0],
      y1: serviceRailStart[1],
      x2: serviceRailEnd[0],
      y2: serviceRailEnd[1],
      stroke: selected ? stroke : '#252c30',
      strokeWidth: layout.fixtureSize * 0.055,
      strokeLinecap: 'round',
    })

    for (const [opticX, opticZ] of canopySoffitOpticOffsets(layout.fixtureSize)) {
      const optic = localPoint(center, opticX, opticZ, angle)
      children.push({
        kind: 'circle',
        cx: optic[0],
        cy: optic[1],
        r: layout.fixtureSize * dimensions.opticRadiusRatio,
        fill: node.lightOn ? '#fffdf4' : '#d4dadd',
        fillOpacity: 0.98,
        stroke: selected ? stroke : '#7c858a',
        strokeWidth: 0.009,
      })
    }

    const fastenerOffset = layout.fixtureSize
      * (0.5 - dimensions.trimFastenerInsetRatio)
    for (const [xSign, zSign] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const) {
      const fastener = localPoint(center, xSign * fastenerOffset, zSign * fastenerOffset, angle)
      children.push({
        kind: 'circle',
        cx: fastener[0],
        cy: fastener[1],
        r: layout.fixtureSize * 0.015,
        fill: '#929ca1',
        fillOpacity: 0.98,
        stroke,
        strokeWidth: 0.009,
      })
    }

    const sensor = localPoint(center, 0, layout.fixtureSize * dimensions.sensorZRatio, angle)
    children.push({
      kind: 'circle',
      cx: sensor[0],
      cy: sensor[1],
      r: layout.fixtureSize * dimensions.sensorRadiusRatio,
      fill: '#17262d',
      fillOpacity: 0.98,
      stroke: selected ? stroke : '#3b6d7d',
      strokeWidth: 0.01,
    })
  } else if (projection === 'bollard') {
    const bodyFill = node.poleColor ?? '#30363a'

    if (node.lightOn) {
      children.push({
        kind: 'circle',
        cx: x,
        cy: z,
        r: BOLLARD_LIGHT_DIMENSIONS.lightThrowRadius,
        fill: node.lightColor ?? '#ffe2b8',
        fillOpacity: 0.07,
        stroke: node.lightColor ?? '#ffe2b8',
        strokeWidth: 0.018,
      })
    }

    children.push(
      {
        kind: 'circle',
        cx: x,
        cy: z,
        r: BOLLARD_LIGHT_DIMENSIONS.basePlateRadius,
        fill: '#24292d',
        fillOpacity: 0.94,
        stroke,
        strokeWidth: 0.035,
      },
      {
        kind: 'circle',
        cx: x,
        cy: z,
        r: BOLLARD_LIGHT_DIMENSIONS.capRadius,
        fill: bodyFill,
        fillOpacity: 0.96,
        stroke,
        strokeWidth: 0.03,
      },
      {
        kind: 'circle',
        cx: x,
        cy: z,
        r: BOLLARD_LIGHT_DIMENSIONS.opticRadius,
        fill: lampFill,
        fillOpacity: node.lightOn ? 0.62 : 0.3,
        stroke: selected ? stroke : '#20262a',
        strokeWidth: 0.026,
      },
      {
        kind: 'circle',
        cx: x,
        cy: z,
        r: BOLLARD_LIGHT_DIMENSIONS.emitterRadius,
        fill: node.lightOn ? '#fff7df' : '#7e878c',
        fillOpacity: 0.96,
        stroke,
        strokeWidth: 0.018,
      },
    )

    for (const [xSign, zSign] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const) {
      const bolt = localPoint(
        center,
        xSign * BOLLARD_LIGHT_DIMENSIONS.anchorOffset / Math.SQRT2,
        zSign * BOLLARD_LIGHT_DIMENSIONS.anchorOffset / Math.SQRT2,
        angle,
      )
      children.push({
        kind: 'circle',
        cx: bolt[0],
        cy: bolt[1],
        r: BOLLARD_LIGHT_DIMENSIONS.anchorRadius,
        fill: '#8a9398',
        stroke,
        strokeWidth: 0.012,
      })
    }

    for (const guideAngle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      const start = localPoint(center, BOLLARD_LIGHT_DIMENSIONS.emitterRadius, 0, angle + guideAngle)
      const end = localPoint(center, BOLLARD_LIGHT_DIMENSIONS.opticRadius, 0, angle + guideAngle)
      children.push({
        kind: 'line',
        x1: start[0],
        y1: start[1],
        x2: end[0],
        y2: end[1],
        stroke: selected ? stroke : '#343c40',
        strokeWidth: 0.014,
        strokeLinecap: 'round',
      })
    }

    const serviceStart = localPoint(center, BOLLARD_LIGHT_DIMENSIONS.shaftTopRadius * 0.72, 0, angle)
    const serviceEnd = localPoint(center, BOLLARD_LIGHT_DIMENSIONS.capRadius, 0, angle)
    children.push({
      kind: 'line',
      x1: serviceStart[0],
      y1: serviceStart[1],
      x2: serviceEnd[0],
      y2: serviceEnd[1],
      stroke: selected ? stroke : '#161b1e',
      strokeWidth: 0.025,
      strokeLinecap: 'round',
    })
  } else if (projection === 'high-mast') {
    const layout = resolveHighMastCrownLightLayout(node as HighMastCrownLightNode)
    const housingSections = getHighMastHousingSections(layout)
    children.push(
      {
        kind: 'circle',
        cx: x,
        cy: z,
        r: layout.carrierRingRadius,
        fill: node.poleColor ?? '#667178',
        fillOpacity: 0.08,
        stroke,
        strokeWidth: 0.055,
      },
      ...[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((guideAngle) => ({
        kind: 'line' as const,
        x1: x,
        y1: z,
        x2: x + Math.cos(angle + guideAngle) * layout.carrierRingRadius,
        y2: z + Math.sin(angle + guideAngle) * layout.carrierRingRadius,
        stroke,
        strokeWidth: 0.035,
        strokeLinecap: 'round' as const,
      })),
      {
        kind: 'circle',
        cx: x,
        cy: z,
        r: layout.poleTopRadius * 1.25,
        fill: node.poleColor ?? '#667178',
        fillOpacity: 0.92,
        stroke,
        strokeWidth: 0.035,
      },
    )

    for (const crownAngle of highMastCrownAngles()) {
      const direction = angle + crownAngle
      const fixtureCenter = localPoint(center, layout.fixtureCenterRadius, 0, direction)
      const armStart = localPoint(center, layout.carrierRingRadius, 0, direction)
      const armEnd = localPoint(
        center,
        layout.fixtureCenterRadius - layout.fixtureLength * 0.42,
        0,
        direction,
      )
      const housingPoints = [
        ...housingSections.map((section) =>
          localPoint(fixtureCenter, section.x, -section.halfWidth, direction),
        ),
        ...[...housingSections].reverse().map((section) =>
          localPoint(fixtureCenter, section.x, section.halfWidth, direction),
        ),
      ]
      const opticCenter = localPoint(fixtureCenter, layout.fixtureLength * 0.12, 0, direction)
      children.push(
        {
          kind: 'line',
          x1: armStart[0],
          y1: armStart[1],
          x2: armEnd[0],
          y2: armEnd[1],
          stroke,
          strokeWidth: 0.065,
          strokeLinecap: 'round',
        },
        {
          kind: 'polygon',
          points: housingPoints,
          fill: node.poleColor ?? '#667178',
          fillOpacity: 0.86,
          stroke,
          strokeWidth: 0.035,
        },
        rect(
          opticCenter,
          layout.fixtureLength * 0.52,
          layout.fixtureWidth * 0.56,
          direction,
          lampFill,
          stroke,
        ),
      )
    }
  } else if (projection === 'candelabra') {
    const layout = resolveDecorativeCandelabraLayout(node as DecorativeCandelabraLightNode)
    const metalFill = node.poleColor ?? '#25282d'
    const innerWidth = CANDELABRA_LANTERN_WIDTH * 0.62
    const innerDepth = CANDELABRA_LANTERN_DEPTH * 0.62
    children.push(
      { kind: 'circle', cx: x, cy: z, r: layout.baseRadius, fill: metalFill, fillOpacity: 0.2, stroke, strokeWidth: 0.045 },
      { kind: 'circle', cx: x, cy: z, r: layout.shaftTopRadius * 1.25, fill: metalFill, fillOpacity: 0.95, stroke, strokeWidth: 0.03 },
    )

    for (const side of [-1, 1] as const) {
      const direction = angle + (side === 1 ? 0 : Math.PI)
      const end = localPoint(center, side * layout.armSpan, 0, angle)
      const armStart = localPoint(center, side * layout.shaftTopRadius, 0, angle)
      const armShoulder = localPoint(center, side * layout.armSpan * 0.54, side * 0.035, angle)
      children.push(
        { kind: 'line', x1: armStart[0], y1: armStart[1], x2: armShoulder[0], y2: armShoulder[1], stroke, strokeWidth: 0.07, strokeLinecap: 'round' },
        { kind: 'line', x1: armShoulder[0], y1: armShoulder[1], x2: end[0], y2: end[1], stroke, strokeWidth: 0.055, strokeLinecap: 'round' },
        rect(end, CANDELABRA_LANTERN_WIDTH, CANDELABRA_LANTERN_DEPTH, direction, metalFill, stroke),
        rect(end, innerWidth, innerDepth, direction, lampFill, stroke),
      )
    }

    children.push(
      rect(center, CANDELABRA_LANTERN_WIDTH, CANDELABRA_LANTERN_DEPTH, angle, metalFill, stroke),
      rect(center, innerWidth, innerDepth, angle, lampFill, stroke),
    )
  } else if (projection === 'floodlight') {
    const layout = resolveFloodlightPoleLayout(node.height ?? 4, node.armLength ?? 0.9)
    const headCenter = localPoint(center, layout.headCenterX, 0, angle)
    const housingPoints = FLOODLIGHT_HOUSING_PLAN_PROFILE.map(([localX, localZ]) =>
      localPoint(headCenter, localX, localZ, angle),
    )
    const armEnd = localPoint(center, layout.armLength, 0, angle)
    const yokeBack = localPoint(headCenter, -0.4, 0, angle)
    const yokeLeft = localPoint(headCenter, -0.08, -layout.housingWidth * 0.59, angle)
    const yokeRight = localPoint(headCenter, -0.08, layout.housingWidth * 0.59, angle)

    if (node.lightOn) {
      const beamNearLeft = localPoint(headCenter, layout.housingLength / 2, -layout.lensWidth / 2, angle)
      const beamNearRight = localPoint(headCenter, layout.housingLength / 2, layout.lensWidth / 2, angle)
      const beamFarLeft = localPoint(headCenter, layout.housingLength / 2 + 1.15, -0.72, angle)
      const beamFarRight = localPoint(headCenter, layout.housingLength / 2 + 1.15, 0.72, angle)
      children.push({
        kind: 'polygon',
        points: [beamNearLeft, beamFarLeft, beamFarRight, beamNearRight],
        fill: node.lightColor ?? '#fff0c2',
        fillOpacity: 0.14,
        stroke: node.lightColor ?? '#fff0c2',
        strokeWidth: 0.02,
      })
    }

    children.push(
      rect(center, layout.basePlateSize, layout.basePlateSize, angle, node.poleColor ?? '#343a40', stroke),
      {
        kind: 'circle',
        cx: x,
        cy: z,
        r: layout.shaftBottomRadius,
        fill: '#596168',
        fillOpacity: 0.92,
        stroke,
        strokeWidth: 0.03,
      },
      {
        kind: 'line',
        x1: x,
        y1: z,
        x2: armEnd[0],
        y2: armEnd[1],
        stroke,
        strokeWidth: layout.armRadius * 2,
        strokeLinecap: 'round',
      },
      {
        kind: 'line',
        x1: yokeBack[0],
        y1: yokeBack[1],
        x2: yokeLeft[0],
        y2: yokeLeft[1],
        stroke,
        strokeWidth: 0.055,
        strokeLinecap: 'round',
      },
      {
        kind: 'line',
        x1: yokeBack[0],
        y1: yokeBack[1],
        x2: yokeRight[0],
        y2: yokeRight[1],
        stroke,
        strokeWidth: 0.055,
        strokeLinecap: 'round',
      },
      {
        kind: 'polygon',
        points: housingPoints,
        fill: node.poleColor ?? '#343a40',
        fillOpacity: 0.9,
        stroke,
        strokeWidth: 0.04,
      },
      rect(localPoint(headCenter, 0.08, 0, angle), layout.lensLength, layout.lensWidth, angle, lampFill, stroke),
    )
  } else if (projection === 'solar') {
    const layout = resolveSolarStreetLightLayout(node.height ?? 6, node.armLength ?? 1.3)
    const panelLength = SOLAR_STREET_LIGHT_DIMENSIONS.panelEndX - SOLAR_STREET_LIGHT_DIMENSIONS.panelStartX
    const panelCenterX = (SOLAR_STREET_LIGHT_DIMENSIONS.panelStartX + SOLAR_STREET_LIGHT_DIMENSIONS.panelEndX) / 2
    const bodyFill = node.poleColor ?? '#3c4348'

    children.push(
      rect(center, SOLAR_STREET_LIGHT_DIMENSIONS.basePlateSize, SOLAR_STREET_LIGHT_DIMENSIONS.basePlateSize, angle, '#30383d', stroke),
      { kind: 'circle', cx: x, cy: z, r: SOLAR_STREET_LIGHT_DIMENSIONS.poleBottomRadius, fill: bodyFill, fillOpacity: 0.92, stroke, strokeWidth: 0.03 },
    )

    for (const boltX of [-0.155, 0.155]) {
      for (const boltZ of [-0.155, 0.155]) {
        const bolt = localPoint(center, boltX, boltZ, angle)
        children.push({ kind: 'circle', cx: bolt[0], cy: bolt[1], r: 0.033, fill: '#778188', stroke, strokeWidth: 0.016 })
      }
    }

    for (const direction of [angle]) {
      const headCenter = localPoint(center, layout.headX, 0, direction)
      const armEnd = localPoint(center, layout.headX - 0.04, 0, direction)
      const housingPoints = [
        ...SOLAR_STREET_LIGHT_HOUSING_SECTIONS.map((section) => localPoint(headCenter, section.x, -section.halfWidth, direction)),
        ...[...SOLAR_STREET_LIGHT_HOUSING_SECTIONS].reverse().map((section) => localPoint(headCenter, section.x, section.halfWidth, direction)),
      ]

      children.push(
        { kind: 'line', x1: x, y1: z, x2: armEnd[0], y2: armEnd[1], stroke, strokeWidth: SOLAR_STREET_LIGHT_DIMENSIONS.armRadius * 2, strokeLinecap: 'round' },
        { kind: 'polygon', points: housingPoints, fill: bodyFill, fillOpacity: 0.92, stroke, strokeWidth: 0.03 },
        rect(localPoint(headCenter, panelCenterX, 0, direction), panelLength, SOLAR_STREET_LIGHT_DIMENSIONS.panelWidth, direction, '#101d38', stroke),
      )

      for (let column = 1; column < SOLAR_PANEL_COLUMNS; column += 1) {
        const localX = SOLAR_STREET_LIGHT_DIMENSIONS.panelStartX + (panelLength * column) / SOLAR_PANEL_COLUMNS
        const lineStart = localPoint(headCenter, localX, -SOLAR_STREET_LIGHT_DIMENSIONS.panelWidth / 2, direction)
        const lineEnd = localPoint(headCenter, localX, SOLAR_STREET_LIGHT_DIMENSIONS.panelWidth / 2, direction)
        children.push({ kind: 'line', x1: lineStart[0], y1: lineStart[1], x2: lineEnd[0], y2: lineEnd[1], stroke: '#a5b2c7', strokeWidth: 0.009 })
      }
      for (let row = 1; row < SOLAR_PANEL_ROWS; row += 1) {
        const localZ = -SOLAR_STREET_LIGHT_DIMENSIONS.panelWidth / 2 + (SOLAR_STREET_LIGHT_DIMENSIONS.panelWidth * row) / SOLAR_PANEL_ROWS
        const lineStart = localPoint(headCenter, SOLAR_STREET_LIGHT_DIMENSIONS.panelStartX, localZ, direction)
        const lineEnd = localPoint(headCenter, SOLAR_STREET_LIGHT_DIMENSIONS.panelEndX, localZ, direction)
        children.push({ kind: 'line', x1: lineStart[0], y1: lineStart[1], x2: lineEnd[0], y2: lineEnd[1], stroke: '#a5b2c7', strokeWidth: 0.009 })
      }

      const serviceSeamStart = localPoint(headCenter, 0.08, -0.22, direction)
      const serviceSeamEnd = localPoint(headCenter, 0.08, 0.22, direction)
      children.push({ kind: 'line', x1: serviceSeamStart[0], y1: serviceSeamStart[1], x2: serviceSeamEnd[0], y2: serviceSeamEnd[1], stroke: '#252c31', strokeWidth: 0.015 })
    }
  } else if (projection === 'shoebox') {
    const length = node.armLength ?? SHOEBOX_AREA_LIGHT_DIMENSIONS.defaultArmLength
    const baseFill = '#30373c'
    const bodyFill = node.poleColor ?? '#363b40'
    children.push(
      rect(center, SHOEBOX_AREA_LIGHT_DIMENSIONS.basePlateWidth, SHOEBOX_AREA_LIGHT_DIMENSIONS.basePlateWidth, angle, baseFill, stroke),
      rect(center, SHOEBOX_AREA_LIGHT_DIMENSIONS.poleWidth, SHOEBOX_AREA_LIGHT_DIMENSIONS.poleWidth, angle, bodyFill, stroke),
    )

    for (const boltX of [-0.16, 0.16]) {
      for (const boltZ of [-0.16, 0.16]) {
        const bolt = localPoint(center, boltX, boltZ, angle)
        children.push({ kind: 'circle', cx: bolt[0], cy: bolt[1], r: 0.035, fill: '#7b848a', stroke, strokeWidth: 0.018 })
      }
    }

    for (const direction of [angle]) {
      const end = localPoint(center, length, 0, direction)
      const armPoints = [
        localPoint(center, 0.02, -0.075, direction),
        localPoint(center, Math.max(0.16, length - 0.14), -0.055, direction),
        localPoint(center, length + 0.015, -0.075, direction),
        localPoint(center, length + 0.015, 0.075, direction),
        localPoint(center, Math.max(0.16, length - 0.14), 0.055, direction),
        localPoint(center, 0.02, 0.075, direction),
      ]
      const housingPoints = [
        ...SHOEBOX_AREA_LIGHT_HOUSING_SECTIONS.map((section) => localPoint(end, section.x, -section.halfWidth, direction)),
        ...[...SHOEBOX_AREA_LIGHT_HOUSING_SECTIONS].reverse().map((section) => localPoint(end, section.x, section.halfWidth, direction)),
      ]
      children.push(
        { kind: 'polygon', points: armPoints, fill: bodyFill, fillOpacity: 0.9, stroke, strokeWidth: 0.025 },
        { kind: 'polygon', points: housingPoints, fill: bodyFill, fillOpacity: 0.9, stroke, strokeWidth: 0.03 },
        rect(localPoint(end, 0.015, 0, direction), 0.18, 0.19, direction, '#41494f', stroke),
      )

      for (const moduleX of SHOEBOX_AREA_LIGHT_OPTIC_MODULE_CENTERS) {
        children.push(rect(localPoint(end, moduleX, 0, direction), 0.16, 0.25, direction, lampFill, stroke))
      }

      for (const ribZ of SHOEBOX_AREA_LIGHT_HEAT_SINK_Z) {
        const ribStart = localPoint(end, 0.17, ribZ, direction)
        const ribEnd = localPoint(end, 0.66, ribZ, direction)
        children.push({
          kind: 'line',
          x1: ribStart[0],
          y1: ribStart[1],
          x2: ribEnd[0],
          y2: ribEnd[1],
          stroke: selected ? stroke : '#252b2f',
          strokeWidth: 0.012,
          strokeLinecap: 'round',
        })
      }

      const photocell = localPoint(end, 0.015, 0, direction)
      children.push({ kind: 'circle', cx: photocell[0], cy: photocell[1], r: 0.03, fill: '#151a1d', stroke, strokeWidth: 0.015 })
    }
  } else {
    const length = node.armLength ?? 1
    const end: Point = [x + Math.cos(angle) * length, z + Math.sin(angle) * length]
    children.push(
      { kind: 'circle', cx: x, cy: z, r: 0.2, fill: node.poleColor ?? '#363b40', stroke, strokeWidth: 0.035 },
      { kind: 'line', x1: x, y1: z, x2: end[0], y2: end[1], stroke, strokeWidth: 0.05, strokeLinecap: 'round' },
      rect(end, 0.62, 0.32, angle, lampFill, stroke),
    )
  }
  if (selected) children.push({ kind: 'move-handle', point: [x, z] })
  return { kind: 'group', children }
}
