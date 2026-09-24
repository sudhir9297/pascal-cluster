import { describe, expect, test } from "bun:test";
import { sampleRoadEdgePoints } from "./road-network-geometry";
import {
	createEmptyRoadGraph,
	insertRoadSegment,
} from "./road-network-topology";
import {
	enableRoadVerticalProfile,
	roadProfileElevationAtStation,
	roadVerticalProfileSummary,
	smoothRoadVerticalProfile,
	updateRoadVerticalProfilePoint,
} from "./road-network-vertical-profile";
import { RoadNetworkNode } from "./schema";

function profiledRoad() {
	const inserted = insertRoadSegment(
		createEmptyRoadGraph(),
		[0, 0, 0],
		[20, 0, 0],
		{ alignment: [[10, 8, 5]] },
	);
	const legacy = RoadNetworkNode.parse(inserted.graph);
	const edge = Object.values(legacy.edges)[0];
	if (!edge) throw new Error("Expected road edge");
	const enabled = enableRoadVerticalProfile(legacy, edge.id);
	if (!enabled) throw new Error("Expected profile patch");
	return RoadNetworkNode.parse({ ...legacy, ...enabled });
}

describe("independent road vertical profiles", () => {
	test("keeps plan alignment separate from station/elevation profile", () => {
		const node = profiledRoad();
		const edge = Object.values(node.edges)[0];
		if (!edge) throw new Error("Expected road edge");
		expect(edge.profileMode).toBe("designed");
		expect(edge.verticalProfile).toHaveLength(1);

		const before = sampleRoadEdgePoints(node, edge, 80);
		const planOnlyEdge = {
			...edge,
			alignment: edge.alignment.map(
				(point) => [point[0], -100, point[2]] as [number, number, number],
			),
		};
		const after = sampleRoadEdgePoints(
			{ graphNodes: node.graphNodes },
			planOnlyEdge,
			80,
		);
		expect(after.map((point) => point[1])).toEqual(
			before.map((point) => point[1]),
		);
		expect(Math.max(...before.map((point) => point[1]))).toBeGreaterThan(7);
	});

	test("edits profile elevations, reports grades, and generates vertical curves", () => {
		let node = profiledRoad();
		let edge = Object.values(node.edges)[0];
		if (!edge) throw new Error("Expected road edge");
		const pvi = edge.verticalProfile[0];
		if (!pvi) throw new Error("Expected profile point");
		const updated = updateRoadVerticalProfilePoint(node, edge.id, pvi.id, {
			elevation: 5,
		});
		if (!updated) throw new Error("Expected profile update");
		node = RoadNetworkNode.parse({ ...node, ...updated });
		edge = node.edges[edge.id];
		if (!edge) throw new Error("Expected updated edge");
		expect(edge.alignment[0]?.[1]).toBe(5);
		const summary = roadVerticalProfileSummary(node, edge);
		expect(summary.maxAbsGrade).toBeGreaterThan(0.4);

		const smoothed = smoothRoadVerticalProfile(node, edge.id);
		if (!smoothed) throw new Error("Expected smoothing patch");
		const curved = smoothed.edges[edge.id];
		if (!curved) throw new Error("Expected curved edge");
		expect(curved.verticalProfile[0]?.curveLength).toBeGreaterThan(0);
		const curvePvi = curved.verticalProfile[0];
		if (!curvePvi) throw new Error("Expected curve PVI");
		const atPvi = roadProfileElevationAtStation(
			curved.verticalProfile,
			summary.length,
			0,
			0,
			curvePvi.station,
		);
		expect(atPvi).toBeLessThan(curvePvi.elevation);
		expect(atPvi).toBeGreaterThan(0);
	});
});
