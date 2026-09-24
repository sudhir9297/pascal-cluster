import { describe, expect, test } from "bun:test";
import {
	classifyRoadJunction,
	createEmptyRoadGraph,
	insertRoadSegment,
	mergeRoadGraphs,
} from "./road-network-topology";
import { deleteRoadEdge, moveRoadGraphNode } from "./road-network-graph-editing";
import { RoadNetworkNode } from "./schema";

function tee(offset: number) {
	const through = insertRoadSegment(
		createEmptyRoadGraph(),
		[offset - 10, 0, 0],
		[offset + 10, 0, 0],
		{ tolerance: 0.01 },
	);
	return insertRoadSegment(
		through.graph,
		[offset, 0, 10],
		[offset, 0, 0],
		{ tolerance: 0.01 },
	).graph;
}

function junctionAt(node: RoadNetworkNode, x: number) {
	return Object.values(node.graphNodes).find(
		(candidate) =>
			Math.abs(candidate.position[0] - x) < 0.01 &&
			Math.abs(candidate.position[2]) < 0.01,
	)!;
}

describe("localized road graph editing", () => {
	test("reclassifies a moved node and its neighbor without touching a remote junction", () => {
		const node = RoadNetworkNode.parse(mergeRoadGraphs([tee(0), tee(100)]).graph);
		const localJunction = junctionAt(node, 0);
		const remoteJunction = junctionAt(node, 100);
		const westTerminal = Object.values(node.graphNodes).find(
			(candidate) =>
				Math.abs(candidate.position[0] + 10) < 0.01 &&
				Math.abs(candidate.position[2]) < 0.01,
		)!;
		const remoteRecord = node.junctions[remoteJunction.id];

		const moved = moveRoadGraphNode(node, westTerminal.id, [-10, 0, 10])!;
		const edited = { ...node, ...moved.patch };

		expect(moved.reclassifiedNodeIds).toContain(westTerminal.id);
		expect(moved.reclassifiedNodeIds).toContain(localJunction.id);
		expect(moved.reclassifiedNodeIds).not.toContain(remoteJunction.id);
		expect(edited.junctions[localJunction.id]?.kind).toBe("y");
		expect(classifyRoadJunction(edited, localJunction.id)).toBe("y");
		expect(edited.junctions[remoteJunction.id]).toBe(remoteRecord);
	});

	test("deleting one branch removes its orphan and only the former T record", () => {
		const node = RoadNetworkNode.parse(mergeRoadGraphs([tee(0), tee(100)]).graph);
		const localJunction = junctionAt(node, 0);
		const remoteJunction = junctionAt(node, 100);
		const remoteRecord = node.junctions[remoteJunction.id];
		const branch = Object.values(node.edges).find((edge) => {
			const start = node.graphNodes[edge.startNodeId]!;
			const end = node.graphNodes[edge.endNodeId]!;
			return (
				Math.max(start.position[2], end.position[2]) > 9 &&
				Math.max(start.position[0], end.position[0]) < 20
			);
		})!;

		const deleted = deleteRoadEdge(node, branch.id)!;
		const edited = { ...node, ...deleted.patch };

		expect(deleted.empty).toBe(false);
		expect(deleted.deletedNodeIds).toHaveLength(1);
		expect(deleted.reclassifiedNodeIds).toContain(localJunction.id);
		expect(deleted.reclassifiedNodeIds).not.toContain(remoteJunction.id);
		expect(edited.junctions[localJunction.id]).toBeUndefined();
		expect(classifyRoadJunction(edited, localJunction.id)).toBe("straight");
		expect(edited.junctions[remoteJunction.id]).toBe(remoteRecord);
	});

	test("deleting the final edge reports an empty network", () => {
		const graph = insertRoadSegment(
			createEmptyRoadGraph(),
			[0, 0, 0],
			[10, 0, 0],
		).graph;
		const node = RoadNetworkNode.parse(graph);
		const result = deleteRoadEdge(node, Object.keys(node.edges)[0]!)!;

		expect(result.empty).toBe(true);
		expect(Object.keys(result.patch.edges)).toHaveLength(0);
		expect(Object.keys(result.patch.graphNodes)).toHaveLength(0);
	});
});
