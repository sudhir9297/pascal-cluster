"use client";
import { formatLinearMeasurement } from "@pascal-app/editor";
import { useViewer } from "@pascal-app/viewer";
import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import {
	type ButtonHTMLAttributes,
	Children,
	createContext,
	Fragment,
	type HTMLAttributes,
	isValidElement,
	type ReactNode,
	useCallback,
	useContext,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useCatalogPlacement } from "./catalog-placement";

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

const StyleCards = createContext(false);

const gridStyle = (columns: number) =>
	({
		display: "grid",
		gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
		columnGap: 8,
		alignItems: "start",
	}) as const;

export function CatalogGrid({
	children,
	columns,
	...props
}: Omit<HTMLAttributes<HTMLDivElement>, "className" | "style"> & {
	columns?: 1 | 2 | 3 | 4;
}) {
	const viewport = useContext(CatalogViewport);
	const styles = useContext(StyleCards);
	const columnCount = columns ?? (styles ? 4 : 3);
	// Catalog previews outside this panel retain the ordinary grid layout.
	return viewport.element && !styles ? (
		<VirtualCatalogGrid {...props} viewport={viewport} columns={columnCount}>
			{children}
		</VirtualCatalogGrid>
	) : (
		<div
			{...props}
			style={{
				...gridStyle(columnCount),
				...(styles
					? {
							gridTemplateColumns:
								"repeat(auto-fill, minmax(max(62px, calc((100% - 24px) / 4)), 1fr))",
						}
					: {}),
				rowGap: 12,
			}}
		>
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
		(Math.max(0, (geometry.width - 8 * (columns - 1)) / columns) * 5) / 7 + 46;
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
	subtitle,
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
	subtitle?: string;
	onPlace?: () => void;
	placementKey?: string;
	placementLabel?: string;
	placementDescription?: ReactNode;
	placementNoun?: string;
	placementHint?: string;
}) {
	const styles = useContext(StyleCards);
	const placement = useCatalogPlacement();
	const key = placementKey ?? label;
	const selected =
		onPlace && placement
			? placement.selection?.key === key
			: props["aria-pressed"] === true || props["aria-pressed"] === "true";
	const selectForPlacement = useCallback(() => {
		if (!onPlace) return;
		if (placement)
			placement.select(
				{
					key,
					label: placementLabel ?? label,
					description: placementDescription,
					noun: placementNoun,
					hint: placementHint,
					preview: children,
					place: onPlace,
				},
				styles,
			);
		else onPlace();
	}, [
		onPlace,
		styles,
		placement,
		key,
		placementLabel,
		label,
		placementDescription,
		placementNoun,
		placementHint,
		children,
	]);
	const cardRef = useRef<HTMLButtonElement>(null);
	useLayoutEffect(() => {
		if (
			styles ||
			!onPlace ||
			!placement ||
			placement.selection ||
			placement.category?.group !== "catalog" ||
			placement.category.value === "Everything"
		)
			return;
		const first = cardRef.current
			?.closest("[data-catalog-placement]")
			?.querySelector("[data-catalog-placement-option]:not(:disabled)");
		if (first === cardRef.current) selectForPlacement();
	}, [styles, onPlace, placement, selectForPlacement]);
	const placementSelected = Boolean(
		onPlace && placement?.selection?.key === key,
	);
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
			data-catalog-placement-option={onPlace ? "" : undefined}
			onClick={onPlace ? selectForPlacement : props.onClick}
			className={`group relative flex h-full w-full min-w-0 flex-col items-center rounded-xl border-2 px-1.5 pb-2.5 pt-2 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${selected ? `border-foreground/90 ${styles ? "bg-background/30" : "bg-muted"}` : `border-transparent ${styles ? "bg-background/45 hover:bg-background/65" : "bg-secondary/60 hover:bg-accent/60"}`}`}
		>
			<span
				aria-hidden="true"
				className="relative block w-full overflow-hidden rounded-lg"
				style={{ aspectRatio: styles ? "1 / 1" : "7 / 5" }}
			>
				<span className="absolute inset-0 flex items-center justify-center p-1 [&_img]:h-full [&_img]:w-full [&_img]:object-contain [&_img]:!transform-none">
					{children}
				</span>
			</span>
			<span
				className={`line-clamp-2 min-h-8 w-full break-words pt-1 text-xs font-medium leading-4 ${selected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
			>
				{label}
			</span>
			{subtitle && (
				<span
					title={subtitle}
					className="mt-0.5 line-clamp-2 w-full text-[11px] leading-4 text-muted-foreground"
				>
					{subtitle}
				</span>
			)}
			{(styles || onPlace) && selected && (
				<span
					aria-hidden="true"
					className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background"
				>
					<svg
						aria-hidden="true"
						focusable="false"
						viewBox="0 0 16 16"
						className="h-3 w-3"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					>
						<path d="m3 8 3 3 7-7" />
					</svg>
				</span>
			)}
		</button>
	);
}

export function CatalogChoiceGroup({
	label = "Mounting",
	options,
	value,
	onChange,
	children,
}: {
	label?: string;
	options: readonly {
		id: string;
		label: string;
		count: number;
		preview: ReactNode;
		selectedStyle?: string;
	}[];
	value: string | null;
	onChange: (id: string) => void;
	children: ReactNode;
}) {
	const id = useId();
	const selected = options.find((option) => option.id === value);
	const [choiceRevision, setChoiceRevision] = useState(0);
	const panel = useRef<HTMLElement>(null);
	const previousValue = useRef(value);
	useLayoutEffect(() => {
		if (previousValue.current !== value)
			panel.current?.scrollIntoView({ block: "nearest" });
		previousValue.current = value;
	}, [value]);
	useLayoutEffect(() => {
		if (value === null) return;
		panel.current
			?.querySelector<HTMLButtonElement>(
				"[data-catalog-placement-option]:not(:disabled)",
			)
			?.click();
	}, [value, choiceRevision]);
	if (!options.length) return null;
	return (
		<div className="space-y-3" data-catalog-choice-group="">
			<CatalogHeading>{label}</CatalogHeading>
			<fieldset
				className="m-0 grid min-w-0 grid-cols-3 items-stretch gap-x-2 gap-y-3 border-0 p-0"
				data-catalog-choices=""
				aria-label={label}
			>
				{options.map((option, index) => (
					<Fragment key={option.id}>
						<CatalogItemCard
							label={option.label}
							subtitle={
								value === option.id && option.selectedStyle
									? option.selectedStyle
									: `${option.count} ${option.count === 1 ? "style" : "styles"}`
							}
							aria-pressed={value === option.id}
							aria-expanded={value === option.id}
							aria-controls={value === option.id ? id : undefined}
							onClick={() => {
								onChange(option.id);
								setChoiceRevision((revision) => revision + 1);
							}}
						>
							{option.preview}
						</CatalogItemCard>
						{selected &&
							(index % 3 === 2 || index === options.length - 1) &&
							Math.floor(index / 3) ===
								Math.floor(options.indexOf(selected) / 3) && (
								<section
									ref={panel}
									id={id}
									aria-label={`Styles for ${selected.label.toLowerCase()}`}
									className="relative col-span-3 mt-0.5 rounded-xl bg-muted p-2"
									data-catalog-style-panel=""
									style={{ scrollMarginBlock: 8 }}
								>
									<span
										aria-hidden="true"
										className="absolute -top-1.5 h-3 w-3 rotate-45 bg-muted"
										style={{
											left: `calc(${(((options.indexOf(selected) % 3) + 0.5) * 100) / 3}% - 6px)`,
										}}
									/>
									<div className="mb-2 flex items-center justify-between gap-2 px-1 pt-1">
										<h4 className="text-xs font-semibold">
											Style{" "}
											<span className="font-normal text-muted-foreground">
												for {selected.label.toLowerCase()}
											</span>
										</h4>
										<span className="text-[11px] text-muted-foreground">
											{selected.count}{" "}
											{selected.count === 1 ? "style" : "styles"}
										</span>
									</div>
									<StyleCards.Provider value={true}>
										{children}
									</StyleCards.Provider>
								</section>
							)}
					</Fragment>
				))}
			</fieldset>
		</div>
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
	selection,
}: {
	children: ReactNode;
	count?: number;
	selection?: string;
}) {
	return (
		<div className="flex min-h-6 items-center justify-between gap-2">
			<h3 className="text-xs font-semibold text-foreground">{children}</h3>
			{selection && (
				<span
					className="min-w-0 truncate text-right text-[11px] text-muted-foreground"
					title={selection}
				>
					{selection}
				</span>
			)}
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
