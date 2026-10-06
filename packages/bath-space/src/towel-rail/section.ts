import type { TowelRailNode } from "./schema";
import {
	sectionDimension as dim,
	sectionRect as rect,
	type SectionModel,
} from "../section/fields";
export function accessorySection(n: TowelRailNode): SectionModel {
	const dimensions = [
		dim("width", "Width", n.width, 0.3, 1.2, 0.001, "plan", "x"),
		dim("depth", "Projection", n.depth, 0.06, 0.25, 0.001, "plan", "y"),
	];

	return {
		drawing: {
			width: n.width,
			depth: n.depth,
			height: n.height,
			plan: rect(0, 0, n.width, n.depth),
			section: rect(0, 0, n.width, n.height),
		},
		dimensions,
	};
}
