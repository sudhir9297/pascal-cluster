"use client";

import type { ReactNode } from "react";

export const ROAD_PANEL_SELECT_CLASS =
	"h-9 w-full rounded-lg border border-border/50 bg-[#2C2C2E] px-3 text-foreground text-sm outline-none transition-colors hover:bg-[#3e3e3e] focus:border-primary/60";

export function RoadPanelField({
	children,
	label,
}: {
	children: ReactNode;
	label: string;
}) {
	return (
		<label className="flex flex-col gap-1.5">
			<span className="px-1 text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
				{label}
			</span>
			{children}
		</label>
	);
}

export function RoadPanelSubheading({ children }: { children: ReactNode }) {
	return (
		<div className="px-1 pt-1 font-medium text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
			{children}
		</div>
	);
}

export function RoadPanelEmpty({ children }: { children: ReactNode }) {
	return <div className="px-1 py-1 text-muted-foreground text-xs">{children}</div>;
}

export function RoadPanelStatus({ children }: { children: ReactNode }) {
	return (
		<div
			aria-live="polite"
			className="rounded-lg border border-border/40 bg-white/[0.03] px-3 py-2 text-muted-foreground text-xs"
		>
			{children}
		</div>
	);
}
