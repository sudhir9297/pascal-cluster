"use client";

import { useState } from "react";
import { resolveRoadNetworkDefaultStyle } from "./road-network-style-editing";
import type { RoadNetworkNode } from "./schema";

function presetSlug(name: string): string {
	const slug = name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return slug || "custom-road";
}

export function saveRoadStylePreset(
	node: RoadNetworkNode,
	name: string,
): Pick<RoadNetworkNode, "activeStyleId" | "stylePresets"> {
	const trimmedName = name.trim() || "Custom road";
	const baseId = `custom:${presetSlug(trimmedName)}`;
	let id = baseId;
	let suffix = 2;
	while (node.stylePresets[id]) {
		id = `${baseId}-${suffix++}`;
	}
	const source = resolveRoadNetworkDefaultStyle(node);
	return {
		activeStyleId: id,
		stylePresets: {
			...node.stylePresets,
			[id]: { ...source, id, name: trimmedName },
		},
	};
}

export function loadRoadStylePreset(
	node: RoadNetworkNode,
	id: string,
): Pick<RoadNetworkNode, "activeStyleId"> | null {
	return node.stylePresets[id] ? { activeStyleId: id } : null;
}

const fieldStyle = {
	background: "rgba(15, 23, 42, 0.72)",
	border: "1px solid rgba(148, 163, 184, 0.28)",
	borderRadius: 6,
	color: "#e2e8f0",
	fontSize: 12,
	padding: "7px 8px",
} as const;

const buttonStyle = {
	...fieldStyle,
	background: "rgba(30, 41, 59, 0.84)",
	cursor: "pointer",
} as const;

export function RoadStylePresetLibrary({
	node,
	onUpdate,
}: {
	node: RoadNetworkNode;
	onUpdate: (patch: Partial<RoadNetworkNode>) => void;
}) {
	const [name, setName] = useState("My road style");
	const presets = Object.values(node.stylePresets).sort((first, second) =>
		first.name.localeCompare(second.name),
	);
	return (
		<div style={{ display: "grid", gap: 8 }}>
			<label style={{ display: "grid", fontSize: 12, gap: 5 }}>
				<span>Saved road-style preset</span>
				<select
					aria-label="Saved road-style preset"
					onChange={(event) => {
						const patch = loadRoadStylePreset(node, event.currentTarget.value);
						if (patch) onUpdate(patch);
					}}
					style={fieldStyle}
					value={node.activeStyleId}
				>
					{presets.map((preset) => (
						<option key={preset.id} value={preset.id}>
							{preset.name}
						</option>
					))}
				</select>
			</label>
			<label style={{ display: "grid", fontSize: 12, gap: 5 }}>
				<span>New preset name</span>
				<input
					aria-label="New road-style preset name"
					onChange={(event) => setName(event.currentTarget.value)}
					style={fieldStyle}
					type="text"
					value={name}
				/>
			</label>
			<button
				onClick={() => onUpdate(saveRoadStylePreset(node, name))}
				style={buttonStyle}
				type="button"
			>
				Save current style as preset
			</button>
			<p style={{ color: "#94a3b8", fontSize: 11, lineHeight: 1.4, margin: 0 }}>
				Saved presets stay with the road network and are included in semantic JSON export.
			</p>
		</div>
	);
}
