import { describe, expect, test } from "bun:test";
import {
	applyRoadDraftDirectionConstraints,
	normalizeRoadBearing,
	parseRoadDraftNumericValue,
	roadDraftMetrics,
} from "./road-draft-numeric";

describe("road numeric drafting", () => {
	test("uses survey bearings with north at zero and east at ninety degrees", () => {
		expect(roadDraftMetrics([0, 0, 0], [0, 0, -10])).toEqual({
			bearing: 0,
			length: 10,
		});
		expect(roadDraftMetrics([0, 0, 0], [10, 0, 0]).bearing).toBe(90);
		expect(roadDraftMetrics([0, 0, 0], [0, 0, 10]).bearing).toBe(180);
	});

	test("locks length and bearing independently or together", () => {
		const start = [2, 0, 3] as const;
		const lengthLocked = applyRoadDraftDirectionConstraints(
			start,
			[12, 0, 3],
			{
				bearing: null,
				length: 5,
			},
		);
		expect(lengthLocked[0]).toBeCloseTo(7, 8);
		expect(lengthLocked[2]).toBeCloseTo(3, 8);
		const bearingLocked = applyRoadDraftDirectionConstraints(
			start,
			[12, 0, 3],
			{
				bearing: 0,
				length: null,
			},
		);
		expect(bearingLocked[0]).toBeCloseTo(2, 8);
		expect(bearingLocked[2]).toBeCloseTo(-7, 8);
		const locked = applyRoadDraftDirectionConstraints(start, [12, 0, 3], {
			bearing: 90,
			length: 12,
		});
		expect(locked[0]).toBeCloseTo(14, 8);
		expect(locked[2]).toBeCloseTo(3, 8);
	});

	test("normalizes bearings and clamps physical values to schema limits", () => {
		expect(normalizeRoadBearing(-45)).toBe(315);
		expect(parseRoadDraftNumericValue("bearing", "450")).toBe(90);
		expect(parseRoadDraftNumericValue("length", "0")).toBe(0.05);
		expect(parseRoadDraftNumericValue("radius", "5000")).toBe(1000);
		expect(parseRoadDraftNumericValue("tangent", "-2")).toBe(0);
		expect(parseRoadDraftNumericValue("length", "nope")).toBeNull();
	});
});
