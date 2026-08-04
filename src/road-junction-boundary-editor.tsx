"use client";

import { ShapeUtils, Vector2 } from "three";
import {
	buildJunctionBoundaryGeometry,
	sampleRoadEdgePoints,
	type JunctionBoundaryGeometryData,
	type RoadSurfaceGeometryData,
} from "./road-network-geometry";
import { DEFAULT_ROAD_STYLE_PRESETS } from "./road-style-presets";
import type { RoadGraphEdge, RoadNetworkNode, RoadStylePreset } from "./schema";

export type RoadManualBoundaryPoint = readonly [number, number];

function resolveStyle(
	node: RoadNetworkNode,
	edge: RoadGraphEdge,
): RoadStylePreset | undefined {
	const styleId = node.applyStyleToAll ? node.activeStyleId : edge.styleId;
	return (
		node.stylePresets[styleId] ??
		(DEFAULT_ROAD_STYLE_PRESETS[
			styleId as keyof typeof DEFAULT_ROAD_STYLE_PRESETS
		] as RoadStylePreset | undefined) ??
		node.stylePresets[node.activeStyleId]
	);
}

function carriagewayWidth(style: RoadStylePreset): number {
	return (
		style.laneCount * style.laneWidth +
		style.shoulderWidth * 2 +
		style.medianWidth
	);
}

export function buildAutomaticRoadJunctionBoundary(
	node: RoadNetworkNode,
	junctionId: string,
): JunctionBoundaryGeometryData | null {
	const junction = node.junctions[junctionId];
	const graphNode = node.graphNodes[junctionId];
	if (!junction || !graphNode) return null;
	const approaches = Object.values(node.edges).flatMap((edge) => {
		if (edge.startNodeId !== junctionId && edge.endNodeId !== junctionId)
			return [];
		const style = resolveStyle(node, edge);
		const points = sampleRoadEdgePoints(node, edge);
		if (!style || points.length < 2) return [];
		const from = edge.startNodeId === junctionId ? points[0]! : points.at(-1)!;
		const toward =
			edge.startNodeId === junctionId ? points[1]! : points.at(-2)!;
		return [
			{
				angle: Math.atan2(toward[2] - from[2], toward[0] - from[0]),
				edgeId: edge.id,
				halfWidth: carriagewayWidth(style) / 2,
			},
		];
	});
	return buildJunctionBoundaryGeometry(approaches, junction.cornerRadii);
}

/** Keep the manual editor usable without turning every generated arc sample into an input. */
export function editableRoadBoundaryPoints(
	boundary: ReadonlyArray<RoadManualBoundaryPoint>,
	maximum = 12,
): [number, number][] {
	if (boundary.length <= maximum) return boundary.map(([x, z]) => [x, z]);
	return Array.from({ length: maximum }, (_, index) => {
		const source = boundary[Math.floor((index * boundary.length) / maximum)]!;
		return [source[0], source[1]] as [number, number];
	});
}

export function enableRoadManualJunctionBoundary(
	node: RoadNetworkNode,
	junctionId: string,
): RoadNetworkNode["junctions"] | null {
	const junction = node.junctions[junctionId];
	const automatic = buildAutomaticRoadJunctionBoundary(node, junctionId);
	if (!junction || !automatic || automatic.boundary.length < 3) return null;
	return {
		...node.junctions,
		[junctionId]: {
			...junction,
			manualBoundaryEnabled: true,
			manualBoundaryPoints: editableRoadBoundaryPoints(automatic.boundary),
			solverStatus: "manual",
		},
	};
}

export function resetRoadManualJunctionBoundary(
	node: RoadNetworkNode,
	junctionId: string,
): RoadNetworkNode["junctions"] | null {
	const junction = node.junctions[junctionId];
	if (!junction) return null;
	return {
		...node.junctions,
		[junctionId]: {
			...junction,
			manualBoundaryEnabled: false,
			manualBoundaryPoints: [],
			solverStatus: junction.kind === "multi-leg" ? "warning" : "auto",
		},
	};
}

export function updateRoadManualJunctionBoundaryPoint(
	node: RoadNetworkNode,
	junctionId: string,
	pointIndex: number,
	axis: 0 | 1,
	value: number,
): RoadNetworkNode["junctions"] | null {
	const junction = node.junctions[junctionId];
	if (!junction?.manualBoundaryEnabled || !Number.isFinite(value)) return null;
	const current = junction.manualBoundaryPoints[pointIndex];
	if (!current) return null;
	const points = junction.manualBoundaryPoints.map(
		(point, index) =>
			(index === pointIndex
				? axisPoint(point, axis, value)
				: [point[0], point[1]]) as [number, number],
	);
	return {
		...node.junctions,
		[junctionId]: { ...junction, manualBoundaryPoints: points },
	};
}

function axisPoint(
	point: RoadManualBoundaryPoint,
	axis: 0 | 1,
	value: number,
): [number, number] {
	return axis === 0 ? [value, point[1]] : [point[0], value];
}

export function addRoadManualJunctionBoundaryPoint(
	node: RoadNetworkNode,
	junctionId: string,
): RoadNetworkNode["junctions"] | null {
	const junction = node.junctions[junctionId];
	const points = junction?.manualBoundaryPoints;
	if (!junction?.manualBoundaryEnabled || !points || points.length < 3) return null;
	const first = points[0]!;
	const last = points.at(-1)!;
	return {
		...node.junctions,
		[junctionId]: {
			...junction,
			manualBoundaryPoints: [
				...points,
				[(first[0] + last[0]) / 2, (first[1] + last[1]) / 2],
			],
		},
	};
}

export function removeRoadManualJunctionBoundaryPoint(
	node: RoadNetworkNode,
	junctionId: string,
	pointIndex: number,
): RoadNetworkNode["junctions"] | null {
	const junction = node.junctions[junctionId];
	if (!junction?.manualBoundaryEnabled || junction.manualBoundaryPoints.length <= 3)
		return null;
	return {
		...node.junctions,
		[junctionId]: {
			...junction,
			manualBoundaryPoints: junction.manualBoundaryPoints.filter(
				(_, index) => index !== pointIndex,
			),
		},
	};
}

export function buildManualRoadJunctionBoundary(
	automatic: JunctionBoundaryGeometryData,
	boundary: ReadonlyArray<RoadManualBoundaryPoint>,
): JunctionBoundaryGeometryData {
	if (boundary.length < 3) return automatic;
	const contour = boundary.map(([x, z]) => new Vector2(x, z));
	const faces = ShapeUtils.triangulateShape(contour, []);
	if (faces.length === 0) return automatic;
	return {
		...automatic,
		boundary: boundary.map(([x, z]) => [x, z]),
		indices: faces.flatMap((face) => [face[0]!, face[1]!, face[2]!]),
		maxExtent: Math.max(...boundary.map(([x, z]) => Math.hypot(x, z))),
		positions: boundary.flatMap(([x, z]) => [x, 0, z]),
	};
}

/** Build the curb/sidewalk ring around a manually authored junction polygon. */
export function buildManualRoadJunctionBand(
	boundary: ReadonlyArray<RoadManualBoundaryPoint>,
	width: number,
): RoadSurfaceGeometryData {
	if (boundary.length < 3 || width <= 0) return { indices: [], positions: [] };
	const center = boundary.reduce(
		(accumulator, [x, z]) => [accumulator[0] + x, accumulator[1] + z] as const,
		[0, 0] as const,
	);
	const centerX = center[0] / boundary.length;
	const centerZ = center[1] / boundary.length;
	const positions: number[] = [];
	for (const [x, z] of boundary) {
		const dx = x - centerX;
		const dz = z - centerZ;
		const length = Math.max(Math.hypot(dx, dz), 1e-6);
		positions.push(x, 0, z, x + (dx / length) * width, 0, z + (dz / length) * width);
	}
	const indices: number[] = [];
	for (let index = 0; index < boundary.length; index++) {
		const inner = index * 2;
		const outer = inner + 1;
		const nextInner = ((index + 1) % boundary.length) * 2;
		const nextOuter = nextInner + 1;
		indices.push(inner, nextInner, outer, nextInner, nextOuter, outer);
	}
	return { indices, positions };
}
