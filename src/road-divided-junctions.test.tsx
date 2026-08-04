import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildRoadLaneMovements } from "./road-lane-movements";
import {
	buildDividedJunctionGraphGuides,
	buildDividedRoadJunctionExpansions,
	RoadDividedJunctionInspector,
} from "./road-divided-junctions";
import { buildDirectedRoadLanes } from "./road-network-lanes";
import { RoadNetworkNode } from "./schema";
import { createEmptyRoadGraph, insertRoadSegment } from "./road-network-topology";

function dividedTee() {
	const through = insertRoadSegment(createEmptyRoadGraph(), [-20, 0, 0], [20, 0, 0]);
	const branch = insertRoadSegment(through.graph, [0, 0, 18], [0, 0, 0]);
	const node = RoadNetworkNode.parse({ ...branch.graph, activeStyleId: "arterial" });
	node.lanes = buildDirectedRoadLanes(node);
	node.laneMovements = buildRoadLaneMovements(node);
	node.dividedJunctions = buildDividedRoadJunctionExpansions(node);
	return node;
}

describe("divided-road linked internal junction nodes", () => {
	test("creates inbound and outbound carriageway nodes for each approach", () => {
		const node = dividedTee();
		const expansion = Object.values(node.dividedJunctions)[0]!;
		expect(Object.keys(expansion.nodes)).toHaveLength(6);
		expect(new Set(Object.values(expansion.nodes).map((internal) => internal.direction))).toEqual(new Set(["inbound", "outbound"]));
		expect(Object.keys(expansion.links).length).toBeGreaterThan(0);
		expect(Object.values(expansion.links).every((link) => expansion.nodes[link.startNodeId] && expansion.nodes[link.endNodeId])).toBe(true);
	});

	test("does not expand an undivided local-street junction", () => {
		const node = dividedTee();
		node.activeStyleId = "local-street";
		expect(buildDividedRoadJunctionExpansions(node)).toEqual({});
	});

	test("builds a visible overlay for every internal movement link", () => {
		const node = dividedTee();
		const overlay = buildDividedJunctionGraphGuides(node);
		const expansion = Object.values(node.dividedJunctions)[0]!;
		expect(overlay.nodes).toHaveLength(6);
		expect(overlay.links).toHaveLength(Object.keys(expansion.links).length);
		expect(overlay.links.every((link) => link.points.length === 3)).toBe(true);
	});

	test("renders graph counts and an overlay toggle", () => {
		const markup = renderToStaticMarkup(createElement(RoadDividedJunctionInspector, {
			node: dividedTee(),
			onUpdate: () => {},
		}));
		expect(markup).toContain('aria-label="Divided road internal junction graph"');
		expect(markup).toContain("6 internal nodes");
		expect(markup).toContain('aria-label="Show divided junction internal graph"');
	});
});
