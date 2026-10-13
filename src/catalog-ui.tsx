"use client";
import {
	Children,
	createContext,
	isValidElement,
	useCallback,
	useContext,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type ButtonHTMLAttributes,
	type HTMLAttributes,
	type ReactNode,
} from "react";
import { formatLinearMeasurement } from "@pascal-app/editor";
import { useViewer } from "@pascal-app/viewer";
import { useCatalogPlacement } from "./catalog-placement";
import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";

const CatalogViewport = createContext<{
	element: HTMLDivElement | null;
	layout: number;
	activeGrid: Element | null;
}>({ element: null, layout: 0, activeGrid: null });

export function CatalogScrollArea({
	children,
	resetKey,
	style,
	...props
}: HTMLAttributes<HTMLDivElement> & { resetKey: string }) {
	const [element, setElement] = useState<HTMLDivElement | null>(null);
	const content = useRef<HTMLDivElement>(null);
	const [activeGrid, setActiveGrid] = useState<Element | null>(null);
	const [layout, setLayout] = useState(0);
	useLayoutEffect(() => {
		if (!content.current) return;
		const observer = new ResizeObserver(() => setLayout((value) => value + 1));
		observer.observe(content.current);
		return () => observer.disconnect();
	}, []);
	useLayoutEffect(() => {
		if (element) element.scrollTop = 0;
	}, [element, resetKey]);
	const viewport = useMemo(
		() => ({ element, layout, activeGrid }),
		[element, layout, activeGrid],
	);
	// Keep grid width stable when placement controls change the scroll height.
	return (
		<div
			{...props}
			style={{ ...style, scrollbarGutter: "stable" }}
			ref={setElement}
			data-catalog-scroll=""
			onFocusCapture={(event) => {
				const grid = (event.target as Element).closest("[data-catalog-items]");
				if (grid) setActiveGrid(grid);
			}}
			onBlurCapture={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget as Node | null))
					setActiveGrid(null);
			}}
		>
			<CatalogViewport.Provider value={viewport}>
				<div ref={content}>{children}</div>
			</CatalogViewport.Provider>
		</div>
	);
}

const gridStyle = (columns: number) =>
	({
		display: "grid",
		gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
		columnGap: 8,
		alignItems: "start",
	}) as const;

export function CatalogGrid({
	children,
	columns = 3,
	...props
}: Omit<HTMLAttributes<HTMLDivElement>, "className" | "style"> & {
	columns?: 1 | 2 | 3;
}) {
	const viewport = useContext(CatalogViewport);
	// Catalog previews outside this panel retain the ordinary grid layout.
	return viewport.element ? (
		<VirtualCatalogGrid {...props} viewport={viewport} columns={columns}>
			{children}
		</VirtualCatalogGrid>
	) : (
		<div {...props} style={{ ...gridStyle(columns), rowGap: 12 }}>
			{children}
		</div>
	);
}

function VirtualCatalogGrid({
	children,
	viewport,
	columns,
	...props
}: Omit<HTMLAttributes<HTMLDivElement>, "className" | "style"> & {
	viewport: {
		element: HTMLDivElement | null;
		layout: number;
		activeGrid: Element | null;
	};
	columns: number;
}) {
	const items = useMemo(() => Children.toArray(children), [children]);
	const grid = useRef<HTMLDivElement>(null);
	const [geometry, setGeometry] = useState({ width: 240, offset: 0 });
	const [focusedRow, setFocusedRow] = useState<number | null>(null);
	useLayoutEffect(() => {
		const element = grid.current,
			scroll = viewport.element;
		if (!element || !scroll) return;
		const update = () => {
			const bounds = element.getBoundingClientRect();
			const next = {
				width: bounds.width,
				offset:
					bounds.top - scroll.getBoundingClientRect().top + scroll.scrollTop,
			};
			setGeometry((old) =>
				old.width === next.width && Math.abs(old.offset - next.offset) < 0.5
					? old
					: next,
			);
		};
		update();
		const observer = new ResizeObserver(update);
		observer.observe(element);
		return () => observer.disconnect();
	}, [viewport.element, viewport.layout, children]);
	const count = Math.ceil(items.length / columns);
	const grids = viewport.element
		? [...viewport.element.querySelectorAll("[data-catalog-items]")].filter(
				(grid) => Number(grid.getAttribute("data-catalog-items")) > 0,
			)
		: [];
	const activeIndex = viewport.activeGrid
		? grids.indexOf(viewport.activeGrid)
		: -1;
	const gridIndex = grid.current ? grids.indexOf(grid.current) : -1;
	// Mount boundary rows in adjacent sections so Tab and Shift+Tab can cross
	// sections, including their native details/summary controls.
	const boundaryRow =
		activeIndex >= 0 && gridIndex === activeIndex + 1
			? 0
			: activeIndex >= 0 && gridIndex === activeIndex - 1
				? count - 1
				: null;
	// Preview height plus two label lines and their spacing.
	const rowHeight =
		(Math.max(0, (geometry.width - 8 * (columns - 1)) / columns) * 4) / 7 + 38;
	const getItemKey = useCallback(
		(index: number) =>
			items
				.slice(index * columns, index * columns + columns)
				.map((item, slot) => (isValidElement(item) ? (item.key ?? slot) : slot))
				.join("|"),
		[items, columns],
	);
	const virtualizer = useVirtualizer({
		count,
		getScrollElement: () => viewport.element,
		estimateSize: () => rowHeight,
		getItemKey,
		scrollMargin: geometry.offset,
		gap: 12,
		overscan: 2,
		rangeExtractor: (range) => {
			const indices = defaultRangeExtractor(range);
			// Keep the focused row and its neighbours mounted for keyboard navigation.
			if (focusedRow !== null)
				for (let index = focusedRow - 1; index <= focusedRow + 1; index++) {
					if (index >= 0 && index < count) indices.push(index);
				}
			if (boundaryRow !== null && count > 0) indices.push(boundaryRow);
			return [...new Set(indices)].sort((a, b) => a - b);
		},
	});
	useLayoutEffect(() => {
		virtualizer.measure();
	}, [virtualizer, rowHeight]);
	const offset = virtualizer.scrollOffset ?? 0;
	const height = virtualizer.scrollRect?.height ?? 0;
	const rows = virtualizer
		.getVirtualItems()
		.filter(
			(row) =>
				(row.end >= offset - rowHeight * 2 &&
					row.start <= offset + height + rowHeight * 2) ||
				(focusedRow !== null && Math.abs(row.index - focusedRow) <= 1) ||
				row.index === boundaryRow,
		);
	return (
		<div
			{...props}
			ref={grid}
			data-catalog-items={items.length}
			onBlurCapture={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget as Node | null))
					setFocusedRow(null);
			}}
			style={{ position: "relative", height: virtualizer.getTotalSize() }}
		>
			{rows.map((row) => (
				<div
					key={row.key}
					data-catalog-row={row.index}
					onFocusCapture={() => setFocusedRow(row.index)}
					style={{
						...gridStyle(columns),
						position: "absolute",
						top: 0,
						left: 0,
						width: "100%",
						transform: `translateY(${row.start - geometry.offset}px)`,
					}}
				>
					{items.slice(row.index * columns, row.index * columns + columns)}
				</div>
			))}
		</div>
	);
}

export function CatalogItemCard({
	label,
	children,
	onPlace,
	placementKey,
	placementLabel,
	placementDescription,
	placementNoun = "item",
	placementHint = "Click in the canvas to place.",
	...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "style"> & {
	label: string;
	onPlace?: () => void;
	placementKey?: string;
	placementLabel?: string;
	placementDescription?: ReactNode;
	placementNoun?: string;
	placementHint?: string;
}) {
	const placement = useCatalogPlacement();
	const key = placementKey ?? label;
	const selected =
		onPlace && placement
			? placement.selection?.key === key
			: props["aria-pressed"] === true || props["aria-pressed"] === "true";
	const cardRef = useRef<HTMLButtonElement>(null);
	const placementSelected = Boolean(onPlace && placement && selected);
	useLayoutEffect(() => {
		if (placementSelected)
			cardRef.current?.scrollIntoView({ block: "nearest" });
	}, [placementSelected]);
	return (
		<button
			{...props}
			ref={cardRef}
			type="button"
			title={props.title ?? label}
			aria-pressed={selected}
			onClick={
				onPlace
					? () => {
							if (placement)
								placement.select({
									key,
									label: placementLabel ?? label,
									description: placementDescription,
									noun: placementNoun,
									hint: placementHint,
									preview: children,
									place: onPlace,
								});
							else onPlace();
						}
					: props.onClick
			}
			className={`group flex w-full min-w-0 flex-col items-center rounded-xl border p-1.5 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${selected ? "border-primary/60 bg-primary/10 ring-1 ring-primary/30" : "border-transparent bg-secondary/40 hover:bg-accent/40"}`}
		>
			<span
				aria-hidden="true"
				className="relative block w-full overflow-hidden rounded-lg"
				style={{ aspectRatio: "7 / 4" }}
			>
				<span className="absolute inset-0 flex items-center justify-center p-1 [&_img]:h-full [&_img]:w-full [&_img]:object-contain [&_img]:!transform-none">
					{children}
				</span>
			</span>
			<span
				className={`line-clamp-2 flex min-h-8 items-center justify-center pt-1 text-xs font-medium leading-4 ${selected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
			>
				{label}
			</span>
		</button>
	);
}

export function CatalogEmptyState({ children }: { children: ReactNode }) {
	return (
		<p
			style={{ padding: "28px 12px" }}
			className="rounded-lg border border-dashed border-border/70 px-3 py-7 text-center text-xs text-muted-foreground"
		>
			{children}
		</p>
	);
}

export function CatalogSection({ children }: { children: ReactNode }) {
	return (
		<section
			data-catalog-group
			className="mt-5 space-y-3 border-t border-border/60 pt-4 first:mt-0 first:border-t-0 first:pt-0"
		>
			{children}
		</section>
	);
}

export function CatalogHeading({
	children,
	count,
}: {
	children: ReactNode;
	count?: number;
}) {
	return (
		<div className="flex min-h-6 items-center justify-between gap-2">
			<h3 className="text-xs font-semibold text-foreground">{children}</h3>
			{count !== undefined && (
				<span className="text-[11px] tabular-nums text-muted-foreground">
					{count} {count === 1 ? "style" : "styles"}
				</span>
			)}
		</div>
	);
}

export function CatalogDimensions({
	width,
	depth,
}: {
	width: number;
	depth: number;
}) {
	const unit = useViewer((state) => state.unit);
	const notation = useViewer((state) => state.metricNotation);
	return (
		<span className="tabular-nums">
			{formatLinearMeasurement(width, unit, notation)} ×{" "}
			{formatLinearMeasurement(depth, unit, notation)}
		</span>
	);
}

export function CatalogResults({
	children,
	query,
}: {
	children: ReactNode;
	query: string;
}) {
	return (
		<div className="group/catalog-results">
			{children}
			<div
				role="status"
				className="hidden group-[:not(:has([data-catalog-group]))]/catalog-results:block"
			>
				<CatalogEmptyState>
					{query.trim()
						? `No bathroom items match “${query.trim()}”. Try a different search.`
						: "No items in this category."}
				</CatalogEmptyState>
			</div>
		</div>
	);
}
