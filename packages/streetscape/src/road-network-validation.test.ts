import { describe, expect, test } from "bun:test";
import {
	createEmptyRoadGraph,
	insertRoadSegment,
} from "./road-network-topology";
import {
	roadGraphHasBlockingIssues,
	validateRoadGraph,
} from "./road-network-validation";
import { RoadNetworkNode } from "./schema";

describe("road network validation and scale", () => {
	test("accepts a clean generated network", () => {
		const graph = insertRoadSegment(
			createEmptyRoadGraph(),
			[0, 0, 0],
			[10, 0, 0],
		).graph;
		expect(validateRoadGraph(graph)).toEqual([]);
	});

	test("reports orphan references, duplicates, short edges, and missing styles", () => {
		const graph = insertRoadSegment(
			createEmptyRoadGraph(),
			[0, 0, 0],
			[10, 0, 0],
		).graph;
		const first = Object.values(graph.edges)[0]!;
		graph.edges.bad = { ...first, id: "bad", styleId: "missing-style" };
		graph.edges.orphan = { ...first, id: "orphan", startNodeId: "absent" };
		const codes = validateRoadGraph(graph).map((issue) => issue.code);
		expect(codes).toContain("duplicate-edge");
		expect(codes).toContain("missing-style");
		expect(codes).toContain("missing-endpoint");
	});

	test("builds and validates a 100-edge network inside a generous interaction budget", () => {
		const started = performance.now();
		let graph = createEmptyRoadGraph();
		for (let index = 0; index < 100; index++) {
			graph = insertRoadSegment(
				graph,
				[index * 5, 0, 0],
				[(index + 1) * 5, 0, 0],
				{
					tolerance: 0.01,
				},
			).graph;
		}
		expect(Object.keys(graph.edges)).toHaveLength(100);
		expect(validateRoadGraph(graph)).toEqual([]);
		expect(performance.now() - started).toBeLessThan(500);
	});

	test("warns when an authored bend radius cannot fit its adjacent roads", () => {
		const first = insertRoadSegment(
			createEmptyRoadGraph(),
			[0, 0, 0],
			[2, 0, 0],
			{
				bendRadius: 10,
			},
		);
		const second = insertRoadSegment(first.graph, [2, 0, 0], [2, 0, 2], {
			bendRadius: 10,
		});
		const issues = validateRoadGraph(second.graph);
		expect(
			issues.some((issue) => issue.code === "curve-radius-does-not-fit"),
		).toBe(true);
		expect(roadGraphHasBlockingIssues(second.graph)).toBe(false);
	});

	test("blocks non-finite alignment geometry", () => {
		const graph = insertRoadSegment(
			createEmptyRoadGraph(),
			[0, 0, 0],
			[10, 0, 0],
		).graph;
		Object.values(graph.edges)[0]!.alignment = [[Number.NaN, 0, 2]];
		expect(
			validateRoadGraph(graph).some(
				(issue) =>
					issue.code === "non-finite-alignment" && issue.severity === "error",
			),
		).toBe(true);
		expect(roadGraphHasBlockingIssues(graph)).toBe(true);
	});

	test("blocks malformed profiles and warns when a designed grade is too steep", () => {
		const graph = insertRoadSegment(
			createEmptyRoadGraph(),
			[0, 0, 0],
			[10, 0, 0],
		).graph;
		const edge = Object.values(graph.edges)[0]!;
		edge.profileMode = "designed";
		edge.verticalProfile = [
			{
				id: "pvi-1",
				station: 5,
				elevation: 5,
				curveLength: 0,
			},
		];
		expect(
			validateRoadGraph(graph).some(
				(issue) =>
					issue.code === "excessive-grade" && issue.severity === "warning",
			),
		).toBe(true);
		edge.verticalProfile = [
			{
				id: "pvi-bad",
				station: Number.NaN,
				elevation: 0,
				curveLength: 0,
			},
		];
		expect(
			validateRoadGraph(graph).some(
				(issue) =>
					issue.code === "invalid-vertical-profile" &&
					issue.severity === "error",
			),
		).toBe(true);
	});

	test("warns about stale primary-road and corner references in a junction record", () => {
		const base = insertRoadSegment(
			createEmptyRoadGraph(),
			[-10, 0, 0],
			[10, 0, 0],
		);
		const graph = insertRoadSegment(base.graph, [0, 0, -10], [0, 0, 0], {
			tolerance: 0.1,
		}).graph;
		const nodeId = Object.keys(graph.junctions)[0]!;
		graph.junctions[nodeId] = {
			...graph.junctions[nodeId]!,
			primaryEdgeIds: ["removed-edge"],
			cornerRadii: { "removed-edge::also-removed": 6 },
		};

		const codes = validateRoadGraph(graph).map((issue) => issue.code);

		expect(codes).toContain("invalid-junction-primary");
		expect(codes).toContain("invalid-junction-corner");
		expect(roadGraphHasBlockingIssues(graph)).toBe(false);
	});

	test("warns at the exact crossing when a bridge deck lacks vertical clearance", () => {
		const bridgeGraph = insertRoadSegment(
			createEmptyRoadGraph(),
			[-10, 4, 0],
			[10, 4, 0],
			{ elevationMode: "bridge", stackLevel: 1 },
		).graph;
		const groundGraph = insertRoadSegment(
			createEmptyRoadGraph(),
			[0, 0, -10],
			[0, 0, 10],
		).graph;
		const bridge = RoadNetworkNode.parse({ parentId: "level:test", ...bridgeGraph });
		const ground = RoadNetworkNode.parse({ parentId: "level:test", ...groundGraph });
		const issue = validateRoadGraph(bridge, bridge.maxRoadGrade, [ground]).find(
			(candidate) => candidate.code === "insufficient-bridge-clearance",
		);

		expect(issue?.severity).toBe("warning");
		expect(issue?.point?.[0]).toBeCloseTo(0);
		expect(issue?.point?.[2]).toBeCloseTo(0);
		expect(issue?.message).toContain("4.50 m is required");
	});
});
