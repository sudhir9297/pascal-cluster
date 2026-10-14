"use client";
import { type ReactNode } from "react";
import { useCatalogPlacement } from "../catalog-placement";
import {
	CatalogChoiceGroup,
	CatalogEmptyState,
	CatalogGrid,
	CatalogHeading,
	CatalogItemCard,
	CatalogSection,
} from "../catalog-ui";
import type { CatalogFamily } from "./catalog-families";
import { useCatalogPreferences } from "./catalog-preferences";
export default function ShowerPresetCatalog({
	title,
	prefix,
	items,
	query,
	selectedId,
	active,
	onSelect,
	renderPreview,
	hint,
	families,
}: {
	title: string;
	prefix: string;
	items: readonly { id: string; label: string }[];
	query: string;
	selectedId: string;
	active: boolean;
	onSelect: (id: string) => void;
	renderPreview: (id: string) => ReactNode;
	hint: string;
	families?: readonly CatalogFamily[];
}) {
	const preferences = useCatalogPreferences();
	const placement = useCatalogPlacement();
	const familyId =
		placement?.category?.group === `${prefix}:family`
			? placement.category.value
			: null;
	const chosenId = placement?.selection?.key.startsWith(`${prefix}:`)
		? placement.selection.key.slice(prefix.length + 1)
		: selectedId;
	const key = (id: string) => `${prefix}:${id}`;
	const choose = (id: string) => {
		preferences.remember(key(id));
		onSelect(id);
	};
	const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
	const visible = items.filter((item) => {
		const family = families?.find((family) => family.itemIds.includes(item.id));
		const text = `${title} ${family?.label ?? ""} ${item.label}`.toLowerCase();
		return words.every((word) => text.includes(word));
	});
	if (query.trim() && !visible.length) return null;
	const groups =
		families
			?.map((family) => ({
				...family,
				members: visible.filter((item) => family.itemIds.includes(item.id)),
			}))
			.filter((family) => family.members.length > 0) ?? [];
	if (families) {
		for (const item of visible) {
			if (!groups.some((family) => family.itemIds.includes(item.id)))
				groups.push({
					id: item.id,
					label: item.label,
					itemIds: [item.id],
					members: [item],
				});
		}
	}
	const family = groups.find((group) => group.id === familyId);
	const familyStyle =
		family?.members.find((item) => item.id === chosenId) ?? family?.members[0];
	const cards = (entries: typeof visible) => (
		<CatalogGrid>
			{entries.map((item) => (
				<CatalogItemCard
					key={item.id}
					aria-label={`Choose ${item.label}`}
					aria-pressed={chosenId === item.id || familyStyle?.id === item.id}
					placementKey={key(item.id)}
					placementHint={hint}
					placementLabel={`${title} · ${item.label}`}
					placementNoun={prefix.replace("bath-space:", "").replaceAll("-", " ")}
					onPlace={() => choose(item.id)}
					label={item.label}
				>
					{renderPreview(item.id)}
				</CatalogItemCard>
			))}
		</CatalogGrid>
	);

	return (
		<CatalogSection>
			<CatalogHeading
				selection={
					family ? `${family.label} · ${familyStyle?.label ?? ""}` : undefined
				}
			>
				{title}
			</CatalogHeading>
			{groups.length > 0 ? (
				<CatalogChoiceGroup
					label="Type"
					value={family?.id ?? null}
					onChange={(id) => {
						placement?.selectCategory(`${prefix}:family`, id);
					}}
					options={groups.map((group) => ({
						id: group.id,
						label: group.label,
						count: group.members.length,
						selectedStyle:
							group.id === family?.id ? familyStyle?.label : undefined,
						preview: renderPreview(
							(
								group.members.find((item) => item.id === chosenId) ??
								group.members[0]!
							).id,
						),
					}))}
				>
					{family ? cards(family.members) : null}
				</CatalogChoiceGroup>
			) : (
				cards(visible)
			)}
			{!visible.length && (
				<CatalogEmptyState>{"No matching items."}</CatalogEmptyState>
			)}
			{active && (
				<p role="status" className="text-[11px] text-muted-foreground">
					{hint} Esc to cancel.
				</p>
			)}
		</CatalogSection>
	);
}
export type ShowerCatalogFilterProps = { query: string };
