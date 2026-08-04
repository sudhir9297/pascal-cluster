"use client";

import { useEffect, useMemo, useState } from "react";
import {
	addRoadVerticalProfilePoint,
	bakeRoadVerticalProfile,
	deleteRoadVerticalProfilePoint,
	enableRoadVerticalProfile,
	roadProfileElevationAtStation,
	roadVerticalProfileSummary,
	smoothRoadVerticalProfile,
	updateRoadVerticalProfilePoint,
} from "./road-network-vertical-profile";
import type { RoadGraphEdge, RoadNetworkNode } from "./schema";
import { useEnvironmentStore } from "./store";

const actionStyle = {
	background: "rgba(30, 41, 59, 0.84)",
	border: "1px solid rgba(148, 163, 184, 0.28)",
	borderRadius: 6,
	color: "#e2e8f0",
	cursor: "pointer",
	padding: "7px 8px",
} as const;

function ProfileNumber({
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
		<label style={{ display: "grid", gap: 3 }}>
			<span style={{ color: "#94a3b8", fontSize: 10 }}>{label}</span>
			<input
				aria-label={`${label} in metres`}
				onBlur={commit}
				onChange={(event) => setDraft(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === "Enter") event.currentTarget.blur();
					if (event.key === "Escape") {
						setDraft(value.toFixed(2));
						event.currentTarget.blur();
					}
				}}
				style={{
					background: "rgba(15, 23, 42, 0.72)",
					border: "1px solid rgba(148, 163, 184, 0.24)",
					borderRadius: 5,
					color: "#f8fafc",
					minWidth: 0,
					padding: "5px 6px",
					width: "100%",
				}}
				type="number"
				value={draft}
			/>
		</label>
	);
}

function ProfilePreview({
	edge,
	node,
}: {
	edge: RoadGraphEdge;
	node: RoadNetworkNode;
}) {
	const summary = roadVerticalProfileSummary(node, edge);
	const start = node.graphNodes[edge.startNodeId];
	const end = node.graphNodes[edge.endNodeId];
	if (!start || !end || summary.length <= 1e-6) return null;
	const samples = Array.from({ length: 65 }, (_, index) => {
		const station = (summary.length * index) / 64;
		return {
			station,
			elevation: roadProfileElevationAtStation(
				edge.verticalProfile,
				summary.length,
				start.position[1],
				end.position[1],
				station,
			),
		};
	});
	const elevations = samples.map((sample) => sample.elevation);
	const min = Math.min(...elevations);
	const max = Math.max(...elevations);
	const span = Math.max(0.1, max - min);
	const points = samples
		.map(
			(sample) =>
				`${(sample.station / summary.length) * 260},${54 - ((sample.elevation - min) / span) * 46}`,
		)
		.join(" ");
	return (
		<svg
			aria-label="Vertical profile preview"
			role="img"
			style={{
				background: "rgba(15, 23, 42, 0.58)",
				border: "1px solid rgba(148, 163, 184, 0.2)",
				borderRadius: 6,
				height: 62,
				width: "100%",
			}}
			viewBox="0 0 260 62"
		>
			<title>Vertical profile preview</title>
			<line stroke="rgba(148,163,184,.25)" x1="0" x2="260" y1="54" y2="54" />
			<polyline fill="none" points={points} stroke="#60a5fa" strokeWidth="2" />
		</svg>
	);
}

export function RoadVerticalProfileEditor({
	node,
	onUpdate,
}: {
	node: RoadNetworkNode;
	onUpdate: (patch: Partial<RoadNetworkNode>) => void;
}) {
	const selection = useEnvironmentStore((state) => state.roadElementSelection);
	const preferredEdgeId =
		selection?.networkId === node.id && node.edges[selection.id]
			? selection.id
			: undefined;
	const edgeIds = Object.keys(node.edges);
	const [edgeId, setEdgeId] = useState(preferredEdgeId ?? edgeIds[0] ?? "");
	useEffect(() => {
		if (preferredEdgeId) setEdgeId(preferredEdgeId);
		else if (!node.edges[edgeId]) setEdgeId(edgeIds[0] ?? "");
	}, [edgeId, edgeIds, node.edges, preferredEdgeId]);
	const edge = node.edges[edgeId];
	const summary = useMemo(
		() => (edge ? roadVerticalProfileSummary(node, edge) : null),
		[edge, node],
	);
	if (!edge || !summary) {
		return <p style={{ color: "#94a3b8", fontSize: 12 }}>Draw a road first.</p>;
	}
	const profileMode = edge.profileMode ?? "legacy";
	const profile = edge.verticalProfile ?? [];
	const maxGrade = Number.isFinite(node.maxRoadGrade)
		? node.maxRoadGrade
		: 0.12;
	const gradeWarning = summary.maxAbsGrade > maxGrade;
	const run = (
		command: (
			node: RoadNetworkNode,
			edgeId: string,
		) => Pick<RoadNetworkNode, "edges"> | null,
	) => {
		const patch = command(node, edge.id);
		if (patch) onUpdate(patch);
	};

	return (
		<div style={{ display: "grid", gap: 8 }}>
			{edgeIds.length > 1 ? (
				<select
					aria-label="Vertical profile road segment"
					onChange={(event) => setEdgeId(event.target.value)}
					style={{
						background: "#2c2c2e",
						border: "1px solid rgba(148,163,184,.25)",
						borderRadius: 6,
						color: "#e2e8f0",
						padding: "6px 8px",
					}}
					value={edge.id}
				>
					{edgeIds.map((id, index) => (
						<option key={id} value={id}>{`Segment ${index + 1}`}</option>
					))}
				</select>
			) : null}
			{profileMode !== "designed" ? (
				<>
					<p
						style={{
							color: "#94a3b8",
							fontSize: 12,
							lineHeight: 1.45,
							margin: 0,
						}}
					>
						Elevation currently follows the 3D spline points. Enable a profile
						to edit plan shape and road grades independently.
					</p>
					<button
						onClick={() => run(enableRoadVerticalProfile)}
						style={actionStyle}
						type="button"
					>
						Enable separate vertical profile
					</button>
				</>
			) : (
				<>
					<ProfilePreview edge={edge} node={node} />
					<p
						style={{
							color: gradeWarning ? "#fca5a5" : "#bbf7d0",
							fontSize: 11,
							margin: 0,
						}}
					>
						{summary.length.toFixed(2)} m · {profile.length} profile points ·
						max grade {(summary.maxAbsGrade * 100).toFixed(1)}%
						{gradeWarning ? ` (limit ${(maxGrade * 100).toFixed(1)}%)` : ""}
					</p>
					<div
						style={{ display: "grid", gap: 6, gridTemplateColumns: "1fr 1fr" }}
					>
						<button
							onClick={() => run(addRoadVerticalProfilePoint)}
							style={actionStyle}
							type="button"
						>
							Add profile point
						</button>
						<button
							onClick={() => run(smoothRoadVerticalProfile)}
							style={actionStyle}
							type="button"
						>
							Smooth vertical curves
						</button>
					</div>
					{profile.map((point, index) => (
						<div
							key={point.id}
							style={{
								background: "rgba(30,41,59,.45)",
								border: "1px solid rgba(148,163,184,.18)",
								borderRadius: 6,
								display: "grid",
								gap: 6,
								padding: 7,
							}}
						>
							<span
								style={{ color: "#cbd5e1", fontSize: 11 }}
							>{`PVI ${index + 1}`}</span>
							<div
								style={{
									display: "grid",
									gap: 5,
									gridTemplateColumns: "repeat(3, minmax(0,1fr))",
								}}
							>
								<ProfileNumber
									label={`PVI ${index + 1} station`}
									value={point.station}
									onCommit={(station) => {
										const patch = updateRoadVerticalProfilePoint(
											node,
											edge.id,
											point.id,
											{ station },
										);
										if (patch) onUpdate(patch);
									}}
								/>
								<ProfileNumber
									label={`PVI ${index + 1} elevation`}
									value={point.elevation}
									onCommit={(elevation) => {
										const patch = updateRoadVerticalProfilePoint(
											node,
											edge.id,
											point.id,
											{ elevation },
										);
										if (patch) onUpdate(patch);
									}}
								/>
								<ProfileNumber
									label={`PVI ${index + 1} curve length`}
									value={point.curveLength}
									onCommit={(curveLength) => {
										const patch = updateRoadVerticalProfilePoint(
											node,
											edge.id,
											point.id,
											{ curveLength },
										);
										if (patch) onUpdate(patch);
									}}
								/>
							</div>
							<button
								onClick={() => {
									const patch = deleteRoadVerticalProfilePoint(
										node,
										edge.id,
										point.id,
									);
									if (patch) onUpdate(patch);
								}}
								style={{ ...actionStyle, color: "#fecaca" }}
								type="button"
							>
								Remove PVI {index + 1}
							</button>
						</div>
					))}
					<button
						onClick={() => run(bakeRoadVerticalProfile)}
						style={actionStyle}
						type="button"
					>
						Bake profile back to spline points
					</button>
				</>
			)}
		</div>
	);
}
