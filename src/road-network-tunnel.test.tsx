import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RoadNetworkModel } from "./road-network-model";
import {
	buildRoadTunnelLiningGeometry,
	buildRoadTunnelSpans,
	carveTerrainForTunnelPortals,
	convertRoadNetworkToTunnel,
} from "./road-network-tunnel";
import {
	createEmptyRoadGraph,
	insertRoadSegment,
} from "./road-network-topology";
import { RoadNetworkNode } from "./schema";
import { createTerrainField, quantize } from "./terrain-field-compat";

function tunnelNetwork(
	start: readonly [number, number, number] = [0, -4.5, 0],
	end: readonly [number, number, number] = [0, -4.5, 24],
) {
	const result = insertRoadSegment(createEmptyRoadGraph(), start, end, {
		elevationMode: "tunnel",
		stackLevel: -1,
	});
	return RoadNetworkNode.parse({ parentId: "level:test", ...result.graph });
}

function raisedTerrain(height = 5) {
	const field = createTerrainField({
		cols: 61,
		origin: [-20, -15],
		rows: 61,
		spacing: 1,
		step: 0.01,
	});
	field.heights.fill(quantize(field, height));
	return field;
}

describe("road tunnel structure", () => {
	test("builds a swept lining with one portal at each terminal end", () => {
		const node = tunnelNetwork();
		const spans = buildRoadTunnelSpans(node, raisedTerrain());

		expect(spans).toHaveLength(1);
		expect(spans[0]!.clearHeight).toBe(5.5);
		expect(spans[0]!.clearWidth).toBeGreaterThan(11);
		expect(spans[0]!.liningThickness).toBe(0.35);
		expect(spans[0]!.portals).toHaveLength(2);
		expect(spans[0]!.portals.every((portal) => portal.cutDepth > 0)).toBe(true);
	});

	test("keeps a connected tunnel run to two exterior portals", () => {
		const first = insertRoadSegment(
			createEmptyRoadGraph(),
			[0, -4.5, -20],
			[0, -4.5, 0],
			{ elevationMode: "tunnel", stackLevel: -1 },
		);
		const second = insertRoadSegment(
			first.graph,
			[0, -4.5, 0],
			[12, -4.5, 18],
			{ elevationMode: "tunnel", stackLevel: -1 },
		);
		const node = RoadNetworkNode.parse({ parentId: "level:test", ...second.graph });
		const portals = buildRoadTunnelSpans(node).flatMap((span) => span.portals);

		expect(portals).toHaveLength(2);
		expect(new Set(portals.map((portal) => portal.nodeId)).size).toBe(2);
	});

	test("creates finite inner, outer, invert, and end-cap lining faces", () => {
		const geometry = buildRoadTunnelLiningGeometry(
			[
				[0, -4, 0],
				[3, -3.8, 8],
				[0, -3.5, 16],
			],
			12,
			5.5,
			0.35,
			0.1,
		);

		expect(geometry.positions.length).toBeGreaterThan(250);
		expect(geometry.indices.length).toBeGreaterThan(350);
		expect(geometry.positions.every(Number.isFinite)).toBe(true);
		expect(geometry.indices.every(Number.isInteger)).toBe(true);
	});

	test("converts structure semantics without moving the authored profile", () => {
		const result = insertRoadSegment(
			createEmptyRoadGraph(),
			[2, 1.25, 3],
			[15, 2.5, 8],
		);
		const node = RoadNetworkNode.parse(result.graph);
		const before = Object.values(node.graphNodes).map((point) => point.position);
		const converted = convertRoadNetworkToTunnel(node);

		expect(converted.changed).toBe(2);
		expect(Object.values(converted.graphNodes).map((point) => point.position)).toEqual(before);
		expect(
			Object.values(converted.graphNodes).every(
				(point) => point.elevationMode === "tunnel",
			),
		).toBe(true);
		expect(Object.values(converted.edges).every((edge) => edge.stackLevel === -1)).toBe(true);
	});

	test("subtracts portal approaches while preserving covered terrain over the interior", () => {
		const node = tunnelNetwork();
		const field = raisedTerrain(0);
		const result = carveTerrainForTunnelPortals(node, field);
		const sample = (x: number, z: number) => {
			const col = Math.round((x - field.origin[0]) / field.spacing);
			const row = Math.round((z - field.origin[1]) / field.spacing);
			return (result.value.heights[row * field.cols + col] ?? 0) * field.step;
		};

		expect(result.changed).toBeGreaterThan(20);
		expect(sample(0, -3)).toBeLessThan(-4);
		expect(sample(0, 12)).toBe(0);
		expect(sample(15, -3)).toBe(0);
		expect(field.heights.every((value) => value === 0)).toBe(true);
	});

	test("renders lining, portal collars, headwalls, cut slopes, and fill aprons", () => {
		const node = tunnelNetwork();
		const previousConsoleError = console.error;
		console.error = () => {};
		let markup = "";
		try {
			markup = renderToStaticMarkup(
				createElement(RoadNetworkModel, {
					node,
					terrain: raisedTerrain(),
				}),
			);
		} finally {
			console.error = previousConsoleError;
		}

		expect(markup).toContain('name="road-tunnel-lining"');
		expect(markup.match(/name="road-tunnel-portal-collar"/g)).toHaveLength(2);
		expect(markup.match(/name="road-tunnel-portal-headwall"/g)).toHaveLength(2);
		expect(markup).not.toContain('name="road-tunnel-portal-pier"');
		expect(markup).not.toContain('name="road-tunnel-portal-cap"');
		expect(markup.match(/name="road-tunnel-fill-apron"/g)).toHaveLength(2);
		expect(markup.match(/name="road-tunnel-cut-slope:/g)).toHaveLength(4);
	});
});
