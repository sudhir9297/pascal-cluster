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
  resolveManholeCoverLayout,
  resolveTrafficSignalLayout,
} from './street-infrastructure-geometry'

type Point = readonly [number, number]

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
      fill: cover.metalColor,
      fillOpacity: 0.82,
      stroke,
      strokeWidth: 0.04,
    })
    children.push({
      kind: 'circle',
      cx: x,
      cy: z,
      r: layout.reliefRadius,
      fill: 'none',
      stroke: '#262b2a',
      strokeWidth: 0.025,
    })
  } else {
    const hydrant = node as FireHydrantNode
    const layout = resolveFireHydrantLayout(hydrant)
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
    if (hydrant.protectiveGuards) {
      for (const side of [-1, 1]) {
        const guard = localPoint(center, side * layout.guardOffset, 0.15 * layout.scale, angle)
        children.push({
          kind: 'circle',
          cx: guard[0],
          cy: guard[1],
          r: 0.065 * layout.scale,
          fill: '#e2aa2e',
          stroke,
          strokeWidth: 0.025,
        })
      }
    }
  }

  if (selected) children.push({ kind: 'move-handle', point: center })
  return { kind: 'group', children }
}
