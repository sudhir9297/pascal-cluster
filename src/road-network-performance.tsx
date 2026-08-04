"use client";

import type { RoadNetworkNode } from "./schema";

/**
 * Pascal production targets for the road subsystem. The road renderer receives
 * part of the host's 16.67 ms frame, leaving headroom for the rest of the scene,
 * UI, and compositor. Local edits must cook within one frame; a full 100-edge
 * load may use a longer asynchronous preparation window.
 */
export const ROAD_NETWORK_PERFORMANCE_BUDGETS = {
	fullNetworkMeshCookMs: 100,
	localMeshCookMs: 8,
	referenceEdgeCount: 100,
	roadGpuFrameMs: 4,
	targetFps: 60,
	totalFrameMs: 16.67,
} as const;

export function roadPerformanceBudgetStatus(
	measurement: { gpuFrameMs: number; meshCookMs: number },
): { gpuFrame: "pass" | "over"; meshCook: "pass" | "over" } {
	return {
		gpuFrame:
			measurement.gpuFrameMs <= ROAD_NETWORK_PERFORMANCE_BUDGETS.roadGpuFrameMs
				? "pass"
				: "over",
		meshCook:
			measurement.meshCookMs <= ROAD_NETWORK_PERFORMANCE_BUDGETS.localMeshCookMs
				? "pass"
				: "over",
	};
}

function BudgetRow({ label, value }: { label: string; value: string }) {
	return (
		<div
			style={{
				display: "flex",
				fontSize: 12,
				gap: 12,
				justifyContent: "space-between",
			}}
		>
			<span style={{ color: "#cbd5e1" }}>{label}</span>
			<strong style={{ color: "#f8fafc", fontVariantNumeric: "tabular-nums" }}>
				{value}
			</strong>
		</div>
	);
}

export function RoadPerformanceBudgetInspector({ node }: { node: RoadNetworkNode }) {
	const edgeCount = Object.keys(node.edges).length;
	const junctionCount = Object.values(node.graphNodes).filter((graphNode) => {
		const degree = Object.values(node.edges).filter(
			(edge) =>
				edge.startNodeId === graphNode.id || edge.endNodeId === graphNode.id,
		).length;
		return degree >= 3;
	}).length;
	return (
		<div aria-label="Road performance budgets" style={{ display: "grid", gap: 7 }}>
			<BudgetRow
				label="Road GPU frame"
				value={`≤ ${ROAD_NETWORK_PERFORMANCE_BUDGETS.roadGpuFrameMs.toFixed(1)} ms`}
			/>
			<BudgetRow
				label="Local mesh cook"
				value={`≤ ${ROAD_NETWORK_PERFORMANCE_BUDGETS.localMeshCookMs.toFixed(1)} ms`}
			/>
			<BudgetRow
				label={`${ROAD_NETWORK_PERFORMANCE_BUDGETS.referenceEdgeCount}-edge full cook`}
				value={`≤ ${ROAD_NETWORK_PERFORMANCE_BUDGETS.fullNetworkMeshCookMs.toFixed(0)} ms`}
			/>
			<p style={{ color: "#94a3b8", fontSize: 11, lineHeight: 1.4, margin: 0 }}>
				Current network: {edgeCount} {edgeCount === 1 ? "edge" : "edges"}, {junctionCount}{" "}
				{junctionCount === 1 ? "junction" : "junctions"}. Target {ROAD_NETWORK_PERFORMANCE_BUDGETS.targetFps}{" "}
				fps ({ROAD_NETWORK_PERFORMANCE_BUDGETS.totalFrameMs.toFixed(2)} ms total frame).
			</p>
		</div>
	);
}
