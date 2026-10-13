"use client";

import { useEffect, useRef } from "react";
import FixtureSchedulePanel from "./schedule-panel";

export default function FixtureScheduleDialog({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const dialog = useRef<HTMLDialogElement>(null);
	useEffect(() => {
		const element = dialog.current;
		if (!element) return;
		if (open && !element.open) element.showModal();
		else if (!open && element.open) element.close();
	}, [open]);
	return (
		<dialog
			ref={dialog}
			aria-labelledby="bath-space-schedule-title"
			onCancel={(event) => {
				event.preventDefault();
				onClose();
			}}
			onClose={onClose}
			className="m-auto w-[calc(100%-2rem)] max-w-5xl rounded-xl border border-border bg-background p-0 text-foreground shadow-xl backdrop:bg-black/60"
		>
			{open && (
				<div className="flex max-h-[85dvh] flex-col">
					<header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-4">
						<div>
							<h2
								id="bath-space-schedule-title"
								className="text-base font-semibold"
							>
								Fixture schedule
							</h2>
							<p className="mt-1 text-xs text-muted-foreground">
								Review dimensions, finishes, and floors. Fixture exports use the
								current filters and millimetres. Project plans include all
								floors.
							</p>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="min-h-9 rounded-lg px-3 text-xs hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-ring"
						>
							Close{" "}
							<kbd className="ml-1 text-[11px] text-muted-foreground">Esc</kbd>
						</button>
					</header>
					<div className="min-h-0 overflow-y-auto overscroll-contain px-6 pb-6">
						<FixtureSchedulePanel expanded onSelect={onClose} />
					</div>
				</div>
			)}
		</dialog>
	);
}
