import { buildRoadCrossSection } from "./road-cross-section";
import { resolveRoadBridgeStyle } from "./road-network-bridge";
import { sampleRoadEdgePoints } from "./road-network-geometry";
import { incidentRoadEdges } from "./road-network-topology";
import type { RoadGraphEdge, RoadNetworkNode } from "./schema";
import {
	quantize,
	surfaceHeightAt,
	type TerrainField,
} from "./terrain-field-compat";

export const DEFAULT_TUNNEL_CLEAR_HEIGHT_M = 5.5;
export const DEFAULT_TUNNEL_SIDE_CLEARANCE_M = 0.75;
export const DEFAULT_TUNNEL_LINING_THICKNESS_M = 0.35;
export const DEFAULT_TUNNEL_PORTAL_CUT_LENGTH_M = 6;
export const DEFAULT_TUNNEL_CUT_SLOPE = 1.5;

export type RoadTunnelPortal = {
	angle: number;
	clearHeight: number;
	clearWidth: number;
	cutDepth: number;
	cutLength: number;
	cutSlope: number;
	edgeId: string;
	id: string;
	liningThickness: number;
	nodeId: string;
	outward: readonly [number, number];
	point: readonly [number, number, number];
	roadSurfaceY: number;
	terrainY: number;
};

export type RoadTunnelSpan = {
	clearHeight: number;
	clearWidth: number;
	edgeId: string;
	liningThickness: number;
	points: Array<readonly [number, number, number]>;
	portals: RoadTunnelPortal[];
	surfaceThickness: number;
};

export type RoadTunnelGeometry = {
	indices: number[];
	positions: number[];
};

function finiteOr(value: number | undefined, fallback: number): number {
	return Number.isFinite(value) ? value! : fallback;
}

export function isRoadTunnelEdge(
	node: Pick<RoadNetworkNode, "graphNodes">,
	edge: RoadGraphEdge,
): boolean {
	return (
		node.graphNodes[edge.startNodeId]?.elevationMode === "tunnel" &&
		node.graphNodes[edge.endNodeId]?.elevationMode === "tunnel"
	);
}

function endpointOutward(
	points: Array<readonly [number, number, number]>,
	atStart: boolean,
): readonly [number, number] {
	const endpoint = atStart ? points[0]! : points.at(-1)!;
	const interior = atStart ? points[1]! : points.at(-2)!;
	const dx = endpoint[0] - interior[0];
	const dz = endpoint[2] - interior[2];
	const length = Math.max(Math.hypot(dx, dz), 1e-6);
	return [dx / length, dz / length];
}

function terminalPortal(
	node: RoadNetworkNode,
	edge: RoadGraphEdge,
	points: Array<readonly [number, number, number]>,
	clearWidth: number,
	clearHeight: number,
	liningThickness: number,
	surfaceThickness: number,
	terrain: TerrainField | null,
	atStart: boolean,
): RoadTunnelPortal | null {
	const nodeId = atStart ? edge.startNodeId : edge.endNodeId;
	const tunnelDegree = incidentRoadEdges(node, nodeId).filter((candidate) =>
		isRoadTunnelEdge(node, candidate),
	).length;
	if (tunnelDegree !== 1) return null;
	const point = atStart ? points[0]! : points.at(-1)!;
	const outward = endpointOutward(points, atStart);
	const roadSurfaceY = point[1] + surfaceThickness;
	const terrainY = terrain
		? surfaceHeightAt(terrain, point[0], point[2])
		: 0;
	const crownY = roadSurfaceY + clearHeight + liningThickness;
	return {
		angle: Math.atan2(outward[0], outward[1]),
		clearHeight,
		clearWidth,
		cutDepth: Math.max(0, terrainY - crownY),
		cutLength: finiteOr(
			node.tunnelPortalCutLength,
			DEFAULT_TUNNEL_PORTAL_CUT_LENGTH_M,
		),
		cutSlope: finiteOr(node.tunnelCutSlope, DEFAULT_TUNNEL_CUT_SLOPE),
		edgeId: edge.id,
		id: `${edge.id}:${atStart ? "start" : "end"}`,
		liningThickness,
		nodeId,
		outward,
		point,
		roadSurfaceY,
		terrainY,
	};
}

/** Resolve lining and terminal portal data from every tunnel-mode road edge. */
export function buildRoadTunnelSpans(
	node: RoadNetworkNode,
	terrain: TerrainField | null = null,
): RoadTunnelSpan[] {
	const clearHeight = finiteOr(
		node.tunnelClearHeight,
		DEFAULT_TUNNEL_CLEAR_HEIGHT_M,
	);
	const sideClearance = finiteOr(
		node.tunnelSideClearance,
		DEFAULT_TUNNEL_SIDE_CLEARANCE_M,
	);
	const liningThickness = finiteOr(
		node.tunnelLiningThickness,
		DEFAULT_TUNNEL_LINING_THICKNESS_M,
	);
	return Object.values(node.edges)
		.sort((first, second) => first.id.localeCompare(second.id))
		.flatMap((edge) => {
			if (!isRoadTunnelEdge(node, edge)) return [];
			const style = resolveRoadBridgeStyle(node, edge);
			if (!style) return [];
			const points = sampleRoadEdgePoints(node, edge, 48);
			if (points.length < 2) return [];
			const clearWidth = buildRoadCrossSection(style).totalWidth + sideClearance * 2;
			const portals = [
				terminalPortal(
					node,
					edge,
					points,
					clearWidth,
					clearHeight,
					liningThickness,
					style.surfaceThickness,
					terrain,
					true,
				),
				terminalPortal(
					node,
					edge,
					points,
					clearWidth,
					clearHeight,
					liningThickness,
					style.surfaceThickness,
					terrain,
					false,
				),
			].filter((portal): portal is RoadTunnelPortal => Boolean(portal));
			return [{
				clearHeight,
				clearWidth,
				edgeId: edge.id,
				liningThickness,
				points,
				portals,
				surfaceThickness: style.surfaceThickness,
			}];
		});
}

type TunnelProfilePoint = readonly [lateral: number, vertical: number];

function tunnelProfiles(
	clearWidth: number,
	clearHeight: number,
	liningThickness: number,
	archSegments: number,
): { inner: TunnelProfilePoint[]; outer: TunnelProfilePoint[] } {
	const halfWidth = clearWidth / 2;
	const archRise = Math.max(1.1, Math.min(clearHeight * 0.55, clearHeight - 1.8));
	const springY = clearHeight - archRise;
	const inner: TunnelProfilePoint[] = [[-halfWidth, 0]];
	const outer: TunnelProfilePoint[] = [[-halfWidth - liningThickness, -liningThickness]];
	for (let index = 0; index <= archSegments; index++) {
		const angle = Math.PI - (Math.PI * index) / archSegments;
		inner.push([
			Math.cos(angle) * halfWidth,
			springY + Math.sin(angle) * archRise,
		]);
		outer.push([
			Math.cos(angle) * (halfWidth + liningThickness),
			springY + Math.sin(angle) * (archRise + liningThickness),
		]);
	}
	inner.push([halfWidth, 0]);
	outer.push([halfWidth + liningThickness, -liningThickness]);
	return { inner, outer };
}

/** Build a closed swept horseshoe lining with distinct inner and outer skins. */
export function buildRoadTunnelLiningGeometry(
	points: Array<readonly [number, number, number]>,
	clearWidth: number,
	clearHeight: number,
	liningThickness: number,
	baseOffset = 0,
	archSegments = 14,
): RoadTunnelGeometry {
	if (points.length < 2) return { indices: [], positions: [] };
	const { inner, outer } = tunnelProfiles(
		clearWidth,
		clearHeight,
		liningThickness,
		Math.max(4, Math.trunc(archSegments)),
	);
	const profileSize = inner.length;
	const positions: number[] = [];
	for (let pointIndex = 0; pointIndex < points.length; pointIndex++) {
		const point = points[pointIndex]!;
		const previous = points[Math.max(0, pointIndex - 1)]!;
		const next = points[Math.min(points.length - 1, pointIndex + 1)]!;
		const dx = next[0] - previous[0];
		const dz = next[2] - previous[2];
		const length = Math.max(Math.hypot(dx, dz), 1e-6);
		const normalX = -dz / length;
		const normalZ = dx / length;
		for (const profile of [outer, inner]) {
			for (const [lateral, vertical] of profile) {
				positions.push(
					point[0] + normalX * lateral,
					point[1] + baseOffset + vertical,
					point[2] + normalZ * lateral,
				);
			}
		}
	}
	const vertex = (station: number, skin: 0 | 1, profile: number) =>
		station * profileSize * 2 + skin * profileSize + profile;
	const indices: number[] = [];
	for (let station = 0; station < points.length - 1; station++) {
		for (let profile = 0; profile < profileSize; profile++) {
			const nextProfile = (profile + 1) % profileSize;
			const outerA = vertex(station, 0, profile);
			const outerB = vertex(station, 0, nextProfile);
			const outerC = vertex(station + 1, 0, profile);
			const outerD = vertex(station + 1, 0, nextProfile);
			indices.push(outerA, outerC, outerB, outerB, outerC, outerD);
			const innerA = vertex(station, 1, profile);
			const innerB = vertex(station, 1, nextProfile);
			const innerC = vertex(station + 1, 1, profile);
			const innerD = vertex(station + 1, 1, nextProfile);
			indices.push(innerA, innerB, innerC, innerB, innerD, innerC);
		}
	}
	for (const station of [0, points.length - 1]) {
		for (let profile = 0; profile < profileSize; profile++) {
			const nextProfile = (profile + 1) % profileSize;
			const outerA = vertex(station, 0, profile);
			const outerB = vertex(station, 0, nextProfile);
			const innerA = vertex(station, 1, profile);
			const innerB = vertex(station, 1, nextProfile);
			indices.push(outerA, outerB, innerA, outerB, innerB, innerA);
		}
	}
	return { indices, positions };
}

/** Change structure semantics without moving the authored vertical alignment. */
export function convertRoadNetworkToTunnel(
	node: RoadNetworkNode,
): Pick<RoadNetworkNode, "edges" | "graphNodes"> & { changed: number } {
	let changed = 0;
	const graphNodes = Object.fromEntries(
		Object.entries(node.graphNodes).map(([id, graphNode]) => {
			if (graphNode.elevationMode !== "tunnel") changed++;
			return [id, { ...graphNode, elevationMode: "tunnel" as const }];
		}),
	) as RoadNetworkNode["graphNodes"];
	const edges = Object.fromEntries(
		Object.entries(node.edges).map(([id, edge]) => [
			id,
			{ ...edge, stackLevel: Math.min(-1, edge.stackLevel) },
		]),
	) as RoadNetworkNode["edges"];
	return { changed, edges, graphNodes };
}

/**
 * Subtract terminal approach trenches from a heightfield. A heightfield cannot
 * represent a cave roof, so covered tunnel interiors stay intact while only
 * portal throats and their open cuts are lowered.
 */
export function carveTerrainForTunnelPortals(
	node: RoadNetworkNode,
	field: TerrainField,
): { changed: number; value: TerrainField } {
	const portals = buildRoadTunnelSpans(node, field).flatMap((span) => span.portals);
	if (portals.length === 0) return { changed: 0, value: field };
	const heights = new Int16Array(field.heights);
	let changed = 0;
	for (let row = 0; row < field.rows; row++) {
		const z = field.origin[1] + row * field.spacing;
		for (let col = 0; col < field.cols; col++) {
			const x = field.origin[0] + col * field.spacing;
			const index = row * field.cols + col;
			const current = (heights[index] ?? 0) * field.step;
			let target = current;
			for (const portal of portals) {
				const dx = x - portal.point[0];
				const dz = z - portal.point[2];
				const forward = dx * portal.outward[0] + dz * portal.outward[1];
				if (forward < -field.spacing * 1.5 || forward > portal.cutLength)
					continue;
				const normalX = -portal.outward[1];
				const normalZ = portal.outward[0];
				const lateral = Math.abs(dx * normalX + dz * normalZ);
				const halfWidth = portal.clearWidth / 2;
				const depth = Math.max(0, current - portal.roadSurfaceY);
				const outerWidth = halfWidth + depth * portal.cutSlope;
				if (lateral > outerWidth) continue;
				const blend =
					lateral <= halfWidth
						? 0
						: (lateral - halfWidth) /
							Math.max(outerWidth - halfWidth, 1e-6);
				const candidate =
					portal.roadSurfaceY + (current - portal.roadSurfaceY) * blend;
				target = Math.min(target, candidate);
			}
			const quantized = quantize(field, target);
			if (quantized !== heights[index]) {
				heights[index] = quantized;
				changed++;
			}
		}
	}
	return changed > 0
		? { changed, value: { ...field, heights } }
		: { changed, value: field };
}
