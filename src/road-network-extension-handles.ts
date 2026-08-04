import type { RoadNetworkNode } from './schema'

/** Move one true open end without creating or replacing its road network. */
export function moveRoadTerminal(
  node: RoadNetworkNode,
  graphNodeId: string,
  point: readonly [number, number, number],
): Pick<RoadNetworkNode, 'graphNodes'> | null {
  const graphNode = node.graphNodes[graphNodeId]
  if (!graphNode) return null
  const incidentCount = Object.values(node.edges).filter(
    (edge) => edge.startNodeId === graphNodeId || edge.endNodeId === graphNodeId,
  ).length
  if (incidentCount !== 1) return null
  return {
    graphNodes: {
      ...node.graphNodes,
      [graphNodeId]: {
        ...graphNode,
        position: [point[0], graphNode.position[1], point[2]],
      },
    },
  }
}
