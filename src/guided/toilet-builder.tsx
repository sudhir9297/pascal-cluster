"use client";
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
import { useViewer } from "@pascal-app/viewer";
import ToiletCatalog from "../wall-hung-toilet/catalog";
import FloorToiletCatalog from "../floor-standing-toilet/catalog";
import HolderCatalog from "../toilet-paper-holder/catalog";
import { CatalogScrollArea } from "../catalog-ui";
import { vanityLevelId } from "../freestanding-vanity/wall-placement";
import {
	defaultToiletControl,
	ToiletNode,
	toiletFlushControls,
} from "../flush-control/attachment";
import {
	acceptToiletPlacement,
	emptyToilet,
	readToilet,
	reconcileToilet,
	toiletMetadataKey,
	type ToiletFlow,
	type ToiletStep,
} from "./toilet";
const button =
	"rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40 disabled:cursor-not-allowed";
const primary = `${button} bg-primary text-primary-foreground hover:bg-primary/90`;
const steps: { id: ToiletStep; label: string }[] = [
	{ id: "toilet", label: "Toilet" },
	{ id: "flush", label: "Flush" },
	{ id: "holder", label: "Holder" },
];
function stop() {
	useEditor.getState().setTool(null);
	useEditor.getState().setMode("select");
}
export default function ToiletBuilder({
	levelId,
	onBathing,
	onBrowse,
}: {
	levelId: LevelNode["id"];
	onBathing: () => void;
	onBrowse: () => void;
}) {
	const nodes = useScene((state) => state.nodes);
	const flow = reconcileToilet(
		readToilet(nodes[levelId]?.metadata?.[toiletMetadataKey]),
		nodes,
	);
	const toilet = flow.toiletId ? nodes[flow.toiletId as AnyNodeId] : undefined;
	const control = flow.toiletId
		? toiletFlushControls(flow.toiletId, nodes)[0]
		: undefined;
	const holder = flow.holderId ? nodes[flow.holderId as AnyNodeId] : undefined;
	const save = (next: ToiletFlow) => {
		const state = useScene.getState(),
			level = state.nodes[levelId];
		if (level && !state.readOnly)
			state.updateNode(levelId, {
				metadata: { ...level.metadata, [toiletMetadataKey]: next },
			} as Partial<AnyNode>);
	};
	const select = (id?: string) => {
		stop();
		if (id)
			useViewer
				.getState()
				.setSelection({ levelId, selectedIds: [id as AnyNodeId] });
	};
	const go = (next: ToiletFlow) => {
		stop();
		save(next);
		select(next.step === "flush" ? control?.id : (next.toiletId ?? undefined));
	};
	useEffect(() => {
		let previous = useScene.getState().nodes;
		return useScene.subscribe((state) => {
			const before = previous;
			previous = state.nodes;
			if (before === state.nodes || !useEditor.getState().tool) return;
			const current = reconcileToilet(
				readToilet(state.nodes[levelId]?.metadata?.[toiletMetadataKey]),
				state.nodes,
			);
			for (const node of Object.values(state.nodes)) {
				if (
					before[node.id] ||
					vanityLevelId(node.parentId, state.nodes) !== levelId
				)
					continue;
				const next = acceptToiletPlacement(current, node);
				if (!next) continue;
				stop();
				const level = state.nodes[levelId]!;
				state.updateNode(levelId, {
					metadata: { ...level.metadata, [toiletMetadataKey]: next },
				} as Partial<AnyNode>);
				return;
			}
		});
	}, [levelId]);
	const restoreControl = () => {
		const state = useScene.getState();
		if (
			!toilet ||
			state.readOnly ||
			toiletFlushControls(toilet.id, state.nodes).length
		)
			return;
		const parsed = ToiletNode.safeParse(toilet);
		const replacement = parsed.success
			? defaultToiletControl(parsed.data, state.nodes)
			: null;
		if (!replacement) return;
		state.applyNodeChanges({
			create: [
				{
					node: replacement as unknown as AnyNode,
					parentId: replacement.parentId as AnyNodeId,
				},
			],
		});
		select(replacement.id);
	};
	const ready =
		flow.step === "toilet"
			? Boolean(toilet)
			: flow.step === "holder"
				? Boolean(holder)
				: flow.step === "flush"
					? Boolean(control)
					: true;
	const actions = (
		<div className="space-y-2">
			{flow.step === "complete" ? (
				<>
					<button
						type="button"
						className={`${button} w-full`}
						onClick={() => go({ ...emptyToilet })}
					>
						Add another toilet area
					</button>
					<button
						type="button"
						className={`${primary} w-full`}
						onClick={() => {
							stop();
							onBathing();
						}}
					>
						Continue to next area
					</button>
				</>
			) : (
				<div className="flex gap-2">
					{flow.step !== "toilet" && (
						<button
							type="button"
							className={button}
							onClick={() =>
								go({
									...flow,
									step: flow.step === "flush" ? "toilet" : "flush",
								})
							}
						>
							Back
						</button>
					)}
					{(ready || flow.step === "holder" || flow.step === "flush") && (
						<button
							type="button"
							className={`${ready ? primary : button} flex-1`}
							disabled={
								flow.step === "toilet"
									? !toilet
									: flow.step === "flush"
										? !control
										: false
							}
							onClick={() =>
								go({
									...flow,
									step:
										flow.step === "toilet"
											? "flush"
											: flow.step === "flush"
												? "holder"
												: "complete",
									...(flow.step === "holder" ? { holderSkipped: !holder } : {}),
								})
							}
						>
							{flow.step === "toilet"
								? "Continue to flush control"
								: flow.step === "flush"
									? "Continue to paper holder"
									: holder
										? "Finish toilet area"
										: "Skip paper holder"}
						</button>
					)}
				</div>
			)}
		</div>
	);
	return (
		<div className="flex h-full min-h-0 flex-col">
			<GuidedHeader
				area="Toilet area"
				onBrowse={onBrowse}
				title={
					flow.step === "complete"
						? "Toilet area complete"
						: flow.step === "flush"
							? "Confirm the flush control"
							: flow.step === "holder"
								? "Paper holder · Optional"
								: toilet
									? "Confirm your toilet"
									: "Choose a toilet"
				}
				description={
					flow.step === "complete"
						? "Your fixtures are saved. You can edit them below."
						: flow.step === "flush"
							? control
								? "The flush control is included. Check it before continuing."
								: "Restore the missing flush control to continue."
							: flow.step === "holder"
								? holder
									? "Paper holder placed. Check its position, then continue."
									: "Choose a style and use Place, or skip this accessory."
								: toilet
									? "Check the position. Edit or change its style before continuing."
									: "Choose the mounting and a style, then use Place toilet."
				}
				current={flow.step}
				steps={steps.map((step) => ({
					...step,
					ready:
						step.id === "toilet"
							? Boolean(toilet)
							: step.id === "flush"
								? Boolean(control)
								: Boolean(holder),
					disabled:
						step.id !== "toilet" &&
						(!toilet || (step.id === "holder" && !control)),
					reason: !toilet
						? "Place a toilet first"
						: !control
							? "Restore the flush control first"
							: undefined,
				}))}
				onStep={(step) => go({ ...flow, step: step as ToiletStep })}
			/>
			<div className="min-h-0 flex-1">
				<CatalogPlacementProvider
					key={`${flow.step}:${flow.mounting}`}
					completed={ready}
					footer={flow.step === "toilet" && !ready ? undefined : actions}
				>
					<CatalogScrollArea
						className="min-h-0 flex-1 overflow-y-auto px-4 pb-4"
						resetKey={flow.step}
					>
						{flow.step === "toilet" && !toilet && (
							<>
								<div className="mb-4 flex gap-2">
									{(["wall", "floor"] as const).map((mounting) => (
										<button
											type="button"
											key={mounting}
											className={`${button} flex-1 ${flow.mounting === mounting ? "border-primary bg-primary/10" : ""}`}
											aria-pressed={flow.mounting === mounting}
											onClick={() => go({ ...flow, mounting })}
										>
											{mounting === "wall" ? "Wall-hung" : "Floor-standing"}
										</button>
									))}
								</div>
								{flow.mounting === "wall" ? (
									<ToiletCatalog query="" />
								) : flow.mounting === "floor" ? (
									<FloorToiletCatalog query="" />
								) : null}
							</>
						)}
						{ready && flow.step !== "complete" && flow.step !== "flush" && (
							<AreaSummary
								visual
								hideHeading
								title="Placed fixture"
								levelId={levelId}
								nodes={[flow.step === "holder" ? holder : toilet].filter(
									(node): node is AnyNode => Boolean(node),
								)}
							/>
						)}
						{flow.step === "flush" &&
							(control ? (
								<AreaSummary
									visual
									hideHeading
									title="Included flush control"
									levelId={levelId}
									nodes={[control]}
								/>
							) : (
								<button
									type="button"
									className={`${primary} w-full`}
									onClick={restoreControl}
								>
									Restore flush control
								</button>
							))}
						{flow.step === "holder" && !holder && (
							<>
								<button
									type="button"
									className={`${button} mb-3 w-full`}
									onClick={() => select(toilet?.id)}
								>
									Highlight my toilet
								</button>
								<HolderCatalog query="" />
							</>
						)}
						{flow.step === "complete" && (
							<AreaSummary
								title="Toilet area fixtures"
								levelId={levelId}
								nodes={[toilet, control, holder].filter(
									(node): node is AnyNode => Boolean(node),
								)}
							/>
						)}
					</CatalogScrollArea>
				</CatalogPlacementProvider>
			</div>
		</div>
	);
}
