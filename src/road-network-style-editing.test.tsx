import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RoadCrossSectionInspector } from "./road-network-cross-section-inspector";
import {
	editRoadEdgeRoadway,
	editRoadEdgeSide,
	editRoadNetworkDefaultRoadway,
	editRoadNetworkDefaultSide,
	resetRoadEdgeStyle,
} from "./road-network-style-editing";
import { RoadNetworkNode } from "./schema";
import { createEmptyRoadGraph, insertRoadSegment } from "./road-network-topology";

describe("road cross-section inspector editing", () => {
	test("edits roadway and side values without mutating another preset", () => {
		const node = RoadNetworkNode.parse({ activeStyleId: "local-street" });
		const arterialBefore = node.stylePresets.arterial;
		const roadway = editRoadNetworkDefaultRoadway(node, "laneCount", 5.6);
		const withRoadway = RoadNetworkNode.parse({ ...node, stylePresets: roadway });
		const side = editRoadNetworkDefaultSide(
			withRoadway,
			"left",
			"bikeLaneWidth",
			1.8,
		);

		expect(roadway["local-street"]?.laneCount).toBe(6);
		expect(side["local-street"]?.leftSide?.bikeLaneWidth).toBe(1.8);
		expect(side["local-street"]?.rightSide?.bikeLaneWidth).toBe(0);
		expect(side.arterial).toEqual(arterialBefore);
		expect(node.stylePresets["local-street"]?.laneCount).toBe(2);
	});

	test("clamps direct inspector values to schema ranges", () => {
		const node = RoadNetworkNode.parse({});
		expect(editRoadNetworkDefaultRoadway(node, "laneWidth", 99)["local-street"]?.laneWidth)
			.toBe(5);
		expect(editRoadNetworkDefaultSide(node, "right", "curbWidth", -3)["local-street"]
			?.rightSide?.curbWidth).toBe(0);
	});

	test("renders a direct input for every roadway and left/right component", () => {
		const markup = renderToStaticMarkup(
			createElement(RoadCrossSectionInspector, {
				node: RoadNetworkNode.parse({}),
				onUpdate: () => {},
			}),
		);
		for (const label of [
			"Lane count",
			"Lane width",
			"Shoulder width",
			"Median width",
			"Surface thickness",
			"Left side parking lane",
			"Left side bike lane",
			"Left side gutter",
			"Left side curb",
			"Left side verge",
			"Left side sidewalk",
			"Right side parking lane",
			"Right side bike lane",
			"Right side gutter",
			"Right side curb",
			"Right side verge",
			"Right side sidewalk",
		]) {
			expect(markup).toContain(`aria-label="${label} in metres"`);
		}
	});

	test("creates an edge-local style while preserving the network default", () => {
		const first = insertRoadSegment(createEmptyRoadGraph(), [0, 0, 0], [10, 0, 0]);
		const second = insertRoadSegment(first.graph, [10, 0, 0], [20, 0, 0]);
		let node = RoadNetworkNode.parse(second.graph);
		const edgeIds = Object.keys(node.edges).sort();
		const targetId = edgeIds[0]!;
		const otherId = edgeIds[1]!;
		const roadway = editRoadEdgeRoadway(node, targetId, "laneCount", 4)!;
		node = RoadNetworkNode.parse({ ...node, ...roadway });
		const side = editRoadEdgeSide(node, targetId, "right", "parkingLaneWidth", 2.4)!;
		node = RoadNetworkNode.parse({ ...node, ...side });

		expect(node.applyStyleToAll).toBe(false);
		expect(node.activeStyleId).toBe("local-street");
		expect(node.stylePresets["local-street"]?.laneCount).toBe(2);
		expect(node.stylePresets[node.edges[targetId]!.styleId]?.laneCount).toBe(4);
		expect(
			node.stylePresets[node.edges[targetId]!.styleId]?.rightSide?.parkingLaneWidth,
		).toBe(2.4);
		expect(node.edges[otherId]?.styleId).toBe("local-street");

		const reset = resetRoadEdgeStyle(node, targetId)!;
		expect(reset.edges[targetId]?.styleId).toBe("local-street");
		expect(reset.stylePresets[`edge-style:${targetId}`]).toBeUndefined();
	});
});
