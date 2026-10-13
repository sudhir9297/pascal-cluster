"use client";
import { useScene, type AnyNode, type LevelNode } from "@pascal-app/core";
import { CatalogScrollArea } from "../catalog-ui";
import {
	bathroomWorkflow,
	nextBathroomStage,
	type BathroomStage,
} from "./workflow";

export default function WorkflowOverview({
	levelId,
	stage,
	expanded,
	onStage,
	onOverview,
}: {
	levelId: LevelNode["id"];
	stage: BathroomStage;
	expanded: boolean;
	onStage: (stage: BathroomStage) => void;
	onOverview: () => void;
}) {
	const nodes = useScene((state) => state.nodes);
	const workflow = bathroomWorkflow(levelId, nodes);
	const included = workflow.filter((area) => area.status !== "Not included");
	const complete = included.filter((area) => area.status === "Complete").length;
	const exclude = (id: BathroomStage) => {
		const state = useScene.getState(),
			level = state.nodes[levelId];
		if (!level || state.readOnly) return;
		const previous = level.metadata?.bathSpaceExcludedAreas;
		state.updateNode(levelId, {
			metadata: {
				...level.metadata,
				bathSpaceExcludedAreas: [
					...new Set([...(Array.isArray(previous) ? previous : []), id]),
				],
				bathSpaceReviewed: false,
			},
		} as Partial<AnyNode>);
	};
	if (!expanded)
		return (
			<nav
				aria-label="Bathroom navigation"
				className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-2"
			>
				<button
					type="button"
					onClick={onOverview}
					className="min-h-8 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
				>
					← All areas
				</button>
				<span className="text-[11px] text-muted-foreground">
					{complete} of {included.length} complete
				</span>
			</nav>
		);
	return (
		<div className="flex h-full min-h-0 flex-col">
			<header className="shrink-0 space-y-2 px-4 py-4">
				<h1 className="text-sm font-semibold">Your bathroom</h1>
				<p className="text-xs leading-relaxed text-muted-foreground">
					Work through each area at your own pace. Your choices are saved as you
					go.
				</p>
				<p className="text-[11px] text-muted-foreground">
					{complete} of {included.length} areas complete
				</p>
				<progress
					aria-label="Bathroom area progress"
					max={included.length}
					value={complete}
					className="block h-1 w-full accent-primary"
				/>
			</header>
			<CatalogScrollArea
				resetKey="overview"
				className="min-h-0 flex-1 overflow-y-auto px-4 pb-4"
			>
				<nav aria-label="Bathroom areas" className="divide-y divide-border/60">
					{workflow.map((area) => (
						<div key={area.id} className="flex items-center gap-1">
							<button
								type="button"
								key={area.id}
								onClick={() => onStage(area.id)}
								className="flex min-h-16 min-w-0 flex-1 items-center justify-between gap-3 rounded-md px-2 py-3 text-left hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-ring"
							>
								<span className="min-w-0">
									<span className="block text-xs font-medium">
										{area.label}
									</span>
									<span className="mt-1 block text-[11px] text-muted-foreground">
										{area.id === "accessories" ? "Optional · " : ""}
										{area.status}
									</span>
								</span>
								<span aria-hidden="true" className="text-muted-foreground">
									{area.status === "Complete" ? "✓" : "→"}
								</span>
							</button>
							{["wash-area", "toilet", "bathing"].includes(area.id) &&
								area.status === "Not started" && (
									<button
										type="button"
										aria-label={`Skip ${area.label.toLowerCase()}`}
										onClick={() => exclude(area.id)}
										className="min-h-8 shrink-0 rounded-md px-2 text-[11px] text-muted-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
									>
										Skip area
									</button>
								)}
						</div>
					))}
				</nav>
			</CatalogScrollArea>
			<footer className="shrink-0 border-t border-border px-4 py-3">
				<button
					type="button"
					className="min-h-9 w-full rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-ring"
					onClick={() => onStage(nextBathroomStage(workflow))}
				>
					{complete ? "Continue bathroom" : "Start bathroom"}
				</button>
			</footer>
		</div>
	);
}
