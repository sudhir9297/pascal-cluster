"use client";

import {
	ActionButton,
	ActionGroup,
	MetricControl,
	SliderControl,
} from "@pascal-app/editor";
import {
	ROAD_PANEL_SELECT_CLASS,
	RoadPanelEmpty,
	RoadPanelField,
	RoadPanelSubheading,
} from "./road-panel-controls";
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
		return <RoadPanelEmpty>No junctions</RoadPanelEmpty>;
	}
	return (
		<div className="flex flex-col gap-2">
			<select
				aria-label="Road junction"
				className={ROAD_PANEL_SELECT_CLASS}
				onChange={(event) => {
					const id = event.currentTarget.value;
					setSelection(
						id ? { networkId: node.id, kind: "junction", id } : null,
					);
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
			{junction && junctionId ? (
				<RoadJunctionTreatmentControls
					junctionId={junctionId}
					node={node}
					onUpdate={onUpdate}
				/>
			) : (
				<RoadPanelEmpty>Select a junction</RoadPanelEmpty>
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
	const selection = useEnvironmentStore((state) => state.roadElementSelection);
	const junction = node.junctions[junctionId];
	if (!junction) return null;
	const selectedCornerKey =
		selection?.networkId === node.id &&
		selection.kind === "corner" &&
		selection.id === junctionId &&
		selection.cornerKey &&
		junction.cornerRadii[selection.cornerKey] !== undefined
			? selection.cornerKey
			: null;
	const approachEdges = Object.values(node.edges)
		.filter((edge) => edge.startNodeId === junctionId || edge.endNodeId === junctionId)
		.sort((a, b) => a.id.localeCompare(b.id));
	return (
		<div className="flex flex-col gap-2">
			{selectedCornerKey ? (
				<SliderControl
					label="Corner radius"
					max={100}
					min={0.5}
					onChange={(radius) => onUpdate({
						junctions: {
							...node.junctions,
							[junctionId]: {
								...junction,
								cornerRadii: {
									...junction.cornerRadii,
									[selectedCornerKey]: radius,
								},
								solverStatus: "manual",
							},
						},
					})}
					precision={1}
					step={0.1}
					unit="m"
					value={junction.cornerRadii[selectedCornerKey]!}
				/>
			) : null}
			<RoadPanelField label="Treatment">
				<select
					aria-label="Selected junction treatment"
					className={ROAD_PANEL_SELECT_CLASS}
					onChange={(event) => {
						const treatment = event.currentTarget.value as RoadJunction["treatment"];
						const junctions = overrideRoadJunctionTreatment(
							node,
							junctionId,
							treatment,
						);
						if (junctions) onUpdate({ junctions });
					}}
					value={junction.treatment}
				>
					{ROAD_JUNCTION_TREATMENTS.map((treatment) => (
						<option key={treatment} value={treatment}>
							{treatment[0]!.toUpperCase() + treatment.slice(1)}
						</option>
					))}
				</select>
			</RoadPanelField>
			<div className="flex flex-col gap-1.5">
				<RoadPanelSubheading>Approaches</RoadPanelSubheading>
				{approachEdges.map((edge, index) => (
					<RoadPanelField key={edge.id} label={`Approach ${index + 1}`}>
						<select
							aria-label={`Approach ${index + 1} control`}
							className={ROAD_PANEL_SELECT_CLASS}
							onChange={(event) => {
								const junctions = overrideRoadJunctionApproachControl(
									node,
									junctionId,
									edge.id,
									event.currentTarget.value as NonNullable<RoadJunction["approachControls"][string]>,
								);
								if (junctions) onUpdate({ junctions });
							}}
							value={junction.approachControls?.[edge.id] ?? "auto"}
						>
							{ROAD_APPROACH_CONTROLS.map((control) => (
								<option key={control} value={control}>{control[0]!.toUpperCase() + control.slice(1)}</option>
							))}
						</select>
					</RoadPanelField>
				))}
			</div>
			<div
				aria-label="Manual junction boundary editor"
				className="flex flex-col gap-2 border-border/50 border-t pt-2"
			>
				<RoadPanelSubheading>
					Boundary · {junction.manualBoundaryEnabled ? "Manual" : "Automatic"}
				</RoadPanelSubheading>
				{junction.manualBoundaryEnabled ? (
					<>
						<div className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
							{junction.manualBoundaryPoints.map((point, index) => (
								<div
									className="flex flex-col gap-1 rounded-lg border border-border/40 bg-white/[0.03] p-2"
									key={index}
								>
									<RoadPanelSubheading>P{index + 1}</RoadPanelSubheading>
									<div className="grid grid-cols-2 gap-1">
										{([0, 1] as const).map((axis) => (
											<div
												aria-label={`Boundary point ${index + 1} ${axis === 0 ? "X" : "Z"}`}
												key={axis}
											>
												<MetricControl
													label={axis === 0 ? "X" : "Z"}
													max={1000}
													min={-1000}
													onChange={(value) => {
														const junctions = updateRoadManualJunctionBoundaryPoint(
															node,
															junctionId,
															index,
															axis,
															value,
														);
														if (junctions) onUpdate({ junctions });
													}}
													precision={2}
													step={0.1}
													unit="m"
													value={point[axis]}
												/>
											</div>
										))}
									</div>
									<ActionButton
										aria-label={`Remove boundary point ${index + 1}`}
										className="h-8 text-red-300"
										disabled={junction.manualBoundaryPoints.length <= 3}
										label="Remove"
										onClick={() => {
											const junctions = removeRoadManualJunctionBoundaryPoint(node, junctionId, index);
											if (junctions) onUpdate({ junctions });
										}}
										type="button"
									/>
								</div>
							))}
						</div>
						<ActionGroup>
							<ActionButton
								label="Add point"
								onClick={() => {
									const junctions = addRoadManualJunctionBoundaryPoint(node, junctionId);
									if (junctions) onUpdate({ junctions });
								}}
								type="button"
							/>
							<ActionButton
								label="Reset"
								onClick={() => {
									const junctions = resetRoadManualJunctionBoundary(node, junctionId);
									if (junctions) onUpdate({ junctions });
								}}
								type="button"
							/>
						</ActionGroup>
					</>
				) : (
					<ActionButton
						label="Edit boundary"
						onClick={() => {
							const junctions = enableRoadManualJunctionBoundary(node, junctionId);
							if (junctions) onUpdate({ junctions });
						}}
						type="button"
					/>
				)}
			</div>
		</div>
	);
}
