import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	buildRoadActiveModeGuides,
	buildRoadActiveModeMovements,
	RoadActiveModeInspector,
	setRoadActiveModeMovementEnabled,
} from "./road-active-modes";
import { buildRoadLaneMovements } from "./road-lane-movements";
import { buildDirectedRoadLanes } from "./road-network-lanes";
import { RoadNetworkNode } from "./schema";
import { createEmptyRoadGraph, insertRoadSegment } from "./road-network-topology";

function activeTee() {
	const through = insertRoadSegment(createEmptyRoadGraph(), [-20, 0, 0], [20, 0, 0]);
	const branch = insertRoadSegment(through.graph, [0, 0, 16], [0, 0, 0]);
	const node = RoadNetworkNode.parse(branch.graph);
	node.lanes = buildDirectedRoadLanes(node);
	node.laneMovements = buildRoadLaneMovements(node);
	node.activeModeMovements = buildRoadActiveModeMovements(node);
	return node;
}

describe("pedestrian and bicycle junction movements", () => {
	test("creates one pedestrian crossing per approach and unique bicycle turns", () => {
		const node = activeTee();
		const movements = Object.values(node.activeModeMovements);
		expect(movements.filter((movement) => movement.mode === "pedestrian")).toHaveLength(3);
		expect(movements.filter((movement) => movement.mode === "bicycle")).toHaveLength(6);
		expect(buildRoadActiveModeGuides(node)).toHaveLength(9);
	});

	test("preserves an individual active-mode restriction on regeneration", () => {
		const node = activeTee();
		const movement = Object.values(node.activeModeMovements)[0]!;
		node.activeModeMovements = setRoadActiveModeMovementEnabled(node, movement.id, false)!;
		const rebuilt = buildRoadActiveModeMovements(node);
		expect(rebuilt[movement.id]?.enabled).toBe(false);
	});

	test("renders counts, overlay toggle, and per-movement controls", () => {
		const markup = renderToStaticMarkup(createElement(RoadActiveModeInspector, {
			node: activeTee(),
			onUpdate: () => {},
		}));
		expect(markup).toContain('aria-label="Pedestrian and bicycle junction movements"');
		expect(markup).toContain("3 pedestrian crossings");
		expect(markup).toContain("6 bicycle movements");
		expect(markup).toContain('aria-label="Show pedestrian and bicycle movements"');
	});
});
