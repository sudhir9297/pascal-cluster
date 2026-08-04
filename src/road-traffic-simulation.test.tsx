import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildRoadLaneMovements } from "./road-lane-movements";
import { buildDirectedRoadLanes } from "./road-network-lanes";
import {
	buildRoadTrafficRouteGuide,
	buildRoadTrafficRoutes,
	buildRoadTrafficVehicleSamples,
	findRoadLaneRoute,
	RoadTrafficSimulationInspector,
} from "./road-traffic-simulation";
import { RoadNetworkNode } from "./schema";
import { createEmptyRoadGraph, insertRoadSegment } from "./road-network-topology";

function trafficTee() {
	const through = insertRoadSegment(createEmptyRoadGraph(), [-20, 0, 0], [20, 0, 0]);
	const branch = insertRoadSegment(through.graph, [0, 0, 16], [0, 0, 0]);
	const node = RoadNetworkNode.parse(branch.graph);
	node.lanes = buildDirectedRoadLanes(node);
	node.laneMovements = buildRoadLaneMovements(node);
	node.trafficRoutes = buildRoadTrafficRoutes(node);
	return node;
}

describe("lane-level routing and traffic simulation", () => {
	test("finds permitted terminal-to-terminal routes through the lane graph", () => {
		const node = trafficTee();
		const routes = Object.values(node.trafficRoutes);
		expect(routes).toHaveLength(6);
		expect(routes.every((route) => route.laneIds.length === 2 && route.movementIds.length === 1)).toBe(true);
		expect(routes.every((route) => route.lengthMeters > 0 && route.travelTimeSeconds > 0)).toBe(true);
		const first = routes[0]!;
		expect(findRoadLaneRoute(node, first.startLaneId, first.endLaneId)?.laneIds).toEqual(first.laneIds);
	});

	test("samples a route guide and demand-based vehicle preview", () => {
		const node = trafficTee();
		const route = Object.values(node.trafficRoutes)[0]!;
		const guide = buildRoadTrafficRouteGuide(node, route);
		const atZero = buildRoadTrafficVehicleSamples(node, route);
		node.trafficPreviewTimeSeconds = 5;
		const later = buildRoadTrafficVehicleSamples(node, route);
		expect(guide.length).toBeGreaterThan(2);
		expect(atZero.length).toBeGreaterThan(0);
		expect(later[0]?.position).not.toEqual(atZero[0]?.position);
	});

	test("renders route selection, demand, time, and simulation toggle", () => {
		const markup = renderToStaticMarkup(createElement(RoadTrafficSimulationInspector, {
			node: trafficTee(),
			onUpdate: () => {},
		}));
		expect(markup).toContain('aria-label="Lane level routing and traffic simulation"');
		expect(markup).toContain("6 reachable lane routes");
		expect(markup).toContain('aria-label="Traffic simulation route"');
		expect(markup).toContain('aria-label="Traffic demand vehicles per hour"');
		expect(markup).toContain('aria-label="Show lane traffic simulation"');
	});
});
