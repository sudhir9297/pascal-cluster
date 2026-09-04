import {
	buildJunctionBoundaryGeometry,
	sampleRoadEdgePoints,
} from "./road-network-geometry";
import { buildRoadCrossSection } from "./road-cross-section";
import type { RoadNetworkGraph } from "./road-network-topology";

/** Fit estimated curb returns between closely spaced mapped junctions. */
export function fitOsmJunctionCorners(graph: RoadNetworkGraph): void {
	for (const junction of Object.values(graph.junctions)) {
		const available = new Map<string, number>();
		const approaches = Object.values(graph.edges).flatMap((edge) => {
			if (
				edge.startNodeId !== junction.nodeId &&
				edge.endNodeId !== junction.nodeId
			)
				return [];
			const points = sampleRoadEdgePoints(graph, edge);
			const style = graph.stylePresets[edge.styleId];
			if (!style || points.length < 2) return [];
			const length = points
				.slice(1)
				.reduce(
					(sum, point, index) =>
						sum +
						Math.hypot(
							point[0] - points[index]![0],
							point[2] - points[index]![2],
						),
					0,
				);
			const from =
				edge.startNodeId === junction.nodeId ? points[0]! : points.at(-1)!;
			const toward =
				edge.startNodeId === junction.nodeId ? points[1]! : points.at(-2)!;
			// Leave a straight section between two junction patches, including their sidewalks.
			const section = buildRoadCrossSection(style);
			const sideWidth = Math.max(
				section.sides.left.width,
				section.sides.right.width,
			);
			available.set(edge.id, Math.max(0, length * 0.45 - sideWidth));
			return [
				{
					edgeId: edge.id,
					angle: Math.atan2(toward[2] - from[2], toward[0] - from[0]),
					halfWidth: section.carriagewayWidth / 2,
				},
			];
		});
		for (let iteration = 0; iteration < 8; iteration++) {
			const solution = buildJunctionBoundaryGeometry(
				approaches,
				junction.cornerRadii,
			);
			const fits = Object.entries(solution.approachCuts).every(
				([id, cut]) => cut <= (available.get(id) ?? 0),
			);
			if (fits) break;
			let changed = false;
			for (const [key, radius] of Object.entries(junction.cornerRadii)) {
				const next = Math.max(0.5, radius * 0.65);
				if (next < radius) changed = true;
				junction.cornerRadii[key] = next;
			}
			if (!changed) break;
		}
	}
}
