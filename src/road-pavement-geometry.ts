import type { RoadSurfaceGeometryData } from "./road-network-geometry";

export type RoadSurfaceSample = {
	point: readonly [number, number, number];
	leftOffset: number;
	rightOffset: number;
	surfaceThickness: number;
};

/** Authored Y is the finished driving surface, independent of pavement depth. */
export function buildRoadVariableRibbonGeometry(
	samples: readonly RoadSurfaceSample[],
	elevationOffset = 0,
): RoadSurfaceGeometryData {
	const positions: number[] = [];
	const indices: number[] = [];
	if (samples.length < 2) return { positions, indices };
	for (let i = 0; i < samples.length; i++) {
		const sample = samples[i]!;
		const before = samples[Math.max(0, i - 1)]!.point;
		const after = samples[Math.min(samples.length - 1, i + 1)]!.point;
		const dx = after[0] - before[0],
			dz = after[2] - before[2];
		const length = Math.max(Math.hypot(dx, dz), 1e-6);
		for (const offset of [sample.leftOffset, sample.rightOffset])
			positions.push(
				sample.point[0] - (dz / length) * offset,
				sample.point[1] + elevationOffset,
				sample.point[2] + (dx / length) * offset,
			);
		if (i > 0) {
			const a = (i - 1) * 2;
			indices.push(a, a + 2, a + 1, a + 2, a + 3, a + 1);
		}
	}
	return { positions, indices };
}

/** Bottom and boundary walls only; the existing road mesh supplies the top. */
export function buildRoadPavementShell(
	top: RoadSurfaceGeometryData,
	thickness: number | readonly number[],
): RoadSurfaceGeometryData {
	const positions: number[] = [],
		indices: number[] = [];
	const boundary = new Map<string, { a: number; b: number; count: number }>();
	const point = (index: number, bottom: boolean): [number, number, number] => [
		top.positions[index * 3]!,
		top.positions[index * 3 + 1]! -
			(bottom
				? typeof thickness === "number"
					? thickness
					: thickness[index]!
				: 0),
		top.positions[index * 3 + 2]!,
	];
	const triangle = (
		a: readonly number[],
		b: readonly number[],
		c: readonly number[],
	) => {
		const index = positions.length / 3;
		positions.push(...a, ...b, ...c);
		indices.push(index, index + 1, index + 2);
	};
	for (let i = 0; i < top.indices.length; i += 3) {
		let [a, b, c] = top.indices.slice(i, i + 3) as [number, number, number];
		const pa = point(a, false),
			pb = point(b, false),
			pc = point(c, false);
		const normalY =
			(pb[2] - pa[2]) * (pc[0] - pa[0]) - (pb[0] - pa[0]) * (pc[2] - pa[2]);
		if (Math.abs(normalY) < 1e-12) continue;
		if (normalY < 0) [b, c] = [c, b];
		triangle(point(a, true), point(c, true), point(b, true));
		for (const [u, v] of [
			[a, b],
			[b, c],
			[c, a],
		] as [number, number][]) {
			const key = u < v ? `${u}:${v}` : `${v}:${u}`;
			const entry = boundary.get(key);
			if (entry) entry.count++;
			else boundary.set(key, { a: u, b: v, count: 1 });
		}
	}
	for (const { a, b, count } of boundary.values()) {
		if (count !== 1) continue;
		triangle(point(a, false), point(a, true), point(b, false));
		triangle(point(b, false), point(a, true), point(b, true));
	}
	return { positions, indices };
}
