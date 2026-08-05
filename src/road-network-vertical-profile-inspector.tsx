"use client";

import { ActionButton, ActionGroup, SliderControl } from "@pascal-app/editor";
import { useEffect, useMemo, useState } from "react";
import {
	ROAD_PANEL_SELECT_CLASS,
	RoadPanelEmpty,
	RoadPanelField,
	RoadPanelStatus,
	RoadPanelSubheading,
} from "./road-panel-controls";
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
			className="h-[62px] w-full rounded-lg border border-border/40 bg-black/20"
			role="img"
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
		return <RoadPanelEmpty>No road segments</RoadPanelEmpty>;
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
		<div className="flex flex-col gap-2">
			{edgeIds.length > 1 ? (
				<RoadPanelField label="Segment">
					<select
						aria-label="Vertical profile road segment"
						className={ROAD_PANEL_SELECT_CLASS}
						onChange={(event) => setEdgeId(event.target.value)}
						value={edge.id}
					>
						{edgeIds.map((id, index) => (
							<option key={id} value={id}>{`Segment ${index + 1}`}</option>
						))}
					</select>
				</RoadPanelField>
			) : null}
			{profileMode !== "designed" ? (
				<ActionButton
					label="Enable vertical profile"
					onClick={() => run(enableRoadVerticalProfile)}
					type="button"
				/>
			) : (
				<>
					<ProfilePreview edge={edge} node={node} />
					{gradeWarning ? (
						<RoadPanelStatus>
							Grade {(summary.maxAbsGrade * 100).toFixed(1)}% exceeds {(maxGrade * 100).toFixed(1)}%
						</RoadPanelStatus>
					) : null}
					<ActionGroup>
						<ActionButton label="Add point" onClick={() => run(addRoadVerticalProfilePoint)} type="button" />
						<ActionButton label="Smooth" onClick={() => run(smoothRoadVerticalProfile)} type="button" />
					</ActionGroup>
					{profile.map((point, index) => (
						<div
							className="flex flex-col gap-1 rounded-lg border border-border/40 bg-white/[0.03] p-2"
							key={point.id}
						>
							<RoadPanelSubheading>{`PVI ${index + 1}`}</RoadPanelSubheading>
							<SliderControl
								label="Station"
								max={summary.length}
								min={0}
									value={point.station}
									onChange={(station) => {
										const patch = updateRoadVerticalProfilePoint(
											node,
											edge.id,
											point.id,
											{ station },
										);
										if (patch) onUpdate(patch);
									}}
									precision={2}
									step={0.1}
									unit="m"
								/>
							<SliderControl
								label="Elevation"
								max={1000}
								min={-1000}
									value={point.elevation}
									onChange={(elevation) => {
										const patch = updateRoadVerticalProfilePoint(
											node,
											edge.id,
											point.id,
											{ elevation },
										);
										if (patch) onUpdate(patch);
									}}
									precision={2}
									step={0.1}
									unit="m"
								/>
							<SliderControl
								label="Curve length"
								max={1000}
								min={0}
									value={point.curveLength}
									onChange={(curveLength) => {
										const patch = updateRoadVerticalProfilePoint(
											node,
											edge.id,
											point.id,
											{ curveLength },
										);
										if (patch) onUpdate(patch);
									}}
									precision={2}
									step={0.1}
									unit="m"
								/>
							<ActionButton
								className="text-red-300"
								label="Remove point"
								onClick={() => {
									const patch = deleteRoadVerticalProfilePoint(
										node,
										edge.id,
										point.id,
									);
									if (patch) onUpdate(patch);
								}}
								type="button"
							/>
						</div>
					))}
					<ActionButton
						label="Bake to spline"
						onClick={() => run(bakeRoadVerticalProfile)}
						type="button"
					/>
				</>
			)}
		</div>
	);
}
