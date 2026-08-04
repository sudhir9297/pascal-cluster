"use client";

import { sampleRoadEdgePoints } from "./road-network-geometry";
import { DEFAULT_ROAD_STYLE_PRESETS } from "./road-style-presets";
import type { RoadGraphEdge, RoadNetworkNode, RoadsideDecoration, RoadStylePreset } from "./schema";

function edgeStyle(node: RoadNetworkNode, edge: RoadGraphEdge): RoadStylePreset {
	const styleId = node.applyStyleToAll ? node.activeStyleId : edge.styleId;
	return node.stylePresets[styleId]
		?? DEFAULT_ROAD_STYLE_PRESETS[styleId as keyof typeof DEFAULT_ROAD_STYLE_PRESETS]
		?? DEFAULT_ROAD_STYLE_PRESETS["local-street"];
}

function sampledLength(points: Array<[number, number, number]>): number {
	return points.slice(1).reduce((sum, point, index) => {
		const previous = points[index]!;
		return sum + Math.hypot(point[0] - previous[0], point[1] - previous[1], point[2] - previous[2]);
	}, 0);
}

function stations(length: number, spacing: number, inset = spacing / 2): number[] {
	const result: number[] = [];
	for (let station = inset; station < length - inset * 0.35; station += spacing) result.push(station);
	return result;
}

function sideWidth(style: RoadStylePreset, side: "left" | "right"): number {
	const components = style[side === "left" ? "leftSide" : "rightSide"];
	return Object.values(components ?? {}).reduce((sum, value) => sum + value, 0);
}

/** Derive deterministic lamps, trees, signs, and guardrails from road semantics. */
export function buildRoadsideDecorations(node: RoadNetworkNode): RoadNetworkNode["roadsideDecorations"] {
	const decorations: RoadNetworkNode["roadsideDecorations"] = {};
	const densityFactor = node.roadsideDecorationDensity === "dense" ? 0.65 : node.roadsideDecorationDensity === "sparse" ? 1.5 : 1;
	for (const edge of Object.values(node.edges).sort((a, b) => a.id.localeCompare(b.id))) {
		const style = edgeStyle(node, edge);
		const points = sampleRoadEdgePoints(node, edge, 36) as Array<[number, number, number]>;
		const length = sampledLength(points);
		const elevationModes = [node.graphNodes[edge.startNodeId]?.elevationMode, node.graphNodes[edge.endNodeId]?.elevationMode];
		const carriagewayHalf = (style.laneCount * style.laneWidth + style.medianWidth + style.shoulderWidth * 2) / 2;
		const add = (kind: RoadsideDecoration["kind"], side: "left" | "right", station: number, extraOffset: number, ruleId: string) => {
			const sideSign = side === "left" ? 1 : -1;
			const id = `roadside:${ruleId}:${edge.id}:${side}:${station.toFixed(2)}`;
			decorations[id] = {
				edgeId: edge.id,
				id,
				kind,
				lateralOffset: sideSign * (carriagewayHalf + sideWidth(style, side) + extraOffset),
				ruleId,
				side,
				station,
			};
		};

		if (node.roadsideDecorationRules.lamps && edge.roadClass !== "alley") {
			for (const station of stations(length, 30 * densityFactor, 6)) {
				add("lamp", "right", station, 0.7, "regular-lighting");
			}
		}
		if (node.roadsideDecorationRules.trees && elevationModes.every((mode) => mode === "ground")) {
			for (const side of ["left", "right"] as const) {
				const vergeWidth = style[side === "left" ? "leftSide" : "rightSide"]?.vergeWidth ?? 0;
				if (vergeWidth < 0.4) continue;
				for (const station of stations(length, 18 * densityFactor, 8)) add("tree", side, station, 1.4, "verge-trees");
			}
		}
		if (node.roadsideDecorationRules.signs && length > 8) {
			add("sign", node.regionalPack === "left-driving" ? "left" : "right", Math.max(2, length - 4), 0.5, "terminal-signage");
		}
		if (node.roadsideDecorationRules.guardrails && (elevationModes.includes("bridge") || edge.roadClass === "highway")) {
			for (const side of ["left", "right"] as const) {
				for (const station of stations(length, 6 * densityFactor, 2)) add("guardrail", side, station, 0.15, "edge-protection");
			}
		}
	}
	return decorations;
}

export type RoadsideDecorationPreview = RoadsideDecoration & {
	position: [number, number, number];
};

export function buildRoadsideDecorationPreviews(node: RoadNetworkNode): RoadsideDecorationPreview[] {
	return Object.values(node.roadsideDecorations ?? {}).flatMap((decoration) => {
		const edge = node.edges[decoration.edgeId];
		if (!edge) return [];
		const points = sampleRoadEdgePoints(node, edge, 40) as Array<[number, number, number]>;
		let remaining = decoration.station;
		for (let index = 0; index < points.length - 1; index += 1) {
			const start = points[index]!;
			const end = points[index + 1]!;
			const length = Math.hypot(end[0] - start[0], end[1] - start[1], end[2] - start[2]);
			if (remaining > length && index < points.length - 2) {
				remaining -= length;
				continue;
			}
			const ratio = Math.min(1, remaining / Math.max(length, 1e-6));
			const dx = end[0] - start[0];
			const dz = end[2] - start[2];
			const horizontal = Math.max(Math.hypot(dx, dz), 1e-6);
			return [{
				...decoration,
				position: [
					start[0] + dx * ratio - dz / horizontal * decoration.lateralOffset,
					start[1] + (end[1] - start[1]) * ratio + 0.15,
					start[2] + dz * ratio + dx / horizontal * decoration.lateralOffset,
				],
			}];
		}
		return [];
	});
}

export function RoadsideDecorationInspector({
	node,
	onUpdate,
}: {
	node: RoadNetworkNode;
	onUpdate: (patch: Partial<RoadNetworkNode>) => void;
}) {
	const decorations = Object.values(node.roadsideDecorations ?? {});
	const counts = Object.fromEntries(["lamp", "tree", "sign", "guardrail"].map((kind) => [kind, decorations.filter((item) => item.kind === kind).length]));
	return (
		<div aria-label="Semantic roadside decoration rules" style={{ display: "grid", gap: 7 }}>
			<p style={{ color: "#e2e8f0", fontSize: 12, margin: 0 }}>{decorations.length} generated roadside elements</p>
			<label style={{ display: "grid", fontSize: 11, gap: 4 }}>
				<span>Density</span>
				<select aria-label="Roadside decoration density" onChange={(event) => onUpdate({ roadsideDecorationDensity: event.currentTarget.value as RoadNetworkNode["roadsideDecorationDensity"] })} value={node.roadsideDecorationDensity}>
					<option value="sparse">Sparse</option><option value="standard">Standard</option><option value="dense">Dense</option>
				</select>
			</label>
			{(["lamps", "trees", "signs", "guardrails"] as const).map((rule) => (
				<label key={rule} style={{ alignItems: "center", display: "flex", fontSize: 11, gap: 7 }}>
					<input
						aria-label={`Generate roadside ${rule}`}
						checked={node.roadsideDecorationRules[rule]}
						onChange={(event) => onUpdate({ roadsideDecorationRules: { ...node.roadsideDecorationRules, [rule]: event.currentTarget.checked } })}
						type="checkbox"
					/>
					<span>{rule} ({counts[rule === "lamps" ? "lamp" : rule === "trees" ? "tree" : rule === "signs" ? "sign" : "guardrail"] ?? 0})</span>
				</label>
			))}
			<label style={{ alignItems: "center", display: "flex", fontSize: 11, gap: 7 }}>
				<input aria-label="Show roadside decoration preview" checked={node.showRoadsideDecorations} onChange={(event) => onUpdate({ showRoadsideDecorations: event.currentTarget.checked })} type="checkbox" />
				<span>Show generated preview</span>
			</label>
		</div>
	);
}
