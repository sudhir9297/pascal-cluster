import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildRoadLaneMovements } from "./road-lane-movements";
import { buildDirectedRoadLanes } from "./road-network-lanes";
import {
	buildRoadSignalPlans,
	roadSignalMovementsConflict,
	roadSignalPhaseConflicts,
	RoadSignalPlanInspector,
	setRoadSignalPhaseTiming,
} from "./road-signal-phasing";
import { RoadNetworkNode } from "./schema";
import { createEmptyRoadGraph, insertRoadSegment } from "./road-network-topology";

function signalizedTee() {
	const through = insertRoadSegment(createEmptyRoadGraph(), [-20, 0, 0], [20, 0, 0]);
	const branch = insertRoadSegment(through.graph, [0, 0, 16], [0, 0, 0]);
	const node = RoadNetworkNode.parse(branch.graph);
	node.lanes = buildDirectedRoadLanes(node);
	node.laneMovements = buildRoadLaneMovements(node);
	const junctionId = Object.keys(node.junctions)[0]!;
	node.junctions[junctionId] = { ...node.junctions[junctionId]!, treatment: "signal" };
	node.signalPlans = buildRoadSignalPlans(node);
	return node;
}

describe("traffic-signal phase and conflict scheduling", () => {
	test("places every permitted movement in exactly one conflict-free phase", () => {
		const node = signalizedTee();
		const plan = Object.values(node.signalPlans)[0]!;
		const scheduled = plan.phases.flatMap((phase) => phase.movementIds);
		const permitted = Object.values(node.laneMovements)
			.filter((movement) => movement.enabled)
			.map((movement) => movement.id)
			.sort();
		expect([...scheduled].sort()).toEqual(permitted);
		expect(new Set(scheduled).size).toBe(scheduled.length);
		expect(plan.phases.every((phase) => roadSignalPhaseConflicts(node, phase).length === 0)).toBe(true);
	});

	test("identifies movements that compete for the same incoming lane", () => {
		const node = signalizedTee();
		const movements = Object.values(node.laneMovements).filter((movement) => movement.enabled);
		const first = movements.find((movement) => movements.some(
			(candidate) => candidate.id !== movement.id && candidate.fromLaneId === movement.fromLaneId,
		))!;
		const second = movements.find(
			(candidate) => candidate.id !== first.id && candidate.fromLaneId === first.fromLaneId,
		)!;
		expect(roadSignalMovementsConflict(node, first, second)).toBe(true);
	});

	test("retains user timing values when topology-derived plans regenerate", () => {
		const node = signalizedTee();
		const plan = Object.values(node.signalPlans)[0]!;
		const signalPlans = setRoadSignalPhaseTiming(node, plan.junctionNodeId, plan.phases[0]!.id, {
			durationSeconds: 42,
		})!;
		node.signalPlans = signalPlans;
		const rebuilt = buildRoadSignalPlans(node);
		expect(rebuilt[plan.junctionNodeId]?.phases[0]?.durationSeconds).toBe(42);
	});

	test("renders controller mode, cycle length, and editable phase times", () => {
		const markup = renderToStaticMarkup(createElement(RoadSignalPlanInspector, {
			node: signalizedTee(),
			onUpdate: () => {},
		}));
		expect(markup).toContain('aria-label="Traffic signal phase schedule"');
		expect(markup).toContain('aria-label="Signal controller mode"');
		expect(markup).toContain('green time');
		expect(markup).toContain('conflict-free');
	});
});
