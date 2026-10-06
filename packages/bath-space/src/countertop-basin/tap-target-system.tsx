"use client";

import {
	getEffectiveNode,
	sceneRegistry,
	type AnyNodeId,
	type SceneApi,
} from "@pascal-app/core";
import { useFrame } from "@react-three/fiber";
import {
	COUNTERTOP_BASIN,
	UNDERMOUNT_BASIN,
	DROP_IN_BASIN,
	SEMI_RECESSED_BASIN,
	BasinNode,
} from "./schema";
import { BASIN_TAP_TARGET_NAME, syncBasinTapTarget } from "./tap-attachment";
import { basinModelRotation } from "./orientation";

export default function BasinOrientationSystem({
	sceneApi,
}: {
	sceneApi: SceneApi;
}) {
	useFrame(() => {
		const nodes = sceneApi.nodes();
		for (const kind of [
			COUNTERTOP_BASIN,
			UNDERMOUNT_BASIN,
			DROP_IN_BASIN,
			SEMI_RECESSED_BASIN,
		]) {
			for (const id of sceneRegistry.byType[kind] ?? []) {
				const raw = nodes[id as AnyNodeId],
					root = sceneRegistry.nodes.get(id);
				if (!raw || !root) continue;
				const node = BasinNode.parse(getEffectiveNode(raw));
				root.rotation.y = basinModelRotation(node.rotation);
				const target = root.getObjectByName(BASIN_TAP_TARGET_NAME);
				if (target) syncBasinTapTarget(target, node, nodes);
			}
		}
	}, 2);
	return null;
}
