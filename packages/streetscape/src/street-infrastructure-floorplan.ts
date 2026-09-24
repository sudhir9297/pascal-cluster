import type { FloorplanGeometry, GeometryContext } from '@pascal-app/core'
import type {
  DrainageInletNode,
  DrivewayNode,
  FireHydrantNode,
  ManholeCoverNode,
  TrafficSignalNode,
  TrafficBollardNode,
  RoadBarrierNode,
  ResidentialGateNode,
} from './schema'
import { resolveDrivewayGateOpenPose } from './driveway-gate-operation'
import { isResidentialRoadAssetKind, type StreetInfrastructureNode } from './street-infrastructure-config'
import {
  TRAFFIC_SIGNAL_DIMENSIONS,
  buildDrivewayPlan,
  resolveDrainageInletLayout,
  resolveFireHydrantLayout,
  resolveFireHydrantOutletLayout,
  resolveManholeCoverLayout,
  resolveTrafficSignalLayout,
  resolveTrafficBollardLayout,
  resolveRoadBarrierLayout,
  resolveResidentialRoadAssetLayout,
} from './street-infrastructure-geometry'

type Point = readonly [number, number]

const MANHOLE_RADIAL_ANGLES = Array.from({ length: 24 }, (_, index) => (index * Math.PI * 2) / 24)
const MANHOLE_GRID_OFFSETS = [-0.72, -0.48, -0.24, 0, 0.24, 0.48, 0.72] as const
const MANHOLE_RING_FACTORS = [0.84, 0.64, 0.44] as const

function localPoint(origin: Point, x: number, z: number, angle: number): Point {
  return [
    origin[0] + x * Math.cos(angle) + z * Math.sin(angle),
    origin[1] - x * Math.sin(angle) + z * Math.cos(angle),
  ]
}

function rectangle(
  center: Point,
  width: number,
  depth: number,
  angle: number,
  fill: string,
  stroke: string,
): FloorplanGeometry {
  const halfWidth = width / 2
  const halfDepth = depth / 2
  return {
    kind: 'polygon',
    points: [
      localPoint(center, -halfWidth, -halfDepth, angle),
      localPoint(center, halfWidth, -halfDepth, angle),
      localPoint(center, halfWidth, halfDepth, angle),
      localPoint(center, -halfWidth, halfDepth, angle),
    ],
    fill,
    fillOpacity: 0.78,
    stroke,
    strokeWidth: 0.035,
  }
}

function trafficSignalColor(signal: TrafficSignalNode, color: 'red' | 'yellow' | 'green') {
  return signal[`${color}Color`] ?? {
    red: '#f13b32',
    yellow: '#ffc338',
    green: '#35c76d',
  }[color]
}

function trafficSignalSectionIsActive(
  signal: TrafficSignalNode,
  section: { color: 'red' | 'yellow' | 'green'; shape: 'circular' | 'arrow' },
  sections: readonly { color: 'red' | 'yellow' | 'green'; shape: 'circular' | 'arrow' }[],
) {
  const hasCircular = (color: 'yellow' | 'green') => sections.some(
    (candidate) => candidate.color === color && candidate.shape === 'circular',
  )
  const hasArrow = (color: 'yellow' | 'green') => sections.some(
    (candidate) => candidate.color === color && candidate.shape === 'arrow',
  )
  if (signal.signalState === 'red') return section.color === 'red'
  if (signal.signalState === 'yellow') {
    return section.color === 'yellow' && (section.shape === 'circular' || !hasCircular('yellow'))
  }
  if (signal.signalState === 'flashing-yellow') return section.color === 'yellow'
  if (signal.signalState === 'green') {
    return section.color === 'green' && (section.shape === 'circular' || !hasCircular('green'))
  }
  if (signal.signalState === 'green-arrow') {
    return section.color === 'green' && (section.shape === 'arrow' || !hasArrow('green'))
  }
  return false
}

export function buildStreetInfrastructureFloorplan(
  node: StreetInfrastructureNode,
  ctx: GeometryContext,
): FloorplanGeometry {
  const [x, , z] = node.position ?? [0, 0, 0]
  const center: Point = [x, z]
  const angle = node.rotation?.[1] ?? 0
  const selected = ctx.viewState?.selected ?? false
  const stroke = selected
    ? (ctx.viewState?.palette?.selectedStroke ?? '#2563eb')
    : '#394247'
  const children: FloorplanGeometry[] = []

  if (isResidentialRoadAssetKind(node.type)) {
    const layout = resolveResidentialRoadAssetLayout(node as never)
    const residentialNode = node as Extract<StreetInfrastructureNode, { bodyColor: string; accentColor: string }>
    const fill = residentialNode.bodyColor
    const accent = residentialNode.accentColor
    const kind = node.type
    if (kind === 'streetscape:speed-hump') {
      const legacyPalette = fill === '#5a5b58' && accent === '#e7dfb9'
      const rubber = legacyPalette ? '#25282b' : fill
      const yellow = legacyPalette ? '#f2b632' : accent
      const moduleCount = Math.max(3, Math.round(layout.width / Math.max(layout.length, 0.1)))
      const moduleWidth = layout.width / moduleCount
      for (let index = 0; index < moduleCount; index += 1) {
        const moduleCenter = localPoint(
          center,
          -layout.width / 2 + moduleWidth * (index + 0.5),
          0,
          angle,
        )
        children.push(rectangle(
          moduleCenter,
          moduleWidth * 0.985,
          layout.length,
          angle,
          index % 2 === 0 ? rubber : yellow,
          stroke,
        ))
      }
    } else if (kind === 'streetscape:driveway') {
      const drivewayPlan = buildDrivewayPlan(node as DrivewayNode)
      children.push({
        kind: 'polygon',
        points: drivewayPlan.outline.map(([localX, localZ]) => (
          localPoint(center, localX, localZ, angle)
        )),
        fill,
        fillOpacity: 0.78,
        stroke,
        strokeWidth: 0.035,
      })
      for (const edge of [drivewayPlan.leftEdge, drivewayPlan.rightEdge]) {
        for (let index = 1; index < edge.length; index += 1) {
          const start = localPoint(center, edge[index - 1]![0], edge[index - 1]![1], angle)
          const end = localPoint(center, edge[index]![0], edge[index]![1], angle)
          children.push({ kind: 'line', x1: start[0], y1: start[1], x2: end[0], y2: end[1], stroke: accent, strokeWidth: 0.04 })
        }
      }
    } else if (kind === 'streetscape:residential-gate') {
      const gate = node as ResidentialGateNode
      const pose = resolveDrivewayGateOpenPose(gate.operationState)
      if (pose.openProgress < 0.01) {
        children.push(rectangle(center, layout.width, layout.length, angle, fill, stroke))
      }
      for (const side of [-1, 1]) {
        const post = localPoint(center, side * (layout.width / 2 - 0.06), 0, angle)
        children.push({ kind: 'circle', cx: post[0], cy: post[1], r: 0.07, fill: accent, stroke, strokeWidth: 0.02 })
      }
      for (const side of [-1, 1]) {
        const hingeX = side * layout.width * 0.43
        const leafAngle = side < 0 ? pose.leftLeafAngle : pose.rightLeafAngle
        const closedLeafX = -hingeX
        const endX = hingeX + closedLeafX * Math.cos(leafAngle)
        const endZ = -closedLeafX * Math.sin(leafAngle)
        const hinge = localPoint(center, hingeX, 0, angle)
        const leafEnd = localPoint(center, endX, endZ, angle)
        children.push({ kind: 'line', x1: hinge[0], y1: hinge[1], x2: leafEnd[0], y2: leafEnd[1], stroke: accent, strokeWidth: 0.045 })
        if (side < 0) {
          children.push({ kind: 'circle', cx: leafEnd[0], cy: leafEnd[1], r: 0.045, fill: accent, stroke, strokeWidth: 0.018 })
        }
      }
    } else if (kind === 'streetscape:trash-bin' || kind === 'streetscape:recycling-bin') {
      children.push(rectangle(center, layout.width * 0.98, layout.length * 0.98, angle, fill, stroke))
      children.push(rectangle(center, layout.width * 0.9, layout.length * 0.88, angle, fill, accent))
      for (const side of [-1, 1]) {
        for (const end of kind === 'streetscape:trash-bin' ? [-1, 1] : [1]) {
          const wheel = localPoint(center, side * layout.width * 0.4, end * layout.length * 0.33, angle)
          children.push({ kind: 'circle', cx: wheel[0], cy: wheel[1], r: Math.min(layout.width, layout.length) * 0.075, fill: '#171918', stroke, strokeWidth: 0.015 })
        }
      }
      const hingeStart = localPoint(center, -layout.width * 0.34, layout.length * 0.36, angle)
      const hingeEnd = localPoint(center, layout.width * 0.34, layout.length * 0.36, angle)
      children.push({ kind: 'line', x1: hingeStart[0], y1: hingeStart[1], x2: hingeEnd[0], y2: hingeEnd[1], stroke: accent, strokeWidth: 0.03 })
      const handleStart = localPoint(center, -layout.width * 0.31, layout.length * 0.485, angle)
      const handleEnd = localPoint(center, layout.width * 0.31, layout.length * 0.485, angle)
      children.push({ kind: 'line', x1: handleStart[0], y1: handleStart[1], x2: handleEnd[0], y2: handleEnd[1], stroke: accent, strokeWidth: 0.035, strokeLinecap: 'round' })
      const labelStart = localPoint(center, -layout.width * 0.16, -layout.length * 0.42, angle)
      const labelEnd = localPoint(center, layout.width * 0.16, -layout.length * 0.42, angle)
      children.push({ kind: 'line', x1: labelStart[0], y1: labelStart[1], x2: labelEnd[0], y2: labelEnd[1], stroke: '#d5d8c8', strokeWidth: 0.025 })
      if (kind === 'streetscape:recycling-bin') {
        const points = [0, 1, 2].map((index) => {
          const markAngle = -Math.PI / 2 + index * (Math.PI * 2 / 3)
          return localPoint(center, Math.cos(markAngle) * layout.width * 0.18, Math.sin(markAngle) * layout.length * 0.18, angle)
        })
        for (let index = 0; index < points.length; index += 1) {
          const start = points[index]!
          const end = points[(index + 1) % points.length]!
          children.push({ kind: 'line', x1: start[0], y1: start[1], x2: end[0], y2: end[1], stroke: accent, strokeWidth: 0.032, strokeLinecap: 'round' })
        }
      }
    } else if (kind === 'streetscape:mailbox') {
      children.push(rectangle(center, layout.width, layout.length, angle, fill, stroke))
      children.push({ kind: 'circle', cx: x, cy: z, r: Math.min(layout.width, layout.length) * 0.16, fill: accent, stroke, strokeWidth: 0.02 })
      for (const offset of [-0.42, 0.42]) {
        const start = localPoint(center, -layout.width * 0.42, offset * layout.length, angle)
        const end = localPoint(center, layout.width * 0.42, offset * layout.length, angle)
        children.push({ kind: 'line', x1: start[0], y1: start[1], x2: end[0], y2: end[1], stroke: accent, strokeWidth: 0.025 })
      }
      const flagStart = localPoint(center, layout.width * 0.28, 0, angle)
      const flagEnd = localPoint(center, layout.width * 0.28, -layout.length * 0.35, angle)
      children.push({ kind: 'line', x1: flagStart[0], y1: flagStart[1], x2: flagEnd[0], y2: flagEnd[1], stroke: accent, strokeWidth: 0.035, strokeLinecap: 'round' })
    } else if (kind === 'streetscape:parcel-box') {
      children.push(rectangle(center, layout.width, layout.length, angle, fill, stroke))
      const lock = localPoint(center, 0, -layout.length * 0.5, angle)
      children.push({ kind: 'circle', cx: lock[0], cy: lock[1], r: Math.min(layout.width, layout.length) * 0.12, fill: accent, stroke, strokeWidth: 0.02 })
      const doorStart = localPoint(center, -layout.width * 0.4, -layout.length * 0.44, angle)
      const doorEnd = localPoint(center, layout.width * 0.4, -layout.length * 0.44, angle)
      children.push({ kind: 'line', x1: doorStart[0], y1: doorStart[1], x2: doorEnd[0], y2: doorEnd[1], stroke: accent, strokeWidth: 0.03 })
    } else {
      children.push(rectangle(center, layout.width, layout.length, angle, fill, stroke))
    }
    if (selected) children.push({ kind: 'move-handle', point: center })
    return { kind: 'group', children }
  }

  if ((node.type as string) === 'streetscape:traffic-signal') {
    const signal = node as TrafficSignalNode
    const layout = resolveTrafficSignalLayout(signal)
    children.push({
      kind: 'circle',
      cx: x,
      cy: z,
      r: TRAFFIC_SIGNAL_DIMENSIONS.baseRadius,
      fill: signal.poleColor,
      stroke,
      strokeWidth: 0.04,
    })
    if (signal.mount === 'mast-arm') {
      const armEnd = localPoint(center, layout.armReach, 0, angle)
      children.push({
        kind: 'line',
        x1: x,
        y1: z,
        x2: armEnd[0],
        y2: armEnd[1],
        stroke: signal.poleColor,
        strokeWidth: 0.09,
        strokeLinecap: 'round',
      })
      children.push({
        kind: 'circle',
        cx: armEnd[0],
        cy: armEnd[1],
        r: 0.085,
        fill: '#252a2c',
        stroke,
        strokeWidth: 0.025,
      })
    } else if (signal.mount === 'post') {
      const postHead = layout.faceCenters[0]!
      const headPoint = localPoint(center, postHead[0], postHead[2], angle)
      children.push({
        kind: 'line',
        x1: x,
        y1: z,
        x2: headPoint[0],
        y2: headPoint[1],
        stroke: signal.poleColor,
        strokeWidth: 0.07,
        strokeLinecap: 'round',
      })
    } else if (signal.mount === 'span-wire') {
      const secondPole = localPoint(center, layout.armReach, 0, angle)
      children.push({
        kind: 'circle',
        cx: secondPole[0],
        cy: secondPole[1],
        r: TRAFFIC_SIGNAL_DIMENSIONS.baseRadius,
        fill: signal.poleColor,
        stroke,
        strokeWidth: 0.04,
      })
      children.push({
        kind: 'line',
        x1: x,
        y1: z,
        x2: secondPole[0],
        y2: secondPole[1],
        stroke: '#24292b',
        strokeWidth: 0.035,
        strokeLinecap: 'round',
      })
    }
    for (const faceCenter of layout.faceCenters) {
      const facePlanCenter = localPoint(center, faceCenter[0], faceCenter[2], angle)
      children.push(
        rectangle(
          facePlanCenter,
          layout.head.width + TRAFFIC_SIGNAL_DIMENSIONS.backplateMargin * 2,
          0.32,
          angle,
          '#090b0c',
          stroke,
        ),
      )
      children.push(
        rectangle(
          facePlanCenter,
          layout.head.width,
          TRAFFIC_SIGNAL_DIMENSIONS.faceDepth,
          angle,
          signal.housingColor,
          stroke,
        ),
      )
      if (signal.mount !== 'post') {
        const hangerOffset = Math.min(
          TRAFFIC_SIGNAL_DIMENSIONS.hangerOffset,
          layout.head.width * 0.25,
        )
        for (const offset of [-hangerOffset, hangerOffset]) {
          const hanger = localPoint(center, faceCenter[0] + offset, faceCenter[2], angle)
          children.push({
            kind: 'circle',
            cx: hanger[0],
            cy: hanger[1],
            r: 0.035,
            fill: signal.poleColor,
            stroke,
            strokeWidth: 0.018,
          })
        }
      }
      for (const section of layout.head.sections) {
        const sectionCenter = localPoint(
          center,
          faceCenter[0] + section.x,
          faceCenter[2] - (section.y / layout.head.height) * 0.12,
          angle,
        )
        const sectionColor = trafficSignalColor(signal, section.color)
        children.push({
          kind: 'circle',
          cx: sectionCenter[0],
          cy: sectionCenter[1],
          r: 0.045,
          fill: sectionColor,
          fillOpacity: trafficSignalSectionIsActive(signal, section, layout.head.sections) ? 0.9 : 0.22,
          stroke,
          strokeWidth: 0.018,
        })
        if (section.shape === 'arrow') {
          const arrowTip = localPoint(
            center,
            faceCenter[0] + section.x + 0.075,
            faceCenter[2] - (section.y / layout.head.height) * 0.12,
            angle,
          )
          children.push({
            kind: 'line',
            x1: sectionCenter[0],
            y1: sectionCenter[1],
            x2: arrowTip[0],
            y2: arrowTip[1],
            stroke: sectionColor,
            strokeWidth: 0.025,
            strokeLinecap: 'round',
          })
        }
      }
    }
    if (signal.cabinet) {
      children.push(
        rectangle(
          localPoint(center, -0.48, 0, angle),
          TRAFFIC_SIGNAL_DIMENSIONS.cabinetWidth,
          TRAFFIC_SIGNAL_DIMENSIONS.cabinetDepth,
          angle,
          '#8a9292',
          stroke,
        ),
      )
    }
  } else if ((node.type as string) === 'streetscape:drainage-inlet') {
    const inlet = node as DrainageInletNode
    const layout = resolveDrainageInletLayout(inlet)
    const curbSide = inlet.roadAttachment?.side === 'right' ? -1 : 1
    if (layout.hasSurfaceGrate) {
      children.push(rectangle(center, layout.length + 0.16, layout.width + 0.16, angle, '#767b76', stroke))
      children.push(rectangle(center, layout.length, layout.width, angle, inlet.metalColor, stroke))
      children.push(rectangle(center, layout.innerLength, layout.innerWidth, angle, '#111718', stroke))
      for (const bar of layout.bars) {
        const barCenter = localPoint(center, bar.x, bar.z, angle)
        children.push(rectangle(barCenter, bar.width, bar.length, angle + bar.rotationY, '#252b2c', stroke))
      }
    }
    if (layout.hasCurbOpening) {
      const curbCenter = localPoint(center, layout.curbOpeningOffsetX, curbSide * layout.curbCenterZ, angle)
      children.push(rectangle(curbCenter, layout.curbOpeningLength + layout.curbDepth, layout.curbDepth, angle, '#8b8c87', stroke))
      children.push(
        rectangle(
          localPoint(center, layout.curbOpeningOffsetX, curbSide * (layout.curbCenterZ - layout.curbDepth / 2 - 0.006), angle),
          layout.curbOpeningLength,
          0.032,
          angle,
          '#141a1b',
          stroke,
        ),
      )
    }
  } else if ((node.type as string) === 'streetscape:manhole-cover') {
    const cover = node as ManholeCoverNode
    const layout = resolveManholeCoverLayout(cover)
    children.push({
      kind: 'circle',
      cx: x,
      cy: z,
      r: layout.frameRadius,
      fill: '#343938',
      fillOpacity: 0.92,
      stroke,
      strokeWidth: 0.04,
    })
    children.push({
      kind: 'circle',
      cx: x,
      cy: z,
      r: layout.radius * 0.96,
      fill: cover.metalColor,
      fillOpacity: 0.94,
      stroke: '#252a29',
      strokeWidth: 0.025,
    })
    children.push({
      kind: 'circle',
      cx: x,
      cy: z,
      r: layout.rimRadius,
      fill: 'none',
      stroke: '#272d2b',
      strokeWidth: 0.035,
    })
    if (cover.treadPattern === 'radial') {
      for (const treadAngle of MANHOLE_RADIAL_ANGLES) {
        const start = localPoint(center, Math.cos(treadAngle) * layout.radius * 0.16, Math.sin(treadAngle) * layout.radius * 0.16, angle)
        const end = localPoint(center, Math.cos(treadAngle) * layout.radius * 0.76, Math.sin(treadAngle) * layout.radius * 0.76, angle)
        children.push({
          kind: 'line',
          x1: start[0],
          y1: start[1],
          x2: end[0],
          y2: end[1],
          stroke: '#303534',
          strokeWidth: 0.022,
          strokeLinecap: 'round',
        })
      }
    } else if (cover.treadPattern === 'grid') {
      for (const offset of MANHOLE_GRID_OFFSETS) {
        const position = offset * layout.treadRadius
        const span = Math.sqrt(Math.max(0, layout.treadRadius ** 2 - position ** 2)) * 2
        const xStart = localPoint(center, position, -span / 2, angle)
        const xEnd = localPoint(center, position, span / 2, angle)
        const zStart = localPoint(center, -span / 2, position, angle)
        const zEnd = localPoint(center, span / 2, position, angle)
        children.push(
          { kind: 'line', x1: xStart[0], y1: xStart[1], x2: xEnd[0], y2: xEnd[1], stroke: '#303534', strokeWidth: 0.022 },
          { kind: 'line', x1: zStart[0], y1: zStart[1], x2: zEnd[0], y2: zEnd[1], stroke: '#303534', strokeWidth: 0.022 },
        )
      }
    } else {
      for (const factor of MANHOLE_RING_FACTORS) {
        children.push({
          kind: 'circle',
          cx: x,
          cy: z,
          r: layout.radius * factor,
          fill: 'none',
          stroke: '#303534',
          strokeWidth: 0.025,
        })
      }
    }
    children.push({
      kind: 'circle',
      cx: x,
      cy: z,
      r: layout.centerReliefRadius,
      fill: '#3b403f',
      stroke,
      strokeWidth: 0.018,
    })
    for (const side of [-1, 1]) {
      const slot = localPoint(center, side * layout.radius * 0.58, 0, angle)
      children.push(rectangle(slot, 0.065, 0.024, angle + Math.PI / 2, '#1f2423', stroke))
    }
  } else if ((node.type as string) === 'streetscape:traffic-bollard') {
    const bollard = node as TrafficBollardNode
    const layout = resolveTrafficBollardLayout(bollard)
    children.push({
      kind: 'circle',
      cx: x,
      cy: z,
      r: layout.baseRadius,
      fill: bollard.baseColor,
      fillOpacity: 0.82,
      stroke,
      strokeWidth: 0.04,
    })
    children.push({
      kind: 'circle',
      cx: x,
      cy: z,
      r: layout.radius,
      fill: bollard.bodyColor,
      fillOpacity: 0.94,
      stroke,
      strokeWidth: 0.03,
    })
    children.push({
      kind: 'circle',
      cx: x,
      cy: z,
      r: layout.radius * 0.62,
      fill: bollard.reflectiveColor,
      fillOpacity: 0.9,
      stroke: bollard.reflectiveColor,
      strokeWidth: 0.02,
    })
  } else if ((node.type as string) === 'streetscape:road-barrier') {
    const barrier = node as RoadBarrierNode
    const layout = resolveRoadBarrierLayout(barrier)
    children.push(rectangle(center, layout.length, layout.width, angle, barrier.bodyColor, stroke))
    children.push(rectangle(center, layout.length * 0.78, layout.width + 0.012, angle, barrier.accentColor, stroke))
    if (barrier.barrierType === 'guardrail' || barrier.barrierType === 'crowd-control') {
      const postRadius = layout.postRadius
      for (const offset of [-layout.length / 2 + postRadius, layout.length / 2 - postRadius]) {
        children.push({
          kind: 'circle',
          cx: localPoint(center, offset, 0, angle)[0],
          cy: localPoint(center, offset, 0, angle)[1],
          r: postRadius,
          fill: barrier.metalColor,
          stroke,
          strokeWidth: 0.025,
        })
      }
    }
  } else {
    const hydrant = node as FireHydrantNode
    const layout = resolveFireHydrantLayout(hydrant)
    const outletLayouts = resolveFireHydrantOutletLayout(hydrant, layout)
    children.push({
      kind: 'circle',
      cx: x,
      cy: z,
      r: layout.padRadius,
      fill: '#b7b3aa',
      fillOpacity: 0.38,
      stroke,
      strokeWidth: 0.025,
    })
    children.push({
      kind: 'circle',
      cx: x,
      cy: z,
      r: layout.flangeRadius,
      fill: hydrant.bodyColor,
      fillOpacity: 0.88,
      stroke,
      strokeWidth: 0.04,
    })
    children.push({
      kind: 'circle',
      cx: x,
      cy: z,
      r: layout.barrelRadius,
      fill: hydrant.bodyColor,
      fillOpacity: 0.95,
      stroke: '#542826',
      strokeWidth: 0.025,
    })
    for (const boltAngle of Array.from({ length: 8 }, (_, index) => (index * Math.PI * 2) / 8)) {
      const bolt = localPoint(
        center,
        Math.cos(boltAngle) * layout.flangeRadius * 0.78,
        Math.sin(boltAngle) * layout.flangeRadius * 0.78,
        angle,
      )
      children.push({
        kind: 'circle',
        cx: bolt[0],
        cy: bolt[1],
        r: 0.022 * layout.scale,
        fill: '#5d2a25',
        stroke,
        strokeWidth: 0.012,
      })
    }
    if (!layout.isWetBarrel) {
      children.push({
        kind: 'circle',
        cx: x,
        cy: z,
        r: layout.stemNutRadius,
        fill: hydrant.capColor,
        stroke,
        strokeWidth: 0.02,
      })
    }
    for (const outlet of outletLayouts) {
      const outletCenter = localPoint(
        center,
        Math.cos(outlet.angle) * layout.barrelRadius * 1.12,
        Math.sin(outlet.angle) * layout.barrelRadius * 1.12,
        angle,
      )
      const outletStart = localPoint(
        center,
        Math.cos(outlet.angle) * layout.barrelRadius * 0.65,
        Math.sin(outlet.angle) * layout.barrelRadius * 0.65,
        angle,
      )
      children.push({
        kind: 'line',
        x1: outletStart[0],
        y1: outletStart[1],
        x2: outletCenter[0],
        y2: outletCenter[1],
        stroke: hydrant.bodyColor,
        strokeWidth: outlet.radius * 1.25,
        strokeLinecap: 'round',
      })
      children.push({
        kind: 'circle',
        cx: outletCenter[0],
        cy: outletCenter[1],
        r: outlet.radius * 0.82,
        fill: hydrant.capColor,
        stroke: hydrant.bodyColor,
        strokeWidth: 0.028,
      })
      children.push({
        kind: 'circle',
        cx: outletCenter[0],
        cy: outletCenter[1],
        r: outlet.radius * 0.18,
        fill: '#303738',
        stroke,
        strokeWidth: 0.012,
      })
    }
  }

  if (selected) children.push({ kind: 'move-handle', point: center })
  return { kind: 'group', children }
}
