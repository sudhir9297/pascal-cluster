import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	overrideRoadJunctionApproachControl,
	overrideRoadJunctionTreatment,
	RoadJunctionInspector,
	RoadJunctionTreatmentControls,
} from "./road-network-junction-inspector";
import { RoadNetworkNode } from "./schema";
import { createEmptyRoadGraph, insertRoadSegment } from "./road-network-topology";

function teeNetwork() {
	const through = insertRoadSegment(createEmptyRoadGraph(), [-10, 0, 0], [10, 0, 0]);
	const branch = insertRoadSegment(through.graph, [0, 0, -8], [0, 0, 0], {
		tolerance: 0.1,
	});
	return RoadNetworkNode.parse(branch.graph);
}

describe("individual road junction treatment inspector", () => {
	test("overrides only the selected junction record", () => {
		const node = teeNetwork();
		const junctionId = Object.keys(node.junctions)[0]!;
		const junctions = overrideRoadJunctionTreatment(node, junctionId, "signal")!;
		expect(junctions[junctionId]?.treatment).toBe("signal");
		expect(node.junctions[junctionId]?.treatment).toBe("auto");
	});

	test("renders the selected junction and every supported treatment", () => {
		const node = teeNetwork();
		const junctionId = Object.keys(node.junctions)[0]!;
		const markup = renderToStaticMarkup(
			createElement(RoadJunctionTreatmentControls, {
				junctionId,
				node,
				onUpdate: () => {},
			}),
		);
		expect(markup).toContain('aria-label="Selected junction treatment"');
		for (const treatment of ["auto", "stop", "yield", "signal", "roundabout"]) {
			expect(markup).toContain(`value="${treatment}"`);
		}
		expect(markup.match(/aria-label="Approach \d control"/g)).toHaveLength(3);
	});

	test("overrides exactly one junction approach control", () => {
		const node = teeNetwork();
		const junctionId = Object.keys(node.junctions)[0]!;
		const edgeId = Object.values(node.edges).find(
			(edge) => edge.startNodeId === junctionId || edge.endNodeId === junctionId,
		)!.id;
		const junctions = overrideRoadJunctionApproachControl(node, junctionId, edgeId, "yield")!;
		expect(junctions[junctionId]?.approachControls[edgeId]).toBe("yield");
		expect(node.junctions[junctionId]?.approachControls[edgeId]).toBeUndefined();
	});

	test("provides an explicit picker when canvas targeting is obstructed", () => {
		const markup = renderToStaticMarkup(
			createElement(RoadJunctionInspector, {
				node: teeNetwork(),
				onUpdate: () => {},
			}),
		);
		expect(markup).toContain('aria-label="Road junction"');
		expect(markup).toContain("Choose junction");
	});
});
