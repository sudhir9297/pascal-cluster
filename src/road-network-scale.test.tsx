import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	buildRoadSpatialTiles,
	planRoadTileStreaming,
	readRoadGeometryCacheDiagnostics,
	recordRoadGeometryCacheDiagnostics,
	RoadScaleDiagnosticsInspector,
} from "./road-network-scale";
import { RoadNetworkNode } from "./schema";
import { createEmptyRoadGraph, insertRoadSegment } from "./road-network-topology";

function longRoad() {
	return RoadNetworkNode.parse(
		insertRoadSegment(createEmptyRoadGraph(), [-96, 0, 0], [160, 0, 0]).graph,
	);
}

describe("road LOD, tiling, streaming, and cache diagnostics", () => {
	test("indexes a long edge into every crossed spatial tile", () => {
		const tiles = buildRoadSpatialTiles(longRoad(), 64);
		expect(tiles.map((tile) => tile.id)).toEqual(["-2:0", "-1:0", "0:0", "1:0", "2:0"]);
		expect(tiles.every((tile) => tile.edgeIds.length === 1)).toBe(true);
	});

	test("selects deterministic high, medium, low, and culled streaming states", () => {
		const tiles = [0, 2, 4, 10].map((x) => ({ edgeIds: [String(x)], id: `${x}:0`, x, z: 0 }));
		const plan = planRoadTileStreaming(tiles, [32, 32], {
			farLodDistance: 320,
			mediumLodDistance: 160,
			streamingRadius: 512,
			tileSize: 64,
		});
		expect(plan.map((tile) => tile.lod)).toEqual(["high", "medium", "low", "culled"]);
		expect(plan.map((tile) => tile.resident)).toEqual([true, true, true, false]);
	});

	test("records production cook-cache reuse and exposes scale diagnostics", () => {
		const node = longRoad();
		recordRoadGeometryCacheDiagnostics(node.id, {
			rebuiltProfiles: 1,
			reusedProfiles: 3,
			totalProfiles: 4,
		});
		expect(readRoadGeometryCacheDiagnostics(node.id)).toMatchObject({
			rebuiltProfiles: 1,
			reusedProfiles: 3,
		});
		const markup = renderToStaticMarkup(
			createElement(RoadScaleDiagnosticsInspector, { node }),
		);
		expect(markup).toContain('aria-label="Road scale diagnostics"');
		expect(markup).toContain("spatial tiles");
		expect(markup).toContain("LOD high");
		expect(markup).toContain("3 reused / 1 rebuilt");
	});
});
