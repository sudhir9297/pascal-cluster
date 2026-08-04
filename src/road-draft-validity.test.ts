import { describe, expect, test } from "bun:test";
import {
	createEmptyRoadGraph,
	insertRoadSegment,
	previewRoadInsertion,
} from "./road-network-topology";
import { roadDraftInvalidState } from "./road-draft-validity";

describe("road draft pre-commit validity", () => {
	test("explains how to fix a too-short segment", () => {
		const preview = previewRoadInsertion(
			createEmptyRoadGraph(),
			[0, 0, 0],
			[0.02, 0, 0],
		);

		expect(roadDraftInvalidState(preview)).toEqual({
			code: "too-short",
			message: "Move the cursor at least 0.05 m away from the previous point.",
			title: "Cannot place road",
		});
	});

	test("explains that an existing segment must not be drawn again", () => {
		const graph = insertRoadSegment(createEmptyRoadGraph(), [0, 0, 0], [8, 0, 0]).graph;
		const preview = previewRoadInsertion(graph, [0, 0, 0], [8, 0, 0]);
		const invalid = roadDraftInvalidState(preview);

		expect(invalid?.code).toBe("duplicate");
		expect(invalid?.message).toContain("already exists");
		expect(invalid?.message).toContain("different endpoint");
	});

	test("returns no error for a valid new road", () => {
		const preview = previewRoadInsertion(
			createEmptyRoadGraph(),
			[0, 0, 0],
			[8, 0, 0],
		);

		expect(roadDraftInvalidState(preview)).toBeNull();
	});
});
