import type { FloorplanGeometry, GeometryContext } from '@pascal-app/core'
import { classifyRoadJunction } from './road-network-topology'
import { buildRoadCurbCornerHandles } from './road-network-corner-editing'
import { buildRoadNetworkMarkings } from './road-network-markings'
import {
  buildJunctionBoundaryGeometry,
  roadTerminalEnds,
  sampleRoadEdgePoints,
} from './road-network-geometry'
import type { RoadGraphEdge, RoadNetworkNode, RoadStylePreset } from './schema'
import { DEFAULT_ROAD_STYLE_PRESETS } from './road-style-presets'
import { roadValidationIssuePoint, validateRoadGraph } from './road-network-validation'

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

function carriagewayWidth(style: RoadStylePreset): number {
  return style.laneCount * style.laneWidth + style.shoulderWidth * 2 + style.medianWidth
}

function edgePlanPoints(node: RoadNetworkNode, edge: RoadGraphEdge): PlanPoint[] {
  return sampleRoadEdgePoints(node, edge).map((point) => [point[0], point[2]])
}

function segmentPolygon(start: PlanPoint, end: PlanPoint, width: number): PlanPoint[] {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const length = Math.max(Math.hypot(dx, dy), 1e-6)
  const nx = (-dy / length) * (width / 2)
  const ny = (dx / length) * (width / 2)
  return [
    [start[0] + nx, start[1] + ny],
    [end[0] + nx, end[1] + ny],
    [end[0] - nx, end[1] - ny],
    [start[0] - nx, start[1] - ny],
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
  for (const edge of Object.values(node.edges)) {
    const style = resolveStyle(node, edge)
    if (!style) continue
    const points = edgePlanPoints(node, edge)
    for (let index = 0; index < points.length - 1; index++) {
      const start = points[index]!
      const end = points[index + 1]!
      children.push({
        kind: 'polygon',
        points: segmentPolygon(start, end, carriagewayWidth(style)),
        fill: style.surfaceColor,
        stroke,
        strokeWidth: selected ? 0.09 : 0.04,
        strokeLinejoin: 'round',
      })
      children.push({
        kind: 'hit-line',
        x1: start[0],
        y1: start[1],
        x2: end[0],
        y2: end[1],
        strokeWidthPx: 16,
      })
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
          halfWidth: carriagewayWidth(style) / 2,
        }]
      })
      const junction = node.junctions?.[graphNode.id]
      const solution = buildJunctionBoundaryGeometry(
        approaches,
        junction?.cornerRadii ?? {},
      )
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
    const radius = Math.max(
      ...incident.map((edge) => {
        const style = resolveStyle(node, edge)
        return style ? carriagewayWidth(style) / 2 : 0
      }),
    )
    children.push({
      kind: 'circle',
      cx: graphNode.position[0],
      cy: graphNode.position[2],
      r: radius,
      fill: node.stylePresets[incident[0]!.styleId]?.surfaceColor ?? '#3f4246',
      stroke,
      strokeWidth: selected ? 0.09 : 0.04,
    })
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
