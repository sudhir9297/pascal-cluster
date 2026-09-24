import { moveRoadGraphNode } from "./road-network-graph-editing";
import { roadPlanLength } from "./road-network-vertical-profile";
import type { RoadNetworkNode } from "./schema";

function syncLinkedProfileElevations(
	edge: RoadNetworkNode["edges"][string],
	alignment: Array<[number, number, number]>,
) {
	if (edge.profileMode !== "designed") return edge.verticalProfile ?? [];
	return (edge.verticalProfile ?? []).map((profilePoint) => {
		const index = profilePoint.alignmentPointIndex;
		return index === undefined || !alignment[index]
			? profilePoint
			: { ...profilePoint, elevation: alignment[index][1] };
	});
}

/** Move one authored spline point in 3D while preserving the edge and graph topology. */
export function moveRoadSplinePoint(
	node: RoadNetworkNode,
	edgeId: string,
	pointIndex: number,
	point: readonly [number, number, number],
): Pick<RoadNetworkNode, "edges"> | null {
	const edge = node.edges[edgeId];
	const originalPoint = edge?.alignment[pointIndex];
	if (!edge || !originalPoint) return null;

	const alignment = edge.alignment.map((candidate, index) =>
		index === pointIndex
			? ([point[0], point[1], point[2]] as [number, number, number])
			: candidate,
	);
	return {
		edges: {
			...node.edges,
			[edgeId]: {
				...edge,
				alignment,
				verticalProfile: syncLinkedProfileElevations(edge, alignment),
			},
		},
	};
}

/** Move a shared spline endpoint so every incident edge follows the same graph node. */
export function moveRoadSplineEndpoint(
	node: RoadNetworkNode,
	graphNodeId: string,
	point: readonly [number, number, number],
): Pick<RoadNetworkNode, "graphNodes" | "junctions"> | null {
	return moveRoadGraphNode(node, graphNodeId, point)?.patch ?? null;
}

function selectedAlignmentIndices(
	node: RoadNetworkNode,
	edgeId: string,
	pointIndices: readonly number[],
): number[] {
	const edge = node.edges[edgeId];
	if (!edge) return [];
	return Array.from(new Set(pointIndices))
		.filter(
			(index) =>
				Number.isInteger(index) && index >= 0 && index < edge.alignment.length,
		)
		.sort((left, right) => left - right);
}

/** Translate several authored points together while retaining their relative shape. */
export function moveRoadSplinePoints(
	node: RoadNetworkNode,
	edgeId: string,
	pointIndices: readonly number[],
	delta: readonly [number, number, number],
): Pick<RoadNetworkNode, "edges"> | null {
	const edge = node.edges[edgeId];
	const indices = selectedAlignmentIndices(node, edgeId, pointIndices);
	if (!edge || indices.length === 0) return null;
	const selected = new Set(indices);
	const alignment = edge.alignment.map((point, index) =>
		selected.has(index)
			? ([point[0] + delta[0], point[1] + delta[1], point[2] + delta[2]] as [
					number,
					number,
					number,
				])
			: point,
	);
	return {
		edges: {
			...node.edges,
			[edgeId]: {
				...edge,
				alignment,
				verticalProfile: syncLinkedProfileElevations(edge, alignment),
			},
		},
	};
}

/** Insert one authored point at an alignment-array boundary. */
export function insertRoadSplinePoint(
	node: RoadNetworkNode,
	edgeId: string,
	insertionIndex: number,
	point: readonly [number, number, number],
): Pick<RoadNetworkNode, "edges"> | null {
	const edge = node.edges[edgeId];
	if (!edge || !Number.isInteger(insertionIndex)) return null;
	const index = Math.min(Math.max(insertionIndex, 0), edge.alignment.length);
	const alignment = edge.alignment.map(
		(candidate) => [...candidate] as [number, number, number],
	);
	alignment.splice(index, 0, [point[0], point[1], point[2]]);
	let verticalProfile = (edge.verticalProfile ?? []).map((profilePoint) => ({
		...profilePoint,
		alignmentPointIndex:
			profilePoint.alignmentPointIndex === undefined
				? undefined
				: profilePoint.alignmentPointIndex >= index
					? profilePoint.alignmentPointIndex + 1
					: profilePoint.alignmentPointIndex,
	}));
	if (edge.profileMode === "designed") {
		const temporaryEdge = { ...edge, alignment, verticalProfile };
		const length = roadPlanLength(node, temporaryEdge);
		let suffix = verticalProfile.length + 1;
		const existingIds = new Set(
			verticalProfile.map((profilePoint) => profilePoint.id),
		);
		let id = `profile-${edge.id}-${suffix}`;
		while (existingIds.has(id)) id = `profile-${edge.id}-${++suffix}`;
		verticalProfile = [
			...verticalProfile,
			{
				id,
				station: (length * (index + 1)) / (alignment.length + 1),
				elevation: point[1],
				curveLength: 0,
				alignmentPointIndex: index,
			},
		].sort((left, right) => left.station - right.station);
	}
	return {
		edges: {
			...node.edges,
			[edgeId]: { ...edge, alignment, verticalProfile },
		},
	};
}

/** Delete selected authored points without touching graph endpoints. */
export function deleteRoadSplinePoints(
	node: RoadNetworkNode,
	edgeId: string,
	pointIndices: readonly number[],
): Pick<RoadNetworkNode, "edges"> | null {
	const edge = node.edges[edgeId];
	const indices = selectedAlignmentIndices(node, edgeId, pointIndices);
	if (!edge || indices.length === 0) return null;
	const selected = new Set(indices);
	const alignment = edge.alignment.filter((_, index) => !selected.has(index));
	const verticalProfile = (edge.verticalProfile ?? []).flatMap(
		(profilePoint) => {
			const linkedIndex = profilePoint.alignmentPointIndex;
			if (linkedIndex === undefined) return [profilePoint];
			if (selected.has(linkedIndex)) return [];
			const removedBefore = indices.filter(
				(index) => index < linkedIndex,
			).length;
			return [
				{
					...profilePoint,
					alignmentPointIndex: linkedIndex - removedBefore,
				},
			];
		},
	);
	return {
		edges: {
			...node.edges,
			[edgeId]: {
				...edge,
				alignment,
				verticalProfile,
			},
		},
	};
}

/** Flatten selected authored points onto one elevation datum. */
export function flattenRoadSplinePoints(
	node: RoadNetworkNode,
	edgeId: string,
	pointIndices: readonly number[],
	elevation: number,
): Pick<RoadNetworkNode, "edges"> | null {
	const edge = node.edges[edgeId];
	const indices = selectedAlignmentIndices(node, edgeId, pointIndices);
	if (!edge || indices.length === 0 || !Number.isFinite(elevation)) return null;
	const selected = new Set(indices);
	const alignment = edge.alignment.map((point, index) =>
		selected.has(index)
			? ([point[0], elevation, point[2]] as [number, number, number])
			: point,
	);
	return {
		edges: {
			...node.edges,
			[edgeId]: {
				...edge,
				alignment,
				verticalProfile: syncLinkedProfileElevations(edge, alignment),
			},
		},
	};
}

/** Set a constant grade through the selected span using its surrounding anchors. */
export function gradeRoadSplinePoints(
	node: RoadNetworkNode,
	edgeId: string,
	pointIndices: readonly number[],
): Pick<RoadNetworkNode, "edges"> | null {
	const edge = node.edges[edgeId];
	const indices = selectedAlignmentIndices(node, edgeId, pointIndices);
	const start = edge ? node.graphNodes[edge.startNodeId] : undefined;
	const end = edge ? node.graphNodes[edge.endNodeId] : undefined;
	if (!edge || !start || !end || indices.length === 0) return null;

	const points = [start.position, ...edge.alignment, end.position];
	const firstPointIndex = indices[0]! + 1;
	const lastPointIndex = indices.at(-1)! + 1;
	const anchorStartIndex = firstPointIndex - 1;
	const anchorEndIndex = lastPointIndex + 1;
	const cumulative = [0];
	for (let index = anchorStartIndex + 1; index <= anchorEndIndex; index++) {
		const previous = points[index - 1]!;
		const point = points[index]!;
		cumulative.push(
			cumulative.at(-1)! +
				Math.hypot(point[0] - previous[0], point[2] - previous[2]),
		);
	}
	const total = cumulative.at(-1)!;
	if (total <= 1e-6) return null;
	const fromElevation = points[anchorStartIndex]![1];
	const toElevation = points[anchorEndIndex]![1];
	const selected = new Set(indices);
	const alignment = edge.alignment.map((point, index) => {
		if (!selected.has(index)) return point;
		const distance = cumulative[index + 1 - anchorStartIndex]!;
		const elevation =
			fromElevation + (toElevation - fromElevation) * (distance / total);
		return [point[0], elevation, point[2]] as [number, number, number];
	});
	return {
		edges: {
			...node.edges,
			[edgeId]: {
				...edge,
				alignment,
				verticalProfile: syncLinkedProfileElevations(edge, alignment),
			},
		},
	};
}
