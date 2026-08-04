import { describe, expect, test } from "bun:test";
import { resolveAlignment } from "@pascal-app/core";
import {
	movingRoadDraftAnchor,
	roadEndpointAlignmentAnchors,
	ROAD_DRAFT_ALIGNMENT_THRESHOLD_M,
} from "./road-draft-alignment";
import { createEmptyRoadGraph, insertRoadSegment } from "./road-network-topology";

describe("road draft alignment guides", () => {
	test("contributes only compatible degree-one road endpoints", () => {
		let graph = insertRoadSegment(createEmptyRoadGraph(), [0, 0, 0], [8, 0, 0]).graph;
		graph = insertRoadSegment(graph, [8, 0, 0], [8, 0, 6]).graph;
		graph = insertRoadSegment(graph, [8, 0, 0], [12, 0, 0]).graph;

		const anchors = roadEndpointAlignmentAnchors(graph, {
			elevationMode: "ground",
			level: 0,
		});

		expect(anchors.map((anchor) => [anchor.x, anchor.z])).toEqual([
			[0, 0],
			[8, 6],
			[12, 0],
		]);
		expect(anchors.some((anchor) => anchor.x === 8 && anchor.z === 0)).toBe(false);
	});

	test("omits the active origin and vertically incompatible endpoints", () => {
		const inserted = insertRoadSegment(createEmptyRoadGraph(), [0, 0, 0], [8, 0, 0]);
		const graph = inserted.graph;
		const endId = inserted.createdNodeIds.at(-1)!;
		graph.graphNodes[endId] = {
			...graph.graphNodes[endId]!,
			elevationMode: "bridge",
			level: 1,
		};

		expect(
			roadEndpointAlignmentAnchors(graph, {
				elevationMode: "ground",
				excludePoint: [0, 0, 0],
				level: 0,
			}),
		).toEqual([]);
	});

	test("produces the host snap delta and guide for a nearby endpoint axis", () => {
		const graph = insertRoadSegment(createEmptyRoadGraph(), [4, 0, -2], [4, 0, 5]).graph;
		const candidates = roadEndpointAlignmentAnchors(graph, {
			elevationMode: "ground",
			level: 0,
		});
		const result = resolveAlignment({
			moving: [movingRoadDraftAnchor([4.12, 0, 9])],
			candidates,
			threshold: ROAD_DRAFT_ALIGNMENT_THRESHOLD_M,
		});

		expect(result.snap?.dx).toBeCloseTo(-0.12, 10);
		expect(result.guides).toHaveLength(1);
		expect(result.guides[0]).toMatchObject({ axis: "x", coord: 4 });
	});
});
