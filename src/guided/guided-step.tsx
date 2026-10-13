"use client";
import type { ReactNode } from "react";
import AreaHeading from "./area-heading";

export type GuidedStepItem = {
	id: string;
	label: string;
	ready?: boolean;
	disabled?: boolean;
	reason?: string;
};
export function GuidedHeader({
	area,
	title,
	description,
	steps = [],
	current,
	onStep,
	onBrowse,
	children,
}: {
	area: string;
	title: string;
	description: string;
	steps?: GuidedStepItem[];
	current?: string;
	onStep?: (id: string) => void;
	onBrowse?: () => void;
	children?: ReactNode;
}) {
	return (
		<header className="shrink-0 space-y-3 px-4 py-4">
			{onBrowse ? (
				<AreaHeading title={area} onBrowse={onBrowse} />
			) : (
				<h1 className="text-sm font-semibold">{area}</h1>
			)}
			{steps.length > 0 && (
				<nav aria-label={`${area} steps`} className="flex gap-1">
					{steps.map((step, index) => (
						<button
							type="button"
							key={step.id}
							aria-current={current === step.id ? "step" : undefined}
							disabled={step.disabled}
							title={step.reason}
							onClick={() => onStep?.(step.id)}
							className={`min-h-8 min-w-0 flex-1 rounded-md px-1 py-1.5 text-xs focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40 ${current === step.id ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-accent/40"}`}
						>
							<span aria-hidden="true" className="mr-1">
								{step.ready ? "✓" : index + 1}
							</span>
							{step.label}
						</button>
					))}
				</nav>
			)}
			<div>
				<h2 className="text-sm font-semibold">{title}</h2>
				<p
					role="status"
					className="mt-1 text-xs leading-relaxed text-muted-foreground"
				>
					{description}
				</p>
			</div>
			{children}
		</header>
	);
}
