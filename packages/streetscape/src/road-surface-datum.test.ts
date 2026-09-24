import { expect, test } from "bun:test";
import {
	buildRoadPavementShell,
	buildRoadVariableRibbonGeometry,
} from "./road-pavement-geometry";
import {
	buildJunctionBoundaryGeometry,
	buildRoadRibbonGeometry,
} from "./road-network-geometry";
import { buildRoadNetworkMarkings } from "./road-network-markings";
import {
	createEmptyRoadGraph,
	insertRoadSegment,
} from "./road-network-topology";
import { RoadNetworkNode } from "./schema";

test("pavement thickness cannot lift the driving surface above its authored height", () => {
	for (const thickness of [0.1, 0.14, 0.22, 1]) {
		const mesh = buildRoadRibbonGeometry(
			[
				[0, 2, 0],
				[10, 3, 0],
			],
			{ width: 6, surfaceThickness: thickness },
		);
		expect(mesh.positions.filter((_, i) => i % 3 === 1)).toEqual([2, 2, 3, 3]);
	}
});
test("lane markings stay on the same driving surface when pavement thickness changes", () => {
	const graph = insertRoadSegment(
		createEmptyRoadGraph(),
		[0, 2, 0],
		[30, 2, 0],
	).graph;
	const first = buildRoadNetworkMarkings(RoadNetworkNode.parse(graph));
	graph.stylePresets["local-street"]!.surfaceThickness = 0.8;
	const second = buildRoadNetworkMarkings(RoadNetworkNode.parse(graph));
	expect(second).toEqual(first);
	expect(
		second.flatMap((p) => p.points).every((p) => p[1] > 2 && p[1] < 2.02),
	).toBe(true);
});

test("variable-width pavement keeps its top fixed and extrudes varying depths downward", () => {
	const samples = [
		{
			point: [0, 2, 0] as const,
			leftOffset: 3,
			rightOffset: -3,
			surfaceThickness: 0.1,
		},
		{
			point: [10, 3, 0] as const,
			leftOffset: 4,
			rightOffset: -4,
			surfaceThickness: 0.4,
		},
	];
	const top = buildRoadVariableRibbonGeometry(samples);
	expect(top.positions.filter((_, i) => i % 3 === 1)).toEqual([2, 2, 3, 3]);
	const shell = buildRoadPavementShell(top, [0.1, 0.1, 0.4, 0.4]);
	expect(shell.indices.length / 3).toBe(10);
	expect(new Set(shell.positions.filter((_, i) => i % 3 === 1))).toEqual(
		new Set([1.9, 2.6, 2, 3]),
	);
	// Coordinate-based edge counts verify a closed solid even with split normal vertices.
	const counts = new Map<string, number>();
	for (const mesh of [top, shell])
		for (let i = 0; i < mesh.indices.length; i += 3) {
			const points = mesh.indices
				.slice(i, i + 3)
				.map((index) =>
					mesh.positions.slice(index * 3, index * 3 + 3).join(","),
				);
			for (let j = 0; j < 3; j++) {
				const key = [points[j], points[(j + 1) % 3]].sort().join("|");
				counts.set(key, (counts.get(key) ?? 0) + 1);
			}
		}
	expect([...counts.values()].every((count) => count === 2)).toBe(true);
});

test("junction pavement extends below the shared top even with reversed top winding", () => {
	const top = buildJunctionBoundaryGeometry(
		[
			{ edgeId: "a", angle: 0, halfWidth: 3 },
			{ edgeId: "b", angle: Math.PI, halfWidth: 3 },
			{ edgeId: "c", angle: Math.PI / 2, halfWidth: 4 },
		],
		{},
	);
	const shell = buildRoadPavementShell(top, 0.22);
	expect(new Set(shell.positions.filter((_, i) => i % 3 === 1))).toEqual(
		new Set([0, -0.22]),
	);
	expect(shell.positions.every(Number.isFinite)).toBe(true);
});
