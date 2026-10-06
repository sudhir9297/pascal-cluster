import { expect, test } from "bun:test";
import { LevelNode, WallNode, type AnyNode } from "@pascal-app/core";
import { Group, Vector3 } from "three";
import {
	CountertopBasinNode,
	UndermountBasinNode,
	DropInBasinNode,
	SemiRecessedBasinNode,
	WallHungBasinNode,
	FullPedestalBasinNode,
	HalfPedestalBasinNode,
} from "./schema";
import { basinModelRotation } from "./orientation";
import { basinLevelPose } from "./attachment";
import {
	basinTapLocalToLevel,
	basinTapLevelToLocal,
	basinTapTarget,
} from "./tap-attachment";
import { wallBasinPlacement } from "../wall-hung-basin/placement";
import { FreestandingVanityNode } from "../freestanding-vanity/schema";

const schemas = [
	CountertopBasinNode,
	UndermountBasinNode,
	DropInBasinNode,
	SemiRecessedBasinNode,
	WallHungBasinNode,
	FullPedestalBasinNode,
	HalfPedestalBasinNode,
];

for (const schema of schemas) {
	const sample = schema.parse({});
	test(`${sample.type} keeps its tap in the corrected model frame and round-trips placement`, () => {
		const level = LevelNode.parse({});
		const vanity = FreestandingVanityNode.parse({
			parentId: level.id,
			position: [2, 0.2, 3],
			rotation: 0.7,
		});
		const wall = WallNode.parse({
			parentId: level.id,
			start: [1, 2],
			end: [2, 5],
			thickness: 0.2,
		});
		const nodes = {
			[level.id]: level,
			[vanity.id]: vanity,
			[wall.id]: wall,
		} as unknown as Record<string, AnyNode>;
		for (const side of ["front", "back"] as const) {
			let basin = schema.parse({
				parentId: vanity.id,
				position: [0.1, 0.8, 0.03],
				rotation: 0.4,
			});
			if ("wallId" in basin)
				basin = schema.parse({
					...basin,
					...wallBasinPlacement(basin, wall, 1, side)!,
				});
			const savedRotation = basin.rotation;
			const frame = basinLevelPose(basin, nodes),
				local = basinTapTarget(basin, nodes);
			// Emulate the rendered basin root, including an attached tap child.
			const root = new Group();
			root.position.fromArray(frame.position);
			root.rotation.y = basinModelRotation(frame.rotation);
			root.updateMatrixWorld(true);
			const expected = root.localToWorld(new Vector3(...local.position));
			const world = basinTapLocalToLevel(basin, local, nodes);
			world.position.forEach((value, i) =>
				expect(value).toBeCloseTo(expected.toArray()[i]!, 8),
			);
			expect(world.rotation - local.rotation - frame.rotation).toBeCloseTo(
				Math.PI,
				8,
			);
			const restored = basinTapLevelToLocal(basin, world, nodes);
			restored.position.forEach((value, i) =>
				expect(value).toBeCloseTo(local.position[i]!, 8),
			);
			expect(restored.rotation).toBeCloseTo(local.rotation, 8);
			expect(basin.rotation).toBe(savedRotation);
		}
	});
}
