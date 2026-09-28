import type { FloorplanGeometry, GeometryContext } from '@pascal-app/core'
import { classifyRoadJunction } from './road-network-topology'
import { buildRoadCurbCornerHandles } from './road-network-corner-editing'
import { buildRoadNetworkMarkings } from './road-network-markings'
import { buildRoadJunctionBands, roadCarriagewayWidth, ROAD_SIDE_COMPONENT_SPECS } from './road-cross-section'
import {
  buildRoadTransitionProfiles,
  type RoadTransitionSample,
} from './road-transition-profile'
import {
  buildJunctionBoundaryGeometry,
  buildJunctionBoundarySidewalkGeometry,
  roadTerminalEnds,
  sampleRoadEdgePoints,
} from './road-network-geometry'
import type { RoadGraphEdge, RoadNetworkNode, RoadStylePreset } from './schema'
import { DEFAULT_ROAD_STYLE_PRESETS } from './road-style-presets'
import { roadValidationIssuePoint, validateRoadGraph } from './road-network-validation'
import {
  buildManualRoadJunctionBand,
  buildManualRoadJunctionBoundary,
} from './road-junction-boundary-editor'
import {
  buildRoadsideComponentSurfacePolygons,
} from './roadside-openings'

type PlanPoint = readonly [number, number]

function resolveStyle(node: RoadNetworkNode, edge: RoadGraphEdge): RoadStylePreset | undefined {
  const styleId = node.applyStyleToAll ? node.activeStyleId : edge.styleId
  return (
    node.stylePresets[styleId] ??
    (DEFAULT_ROAD_STYLE_PRESETS[styleId as keyof typeof DEFAULT_ROAD_STYLE_PRESETS] as
      | RoadStylePreset
      | undefined) ??
    node.stylePresets[node.activeStyleId]
  )
}

function profileOffsetPoint(
  samples: RoadTransitionSample[],
  index: number,
  offset: number,
): PlanPoint {
  const sample = samples[index]!
  const previous = samples[Math.max(0, index - 1)]!
  const next = samples[Math.min(samples.length - 1, index + 1)]!
  const dx = next.point[0] - previous.point[0]
  const dy = next.point[2] - previous.point[2]
  const length = Math.max(Math.hypot(dx, dy), 1e-6)
  return [
    sample.point[0] - dy / length * offset,
    sample.point[2] + dx / length * offset,
  ]
}

export function buildRoadNetworkFloorplan(
  node: RoadNetworkNode,
  ctx: GeometryContext,
): FloorplanGeometry {
  const selected = ctx.viewState?.selected ?? false
  const stroke = selected
    ? (ctx.viewState?.palette.selectedStroke ?? '#2563eb')
    : '#272a2d'
  const children: FloorplanGeometry[] = []
  for (const profile of buildRoadTransitionProfiles(node)) {
    const samples = profile.samples
    for (let index = 0; index < samples.length - 1; index++) {
      const start = samples[index]!
      const end = samples[index + 1]!
      children.push({
        kind: 'polygon',
        points: [
          profileOffsetPoint(samples, index, start.carriagewayHalfWidth),
          profileOffsetPoint(samples, index + 1, end.carriagewayHalfWidth),
          profileOffsetPoint(samples, index + 1, -end.carriagewayHalfWidth),
          profileOffsetPoint(samples, index, -start.carriagewayHalfWidth),
        ],
        fill: profile.style.surfaceColor,
        stroke,
        strokeWidth: selected ? 0.09 : 0.04,
        strokeLinejoin: 'round',
      })
      children.push({
        kind: 'hit-line',
        x1: start.point[0],
        y1: start.point[2],
        x2: end.point[0],
        y2: end.point[2],
        strokeWidthPx: 16,
      })
    }
    for (const side of ['left', 'right'] as const) {
      for (const spec of ROAD_SIDE_COMPONENT_SPECS) {
        const shapedPolygons = buildRoadsideComponentSurfacePolygons(
          node,
          profile,
          side,
          spec.kind,
          spec.elevationOffset,
        )
        if (shapedPolygons) {
          for (const polygon of shapedPolygons) {
            children.push({
              kind: 'polygon',
              points: polygon.points.map((point) => [point[0], point[2]]),
              fill: spec.color,
              stroke: spec.color,
              strokeWidth: 0,
              strokeLinejoin: 'round',
            })
          }
          continue
        }
        for (let index = 0; index < samples.length - 1; index++) {
          const start = samples[index]!
          const end = samples[index + 1]!
            const startBounds = start.components[side][spec.kind]
            const endBounds = end.components[side][spec.kind]
            if (startBounds.width <= 1e-4 && endBounds.width <= 1e-4) continue
            const sign = side === 'left' ? 1 : -1
            children.push({
              kind: 'polygon',
              points: [
                profileOffsetPoint(samples, index, sign * startBounds.outerOffset),
                profileOffsetPoint(samples, index + 1, sign * endBounds.outerOffset),
                profileOffsetPoint(samples, index + 1, sign * endBounds.innerOffset),
                profileOffsetPoint(samples, index, sign * startBounds.innerOffset),
              ],
              fill: spec.color,
              stroke: spec.color,
              strokeWidth: 0,
              strokeLinejoin: 'round',
            })
        }
      }
    }
  }
  for (const graphNode of Object.values(node.graphNodes)) {
    const incident = Object.values(node.edges).filter(
      (edge) => edge.startNodeId === graphNode.id || edge.endNodeId === graphNode.id,
    )
    if (incident.length < 2) continue
    if (incident.length >= 3) {
      const approaches = incident.flatMap((edge) => {
        const style = resolveStyle(node, edge)
        const points = sampleRoadEdgePoints(node, edge)
        if (!style || points.length < 2) return []
        const from = edge.startNodeId === graphNode.id ? points[0]! : points.at(-1)!
        const toward = edge.startNodeId === graphNode.id ? points[1]! : points.at(-2)!
        return [{
          angle: Math.atan2(toward[2] - from[2], toward[0] - from[0]),
          edgeId: edge.id,
          halfWidth: roadCarriagewayWidth(style) / 2,
        }]
      })
      const junction = node.junctions?.[graphNode.id]
      const automaticSolution = buildJunctionBoundaryGeometry(
        approaches,
        junction?.cornerRadii ?? {},
      )
      const manualBoundary = junction?.manualBoundaryEnabled && junction.manualBoundaryPoints.length >= 3
        ? junction.manualBoundaryPoints
        : undefined
      const solution = manualBoundary
        ? buildManualRoadJunctionBoundary(automaticSolution, manualBoundary)
        : automaticSolution
      const primaryEdge = junction?.primaryEdgeIds
        .map((edgeId) => node.edges[edgeId])
        .find(Boolean)
      const junctionStyle = primaryEdge ? resolveStyle(node, primaryEdge) : resolveStyle(node, incident[0]!)
      children.push({
        kind: 'polygon',
        points: solution.boundary.map(([x, y]) => [
          graphNode.position[0] + x,
          graphNode.position[2] + y,
        ]),
        fill: junctionStyle?.surfaceColor ?? '#3f4246',
        stroke,
        strokeWidth: selected ? 0.09 : 0.04,
        strokeLinejoin: 'round',
      })
      const sideBands = buildRoadJunctionBands(
        incident.flatMap((edge) => {
          const style = resolveStyle(node, edge)
          return style ? [style] : []
        }),
      )
      for (const band of [...sideBands].reverse()) {
        const surface = manualBoundary
          ? buildManualRoadJunctionBand(manualBoundary, band.outerWidth)
          : buildJunctionBoundarySidewalkGeometry(solution, band.outerWidth)
        const stride = manualBoundary ? 6 : 12
        for (let offset = 0; offset + stride - 1 < surface.positions.length; offset += stride) {
          const points: PlanPoint[] = manualBoundary
            ? [
                [graphNode.position[0] + surface.positions[offset]!, graphNode.position[2] + surface.positions[offset + 2]!],
                [graphNode.position[0] + surface.positions[offset + 3]!, graphNode.position[2] + surface.positions[offset + 5]!],
                [graphNode.position[0] + surface.positions[(offset + 9) % surface.positions.length]!, graphNode.position[2] + surface.positions[(offset + 11) % surface.positions.length]!],
                [graphNode.position[0] + surface.positions[(offset + 6) % surface.positions.length]!, graphNode.position[2] + surface.positions[(offset + 8) % surface.positions.length]!],
              ]
            : [
                [graphNode.position[0] + surface.positions[offset]!, graphNode.position[2] + surface.positions[offset + 2]!],
                [graphNode.position[0] + surface.positions[offset + 3]!, graphNode.position[2] + surface.positions[offset + 5]!],
                [graphNode.position[0] + surface.positions[offset + 9]!, graphNode.position[2] + surface.positions[offset + 11]!],
                [graphNode.position[0] + surface.positions[offset + 6]!, graphNode.position[2] + surface.positions[offset + 8]!],
              ]
          children.push({
            kind: 'polygon',
            points,
            fill: band.color,
            stroke: band.color,
            strokeWidth: 0,
            strokeLinejoin: 'round',
          })
        }
      }
      if (selected) {
        children.push({
          kind: 'text',
          x: graphNode.position[0],
          y: graphNode.position[2],
          text: classifyRoadJunction(node, graphNode.id),
          fontSize: 0.32,
          fill: '#ffffff',
          fontWeight: 700,
          textAnchor: 'middle',
          dominantBaseline: 'middle',
          upright: true,
        })
        for (const handle of buildRoadCurbCornerHandles(node, graphNode.id)) {
          children.push({
            kind: 'endpoint-handle',
            point: handle.point,
            state: 'idle',
            variant: 'curve',
            affordance: 'road-curb-corner',
            payload: {
              junctionId: graphNode.id,
              cornerKey: handle.cornerKey,
            },
          })
        }
      }
      continue
    }
    // Degree-two joins are already covered by continuous paths or a taper.
    // Adding a disk here would hide the lane transition and create a bulb.
  }
  for (const marking of buildRoadNetworkMarkings(node)) {
    children.push({
      kind: 'polygon',
      points: marking.points.map((point) => [point[0], point[2]]),
      fill: marking.color,
      stroke: marking.color,
      strokeWidth: 0,
      strokeLinejoin: 'round',
    })
  }
  if (selected) {
    for (const terminal of roadTerminalEnds(node)) {
      const arrowOffset = 0.9
      children.push({
        kind: 'move-arrow',
        point: [
          terminal.point[0] + terminal.direction[0] * arrowOffset,
          terminal.point[2] + terminal.direction[1] * arrowOffset,
        ],
        angle: terminal.angle,
        affordance: 'road-extend-endpoint',
        payload: { nodeId: terminal.nodeId },
      })
    }
    for (const graphNode of Object.values(node.graphNodes)) {
      children.push({
        kind: 'endpoint-handle',
        point: [graphNode.position[0], graphNode.position[2]],
        state: 'idle',
        variant: 'endpoint',
        affordance: 'road-node-point',
        payload: { nodeId: graphNode.id },
      })
    }
    for (const edge of Object.values(node.edges)) {
      if (edge.alignment.length > 0) {
        const samples = sampleRoadEdgePoints(node, edge, Math.max(32, (edge.alignment.length + 1) * 16))
        for (let index = 0; index <= edge.alignment.length; index += 1) {
          const t = (index + 0.5) / (edge.alignment.length + 1)
          const point = samples[Math.round(t * (samples.length - 1))]
          if (!point) continue
          children.push({
            kind: 'midpoint-handle', point: [point[0], point[2]],
            affordance: 'road-insert-point', payload: { edgeId: edge.id, index, elevation: point[1] },
          })
        }
      }
      edge.alignment.forEach((point, index) => {
        children.push({
          kind: 'endpoint-handle',
          point: [point[0], point[2]],
          state: 'idle',
          variant: 'curve',
          affordance: 'road-control-point',
          payload: { edgeId: edge.id, index },
        })
      })
    }
  }
  for (const issue of validateRoadGraph(node)) {
    if (issue.severity === 'warning' && !selected) continue
    const point = roadValidationIssuePoint(node, issue)
    if (!point) continue
    children.push({
      kind: 'circle',
      cx: point[0],
      cy: point[2],
      r: 0.28,
      fill: issue.severity === 'error' ? '#ef4444' : '#f59e0b',
      stroke: '#ffffff',
      strokeWidth: 0.06,
    })
    children.push({
      kind: 'text',
      x: point[0],
      y: point[2],
      text: '!',
      fontSize: 0.3,
      fill: '#ffffff',
      fontWeight: 800,
      textAnchor: 'middle',
      dominantBaseline: 'middle',
      upright: true,
    })
  }
  return { kind: 'group', children }
}
