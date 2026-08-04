import type { AlignmentAnchor } from "@pascal-app/core";
import type { RoadNetworkGraph, RoadPoint } from "./road-network-topology";

export const ROAD_DRAFT_ALIGNMENT_ID = "__road_draft__";
export const ROAD_DRAFT_ALIGNMENT_THRESHOLD_M = 0.18;

export type RoadEndpointAlignmentOptions = {
	elevationMode: "bridge" | "ground" | "tunnel";
	excludePoint?: RoadPoint | null;
	level: number;
};

function samePlanPoint(a: RoadPoint, b: RoadPoint, epsilon = 1e-5): boolean {
	return Math.abs(a[0] - b[0]) <= epsilon && Math.abs(a[2] - b[2]) <= epsilon;
}

/** Add semantic road endpoints to Pascal's normal alignment-anchor pool. */
export function roadEndpointAlignmentAnchors(
	graph: RoadNetworkGraph,
	options: RoadEndpointAlignmentOptions,
): AlignmentAnchor[] {
	const degree = new Map<string, number>();
	for (const edge of Object.values(graph.edges)) {
		degree.set(edge.startNodeId, (degree.get(edge.startNodeId) ?? 0) + 1);
		degree.set(edge.endNodeId, (degree.get(edge.endNodeId) ?? 0) + 1);
	}

	const anchors: AlignmentAnchor[] = [];
	for (const node of Object.values(graph.graphNodes)) {
		if ((degree.get(node.id) ?? 0) > 1) continue;
		if (node.elevationMode !== options.elevationMode || node.level !== options.level) continue;
		if (options.excludePoint && samePlanPoint(node.position, options.excludePoint)) continue;
		anchors.push({
			nodeId: `road-endpoint:${node.id}`,
			kind: "corner",
			x: node.position[0],
			z: node.position[2],
		});
	}
	return anchors;
}

export function movingRoadDraftAnchor(point: RoadPoint): AlignmentAnchor {
	return {
		nodeId: ROAD_DRAFT_ALIGNMENT_ID,
		kind: "corner",
		x: point[0],
		z: point[2],
	};
}
