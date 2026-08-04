import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	ROAD_NETWORK_PERFORMANCE_BUDGETS,
	RoadPerformanceBudgetInspector,
	roadPerformanceBudgetStatus,
} from "./road-network-performance";
import { RoadNetworkNode } from "./schema";
import { createEmptyRoadGraph, insertRoadSegment } from "./road-network-topology";

describe("Pascal road performance budgets", () => {
	test("reserves bounded road time inside a 60 fps frame", () => {
		expect(ROAD_NETWORK_PERFORMANCE_BUDGETS.totalFrameMs).toBeCloseTo(1000 / 60, 2);
		expect(ROAD_NETWORK_PERFORMANCE_BUDGETS.roadGpuFrameMs).toBeLessThan(
			ROAD_NETWORK_PERFORMANCE_BUDGETS.totalFrameMs,
		);
		expect(ROAD_NETWORK_PERFORMANCE_BUDGETS.localMeshCookMs).toBeLessThan(
			ROAD_NETWORK_PERFORMANCE_BUDGETS.totalFrameMs,
		);
	});

	test("classifies measurements against the recorded production limits", () => {
		expect(roadPerformanceBudgetStatus({ gpuFrameMs: 3.9, meshCookMs: 7.9 })).toEqual({
			gpuFrame: "pass",
			meshCook: "pass",
		});
		expect(roadPerformanceBudgetStatus({ gpuFrameMs: 4.1, meshCookMs: 8.1 })).toEqual({
			gpuFrame: "over",
			meshCook: "over",
		});
	});

	test("renders the budgets and current network size in Pascal's inspector", () => {
		const graph = insertRoadSegment(
			createEmptyRoadGraph(),
			[0, 0, 0],
			[10, 0, 0],
		).graph;
		const markup = renderToStaticMarkup(
			createElement(RoadPerformanceBudgetInspector, {
				node: RoadNetworkNode.parse(graph),
			}),
		);
		expect(markup).toContain('aria-label="Road performance budgets"');
		expect(markup).toContain("Road GPU frame");
		expect(markup).toContain("Local mesh cook");
		expect(markup).toContain("Current network: 1 edge, 0 junctions");
	});
});
