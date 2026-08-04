import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	buildRoadsideDecorationPreviews,
	buildRoadsideDecorations,
	RoadsideDecorationInspector,
} from "./roadside-decoration-rules";
import { RoadNetworkNode } from "./schema";
import { createEmptyRoadGraph, insertRoadSegment } from "./road-network-topology";

function longRoad() {
	const inserted = insertRoadSegment(createEmptyRoadGraph(), [0, 0, 0], [100, 0, 0]);
	const node = RoadNetworkNode.parse(inserted.graph);
	node.roadsideDecorations = buildRoadsideDecorations(node);
	return node;
}

describe("semantic roadside decoration rules", () => {
	test("derives stable lamps, verge trees, and terminal signs", () => {
		const node = longRoad();
		const items = Object.values(node.roadsideDecorations);
		expect(items.some((item) => item.kind === "lamp")).toBe(true);
		expect(items.some((item) => item.kind === "tree")).toBe(true);
		expect(items.some((item) => item.kind === "sign")).toBe(true);
		expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
	});

	test("responds to density and individual rule switches", () => {
		const sparse = longRoad();
		sparse.roadsideDecorationDensity = "sparse";
		const sparseCount = Object.keys(buildRoadsideDecorations(sparse)).length;
		const dense = longRoad();
		dense.roadsideDecorationDensity = "dense";
		const denseCount = Object.keys(buildRoadsideDecorations(dense)).length;
		expect(denseCount).toBeGreaterThan(sparseCount);
		dense.roadsideDecorationRules = { ...dense.roadsideDecorationRules, trees: false };
		expect(Object.values(buildRoadsideDecorations(dense)).some((item) => item.kind === "tree")).toBe(false);
	});

	test("maps semantic stations into visible world positions", () => {
		const node = longRoad();
		const previews = buildRoadsideDecorationPreviews(node);
		expect(previews).toHaveLength(Object.keys(node.roadsideDecorations).length);
		expect(previews.every((preview) => preview.position.every(Number.isFinite))).toBe(true);
	});

	test("renders density, rule switches, counts, and preview toggle", () => {
		const markup = renderToStaticMarkup(createElement(RoadsideDecorationInspector, {
			node: longRoad(),
			onUpdate: () => {},
		}));
		expect(markup).toContain('aria-label="Semantic roadside decoration rules"');
		expect(markup).toContain('aria-label="Roadside decoration density"');
		expect(markup).toContain('aria-label="Generate roadside trees"');
		expect(markup).toContain('aria-label="Show roadside decoration preview"');
	});
});
