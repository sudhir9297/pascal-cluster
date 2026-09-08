import {
	type RoadGeometryPoint,
	sampleRoadEdgePoints,
} from "./road-network-geometry";
import { roadPlanPointAtStation } from "./road-network-vertical-profile";
import { roadCarriagewayWidth } from "./road-cross-section";
import type { RoadGraphEdge, RoadNetworkNode, RoadStylePreset } from "./schema";
import {
	quantize,
	surfaceHeightAt,
	type TerrainField,
} from "./terrain-field-compat";

export type RoadTerrainResult<T> = {
	changed: number;
	value: T;
};

function edgeFollowsGround(
	network: Pick<RoadNetworkNode, "graphNodes">,
	edge: RoadGraphEdge,
): boolean {
	return (
		network.graphNodes[edge.startNodeId]?.elevationMode === "ground" &&
		network.graphNodes[edge.endNodeId]?.elevationMode === "ground"
	);
}

/**
 * Put ground-mode road control points on the terrain surface. Bridge edges are
 * deliberately left alone: conforming terrain is an explicit road
 * operation, not a reason to destroy authored structures.
 */
export function conformRoadNetworkToTerrain(
	network: RoadNetworkNode,
	field: TerrainField,
	offset = 0,
): RoadTerrainResult<Pick<RoadNetworkNode, "edges" | "graphNodes">> {
	let changed = 0;
	const groundEdgeIds = new Set(
		Object.values(network.edges)
			.filter((edge) => edgeFollowsGround(network, edge))
			.map((edge) => edge.id),
	);
	const groundNodeIds = new Set(
		Object.values(network.edges)
			.filter((edge) => groundEdgeIds.has(edge.id))
			.flatMap((edge) => [edge.startNodeId, edge.endNodeId]),
	);
	const graphNodes = Object.fromEntries(
		Object.entries(network.graphNodes).map(([id, graphNode]) => {
			if (!groundNodeIds.has(id) || graphNode.elevationMode !== "ground") {
				return [id, graphNode];
			}
			const elevation =
				surfaceHeightAt(field, graphNode.position[0], graphNode.position[2]) +
				offset;
			if (Math.abs(elevation - graphNode.position[1]) > 1e-6) changed++;
			return [
				id,
				{
					...graphNode,
					position: [graphNode.position[0], elevation, graphNode.position[2]],
				},
			];
		}),
	) as RoadNetworkNode["graphNodes"];
	const edges = Object.fromEntries(
		Object.entries(network.edges).map(([id, edge]) => {
			if (!groundEdgeIds.has(id)) return [id, edge];
			return [
				id,
				{
					...edge,
					alignment: edge.alignment.map((point) => {
						const elevation =
							surfaceHeightAt(field, point[0], point[2]) + offset;
						if (Math.abs(elevation - point[1]) > 1e-6) changed++;
						return [point[0], elevation, point[2]] as RoadGeometryPoint;
					}),
					verticalProfile:
						edge.profileMode === "designed"
							? edge.verticalProfile.map((profilePoint) => {
									const planPoint = roadPlanPointAtStation(
										network,
										edge,
										profilePoint.station,
									);
									if (!planPoint) return profilePoint;
									const elevation =
										surfaceHeightAt(field, planPoint[0], planPoint[2]) + offset;
									if (Math.abs(elevation - profilePoint.elevation) > 1e-6)
										changed++;
									return { ...profilePoint, elevation };
								})
							: edge.verticalProfile,
				},
			];
		}),
	) as RoadNetworkNode["edges"];
	return { changed, value: { edges, graphNodes } };
}

function sideWidth(
	side: RoadStylePreset["leftSide"],
	fallbackSidewalkWidth: number,
): number {
	if (!side) return fallbackSidewalkWidth;
	return (
		side.parkingLaneWidth +
		side.bikeLaneWidth +
		side.gutterWidth +
		side.curbWidth +
		side.vergeWidth +
		side.sidewalkWidth
	);
}

function roadHalfWidth(style: RoadStylePreset): number {
	const carriageway = roadCarriagewayWidth(style);
	return (
		carriageway / 2 +
		Math.max(
			sideWidth(style.leftSide, style.sidewalkWidth),
			sideWidth(style.rightSide, style.sidewalkWidth),
		)
	);
}

type TerrainRoadSegment = {
	from: RoadGeometryPoint;
	halfWidth: number;
	to: RoadGeometryPoint;
};

function groundRoadSegments(network: RoadNetworkNode): TerrainRoadSegment[] {
	return Object.values(network.edges).flatMap((edge) => {
		if (!edgeFollowsGround(network, edge)) return [];
		const style = network.stylePresets[edge.styleId];
		if (!style) return [];
		const points = sampleRoadEdgePoints(network, edge, 64);
		return points.slice(1).flatMap((to, index) => {
			const from = points[index];
			return from ? [{ from, halfWidth: roadHalfWidth(style), to }] : [];
		});
	});
}

function closestOnRoadSegment(
	x: number,
	z: number,
	segment: TerrainRoadSegment,
): { distance: number; elevation: number } {
	const dx = segment.to[0] - segment.from[0];
	const dz = segment.to[2] - segment.from[2];
	const lengthSquared = dx * dx + dz * dz;
	const parameter =
		lengthSquared < 1e-9
			? 0
			: Math.max(
					0,
					Math.min(
						1,
						((x - segment.from[0]) * dx + (z - segment.from[2]) * dz) /
							lengthSquared,
					),
				);
	const closestX = segment.from[0] + dx * parameter;
	const closestZ = segment.from[2] + dz * parameter;
	return {
		distance: Math.hypot(x - closestX, z - closestZ),
		elevation: segment.from[1] + (segment.to[1] - segment.from[1]) * parameter,
	};
}

/**
 * Blend the terrain toward the road profile. The full road footprint is pinned
 * to the road elevation; the outer corridor uses a C1 cosine falloff, avoiding
 * the visible rim produced by a hard rectangular flatten.
 */
export function gradeTerrainToRoad(
	network: RoadNetworkNode,
	field: TerrainField,
	falloff: number,
): RoadTerrainResult<TerrainField> {
	const segments = groundRoadSegments(network);
	if (segments.length === 0) return { changed: 0, value: field };
	const safeFalloff = Math.max(0, falloff);
	const heights = new Int16Array(field.heights);
	let changed = 0;

	for (let row = 0; row < field.rows; row++) {
		const z = field.origin[1] + row * field.spacing;
		for (let col = 0; col < field.cols; col++) {
			const x = field.origin[0] + col * field.spacing;
			let best:
				| { distance: number; elevation: number; halfWidth: number }
				| undefined;
			for (const segment of segments) {
				const candidate = closestOnRoadSegment(x, z, segment);
				if (!best || candidate.distance < best.distance) {
					best = { ...candidate, halfWidth: segment.halfWidth };
				}
			}
			if (!best || best.distance > best.halfWidth + safeFalloff) continue;
			const outside = Math.max(0, best.distance - best.halfWidth);
			const weight =
				safeFalloff <= 1e-6 || outside <= 0
					? 1
					: (1 + Math.cos(Math.PI * (outside / safeFalloff))) / 2;
			const current = (heights[row * field.cols + col] ?? 0) * field.step;
			const next = quantize(
				field,
				current + (best.elevation - current) * weight,
			);
			const index = row * field.cols + col;
			if (next !== heights[index]) {
				heights[index] = next;
				changed++;
			}
		}
	}

	if (changed === 0) return { changed, value: field };
	return { changed, value: { ...field, heights } };
}
