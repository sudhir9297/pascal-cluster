import type { RoadNetworkNode } from './schema'

/** Move one authored spline point while preserving the edge and graph topology. */
export function moveRoadSplinePoint(
  node: RoadNetworkNode,
  edgeId: string,
  pointIndex: number,
  point: readonly [number, number, number],
): Pick<RoadNetworkNode, 'edges'> | null {
  const edge = node.edges[edgeId]
  const originalPoint = edge?.alignment[pointIndex]
  if (!edge || !originalPoint) return null

  const alignment = edge.alignment.map((candidate, index) =>
    index === pointIndex
      ? ([point[0], originalPoint[1], point[2]] as [number, number, number])
      : candidate,
  )
  return {
    edges: {
      ...node.edges,
      [edgeId]: { ...edge, alignment },
    },
  }
}
