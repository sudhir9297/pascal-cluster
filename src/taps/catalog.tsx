"use client";

import { useEditor } from "@pascal-app/editor";
import { useCatalogPlacement } from "../catalog-placement";
import {
	CatalogChoiceGroup,
	CatalogEmptyState,
	CatalogGrid,
	CatalogHeading,
	CatalogItemCard,
	CatalogSection,
} from "../catalog-ui";
import { useCatalogPreferences } from "../shower-common/catalog-preferences";
import {
	setTapPlacementPreset,
	useTapPlacementPreset,
} from "./placement-settings";
import { getTapPreset, tapPresets } from "./presets";
import { TAP } from "./schema";

export default function TapCatalog({ query }: { query: string }) {
	const preferences = useCatalogPreferences();

	const key = (id: string) => `tap:${id}`;
	const selected = useTapPlacementPreset();
	const placement = useCatalogPlacement();
	const mount =
		placement?.category?.group === "taps:mounting"
			? placement.category.value
			: placement?.category?.group === "catalog" &&
					placement.category.value === "Taps"
				? "countertop"
				: null;
	const chosenId = placement?.selection?.key.startsWith("taps:")
		? placement.selection.key.slice(5)
		: selected;
	const placing = useEditor((state) => state.tool === TAP);
	const setTool = useEditor((state) => state.setTool);
	const search = query.trim().toLowerCase();
	const words = search.split(/\s+/).filter(Boolean);
	const groups = (["countertop", "wall"] as const)
		.map((mount) => {
			return {
				mount,
				items: tapPresets.filter(
					(preset) =>
						preset.mount === mount &&
						words.every((word) =>
							`tap taps ${mount === "wall" ? "wall mounted" : "countertop"} ${preset.label}`
								.toLowerCase()
								.includes(word),
						),
				),
			};
		})
		.filter(({ items }) => items.length > 0);
	const matching = groups.flatMap((group) => group.items);
	if (query.trim() && !matching.length) return null;
	const group = groups.find((group) => group.mount === mount);
	const style =
		group?.items.find((item) => item.id === chosenId) ?? group?.items[0];
	return (
		<CatalogSection>
			<div className="space-y-3">
				<CatalogHeading count={matching.length}>Taps</CatalogHeading>
				<div className="space-y-5">
					{groups.length > 0 && (
						<CatalogChoiceGroup
							value={group?.mount ?? null}
							onChange={(id) => {
								placement?.selectCategory("taps:mounting", id);
							}}
							options={groups.map((option) => ({
								id: option.mount,
								label:
									option.mount === "countertop" ? "Countertop" : "Wall-mounted",
								count: option.items.length,
								selectedStyle:
									group?.mount === option.mount ? style?.label : undefined,
								preview: (
									<img
										src={
											(
												option.items.find((item) => item.id === chosenId) ??
												option.items[0]!
											).thumbnail
										}
										alt=""
										className="h-full w-full object-contain"
									/>
								),
							}))}
						>
							{group && (
								<CatalogGrid
									aria-label={`${group.mount === "countertop" ? "Countertop" : "Wall mounted"} taps`}
								>
									{group.items.map((preset) => (
										<div key={preset.id} className="group relative">
											<CatalogItemCard
												type="button"
												aria-label={`Choose ${preset.label} tap`}
												aria-pressed={style?.id === preset.id}
												placementKey={`taps:${preset.id}`}
												placementNoun="tap"
												placementHint={
													preset.mount === "wall"
														? "Click a wall to attach."
														: "Click a basin to attach or replace its tap."
												}
												onPlace={() => {
													preferences.remember(key(preset.id));
													setTapPlacementPreset(preset.id);
													setTool(TAP);
												}}
												label={preset.label}
											>
												<img
													src={preset.thumbnail}
													alt=""
													loading="lazy"
													className="h-full w-full object-contain"
												/>
											</CatalogItemCard>
										</div>
									))}
								</CatalogGrid>
							)}
						</CatalogChoiceGroup>
					)}
					{matching.length === 0 && (
						<CatalogEmptyState>{"No matching taps."}</CatalogEmptyState>
					)}
					{placing && (
						<p
							role="status"
							className="text-[11px] leading-relaxed text-muted-foreground"
						>
							{getTapPreset(selected).mount === "wall"
								? "Click a wall to attach."
								: "Click a basin to attach or replace its tap."}{" "}
							Esc to cancel.
						</p>
					)}
				</div>
			</div>
		</CatalogSection>
	);
}
