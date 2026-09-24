import type { RoadPoint } from "./road-network-topology";

export type RoadDraftNumericField =
	| "length"
	| "bearing"
	| "radius"
	| "tangent";

export type RoadDraftDirectionConstraints = {
	bearing: number | null;
	length: number | null;
};

export const EMPTY_ROAD_DRAFT_DIRECTION_CONSTRAINTS: RoadDraftDirectionConstraints = {
	bearing: null,
	length: null,
};

export const ROAD_DRAFT_NUMERIC_FIELDS: readonly RoadDraftNumericField[] = [
	"length",
	"bearing",
	"radius",
	"tangent",
];

export function roadDraftMetrics(start: RoadPoint, end: RoadPoint): {
	bearing: number;
	length: number;
} {
	const dx = end[0] - start[0];
	const dz = end[2] - start[2];
	return {
		bearing: normalizeRoadBearing((Math.atan2(dx, -dz) * 180) / Math.PI),
		length: Math.hypot(dx, dz),
	};
}

export function normalizeRoadBearing(value: number): number {
	return ((value % 360) + 360) % 360;
}

export function applyRoadDraftDirectionConstraints(
	start: RoadPoint,
	cursor: RoadPoint,
	constraints: RoadDraftDirectionConstraints,
): [number, number, number] {
	const current = roadDraftMetrics(start, cursor);
	const length = constraints.length ?? current.length;
	const bearing = constraints.bearing ?? current.bearing;
	const radians = (bearing * Math.PI) / 180;
	return [
		start[0] + Math.sin(radians) * length,
		cursor[1],
		start[2] - Math.cos(radians) * length,
	];
}

export function parseRoadDraftNumericValue(
	field: RoadDraftNumericField,
	value: string,
): number | null {
	const parsed = Number(value.trim());
	if (!Number.isFinite(parsed)) return null;
	if (field === "bearing") return normalizeRoadBearing(parsed);
	const minimum = field === "length" ? 0.05 : field === "radius" ? 0.1 : 0;
	return Math.min(1000, Math.max(minimum, parsed));
}

export function roadDraftNumericLabel(field: RoadDraftNumericField): string {
	if (field === "bearing") return "Bearing";
	if (field === "radius") return "Bend radius";
	if (field === "tangent") return "Tangent";
	return "Length";
}

export function roadDraftNumericUnit(field: RoadDraftNumericField): string {
	return field === "bearing" ? "°" : "m";
}
