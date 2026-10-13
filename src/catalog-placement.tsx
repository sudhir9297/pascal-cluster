"use client";

import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
	type ReactNode,
} from "react";
import { useScene } from "@pascal-app/core";
import { useEditor } from "@pascal-app/editor";

type CatalogSelection = {
	key: string;
	label: string;
	description?: ReactNode;
	noun: string;
	hint: string;
	preview: ReactNode;
	place: () => void;
};
const CatalogPlacement = createContext<{
	selection: CatalogSelection | null;
	select: (selection: CatalogSelection) => void;
	clear: () => void;
} | null>(null);

export function useCatalogPlacement() {
	return useContext(CatalogPlacement);
}

function stopPlacement() {
	const editor = useEditor.getState();
	editor.setTool(null);
	editor.setMode("select");
}

export function CatalogPlacementProvider({
	children,
	footer,
	completed = false,
}: {
	children: ReactNode;
	footer?: ReactNode | ((choosing: boolean) => ReactNode);
	completed?: boolean;
}) {
	const [selection, setSelection] = useState<CatalogSelection | null>(null);
	const [armedTool, setArmedTool] = useState<string | null>(null);
	const tool = useEditor((state) => state.tool);
	const readOnly = useScene((state) => state.readOnly);
	const select = useCallback((next: CatalogSelection) => {
		stopPlacement();
		setArmedTool(null);
		setSelection(next);
	}, []);
	const clear = useCallback(() => {
		stopPlacement();
		setArmedTool(null);
		setSelection(null);
	}, []);
	const value = useMemo(
		() => ({ selection, select, clear }),
		[selection, select, clear],
	);
	const placing = !readOnly && armedTool !== null && tool === armedTool;
	return (
		<CatalogPlacement.Provider value={value}>
			<div className="flex h-full min-h-0 flex-col">
				<div className="flex min-h-0 flex-1 flex-col">{children}</div>
				{(selection || footer) && (
					<footer className="shrink-0 space-y-2 border-t border-border bg-background px-4 py-3">
						{selection && !completed && (
							<>
								<div className="flex items-center gap-3">
									<div
										aria-hidden="true"
										className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden p-1 [&_img]:h-full [&_img]:w-full [&_img]:object-contain [&_img]:!transform-none"
									>
										{selection.preview}
									</div>
									<div className="min-w-0">
										<p className="text-xs font-medium text-foreground">
											{selection.label}
										</p>
										{selection.description && (
											<p className="mt-0.5 text-[11px] text-muted-foreground">
												{selection.description}
											</p>
										)}
									</div>
								</div>
								{placing ? (
									<div className="flex min-h-9 items-center justify-between gap-2 rounded-lg bg-primary/10 px-3 py-2">
										<span role="status" className="text-xs font-medium">
											Placing {selection.noun}
										</span>
										<button
											type="button"
											onClick={stopPlacement}
											className="min-h-7 rounded-md px-2 text-xs hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-ring"
										>
											Cancel{" "}
											<kbd className="ml-1 text-[11px] text-muted-foreground">
												Esc
											</kbd>
										</button>
									</div>
								) : (
									<button
										type="button"
										disabled={readOnly}
										onClick={() => {
											if (useScene.getState().readOnly) return;
											selection.place();
											setArmedTool(useEditor.getState().tool);
										}}
										className="min-h-9 w-full rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40"
									>
										Place {selection.noun}
									</button>
								)}
								<p
									aria-live="polite"
									className="text-[11px] leading-relaxed text-muted-foreground"
								>
									{readOnly ? "This scene is read-only." : selection.hint}
								</p>
							</>
						)}
						{typeof footer === "function"
							? footer(Boolean(selection) && !completed)
							: footer}
					</footer>
				)}
			</div>
		</CatalogPlacement.Provider>
	);
}
