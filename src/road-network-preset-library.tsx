"use client";

import { SegmentedControl, ToggleControl } from "@pascal-app/editor";
import {
	ROAD_PANEL_SELECT_CLASS,
	RoadPanelField,
} from "./road-panel-controls";
import type { RoadNetworkNode } from "./schema";

export function loadRoadStylePreset(
	node: RoadNetworkNode,
	id: string,
): Pick<RoadNetworkNode, "activeStyleId"> | null {
	return node.stylePresets[id] ? { activeStyleId: id } : null;
}

export function RoadStylePresetLibrary({
	node,
	onUpdate,
}: {
	node: RoadNetworkNode;
	onUpdate: (patch: Partial<RoadNetworkNode>) => void;
}) {
	const presets = Object.values(node.stylePresets).sort((first, second) =>
		first.name.localeCompare(second.name),
	);
	return (
		<div className="flex flex-col gap-2">
			<SegmentedControl
				onChange={(regionalPack) => onUpdate({ regionalPack })}
				options={[
					{ label: "Right driving", value: "right-driving" },
					{ label: "Left driving", value: "left-driving" },
				]}
				value={node.regionalPack}
			/>
			<RoadPanelField label="Preset">
				<select
					aria-label="Saved road-style preset"
					className={ROAD_PANEL_SELECT_CLASS}
					onChange={(event) => {
						const patch = loadRoadStylePreset(node, event.currentTarget.value);
						if (patch) onUpdate(patch);
					}}
					value={node.activeStyleId}
				>
					{presets.map((preset) => (
						<option key={preset.id} value={preset.id}>
							{preset.name}
						</option>
					))}
				</select>
			</RoadPanelField>
			<ToggleControl
				checked={node.applyStyleToAll}
				label="Apply to every segment"
				onChange={(applyStyleToAll) => onUpdate({ applyStyleToAll })}
			/>
		</div>
	);
}
