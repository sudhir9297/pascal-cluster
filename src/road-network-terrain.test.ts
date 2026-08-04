import { describe, expect, test } from "bun:test";
import {
	conformRoadNetworkToTerrain,
	gradeTerrainToRoad,
} from "./road-network-terrain";
import {
	createEmptyRoadGraph,
	insertRoadSegment,
} from "./road-network-topology";
import { RoadNetworkNode } from "./schema";
import {
	createTerrainField,
	quantize,
	surfaceHeightAt,
} from "./terrain-field-compat";

function rampTerrain() {
	const field = createTerrainField({
		cols: 25,
		origin: [0, 0],
		rows: 25,
		spacing: 1,
	});
	const heights = new Int16Array(field.cols * field.rows);
	for (let row = 0; row < field.rows; row++) {
		for (let col = 0; col < field.cols; col++) {
			heights[row * field.cols + col] = quantize(field, col * 0.2 + row * 0.1);
		}
	}
	return { ...field, heights };
}

describe("road terrain workflows", () => {
	test("conforms only ground-mode road points and preserves bridge geometry", () => {
		const ground = insertRoadSegment(
			createEmptyRoadGraph(),
			[1, 8, 1],
			[8, 8, 1],
			{ alignment: [[4, 8, 4]] },
		);
		const bridge = insertRoadSegment(ground.graph, [12, 7, 2], [20, 7, 2], {
			alignment: [[16, 9, 5]],
			elevationMode: "bridge",
		});
		const node = RoadNetworkNode.parse(bridge.graph);
		const bridgeEdge = Object.values(node.edges).find(
			(edge) => node.graphNodes[edge.startNodeId]?.elevationMode === "bridge",
		);
		if (!bridgeEdge) throw new Error("Expected a bridge edge");

		const result = conformRoadNetworkToTerrain(node, rampTerrain(), 0.25);
		const groundEdge = Object.values(result.value.edges).find(
			(edge) => edge.id !== bridgeEdge.id,
		);
		if (!groundEdge) throw new Error("Expected a ground edge");
		const start = result.value.graphNodes[groundEdge.startNodeId];
		if (!start) throw new Error("Expected a ground start node");

		expect(start.position[1]).toBeCloseTo(0.55, 6);
		expect(groundEdge.alignment[0]?.[1]).toBeCloseTo(1.45, 6);
		expect(result.value.edges[bridgeEdge.id]?.alignment).toEqual(
			bridgeEdge.alignment,
		);
		expect(result.value.graphNodes[bridgeEdge.startNodeId]?.position).toEqual(
			node.graphNodes[bridgeEdge.startNodeId]?.position,
		);
	});

	test("grades terrain to a road with a soft corridor falloff", () => {
		const inserted = insertRoadSegment(
			createEmptyRoadGraph(),
			[2, 3, 10],
			[18, 3, 10],
			{ alignment: [[10, 3, 10]] },
		);
		const node = RoadNetworkNode.parse(inserted.graph);
		const field = createTerrainField({
			cols: 21,
			origin: [0, 0],
			rows: 21,
			spacing: 1,
		});

		const result = gradeTerrainToRoad(node, field, 2);

		expect(result.changed).toBeGreaterThan(0);
		expect(surfaceHeightAt(result.value, 10, 10)).toBeCloseTo(3, 2);
		expect(surfaceHeightAt(result.value, 10, 16)).toBeGreaterThan(0);
		expect(surfaceHeightAt(result.value, 10, 16)).toBeLessThan(3);
		expect(surfaceHeightAt(result.value, 10, 18)).toBe(0);
	});
});
