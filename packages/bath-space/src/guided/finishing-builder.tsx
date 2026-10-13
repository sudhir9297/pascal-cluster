"use client";
import BathroomReviewPanel from "./review-panel";
import AreaSummary from "./area-summary";
import { GuidedHeader } from "./guided-step";
import { CatalogPlacementProvider } from "../catalog-placement";
import { useEffect } from "react";
import {
	useScene,
	type AnyNode,
	type AnyNodeId,
	type LevelNode,
} from "@pascal-app/core";
import { useEditor } from "@pascal-app/editor";
import MirrorCatalog from "../mirror/catalog";
import LightCatalog from "../wall-light/catalog";
import TowelCatalog from "../towel-rail/catalog";
import HolderCatalog from "../toilet-paper-holder/catalog";
import type { BathroomStage } from "./workflow";
import { includedBathroomAreas } from "./setup";
import { CatalogScrollArea } from "../catalog-ui";
import {
	accessoryChoices,
	areas,
	levelFixtures,
	matchedAccessories,
	type Area,
	type ReviewIssue,
} from "./bathroom-review";
const button =
	"rounded-md border border-border px-3 py-2 text-xs hover:bg-accent disabled:opacity-40";
const primary = `${button} bg-primary text-primary-foreground hover:bg-primary/90`;
export function stopFinishingPlacement() {
	useEditor.getState().setTool(null);
	useEditor.getState().setMode("select");
}
export default function FinishingBuilder({
	levelId,
	review,
	onStage,
	onFix,
}: {
	levelId: LevelNode["id"];
	review: boolean;
	onStage: (stage: BathroomStage) => void;
	onFix: (issue: ReviewIssue) => void;
}) {
	const nodes = useScene((s) => s.nodes),
		level = nodes[levelId];
	const saved = level?.metadata?.bathSpaceAccessories as
		| { area?: Area; choice?: string; skipped?: string[] }
		| undefined;
	const included = includedBathroomAreas(levelId, nodes);
	const activeAreas = areas.filter((a) => included.includes(a.id));
	const area = activeAreas.some((a) => a.id === saved?.area)
		? saved!.area!
		: (activeAreas[0]?.id ?? "wash-area");
	const choices = accessoryChoices[area],
		choice = choices.find((c) => c.kind === saved?.choice) ?? choices[0];
	const skipped = Array.isArray(saved?.skipped) ? saved.skipped : [];
	const fixtures = levelFixtures(levelId, nodes);
	const save = (patch: Record<string, unknown>) => {
		stopFinishingPlacement();
		const state = useScene.getState(),
			host = state.nodes[levelId];
		if (host && !state.readOnly)
			state.updateNode(levelId, {
				metadata: { ...host.metadata, ...patch },
			} as Partial<AnyNode>);
	};
	const change = (nextArea: Area, nextChoice?: string) => {
		const current = useScene.getState().nodes[levelId]?.metadata
			?.bathSpaceAccessories as typeof saved;
		save({
			bathSpaceAccessories: {
				...current,
				area: nextArea,
				choice: nextChoice ?? accessoryChoices[nextArea][0].kind,
				skipped: current?.skipped ?? [],
			},
		});
	};
	useEffect(() => {
		if (review || !activeAreas.length) return;
		let previous = useScene.getState().nodes;
		return useScene.subscribe((state) => {
			const before = previous;
			previous = state.nodes;
			if (
				before === state.nodes ||
				state.readOnly ||
				!useEditor.getState().tool
			)
				return;
			const newItems = levelFixtures(levelId, state.nodes).filter(
				(n) => !before[n.id] && String(n.type) === `bath-space:${choice.kind}`,
			);
			if (!newItems.length) return;
			stopFinishingPlacement();
			for (const n of newItems)
				state.updateNode(
					n.id as AnyNodeId,
					{
						metadata: { ...n.metadata, bathSpaceAccessoryArea: area },
					} as Partial<AnyNode>,
				);
			const host = state.nodes[levelId];
			if (host)
				state.updateNode(levelId, {
					metadata: {
						...host.metadata,
						bathSpaceAccessories: {
							...saved,
							area,
							choice: choice.kind,
							skipped: skipped.filter((k) => k !== `${area}:${choice.kind}`),
						},
					},
				} as Partial<AnyNode>);
		});
	}, [levelId, review, area, choice.kind]);
	const next = () => {
		const index = choices.findIndex((c) => c.kind === choice.kind);
		if (index + 1 < choices.length) change(area, choices[index + 1]!.kind);
		else {
			const i = activeAreas.findIndex((a) => a.id === area);
			if (i < activeAreas.length - 1) change(activeAreas[i + 1]!.id);
			else onStage("review");
		}
	};
	if (review)
		return (
			<BathroomReviewPanel
				levelId={levelId}
				onStage={onStage}
				onFix={onFix}
				onAccessory={(area, kind) => {
					change(area, kind);
					onStage("accessories");
				}}
			/>
		);
	if (!review && !activeAreas.length)
		return (
			<div className="space-y-3 p-4">
				<p className="text-xs text-muted-foreground">
					No areas need accessories.
				</p>
				<button
					type="button"
					className={primary}
					onClick={() => onStage("review")}
				>
					Review bathroom
				</button>
			</div>
		);
	const matches = matchedAccessories(area, choice.kind, fixtures);
	const unassigned = fixtures.filter(
		(n) =>
			String(n.type) === `bath-space:${choice.kind}` &&
			!n.metadata?.bathSpaceAccessoryArea &&
			!matches.some((m) => m.id === n.id),
	);
	const choiceIndex = choices.findIndex((item) => item.kind === choice.kind);
	const areaIndex = activeAreas.findIndex((item) => item.id === area);
	const nextLabel =
		choiceIndex < choices.length - 1
			? `Continue to ${choices[choiceIndex + 1]!.label.toLowerCase()}`
			: areaIndex < activeAreas.length - 1
				? `Continue to ${activeAreas[areaIndex + 1]!.label.toLowerCase()}`
				: "Continue to review";
	const actions = (
		<div className="space-y-2">
			{matches.length > 0 ? (
				<button
					type="button"
					className={`${primary} min-h-9 w-full`}
					onClick={next}
				>
					{nextLabel}
				</button>
			) : (
				<button
					type="button"
					className={`${button} min-h-9 w-full`}
					onClick={() => {
						save({
							bathSpaceAccessories: {
								...saved,
								area,
								choice: choice.kind,
								skipped: [...new Set([...skipped, `${area}:${choice.kind}`])],
							},
						});
						next();
					}}
				>
					Skip this accessory
				</button>
			)}
			<button
				type="button"
				className="min-h-8 w-full rounded-md text-xs text-muted-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
				onClick={() => onStage("review")}
			>
				Go to review
			</button>
		</div>
	);
	return (
		<div className="flex h-full min-h-0 flex-col">
			<GuidedHeader
				area="Accessories"
				title={
					matches.length
						? `Confirm ${choice.label.toLowerCase()}`
						: `${choice.label} · Optional`
				}
				description={
					matches.length
						? "Check the position, then continue to the next accessory."
						: `Choose a style and use Place, or skip. ${choice.hint}`
				}
			/>
			<div className="min-h-0 flex-1">
				<CatalogPlacementProvider
					key={`${area}:${choice.kind}`}
					completed={matches.length > 0}
					footer={actions}
				>
					<CatalogScrollArea
						resetKey={`${review}:${area}:${choice.kind}`}
						className="min-h-0 flex-1 overflow-y-auto"
					>
						<div className="space-y-4 px-4 pb-4">
							<nav
								aria-label="Accessory areas"
								className="flex flex-wrap gap-1"
							>
								{activeAreas.map((a) => (
									<button
										type="button"
										key={a.id}
										className={`${button} ${a.id === area ? "bg-secondary font-medium" : ""}`}
										aria-current={a.id === area ? "step" : undefined}
										onClick={() => change(a.id)}
									>
										{a.label}
									</button>
								))}
							</nav>
							<nav
								aria-label="Accessory types"
								className="flex flex-wrap gap-1"
							>
								{choices.map((c) => (
									<button
										type="button"
										key={c.kind}
										className={`${button} ${choice.kind === c.kind ? "bg-secondary font-medium" : ""}`}
										aria-pressed={choice.kind === c.kind}
										onClick={() => change(area, c.kind)}
									>
										{c.label}
									</button>
								))}
							</nav>
							{unassigned.map((n) => (
								<button
									type="button"
									key={n.id}
									className={`${button} w-full`}
									onClick={() => {
										stopFinishingPlacement();
										useScene.getState().updateNode(
											n.id as AnyNodeId,
											{
												metadata: {
													...n.metadata,
													bathSpaceAccessoryArea: area,
												},
											} as Partial<AnyNode>,
										);
									}}
								>
									Use existing {n.name || choice.label}
								</button>
							))}
							{matches.length > 0 ? (
								<AreaSummary
									visual
									hideHeading
									title="Placed accessories"
									levelId={levelId}
									nodes={matches}
								/>
							) : (
								<>
									{choice.kind === "mirror" ? (
										<MirrorCatalog query="" />
									) : choice.kind === "wall-light" ? (
										<LightCatalog query="" />
									) : choice.kind === "toilet-paper-holder" ? (
										<HolderCatalog query="" />
									) : (
										<TowelCatalog query="" />
									)}
								</>
							)}
						</div>
					</CatalogScrollArea>
				</CatalogPlacementProvider>
			</div>
		</div>
	);
}
