import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildRoadLaneMovementGuides, buildRoadLaneMovements, RoadLaneMovementInspector, setRoadLaneMovementEnabled } from "./road-lane-movements";
import { buildDirectedRoadLanes } from "./road-network-lanes";
import { RoadNetworkNode } from "./schema";
import { createEmptyRoadGraph, insertRoadSegment } from "./road-network-topology";

function tee() {
	const through = insertRoadSegment(createEmptyRoadGraph(), [-20, 0, 0], [20, 0, 0]);
	const branch = insertRoadSegment(through.graph, [0, 0, 16], [0, 0, 0]);
	const node = RoadNetworkNode.parse(branch.graph);
	node.lanes = buildDirectedRoadLanes(node);
	node.laneMovements = buildRoadLaneMovements(node);
	return node;
}

describe("editable lane-to-lane junction movements", () => {
	test("builds stable turning connections for every incoming lane", () => {
		const node = tee();
		const movements = Object.values(node.laneMovements);
		expect(movements.length).toBeGreaterThanOrEqual(6);
		expect(new Set(movements.map((movement) => movement.turn))).toContain("left");
		expect(new Set(movements.map((movement) => movement.turn))).toContain("right");
		expect(movements.filter((movement) => movement.turn === "u-turn").every((movement) => !movement.enabled)).toBe(true);
	});

	test("preserves an edited movement permission during regeneration", () => {
		const node = tee();
		const movement = Object.values(node.laneMovements).find((candidate) => candidate.enabled)!;
		node.laneMovements = setRoadLaneMovementEnabled(node, movement.id, false)!;
		const regenerated = buildRoadLaneMovements(node);
		expect(regenerated[movement.id]?.enabled).toBe(false);
	});

	test("renders editable movement checkboxes", () => {
		const markup = renderToStaticMarkup(
			createElement(RoadLaneMovementInspector, { node: tee(), onUpdate: () => {} }),
		);
		expect(markup).toContain('aria-label="Lane-to-lane junction movements"');
		expect(markup).toContain("movements permitted");
		expect(markup).toContain('type="checkbox"');
	});

	test("builds visible permitted and restricted guide paths from persisted lanes", () => {
		const guides = buildRoadLaneMovementGuides(tee());
		expect(guides).toHaveLength(9);
		expect(guides.some((guide) => guide.enabled)).toBe(true);
		expect(guides.some((guide) => !guide.enabled)).toBe(true);
		expect(guides.every((guide) => guide.points.length === 3)).toBe(true);
	});
});
