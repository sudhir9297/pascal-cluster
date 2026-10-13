"use client";

import { useCatalogPreferences } from "../shower-common/catalog-preferences";
import { useEditor } from "@pascal-app/editor";
import { getTapPreset, tapPresets } from "./presets";
import {
	setTapPlacementPreset,
	useTapPlacementPreset,
} from "./placement-settings";
import { TAP } from "./schema";
import {
	CatalogEmptyState,
	CatalogGrid,
	CatalogItemCard,
	CatalogHeading,
	CatalogSection,
} from "../catalog-ui";

export default function TapCatalog({ query }: { query: string }) {
	const preferences = useCatalogPreferences();

	const key = (id: string) => `tap:${id}`;
	const selected = useTapPlacementPreset();
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
	return (
		<CatalogSection>
			<div className="space-y-3">
				<CatalogHeading count={matching.length}>Taps</CatalogHeading>
				<div className="space-y-5">
					{groups.map(({ mount, items }) => (
						<section key={mount} className="space-y-3">
							<CatalogHeading>
								{mount === "countertop" ? "Countertop" : "Wall mounted"}
							</CatalogHeading>
							<CatalogGrid
								aria-label={`${mount === "countertop" ? "Countertop" : "Wall mounted"} taps`}
							>
								{items.map((preset) => (
									<div key={preset.id} className="group relative">
										<CatalogItemCard
											type="button"
											aria-label={`Choose ${preset.label} tap`}
											aria-pressed={placing && selected === preset.id}
											placementKey={"taps:" + preset.id}
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
						</section>
					))}
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
