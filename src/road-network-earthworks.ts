import { buildRoadCrossSection } from "./road-cross-section";
import { resolveRoadBridgeStyle } from "./road-network-bridge";
import { sampleRoadEdgePoints } from "./road-network-geometry";
import type { RoadGraphEdge, RoadNetworkNode } from "./schema";
import { surfaceHeightAt, type TerrainField } from "./terrain-field-compat";

export const DEFAULT_EMBANKMENT_SLOPE = 2;
export const DEFAULT_EXCAVATION_SLOPE = 1.5;

export type RoadEarthworkKind = "fill" | "cut";
export type RoadEarthworkSide = "left" | "right";

export type RoadEarthworkSample = {
	inner: readonly [number, number, number];
	outer: readonly [number, number, number];
};

export type RoadEarthworkStrip = {
	edgeId: string;
	id: string;
	kind: RoadEarthworkKind;
	samples: RoadEarthworkSample[];
	side: RoadEarthworkSide;
};

export type RoadEarthworkGeometry = {
	indices: number[];
	positions: number[];
};

function finiteOr(value: number | undefined, fallback: number): number {
	return Number.isFinite(value) ? value! : fallback;
}

function isGroundEdge(node: RoadNetworkNode, edge: RoadGraphEdge): boolean {
	return (
		node.graphNodes[edge.startNodeId]?.elevationMode === "ground" &&
		node.graphNodes[edge.endNodeId]?.elevationMode === "ground"
	);
}

function sampleEarthwork(
	point: readonly [number, number, number],
	previous: readonly [number, number, number],
	next: readonly [number, number, number],
	halfWidth: number,
	surfaceThickness: number,
	side: RoadEarthworkSide,
	field: TerrainField,
	embankmentSlope: number,
	excavationSlope: number,
): (RoadEarthworkSample & { kind: RoadEarthworkKind }) | null {
	const dx = next[0] - previous[0];
	const dz = next[2] - previous[2];
	const length = Math.max(Math.hypot(dx, dz), 1e-6);
	const direction = side === "left" ? 1 : -1;
	const normalX = (-dz / length) * direction;
	const normalZ = (dx / length) * direction;
	const innerX = point[0] + normalX * halfWidth;
	const innerZ = point[2] + normalZ * halfWidth;
	const innerY = point[1] + surfaceThickness - 0.015;
	const terrainAtEdge = surfaceHeightAt(field, innerX, innerZ);
	const initialDifference = innerY - terrainAtEdge;
	if (Math.abs(initialDifference) <= 0.05) return null;
	const kind: RoadEarthworkKind = initialDifference > 0 ? "fill" : "cut";
	const slope = kind === "fill" ? embankmentSlope : excavationSlope;
	let run = Math.abs(initialDifference) * slope;
	let outerY = terrainAtEdge;
	// Re-sample twice so the toe/daylight point follows a sloping heightfield
	// instead of assuming the terrain at the road edge is horizontally flat.
	for (let iteration = 0; iteration < 2; iteration++) {
		const outerX = innerX + normalX * run;
		const outerZ = innerZ + normalZ * run;
		outerY = surfaceHeightAt(field, outerX, outerZ);
		run = Math.abs(innerY - outerY) * slope;
	}
	if (run <= 0.05) return null;
	return {
		inner: [innerX, innerY, innerZ],
		kind,
		outer: [innerX + normalX * run, outerY, innerZ + normalZ * run],
	};
}

/** Build daylighted fill and cut strips along ground-mode road edges. */
export function buildRoadEarthworkStrips(
	node: RoadNetworkNode,
	field: TerrainField | null,
): RoadEarthworkStrip[] {
	if (!field) return [];
	const embankmentSlope = finiteOr(
		node.embankmentSlope,
		DEFAULT_EMBANKMENT_SLOPE,
	);
	const excavationSlope = finiteOr(
		node.excavationSlope,
		DEFAULT_EXCAVATION_SLOPE,
	);
	const strips: RoadEarthworkStrip[] = [];
	for (const edge of Object.values(node.edges).sort((a, b) => a.id.localeCompare(b.id))) {
		if (!isGroundEdge(node, edge)) continue;
		const style = resolveRoadBridgeStyle(node, edge);
		if (!style) continue;
		const points = sampleRoadEdgePoints(node, edge, 48);
		if (points.length < 2) continue;
		const halfWidth = buildRoadCrossSection(style).totalWidth / 2;
		for (const side of ["left", "right"] as const) {
			let current: RoadEarthworkStrip | null = null;
			for (let index = 0; index < points.length; index++) {
				const sample = sampleEarthwork(
					points[index]!,
					points[Math.max(0, index - 1)]!,
					points[Math.min(points.length - 1, index + 1)]!,
					halfWidth,
					style.surfaceThickness,
					side,
					field,
					embankmentSlope,
					excavationSlope,
				);
				if (!sample) {
					if (current && current.samples.length >= 2) strips.push(current);
					current = null;
					continue;
				}
				if (!current || current.kind !== sample.kind) {
					if (current && current.samples.length >= 2) strips.push(current);
					current = {
						edgeId: edge.id,
						id: `${edge.id}:${side}:${sample.kind}:${index}`,
						kind: sample.kind,
						samples: [],
						side,
					};
				}
				current.samples.push({ inner: sample.inner, outer: sample.outer });
			}
			if (current && current.samples.length >= 2) strips.push(current);
		}
	}
	return strips;
}

export function buildRoadEarthworkGeometry(
	strip: RoadEarthworkStrip,
): RoadEarthworkGeometry {
	const positions = strip.samples.flatMap((sample) => [
		...sample.inner,
		...sample.outer,
	]);
	const indices: number[] = [];
	for (let index = 0; index < strip.samples.length - 1; index++) {
		const inner = index * 2;
		const outer = inner + 1;
		const nextInner = inner + 2;
		const nextOuter = inner + 3;
		indices.push(inner, nextInner, outer, outer, nextInner, nextOuter);
	}
	return { indices, positions };
}
