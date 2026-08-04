import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildRoadLaneMovements } from "./road-lane-movements";
import { buildDirectedRoadLanes } from "./road-network-lanes";
import {
	buildRoadSweptPathCheck,
	ROAD_DESIGN_VEHICLES,
	RoadSweptPathInspector,
} from "./road-swept-path";
import { RoadNetworkNode } from "./schema";
import { createEmptyRoadGraph, insertRoadSegment } from "./road-network-topology";

function turningTee() {
	const through = insertRoadSegment(createEmptyRoadGraph(), [-20, 0, 0], [20, 0, 0]);
	const branch = insertRoadSegment(through.graph, [0, 0, 16], [0, 0, 0]);
	const node = RoadNetworkNode.parse(branch.graph);
	node.lanes = buildDirectedRoadLanes(node);
	node.laneMovements = buildRoadLaneMovements(node);
	node.sweptPathMovementId = Object.values(node.laneMovements).find(
		(movement) => movement.enabled && movement.turn === "right",
	)!.id;
	return node;
}

describe("design vehicle swept-path checks", () => {
	test("simulates a selected turn with a sampled swept envelope", () => {
		const check = buildRoadSweptPathCheck(turningTee())!;
		expect(check.points).toHaveLength(33);
		expect(check.envelopeWidth).toBeGreaterThan(check.vehicle.width);
		expect(Number.isFinite(check.minimumPathRadius)).toBe(true);
		expect(typeof check.passes).toBe("boolean");
	});

	test("requires a wider swept envelope for a tractor trailer", () => {
		const car = turningTee();
		const carCheck = buildRoadSweptPathCheck(car)!;
		const trailer = { ...car, designVehicle: "tractor-trailer" as const };
		const trailerCheck = buildRoadSweptPathCheck(trailer)!;
		expect(trailerCheck.envelopeWidth).toBeGreaterThan(carCheck.envelopeWidth);
		expect(ROAD_DESIGN_VEHICLES["tractor-trailer"].minTurningRadius).toBeGreaterThan(
			ROAD_DESIGN_VEHICLES["passenger-car"].minTurningRadius,
		);
	});

	test("renders vehicle, movement, overlay, and pass/fail controls", () => {
		const markup = renderToStaticMarkup(createElement(RoadSweptPathInspector, {
			node: turningTee(),
			onUpdate: () => {},
		}));
		expect(markup).toContain('aria-label="Design vehicle swept path check"');
		expect(markup).toContain('aria-label="Road design vehicle"');
		expect(markup).toContain('aria-label="Swept path lane movement"');
		expect(markup).toContain('aria-label="Show design vehicle swept path"');
	});
});
