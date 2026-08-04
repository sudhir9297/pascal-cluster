import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RoadNetworkModel } from "./road-network-model";
import {
	buildRoadEarthworkGeometry,
	buildRoadEarthworkStrips,
} from "./road-network-earthworks";
import { RoadNetworkNode } from "./schema";
import { createTerrainField } from "./terrain-field-compat";
import { createEmptyRoadGraph, insertRoadSegment } from "./road-network-topology";

function roadAt(elevation: number, mode: "ground" | "bridge" = "ground") {
	const result = insertRoadSegment(
		createEmptyRoadGraph(),
		[4, elevation, 8],
		[24, elevation, 8],
		{ elevationMode: mode, stackLevel: mode === "bridge" ? 1 : 0 },
	);
	return RoadNetworkNode.parse(result.graph);
}

const terrain = createTerrainField({
	origin: [0, 0],
	spacing: 0.5,
	cols: 65,
	rows: 33,
});

describe("road embankment and excavation meshes", () => {
	test("daylights an elevated ground road with fill slopes on both sides", () => {
		const strips = buildRoadEarthworkStrips(roadAt(2), terrain);
		expect(strips).toHaveLength(2);
		expect(strips.every((strip) => strip.kind === "fill")).toBe(true);
		expect(strips.map((strip) => strip.side).sort()).toEqual(["left", "right"]);
		for (const strip of strips) {
			expect(strip.samples.every((sample) => sample.inner[1] > sample.outer[1])).toBe(true);
			const geometry = buildRoadEarthworkGeometry(strip);
			expect(geometry.positions.every(Number.isFinite)).toBe(true);
			expect(geometry.indices.length).toBeGreaterThan(0);
		}
	});

	test("daylights a depressed ground road with excavation slopes", () => {
		const strips = buildRoadEarthworkStrips(roadAt(-2), terrain);
		expect(strips).toHaveLength(2);
		expect(strips.every((strip) => strip.kind === "cut")).toBe(true);
		expect(strips.flatMap((strip) => strip.samples).every(
			(sample) => sample.inner[1] < sample.outer[1],
		)).toBe(true);
	});

	test("does not generate earthworks for bridge edges", () => {
		expect(buildRoadEarthworkStrips(roadAt(2, "bridge"), terrain)).toEqual([]);
	});

	test("renders named non-interactive fill and cut meshes", () => {
		const previousConsoleError = console.error;
		console.error = () => {};
		let fillMarkup = "";
		let cutMarkup = "";
		try {
			fillMarkup = renderToStaticMarkup(
				createElement(RoadNetworkModel, { node: roadAt(2), terrain }),
			);
			cutMarkup = renderToStaticMarkup(
				createElement(RoadNetworkModel, { node: roadAt(-2), terrain }),
			);
		} finally {
			console.error = previousConsoleError;
		}
		expect(fillMarkup.match(/name="road-earthwork-fill:/g)).toHaveLength(2);
		expect(cutMarkup.match(/name="road-earthwork-cut:/g)).toHaveLength(2);
	});
});
