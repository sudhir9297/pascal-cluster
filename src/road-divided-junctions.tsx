"use client";

import { DEFAULT_ROAD_STYLE_PRESETS } from "./road-style-presets";
import type {
	RoadDividedJunctionExpansion,
	RoadGraphEdge,
	RoadInternalJunctionNode,
	RoadNetworkNode,
	RoadStylePreset,
} from "./schema";

function edgeStyle(node: RoadNetworkNode, edge: RoadGraphEdge): RoadStylePreset {
	const styleId = node.applyStyleToAll ? node.activeStyleId : edge.styleId;
	return node.stylePresets[styleId]
		?? DEFAULT_ROAD_STYLE_PRESETS[styleId as keyof typeof DEFAULT_ROAD_STYLE_PRESETS]
		?? DEFAULT_ROAD_STYLE_PRESETS["local-street"];
}

function internalNodeForDirection(
	node: RoadNetworkNode,
	junctionNodeId: string,
	edge: RoadGraphEdge,
	direction: "inbound" | "outbound",
): RoadInternalJunctionNode | null {
	const junction = node.graphNodes[junctionNodeId];
	const otherNodeId = edge.startNodeId === junctionNodeId ? edge.endNodeId : edge.startNodeId;
	const other = node.graphNodes[otherNodeId];
	if (!junction || !other) return null;
	const lanes = Object.values(node.lanes).filter((lane) =>
		lane.edgeId === edge.id
		&& (direction === "inbound" ? lane.endNodeId === junctionNodeId : lane.startNodeId === junctionNodeId),
	);
	if (lanes.length === 0) return null;
	const dx = other.position[0] - junction.position[0];
	const dz = other.position[2] - junction.position[2];
	const length = Math.max(Math.hypot(dx, dz), 1e-6);
	const ux = dx / length;
	const uz = dz / length;
	const normalX = -uz;
	const normalZ = ux;
	const authoredSign = edge.startNodeId === junctionNodeId ? 1 : -1;
	const lateralOffset = lanes.reduce((sum, lane) => sum + lane.lateralOffset * authoredSign, 0) / lanes.length;
	const style = edgeStyle(node, edge);
	const distance = Math.max(2.5, style.medianWidth + style.laneWidth * 0.8);
	const id = `internal:${junctionNodeId}:${edge.id}:${direction}`;
	return {
		direction,
		edgeId: edge.id,
		id,
		junctionNodeId,
		position: [
			junction.position[0] + ux * distance + normalX * lateralOffset,
			junction.position[1] + style.surfaceThickness + 0.08,
			junction.position[2] + uz * distance + normalZ * lateralOffset,
		],
	};
}

/** Expand divided-road junctions into explicit carriageway nodes and movement links. */
export function buildDividedRoadJunctionExpansions(
	node: RoadNetworkNode,
): RoadNetworkNode["dividedJunctions"] {
	const expansions: RoadNetworkNode["dividedJunctions"] = {};
	for (const junction of Object.values(node.junctions).sort((a, b) => a.nodeId.localeCompare(b.nodeId))) {
		const incident = Object.values(node.edges)
			.filter((edge) => edge.startNodeId === junction.nodeId || edge.endNodeId === junction.nodeId)
			.sort((first, second) => first.id.localeCompare(second.id));
		if (!incident.some((edge) => edgeStyle(node, edge).medianWidth > 0.1)) continue;
		const nodes: RoadDividedJunctionExpansion["nodes"] = {};
		for (const edge of incident) {
			for (const direction of ["inbound", "outbound"] as const) {
				const internal = internalNodeForDirection(node, junction.nodeId, edge, direction);
				if (internal) nodes[internal.id] = internal;
			}
		}
		const links: RoadDividedJunctionExpansion["links"] = {};
		for (const movement of Object.values(node.laneMovements)
			.filter((candidate) => candidate.junctionNodeId === junction.nodeId && candidate.enabled)
			.sort((first, second) => first.id.localeCompare(second.id))) {
			const from = node.lanes[movement.fromLaneId];
			const to = node.lanes[movement.toLaneId];
			if (!from || !to) continue;
			const startNodeId = `internal:${junction.nodeId}:${from.edgeId}:inbound`;
			const endNodeId = `internal:${junction.nodeId}:${to.edgeId}:outbound`;
			if (!nodes[startNodeId] || !nodes[endNodeId]) continue;
			const id = `internal-link:${movement.id}`;
			links[id] = {
				endNodeId,
				id,
				junctionNodeId: junction.nodeId,
				movementId: movement.id,
				startNodeId,
			};
		}
		expansions[junction.nodeId] = { junctionNodeId: junction.nodeId, links, nodes };
	}
	return expansions;
}

export type RoadDividedJunctionGraphGuide = {
	id: string;
	points: Array<[number, number, number]>;
};

export function buildDividedJunctionGraphGuides(node: RoadNetworkNode): {
	links: RoadDividedJunctionGraphGuide[];
	nodes: RoadInternalJunctionNode[];
} {
	const expansions = Object.values(node.dividedJunctions ?? {});
	return {
		nodes: expansions.flatMap((expansion) => Object.values(expansion.nodes)),
		links: expansions.flatMap((expansion) => Object.values(expansion.links).flatMap((link) => {
			const start = expansion.nodes[link.startNodeId];
			const end = expansion.nodes[link.endNodeId];
			const center = node.graphNodes[link.junctionNodeId];
			if (!start || !end || !center) return [];
			return [{
				id: link.id,
				points: [start.position, [center.position[0], start.position[1], center.position[2]], end.position],
			}];
		})),
	};
}

export function RoadDividedJunctionInspector({
	node,
	onUpdate,
}: {
	node: RoadNetworkNode;
	onUpdate: (patch: Partial<RoadNetworkNode>) => void;
}) {
	const expansions = Object.values(node.dividedJunctions ?? {});
	if (expansions.length === 0) {
		return <p style={{ color: "#94a3b8", fontSize: 11, margin: 0 }}>Use a preset with a median at a junction to generate linked carriageway nodes.</p>;
	}
	const nodeCount = expansions.reduce((total, expansion) => total + Object.keys(expansion.nodes).length, 0);
	const linkCount = expansions.reduce((total, expansion) => total + Object.keys(expansion.links).length, 0);
	return (
		<div aria-label="Divided road internal junction graph" style={{ display: "grid", gap: 7 }}>
			<p style={{ color: "#e2e8f0", fontSize: 12, margin: 0 }}>
				{expansions.length} expanded junction · {nodeCount} internal nodes · {linkCount} links
			</p>
			<label style={{ alignItems: "center", display: "flex", fontSize: 11, gap: 7 }}>
				<input
					aria-label="Show divided junction internal graph"
					checked={node.showDividedJunctionGraph}
					onChange={(event) => onUpdate({ showDividedJunctionGraph: event.currentTarget.checked })}
					type="checkbox"
				/>
				<span>Show internal node/link overlay</span>
			</label>
		</div>
	);
}
