"use client";
import {
	getEffectiveNode,
	sceneRegistry,
	useLiveNodeOverrides,
	useScene,
	type AnyNodeId,
	type SceneApi,
} from "@pascal-app/core";
import { useItemLightPool } from "@pascal-app/viewer";
import { useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { MIRROR } from "./schema";
import { mirrorPlacement } from "./placement";
import { readMirrorNode } from "./runtime-node";
import MirrorReflections from "./reflection";
const temperatures = { warm: "#ffd7a0", neutral: "#fff1d9", cool: "#e0efff" };
export default function MirrorSystem({ sceneApi }: { sceneApi: SceneApi }) {
	useEffect(() => {
		const registered = new Map<string, { signature: string; keys: string[] }>();
		const remove = (id: string) => {
			const record = registered.get(id);
			if (record)
				for (const key of record.keys)
					useItemLightPool.getState().unregister(key);
			registered.delete(id);
		};
		const refresh = () => {
			const active = new Set<string>();
			for (const raw of Object.values(useScene.getState().nodes)) {
				if (String(raw.type) !== MIRROR) continue;
				const n = readMirrorNode(raw);
				if (!n.backlight) continue;
				active.add(n.id);
				const signature = n.temperature;
				if (registered.get(n.id)?.signature === signature) continue;
				remove(n.id);
				const keys: string[] = [];
				const current = () => {
					const raw = useScene.getState().nodes[n.id as AnyNodeId];
					return raw ? readMirrorNode(raw) : null;
				};
				for (let index = 0; index < 4; index++) {
					const key = `bathspace-mirror:${n.id}:${index}`;
					keys.push(key);
					useItemLightPool.getState().register({
						key,
						nodeId: n.id as AnyNodeId,
						color: temperatures[n.temperature],
						distance: 1,
						getWorldPosition: (out) => {
							const root = sceneRegistry.nodes.get(n.id),
								value = current();
							if (!root || !value) return false;
							const x =
								index === 0
									? -value.width * 0.4
									: index === 1
										? value.width * 0.4
										: 0;
							const y =
								index === 2
									? -value.height * 0.4
									: index === 3
										? value.height * 0.4
										: 0;
							out.set(x, y, Math.max(0.002, value.wallGap / 2));
							root.localToWorld(out);
							return true;
						},
						getIntensity: () => {
							const value = current();
							return value?.backlight ? value.brightness * 0.015 : 0;
						},
						isEligible: () => Boolean(current()?.backlight),
					});
				}
				registered.set(n.id, { signature, keys });
			}
			for (const id of registered.keys()) if (!active.has(id)) remove(id);
		};
		refresh();
		const unsubscribe = useScene.subscribe((state, previous) => {
			if (state.nodes !== previous.nodes) refresh();
		});
		const unsubscribeLive = useLiveNodeOverrides.subscribe(refresh);
		return () => {
			unsubscribe();
			unsubscribeLive();
			for (const id of registered.keys()) remove(id);
		};
	}, []);
	useFrame(() => {
		const nodes = sceneApi.nodes();
		for (const id of sceneRegistry.byType[MIRROR] ?? []) {
			const raw = nodes[id as AnyNodeId],
				root = sceneRegistry.nodes.get(id);
			if (!raw || !root) continue;
			const n = readMirrorNode(raw),
				wall = nodes[(n.wallId ?? n.parentId) as AnyNodeId];
			if (wall?.type !== "wall") continue;
			const p = mirrorPlacement(
				n,
				getEffectiveNode(wall),
				n.position[0],
				n.side,
				0,
				true,
				nodes,
			);
			if (p) {
				root.position.set(...p.position);
				root.rotation.set(0, p.rotation, 0);
			}
		}
	}, 3);
	return <MirrorReflections />;
}
