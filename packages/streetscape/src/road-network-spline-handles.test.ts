import { describe, expect, test } from "bun:test";
import {
	deleteRoadSplinePoints,
	flattenRoadSplinePoints,
	gradeRoadSplinePoints,
	insertRoadSplinePoint,
	moveRoadSplineEndpoint,
	moveRoadSplinePoint,
	moveRoadSplinePoints,
} from "./road-network-spline-handles";
import {
	createEmptyRoadGraph,
	insertRoadSegment,
} from "./road-network-topology";
import { enableRoadVerticalProfile } from "./road-network-vertical-profile";
import { RoadNetworkNode } from "./schema";

describe("road spline point editing", () => {
	test("moves only the selected authored point in all three axes", () => {
		const result = insertRoadSegment(
			createEmptyRoadGraph(),
			[0, 0, 0],
			[12, 0, 0],
			{
				alignment: [
					[4, 1, 3],
					[8, 2, 4],
				],
			},
		);
		const node = RoadNetworkNode.parse(result.graph);
		const edge = Object.values(node.edges)[0]!;

		const patch = moveRoadSplinePoint(node, edge.id, 0, [5, 99, 7]);

		expect(patch?.edges[edge.id]?.alignment).toEqual([
			[5, 99, 7],
			[8, 2, 4],
		]);
		expect(node.edges[edge.id]?.alignment).toEqual([
			[4, 1, 3],
			[8, 2, 4],
		]);
	});

	test("rejects a missing edge or point index", () => {
		const node = RoadNetworkNode.parse(createEmptyRoadGraph());
		expect(moveRoadSplinePoint(node, "missing", 0, [1, 0, 1])).toBeNull();
	});

	test("moves a shared endpoint in 3D without rewriting incident edges", () => {
		const first = insertRoadSegment(
			createEmptyRoadGraph(),
			[0, 0, 0],
			[10, 0, 0],
			{
				alignment: [[5, 0, 2]],
			},
		);
		const connected = insertRoadSegment(first.graph, [10, 0, 0], [18, 0, 4], {
			alignment: [[14, 0, 1]],
			tolerance: 0.1,
		});
		const node = RoadNetworkNode.parse(connected.graph);
		const sharedNode = Object.values(node.graphNodes).find(
			(candidate) =>
				Object.values(node.edges).filter(
					(edge) =>
						edge.startNodeId === candidate.id ||
						edge.endNodeId === candidate.id,
				).length === 2,
		)!;

		const patch = moveRoadSplineEndpoint(node, sharedNode.id, [11, 3.5, -1]);

		expect(patch?.graphNodes[sharedNode.id]?.position).toEqual([11, 3.5, -1]);
		expect(
			Object.values(node.edges).every(
				(edge) =>
					edge.startNodeId === sharedNode.id ||
					edge.endNodeId === sharedNode.id,
			),
		).toBe(true);
		expect(node.graphNodes[sharedNode.id]?.position).toEqual([10, 0, 0]);
		expect(moveRoadSplineEndpoint(node, "missing", [0, 0, 0])).toBeNull();
	});

	test("inserts, batch-moves, flattens, grades, and deletes authored points", () => {
		const result = insertRoadSegment(
			createEmptyRoadGraph(),
			[0, 0, 0],
			[12, 6, 0],
			{
				alignment: [
					[3, 8, 2],
					[6, -2, 3],
					[9, 7, 2],
				],
			},
		);
		const node = RoadNetworkNode.parse(result.graph);
		const edge = Object.values(node.edges)[0]!;

		const inserted = insertRoadSplinePoint(node, edge.id, 1, [4.5, 4, 2.5])!;
		expect(inserted.edges[edge.id]?.alignment).toHaveLength(4);
		expect(inserted.edges[edge.id]?.alignment[1]).toEqual([4.5, 4, 2.5]);

		const moved = moveRoadSplinePoints(node, edge.id, [0, 2], [1, 2, -1])!;
		expect(moved.edges[edge.id]?.alignment).toEqual([
			[4, 10, 1],
			[6, -2, 3],
			[10, 9, 1],
		]);

		const flattened = flattenRoadSplinePoints(node, edge.id, [0, 2], 1.25)!;
		expect(
			flattened.edges[edge.id]?.alignment.map((point) => point[1]),
		).toEqual([1.25, -2, 1.25]);

		const graded = gradeRoadSplinePoints(node, edge.id, [0, 1, 2])!;
		const elevations = graded.edges[edge.id]!.alignment.map(
			(point) => point[1],
		);
		expect(elevations[0]).toBeGreaterThan(0);
		expect(elevations[2]).toBeLessThan(6);
		expect(elevations[0]).toBeLessThan(elevations[1]!);
		expect(elevations[1]).toBeLessThan(elevations[2]!);

		const deleted = deleteRoadSplinePoints(node, edge.id, [0, 2])!;
		expect(deleted.edges[edge.id]?.alignment).toEqual([[6, -2, 3]]);
	});

	test("keeps linked profile elevations and indices in sync with 3D spline controls", () => {
		const result = insertRoadSegment(
			createEmptyRoadGraph(),
			[0, 0, 0],
			[12, 0, 0],
			{
				alignment: [
					[4, 1, 2],
					[8, 2, 2],
				],
			},
		);
		let node = RoadNetworkNode.parse(result.graph);
		let edge = Object.values(node.edges)[0];
		if (!edge) throw new Error("Expected road edge");
		const enabled = enableRoadVerticalProfile(node, edge.id);
		if (!enabled) throw new Error("Expected profile patch");
		node = RoadNetworkNode.parse({ ...node, ...enabled });
		edge = node.edges[edge.id];
		if (!edge) throw new Error("Expected profiled edge");

		const moved = moveRoadSplinePoint(node, edge.id, 0, [4, 5, 2]);
		if (!moved) throw new Error("Expected move patch");
		expect(
			moved.edges[edge.id]?.verticalProfile.find(
				(point) => point.alignmentPointIndex === 0,
			)?.elevation,
		).toBe(5);

		node = RoadNetworkNode.parse({ ...node, ...moved });
		edge = node.edges[edge.id];
		if (!edge) throw new Error("Expected moved edge");
		const inserted = insertRoadSplinePoint(node, edge.id, 1, [6, 3, 2]);
		if (!inserted) throw new Error("Expected insertion patch");
		expect(
			inserted.edges[edge.id]?.verticalProfile
				.map((point) => point.alignmentPointIndex)
				.sort(),
		).toEqual([0, 1, 2]);

		node = RoadNetworkNode.parse({ ...node, ...inserted });
		edge = node.edges[edge.id];
		if (!edge) throw new Error("Expected inserted edge");
		const deleted = deleteRoadSplinePoints(node, edge.id, [1]);
		expect(
			deleted?.edges[edge.id]?.verticalProfile
				.map((point) => point.alignmentPointIndex)
				.sort(),
		).toEqual([0, 1]);
	});
});
