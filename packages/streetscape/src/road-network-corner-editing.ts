import {
  buildJunctionBoundaryGeometry,
  sampleRoadEdgePoints,
  type JunctionBoundaryApproach,
  type JunctionBoundaryCorner,
} from './road-network-geometry'
import type { RoadGraphEdge, RoadNetworkNode, RoadStylePreset } from './schema'
import { roadCarriagewayWidth } from './road-cross-section'
import { DEFAULT_ROAD_STYLE_PRESETS } from './road-style-presets'

export type RoadCurbCornerHandle = {
  cornerKey: string
  direction: readonly [number, number]
  point: readonly [number, number]
  radius: number
}

export function roadCurbCornerKey(firstEdgeId: string, secondEdgeId: string): string {
  return [firstEdgeId, secondEdgeId].sort().join('::')
}

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

function junctionApproaches(
  node: RoadNetworkNode,
  junctionId: string,
): JunctionBoundaryApproach[] {
  return Object.values(node.edges).flatMap((edge) => {
    if (edge.startNodeId !== junctionId && edge.endNodeId !== junctionId) return []
    const style = resolveStyle(node, edge)
    const points = sampleRoadEdgePoints(node, edge)
    if (!style || points.length < 2) return []
    const from = edge.startNodeId === junctionId ? points[0]! : points.at(-1)!
    const toward = edge.startNodeId === junctionId ? points[1]! : points.at(-2)!
    return [{
      angle: Math.atan2(toward[2] - from[2], toward[0] - from[0]),
      edgeId: edge.id,
      halfWidth: roadCarriagewayWidth(style) / 2,
    }]
  })
}

function cornerMidpoint(corner: JunctionBoundaryCorner): readonly [number, number] | null {
  if (!corner.center || corner.effectiveRadius <= 0 || corner.innerPoints.length < 3) return null
  return corner.innerPoints[Math.floor((corner.innerPoints.length - 1) / 2)] ?? null
}

function solveHandles(
  node: RoadNetworkNode,
  junctionId: string,
  cornerRadii: Record<string, number>,
): RoadCurbCornerHandle[] {
  const graphNode = node.graphNodes[junctionId]
  const approaches = junctionApproaches(node, junctionId)
  if (!graphNode || approaches.length < 3) return []
  const solution = buildJunctionBoundaryGeometry(approaches, cornerRadii)
  return solution.corners.flatMap((corner) => {
    const localPoint = cornerMidpoint(corner)
    if (!localPoint) return []
    const cornerKey = roadCurbCornerKey(corner.fromEdgeId, corner.toEdgeId)
    return [{
      cornerKey,
      direction: corner.outerDirection,
      point: [
        graphNode.position[0] + localPoint[0],
        graphNode.position[2] + localPoint[1],
      ] as const,
      radius: cornerRadii[cornerKey] ?? corner.requestedRadius,
    }]
  })
}

export function buildRoadCurbCornerHandles(
  node: RoadNetworkNode,
  junctionId: string,
): RoadCurbCornerHandle[] {
  const junction = node.junctions[junctionId]
  return junction ? solveHandles(node, junctionId, junction.cornerRadii) : []
}

/** Convert a dragged curb-return handle position back into one authored radius. */
export function roadCurbCornerRadiusAtPlanPoint(
  node: RoadNetworkNode,
  junctionId: string,
  cornerKey: string,
  planPoint: readonly [number, number],
): number | null {
  const junction = node.junctions[junctionId]
  const graphNode = node.graphNodes[junctionId]
  if (!junction || !graphNode || !(cornerKey in junction.cornerRadii)) return null
  const current = buildRoadCurbCornerHandles(node, junctionId)
    .find((handle) => handle.cornerKey === cornerKey)
  if (!current) return null
  const targetProjection =
    (planPoint[0] - graphNode.position[0]) * current.direction[0] +
    (planPoint[1] - graphNode.position[2]) * current.direction[1]
  const projectionAt = (radius: number) => {
    const handle = solveHandles(node, junctionId, {
      ...junction.cornerRadii,
      [cornerKey]: radius,
    }).find((candidate) => candidate.cornerKey === cornerKey)
    return handle
      ? (handle.point[0] - graphNode.position[0]) * current.direction[0] +
          (handle.point[1] - graphNode.position[2]) * current.direction[1]
      : 0
  }
  let low = 0.5
  let high = 100
  const lowProjection = projectionAt(low)
  const increasing = projectionAt(high) >= lowProjection
  for (let iteration = 0; iteration < 24; iteration++) {
    const middle = (low + high) / 2
    const projection = projectionAt(middle)
    if ((projection < targetProjection) === increasing) low = middle
    else high = middle
  }
  return Math.round(Math.max(0.5, Math.min(100, (low + high) / 2)) * 10) / 10
}
