import type { FloorplanGeometry, GeometryContext } from '@pascal-app/core'
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
  getHighMastHousingSections,
  highMastCrownAngles,
  resolveHighMastCrownLightLayout,
} from './high-mast-crown-light-geometry'
import type { HighMastCrownLightNode } from './schema'
import {
  resolveSolarStreetLightLayout,
  SOLAR_PANEL_COLUMNS,
  SOLAR_PANEL_ROWS,
  SOLAR_STREET_LIGHT_DIMENSIONS,
  SOLAR_STREET_LIGHT_HOUSING_SECTIONS,
} from './solar-street-light-geometry'

type Point = readonly [number, number]

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

export function buildCatalogLampFloorplan(node: CatalogLampNode, ctx: GeometryContext): FloorplanGeometry {
  const [x, , z] = node.position ?? [0, 0, 0]
  const center: Point = [x, z]
  const projection = resolveCatalogLampProjection(node.type as string, node.visualStyle) ?? 'shoebox'
  const angle = node.rotation?.[1] ?? 0
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
    const half = (node.armLength ?? 6) / 2
    children.push(
      { kind: 'line', x1: x - half, y1: z, x2: x + half, y2: z, stroke, strokeWidth: 0.055, strokeLinecap: 'round' },
      { kind: 'circle', cx: x, cy: z, r: 0.28, fill: lampFill, fillOpacity: 0.8, stroke, strokeWidth: 0.035 },
    )
  } else if (projection === 'wall-pack' || projection === 'wall-arm') {
    children.push(rect(center, projection === 'wall-pack' ? 0.32 : (node.armLength ?? 1.4) + 0.2, projection === 'wall-pack' ? 0.5 : 0.2, angle, lampFill, stroke))
  } else if (projection === 'bollard' || projection === 'path' || projection === 'globe') {
    children.push({ kind: 'circle', cx: x, cy: z, r: projection === 'bollard' ? 0.16 : 0.12, fill: lampFill, fillOpacity: 0.8, stroke, strokeWidth: 0.035 })
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
    const count = 3
    children.push({ kind: 'circle', cx: x, cy: z, r: 0.24, fill: node.poleColor ?? '#363b40', stroke, strokeWidth: 0.035 })
    for (let index = 0; index < count; index += 1) {
      const direction = angle + (index * Math.PI * 2) / count
      const end: Point = [x + Math.cos(direction) * (node.armLength ?? 1), z + Math.sin(direction) * (node.armLength ?? 1)]
      children.push(
        { kind: 'line', x1: x, y1: z, x2: end[0], y2: end[1], stroke, strokeWidth: 0.05, strokeLinecap: 'round' },
        { kind: 'circle', cx: end[0], cy: end[1], r: 0.18, fill: lampFill, fillOpacity: 0.78, stroke, strokeWidth: 0.035 },
      )
    }
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
      rect(end, projection === 'tunnel' ? 1.2 : 0.62, 0.32, angle, lampFill, stroke),
    )
  }
  if (selected) children.push({ kind: 'move-handle', point: [x, z] })
  return { kind: 'group', children }
}
