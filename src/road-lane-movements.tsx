"use client";

import { sampleRoadEdgePoints } from "./road-network-geometry";
import { buildDirectedRoadLanes } from "./road-network-lanes";
import type { RoadLane, RoadLaneMovement, RoadNetworkNode } from "./schema";

export type RoadLaneMovementGuide = {
	enabled: boolean;
	id: string;
	points: Array<[number, number, number]>;
	turn: RoadLaneMovement["turn"];
};

function travelVectorAtNode(
	node: RoadNetworkNode,
	lane: RoadLane,
	nodeId: string,
	outgoing: boolean,
): readonly [number, number] | null {
	const edge = node.edges[lane.edgeId];
	if (!edge) return null;
	const sampled = sampleRoadEdgePoints(node, edge, 32);
	if (sampled.length < 2) return null;
	const forward = lane.direction === "forward" ? sampled : [...sampled].reverse();
	const first = outgoing ? forward[0]! : forward.at(-2)!;
	const second = outgoing ? forward[1]! : forward.at(-1)!;
	const dx = second[0] - first[0];
	const dz = second[2] - first[2];
	const length = Math.hypot(dx, dz);
	return length > 1e-6 ? [dx / length, dz / length] : null;
}

function classifyMovement(
	node: RoadNetworkNode,
	from: RoadLane,
	to: RoadLane,
	nodeId: string,
): RoadLaneMovement["turn"] {
	if (from.edgeId === to.edgeId) return "u-turn";
	const incoming = travelVectorAtNode(node, from, nodeId, false);
	const outgoing = travelVectorAtNode(node, to, nodeId, true);
	if (!incoming || !outgoing) return "through";
	const dot = Math.max(-1, Math.min(1, incoming[0] * outgoing[0] + incoming[1] * outgoing[1]));
	const cross = incoming[0] * outgoing[1] - incoming[1] * outgoing[0];
	const degrees = Math.atan2(cross, dot) * 180 / Math.PI;
	if (Math.abs(degrees) <= 30) return "through";
	if (Math.abs(degrees) >= 150) return "u-turn";
	return degrees > 0 ? "left" : "right";
}

/** Build all stable lane-to-lane connections and preserve user enable/disable overrides. */
export function buildRoadLaneMovements(
	node: RoadNetworkNode,
): Record<string, RoadLaneMovement> {
	const lanes = Object.keys(node.lanes).length > 0 ? node.lanes : buildDirectedRoadLanes(node);
	const result: Record<string, RoadLaneMovement> = {};
	for (const junction of Object.values(node.junctions).sort((a, b) => a.nodeId.localeCompare(b.nodeId))) {
		const incoming = Object.values(lanes).filter((lane) => lane.endNodeId === junction.nodeId);
		const outgoing = Object.values(lanes).filter((lane) => lane.startNodeId === junction.nodeId);
		for (const from of incoming) {
			for (const to of outgoing) {
				const turn = classifyMovement(node, from, to, junction.nodeId);
				if (from.kind === "turn" && from.turn && from.turn !== turn) continue;
				const id = `movement:${junction.nodeId}:${from.id}>${to.id}`;
				const previous = node.laneMovements[id];
				result[id] = {
					enabled: previous?.enabled ?? turn !== "u-turn",
					fromLaneId: from.id,
					id,
					junctionNodeId: junction.nodeId,
					toLaneId: to.id,
					turn,
				};
			}
		}
	}
	return result;
}

export function setRoadLaneMovementEnabled(
	node: RoadNetworkNode,
	movementId: string,
	enabled: boolean,
): RoadNetworkNode["laneMovements"] | null {
	const movement = node.laneMovements[movementId];
	if (!movement) return null;
	return {
		...node.laneMovements,
		[movementId]: { ...movement, enabled },
	};
}

function offsetPointNearJunction(
	node: RoadNetworkNode,
	lane: RoadLane,
	junctionNodeId: string,
): [number, number, number] | null {
	const edge = node.edges[lane.edgeId];
	if (!edge) return null;
	const sampled = sampleRoadEdgePoints(node, edge, 32);
	if (sampled.length < 2) return null;
	const atStart = edge.startNodeId === junctionNodeId;
	const anchor = atStart ? sampled[0]! : sampled.at(-1)!;
	const neighbor = atStart ? sampled[1]! : sampled.at(-2)!;
	const dx = neighbor[0] - anchor[0];
	const dz = neighbor[2] - anchor[2];
	const length = Math.max(Math.hypot(dx, dz), 1e-6);
	const distance = Math.min(4, length * 0.45);
	const directionX = dx / length;
	const directionZ = dz / length;
	const authoredSign = atStart ? 1 : -1;
	const normalX = -directionZ * authoredSign;
	const normalZ = directionX * authoredSign;
	return [
		anchor[0] + directionX * distance + normalX * lane.lateralOffset,
		anchor[1] + 0.24,
		anchor[2] + directionZ * distance + normalZ * lane.lateralOffset,
	];
}

export function buildRoadLaneMovementGuides(node: RoadNetworkNode): RoadLaneMovementGuide[] {
	return Object.values(node.laneMovements).flatMap((movement) => {
		const from = node.lanes[movement.fromLaneId];
		const to = node.lanes[movement.toLaneId];
		const junction = node.graphNodes[movement.junctionNodeId];
		if (!from || !to || !junction) return [];
		const fromPoint = offsetPointNearJunction(node, from, movement.junctionNodeId);
		const toPoint = offsetPointNearJunction(node, to, movement.junctionNodeId);
		if (!fromPoint || !toPoint) return [];
		return [{
			enabled: movement.enabled,
			id: movement.id,
			points: [fromPoint, [junction.position[0], junction.position[1] + 0.28, junction.position[2]], toPoint],
			turn: movement.turn,
		}];
	});
}

export function RoadLaneMovementInspector({
	node,
	onUpdate,
}: {
	node: RoadNetworkNode;
	onUpdate: (patch: Partial<RoadNetworkNode>) => void;
}) {
	const junctions = Object.values(node.junctions).sort((a, b) => a.nodeId.localeCompare(b.nodeId));
	const junction = junctions[0];
	if (!junction) {
		return <p style={{ color: "#94a3b8", fontSize: 11, margin: 0 }}>Add a T, Y, or multi-leg junction to edit lane movements.</p>;
	}
	const movements = Object.values(node.laneMovements).filter(
		(movement) => movement.junctionNodeId === junction.nodeId,
	);
	return (
		<div aria-label="Lane-to-lane junction movements" style={{ display: "grid", gap: 6 }}>
			<p style={{ color: "#e2e8f0", fontSize: 12, margin: 0 }}>
				{movements.filter((movement) => movement.enabled).length} of {movements.length} movements permitted
			</p>
			<label style={{ alignItems: "center", display: "flex", fontSize: 11, gap: 7 }}>
				<input
					aria-label="Show permitted and restricted movements"
					checked={node.showLaneMovements}
					onChange={(event) => onUpdate({ showLaneMovements: event.currentTarget.checked })}
					type="checkbox"
				/>
				<span>Show movement overlay</span>
			</label>
			{movements.slice(0, 12).map((movement) => (
				<label key={movement.id} style={{ alignItems: "center", display: "flex", fontSize: 11, gap: 7 }}>
					<input
						aria-label={`${movement.turn} movement ${movement.fromLaneId} to ${movement.toLaneId}`}
						checked={movement.enabled}
						onChange={(event) => {
							const laneMovements = setRoadLaneMovementEnabled(node, movement.id, event.currentTarget.checked);
							if (laneMovements) onUpdate({ laneMovements });
						}}
						type="checkbox"
					/>
					<span>{movement.turn.replace("-", " ")} · lane {(node.lanes[movement.fromLaneId]?.index ?? 0) + 1} → {(node.lanes[movement.toLaneId]?.index ?? 0) + 1}</span>
				</label>
			))}
			{movements.length > 12 ? <p style={{ color: "#94a3b8", fontSize: 11, margin: 0 }}>+{movements.length - 12} more movements</p> : null}
		</div>
	);
}
