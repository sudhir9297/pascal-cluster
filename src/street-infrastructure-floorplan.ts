import type { FloorplanGeometry, GeometryContext } from '@pascal-app/core'
import type {
  DrainageInletNode,
  FireHydrantNode,
  ManholeCoverNode,
  TrafficSignalNode,
} from './schema'
import type { StreetInfrastructureNode } from './street-infrastructure-config'
import {
  TRAFFIC_SIGNAL_DIMENSIONS,
  resolveDrainageInletLayout,
  resolveFireHydrantLayout,
  resolveFireHydrantOutletLayout,
  resolveManholeCoverLayout,
  resolveTrafficSignalLayout,
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

  if ((node.type as string) === 'environment:traffic-signal') {
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
  } else if ((node.type as string) === 'environment:drainage-inlet') {
    const inlet = node as DrainageInletNode
    const layout = resolveDrainageInletLayout(inlet)
    children.push(rectangle(center, layout.length + 0.09, layout.width + 0.09, angle, inlet.metalColor, stroke))
    for (const bar of layout.bars) {
      const barCenter = localPoint(center, bar.x, bar.z, angle)
      children.push(rectangle(barCenter, bar.width, bar.length, angle + bar.rotationY, '#252b2c', stroke))
    }
  } else if ((node.type as string) === 'environment:manhole-cover') {
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
