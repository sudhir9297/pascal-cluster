"use client";

import { sampleRoadEdgePoints } from "./road-network-geometry";
import type { RoadLane, RoadNetworkNode, RoadTrafficRoute } from "./schema";

function nodeDegrees(node: RoadNetworkNode): Map<string, number> {
	const result = new Map<string, number>();
	for (const edge of Object.values(node.edges)) {
		result.set(edge.startNodeId, (result.get(edge.startNodeId) ?? 0) + 1);
		result.set(edge.endNodeId, (result.get(edge.endNodeId) ?? 0) + 1);
	}
	return result;
}

function laneLength(node: RoadNetworkNode, lane: RoadLane): number {
	const edge = node.edges[lane.edgeId];
	if (!edge) return 0;
	const points = sampleRoadEdgePoints(node, edge, 32);
	return points.slice(1).reduce((length, point, index) => {
		const previous = points[index]!;
		return length + Math.hypot(point[0] - previous[0], point[1] - previous[1], point[2] - previous[2]);
	}, 0);
}

function movementDelay(node: RoadNetworkNode, movementId: string): number {
	const movement = node.laneMovements[movementId];
	if (!movement) return 0;
	const signalPlan = node.signalPlans[movement.junctionNodeId];
	if (signalPlan) {
		const cycle = signalPlan.phases.reduce((total, phase) => total + phase.durationSeconds + phase.clearanceSeconds, 0);
		const phase = signalPlan.phases.find((candidate) => candidate.movementIds.includes(movementId));
		return phase ? Math.max(0, cycle - phase.durationSeconds) / 2 : cycle / 2;
	}
	const junction = node.junctions[movement.junctionNodeId];
	const fromLane = node.lanes[movement.fromLaneId];
	const control = fromLane ? junction?.approachControls?.[fromLane.edgeId] : undefined;
	if (control === "stop" || junction?.treatment === "stop") return 3;
	if (control === "yield" || junction?.treatment === "yield") return 1.5;
	return 0;
}

/** Find the shortest permitted sequence of directed lanes between two terminal lanes. */
export function findRoadLaneRoute(
	node: RoadNetworkNode,
	startLaneId: string,
	endLaneId: string,
): { laneIds: string[]; movementIds: string[] } | null {
	if (!node.lanes[startLaneId] || !node.lanes[endLaneId]) return null;
	const adjacency = new Map<string, Array<{ laneId: string; movementId: string }>>();
	for (const movement of Object.values(node.laneMovements).filter((candidate) => candidate.enabled)) {
		adjacency.set(movement.fromLaneId, [
			...(adjacency.get(movement.fromLaneId) ?? []),
			{ laneId: movement.toLaneId, movementId: movement.id },
		]);
	}
	const pending: Array<{ laneIds: string[]; movementIds: string[] }> = [{ laneIds: [startLaneId], movementIds: [] }];
	const visited = new Set([startLaneId]);
	while (pending.length > 0) {
		const route = pending.shift()!;
		const current = route.laneIds.at(-1)!;
		if (current === endLaneId) return route;
		for (const next of adjacency.get(current) ?? []) {
			if (visited.has(next.laneId)) continue;
			visited.add(next.laneId);
			pending.push({
				laneIds: [...route.laneIds, next.laneId],
				movementIds: [...route.movementIds, next.movementId],
			});
		}
	}
	return null;
}

/** Build all reachable terminal-to-terminal lane routes with control-delay estimates. */
export function buildRoadTrafficRoutes(node: RoadNetworkNode): RoadNetworkNode["trafficRoutes"] {
	const degrees = nodeDegrees(node);
	const origins = Object.values(node.lanes)
		.filter((lane) => degrees.get(lane.startNodeId) === 1)
		.sort((first, second) => first.id.localeCompare(second.id));
	const destinations = Object.values(node.lanes)
		.filter((lane) => degrees.get(lane.endNodeId) === 1)
		.sort((first, second) => first.id.localeCompare(second.id));
	const routes: RoadNetworkNode["trafficRoutes"] = {};
	for (const origin of origins) {
		for (const destination of destinations) {
			if (origin.edgeId === destination.edgeId) continue;
			const path = findRoadLaneRoute(node, origin.id, destination.id);
			if (!path) continue;
			const lengthMeters = path.laneIds.reduce((sum, laneId) => sum + laneLength(node, node.lanes[laneId]!), 0);
			const delay = path.movementIds.reduce((sum, movementId) => sum + movementDelay(node, movementId), 0);
			const id = `traffic-route:${origin.id}>${destination.id}`;
			routes[id] = {
				endLaneId: destination.id,
				id,
				laneIds: path.laneIds,
				lengthMeters,
				movementIds: path.movementIds,
				startLaneId: origin.id,
				travelTimeSeconds: lengthMeters / node.trafficFreeFlowSpeed + delay,
			};
		}
	}
	return routes;
}

function lanePoints(node: RoadNetworkNode, lane: RoadLane): Array<[number, number, number]> {
	const edge = node.edges[lane.edgeId];
	if (!edge) return [];
	const authored = sampleRoadEdgePoints(node, edge, 32) as Array<[number, number, number]>;
	const directed = lane.direction === "forward" ? authored : [...authored].reverse();
	return directed.map((point, index) => {
		const previous = directed[Math.max(0, index - 1)]!;
		const next = directed[Math.min(directed.length - 1, index + 1)]!;
		const dx = next[0] - previous[0];
		const dz = next[2] - previous[2];
		const length = Math.max(Math.hypot(dx, dz), 1e-6);
		const authoredSign = lane.direction === "forward" ? 1 : -1;
		return [
			point[0] - dz / length * lane.lateralOffset * authoredSign,
			point[1] + 0.32,
			point[2] + dx / length * lane.lateralOffset * authoredSign,
		];
	});
}

export function buildRoadTrafficRouteGuide(node: RoadNetworkNode, route: RoadTrafficRoute): Array<[number, number, number]> {
	return route.laneIds.flatMap((laneId, index) => {
		const points = node.lanes[laneId] ? lanePoints(node, node.lanes[laneId]!) : [];
		return index === 0 ? points : points.slice(1);
	});
}

export type RoadTrafficVehicleSample = { id: string; position: [number, number, number] };

export function buildRoadTrafficVehicleSamples(
	node: RoadNetworkNode,
	route: RoadTrafficRoute,
): RoadTrafficVehicleSample[] {
	const points = buildRoadTrafficRouteGuide(node, route);
	if (points.length < 2 || route.lengthMeters <= 0) return [];
	const spacing = Math.max(8, node.trafficFreeFlowSpeed * 3600 / node.trafficDemandPerHour);
	const count = Math.max(1, Math.min(24, Math.ceil(route.lengthMeters / spacing)));
	const segments = points.slice(1).map((point, index) => Math.hypot(
		point[0] - points[index]![0],
		point[1] - points[index]![1],
		point[2] - points[index]![2],
	));
	const sampledLength = segments.reduce((sum, length) => sum + length, 0);
	return Array.from({ length: count }, (_, vehicleIndex) => {
		let target = (node.trafficPreviewTimeSeconds * node.trafficFreeFlowSpeed - vehicleIndex * spacing) % sampledLength;
		if (target < 0) target += sampledLength;
		let segmentIndex = 0;
		while (segmentIndex < segments.length - 1 && target > segments[segmentIndex]!) {
			target -= segments[segmentIndex]!;
			segmentIndex += 1;
		}
		const start = points[segmentIndex]!;
		const end = points[segmentIndex + 1]!;
		const ratio = target / Math.max(segments[segmentIndex]!, 1e-6);
		return {
			id: `${route.id}:vehicle:${vehicleIndex}`,
			position: [
				start[0] + (end[0] - start[0]) * ratio,
				start[1] + (end[1] - start[1]) * ratio + 0.12,
				start[2] + (end[2] - start[2]) * ratio,
			],
		};
	});
}

export function RoadTrafficSimulationInspector({
	node,
	onUpdate,
}: {
	node: RoadNetworkNode;
	onUpdate: (patch: Partial<RoadNetworkNode>) => void;
}) {
	const routes = Object.values(node.trafficRoutes ?? {}).sort((a, b) => a.id.localeCompare(b.id));
	const route = routes.find((candidate) => candidate.id === node.selectedTrafficRouteId) ?? routes[0];
	if (!route) return <p style={{ color: "#94a3b8", fontSize: 11, margin: 0 }}>Connect terminal lanes through a permitted junction movement to generate traffic routes.</p>;
	return (
		<div aria-label="Lane level routing and traffic simulation" style={{ display: "grid", gap: 7 }}>
			<p style={{ color: "#e2e8f0", fontSize: 12, margin: 0 }}>{routes.length} reachable lane routes</p>
			<label style={{ display: "grid", fontSize: 11, gap: 4 }}>
				<span>Preview route</span>
				<select aria-label="Traffic simulation route" onChange={(event) => onUpdate({ selectedTrafficRouteId: event.currentTarget.value })} value={route.id}>
					{routes.map((candidate, index) => <option key={candidate.id} value={candidate.id}>Route {index + 1}</option>)}
				</select>
			</label>
			<label style={{ alignItems: "center", display: "flex", fontSize: 11, gap: 7 }}>
				<input aria-label="Show lane traffic simulation" checked={node.showTrafficSimulation} onChange={(event) => onUpdate({ showTrafficSimulation: event.currentTarget.checked })} type="checkbox" />
				<span>Show route and vehicles</span>
			</label>
			<label style={{ alignItems: "center", display: "flex", fontSize: 11, gap: 7, justifyContent: "space-between" }}>
				<span>Demand (veh/h)</span>
				<input aria-label="Traffic demand vehicles per hour" max={5000} min={1} onChange={(event) => onUpdate({ trafficDemandPerHour: Number(event.currentTarget.value) })} type="number" value={node.trafficDemandPerHour} />
			</label>
			<label style={{ alignItems: "center", display: "flex", fontSize: 11, gap: 7, justifyContent: "space-between" }}>
				<span>Preview time (s)</span>
				<input aria-label="Traffic preview time seconds" max={3600} min={0} onChange={(event) => onUpdate({ trafficPreviewTimeSeconds: Number(event.currentTarget.value) })} type="number" value={node.trafficPreviewTimeSeconds} />
			</label>
			<p style={{ color: "#94a3b8", fontSize: 11, margin: 0 }}>{route.lengthMeters.toFixed(1)} m · {route.travelTimeSeconds.toFixed(1)} s estimated travel</p>
		</div>
	);
}
