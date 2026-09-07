import { buildRoadCrossSection } from "./road-cross-section";
import { sampleRoadEdgePoints } from "./road-network-geometry";
import {
	incidentRoadEdges,
	roadEdgeCrossingsBetweenGraphs,
} from "./road-network-topology";
import type {
	RoadGraphEdge,
	RoadNetworkNode,
	RoadStylePreset,
} from "./schema";
import { DEFAULT_ROAD_STYLE_PRESETS } from "./road-style-presets";

export const DEFAULT_BRIDGE_DECK_THICKNESS_M = 0.65;
export const DEFAULT_BRIDGE_BARRIER_HEIGHT_M = 1.05;
export const DEFAULT_BRIDGE_PIER_SPACING_M = 18;
export const DEFAULT_BRIDGE_PIER_DIAMETER_M = 1.1;
export const DEFAULT_BRIDGE_MINIMUM_CLEARANCE_M = 4.5;

export type RoadBridgePier = {
	angle: number;
	deckWidth: number;
	edgeId: string;
	id: string;
	normal: readonly [number, number];
	point: readonly [number, number, number];
	station: number;
	topY: number;
};

export type RoadBridgeAbutment = {
	angle: number;
	deckWidth: number;
	edgeId: string;
	id: string;
	nodeId: string;
	point: readonly [number, number, number];
	topY: number;
};

export type RoadBridgeSpan = {
	abutments: RoadBridgeAbutment[];
	barrierHeight: number;
	deckThickness: number;
	deckWidth: number;
	edgeId: string;
	piers: RoadBridgePier[];
	points: Array<readonly [number, number, number]>;
	surfaceThickness: number;
};

export type RoadBridgeClearanceCheck = {
	bridgeEdgeId: string;
	clearance: number;
	lowerEdgeId: string;
	lowerNetworkId: string;
	point: readonly [number, number, number];
	required: number;
};

export type RoadBridgePrismGeometry = {
	indices: number[];
	positions: number[];
};

function finiteOr(value: number | undefined, fallback: number): number {
	return Number.isFinite(value) ? value! : fallback;
}

export function resolveRoadBridgeStyle(
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

export function isRoadBridgeEdge(
	node: RoadNetworkNode,
	edge: RoadGraphEdge,
): boolean {
	return (
		node.graphNodes[edge.startNodeId]?.elevationMode === "bridge" &&
		node.graphNodes[edge.endNodeId]?.elevationMode === "bridge"
	);
}

function pathLength(points: Array<readonly [number, number, number]>): number {
	let length = 0;
	for (let index = 1; index < points.length; index++) {
		const first = points[index - 1]!;
		const second = points[index]!;
		length += Math.hypot(
			second[0] - first[0],
			second[1] - first[1],
			second[2] - first[2],
		);
	}
	return length;
}

function sampleAtStation(
	points: Array<readonly [number, number, number]>,
	station: number,
): {
	point: readonly [number, number, number];
	tangent: readonly [number, number];
} | null {
	let traversed = 0;
	for (let index = 1; index < points.length; index++) {
		const start = points[index - 1]!;
		const end = points[index]!;
		const dx = end[0] - start[0];
		const dy = end[1] - start[1];
		const dz = end[2] - start[2];
		const length = Math.hypot(dx, dy, dz);
		if (length < 1e-6) continue;
		if (traversed + length + 1e-6 < station) {
			traversed += length;
			continue;
		}
		const t = Math.max(0, Math.min(1, (station - traversed) / length));
		const planLength = Math.max(Math.hypot(dx, dz), 1e-6);
		return {
			point: [
				start[0] + dx * t,
				start[1] + dy * t,
				start[2] + dz * t,
			],
			tangent: [dx / planLength, dz / planLength],
		};
	}
	return null;
}

function endpointTangent(
	points: Array<readonly [number, number, number]>,
	atStart: boolean,
): readonly [number, number] {
	const first = atStart ? points[0]! : points.at(-1)!;
	const second = atStart ? points[1]! : points.at(-2)!;
	const dx = second[0] - first[0];
	const dz = second[2] - first[2];
	const length = Math.max(Math.hypot(dx, dz), 1e-6);
	return [dx / length, dz / length];
}

function terminalBridgeAbutment(
	node: RoadNetworkNode,
	edge: RoadGraphEdge,
	points: Array<readonly [number, number, number]>,
	deckWidth: number,
	surfaceThickness: number,
	deckThickness: number,
	atStart: boolean,
): RoadBridgeAbutment | null {
	const nodeId = atStart ? edge.startNodeId : edge.endNodeId;
	const bridgeDegree = incidentRoadEdges(node, nodeId).filter((candidate) =>
		isRoadBridgeEdge(node, candidate),
	).length;
	if (bridgeDegree !== 1) return null;
	const point = atStart ? points[0]! : points.at(-1)!;
	const tangent = endpointTangent(points, atStart);
	return {
		angle: Math.atan2(tangent[0], tangent[1]),
		deckWidth,
		edgeId: edge.id,
		id: `${edge.id}:${atStart ? "start" : "end"}`,
		nodeId,
		point,
		topY: point[1] - surfaceThickness - deckThickness,
	};
}

/** Resolve deck, barrier, support, and terminal structure data for bridge edges. */
export function buildRoadBridgeSpans(node: RoadNetworkNode): RoadBridgeSpan[] {
	const deckThickness = finiteOr(
		node.bridgeDeckThickness,
		DEFAULT_BRIDGE_DECK_THICKNESS_M,
	);
	const barrierHeight = finiteOr(
		node.bridgeBarrierHeight,
		DEFAULT_BRIDGE_BARRIER_HEIGHT_M,
	);
	const pierSpacing = finiteOr(
		node.bridgePierSpacing,
		DEFAULT_BRIDGE_PIER_SPACING_M,
	);
	const pierDiameter = finiteOr(
		node.bridgePierDiameter,
		DEFAULT_BRIDGE_PIER_DIAMETER_M,
	);
	const occupiedPiers: RoadBridgePier[] = [];
	return Object.values(node.edges)
		.sort((first, second) => first.id.localeCompare(second.id))
		.flatMap((edge) => {
			if (!isRoadBridgeEdge(node, edge)) return [];
			const style = resolveRoadBridgeStyle(node, edge);
			if (!style) return [];
			const points = sampleRoadEdgePoints(node, edge, 48);
			if (points.length < 2) return [];
			const deckWidth = buildRoadCrossSection(style).totalWidth + 0.5;
			const length = pathLength(points);
			const pierCount = Math.max(0, Math.ceil(length / pierSpacing) - 1);
			const piers: RoadBridgePier[] = [];
			for (let index = 1; index <= pierCount; index++) {
				const station = (length * index) / (pierCount + 1);
				const sample = sampleAtStation(points, station);
				if (!sample) continue;
				const topY =
					sample.point[1] - style.surfaceThickness - deckThickness;
				if (topY <= 0.9) continue;
				const normal = [-sample.tangent[1], sample.tangent[0]] as const;
				const pier: RoadBridgePier = {
					angle: Math.atan2(sample.tangent[0], sample.tangent[1]),
					deckWidth,
					edgeId: edge.id,
					id: `${edge.id}:${index}`,
					normal,
					point: sample.point,
					station,
					topY,
				};
				if (
					occupiedPiers.some(
						(candidate) =>
							Math.hypot(
								candidate.point[0] - pier.point[0],
								candidate.point[2] - pier.point[2],
							) < Math.max(2.5, pierDiameter * 2.4),
					)
				) continue;
				occupiedPiers.push(pier);
				piers.push(pier);
			}
			const abutments = [
				terminalBridgeAbutment(
					node,
					edge,
					points,
					deckWidth,
					style.surfaceThickness,
					deckThickness,
					true,
				),
				terminalBridgeAbutment(
					node,
					edge,
					points,
					deckWidth,
					style.surfaceThickness,
					deckThickness,
					false,
				),
			].filter((abutment): abutment is RoadBridgeAbutment => Boolean(abutment));
			return [{
				abutments,
				barrierHeight,
				deckThickness,
				deckWidth,
				edgeId: edge.id,
				piers,
				points,
				surfaceThickness: style.surfaceThickness,
			}];
		});
}

/** Build a closed curved prism around a sampled centerline. */
export function buildRoadBridgePrismGeometry(
	points: Array<readonly [number, number, number]>,
	width: number,
	topOffset: number,
	bottomOffset: number,
	lateralOffset = 0,
): RoadBridgePrismGeometry {
	if (points.length < 2 || width <= 0 || topOffset <= bottomOffset) {
		return { indices: [], positions: [] };
	}
	const positions: number[] = [];
	for (let index = 0; index < points.length; index++) {
		const point = points[index]!;
		const previous = points[Math.max(0, index - 1)]!;
		const next = points[Math.min(points.length - 1, index + 1)]!;
		const dx = next[0] - previous[0];
		const dz = next[2] - previous[2];
		const length = Math.max(Math.hypot(dx, dz), 1e-6);
		const normalX = -dz / length;
		const normalZ = dx / length;
		const centerX = point[0] + normalX * lateralOffset;
		const centerZ = point[2] + normalZ * lateralOffset;
		const halfWidth = width / 2;
		positions.push(
			centerX + normalX * halfWidth,
			point[1] + topOffset,
			centerZ + normalZ * halfWidth,
			centerX - normalX * halfWidth,
			point[1] + topOffset,
			centerZ - normalZ * halfWidth,
			centerX + normalX * halfWidth,
			point[1] + bottomOffset,
			centerZ + normalZ * halfWidth,
			centerX - normalX * halfWidth,
			point[1] + bottomOffset,
			centerZ - normalZ * halfWidth,
		);
	}
	const indices: number[] = [];
	for (let index = 0; index < points.length - 1; index++) {
		const base = index * 4;
		const next = base + 4;
		indices.push(
			base, next, base + 1,
			next, next + 1, base + 1,
			base + 2, base + 3, next + 2,
			next + 2, base + 3, next + 3,
			base, base + 2, next,
			next, base + 2, next + 2,
			base + 1, next + 1, base + 3,
			next + 1, next + 3, base + 3,
		);
	}
	const last = (points.length - 1) * 4;
	indices.push(0, 1, 2, 1, 3, 2, last, last + 2, last + 1, last + 1, last + 2, last + 3);
	return { indices, positions };
}

/** Find insufficient bridge-over-road clearances across scene road networks. */
export function roadBridgeClearanceChecks(
	node: RoadNetworkNode,
	peers: RoadNetworkNode[] = [],
): RoadBridgeClearanceCheck[] {
	const required = finiteOr(
		node.bridgeMinimumClearance,
		DEFAULT_BRIDGE_MINIMUM_CLEARANCE_M,
	);
	const deckThickness = finiteOr(
		node.bridgeDeckThickness,
		DEFAULT_BRIDGE_DECK_THICKNESS_M,
	);
	const candidates = [node, ...peers.filter((peer) => peer.id !== node.id)];
	const checks: RoadBridgeClearanceCheck[] = [];
	for (const bridgeEdge of Object.values(node.edges)) {
		if (!isRoadBridgeEdge(node, bridgeEdge)) continue;
		const bridgeStyle = resolveRoadBridgeStyle(node, bridgeEdge);
		if (!bridgeStyle) continue;
		for (const lowerNetwork of candidates) {
			for (const lowerEdge of Object.values(lowerNetwork.edges)) {
				if (
					(lowerNetwork.id === node.id && lowerEdge.id === bridgeEdge.id) ||
					isRoadBridgeEdge(lowerNetwork, lowerEdge)
				) continue;
				const lowerStyle = resolveRoadBridgeStyle(lowerNetwork, lowerEdge);
				if (!lowerStyle) continue;
				for (const crossing of roadEdgeCrossingsBetweenGraphs(
					node,
					bridgeEdge.id,
					lowerNetwork,
					lowerEdge.id,
				)) {
					const underside =
						crossing.firstPoint[1] -
						bridgeStyle.surfaceThickness -
						deckThickness;
					const lowerTop =
						crossing.secondPoint[1];
					const clearance = underside - lowerTop;
					if (clearance + 1e-6 >= required) continue;
					checks.push({
						bridgeEdgeId: bridgeEdge.id,
						clearance,
						lowerEdgeId: lowerEdge.id,
						lowerNetworkId: lowerNetwork.id,
						point: [
							crossing.point[0],
							(lowerTop + underside) / 2,
							crossing.point[2],
						],
						required,
					});
				}
			}
		}
	}
	return checks.sort((first, second) =>
		`${first.bridgeEdgeId}:${first.lowerNetworkId}:${first.lowerEdgeId}`.localeCompare(
			`${second.bridgeEdgeId}:${second.lowerNetworkId}:${second.lowerEdgeId}`,
		),
	);
}
