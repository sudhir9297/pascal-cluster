"use client";

import { type AnyNode, useScene } from "@pascal-app/core";
import { ActionButton, ActionGroup } from "@pascal-app/editor";
import { useState } from "react";
import { RoadPanelStatus } from "./road-panel-controls";
import {
	conformRoadNetworkToTerrain,
	gradeTerrainToRoad,
} from "./road-network-terrain";
import type { RoadNetworkNode } from "./schema";
import {
	createTerrainField,
	decodeTerrainField,
	encodeTerrainField,
	isDatumField,
} from "./terrain-field-compat";

type SiteLike = AnyNode & {
	polygon?: { points?: Array<[number, number]> };
	terrain?: unknown;
};

function fieldOptionsForSite(site: SiteLike) {
	const points = site.polygon?.points ?? [];
	if (points.length === 0) return undefined;
	const xs = points.map((point) => point[0]);
	const zs = points.map((point) => point[1]);
	const minX = Math.min(...xs);
	const maxX = Math.max(...xs);
	const minZ = Math.min(...zs);
	const maxZ = Math.max(...zs);
	const spacing = Math.max(0.5, Math.max(maxX - minX, maxZ - minZ) / 64);
	return {
		cols: 65,
		origin: [minX, minZ] as const,
		rows: 65,
		spacing,
	};
}

const terrainMessages = new Map<string, string>();

export function RoadTerrainEditor({
	node,
	onUpdate,
}: {
	node: RoadNetworkNode;
	onUpdate: (patch: Partial<RoadNetworkNode>) => void;
}) {
	const site = useScene((state) =>
		Object.values(state.nodes).find((candidate) => candidate.type === "site"),
	) as SiteLike | undefined;
	const [message, setMessage] = useState<string | null>(
		() => terrainMessages.get(node.id) ?? null,
	);
	const terrainOffset = Number.isFinite(node.terrainOffset)
		? node.terrainOffset
		: 0.05;
	const terrainFalloff = Number.isFinite(node.terrainFalloff)
		? node.terrainFalloff
		: 2.5;
	const report = (nextMessage: string) => {
		terrainMessages.set(node.id, nextMessage);
		setMessage(nextMessage);
	};

	const conformRoad = () => {
		if (!site) {
			report("Add a site before conforming the road.");
			return;
		}
		const field =
			decodeTerrainField(site.terrain) ??
			createTerrainField(fieldOptionsForSite(site));
		const result = conformRoadNetworkToTerrain(node, field, terrainOffset);
		onUpdate(result.value);
		report(
			result.changed > 0
				? `Conformed ${result.changed} road points. Bridge edges were preserved.`
				: "Road already matches the terrain, or only bridge edges were present.",
		);
	};

	const gradeTerrain = () => {
		if (!site) {
			report("Add a site before grading terrain.");
			return;
		}
		const field =
			decodeTerrainField(site.terrain) ??
			createTerrainField(fieldOptionsForSite(site));
		const result = gradeTerrainToRoad(node, field, terrainFalloff);
		if (result.changed > 0) {
			useScene.getState().updateNode(site.id, {
				terrain: isDatumField(result.value)
					? undefined
					: encodeTerrainField(result.value),
			} as Partial<AnyNode>);
		}
		report(
			result.changed > 0
				? `Graded ${result.changed} terrain samples with a ${terrainFalloff.toFixed(2)} m falloff.`
				: "Terrain already matches the road corridor.",
		);
	};

	return (
		<div className="flex flex-col gap-2">
			<ActionGroup>
				<ActionButton label="Conform road" onClick={conformRoad} type="button" />
				<ActionButton label="Grade terrain" onClick={gradeTerrain} type="button" />
			</ActionGroup>
			{message ? (
				<RoadPanelStatus>{message}</RoadPanelStatus>
			) : null}
		</div>
	);
}
