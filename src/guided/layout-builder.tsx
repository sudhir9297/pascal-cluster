"use client";
import { useEffect, useState } from "react";
import { useScene, type LevelNode } from "@pascal-app/core";
import { useEditor } from "@pascal-app/editor";
import BathSpaceCatalog from "../catalog-panel";
import { CatalogPlacementProvider } from "../catalog-placement";
import { CatalogScrollArea } from "../catalog-ui";
import ShowerKitCatalog from "../shower-kit/catalog";
import ShowerAssemblyCatalog from "../shower-assembly/catalog";
import ShowerArmCatalog from "../shower-arm/catalog";
import { GuidedHeader } from "./guided-step";
import AreaSummary from "./area-summary";
import { bathroomLayout, type LayoutTarget } from "./layout";

export default function LayoutBuilder({
	levelId,
	onFinish,
	onWashArea,
}: {
	levelId: LevelNode["id"];
	onFinish: () => void;
	onWashArea: () => void;
}) {
	const nodes = useScene((state) => state.nodes);
	const layout = bathroomLayout(levelId, nodes);
	const [target, setTarget] = useState<LayoutTarget>(
		() =>
			layout.find((fixture) => !fixture.node)?.id ??
			layout[0]?.id ??
			"wash-area",
	);
	const [withoutVanity, setWithoutVanity] = useState(false);
	const [system, setSystem] = useState<"kit" | "assembly" | "custom">("kit");
	const current = layout.find((fixture) => fixture.id === target) ?? layout[0];
	const index = layout.findIndex((fixture) => fixture.id === current?.id);
	const ready = layout.length > 0 && layout.every((fixture) => fixture.node);
	const stop = () => {
		useEditor.getState().setTool(null);
		useEditor.getState().setMode("select");
	};
	const go = (next: LayoutTarget) => {
		stop();
		setTarget(next);
	};
	useEffect(() => {
		if (current?.node) stop();
	}, [current?.node?.id]);
	const next = layout[index + 1];
	const actions = (
		<div className="space-y-2">
			{current?.node && (
				<div className="flex gap-2">
					{index > 0 && (
						<button
							type="button"
							onClick={() => go(layout[index - 1]!.id)}
							className="min-h-9 rounded-md border border-border px-3 text-xs"
						>
							Back
						</button>
					)}
					<button
						type="button"
						onClick={() => {
							if (next) go(next.id);
							else if (ready) {
								stop();
								onFinish();
							} else go(layout.find((fixture) => !fixture.node)!.id);
						}}
						className="min-h-9 flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-ring"
					>
						{next
							? `Continue to ${next.label.toLowerCase()}`
							: ready
								? "Continue to fittings"
								: "Continue placing fixtures"}
					</button>
				</div>
			)}
			{current?.id === "wash-area" && current.node && (
				<button
					type="button"
					onClick={() => {
						stop();
						onWashArea();
					}}
					className="min-h-8 w-full rounded-md text-xs text-muted-foreground hover:bg-accent"
				>
					Add basin and tap
				</button>
			)}
		</div>
	);
	return (
		<div className="flex h-full min-h-0 flex-col">
			<GuidedHeader
				area="Layout"
				title={
					current?.node
						? `Confirm your ${current.label.toLowerCase()}`
						: `Choose your ${current?.label.toLowerCase() ?? "fixture"}`
				}
				description={
					current?.node
						? "Check spacing and door access in the scene before continuing."
						: "Place the main fixtures first. Choose a style, then use Place."
				}
				current={current?.id}
				steps={layout.map((fixture) => ({
					id: fixture.id,
					label: fixture.label,
					ready: Boolean(fixture.node),
				}))}
				onStep={(id) => go(id as LayoutTarget)}
			>
				{!current?.node && current?.id === "wash-area" && (
					<button
						type="button"
						className="min-h-8 text-left text-xs underline"
						onClick={() => {
							stop();
							setWithoutVanity(!withoutVanity);
						}}
					>
						{withoutVanity
							? "Use a vanity instead"
							: "Use a basin without a vanity"}
					</button>
				)}
				{!current?.node && current?.id === "shower" && (
					<select
						aria-label="Shower system"
						value={system}
						onChange={(event) => {
							stop();
							setSystem(event.target.value as typeof system);
						}}
						className="min-h-9 w-full rounded-md border border-border bg-background px-2 text-xs"
					>
						<option value="kit">Complete shower</option>
						<option value="assembly">Shower column or panel</option>
						<option value="custom">Choose each part separately</option>
					</select>
				)}
			</GuidedHeader>
			<div className="min-h-0 flex-1">
				{current?.node ? (
					<CatalogPlacementProvider completed footer={actions}>
						<CatalogScrollArea
							resetKey={current.id}
							className="min-h-0 flex-1 overflow-y-auto px-4 pb-4"
						>
							<AreaSummary
								visual
								hideHeading
								title="Placed fixture"
								levelId={levelId}
								nodes={[current.node]}
							/>
						</CatalogScrollArea>
					</CatalogPlacementProvider>
				) : current?.id === "shower" ? (
					<CatalogPlacementProvider key={system}>
						<CatalogScrollArea
							resetKey={system}
							className="min-h-0 flex-1 overflow-y-auto px-4 pb-4"
						>
							{system === "kit" ? (
								<ShowerKitCatalog query="" />
							) : system === "assembly" ? (
								<ShowerAssemblyCatalog query="" />
							) : (
								<ShowerArmCatalog query="" />
							)}
						</CatalogScrollArea>
					</CatalogPlacementProvider>
				) : (
					<BathSpaceCatalog
						key={`${current?.id}:${withoutVanity}`}
						category={
							current?.id === "wash-area"
								? withoutVanity
									? "Basin"
									: "Vanity"
								: current?.id === "toilet"
									? "Toilet"
									: "Bath"
						}
						basinMount={withoutVanity ? "wall" : undefined}
					/>
				)}
			</div>
		</div>
	);
}
