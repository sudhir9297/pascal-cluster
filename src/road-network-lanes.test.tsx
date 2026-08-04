import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildDirectedRoadLanes, RoadLaneGraphInspector } from "./road-network-lanes";
import { RoadNetworkNode } from "./schema";
import { createEmptyRoadGraph, insertRoadSegment } from "./road-network-topology";

function road(regionalPack: "right-driving" | "left-driving" = "right-driving") {
	const graph = insertRoadSegment(createEmptyRoadGraph(), [0, 0, 0], [20, 0, 0]).graph;
	return RoadNetworkNode.parse({ ...graph, regionalPack });
}

describe("persistent directed road lanes", () => {
	test("expands a two-way edge into stable opposing directed lanes", () => {
		const lanes = Object.values(buildDirectedRoadLanes(road()));
		expect(lanes).toHaveLength(2);
		expect(lanes.map((lane) => lane.direction)).toEqual(["forward", "reverse"]);
		expect(lanes[0]?.startNodeId).toBe(lanes[1]?.endNodeId);
		expect(lanes[0]?.lateralOffset).toBeLessThan(0);
		expect(lanes[1]?.lateralOffset).toBeGreaterThan(0);
	});

	test("mirrors lane sides for a left-driving regional pack", () => {
		const lanes = Object.values(buildDirectedRoadLanes(road("left-driving")));
		expect(lanes[0]?.lateralOffset).toBeGreaterThan(0);
		expect(lanes[1]?.lateralOffset).toBeLessThan(0);
	});

	test("renders a persistent lane-graph inspector", () => {
		const node = road();
		node.lanes = buildDirectedRoadLanes(node);
		const markup = renderToStaticMarkup(
			createElement(RoadLaneGraphInspector, { node, onUpdate: () => {} }),
		);
		expect(markup).toContain('aria-label="Directed road lane graph"');
		expect(markup).toContain("2 directed lanes");
		expect(markup).toContain("Lane graph is synchronized");
	});
});
