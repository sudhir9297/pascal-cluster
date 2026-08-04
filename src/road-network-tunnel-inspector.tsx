"use client";

import { type AnyNode, useScene } from "@pascal-app/core";
import { useState } from "react";
import {
	carveTerrainForTunnelPortals,
	convertRoadNetworkToTunnel,
	isRoadTunnelEdge,
} from "./road-network-tunnel";
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

const buttonStyle = {
	background: "rgba(30, 41, 59, 0.84)",
	border: "1px solid rgba(148, 163, 184, 0.28)",
	borderRadius: 6,
	color: "#e2e8f0",
	cursor: "pointer",
	padding: "8px 10px",
} as const;

const tunnelMessages = new Map<string, string>();

export function RoadTunnelEditor({
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
		() => tunnelMessages.get(node.id) ?? null,
	);
	const tunnelEdges = Object.values(node.edges).filter((edge) =>
		isRoadTunnelEdge(node, edge),
	);
	const report = (nextMessage: string) => {
		tunnelMessages.set(node.id, nextMessage);
		setMessage(nextMessage);
	};

	const convert = () => {
		const result = convertRoadNetworkToTunnel(node);
		onUpdate({ edges: result.edges, graphNodes: result.graphNodes });
		report(
			result.changed > 0
				? `Converted ${result.changed} road points to tunnel structure without moving the authored profile.`
				: "Every road point in this network is already tunnel-mode.",
		);
	};

	const carvePortals = () => {
		if (tunnelEdges.length === 0) {
			report("Convert this road network to tunnel structure first.");
			return;
		}
		if (!site) {
			report("Add a site before applying tunnel portal cuts.");
			return;
		}
		const field =
			decodeTerrainField(site.terrain) ??
			createTerrainField(fieldOptionsForSite(site));
		const result = carveTerrainForTunnelPortals(node, field);
		if (result.changed > 0) {
			useScene.getState().updateNode(site.id, {
				terrain: isDatumField(result.value)
					? undefined
					: encodeTerrainField(result.value),
			} as Partial<AnyNode>);
		}
		report(
			result.changed > 0
				? `Subtracted ${result.changed} terrain samples at the tunnel portals while preserving the covered interior.`
				: "The terrain already contains these portal cuts.",
		);
	};

	return (
		<div style={{ display: "grid", gap: 8 }}>
			<p
				style={{
					color: "#94a3b8",
					fontSize: 12,
					lineHeight: 1.45,
					margin: 0,
				}}
			>
				Tunnel conversion preserves the road profile. Portal carving subtracts only
				the open approaches from the site heightfield, so covered tunnel sections
				remain below terrain.
			</p>
			<button onClick={convert} style={buttonStyle} type="button">
				{tunnelEdges.length === Object.keys(node.edges).length && tunnelEdges.length > 0
					? "Rebuild tunnel structure"
					: "Convert network to tunnel"}
			</button>
			<button onClick={carvePortals} style={buttonStyle} type="button">
				Apply tunnel portal cuts to terrain
			</button>
			{message ? (
				<p
					aria-live="polite"
					style={{
						color: "#bbf7d0",
						fontSize: 11,
						lineHeight: 1.4,
						margin: 0,
					}}
				>
					{message}
				</p>
			) : null}
		</div>
	);
}
