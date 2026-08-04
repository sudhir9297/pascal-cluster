"use client";

import {
	editRoadEdgeRoadway,
	editRoadEdgeSide,
	editRoadNetworkDefaultRoadway,
	editRoadNetworkDefaultSide,
	resetRoadEdgeStyle,
	resolveRoadStyleEditingScope,
	type RoadSideStyleNumberKey,
	type RoadwayStyleNumberKey,
} from "./road-network-style-editing";
import { resolveRoadSideComponents, type RoadSide } from "./road-cross-section";
import type { RoadNetworkNode } from "./schema";
import { useEnvironmentStore } from "./store";

const ROADWAY_CONTROLS: Array<{
	key: RoadwayStyleNumberKey;
	label: string;
	max: number;
	min: number;
	step: number;
}> = [
	{ key: "laneCount", label: "Lane count", min: 1, max: 12, step: 1 },
	{ key: "laneWidth", label: "Lane width", min: 2.4, max: 5, step: 0.05 },
	{ key: "shoulderWidth", label: "Shoulder width", min: 0, max: 4, step: 0.05 },
	{ key: "medianWidth", label: "Median width", min: 0, max: 12, step: 0.1 },
	{
		key: "surfaceThickness",
		label: "Surface thickness",
		min: 0.02,
		max: 1,
		step: 0.01,
	},
];

const SIDE_CONTROLS: Array<{
	key: RoadSideStyleNumberKey;
	label: string;
	max: number;
	step: number;
}> = [
	{ key: "parkingLaneWidth", label: "Parking lane", max: 4, step: 0.1 },
	{ key: "bikeLaneWidth", label: "Bike lane", max: 3, step: 0.1 },
	{ key: "gutterWidth", label: "Gutter", max: 2, step: 0.05 },
	{ key: "curbWidth", label: "Curb", max: 1, step: 0.05 },
	{ key: "vergeWidth", label: "Verge", max: 8, step: 0.1 },
	{ key: "sidewalkWidth", label: "Sidewalk", max: 6, step: 0.1 },
];

const inputStyle = {
	background: "rgba(15, 23, 42, 0.72)",
	border: "1px solid rgba(148, 163, 184, 0.28)",
	borderRadius: 6,
	color: "#e2e8f0",
	fontSize: 12,
	padding: "6px 8px",
	width: 88,
} as const;

function NumberField({
	label,
	max,
	min = 0,
	onChange,
	step,
	value,
}: {
	label: string;
	max: number;
	min?: number;
	onChange: (value: number) => void;
	step: number;
	value: number;
}) {
	return (
		<label
			style={{
				alignItems: "center",
				display: "flex",
				fontSize: 12,
				gap: 8,
				justifyContent: "space-between",
			}}
		>
			<span>{label}</span>
			<input
				aria-label={`${label} in metres`}
				max={max}
				min={min}
				onChange={(event) => {
					const next = event.currentTarget.valueAsNumber;
					if (Number.isFinite(next)) onChange(next);
				}}
				step={step}
				style={inputStyle}
				type="number"
				value={value}
			/>
		</label>
	);
}

export function RoadCrossSectionInspector({
	node,
	onUpdate,
}: {
	node: RoadNetworkNode;
	onUpdate: (patch: Partial<RoadNetworkNode>) => void;
}) {
	const selection = useEnvironmentStore((state) => state.roadElementSelection);
	const selectedEdgeId =
		selection?.networkId === node.id && selection.kind === "edge"
			? selection.id
			: null;
	const scope = resolveRoadStyleEditingScope(node, selectedEdgeId);
	const style = scope.style;
	const updateRoadway = (key: RoadwayStyleNumberKey, value: number) => {
		if (scope.edgeId) {
			const patch = editRoadEdgeRoadway(node, scope.edgeId, key, value);
			if (patch) onUpdate(patch);
			return;
		}
		onUpdate({ stylePresets: editRoadNetworkDefaultRoadway(node, key, value) });
	};
	const updateSide = (
		side: RoadSide,
		key: RoadSideStyleNumberKey,
		value: number,
	) => {
		if (scope.edgeId) {
			const patch = editRoadEdgeSide(node, scope.edgeId, side, key, value);
			if (patch) onUpdate(patch);
			return;
		}
		onUpdate({ stylePresets: editRoadNetworkDefaultSide(node, side, key, value) });
	};
	return (
		<div style={{ display: "grid", gap: 12 }}>
			<p style={{ color: "#94a3b8", fontSize: 11, lineHeight: 1.4, margin: 0 }}>
				{scope.edgeId ? "Editing selected segment" : "Editing network default"}: {style.name}
			</p>
			{scope.edgeId ? (
				<button
					onClick={() => {
						const patch = resetRoadEdgeStyle(node, scope.edgeId!);
						if (patch) onUpdate(patch);
					}}
					style={{
						background: "rgba(30, 41, 59, 0.84)",
						border: "1px solid rgba(148, 163, 184, 0.28)",
						borderRadius: 6,
						color: "#e2e8f0",
						cursor: "pointer",
						padding: "7px 9px",
					}}
					type="button"
				>
					Use network default
				</button>
			) : null}
			<fieldset style={{ border: 0, display: "grid", gap: 7, margin: 0, padding: 0 }}>
				<legend style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
					Roadway
				</legend>
				{ROADWAY_CONTROLS.map((control) => (
					<NumberField
						key={control.key}
						label={control.label}
						max={control.max}
						min={control.min}
						onChange={(value) => updateRoadway(control.key, value)}
						step={control.step}
						value={style[control.key]}
					/>
				))}
			</fieldset>
			{(["left", "right"] as const).map((side: RoadSide) => {
				const components = resolveRoadSideComponents(style, side);
				const sideLabel = side === "left" ? "Left side" : "Right side";
				return (
					<fieldset
						key={side}
						style={{ border: 0, display: "grid", gap: 7, margin: 0, padding: 0 }}
					>
						<legend style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
							{sideLabel}
						</legend>
						{SIDE_CONTROLS.map((control) => (
							<NumberField
								key={control.key}
								label={`${sideLabel} ${control.label.toLowerCase()}`}
								max={control.max}
								onChange={(value) => updateSide(side, control.key, value)}
								step={control.step}
								value={components[control.key]}
							/>
						))}
					</fieldset>
				);
			})}
		</div>
	);
}
