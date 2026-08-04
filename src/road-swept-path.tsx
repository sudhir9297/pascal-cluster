"use client";

import { buildRoadLaneMovementGuides } from "./road-lane-movements";
import type { RoadLaneMovement, RoadNetworkNode } from "./schema";

export type RoadDesignVehicle = {
	id: RoadNetworkNode["designVehicle"];
	label: string;
	length: number;
	minTurningRadius: number;
	wheelbase: number;
	width: number;
};

export const ROAD_DESIGN_VEHICLES: Record<RoadNetworkNode["designVehicle"], RoadDesignVehicle> = {
	"passenger-car": { id: "passenger-car", label: "Passenger car", length: 4.8, minTurningRadius: 5.5, wheelbase: 2.8, width: 1.9 },
	"delivery-truck": { id: "delivery-truck", label: "Delivery truck", length: 9.2, minTurningRadius: 9.5, wheelbase: 5.2, width: 2.5 },
	"fire-engine": { id: "fire-engine", label: "Fire engine", length: 12, minTurningRadius: 11.5, wheelbase: 6.1, width: 2.55 },
	"tractor-trailer": { id: "tractor-trailer", label: "Tractor trailer", length: 16.5, minTurningRadius: 13.5, wheelbase: 8.8, width: 2.6 },
};

export type RoadSweptPathCheck = {
	envelopeWidth: number;
	minimumPathRadius: number;
	movement: RoadLaneMovement;
	passes: boolean;
	points: Array<[number, number, number]>;
	vehicle: RoadDesignVehicle;
};

function quadraticPath(
	points: Array<[number, number, number]>,
): Array<[number, number, number]> {
	if (points.length !== 3) return points;
	const [start, control, end] = points;
	return Array.from({ length: 33 }, (_, index) => {
		const t = index / 32;
		const inverse = 1 - t;
		return [
			inverse * inverse * start![0] + 2 * inverse * t * control![0] + t * t * end![0],
			inverse * inverse * start![1] + 2 * inverse * t * control![1] + t * t * end![1],
			inverse * inverse * start![2] + 2 * inverse * t * control![2] + t * t * end![2],
		];
	});
}

function circumradius(
	first: readonly [number, number, number],
	middle: readonly [number, number, number],
	last: readonly [number, number, number],
): number {
	const a = Math.hypot(middle[0] - first[0], middle[2] - first[2]);
	const b = Math.hypot(last[0] - middle[0], last[2] - middle[2]);
	const c = Math.hypot(last[0] - first[0], last[2] - first[2]);
	const twiceArea = Math.abs(
		(middle[0] - first[0]) * (last[2] - first[2])
		- (middle[2] - first[2]) * (last[0] - first[0]),
	);
	if (twiceArea < 1e-8) return Number.POSITIVE_INFINITY;
	return (a * b * c) / (2 * twiceArea);
}

function minimumPathRadius(points: Array<[number, number, number]>): number {
	let minimum = Number.POSITIVE_INFINITY;
	for (let index = 0; index < points.length - 2; index += 1) {
		minimum = Math.min(minimum, circumradius(points[index]!, points[index + 1]!, points[index + 2]!));
	}
	return minimum;
}

/** Simulate one design vehicle along a selected lane movement and estimate its swept envelope. */
export function buildRoadSweptPathCheck(node: RoadNetworkNode): RoadSweptPathCheck | null {
	const enabled = Object.values(node.laneMovements)
		.filter((movement) => movement.enabled)
		.sort((first, second) => first.id.localeCompare(second.id));
	const movement = enabled.find((candidate) => candidate.id === node.sweptPathMovementId) ?? enabled[0];
	if (!movement) return null;
	const guide = buildRoadLaneMovementGuides(node).find((candidate) => candidate.id === movement.id);
	if (!guide) return null;
	const points = quadraticPath(guide.points);
	const radius = minimumPathRadius(points);
	const vehicle = ROAD_DESIGN_VEHICLES[node.designVehicle];
	const offtracking = Number.isFinite(radius)
		? vehicle.wheelbase * vehicle.wheelbase / (2 * Math.max(radius, 0.75))
		: 0;
	return {
		envelopeWidth: vehicle.width + Math.min(vehicle.width * 1.5, offtracking * 1.35) + Math.max(0.35, (vehicle.length - vehicle.wheelbase) * 0.12),
		minimumPathRadius: radius,
		movement,
		passes: radius + 0.25 >= vehicle.minTurningRadius,
		points,
		vehicle,
	};
}

export function RoadSweptPathInspector({
	node,
	onUpdate,
}: {
	node: RoadNetworkNode;
	onUpdate: (patch: Partial<RoadNetworkNode>) => void;
}) {
	const movements = Object.values(node.laneMovements)
		.filter((movement) => movement.enabled)
		.sort((first, second) => first.id.localeCompare(second.id));
	const check = buildRoadSweptPathCheck(node);
	if (!check) return <p style={{ color: "#94a3b8", fontSize: 11, margin: 0 }}>Add a junction with an enabled lane movement to run swept-path checks.</p>;
	return (
		<div aria-label="Design vehicle swept path check" style={{ display: "grid", gap: 7 }}>
			<label style={{ display: "grid", fontSize: 11, gap: 4 }}>
				<span>Design vehicle</span>
				<select
					aria-label="Road design vehicle"
					onChange={(event) => onUpdate({ designVehicle: event.currentTarget.value as RoadNetworkNode["designVehicle"] })}
					value={node.designVehicle}
				>
					{Object.values(ROAD_DESIGN_VEHICLES).map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.label}</option>)}
				</select>
			</label>
			<label style={{ display: "grid", fontSize: 11, gap: 4 }}>
				<span>Movement</span>
				<select
					aria-label="Swept path lane movement"
					onChange={(event) => onUpdate({ sweptPathMovementId: event.currentTarget.value })}
					value={check.movement.id}
				>
					{movements.map((movement, index) => <option key={movement.id} value={movement.id}>{index + 1}. {movement.turn.replace("-", " ")}</option>)}
				</select>
			</label>
			<label style={{ alignItems: "center", display: "flex", fontSize: 11, gap: 7 }}>
				<input
					aria-label="Show design vehicle swept path"
					checked={node.showSweptPath}
					onChange={(event) => onUpdate({ showSweptPath: event.currentTarget.checked })}
					type="checkbox"
				/>
				<span>Show swept envelope</span>
			</label>
			<p style={{ color: check.passes ? "#86efac" : "#fca5a5", fontSize: 11, margin: 0 }}>
				{Number.isFinite(check.minimumPathRadius) ? `${check.minimumPathRadius.toFixed(1)} m path radius` : "Straight movement"} · {check.vehicle.minTurningRadius.toFixed(1)} m required · {check.passes ? "passes" : "too tight"}
			</p>
		</div>
	);
}
