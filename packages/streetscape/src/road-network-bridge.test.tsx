import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	buildRoadBridgePrismGeometry,
	buildRoadBridgeSpans,
	roadBridgeClearanceChecks,
} from "./road-network-bridge";
import { RoadNetworkModel } from "./road-network-model";
import {
	createEmptyRoadGraph,
	insertRoadSegment,
} from "./road-network-topology";
import { RoadNetworkNode } from "./schema";

function bridgeNetwork(
	y = 5.5,
	start: readonly [number, number, number] = [-20, y, 0],
	end: readonly [number, number, number] = [20, y, 0],
) {
	const result = insertRoadSegment(
		createEmptyRoadGraph(),
		start,
		end,
		{ elevationMode: "bridge", stackLevel: 1 },
	);
	return RoadNetworkNode.parse({ parentId: "level:test", ...result.graph });
}

function groundNetwork() {
	const result = insertRoadSegment(
		createEmptyRoadGraph(),
		[0, 0, -20],
		[0, 0, 20],
	);
	return RoadNetworkNode.parse({ parentId: "level:test", ...result.graph });
}

describe("road bridge structure", () => {
	test("builds a complete deck with barriers, evenly spaced piers, and terminal abutments", () => {
		const node = bridgeNetwork();
		const spans = buildRoadBridgeSpans(node);

		expect(spans).toHaveLength(1);
		expect(spans[0]!.deckWidth).toBeGreaterThan(10);
		expect(spans[0]!.deckThickness).toBe(0.65);
		expect(spans[0]!.barrierHeight).toBe(1.05);
		expect(spans[0]!.piers).toHaveLength(2);
		expect(spans[0]!.abutments).toHaveLength(2);
		expect(
			spans[0]!.piers.every((pier) => pier.topY > 4 && pier.deckWidth > 10),
		).toBe(true);
	});

	test("places abutments only at the terminal ends of a connected bridge run", () => {
		const first = insertRoadSegment(
			createEmptyRoadGraph(),
			[-20, 5.5, 0],
			[0, 5.5, 0],
			{ elevationMode: "bridge", stackLevel: 1 },
		);
		const second = insertRoadSegment(
			first.graph,
			[0, 5.5, 0],
			[20, 5.5, 8],
			{ elevationMode: "bridge", stackLevel: 1 },
		);
		const node = RoadNetworkNode.parse({ parentId: "level:test", ...second.graph });
		const abutments = buildRoadBridgeSpans(node).flatMap((span) => span.abutments);

		expect(abutments).toHaveLength(2);
		expect(new Set(abutments.map((abutment) => abutment.nodeId)).size).toBe(2);
	});

	test("creates a closed curved prism with top, bottom, sides, and end caps", () => {
		const geometry = buildRoadBridgePrismGeometry(
			[
				[0, 5, 0],
				[5, 5.5, 2],
				[10, 6, 0],
			],
			10,
			0.1,
			-0.6,
		);

		expect(geometry.positions).toHaveLength(3 * 4 * 3);
		expect(geometry.indices.length).toBeGreaterThan(24);
		expect(Math.min(...geometry.positions.filter((_, index) => index % 3 === 1))).toBe(4.4);
		expect(Math.max(...geometry.positions.filter((_, index) => index % 3 === 1))).toBe(6.1);
	});

	test("reports a low bridge-over-road crossing and accepts adequate clearance", () => {
		const ground = groundNetwork();
		const low = bridgeNetwork(4);
		const adequate = bridgeNetwork(5.5);
		const lowChecks = roadBridgeClearanceChecks(low, [ground]);

		expect(lowChecks).toHaveLength(1);
		expect(lowChecks[0]!.clearance).toBeLessThan(lowChecks[0]!.required);
		expect(lowChecks[0]!.lowerNetworkId).toBe(ground.id);
		expect(roadBridgeClearanceChecks(adequate, [ground])).toEqual([]);
	});

	test("renders deck, two barriers, pier bents, abutments, and clearance feedback", () => {
		const low = bridgeNetwork(4);
		const ground = groundNetwork();
		const previousConsoleError = console.error;
		console.error = () => {};
		let markup = "";
		try {
			markup = renderToStaticMarkup(
				createElement(RoadNetworkModel, {
					node: low,
					clearancePeers: [ground],
				}),
			);
		} finally {
			console.error = previousConsoleError;
		}

		expect(markup).toContain('name="road-bridge-deck"');
		expect(markup.match(/name="road-bridge-barrier:/g)).toHaveLength(2);
		expect(markup).toContain('name="road-bridge-pier-cap"');
		expect(markup).toContain('name="road-bridge-pier-column"');
		expect(markup.match(/name="road-bridge-abutment-wall"/g)).toHaveLength(2);
		expect(markup).toContain(
			'name="road-validation-warning:insufficient-bridge-clearance"',
		);
	});
});
