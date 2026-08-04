import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	buildRoadChannelizationGuides,
	RoadChannelizationInspector,
	setRoadSlipLane,
	setRoadTurnPocket,
} from "./road-channelization";
import { buildRoadLaneMovements } from "./road-lane-movements";
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

describe("turn-pocket and slip-lane channelization", () => {
	test("adds a persistent turn-only lane to one selected approach", () => {
		const node = tee();
		const junctionId = Object.keys(node.junctions)[0]!;
		const edgeId = Object.values(node.edges).find((edge) => edge.startNodeId === junctionId || edge.endNodeId === junctionId)!.id;
		node.junctions = setRoadTurnPocket(node, junctionId, edgeId, "left")!;
		node.lanes = buildDirectedRoadLanes(node);
		const pockets = Object.values(node.lanes).filter((lane) => lane.kind === "turn");
		expect(pockets).toHaveLength(1);
		expect(pockets[0]?.turn).toBe("left");
		node.laneMovements = buildRoadLaneMovements(node);
		expect(Object.values(node.laneMovements).filter((movement) => movement.fromLaneId === pockets[0]!.id).every((movement) => movement.turn === "left")).toBe(true);
	});

	test("builds visible pocket and curved slip-lane ribbons", () => {
		const node = tee();
		const junctionId = Object.keys(node.junctions)[0]!;
		const edgeId = Object.values(node.edges).find((edge) => edge.startNodeId === junctionId || edge.endNodeId === junctionId)!.id;
		node.junctions = setRoadTurnPocket(node, junctionId, edgeId, "right")!;
		node.lanes = buildDirectedRoadLanes(node);
		node.laneMovements = buildRoadLaneMovements(node);
		const right = Object.values(node.laneMovements).find((movement) => movement.turn === "right" && movement.enabled)!;
		node.junctions = setRoadSlipLane(node, junctionId, right.id, true)!;
		const guides = buildRoadChannelizationGuides(node);
		expect(guides.some((guide) => guide.kind === "turn-pocket")).toBe(true);
		const slip = guides.find((guide) => guide.kind === "slip-lane")!;
		expect(slip.points).toHaveLength(17);
		const center = node.graphNodes[junctionId]!.position;
		const midpoint = slip.points[8]!;
		expect(Math.hypot(midpoint[0] - center[0], midpoint[2] - center[2])).toBeGreaterThan(2);
	});

	test("renders per-approach pocket selectors and right-turn slip toggles", () => {
		const markup = renderToStaticMarkup(createElement(RoadChannelizationInspector, {
			node: tee(),
			onUpdate: () => {},
		}));
		expect(markup).toContain('aria-label="Road turn pockets and slip lanes"');
		expect(markup.match(/aria-label="Approach \d turn pocket"/g)).toHaveLength(3);
		expect(markup).toContain('aria-label="Slip lane 1"');
	});
});
