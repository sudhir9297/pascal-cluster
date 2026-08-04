import { describe, expect, test } from "bun:test";
import { planRoadGraphCleanup } from "./road-network-cleanup";
import { DEFAULT_ROAD_STYLE_PRESETS } from "./road-style-presets";
import type { RoadNetworkGraph } from "./road-network-topology";

function graph(
	nodes: Record<string, readonly [number, number, number]>,
	edges: Array<{
		end: string;
		id: string;
		joinMode?: "auto" | "suppress";
		stackLevel?: number;
		start: string;
	}>,
): RoadNetworkGraph {
	return {
		graphNodes: Object.fromEntries(
			Object.entries(nodes).map(([id, position]) => [
				id,
				{
					id,
					position: [...position],
					level: 0,
					elevationMode: "ground" as const,
					terminal: false,
				},
			]),
		),
		edges: Object.fromEntries(
			edges.map((edge) => [
				edge.id,
				{
					id: edge.id,
					startNodeId: edge.start,
					endNodeId: edge.end,
					alignment: [],
					profileMode: "legacy" as const,
					verticalProfile: [],
					styleId: "local-street",
					direction: "both" as const,
					roadClass: "local" as const,
					joinMode: edge.joinMode ?? "auto",
					stackLevel: edge.stackLevel ?? 0,
				},
			]),
		),
		attachments: {},
		junctions: {},
		stylePresets: { ...DEFAULT_ROAD_STYLE_PRESETS },
		activeStyleId: "local-street",
	};
}

describe("planRoadGraphCleanup", () => {
	test("is deterministic, reviewable, and never mutates its source", () => {
		const source = graph(
			{ a: [0, 0, 0], b: [5, 0, 0], nearB: [5.2, 0, 0], c: [10, 0, 0] },
			[
				{ id: "edge-a", start: "a", end: "b" },
				{ id: "edge-b", start: "nearB", end: "c" },
			],
		);
		const snapshot = JSON.stringify(source);
		const first = planRoadGraphCleanup(source);
		const second = planRoadGraphCleanup(source);

		expect(JSON.stringify(source)).toBe(snapshot);
		expect(first).toEqual(second);
		expect(first.changes.some((change) => change.kind === "merge-nodes")).toBe(true);
		expect(first.changes.every((change) => change.title && change.detail)).toBe(true);
		expect(Object.keys(first.resultGraph.graphNodes)).toHaveLength(3);
	});

	test("snaps a dangling endpoint to an edge and creates a T-junction", () => {
		const source = graph(
			{ a: [-5, 0, 0], b: [5, 0, 0], c: [0, 0, 4], d: [0, 0, 0.25] },
			[
				{ id: "through", start: "a", end: "b" },
				{ id: "branch", start: "c", end: "d" },
			],
		);
		const plan = planRoadGraphCleanup(source);
		const snap = plan.changes.find((change) => change.kind === "snap-node-to-edge");

		expect(snap?.nodeIds).toEqual(["d"]);
		expect(plan.resultGraph.graphNodes.d?.position).toEqual([0, 0, 0]);
		expect(
			Object.values(plan.resultGraph.edges).filter(
				(edge) => edge.startNodeId === "d" || edge.endNodeId === "d",
			),
		).toHaveLength(3);
		expect(plan.resultGraph.junctions.d?.kind).toBe("tee");
		expect(planRoadGraphCleanup(plan.resultGraph).changes).toEqual([]);
	});

	test("splits an unconnected same-level crossing but preserves grade separation", () => {
		const sameLevel = graph(
			{ a: [-5, 0, 0], b: [5, 0, 0], c: [0, 0, -5], d: [0, 0, 5] },
			[
				{ id: "horizontal", start: "a", end: "b" },
				{ id: "vertical", start: "c", end: "d" },
			],
		);
		const connected = planRoadGraphCleanup(sameLevel);
		const crossing = connected.changes.find((change) => change.kind === "split-crossing");

		expect(crossing).toBeDefined();
		expect(Object.keys(connected.resultGraph.edges)).toHaveLength(4);
		expect(crossing && connected.resultGraph.junctions[crossing.nodeIds[0]!]?.kind).toBe(
			"four-way-plus",
		);
		expect(planRoadGraphCleanup(connected.resultGraph).changes).toEqual([]);

		const separated = graph(
			{ a: [-5, 0, 0], b: [5, 0, 0], c: [0, 2, -5], d: [0, 2, 5] },
			[
				{ id: "ground", start: "a", end: "b", stackLevel: 0 },
				{ id: "bridge", start: "c", end: "d", stackLevel: 1 },
			],
		);
		separated.graphNodes.c!.elevationMode = "bridge";
		separated.graphNodes.d!.elevationMode = "bridge";
		const preserved = planRoadGraphCleanup(separated);
		expect(preserved.changes.some((change) => change.kind === "split-crossing")).toBe(false);
		expect(Object.keys(preserved.resultGraph.edges)).toHaveLength(2);
	});

	test("repairs styles and removes invalid edges, attachments, and isolated nodes", () => {
		const source = graph(
			{ a: [0, 0, 0], b: [0.01, 0, 0], isolated: [20, 0, 20] },
			[{ id: "tiny", start: "a", end: "b" }],
		);
		source.activeStyleId = "missing-active";
		source.edges.tiny!.styleId = "missing-edge-style";
		source.attachments.asset = {
			id: "asset",
			edgeId: "tiny",
			assetNodeId: "lamp",
			kind: "lamp",
			station: 0,
			lateralOffset: 0,
			verticalOffset: 0,
		};
		const plan = planRoadGraphCleanup(source);

		expect(plan.changes.some((change) => change.kind === "remove-edge")).toBe(true);
		expect(plan.changes.some((change) => change.kind === "repair-style")).toBe(true);
		expect(plan.changes.filter((change) => change.kind === "remove-node")).toHaveLength(3);
		expect(plan.resultGraph.attachments).toEqual({});
		expect(plan.resultGraph.activeStyleId).toBe("local-street");
		expect(plan.afterIssues).toEqual([]);
	});

	test("leaves a valid clean road unchanged", () => {
		const source = graph(
			{ a: [0, 0, 0], b: [10, 0, 0] },
			[{ id: "edge", start: "a", end: "b" }],
		);
		const plan = planRoadGraphCleanup(source);

		expect(plan.changes).toEqual([]);
		expect(plan.resultGraph).toEqual(source);
	});
});
