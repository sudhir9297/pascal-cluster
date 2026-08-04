"use client";

import type { RoadJunction, RoadNetworkNode } from "./schema";
import { useEnvironmentStore } from "./store";
import {
	addRoadManualJunctionBoundaryPoint,
	enableRoadManualJunctionBoundary,
	removeRoadManualJunctionBoundaryPoint,
	resetRoadManualJunctionBoundary,
	updateRoadManualJunctionBoundaryPoint,
} from "./road-junction-boundary-editor";

export const ROAD_JUNCTION_TREATMENTS = [
	"auto",
	"stop",
	"yield",
	"signal",
	"roundabout",
] as const satisfies ReadonlyArray<RoadJunction["treatment"]>;

export const ROAD_APPROACH_CONTROLS = [
	"auto",
	"none",
	"stop",
	"yield",
	"signal",
] as const satisfies ReadonlyArray<NonNullable<RoadJunction["approachControls"][string]>>;

export function overrideRoadJunctionApproachControl(
	node: RoadNetworkNode,
	junctionId: string,
	edgeId: string,
	control: NonNullable<RoadJunction["approachControls"][string]>,
): RoadNetworkNode["junctions"] | null {
	const junction = node.junctions[junctionId];
	if (!junction || !node.edges[edgeId]) return null;
	return {
		...node.junctions,
		[junctionId]: {
			...junction,
			approachControls: { ...(junction.approachControls ?? {}), [edgeId]: control },
		},
	};
}

export function overrideRoadJunctionTreatment(
	node: RoadNetworkNode,
	junctionId: string,
	treatment: RoadJunction["treatment"],
): RoadNetworkNode["junctions"] | null {
	const junction = node.junctions[junctionId];
	if (!junction) return null;
	return {
		...node.junctions,
		[junctionId]: { ...junction, treatment },
	};
}

export function RoadJunctionInspector({
	node,
	onUpdate,
}: {
	node: RoadNetworkNode;
	onUpdate: (patch: Partial<RoadNetworkNode>) => void;
}) {
	const selection = useEnvironmentStore((state) => state.roadElementSelection);
	const setSelection = useEnvironmentStore((state) => state.setRoadElementSelection);
	const junctionEntries = Object.values(node.junctions).sort((first, second) =>
		first.nodeId.localeCompare(second.nodeId),
	);
	const junctionId =
		selection?.networkId === node.id &&
		(selection.kind === "junction" || selection.kind === "corner") &&
		node.junctions[selection.id]
			? selection.id
			: null;
	const junction = junctionId ? node.junctions[junctionId] : null;
	if (junctionEntries.length === 0) {
		return (
			<p style={{ color: "#94a3b8", fontSize: 11, lineHeight: 1.4, margin: 0 }}>
				This road network has no three-way or multi-leg junctions yet.
			</p>
		);
	}
	return (
		<div style={{ display: "grid", gap: 9 }}>
			<label style={{ display: "grid", fontSize: 12, gap: 5 }}>
				<span>Junction</span>
				<select
					aria-label="Road junction"
					onChange={(event) => {
						const id = event.currentTarget.value;
						setSelection(
							id ? { networkId: node.id, kind: "junction", id } : null,
						);
					}}
					style={{
						background: "rgba(15, 23, 42, 0.72)",
						border: "1px solid rgba(148, 163, 184, 0.28)",
						borderRadius: 6,
						color: "#e2e8f0",
						fontSize: 12,
						padding: "7px 8px",
					}}
					value={junctionId ?? ""}
				>
					<option value="">Choose junction…</option>
					{junctionEntries.map((candidate, index) => (
						<option key={candidate.nodeId} value={candidate.nodeId}>
							{index + 1}. {candidate.kind.replaceAll("-", " ")}
						</option>
					))}
				</select>
			</label>
			{junction && junctionId ? (
				<RoadJunctionTreatmentControls
					junctionId={junctionId}
					node={node}
					onUpdate={onUpdate}
				/>
			) : (
				<p style={{ color: "#94a3b8", fontSize: 11, lineHeight: 1.4, margin: 0 }}>
					Choose a junction here or select one in the canvas.
				</p>
			)}
		</div>
	);
}

export function RoadJunctionTreatmentControls({
	junctionId,
	node,
	onUpdate,
}: {
	junctionId: string;
	node: RoadNetworkNode;
	onUpdate: (patch: Partial<RoadNetworkNode>) => void;
}) {
	const junction = node.junctions[junctionId];
	if (!junction) return null;
	const approachEdges = Object.values(node.edges)
		.filter((edge) => edge.startNodeId === junctionId || edge.endNodeId === junctionId)
		.sort((a, b) => a.id.localeCompare(b.id));
	return (
		<div style={{ display: "grid", gap: 8 }}>
			<p style={{ color: "#94a3b8", fontSize: 11, lineHeight: 1.4, margin: 0 }}>
				Selected {junction.kind.replaceAll("-", " ")} junction
			</p>
			<label style={{ display: "grid", fontSize: 12, gap: 5 }}>
				<span>Junction treatment</span>
				<select
					aria-label="Selected junction treatment"
					onChange={(event) => {
						const treatment = event.currentTarget.value as RoadJunction["treatment"];
						const junctions = overrideRoadJunctionTreatment(
							node,
							junctionId,
							treatment,
						);
						if (junctions) onUpdate({ junctions });
					}}
					style={{
						background: "rgba(15, 23, 42, 0.72)",
						border: "1px solid rgba(148, 163, 184, 0.28)",
						borderRadius: 6,
						color: "#e2e8f0",
						fontSize: 12,
						padding: "7px 8px",
					}}
					value={junction.treatment}
				>
					{ROAD_JUNCTION_TREATMENTS.map((treatment) => (
						<option key={treatment} value={treatment}>
							{treatment[0]!.toUpperCase() + treatment.slice(1)}
						</option>
					))}
				</select>
			</label>
			<fieldset style={{ border: 0, display: "grid", gap: 6, margin: 0, padding: 0 }}>
				<legend style={{ fontSize: 12, marginBottom: 4 }}>Approach controls</legend>
				{approachEdges.map((edge, index) => (
					<label key={edge.id} style={{ alignItems: "center", display: "flex", fontSize: 11, gap: 8, justifyContent: "space-between" }}>
						<span>Approach {index + 1}</span>
						<select
							aria-label={`Approach ${index + 1} control`}
							onChange={(event) => {
								const junctions = overrideRoadJunctionApproachControl(
									node,
									junctionId,
									edge.id,
									event.currentTarget.value as NonNullable<RoadJunction["approachControls"][string]>,
								);
								if (junctions) onUpdate({ junctions });
							}}
							style={{ background: "rgba(15, 23, 42, 0.72)", border: "1px solid rgba(148, 163, 184, 0.28)", borderRadius: 6, color: "#e2e8f0", fontSize: 11, padding: "5px 6px" }}
							value={junction.approachControls?.[edge.id] ?? "auto"}
						>
							{ROAD_APPROACH_CONTROLS.map((control) => (
								<option key={control} value={control}>{control[0]!.toUpperCase() + control.slice(1)}</option>
							))}
						</select>
					</label>
				))}
			</fieldset>
			<div
				aria-label="Manual junction boundary editor"
				style={{
					borderTop: "1px solid rgba(148, 163, 184, 0.18)",
					display: "grid",
					gap: 7,
					paddingTop: 8,
				}}
			>
				<div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
					<span style={{ fontSize: 12 }}>Junction boundary</span>
					<strong style={{ color: junction.manualBoundaryEnabled ? "#facc15" : "#94a3b8", fontSize: 10 }}>
						{junction.manualBoundaryEnabled ? "MANUAL" : "AUTOMATIC"}
					</strong>
				</div>
				{junction.manualBoundaryEnabled ? (
					<>
						<p style={{ color: "#94a3b8", fontSize: 10, lineHeight: 1.35, margin: 0 }}>
							Offsets are local metres from the junction centre. Yellow viewport rings identify each point.
						</p>
						<div style={{ display: "grid", gap: 5, maxHeight: 224, overflowY: "auto" }}>
							{junction.manualBoundaryPoints.map((point, index) => (
								<div key={index} style={{ alignItems: "center", display: "grid", gap: 4, gridTemplateColumns: "30px 1fr 1fr 24px" }}>
									<span style={{ color: "#94a3b8", fontSize: 10 }}>P{index + 1}</span>
									{([0, 1] as const).map((axis) => (
										<input
											aria-label={`Boundary point ${index + 1} ${axis === 0 ? "X" : "Z"}`}
											key={axis}
											onChange={(event) => {
												const junctions = updateRoadManualJunctionBoundaryPoint(
													node,
													junctionId,
													index,
													axis,
													Number(event.currentTarget.value),
												);
												if (junctions) onUpdate({ junctions });
											}}
											step={0.1}
											style={{ background: "rgba(15, 23, 42, 0.72)", border: "1px solid rgba(148, 163, 184, 0.28)", borderRadius: 5, color: "#e2e8f0", fontSize: 10, minWidth: 0, padding: "4px" }}
											type="number"
											value={Number(point[axis].toFixed(2))}
										/>
									))}
									<button
										aria-label={`Remove boundary point ${index + 1}`}
										disabled={junction.manualBoundaryPoints.length <= 3}
										onClick={() => {
											const junctions = removeRoadManualJunctionBoundaryPoint(node, junctionId, index);
											if (junctions) onUpdate({ junctions });
										}}
										type="button"
									>−</button>
								</div>
							))}
						</div>
						<div style={{ display: "grid", gap: 5, gridTemplateColumns: "1fr 1fr" }}>
							<button
								onClick={() => {
									const junctions = addRoadManualJunctionBoundaryPoint(node, junctionId);
									if (junctions) onUpdate({ junctions });
								}}
								type="button"
							>Add point</button>
							<button
								onClick={() => {
									const junctions = resetRoadManualJunctionBoundary(node, junctionId);
									if (junctions) onUpdate({ junctions });
								}}
								type="button"
							>Reset automatic</button>
						</div>
					</>
				) : (
					<button
						onClick={() => {
							const junctions = enableRoadManualJunctionBoundary(node, junctionId);
							if (junctions) onUpdate({ junctions });
						}}
						type="button"
					>Enable manual boundary</button>
				)}
			</div>
		</div>
	);
}
