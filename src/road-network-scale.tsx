"use client";

import { sampleRoadEdgePoints } from "./road-network-geometry";
import type { RoadTransitionProfileCacheStats } from "./road-transition-profile";
import type { RoadNetworkNode } from "./schema";

export type RoadTileLod = "high" | "medium" | "low" | "culled";

export type RoadSpatialTile = {
	edgeIds: string[];
	id: string;
	x: number;
	z: number;
};

export type RoadTileStreamingPlan = RoadSpatialTile & {
	distance: number;
	lod: RoadTileLod;
	resident: boolean;
};

export const ROAD_SCALE_DEFAULTS = {
	farLodDistance: 384,
	mediumLodDistance: 192,
	streamingRadius: 512,
	tileSize: 64,
} as const;

function tileId(x: number, z: number): string {
	return `${x}:${z}`;
}

/** Build a deterministic spatial index. Curved and long edges are registered
 * in every tile touched by their sampled centerline, rather than only the tile
 * containing their midpoint. */
export function buildRoadSpatialTiles(
	node: RoadNetworkNode,
	tileSize = ROAD_SCALE_DEFAULTS.tileSize,
): RoadSpatialTile[] {
	const tiles = new Map<string, Set<string>>();
	for (const edge of Object.values(node.edges).sort((a, b) => a.id.localeCompare(b.id))) {
		const points = sampleRoadEdgePoints(node, edge, 48);
		for (let index = 0; index < points.length; index++) {
			const point = points[index]!;
			const previous = points[Math.max(0, index - 1)]!;
			const length = Math.hypot(point[0] - previous[0], point[2] - previous[2]);
			const steps = Math.max(1, Math.ceil(length / Math.max(1, tileSize / 4)));
			for (let step = 0; step <= steps; step++) {
				const mix = step / steps;
				const x = Math.floor((previous[0] + (point[0] - previous[0]) * mix) / tileSize);
				const z = Math.floor((previous[2] + (point[2] - previous[2]) * mix) / tileSize);
				const id = tileId(x, z);
				const edgeIds = tiles.get(id) ?? new Set<string>();
				edgeIds.add(edge.id);
				tiles.set(id, edgeIds);
			}
		}
	}
	return [...tiles.entries()]
		.map(([id, edgeIds]) => {
			const [x, z] = id.split(":").map(Number) as [number, number];
			return { edgeIds: [...edgeIds].sort(), id, x, z };
		})
		.sort((a, b) => a.x - b.x || a.z - b.z);
}

export function planRoadTileStreaming(
	tiles: RoadSpatialTile[],
	viewPoint: readonly [number, number],
	options: Partial<{
		farLodDistance: number;
		mediumLodDistance: number;
		streamingRadius: number;
		tileSize: number;
	}> = {},
): RoadTileStreamingPlan[] {
	const resolved = { ...ROAD_SCALE_DEFAULTS, ...options };
	return tiles.map((tile) => {
		const centerX = (tile.x + 0.5) * resolved.tileSize;
		const centerZ = (tile.z + 0.5) * resolved.tileSize;
		const distance = Math.hypot(centerX - viewPoint[0], centerZ - viewPoint[1]);
		const resident = distance <= resolved.streamingRadius;
		const lod: RoadTileLod = !resident
			? "culled"
			: distance <= resolved.mediumLodDistance / 2
				? "high"
				: distance <= resolved.mediumLodDistance
					? "medium"
					: distance <= resolved.farLodDistance
						? "low"
						: "culled";
		return { ...tile, distance, lod, resident: resident && lod !== "culled" };
	});
}

export type RoadGeometryCacheDiagnostics = RoadTransitionProfileCacheStats & {
	updatedAt: number;
};

const geometryCacheDiagnostics = new Map<string, RoadGeometryCacheDiagnostics>();

export function recordRoadGeometryCacheDiagnostics(
	networkId: string,
	stats: RoadTransitionProfileCacheStats,
): void {
	geometryCacheDiagnostics.set(networkId, { ...stats, updatedAt: Date.now() });
}

export function readRoadGeometryCacheDiagnostics(
	networkId: string,
): RoadGeometryCacheDiagnostics | null {
	return geometryCacheDiagnostics.get(networkId) ?? null;
}

function networkCenter(node: RoadNetworkNode): readonly [number, number] {
	const points = Object.values(node.graphNodes).map((graphNode) => graphNode.position);
	if (points.length === 0) return [0, 0];
	return [
		(Math.min(...points.map((point) => point[0])) + Math.max(...points.map((point) => point[0]))) / 2,
		(Math.min(...points.map((point) => point[2])) + Math.max(...points.map((point) => point[2]))) / 2,
	];
}

export function RoadScaleDiagnosticsInspector({ node }: { node: RoadNetworkNode }) {
	const tiles = buildRoadSpatialTiles(node);
	const plan = planRoadTileStreaming(tiles, networkCenter(node));
	const cache = readRoadGeometryCacheDiagnostics(node.id);
	const count = (lod: RoadTileLod) => plan.filter((tile) => tile.lod === lod).length;
	return (
		<div aria-label="Road scale diagnostics" style={{ display: "grid", gap: 6 }}>
			<p style={{ color: "#e2e8f0", fontSize: 12, margin: 0 }}>
				{tiles.length} spatial {tiles.length === 1 ? "tile" : "tiles"} · {ROAD_SCALE_DEFAULTS.tileSize} m
			</p>
			<p style={{ color: "#94a3b8", fontSize: 11, lineHeight: 1.45, margin: 0 }}>
				LOD high {count("high")}, medium {count("medium")}, low {count("low")}, culled {count("culled")}. Streaming radius {ROAD_SCALE_DEFAULTS.streamingRadius} m.
			</p>
			<p style={{ color: "#94a3b8", fontSize: 11, lineHeight: 1.45, margin: 0 }}>
				Geometry cache: {cache ? `${cache.reusedProfiles} reused / ${cache.rebuiltProfiles} rebuilt` : "warming"}.
			</p>
		</div>
	);
}
