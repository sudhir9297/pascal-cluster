import {
	reconcileRoadJunctionNeighborhood,
	type RoadNetworkGraph,
} from "./road-network-topology";
import type { RoadNetworkNode } from "./schema";

export type RoadGraphNodeMove = {
	patch: Pick<RoadNetworkNode, "graphNodes" | "junctions">;
	reclassifiedNodeIds: string[];
};

export type RoadEdgeDeletion = {
	deletedNodeIds: string[];
	empty: boolean;
	patch: Pick<
		RoadNetworkNode,
		"attachments" | "edges" | "graphNodes" | "junctions"
	>;
	reclassifiedNodeIds: string[];
};

/** Move one shared graph node and reclassify only its one-hop neighborhood. */
export function moveRoadGraphNode(
	node: RoadNetworkNode,
	graphNodeId: string,
	point: readonly [number, number, number],
): RoadGraphNodeMove | null {
	const graphNode = node.graphNodes[graphNodeId];
	if (!graphNode || point.some((coordinate) => !Number.isFinite(coordinate))) {
		return null;
	}
	const graphNodes = {
		...node.graphNodes,
		[graphNodeId]: {
			...graphNode,
			position: [point[0], point[1], point[2]] as [number, number, number],
		},
	};
	const graph: RoadNetworkGraph = {
		...node,
		graphNodes,
		junctions: { ...node.junctions },
	};
	const result = reconcileRoadJunctionNeighborhood(graph, [graphNodeId]);
	return {
		patch: { graphNodes, junctions: result.graph.junctions },
		reclassifiedNodeIds: result.reclassifiedNodeIds,
	};
}

/**
 * Remove one selected edge, its edge-hosted attachments, and endpoint nodes
 * that became isolated. Disconnected remaining components are intentionally
 * left for the renderer's existing component splitter.
 */
export function deleteRoadEdge(
	node: RoadNetworkNode,
	edgeId: string,
): RoadEdgeDeletion | null {
	const edge = node.edges[edgeId];
	if (!edge) return null;
	const edges = { ...node.edges };
	delete edges[edgeId];
	const attachments = Object.fromEntries(
		Object.entries(node.attachments).filter(
			([, attachment]) => attachment.edgeId !== edgeId,
		),
	);
	const graphNodes = { ...node.graphNodes };
	const deletedNodeIds: string[] = [];
	for (const nodeId of [edge.startNodeId, edge.endNodeId]) {
		const stillConnected = Object.values(edges).some(
			(candidate) =>
				candidate.startNodeId === nodeId || candidate.endNodeId === nodeId,
		);
		if (!stillConnected) {
			delete graphNodes[nodeId];
			deletedNodeIds.push(nodeId);
		}
	}
	const graph: RoadNetworkGraph = {
		...node,
		attachments,
		edges,
		graphNodes,
		junctions: { ...node.junctions },
	};
	const result = reconcileRoadJunctionNeighborhood(graph, [
		edge.startNodeId,
		edge.endNodeId,
	]);
	return {
		deletedNodeIds: deletedNodeIds.sort(),
		empty: Object.keys(edges).length === 0,
		patch: {
			attachments,
			edges,
			graphNodes,
			junctions: result.graph.junctions,
		},
		reclassifiedNodeIds: result.reclassifiedNodeIds,
	};
}
