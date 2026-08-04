"use client";

import { DEFAULT_ROAD_STYLE_PRESETS } from "./road-style-presets";
import type { RoadGraphEdge, RoadLane, RoadNetworkNode, RoadStylePreset } from "./schema";

function edgeStyle(node: RoadNetworkNode, edge: RoadGraphEdge): RoadStylePreset {
	const styleId = node.applyStyleToAll ? node.activeStyleId : edge.styleId;
	return (
		node.stylePresets[styleId] ??
		DEFAULT_ROAD_STYLE_PRESETS[styleId as keyof typeof DEFAULT_ROAD_STYLE_PRESETS] ??
		DEFAULT_ROAD_STYLE_PRESETS["local-street"]
	);
}

function laneDirections(edge: RoadGraphEdge, laneCount: number): Array<"forward" | "reverse"> {
	if (edge.direction === "forward") return Array(laneCount).fill("forward");
	if (edge.direction === "reverse") return Array(laneCount).fill("reverse");
	const forwardCount = Math.ceil(laneCount / 2);
	return [
		...Array<"forward">(forwardCount).fill("forward"),
		...Array<"reverse">(laneCount - forwardCount).fill("reverse"),
	];
}

/** Expand authored centerlines into stable, persistent directed lane records. */
export function buildDirectedRoadLanes(node: RoadNetworkNode): Record<string, RoadLane> {
	const lanes: Record<string, RoadLane> = {};
	for (const edge of Object.values(node.edges).sort((a, b) => a.id.localeCompare(b.id))) {
		const style = edgeStyle(node, edge);
		const directions = laneDirections(edge, style.laneCount);
		const drivingSign = node.regionalPack === "left-driving" ? 1 : -1;
		const directionRanks = { forward: 0, reverse: 0 };
		for (const direction of directions) {
			const index = directionRanks[direction]++;
			const sideSign = direction === "forward" ? drivingSign : -drivingSign;
			const id = `lane:${edge.id}:${direction}:${index}`;
			lanes[id] = {
				direction,
				edgeId: edge.id,
				endNodeId: direction === "forward" ? edge.endNodeId : edge.startNodeId,
				id,
				index,
				kind: "general",
				lateralOffset:
					sideSign * (style.medianWidth / 2 + style.laneWidth * (index + 0.5)),
				startNodeId: direction === "forward" ? edge.startNodeId : edge.endNodeId,
				width: style.laneWidth,
			};
		}
	}
	for (const junction of Object.values(node.junctions).sort((a, b) => a.nodeId.localeCompare(b.nodeId))) {
		for (const [edgeId, pocket] of Object.entries(junction.turnPocketEdges ?? {}).sort()) {
			const edge = node.edges[edgeId];
			if (!edge) continue;
			const base = Object.values(lanes)
				.filter((lane) => lane.edgeId === edgeId && lane.endNodeId === junction.nodeId && lane.kind === "general")
				.sort((a, b) => Math.abs(a.lateralOffset) - Math.abs(b.lateralOffset))[0];
			if (!base) continue;
			const style = edgeStyle(node, edge);
			const drivingSign = node.regionalPack === "left-driving" ? 1 : -1;
			const trafficSideSign = base.direction === "forward" ? drivingSign : -drivingSign;
			const turns = pocket === "both" ? ["left", "right"] as const : [pocket] as const;
			for (const turn of turns) {
				const id = `lane:${edgeId}:turn-pocket:${junction.nodeId}:${turn}`;
				lanes[id] = {
					...base,
					id,
					index: base.index + (turn === "left" ? 1 : 2),
					junctionNodeId: junction.nodeId,
					kind: "turn",
					lateralOffset: base.lateralOffset + (turn === "left" ? -trafficSideSign : trafficSideSign) * style.laneWidth,
					turn,
				};
			}
		}
	}
	return lanes;
}

export function roadLanesAreCurrent(node: RoadNetworkNode): boolean {
	return JSON.stringify(node.lanes) === JSON.stringify(buildDirectedRoadLanes(node));
}

export function RoadLaneGraphInspector({
	node,
	onUpdate,
}: {
	node: RoadNetworkNode;
	onUpdate: (patch: Partial<RoadNetworkNode>) => void;
}) {
	const generated = buildDirectedRoadLanes(node);
	const lanes = Object.values(node.lanes);
	const current = JSON.stringify(node.lanes) === JSON.stringify(generated);
	return (
		<div aria-label="Directed road lane graph" style={{ display: "grid", gap: 7 }}>
			<p style={{ color: "#e2e8f0", fontSize: 12, margin: 0 }}>
				{lanes.length} directed {lanes.length === 1 ? "lane" : "lanes"} across {Object.keys(node.edges).length} {Object.keys(node.edges).length === 1 ? "edge" : "edges"}
			</p>
			<p style={{ color: current ? "#86efac" : "#fbbf24", fontSize: 11, margin: 0 }}>
				{current ? "Lane graph is synchronized." : "Lane graph needs regeneration."}
			</p>
			<button
				onClick={() => onUpdate({ lanes: generated })}
				style={{
					background: "rgba(30, 41, 59, 0.84)",
					border: "1px solid rgba(148, 163, 184, 0.28)",
					borderRadius: 6,
					color: "#e2e8f0",
					cursor: "pointer",
					fontSize: 12,
					padding: "7px 8px",
				}}
				type="button"
			>
				Regenerate directed lanes
			</button>
		</div>
	);
}
