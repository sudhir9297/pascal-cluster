"use client";

import type {
	RoadLaneMovement,
	RoadNetworkNode,
	RoadSignalPhase,
	RoadSignalPlan,
} from "./schema";

type Point2 = readonly [number, number];

const SIGNAL_CONTROL = "signal" as const;

function junctionUsesSignals(node: RoadNetworkNode, junctionNodeId: string): boolean {
	const junction = node.junctions[junctionNodeId];
	if (!junction) return false;
	return junction.treatment === SIGNAL_CONTROL
		|| Object.values(junction.approachControls ?? {}).includes(SIGNAL_CONTROL);
}

function movementEndpoint(
	node: RoadNetworkNode,
	movement: RoadLaneMovement,
	incoming: boolean,
): Point2 | null {
	const lane = node.lanes[incoming ? movement.fromLaneId : movement.toLaneId];
	if (!lane) return null;
	const edge = node.edges[lane.edgeId];
	const junction = node.graphNodes[movement.junctionNodeId];
	if (!edge || !junction) return null;
	const otherNodeId = edge.startNodeId === movement.junctionNodeId
		? edge.endNodeId
		: edge.startNodeId;
	const other = node.graphNodes[otherNodeId];
	if (!other) return null;
	const dx = other.position[0] - junction.position[0];
	const dz = other.position[2] - junction.position[2];
	const length = Math.max(Math.hypot(dx, dz), 1e-6);
	const distance = Math.min(5, length * 0.45);
	const ux = dx / length;
	const uz = dz / length;
	const side = edge.startNodeId === junction.id ? 1 : -1;
	return [
		junction.position[0] + ux * distance - uz * lane.lateralOffset * side,
		junction.position[2] + uz * distance + ux * lane.lateralOffset * side,
	];
}

function quadraticMovementPath(
	node: RoadNetworkNode,
	movement: RoadLaneMovement,
): Point2[] {
	const start = movementEndpoint(node, movement, true);
	const end = movementEndpoint(node, movement, false);
	const junction = node.graphNodes[movement.junctionNodeId];
	if (!start || !end || !junction) return [];
	const control: Point2 = [junction.position[0], junction.position[2]];
	return Array.from({ length: 13 }, (_, index) => {
		const t = index / 12;
		const inverse = 1 - t;
		return [
			inverse * inverse * start[0] + 2 * inverse * t * control[0] + t * t * end[0],
			inverse * inverse * start[1] + 2 * inverse * t * control[1] + t * t * end[1],
		] as Point2;
	});
}

function orientation(a: Point2, b: Point2, c: Point2): number {
	return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function segmentsCross(a: Point2, b: Point2, c: Point2, d: Point2): boolean {
	const first = orientation(a, b, c);
	const second = orientation(a, b, d);
	const third = orientation(c, d, a);
	const fourth = orientation(c, d, b);
	return first * second < -1e-6 && third * fourth < -1e-6;
}

/** Return whether two enabled movements need different signal phases. */
export function roadSignalMovementsConflict(
	node: RoadNetworkNode,
	first: RoadLaneMovement,
	second: RoadLaneMovement,
): boolean {
	if (first.id === second.id || first.junctionNodeId !== second.junctionNodeId) return false;
	if (first.fromLaneId === second.fromLaneId || first.toLaneId === second.toLaneId) return true;
	const firstFrom = node.lanes[first.fromLaneId];
	const firstTo = node.lanes[first.toLaneId];
	const secondFrom = node.lanes[second.fromLaneId];
	const secondTo = node.lanes[second.toLaneId];
	if (!firstFrom || !firstTo || !secondFrom || !secondTo) return true;

	if (firstFrom.edgeId === secondFrom.edgeId || firstTo.edgeId === secondTo.edgeId) return false;
	const oppositePair = firstFrom.edgeId === secondTo.edgeId && firstTo.edgeId === secondFrom.edgeId;
	if (oppositePair && first.turn === "through" && second.turn === "through") return false;
	if (first.turn === "right" && second.turn === "right") return false;

	const firstPath = quadraticMovementPath(node, first);
	const secondPath = quadraticMovementPath(node, second);
	for (let firstIndex = 0; firstIndex < firstPath.length - 1; firstIndex += 1) {
		for (let secondIndex = 0; secondIndex < secondPath.length - 1; secondIndex += 1) {
			if (segmentsCross(
				firstPath[firstIndex]!,
				firstPath[firstIndex + 1]!,
				secondPath[secondIndex]!,
				secondPath[secondIndex + 1]!,
			)) return true;
		}
	}
	return false;
}

export function roadSignalPhaseConflicts(
	node: RoadNetworkNode,
	phase: RoadSignalPhase,
): Array<readonly [string, string]> {
	const movements = phase.movementIds.flatMap((id) => node.laneMovements[id] ? [node.laneMovements[id]!] : []);
	const conflicts: Array<readonly [string, string]> = [];
	for (let first = 0; first < movements.length; first += 1) {
		for (let second = first + 1; second < movements.length; second += 1) {
			if (roadSignalMovementsConflict(node, movements[first]!, movements[second]!)) {
				conflicts.push([movements[first]!.id, movements[second]!.id]);
			}
		}
	}
	return conflicts;
}

function automaticSignalPlan(
	node: RoadNetworkNode,
	junctionNodeId: string,
	previous?: RoadSignalPlan,
): RoadSignalPlan {
	const movements = Object.values(node.laneMovements)
		.filter((movement) => movement.junctionNodeId === junctionNodeId && movement.enabled)
		.sort((first, second) => first.id.localeCompare(second.id));
	const movementGroups: string[][] = [];
	for (const movement of movements) {
		const group = movementGroups.find((candidate) => candidate.every((id) => {
			const existing = node.laneMovements[id];
			return existing ? !roadSignalMovementsConflict(node, movement, existing) : true;
		}));
		if (group) group.push(movement.id);
		else movementGroups.push([movement.id]);
	}
	const phases = movementGroups.map((movementIds, index) => {
		const id = `signal-phase:${junctionNodeId}:${index + 1}`;
		const prior = previous?.phases.find((phase) => phase.id === id);
		return {
			clearanceSeconds: prior?.clearanceSeconds ?? 3,
			durationSeconds: prior?.durationSeconds ?? 30,
			id,
			movementIds,
			name: prior?.name ?? `Phase ${index + 1}`,
		};
	});
	return {
		junctionNodeId,
		mode: previous?.mode ?? "fixed",
		offsetSeconds: previous?.offsetSeconds ?? 0,
		phases,
	};
}

/** Rebuild signal plans from live junction controls while retaining authored timing values. */
export function buildRoadSignalPlans(node: RoadNetworkNode): RoadNetworkNode["signalPlans"] {
	return Object.values(node.junctions)
		.filter((junction) => junctionUsesSignals(node, junction.nodeId))
		.sort((first, second) => first.nodeId.localeCompare(second.nodeId))
		.reduce<RoadNetworkNode["signalPlans"]>((plans, junction) => {
			plans[junction.nodeId] = automaticSignalPlan(node, junction.nodeId, node.signalPlans?.[junction.nodeId]);
			return plans;
		}, {});
}

export function setRoadSignalPhaseTiming(
	node: RoadNetworkNode,
	junctionNodeId: string,
	phaseId: string,
	patch: Partial<Pick<RoadSignalPhase, "durationSeconds" | "clearanceSeconds">>,
): RoadNetworkNode["signalPlans"] | null {
	const plan = node.signalPlans[junctionNodeId];
	if (!plan || !plan.phases.some((phase) => phase.id === phaseId)) return null;
	return {
		...node.signalPlans,
		[junctionNodeId]: {
			...plan,
			phases: plan.phases.map((phase) => phase.id === phaseId ? { ...phase, ...patch } : phase),
		},
	};
}

export function RoadSignalPlanInspector({
	node,
	onUpdate,
}: {
	node: RoadNetworkNode;
	onUpdate: (patch: Partial<RoadNetworkNode>) => void;
}) {
	const plan = Object.values(node.signalPlans ?? {})
		.sort((first, second) => first.junctionNodeId.localeCompare(second.junctionNodeId))[0];
	if (!plan) {
		return <p style={{ color: "#94a3b8", fontSize: 11, margin: 0 }}>Set a junction or approach to Signal to generate a conflict-free phase schedule.</p>;
	}
	const cycleSeconds = plan.phases.reduce(
		(total, phase) => total + phase.durationSeconds + phase.clearanceSeconds,
		0,
	);
	return (
		<div aria-label="Traffic signal phase schedule" style={{ display: "grid", gap: 8 }}>
			<p style={{ color: "#e2e8f0", fontSize: 12, margin: 0 }}>
				{plan.phases.length} phases · {cycleSeconds}s cycle
			</p>
			<label style={{ display: "grid", fontSize: 11, gap: 4 }}>
				<span>Controller mode</span>
				<select
					aria-label="Signal controller mode"
					onChange={(event) => onUpdate({
						signalPlans: {
							...node.signalPlans,
							[plan.junctionNodeId]: { ...plan, mode: event.currentTarget.value as RoadSignalPlan["mode"] },
						},
					})}
					value={plan.mode}
				>
					<option value="fixed">Fixed time</option>
					<option value="actuated">Actuated</option>
				</select>
			</label>
			{plan.phases.map((phase, index) => {
				const conflicts = roadSignalPhaseConflicts(node, phase);
				return (
					<fieldset key={phase.id} style={{ border: "1px solid rgba(148,163,184,.2)", borderRadius: 6, display: "grid", gap: 5, margin: 0, padding: 7 }}>
						<legend style={{ fontSize: 11, padding: "0 3px" }}>{phase.name}</legend>
						<label style={{ alignItems: "center", display: "flex", fontSize: 11, gap: 6, justifyContent: "space-between" }}>
							<span>Green time</span>
							<input
								aria-label={`Phase ${index + 1} green time`}
								max={180}
								min={5}
								onChange={(event) => {
									const signalPlans = setRoadSignalPhaseTiming(node, plan.junctionNodeId, phase.id, {
										durationSeconds: Number(event.currentTarget.value),
									});
									if (signalPlans) onUpdate({ signalPlans });
								}}
								type="number"
								value={phase.durationSeconds}
							/>
						</label>
						<p style={{ color: conflicts.length > 0 ? "#fca5a5" : "#86efac", fontSize: 10, margin: 0 }}>
							{phase.movementIds.length} movements · {conflicts.length > 0 ? `${conflicts.length} conflicts` : "conflict-free"}
						</p>
					</fieldset>
				);
			})}
		</div>
	);
}
