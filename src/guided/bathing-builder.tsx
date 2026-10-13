"use client";
import { showerRepairChanges } from "./shower-repair";
import AreaSummary from "./area-summary";
import { GuidedHeader } from "./guided-step";
import { CatalogPlacementProvider } from "../catalog-placement";
import { useEffect, useState } from "react";
import {
	useScene,
	type AnyNode,
	type AnyNodeId,
	type LevelNode,
} from "@pascal-app/core";
import { useEditor } from "@pascal-app/editor";
import { useViewer } from "@pascal-app/viewer";
import TapCatalog from "../taps/catalog";
import BathCatalog from "../bathtub/catalog";
import ShowerKitCatalog from "../shower-kit/catalog";
import ShowerAssemblyCatalog from "../shower-assembly/catalog";
import ShowerArmCatalog from "../shower-arm/catalog";
import ShowerHeadCatalog from "../shower-head/catalog";
import ShowerControlCatalog from "../shower-control/catalog";
import DividerCatalog from "../shower-divider/catalog";
import { tapOccupancySlot } from "../countertop-basin/tap-attachment";
import { TAP } from "../taps/schema";
import { SHOWER_ARM } from "../shower-arm/schema";
import { SHOWER_HEAD } from "../shower-head/schema";
import { SHOWER_DIVIDER } from "../shower-divider/schema";
import { CatalogScrollArea } from "../catalog-ui";
import { vanityLevelId } from "../freestanding-vanity/wall-placement";
import { setGuidedPlacementContext } from "./placement-context";
import {
	acceptBathingPlacement,
	bathingFixtures,
	bathingHead,
	bathingMetadataKey,
	bathingShowerReady,
	emptyBathingArea,
	readBathingArea,
	reconcileBathingArea,
	type BathingFlow,
	type BathingStep,
} from "./bathing-area";

const button =
	"rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40 disabled:cursor-not-allowed";
const primary = `${button} bg-primary text-primary-foreground hover:bg-primary/90`;
export default function BathingBuilder({
	levelId,
	onAccessories,
	onBrowse,
}: {
	levelId: LevelNode["id"];
	onAccessories: () => void;
	onBrowse: () => void;
}) {
	const [showShowerOptions, setShowShowerOptions] = useState(false);
	const [showParts, setShowParts] = useState(false);
	const [repairError, setRepairError] = useState("");
	const nodes = useScene((state) => state.nodes);
	const flow = reconcileBathingArea(
		readBathingArea(nodes[levelId]?.metadata?.[bathingMetadataKey]),
		nodes,
	);
	const fixtures = bathingFixtures(flow, nodes);
	const head = bathingHead(flow, nodes);
	const bathTap = fixtures.find(
		(node) =>
			String(node.type) === TAP &&
			tapOccupancySlot(node)?.hostId === flow.bathId,
	);
	const showerReady = bathingShowerReady(flow, nodes);
	const save = (next: BathingFlow) => {
		const state = useScene.getState(),
			level = state.nodes[levelId];
		if (level && !state.readOnly)
			state.updateNode(levelId, {
				metadata: { ...level.metadata, [bathingMetadataKey]: next },
			} as Partial<AnyNode>);
	};
	const stop = () => {
		useEditor.getState().setTool(null);
		useEditor.getState().setMode("select");
	};
	const select = (id: string | null) => {
		stop();
		if (id && useScene.getState().nodes[id as AnyNodeId])
			useViewer
				.getState()
				.setSelection({ levelId, selectedIds: [id as AnyNodeId] });
	};
	const go = (next: BathingFlow) => {
		stop();
		save(next);
		select(
			next.step === "bath" || next.kind === "bath"
				? next.bathId
				: next.showerId,
		);
	};
	useEffect(() => {
		setGuidedPlacementContext({
			vanityId: null,
			basinId: flow.step === "review" ? flow.bathId : null,
			showerArmId:
				flow.system === "custom" && ["head", "control"].includes(flow.step)
					? flow.showerId
					: null,
		});
		return () => setGuidedPlacementContext(null);
	}, [flow.step, flow.system, flow.showerId, flow.bathId]);
	useEffect(() => {
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
			const current = reconcileBathingArea(
				readBathingArea(state.nodes[levelId]?.metadata?.[bathingMetadataKey]),
				state.nodes,
			);
			const created = Object.values(state.nodes).filter(
				(node) =>
					!before[node.id] &&
					vanityLevelId(node.parentId, state.nodes) === levelId,
			);
			let next: BathingFlow | null = null;
			if (current.step === "divider") {
				const dividers = created.filter(
					(node) => String(node.type) === SHOWER_DIVIDER,
				);
				if (dividers.length)
					next = {
						...current,
						dividerIds: [
							...current.dividerIds,
							...dividers.map((node) => node.id),
						],
						dividerSkipped: false,
						step: "divider",
					};
			} else
				for (const node of created) {
					if (
						current.step === "head" &&
						String(node.type) === SHOWER_HEAD &&
						bathingHead(current, state.nodes)?.id === node.id
					)
						next = { ...current };
					else next = acceptBathingPlacement(current, node);
					if (next) break;
				}
			if (!next) return;
			stop();
			if (next.controlId && next.showerId && current.step === "control") {
				const control = state.nodes[next.controlId as AnyNodeId];
				if (control)
					state.updateNode(
						control.id as AnyNodeId,
						{
							metadata: {
								...control.metadata,
								bathSpaceShowerId: next.showerId,
							},
						} as Partial<AnyNode>,
					);
			}
			const level = state.nodes[levelId]!;
			state.updateNode(levelId, {
				metadata: { ...level.metadata, [bathingMetadataKey]: next },
			} as Partial<AnyNode>);
		});
	}, [levelId]);
	const choose = (kind: BathingFlow["kind"]) =>
		go({
			...flow,
			kind,
			step: kind === "shower" ? "shower" : "bath",
		});
	const changeSystem = (system: BathingFlow["system"]) => {
		if (system !== flow.system)
			go({ ...flow, system, showerId: null, controlId: null });
		setShowShowerOptions(false);
	};
	const title: Record<BathingStep, string> = {
		choice: "Bath or shower?",
		bath: "Choose a bath",
		shower:
			flow.system === "custom" ? "1. Place the shower arm" : "Choose a shower",
		head: "2. Choose the shower head",
		control: "3. Add the water control",
		review: "Review your bathing area",
		divider: "Glass divider · Optional",
		complete: "Bathing area complete",
	};
	const description: Record<BathingStep, string> = {
		choice: "",
		bath: flow.bathId
			? "Bath added. Select it to edit."
			: "Choose a style, use Place bath, then click the floor.",
		shower:
			flow.system === "custom" &&
			flow.showerId &&
			nodes[flow.showerId as AnyNodeId]
				? "Arm added. Choose a shower head next."
				: flow.showerId && showerReady
					? "Shower added. Continue to review."
					: flow.system === "custom"
						? "Choose an arm, use Place, then click a wall."
						: flow.system === "assembly"
							? "Choose a style, use Place, then click a wall."
							: "Choose a style and use Place. All parts are included.",
		head: "Choose a head, use Place, then click the shower arm.",
		control: "Place the control on the wall below the shower arm.",
		review: "Check the placement. Select an item to edit.",
		divider:
			"Click two points to draw. Press Enter to finish a rectangle, or skip.",
		complete: "Bathing area ready. Select an item to edit.",
	};
	const ready =
		flow.step === "bath"
			? Boolean(flow.bathId)
			: flow.step === "shower"
				? flow.system === "custom"
					? Boolean(
							flow.showerId &&
								String(nodes[flow.showerId as AnyNodeId]?.type) === SHOWER_ARM,
						)
					: showerReady
				: flow.step === "head"
					? Boolean(head)
					: flow.step === "control"
						? Boolean(flow.controlId)
						: flow.step === "divider"
							? flow.dividerIds.length > 0
							: true;
	const nextStep = (): BathingStep =>
		flow.step === "bath"
			? flow.kind === "both"
				? "shower"
				: "review"
			: flow.step === "shower"
				? flow.system === "custom"
					? "head"
					: "review"
				: flow.step === "head"
					? "control"
					: flow.step === "control"
						? "review"
						: flow.step === "review"
							? flow.kind === "bath"
								? "complete"
								: "divider"
							: "complete";
	const backStep = (): BathingStep =>
		flow.step === "bath"
			? "choice"
			: flow.step === "shower"
				? flow.kind === "both"
					? "bath"
					: "choice"
				: flow.step === "head"
					? "shower"
					: flow.step === "control"
						? "head"
						: flow.step === "review"
							? flow.kind === "bath"
								? "bath"
								: flow.system === "custom"
									? "control"
									: "shower"
							: "review";
	const placementStep = [
		"bath",
		"shower",
		"head",
		"control",
		"divider",
	].includes(flow.step);
	const confirmed = (
		flow.step === "bath"
			? [flow.bathId ? nodes[flow.bathId as AnyNodeId] : undefined]
			: flow.step === "head"
				? [head]
				: flow.step === "control"
					? [flow.controlId ? nodes[flow.controlId as AnyNodeId] : undefined]
					: flow.step === "divider"
						? flow.dividerIds.map((id) => nodes[id as AnyNodeId])
						: fixtures.filter((node) => node.id !== flow.bathId)
	).filter((node): node is AnyNode => Boolean(node));
	const actions = (choosing: boolean) => (
		<div className="space-y-2">
			{flow.step === "complete" ? (
				<>
					<button
						type="button"
						className={`${button} w-full`}
						onClick={() => go({ ...emptyBathingArea, dividerIds: [] })}
					>
						Add another bathing area
					</button>
					<button
						type="button"
						className={`${primary} w-full`}
						onClick={() => {
							stop();
							onAccessories();
						}}
					>
						Next: Accessories
					</button>
				</>
			) : flow.step !== "choice" ? (
				<div className="flex gap-2">
					<button
						type="button"
						className={button}
						onClick={() => go({ ...flow, step: backStep() })}
					>
						Back
					</button>
					{(ready || flow.step === "divider") && (
						<button
							type="button"
							className={`${ready && !choosing ? primary : button} flex-1`}
							disabled={!ready && flow.step !== "divider"}
							onClick={() =>
								go({
									...flow,
									step: nextStep(),
									...(flow.step === "divider"
										? { dividerSkipped: !flow.dividerIds.length }
										: {}),
								})
							}
						>
							{flow.step === "bath" && flow.kind === "both"
								? "Continue to shower"
								: flow.step === "shower" && flow.system === "custom"
									? "Continue to shower head"
									: ["bath", "shower", "control"].includes(flow.step)
										? "Continue to check"
										: flow.step === "head"
											? "Continue to controls"
											: flow.step === "review"
												? flow.kind === "bath"
													? "Finish bathing area"
													: "Continue to divider"
												: ready
													? "Finish bathing area"
													: "Skip glass divider"}
						</button>
					)}
				</div>
			) : null}
		</div>
	);
	return (
		<div className="flex h-full min-h-0 flex-col">
			<GuidedHeader
				area="Bath or shower"
				onBrowse={onBrowse}
				title={
					placementStep && ready ? "Confirm your placement" : title[flow.step]
				}
				description={
					placementStep && ready
						? "Check the position. Edit or change its style before continuing."
						: description[flow.step]
				}
				current={
					["head", "control"].includes(flow.step)
						? "shower"
						: flow.step === "divider"
							? "review"
							: flow.step
				}
				steps={
					flow.step === "choice"
						? []
						: [
								...(flow.kind !== "shower"
									? [{ id: "bath", label: "Bath", ready: Boolean(flow.bathId) }]
									: []),
								...(flow.kind !== "bath"
									? [
											{
												id: "shower",
												label: "Shower",
												ready: showerReady,
												disabled: flow.kind === "both" && !flow.bathId,
												reason:
													flow.kind === "both" && !flow.bathId
														? "Place a bath first"
														: undefined,
											},
										]
									: []),
								{
									id: "review",
									label: "Check",
									ready: flow.step === "complete",
									disabled: flow.kind === "bath" ? !flow.bathId : !showerReady,
									reason: "Place the selected fixtures and fittings first",
								},
							]
				}
				onStep={(step) => go({ ...flow, step: step as BathingStep })}
			/>
			<div className="min-h-0 flex-1">
				<CatalogPlacementProvider
					key={`${flow.step}:${flow.system}`}
					completed={
						(placementStep && ready) ||
						(flow.step === "review" && Boolean(bathTap))
					}
					footer={flow.step === "choice" ? undefined : actions}
				>
					<CatalogScrollArea
						className="min-h-0 flex-1 overflow-y-auto px-4 pb-4"
						resetKey={`${flow.step}:${flow.system}`}
					>
						{placementStep && ready && (
							<AreaSummary
								visual
								hideHeading
								title="Placed fixtures"
								levelId={levelId}
								nodes={confirmed}
							/>
						)}
						{flow.step === "choice" && (
							<div className="space-y-2">
								{(["shower", "bath", "both"] as const).map((kind) => (
									<button
										type="button"
										key={kind}
										className={`${button} w-full text-left`}
										onClick={() => choose(kind)}
									>
										{kind === "shower"
											? "Shower"
											: kind === "bath"
												? "Bath"
												: "Bath + shower"}
									</button>
								))}
							</div>
						)}
						{flow.step === "bath" && !ready && (
							<>
								<BathCatalog query="" />
								{flow.bathId && (
									<button
										type="button"
										className={`${button} mt-3 w-full`}
										onClick={() => select(flow.bathId)}
									>
										Edit my bath
									</button>
								)}
							</>
						)}
						{flow.step === "shower" && !ready && (
							<>
								<div className="mb-3 space-y-2">
									{flow.system === "kit" && !showShowerOptions && (
										<div className="rounded-md bg-accent p-3">
											<p className="text-xs font-medium">
												Complete shower · Recommended
											</p>
										</div>
									)}
									<button
										type="button"
										className="text-xs underline"
										aria-expanded={showShowerOptions}
										onClick={() => setShowShowerOptions(!showShowerOptions)}
									>
										{showShowerOptions
											? "Hide shower options"
											: "Other shower options"}
									</button>
									{showShowerOptions && (
										<div className="space-y-2">
											{(
												[
													{
														id: "kit",
														label: "Complete shower · Recommended",
														detail: "All parts included.",
													},
													{
														id: "assembly",
														label: "Shower column or panel",
														detail: "One unit with built-in outlets.",
													},
													{
														id: "custom",
														label: "Choose each part separately",
														detail: "Arm, head, then water control.",
													},
												] as const
											).map((option) => (
												<button
													type="button"
													key={option.id}
													className={`${button} w-full text-left ${flow.system === option.id ? "border-primary bg-primary/10" : ""}`}
													aria-pressed={flow.system === option.id}
													onClick={() => changeSystem(option.id)}
												>
													<span className="block">{option.label}</span>
													<span className="mt-1 block text-[11px] font-normal text-muted-foreground">
														{option.detail}
													</span>
												</button>
											))}
										</div>
									)}
								</div>
								{flow.showerId && !showerReady && flow.system !== "custom" ? (
									<div className="space-y-3">
										<p className="text-xs text-muted-foreground">
											This shower is missing included parts. Restore them while
											keeping its existing fittings.
										</p>
										<button
											type="button"
											className={primary}
											onClick={() => {
												stop();
												const state = useScene.getState();
												if (state.readOnly || !flow.showerId) return;
												const changes = showerRepairChanges(
													flow.showerId,
													state.nodes,
												);
												setRepairError("");
												if (changes) state.applyNodeChanges(changes);
												else
													setRepairError(
														"Missing parts could not be restored here. Select the shower to check its wall placement.",
													);
											}}
										>
											Restore missing shower parts
										</button>
										{repairError && (
											<p
												role="status"
												className="text-xs text-muted-foreground"
											>
												{repairError}
											</p>
										)}
										<AreaSummary
											title="Existing shower"
											levelId={levelId}
											nodes={fixtures}
										/>
									</div>
								) : flow.system === "kit" ? (
									<ShowerKitCatalog query="" />
								) : flow.system === "assembly" ? (
									<ShowerAssemblyCatalog query="" />
								) : (
									<ShowerArmCatalog query="" />
								)}
							</>
						)}
						{flow.step === "head" && !ready && (
							<>
								<button
									type="button"
									className={`${button} mb-3 w-full`}
									onClick={() => select(flow.showerId)}
								>
									Highlight my shower arm
								</button>
								<ShowerHeadCatalog query="" />
							</>
						)}
						{flow.step === "control" && !ready && (
							<ShowerControlCatalog query="" />
						)}
						{flow.step === "divider" && !ready && <DividerCatalog query="" />}
						{["review", "complete"].includes(flow.step) && (
							<div className="space-y-2">
								<AreaSummary
									visual
									hideHeading
									title="Bathing area fixtures"
									levelId={levelId}
									nodes={fixtures.filter(
										(node) =>
											node.id === flow.showerId ||
											node.id === flow.bathId ||
											node.id === bathTap?.id ||
											flow.dividerIds.includes(node.id),
									)}
								/>
								{flow.showerId &&
									fixtures.some(
										(n) =>
											n.id !== flow.showerId &&
											n.id !== flow.bathId &&
											n.id !== bathTap?.id &&
											!flow.dividerIds.includes(n.id),
									) && (
										<button
											type="button"
											className="text-xs underline"
											aria-expanded={showParts}
											onClick={() => setShowParts(!showParts)}
										>
											{showParts ? "Hide shower parts" : "Adjust shower parts"}
										</button>
									)}
								{showParts && (
									<AreaSummary
										title="Shower fittings"
										levelId={levelId}
										nodes={fixtures.filter(
											(node) =>
												node.id !== flow.showerId &&
												node.id !== flow.bathId &&
												node.id !== bathTap?.id &&
												!flow.dividerIds.includes(node.id),
										)}
									/>
								)}
							</div>
						)}
						{flow.step === "review" && flow.bathId && !bathTap && (
							<section className="mt-5 space-y-3 border-t border-border/60 pt-4">
								<h2 className="text-xs font-semibold">Add the bath tap</h2>
								<p className="text-xs text-muted-foreground">
									Choose a style and use Place tap, then click this bath’s tap
									target.
								</p>
								<TapCatalog query="" />
							</section>
						)}
					</CatalogScrollArea>
				</CatalogPlacementProvider>
			</div>
		</div>
	);
}
