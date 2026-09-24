import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	loadRoadStylePreset,
	RoadStylePresetLibrary,
} from "./road-network-preset-library";
import { RoadNetworkNode } from "./schema";

describe("road-style preset library", () => {
	test("loads only existing presets", () => {
		const node = RoadNetworkNode.parse({});
		expect(loadRoadStylePreset(node, "arterial")).toEqual({ activeStyleId: "arterial" });
		expect(loadRoadStylePreset(node, "missing")).toBeNull();
	});

	test("renders built-in preset controls without custom save actions", () => {
		const markup = renderToStaticMarkup(
			createElement(RoadStylePresetLibrary, {
				node: RoadNetworkNode.parse({}),
				onUpdate: () => {},
			}),
		);
		expect(markup).toContain('aria-label="Saved road-style preset"');
		expect(markup).toContain("Right driving");
		expect(markup).toContain("Apply to every segment");
		expect(markup).not.toContain("Save as");
		expect(markup).not.toContain("Save preset");
	});
});
