import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	loadRoadStylePreset,
	RoadStylePresetLibrary,
	saveRoadStylePreset,
} from "./road-network-preset-library";
import { RoadNetworkNode } from "./schema";

describe("user-created road-style preset library", () => {
	test("saves a complete immutable copy and makes duplicate names unique", () => {
		const node = RoadNetworkNode.parse({});
		const first = saveRoadStylePreset(node, "My Boulevard");
		const withFirst = RoadNetworkNode.parse({ ...node, ...first });
		const second = saveRoadStylePreset(withFirst, "My Boulevard");
		expect(first.activeStyleId).toBe("custom:my-boulevard");
		expect(second.activeStyleId).toBe("custom:my-boulevard-2");
		expect(first.stylePresets[first.activeStyleId]?.laneCount).toBe(2);
		expect(node.stylePresets[first.activeStyleId]).toBeUndefined();
	});

	test("loads only existing presets", () => {
		const node = RoadNetworkNode.parse({});
		expect(loadRoadStylePreset(node, "arterial")).toEqual({ activeStyleId: "arterial" });
		expect(loadRoadStylePreset(node, "missing")).toBeNull();
	});

	test("renders save and load controls", () => {
		const markup = renderToStaticMarkup(
			createElement(RoadStylePresetLibrary, {
				node: RoadNetworkNode.parse({}),
				onUpdate: () => {},
			}),
		);
		expect(markup).toContain('aria-label="Saved road-style preset"');
		expect(markup).toContain('aria-label="New road-style preset name"');
		expect(markup).toContain("Save current style as preset");
	});
});
