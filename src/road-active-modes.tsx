"use client";

import { buildRoadLaneMovementGuides } from "./road-lane-movements";
import { DEFAULT_ROAD_STYLE_PRESETS } from "./road-style-presets";
import type { RoadActiveModeMovement, RoadNetworkNode, RoadStylePreset } from "./schema";

export type RoadActiveModeGuide = {
	color: string;
	id: string;
	mode: RoadActiveModeMovement["mode"];
	points: Array<[number, number, number]>;
	width: number;
};

function styleForEdge(node: RoadNetworkNode, edgeId: string): RoadStylePreset {
	const edge = node.edges[edgeId];
	const styleId = node.applyStyleToAll ? node.activeStyleId : edge?.styleId;
	return node.stylePresets[styleId ?? node.activeStyleId]
		?? DEFAULT_ROAD_STYLE_PRESETS[styleId as keyof typeof DEFAULT_ROAD_STYLE_PRESETS]
		?? DEFAULT_ROAD_STYLE_PRESETS["local-street"];
}

/** Generate pedestrian crossings and bicycle turns from junction topology. */
export function buildRoadActiveModeMovements(
	node: RoadNetworkNode,
): RoadNetworkNode["activeModeMovements"] {
	const result: RoadNetworkNode["activeModeMovements"] = {};
	for (const junction of Object.values(node.junctions).sort((a, b) => a.nodeId.localeCompare(b.nodeId))) {
		const incident = Object.values(node.edges)
			.filter((edge) => edge.startNodeId === junction.nodeId || edge.endNodeId === junction.nodeId)
			.sort((first, second) => first.id.localeCompare(second.id));
		for (const edge of incident) {
			const id = `active:pedestrian:${junction.nodeId}:${edge.id}`;
			result[id] = {
				enabled: node.activeModeMovements?.[id]?.enabled ?? true,
				fromEdgeId: edge.id,
				id,
				junctionNodeId: junction.nodeId,
				kind: "crossing",
				mode: "pedestrian",
				toEdgeId: edge.id,
			};
		}
		const seenBicyclePairs = new Set<string>();
		for (const movement of Object.values(node.laneMovements)
			.filter((candidate) => candidate.junctionNodeId === junction.nodeId && candidate.enabled && candidate.turn !== "u-turn")
			.sort((first, second) => first.id.localeCompare(second.id))) {
			const from = node.lanes[movement.fromLaneId];
			const to = node.lanes[movement.toLaneId];
			if (!from || !to) continue;
			const pair = `${from.edgeId}>${to.edgeId}:${movement.turn}`;
			if (seenBicyclePairs.has(pair)) continue;
			seenBicyclePairs.add(pair);
			const id = `active:bicycle:${junction.nodeId}:${pair}`;
			result[id] = {
				enabled: node.activeModeMovements?.[id]?.enabled ?? true,
				fromEdgeId: from.edgeId,
				id,
				junctionNodeId: junction.nodeId,
				kind: movement.turn as "left" | "through" | "right",
				mode: "bicycle",
				sourceMovementId: movement.id,
				toEdgeId: to.edgeId,
			};
		}
	}
	return result;
}

function pedestrianGuide(node: RoadNetworkNode, movement: RoadActiveModeMovement): RoadActiveModeGuide | null {
	const junction = node.graphNodes[movement.junctionNodeId];
	const edge = node.edges[movement.fromEdgeId];
	if (!junction || !edge) return null;
	const otherId = edge.startNodeId === junction.id ? edge.endNodeId : edge.startNodeId;
	const other = node.graphNodes[otherId];
	if (!other) return null;
	const dx = other.position[0] - junction.position[0];
	const dz = other.position[2] - junction.position[2];
	const length = Math.max(Math.hypot(dx, dz), 1e-6);
	const ux = dx / length;
	const uz = dz / length;
	const nx = -uz;
	const nz = ux;
	const style = styleForEdge(node, edge.id);
	const halfWidth = (style.laneCount * style.laneWidth + style.medianWidth + style.shoulderWidth * 2) / 2 + 0.5;
	const station = Math.max(3.5, style.laneWidth);
	const center: [number, number, number] = [
		junction.position[0] + ux * station,
		junction.position[1] + style.surfaceThickness + 0.12,
		junction.position[2] + uz * station,
	];
	return {
		color: "#f8fafc",
		id: movement.id,
		mode: "pedestrian",
		points: [
			[center[0] + nx * halfWidth, center[1], center[2] + nz * halfWidth],
			[center[0] - nx * halfWidth, center[1], center[2] - nz * halfWidth],
		],
		width: 0.32,
	};
}

export function buildRoadActiveModeGuides(node: RoadNetworkNode): RoadActiveModeGuide[] {
	const vehicleGuides = new Map(buildRoadLaneMovementGuides(node).map((guide) => [guide.id, guide]));
	return Object.values(node.activeModeMovements ?? {}).flatMap((movement) => {
		if (!movement.enabled) return [];
		if (movement.mode === "pedestrian") {
			const guide = pedestrianGuide(node, movement);
			return guide ? [guide] : [];
		}
		const source = movement.sourceMovementId ? vehicleGuides.get(movement.sourceMovementId) : undefined;
		return source ? [{
			color: "#34d399",
			id: movement.id,
			mode: "bicycle" as const,
			points: source.points.map((point) => [point[0], point[1] + 0.05, point[2]] as [number, number, number]),
			width: 0.2,
		}] : [];
	});
}

export function setRoadActiveModeMovementEnabled(
	node: RoadNetworkNode,
	movementId: string,
	enabled: boolean,
): RoadNetworkNode["activeModeMovements"] | null {
	const movement = node.activeModeMovements[movementId];
	if (!movement) return null;
	return { ...node.activeModeMovements, [movementId]: { ...movement, enabled } };
}

export function RoadActiveModeInspector({
	node,
	onUpdate,
}: {
	node: RoadNetworkNode;
	onUpdate: (patch: Partial<RoadNetworkNode>) => void;
}) {
	const movements = Object.values(node.activeModeMovements ?? {});
	if (movements.length === 0) return <p style={{ color: "#94a3b8", fontSize: 11, margin: 0 }}>Add a junction to generate pedestrian and bicycle movements.</p>;
	const pedestrians = movements.filter((movement) => movement.mode === "pedestrian");
	const bicycles = movements.filter((movement) => movement.mode === "bicycle");
	return (
		<div aria-label="Pedestrian and bicycle junction movements" style={{ display: "grid", gap: 7 }}>
			<p style={{ color: "#e2e8f0", fontSize: 12, margin: 0 }}>
				{pedestrians.length} pedestrian crossings · {bicycles.length} bicycle movements
			</p>
			<label style={{ alignItems: "center", display: "flex", fontSize: 11, gap: 7 }}>
				<input aria-label="Show pedestrian and bicycle movements" checked={node.showActiveModeMovements} onChange={(event) => onUpdate({ showActiveModeMovements: event.currentTarget.checked })} type="checkbox" />
				<span>Show active-mode overlay</span>
			</label>
			{movements.slice(0, 12).map((movement, index) => (
				<label key={movement.id} style={{ alignItems: "center", display: "flex", fontSize: 11, gap: 7 }}>
					<input
						aria-label={`${movement.mode} movement ${index + 1}`}
						checked={movement.enabled}
						onChange={(event) => {
							const activeModeMovements = setRoadActiveModeMovementEnabled(node, movement.id, event.currentTarget.checked);
							if (activeModeMovements) onUpdate({ activeModeMovements });
						}}
						type="checkbox"
					/>
					<span>{movement.mode} · {movement.kind}</span>
				</label>
			))}
		</div>
	);
}
