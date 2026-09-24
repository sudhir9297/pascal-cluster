import { describe, expect, test } from "bun:test";
import { roadRuntimeDefaultsPatch } from "./road-network-runtime-defaults";
import { createEmptyRoadGraph } from "./road-network-topology";
import { RoadNetworkNode } from "./schema";

describe("road renderer legacy-scene defaults", () => {
	test("materializes roadside spacing without replacing existing values", () => {
		const normalized = RoadNetworkNode.parse(createEmptyRoadGraph());
		const legacy = { ...normalized } as Partial<RoadNetworkNode>;
		delete legacy.roadsideDecorationSpacing;
		delete legacy.roadsideLampsBothSides;
		delete legacy.terrainOffset;
		delete legacy.bridgeDeckThickness;

		const patch = roadRuntimeDefaultsPatch(legacy, normalized);
		expect(patch.roadsideDecorationSpacing).toBe(30);
		expect(patch.roadsideLampsBothSides).toBe(false);
		expect(patch.terrainOffset).toBe(normalized.terrainOffset);
		expect(patch.bridgeDeckThickness).toBe(normalized.bridgeDeckThickness);
	});

	test("returns no patch for a fully normalized road", () => {
		const normalized = RoadNetworkNode.parse(createEmptyRoadGraph());
		expect(roadRuntimeDefaultsPatch(normalized, normalized)).toEqual({});
	});
});
