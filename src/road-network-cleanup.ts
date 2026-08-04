import type { RoadGraphEdge, RoadGraphNode } from "./schema";
import {
	addRoadGraphNode,
	incidentRoadEdges,
	projectRoadPointToEdge,
	reconcileRoadJunctions,
	roadEdgeCrossings,
	splitRoadEdgeAtNode,
	type RoadNetworkGraph,
} from "./road-network-topology";
import {
	DEFAULT_ROAD_STYLE_ID,
	DEFAULT_ROAD_STYLE_PRESETS,
} from "./road-style-presets";
import {
	validateRoadGraph,
	type RoadValidationIssue,
} from "./road-network-validation";

export type RoadCleanupChangeKind =
	| "merge-nodes"
	| "snap-node-to-edge"
	| "split-crossing"
	| "remove-edge"
	| "remove-node"
	| "repair-style"
	| "rebuild-junction";

export type RoadCleanupChange = {
	detail: string;
	edgeIds: string[];
	id: string;
	kind: RoadCleanupChangeKind;
	nodeIds: string[];
	title: string;
};

export type RoadCleanupOptions = {
	horizontalTolerance?: number;
	maxChanges?: number;
	minEdgeLength?: number;
	verticalTolerance?: number;
};

export type RoadCleanupPlan = {
	afterIssues: RoadValidationIssue[];
	beforeIssues: RoadValidationIssue[];
	changes: RoadCleanupChange[];
	options: Required<RoadCleanupOptions>;
	resultGraph: RoadNetworkGraph;
};

const DEFAULT_OPTIONS: Required<RoadCleanupOptions> = {
	horizontalTolerance: 0.5,
	verticalTolerance: 0.25,
	minEdgeLength: 0.05,
	maxChanges: 500,
};

const INTERIOR_EPSILON = 1e-4;

function cloneRoadGraph(graph: RoadNetworkGraph): RoadNetworkGraph {
	return {
		graphNodes: Object.fromEntries(
			Object.entries(graph.graphNodes).map(([id, node]) => [
				id,
				{ ...node, position: [...node.position] },
			]),
		),
		edges: Object.fromEntries(
			Object.entries(graph.edges).map(([id, edge]) => [
				id,
				{
					...edge,
					alignment: edge.alignment.map((point) => [...point]),
					verticalProfile: (edge.verticalProfile ?? []).map((point) => ({
						...point,
					})),
				},
			]),
		),
		attachments: Object.fromEntries(
			Object.entries(graph.attachments ?? {}).map(([id, attachment]) => [
				id,
				{ ...attachment },
			]),
		),
		junctions: Object.fromEntries(
			Object.entries(graph.junctions ?? {}).map(([id, junction]) => [
				id,
				{
					...junction,
					primaryEdgeIds: [...junction.primaryEdgeIds],
					cornerRadii: { ...junction.cornerRadii },
				},
			]),
		),
		stylePresets: Object.fromEntries(
			Object.entries(graph.stylePresets).map(([id, style]) => [id, { ...style }]),
		),
		activeStyleId: graph.activeStyleId,
	};
}

function distanceXZ(a: RoadGraphNode["position"], b: RoadGraphNode["position"]): number {
	return Math.hypot(a[0] - b[0], a[2] - b[2]);
}

function sortedIds(record: Record<string, unknown>): string[] {
	return Object.keys(record).sort((a, b) => a.localeCompare(b));
}

function edgeLength(graph: RoadNetworkGraph, edge: RoadGraphEdge): number {
	const start = graph.graphNodes[edge.startNodeId];
	const end = graph.graphNodes[edge.endNodeId];
	return start && end ? distanceXZ(start.position, end.position) : 0;
}

function edgeConnectionKey(edge: RoadGraphEdge): string {
	return `${edge.stackLevel}|${edge.overlapGroup ?? ""}`;
}

function nodeConnectionKey(
	graph: RoadNetworkGraph,
	nodeId: string,
): string | null {
	const incident = incidentRoadEdges(graph, nodeId);
	if (incident.length === 0 || incident.some((edge) => edge.joinMode === "suppress")) {
		return null;
	}
	const keys = new Set(incident.map(edgeConnectionKey));
	return keys.size === 1 ? [...keys][0]! : null;
}

function edgeElevationKey(
	graph: RoadNetworkGraph,
	edge: RoadGraphEdge,
): string | null {
	const start = graph.graphNodes[edge.startNodeId];
	const end = graph.graphNodes[edge.endNodeId];
	if (
		!start ||
		!end ||
		start.level !== end.level ||
		start.elevationMode !== end.elevationMode
	) {
		return null;
	}
	return `${start.level}|${start.elevationMode}|${edgeConnectionKey(edge)}`;
}

function stableJunction(junction: RoadNetworkGraph["junctions"][string] | undefined): string {
	if (!junction) return "";
	return JSON.stringify({
		...junction,
		primaryEdgeIds: [...junction.primaryEdgeIds].sort(),
		cornerRadii: Object.fromEntries(
			Object.entries(junction.cornerRadii).sort(([a], [b]) => a.localeCompare(b)),
		),
	});
}

/**
 * Build a deterministic, non-destructive cleanup proposal. The caller must
 * explicitly apply resultGraph; inspecting a plan never mutates the source.
 */
export function planRoadGraphCleanup(
	source: RoadNetworkGraph,
	requested: RoadCleanupOptions = {},
): RoadCleanupPlan {
	const options = { ...DEFAULT_OPTIONS, ...requested };
	const graph = cloneRoadGraph(source);
	const beforeIssues = validateRoadGraph(graph);
	const changes: RoadCleanupChange[] = [];
	let serial = 0;
	const canChange = () => changes.length < options.maxChanges;
	const addChange = (
		kind: RoadCleanupChangeKind,
		title: string,
		detail: string,
		nodeIds: string[] = [],
		edgeIds: string[] = [],
	) => {
		changes.push({
			id: `road-cleanup-change-${++serial}`,
			kind,
			title,
			detail,
			nodeIds: [...nodeIds].sort(),
			edgeIds: [...edgeIds].sort(),
		});
	};

	const removeEdge = (edgeId: string, reason: string) => {
		const edge = graph.edges[edgeId];
		if (!edge || !canChange()) return false;
		const removedAttachments = sortedIds(graph.attachments).filter(
			(id) => graph.attachments[id]?.edgeId === edgeId,
		);
		for (const attachmentId of removedAttachments) {
			delete graph.attachments[attachmentId];
		}
		delete graph.edges[edgeId];
		addChange(
			"remove-edge",
			`Remove edge ${edgeId}`,
			`${reason}${removedAttachments.length ? ` Also removes ${removedAttachments.length} attached asset reference${removedAttachments.length === 1 ? "" : "s"}.` : ""}`,
			[edge.startNodeId, edge.endNodeId],
			[edgeId],
		);
		return true;
	};

	const removeInvalidEdges = () => {
		for (const edgeId of sortedIds(graph.edges)) {
			if (!canChange()) return;
			const edge = graph.edges[edgeId]!;
			const start = graph.graphNodes[edge.startNodeId];
			const end = graph.graphNodes[edge.endNodeId];
			if (!start || !end) {
				removeEdge(edgeId, "One or both endpoint nodes are missing.");
			} else if (edge.startNodeId === edge.endNodeId) {
				removeEdge(edgeId, "The edge loops back to the same node.");
			} else if (edgeLength(graph, edge) < options.minEdgeLength) {
				removeEdge(
					edgeId,
					`Its plan length is below ${options.minEdgeLength.toFixed(2)} m.`,
				);
			}
		}
		const seen = new Map<string, string>();
		for (const edgeId of sortedIds(graph.edges)) {
			if (!canChange()) return;
			const edge = graph.edges[edgeId]!;
			const pair = [edge.startNodeId, edge.endNodeId].sort().join("|");
			const keeper = seen.get(pair);
			if (keeper) {
				removeEdge(edgeId, `It duplicates edge ${keeper}.`);
			} else {
				seen.set(pair, edgeId);
			}
		}
	};

	removeInvalidEdges();

	if (Object.keys(graph.stylePresets).length === 0 && canChange()) {
		graph.stylePresets = Object.fromEntries(
			Object.entries(DEFAULT_ROAD_STYLE_PRESETS).map(([id, style]) => [
				id,
				{ ...style },
			]),
		);
		graph.activeStyleId = DEFAULT_ROAD_STYLE_ID;
		addChange(
			"repair-style",
			"Restore default road styles",
			"The graph had no usable style presets, so the built-in road styles will be restored.",
		);
	}
	const fallbackStyleId = graph.stylePresets[graph.activeStyleId]
		? graph.activeStyleId
		: graph.stylePresets[DEFAULT_ROAD_STYLE_ID]
			? DEFAULT_ROAD_STYLE_ID
			: (sortedIds(graph.stylePresets)[0] ?? DEFAULT_ROAD_STYLE_ID);
	if (graph.activeStyleId !== fallbackStyleId && canChange()) {
		const previous = graph.activeStyleId;
		graph.activeStyleId = fallbackStyleId;
		addChange(
			"repair-style",
			"Repair active road style",
			`Replace missing active style ${previous} with ${fallbackStyleId}.`,
		);
	}
	for (const edgeId of sortedIds(graph.edges)) {
		if (!canChange()) break;
		const edge = graph.edges[edgeId]!;
		if (graph.stylePresets[edge.styleId]) continue;
		const previous = edge.styleId;
		graph.edges[edgeId] = { ...edge, styleId: fallbackStyleId };
		addChange(
			"repair-style",
			`Repair style on ${edgeId}`,
			`Replace missing style ${previous} with ${fallbackStyleId}.`,
			[],
			[edgeId],
		);
	}

	const mergeNearbyNodes = () => {
		let merged = true;
		while (merged && canChange()) {
			merged = false;
			const nodeIds = sortedIds(graph.graphNodes);
			for (
				let firstIndex = 0;
				firstIndex < nodeIds.length && !merged;
				firstIndex++
			) {
				const firstId = nodeIds[firstIndex]!;
				const first = graph.graphNodes[firstId];
				if (!first) continue;
				const firstKey = nodeConnectionKey(graph, firstId);
				if (!firstKey) continue;
				for (
					let secondIndex = firstIndex + 1;
					secondIndex < nodeIds.length;
					secondIndex++
				) {
					const secondId = nodeIds[secondIndex]!;
					const second = graph.graphNodes[secondId];
					if (
						!second ||
						first.level !== second.level ||
						first.elevationMode !== second.elevationMode ||
						Math.abs(first.position[1] - second.position[1]) >
							options.verticalTolerance ||
						distanceXZ(first.position, second.position) >
							options.horizontalTolerance ||
						nodeConnectionKey(graph, secondId) !== firstKey
					) {
						continue;
					}
					const firstDegree = incidentRoadEdges(graph, firstId).length;
					const secondDegree = incidentRoadEdges(graph, secondId).length;
					const keeperId = secondDegree > firstDegree ? secondId : firstId;
					const removedId = keeperId === firstId ? secondId : firstId;
					const keeper = graph.graphNodes[keeperId]!;
					const removed = graph.graphNodes[removedId]!;
					for (const edge of Object.values(graph.edges)) {
						if (edge.startNodeId === removedId) edge.startNodeId = keeperId;
						if (edge.endNodeId === removedId) edge.endNodeId = keeperId;
					}
					if (!graph.junctions[keeperId] && graph.junctions[removedId]) {
						graph.junctions[keeperId] = {
							...graph.junctions[removedId]!,
							nodeId: keeperId,
						};
					}
					delete graph.junctions[removedId];
					delete graph.graphNodes[removedId];
					addChange(
						"merge-nodes",
						`Merge node ${removedId} into ${keeperId}`,
						`The nodes are ${distanceXZ(keeper.position, removed.position).toFixed(2)} m apart at a compatible level. Incident edges and junction state will use ${keeperId}.`,
						[keeperId, removedId],
					);
					removeInvalidEdges();
					merged = true;
					break;
				}
			}
		}
	};

	const snapDanglingNodes = () => {
		let snapped = true;
		while (snapped && canChange()) {
			snapped = false;
			for (const nodeId of sortedIds(graph.graphNodes)) {
				const node = graph.graphNodes[nodeId];
				const incident = node ? incidentRoadEdges(graph, nodeId) : [];
				if (
					!node ||
					incident.length !== 1 ||
					incident[0]!.joinMode !== "auto"
				) continue;
				const sourceEdge = incident[0]!;
				const sourceKey = edgeElevationKey(graph, sourceEdge);
				if (!sourceKey) continue;
				let best: {
					distance: number;
					edgeId: string;
					point: [number, number, number];
					t: number;
				} | null = null;
				for (const edgeId of sortedIds(graph.edges)) {
					const target = graph.edges[edgeId]!;
					if (
						target.id === sourceEdge.id ||
						target.startNodeId === nodeId ||
						target.endNodeId === nodeId ||
						target.joinMode !== "auto" ||
						edgeElevationKey(graph, target) !== sourceKey
					) continue;
					const projection = projectRoadPointToEdge(
						graph,
						edgeId,
						node.position,
					);
					if (
						!projection ||
						projection.t <= INTERIOR_EPSILON ||
						projection.t >= 1 - INTERIOR_EPSILON ||
						projection.distance > options.horizontalTolerance ||
						Math.abs(projection.point[1] - node.position[1]) >
							options.verticalTolerance
					) continue;
					if (
						!best ||
						projection.distance < best.distance ||
						(Math.abs(projection.distance - best.distance) < 1e-9 &&
							edgeId.localeCompare(best.edgeId) < 0)
					) {
						best = { edgeId, ...projection };
					}
				}
				if (!best) continue;
				const before = [...node.position] as [number, number, number];
				graph.graphNodes[nodeId] = {
					...node,
					position: [...best.point],
					terminal: false,
				};
				const splitEdgeId = splitRoadEdgeAtNode(
					graph,
					best.edgeId,
					nodeId,
					best.t,
				);
				if (!splitEdgeId) {
					graph.graphNodes[nodeId] = { ...node, position: before };
					continue;
				}
				addChange(
					"snap-node-to-edge",
					`Snap ${nodeId} to ${best.edgeId}`,
					`Move the dangling endpoint ${best.distance.toFixed(2)} m to the compatible road centerline and split that edge at the new T-junction.`,
					[nodeId],
					[best.edgeId, splitEdgeId, sourceEdge.id],
				);
				snapped = true;
				break;
			}
		}
	};

	const splitSameLevelCrossings = () => {
		let splitCrossing = true;
		while (splitCrossing && canChange()) {
			splitCrossing = false;
			const edgeIds = sortedIds(graph.edges);
			for (
				let firstIndex = 0;
				firstIndex < edgeIds.length && !splitCrossing;
				firstIndex++
			) {
				const first = graph.edges[edgeIds[firstIndex]!];
				if (!first || first.joinMode !== "auto") continue;
				const firstKey = edgeElevationKey(graph, first);
				if (!firstKey) continue;
				for (
					let secondIndex = firstIndex + 1;
					secondIndex < edgeIds.length;
					secondIndex++
				) {
					const second = graph.edges[edgeIds[secondIndex]!];
					if (
						!second ||
						second.joinMode !== "auto" ||
						edgeElevationKey(graph, second) !== firstKey ||
						[first.startNodeId, first.endNodeId].some(
							(nodeId) =>
								nodeId === second.startNodeId || nodeId === second.endNodeId,
						)
					) continue;
					const crossing = roadEdgeCrossings(graph, first.id, second.id).find(
						(candidate) =>
							candidate.verticalDistance <= options.verticalTolerance,
					);
					if (!crossing) continue;
					const firstStart = graph.graphNodes[first.startNodeId]!;
					const crossingNodeId = addRoadGraphNode(
						graph,
						crossing.point,
						firstStart,
					);
					const firstSplitId = splitRoadEdgeAtNode(
						graph,
						first.id,
						crossingNodeId,
						crossing.firstT,
					);
					const secondSplitId = splitRoadEdgeAtNode(
						graph,
						second.id,
						crossingNodeId,
						crossing.secondT,
					);
					if (!firstSplitId || !secondSplitId) {
						delete graph.graphNodes[crossingNodeId];
						continue;
					}
					addChange(
						"split-crossing",
						`Create crossing at ${crossingNodeId}`,
						`Split ${first.id} and ${second.id} at their same-level centerline crossing and connect all four approaches.`,
						[crossingNodeId],
						[first.id, firstSplitId, second.id, secondSplitId],
					);
					splitCrossing = true;
					break;
				}
			}
		}
	};

	let topologyChanged = true;
	while (topologyChanged && canChange()) {
		const changeCountBeforeCycle = changes.length;
		mergeNearbyNodes();
		snapDanglingNodes();
		splitSameLevelCrossings();
		removeInvalidEdges();
		topologyChanged = changes.length > changeCountBeforeCycle;
	}

	removeInvalidEdges();
	for (const nodeId of sortedIds(graph.graphNodes)) {
		if (!canChange()) break;
		if (incidentRoadEdges(graph, nodeId).length > 0) continue;
		const hadJunction = Boolean(graph.junctions[nodeId]);
		delete graph.graphNodes[nodeId];
		delete graph.junctions[nodeId];
		addChange(
			"remove-node",
			`Remove isolated node ${nodeId}`,
			`No road edge references this node${hadJunction ? "; its stale junction record is removed too" : ""}.`,
			[nodeId],
		);
	}

	const junctionsBefore = Object.fromEntries(
		Object.entries(graph.junctions).map(([id, junction]) => [id, stableJunction(junction)]),
	);
	reconcileRoadJunctions(graph);
	const junctionIds = [...new Set([
		...Object.keys(junctionsBefore),
		...Object.keys(graph.junctions),
	])].sort();
	for (const nodeId of junctionIds) {
		if (!canChange()) break;
		if (junctionsBefore[nodeId] === stableJunction(graph.junctions[nodeId])) continue;
		addChange(
			"rebuild-junction",
			`Rebuild junction ${nodeId}`,
			graph.junctions[nodeId]
				? "Regenerate editable junction classification, primary-road candidates, and curb corners from the cleaned topology."
				: "Remove the obsolete junction record because this node is no longer a multi-approach junction.",
			[nodeId],
			incidentRoadEdges(graph, nodeId).map((edge) => edge.id),
		);
	}

	return {
		beforeIssues,
		afterIssues: validateRoadGraph(graph),
		changes,
		options,
		resultGraph: graph,
	};
}
