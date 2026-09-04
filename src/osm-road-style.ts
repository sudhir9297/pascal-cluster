import type { RoadSideComponents, RoadStylePreset } from "./schema";
import { DEFAULT_ROAD_STYLE_PRESETS } from "./road-style-presets";

type Tags = Record<string, string>;

/** OSM lengths are metres unless explicitly suffixed. Reject ambiguous lists. */
function length(value: string | undefined): number | undefined {
	const match = value?.trim().match(/^(\d+(?:\.\d+)?)\s*(m|ft|')?$/);
	if (!match) return undefined;
	const meters =
		Number(match[1]) * (match[2] === "ft" || match[2] === "'" ? 0.3048 : 1);
	return meters > 0 && Number.isFinite(meters) ? meters : undefined;
}
function lanes(value: string | undefined): number | undefined {
	if (!value || !/^\d+$/.test(value)) return undefined;
	const count = Number(value);
	return count >= 1 && count <= 12 ? count : undefined;
}
function sideValue(tags: Tags, key: string, side: string): string | undefined {
	return tags[`${key}:${side}`] ?? tags[`${key}:both`] ?? tags[key];
}
function sideWidth(
	tags: Tags,
	key: string,
	side: string,
	fallback: number,
	max: number,
): number {
	return Math.min(
		max,
		length(
			tags[`${key}:${side}:width`] ??
				tags[`${key}:both:width`] ??
				tags[`${key}:width`],
		) ?? fallback,
	);
}

/** Build a section for one OSM way. Defaults are estimates, explicit tags win. */
export function buildOsmRoadStyle(
	tags: Tags,
	baseId: string,
	oneWay: boolean,
): RoadStylePreset {
	const base =
		DEFAULT_ROAD_STYLE_PRESETS[
			baseId as keyof typeof DEFAULT_ROAD_STYLE_PRESETS
		];
	const highway = tags.highway ?? "";
	const fast = /^(motorway|trunk)/.test(highway);
	const service = highway === "service";
	const link = highway.endsWith("_link");
	const side = (side: "left" | "right"): RoadSideComponents => {
		const sidewalk = sideValue(tags, "sidewalk", side);
		const hasSidewalk =
			sidewalk === "yes" ||
			sidewalk === "both" ||
			sidewalk === side ||
			sidewalk === "separate" ||
			(sidewalk === undefined && !fast && !service && !link);
		const cycle = sideValue(tags, "cycleway", side);
		const parking =
			tags[`parking:${side}`] ??
			tags["parking:both"] ??
			tags[`parking:lane:${side}`] ??
			tags["parking:lane:both"];
		return {
			sidewalkWidth: hasSidewalk
				? sideWidth(tags, "sidewalk", side, 1.8, 6)
				: 0,
			curbWidth: hasSidewalk ? 0.15 : 0,
			gutterWidth: 0,
			vergeWidth: 0,
			bikeLaneWidth:
				cycle === "lane" || cycle === "opposite_lane"
					? sideWidth(tags, "cycleway", side, 1.5, 3)
					: 0,
			parkingLaneWidth: [
				"lane",
				"parallel",
				"diagonal",
				"perpendicular",
			].includes(parking ?? "")
				? sideWidth(tags, "parking", side, 2.2, 4)
				: 0,
		};
	};
	const leftSide = side("left");
	const rightSide = side("right");
	const forward = lanes(tags["lanes:forward"]);
	const backward = lanes(tags["lanes:backward"]);
	const directional =
		forward && backward
			? forward + backward + (lanes(tags["lanes:both_ways"]) ?? 0)
			: undefined;
	const laneCount =
		lanes(tags.lanes) ??
		(directional && directional <= 12 ? directional : undefined) ??
		(oneWay ? (forward ?? backward) : undefined) ??
		(link || service ? 1 : 2);
	const roadsidePavement =
		leftSide.parkingLaneWidth +
		rightSide.parkingLaneWidth +
		leftSide.bikeLaneWidth +
		rightSide.bikeLaneWidth;
	const mappedWidth = length(tags.width) ?? length(tags["est_width"]);
	const perLane = mappedWidth
		? (mappedWidth - roadsidePavement) / laneCount
		: undefined;
	// Do not coerce contradictory or out-of-range dimensions into invalid editor styles.
	const laneWidth =
		perLane && perLane >= 2.4 && perLane <= 5 ? perLane : fast ? 3.65 : 3.2;
	return {
		...base,
		id: baseId,
		name: (tags.name || `${highway.replaceAll("_", " ")} street`).slice(0, 64),
		laneCount,
		laneWidth,
		shoulderWidth: 0,
		medianWidth: 0,
		sidewalkWidth: Math.max(leftSide.sidewalkWidth, rightSide.sidewalkWidth),
		leftSide,
		rightSide,
		markings:
			tags.lane_markings !== "no" && !service && highway !== "living_street",
	};
}
