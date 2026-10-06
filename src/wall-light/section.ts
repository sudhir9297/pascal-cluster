import type { WallLightNode } from "./schema";
import {
	sectionDimension as dim,
	sectionRect as rect,
	type SectionModel,
} from "../section/fields";
export function accessorySection(n: WallLightNode): SectionModel {
	const dimensions = [
		dim("width", "Width", n.width, 0.2, 1.5, 0.001, "plan", "x"),
		dim("depth", "Projection", n.depth, 0.03, 0.2, 0.001, "plan", "y"),
	];
	dimensions.push({
		...dim("height", "Height", n.height, 0.04, 0.3, 0.001),
		start: n.height,
		direction: -1,
	});
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
