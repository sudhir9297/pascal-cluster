import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	addRoadManualJunctionBoundaryPoint,
	buildAutomaticRoadJunctionBoundary,
	buildManualRoadJunctionBand,
	buildManualRoadJunctionBoundary,
	enableRoadManualJunctionBoundary,
	resetRoadManualJunctionBoundary,
	updateRoadManualJunctionBoundaryPoint,
} from "./road-junction-boundary-editor";
import { RoadJunctionTreatmentControls } from "./road-network-junction-inspector";
import { RoadNetworkModel } from "./road-network-model";
import { createEmptyRoadGraph, insertRoadSegment } from "./road-network-topology";
import { RoadNetworkNode } from "./schema";

function teeNetwork() {
	const through = insertRoadSegment(createEmptyRoadGraph(), [-12, 0, 0], [12, 0, 0]);
	const branch = insertRoadSegment(through.graph, [0, 0, -10], [0, 0, 0], {
		tolerance: 0.1,
	});
	return RoadNetworkNode.parse(branch.graph);
}

describe("manual road junction boundary editor", () => {
	test("starts from the automatic solution, edits one point, and resets safely", () => {
		const node = teeNetwork();
		const junctionId = Object.keys(node.junctions)[0]!;
		const automatic = buildAutomaticRoadJunctionBoundary(node, junctionId)!;
		const enabled = enableRoadManualJunctionBoundary(node, junctionId)!;
		node.junctions = enabled;
		expect(node.junctions[junctionId]?.manualBoundaryEnabled).toBe(true);
		expect(node.junctions[junctionId]?.manualBoundaryPoints.length).toBeGreaterThanOrEqual(3);
		expect(node.junctions[junctionId]?.manualBoundaryPoints.length).toBeLessThanOrEqual(12);

		const previousZ = node.junctions[junctionId]!.manualBoundaryPoints[0]![1];
		const edited = updateRoadManualJunctionBoundaryPoint(node, junctionId, 0, 0, 9)!;
		node.junctions = edited;
		expect(node.junctions[junctionId]?.manualBoundaryPoints[0]).toEqual([9, previousZ]);
		const expanded = addRoadManualJunctionBoundaryPoint(node, junctionId)!;
		expect(expanded[junctionId]!.manualBoundaryPoints).toHaveLength(
			node.junctions[junctionId]!.manualBoundaryPoints.length + 1,
		);

		const solution = buildManualRoadJunctionBoundary(
			automatic,
			node.junctions[junctionId]!.manualBoundaryPoints,
		);
		expect(solution.indices.length).toBeGreaterThan(0);
		expect(buildManualRoadJunctionBand(solution.boundary, 0.5).indices).toHaveLength(
			solution.boundary.length * 6,
		);

		const reset = resetRoadManualJunctionBoundary(node, junctionId)!;
		expect(reset[junctionId]?.manualBoundaryEnabled).toBe(false);
		expect(reset[junctionId]?.manualBoundaryPoints).toEqual([]);
		expect(reset[junctionId]?.solverStatus).toBe("auto");
	});

	test("renders controls and selected viewport point markers", () => {
		const node = teeNetwork();
		const junctionId = Object.keys(node.junctions)[0]!;
		node.junctions = enableRoadManualJunctionBoundary(node, junctionId)!;
		const controls = renderToStaticMarkup(
			createElement(RoadJunctionTreatmentControls, {
				junctionId,
				node,
				onUpdate: () => {},
			}),
		);
		expect(controls).toContain('aria-label="Manual junction boundary editor"');
		expect(controls).toContain('aria-label="Boundary point 1 X"');
		expect(controls).toContain("Reset");

		const model = renderToStaticMarkup(
			createElement(RoadNetworkModel, {
				elementSelection: { networkId: node.id, kind: "junction", id: junctionId },
				node,
			}),
		);
		expect(model).toContain('name="road-manual-boundary-point:1"');
	});
});
