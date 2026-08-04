"use client";

import { buildRoadLaneMovementGuides } from "./road-lane-movements";
import { sampleRoadEdgePoints } from "./road-network-geometry";
import { DEFAULT_ROAD_STYLE_PRESETS } from "./road-style-presets";
import type { RoadJunction, RoadNetworkNode, RoadStylePreset } from "./schema";

export type RoadChannelizationGuide = {
	id: string;
	kind: "turn-pocket" | "slip-lane";
	lateralOffset: number;
	points: Array<[number, number, number]>;
	style: RoadStylePreset;
	width: number;
};

function styleForEdge(node: RoadNetworkNode, edgeId: string): RoadStylePreset {
	const edge = node.edges[edgeId];
	const styleId = node.applyStyleToAll ? node.activeStyleId : edge?.styleId;
	return node.stylePresets[styleId ?? node.activeStyleId]
		?? DEFAULT_ROAD_STYLE_PRESETS[styleId as keyof typeof DEFAULT_ROAD_STYLE_PRESETS]
		?? DEFAULT_ROAD_STYLE_PRESETS["local-street"];
}

function trailingDistance(
	points: Array<[number, number, number]>,
	distance: number,
): Array<[number, number, number]> {
	if (points.length < 2) return points;
	const result = [points.at(-1)!];
	let remaining = distance;
	for (let index = points.length - 2; index >= 0 && remaining > 0; index -= 1) {
		const point = points[index]!;
		const next = result[0]!;
		const length = Math.hypot(next[0] - point[0], next[1] - point[1], next[2] - point[2]);
		if (length <= remaining + 1e-6) {
			result.unshift(point);
			remaining -= length;
		} else {
			const ratio = remaining / Math.max(length, 1e-6);
			result.unshift([
				next[0] + (point[0] - next[0]) * ratio,
				next[1] + (point[1] - next[1]) * ratio,
				next[2] + (point[2] - next[2]) * ratio,
			]);
			remaining = 0;
		}
	}
	return result;
}

function quadraticGuide(points: Array<[number, number, number]>): Array<[number, number, number]> {
	if (points.length !== 3) return points;
	const [start, junctionCenter, end] = points;
	const control: [number, number, number] = [
		start![0] + end![0] - junctionCenter![0],
		(start![1] + end![1]) / 2,
		start![2] + end![2] - junctionCenter![2],
	];
	return Array.from({ length: 17 }, (_, index) => {
		const t = index / 16;
		const inverse = 1 - t;
		return [
			inverse * inverse * start![0] + 2 * inverse * t * control![0] + t * t * end![0],
			inverse * inverse * start![1] + 2 * inverse * t * control![1] + t * t * end![1],
			inverse * inverse * start![2] + 2 * inverse * t * control![2] + t * t * end![2],
		];
	});
}

/** Build visible auxiliary carriageways for configured turn pockets and slip lanes. */
export function buildRoadChannelizationGuides(node: RoadNetworkNode): RoadChannelizationGuide[] {
	const guides: RoadChannelizationGuide[] = [];
	for (const lane of Object.values(node.lanes).filter((candidate) => candidate.kind === "turn")) {
		const edge = node.edges[lane.edgeId];
		if (!edge || !lane.junctionNodeId) continue;
		const authored = sampleRoadEdgePoints(node, edge, 36) as Array<[number, number, number]>;
		const inbound = edge.endNodeId === lane.junctionNodeId ? authored : [...authored].reverse();
		const style = styleForEdge(node, edge.id);
		guides.push({
			id: `turn-pocket:${lane.id}`,
			kind: "turn-pocket",
			lateralOffset: edge.endNodeId === lane.junctionNodeId ? lane.lateralOffset : -lane.lateralOffset,
			points: trailingDistance(inbound, Math.max(10, style.laneWidth * 4)),
			style,
			width: style.laneWidth * 0.94,
		});
	}

	const movementGuides = new Map(buildRoadLaneMovementGuides(node).map((guide) => [guide.id, guide]));
	for (const junction of Object.values(node.junctions)) {
		for (const movementId of junction.slipLaneMovementIds ?? []) {
			const movement = node.laneMovements[movementId];
			const movementGuide = movementGuides.get(movementId);
			const fromLane = movement ? node.lanes[movement.fromLaneId] : undefined;
			if (!movement || movement.turn !== "right" || !movement.enabled || !movementGuide || !fromLane) continue;
			const style = styleForEdge(node, fromLane.edgeId);
			guides.push({
				id: `slip-lane:${movementId}`,
				kind: "slip-lane",
				lateralOffset: 0,
				points: quadraticGuide(movementGuide.points),
				style,
				width: style.laneWidth,
			});
		}
	}
	return guides;
}

export function setRoadTurnPocket(
	node: RoadNetworkNode,
	junctionNodeId: string,
	edgeId: string,
	pocket: "none" | NonNullable<RoadJunction["turnPocketEdges"][string]>,
): RoadNetworkNode["junctions"] | null {
	const junction = node.junctions[junctionNodeId];
	if (!junction || !node.edges[edgeId]) return null;
	const turnPocketEdges = { ...(junction.turnPocketEdges ?? {}) };
	if (pocket === "none") delete turnPocketEdges[edgeId];
	else turnPocketEdges[edgeId] = pocket;
	return {
		...node.junctions,
		[junctionNodeId]: { ...junction, turnPocketEdges },
	};
}

export function setRoadSlipLane(
	node: RoadNetworkNode,
	junctionNodeId: string,
	movementId: string,
	enabled: boolean,
): RoadNetworkNode["junctions"] | null {
	const junction = node.junctions[junctionNodeId];
	const movement = node.laneMovements[movementId];
	if (!junction || !movement || movement.junctionNodeId !== junctionNodeId || movement.turn !== "right") return null;
	const ids = new Set(junction.slipLaneMovementIds ?? []);
	if (enabled) ids.add(movementId);
	else ids.delete(movementId);
	return {
		...node.junctions,
		[junctionNodeId]: { ...junction, slipLaneMovementIds: [...ids].sort() },
	};
}

export function RoadChannelizationInspector({
	node,
	onUpdate,
}: {
	node: RoadNetworkNode;
	onUpdate: (patch: Partial<RoadNetworkNode>) => void;
}) {
	const junction = Object.values(node.junctions).sort((a, b) => a.nodeId.localeCompare(b.nodeId))[0];
	if (!junction) return <p style={{ color: "#94a3b8", fontSize: 11, margin: 0 }}>Add a junction to configure turn pockets and slip lanes.</p>;
	const approaches = Object.values(node.edges)
		.filter((edge) => edge.startNodeId === junction.nodeId || edge.endNodeId === junction.nodeId)
		.sort((first, second) => first.id.localeCompare(second.id));
	const rightTurns = Object.values(node.laneMovements)
		.filter((movement) => movement.junctionNodeId === junction.nodeId && movement.turn === "right" && movement.enabled)
		.sort((first, second) => first.id.localeCompare(second.id));
	return (
		<div aria-label="Road turn pockets and slip lanes" style={{ display: "grid", gap: 7 }}>
			<p style={{ color: "#e2e8f0", fontSize: 12, margin: 0 }}>
				{Object.keys(junction.turnPocketEdges ?? {}).length} pocket approaches · {(junction.slipLaneMovementIds ?? []).length} slip lanes
			</p>
			{approaches.map((edge, index) => (
				<label key={edge.id} style={{ alignItems: "center", display: "flex", fontSize: 11, gap: 8, justifyContent: "space-between" }}>
					<span>Approach {index + 1} turn pocket</span>
					<select
						aria-label={`Approach ${index + 1} turn pocket`}
						onChange={(event) => {
							const junctions = setRoadTurnPocket(node, junction.nodeId, edge.id, event.currentTarget.value as "none" | "left" | "right" | "both");
							if (junctions) onUpdate({ junctions });
						}}
						value={junction.turnPocketEdges?.[edge.id] ?? "none"}
					>
						<option value="none">None</option>
						<option value="left">Left</option>
						<option value="right">Right</option>
						<option value="both">Left + right</option>
					</select>
				</label>
			))}
			{rightTurns.map((movement, index) => (
				<label key={movement.id} style={{ alignItems: "center", display: "flex", fontSize: 11, gap: 7 }}>
					<input
						aria-label={`Slip lane ${index + 1}`}
						checked={(junction.slipLaneMovementIds ?? []).includes(movement.id)}
						onChange={(event) => {
							const junctions = setRoadSlipLane(node, junction.nodeId, movement.id, event.currentTarget.checked);
							if (junctions) onUpdate({ junctions });
						}}
						type="checkbox"
					/>
					<span>Slip lane {index + 1} · lane {(node.lanes[movement.fromLaneId]?.index ?? 0) + 1} → {(node.lanes[movement.toLaneId]?.index ?? 0) + 1}</span>
				</label>
			))}
		</div>
	);
}
