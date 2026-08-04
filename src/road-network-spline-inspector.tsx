"use client";

import { useEffect, useState } from "react";
import {
	deleteRoadSplinePoints,
	flattenRoadSplinePoints,
	gradeRoadSplinePoints,
	moveRoadSplineEndpoint,
	moveRoadSplinePoint,
	moveRoadSplinePoints,
} from "./road-network-spline-handles";
import type { RoadNetworkNode } from "./schema";
import { useEnvironmentStore } from "./store";

function CoordinateField({
	label,
	onCommit,
	value,
}: {
	label: string;
	onCommit: (value: number) => void;
	value: number;
}) {
	const [draft, setDraft] = useState(value.toFixed(2));
	useEffect(() => setDraft(value.toFixed(2)), [value]);

	const commit = () => {
		const parsed = Number.parseFloat(draft);
		if (Number.isFinite(parsed)) onCommit(parsed);
		else setDraft(value.toFixed(2));
	};

	return (
		<label
			style={{
				alignItems: "center",
				display: "grid",
				gap: 8,
				gridTemplateColumns: "72px minmax(0, 1fr)",
			}}
		>
			<span style={{ color: "#cbd5e1", fontSize: 12 }}>{label}</span>
			<span
				style={{
					alignItems: "center",
					background: "rgba(15, 23, 42, 0.72)",
					border: "1px solid rgba(148, 163, 184, 0.28)",
					borderRadius: 6,
					display: "flex",
					overflow: "hidden",
				}}
			>
				<input
					aria-label={`${label} in metres`}
					inputMode="decimal"
					onBlur={commit}
					onChange={(event) => setDraft(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter") event.currentTarget.blur();
						if (event.key === "Escape") {
							setDraft(value.toFixed(2));
							event.currentTarget.blur();
						}
					}}
					step="0.01"
					style={{
						background: "transparent",
						border: 0,
						color: "#f8fafc",
						minWidth: 0,
						outline: 0,
						padding: "6px 8px",
						width: "100%",
					}}
					type="number"
					value={draft}
				/>
				<span style={{ color: "#94a3b8", fontSize: 11, paddingRight: 8 }}>
					m
				</span>
			</span>
		</label>
	);
}

export function RoadSplinePointEditor({
	node,
	onUpdate,
}: {
	node: RoadNetworkNode;
	onUpdate: (patch: Partial<RoadNetworkNode>) => void;
}) {
	const selection = useEnvironmentStore((state) => state.roadElementSelection);
	if (selection?.networkId !== node.id) {
		return (
			<p style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.4 }}>
				Choose Edit spline, then select a green point.
			</p>
		);
	}

	const selectedIndices =
		selection.kind === "control"
			? (selection.indices ??
				(selection.index === undefined ? [] : [selection.index]))
			: [];
	const referenceIndex = selectedIndices[0] ?? selection.index;

	const point =
		selection.kind === "control" && referenceIndex !== undefined
			? node.edges[selection.id]?.alignment[referenceIndex]
			: selection.kind === "endpoint"
				? node.graphNodes[selection.id]?.position
				: undefined;
	if (!point) {
		return (
			<p style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.4 }}>
				Select a green spline point to edit its exact position.
			</p>
		);
	}

	const updateCoordinate = (axis: 0 | 1 | 2, value: number) => {
		const nextPoint: [number, number, number] = [...point];
		nextPoint[axis] = value;
		const patch =
			selection.kind === "control" && referenceIndex !== undefined
				? selectedIndices.length > 1
					? moveRoadSplinePoints(node, selection.id, selectedIndices, [
							nextPoint[0] - point[0],
							nextPoint[1] - point[1],
							nextPoint[2] - point[2],
						])
					: moveRoadSplinePoint(node, selection.id, referenceIndex, nextPoint)
				: selection.kind === "endpoint"
					? moveRoadSplineEndpoint(node, selection.id, nextPoint)
					: null;
		if (patch) onUpdate(patch);
	};

	const runSelectedPointCommand = (command: "delete" | "flatten" | "grade") => {
		if (selection.kind !== "control" || selectedIndices.length === 0) return;
		const patch =
			command === "delete"
				? deleteRoadSplinePoints(node, selection.id, selectedIndices)
				: command === "flatten"
					? flattenRoadSplinePoints(
							node,
							selection.id,
							selectedIndices,
							point[1],
						)
					: gradeRoadSplinePoints(node, selection.id, selectedIndices);
		if (!patch) return;
		onUpdate(patch);
		if (command === "delete") {
			useEnvironmentStore.getState().setRoadElementSelection({
				networkId: node.id,
				kind: "spline",
				id: node.id,
			});
		}
	};

	return (
		<div style={{ display: "grid", gap: 8 }}>
			<CoordinateField
				label="X"
				onCommit={(value) => updateCoordinate(0, value)}
				value={point[0]}
			/>
			<CoordinateField
				label="Elevation"
				onCommit={(value) => updateCoordinate(1, value)}
				value={point[1]}
			/>
			<CoordinateField
				label="Z"
				onCommit={(value) => updateCoordinate(2, value)}
				value={point[2]}
			/>
			{selection.kind === "control" ? (
				<div
					style={{
						display: "grid",
						gap: 6,
						gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
						marginTop: 4,
					}}
				>
					<button
						onClick={() => runSelectedPointCommand("flatten")}
						style={{
							background: "rgba(30, 41, 59, 0.84)",
							border: "1px solid rgba(148, 163, 184, 0.28)",
							borderRadius: 6,
							color: "#e2e8f0",
							cursor: "pointer",
							padding: "7px 8px",
						}}
						type="button"
					>
						Flatten
					</button>
					<button
						onClick={() => runSelectedPointCommand("grade")}
						style={{
							background: "rgba(30, 41, 59, 0.84)",
							border: "1px solid rgba(148, 163, 184, 0.28)",
							borderRadius: 6,
							color: "#e2e8f0",
							cursor: "pointer",
							padding: "7px 8px",
						}}
						type="button"
					>
						Constant grade
					</button>
					<button
						onClick={() => runSelectedPointCommand("delete")}
						style={{
							background: "rgba(127, 29, 29, 0.28)",
							border: "1px solid rgba(248, 113, 113, 0.34)",
							borderRadius: 6,
							color: "#fecaca",
							cursor: "pointer",
							gridColumn: "1 / -1",
							padding: "7px 8px",
						}}
						type="button"
					>
						Delete selected{" "}
						{selectedIndices.length > 1
							? `(${selectedIndices.length})`
							: "point"}
					</button>
				</div>
			) : null}
		</div>
	);
}
