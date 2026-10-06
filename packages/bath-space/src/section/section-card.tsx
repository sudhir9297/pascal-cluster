"use client";
import {
	PanelSection,
	PanelButton,
	PanelNumberInput,
} from "../inspector-controls";

import {
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
	type PointerEvent,
} from "react";
import {
	nodeRegistry,
	cascadeDirty,
	createSceneApi,
	type AnyNodeId,
	useScene,
	useLiveNodeOverrides,
} from "@pascal-app/core";

import { useViewer } from "@pascal-app/viewer";
import { useBasinSizeContext } from "../countertop-basin/size-controls";
import { useSectionSizingMode } from "./sizing-mode";
import { sectionFieldPatch } from "./fields";
import { createDimensionEdit, type DimensionEdit } from "./edit-session";
import {
	boundedDimensionValue,
	dimensionSpanAt,
	dimensionCrossAt,
	type SectionDimension,
	type SectionDrawing,
} from "./model";

import type { SectionModel } from "./fields";
import { withProductSizes } from "./product-sizes";
type Props<T extends { id: string }> = {
	node: T;
	model: (node: T) => SectionModel;
	onChange: (patch: Partial<T>) => void;
	preparePreview?: (patch: Partial<T>) => Partial<T>;
};
type Drag = {
	pointerId: number;
	field: SectionDimension;
	start: number;
	pixelsPerMetre: number;
};
const dimensionPrecision = (field: SectionDimension) =>
	field.step >= 1
		? 0
		: Math.max(
				3,
				...[
					...(field.snapValues ?? []),
					...(field.presets?.map((preset) => preset.value) ?? []),
				].map(
					(value) =>
						Number(value.toFixed(6)).toString().split(".")[1]?.length ?? 0,
				),
			);

export function SectionAccordion<T extends { id: string }>({
	node,
	model,
	onChange,
	preparePreview,
}: Props<T>) {
	return (
		<SectionAccordionContent
			key={node.id}
			node={node}
			model={model}
			onChange={onChange}
			preparePreview={preparePreview}
		/>
	);
}
function SectionAccordionContent<T extends { id: string }>({
	node,
	model,
	onChange,
	preparePreview,
}: Props<T>) {
	const id = useId().replaceAll(":", "");
	const sizeContext = useBasinSizeContext();
	const sectionSizing = useSectionSizingMode();
	const [localSnap, setLocalSnap] = useState(true);
	const productSnap =
		sizeContext?.enabled ?? sectionSizing?.enabled ?? localSnap;
	const setProductSnap =
		sizeContext?.setEnabled ?? sectionSizing?.setEnabled ?? setLocalSnap;
	const readOnly = useScene((state) => state.readOnly);
	const [floorContext, setFloorContext] = useState(false);
	const [draft, setDraft] = useState<Partial<T>>({});
	const drag = useRef<Drag | null>(null);
	const edit = useRef<DimensionEdit | null>(null);
	const previewKeys = useRef(new Set<string>());
	const finishRef = useRef<(commit: boolean) => void>(() => {});
	const sizedModel = useMemo(() => {
		const identity = node as T & {
			type?: string;
			shape?: string;
			style?: string;
			family?: string;
			layout?: string;
			plateShape?: string;
		};
		const schema = identity.type
			? nodeRegistry.get(identity.type)?.schema
			: undefined;
		const defaults = schema?.safeParse({
			shape: identity.shape,
			style: identity.style,
			family: identity.family,
			layout: identity.layout,
			plateShape: identity.plateShape,
		});
		return (value: T) =>
			withProductSizes(
				value as typeof identity,
				model(value),
				defaults?.success
					? (defaults.data as Record<string, unknown>)
					: undefined,
			);
	}, [model, node]);
	const baseModel = useMemo(() => sizedModel(node), [sizedModel, node]);
	const {
		drawing,
		dimensions: authoredDimensions,
		sizeOptions,
	} = useMemo(
		() =>
			Object.keys(draft).length ? sizedModel({ ...node, ...draft }) : baseModel,
		[sizedModel, node, draft, baseModel],
	);
	const dimensions = authoredDimensions.map((field) =>
		productSnap ? field : { ...field, snapValues: undefined },
	);
	// Fit the allowed size range, not the current size. Resizing must visibly move
	// the outline and handles instead of silently changing the drawing's zoom.
	const maximum = useMemo(() => {
		const maximumPatch = Object.assign(
			{},
			...baseModel.dimensions
				.filter((field) => field.unit !== "°" && field.unit !== "")
				.map((field) => sectionFieldPatch(field, field.max)),
		) as Partial<T>;
		return sizedModel({ ...node, ...maximumPatch }).drawing;
	}, [sizedModel, node, baseModel.dimensions]);
	const planScale = Math.min(200 / maximum.width, 80 / maximum.depth);
	const sectionWidth = drawing.sectionWidth ?? drawing.width;
	const sectionScale = Math.min(
		200 / (maximum.sectionWidth ?? maximum.width),
		105 /
			(!floorContext && maximum.fixtureHeight
				? maximum.fixtureHeight
				: maximum.height),
	);
	const sectionY = (value: number) => Math.min(125, 20 + value * sectionScale);
	const floorBreak = 20 + drawing.height * sectionScale > 125;
	const cutX =
		(280 - drawing.width * planScale) / 2 +
		drawing.width * planScale * (drawing.cutPosition ?? 0.5);
	const cutY = 18 + drawing.depth * planScale * (drawing.cutPosition ?? 0.5);
	function dirtyPreviewGeometry() {
		const scene = createSceneApi(useScene);
		for (const affectedId of cascadeDirty(node.id as AnyNodeId, { scene }))
			useScene.getState().markDirty(affectedId);
	}
	function clearPreview() {
		useLiveNodeOverrides
			.getState()
			.clearFields(node.id, [...previewKeys.current]);
		previewKeys.current.clear();
		dirtyPreviewGeometry();
		useViewer.getState().setInputDragging(false);
		setDraft({});
	}
	function begin(field: SectionDimension) {
		if (readOnly) return;
		if (edit.current?.field.key === field.key) return;
		finish(false);
		edit.current = createDimensionEdit(field, {
			preview: (patch) => {
				const mapped = sectionFieldPatch(
					field,
					patch[field.key]!,
				) as Partial<T>;
				const prepared = preparePreview?.(mapped) ?? mapped;
				setDraft(prepared);
				for (const key of Object.keys(prepared)) previewKeys.current.add(key);
				useLiveNodeOverrides.getState().set(node.id, prepared);
				dirtyPreviewGeometry();
			},
			commit: (patch) =>
				onChange(sectionFieldPatch(field, patch[field.key]!) as Partial<T>),
			clear: clearPreview,
		});
	}
	function finish(commit: boolean) {
		const current = edit.current;
		edit.current = null;
		drag.current = null;
		current?.finish(commit);
	}
	finishRef.current = finish;
	useEffect(() => {
		const cancel = (event: globalThis.KeyboardEvent) => {
			if (event.key === "Escape" && drag.current) {
				event.preventDefault();
				event.stopPropagation();
				finishRef.current(false);
			}
		};
		const blur = () => finishRef.current(false);
		window.addEventListener("keydown", cancel, true);
		window.addEventListener("blur", blur);
		return () => {
			window.removeEventListener("keydown", cancel, true);
			window.removeEventListener("blur", blur);
			const current = edit.current;
			edit.current = null;
			drag.current = null;
			current?.finish(false);
		};
	}, [node.id]);
	function move(event: PointerEvent<SVGSVGElement>) {
		const session = drag.current;
		if (!session || event.pointerId !== session.pointerId) return;
		const coordinate =
			session.field.axis === "x" ? event.clientX : event.clientY;
		const value = boundedDimensionValue(
			session.field,
			session.field.value +
				((coordinate - session.start) / session.pixelsPerMetre) *
					(session.field.direction ?? 1),
		);
		edit.current?.preview(value);
	}
	function snapDots(
		field: SectionDimension,
		position: (value: number) => [number, number],
	) {
		return field.snapValues?.map((value) => {
			const [x, y] = position(value);
			return (
				<circle
					key={value}
					data-section-snap={field.key}
					data-snap-value={value}
					cx={x}
					cy={y}
					r={2.5}
					className="text-foreground"
					fill="currentColor"
					stroke="var(--background)"
					strokeWidth={1}
					pointerEvents="none"
					aria-hidden="true"
				/>
			);
		});
	}
	function handle(
		field: SectionDimension,
		x: number,
		y: number,
		scale: number,
	) {
		return (
			<g
				key={field.key}
				role="slider"
				tabIndex={0}
				aria-label={`Section ${field.label}`}
				aria-disabled={readOnly}
				aria-valuemin={field.min}
				aria-valuemax={field.max}
				aria-valuenow={field.value}
				aria-valuetext={`${field.value.toFixed(dimensionPrecision(field))} ${field.unit ?? "m"}`}
				aria-orientation={field.axis === "x" ? "horizontal" : "vertical"}
				className="text-primary outline-none focus-visible:text-foreground"
				style={{
					cursor: field.axis === "x" ? "ew-resize" : "ns-resize",
					touchAction: "none",
				}}
				onPointerDown={(event) => {
					if (readOnly) return;
					if (drag.current || event.button !== 0) return;
					event.preventDefault();
					event.stopPropagation();
					event.currentTarget.focus();
					const svg = event.currentTarget.ownerSVGElement!;
					begin(field);
					drag.current = {
						pointerId: event.pointerId,
						field,
						start: field.axis === "x" ? event.clientX : event.clientY,
						pixelsPerMetre:
							(scale *
								(field.axis === "x" && field.value > 0
									? (field.span - (field.spanOffset ?? 0)) / field.value
									: 1) *
								(field.view === "plan" && field.axis === "x" ? 0.5 : 1) *
								svg.getBoundingClientRect().width) /
							280,
					};
					svg.setPointerCapture(event.pointerId);
					useViewer.getState().setInputDragging(true);
				}}
				onKeyDown={(event) => {
					if (drag.current) return;
					const direction = ["ArrowRight", "ArrowDown"].includes(event.key)
						? 1
						: ["ArrowLeft", "ArrowUp"].includes(event.key)
							? -1
							: 0;
					if (!direction && event.key !== "Home" && event.key !== "End") return;
					event.preventDefault();
					event.stopPropagation();
					if (readOnly) return;
					const stops = field.snapValues;
					const next =
						event.key === "Home"
							? field.min
							: event.key === "End"
								? field.max
								: stops?.length
									? ((direction > 0
											? stops.find((value) => value > field.value)
											: [...stops]
													.reverse()
													.find((value) => value < field.value)) ?? field.value)
									: field.value +
										direction * field.step * (event.shiftKey ? 10 : 1);
					begin(field);
					edit.current?.preview(next);
					finish(true);
				}}
			>
				<title>
					{field.label}: {field.value.toFixed(dimensionPrecision(field))}{" "}
					{field.unit ?? "m"}. Drag or use arrow keys.
				</title>
				<circle cx={x} cy={y} r={13} fill="transparent" />
				<circle
					cx={x}
					cy={y}
					r={5}
					fill="currentColor"
					stroke="var(--background)"
					strokeWidth={2}
				/>
				<path
					d={field.axis === "x" ? `M${x - 2},${y}h4` : `M${x},${y - 2}v4`}
					stroke="var(--background)"
				/>
			</g>
		);
	}
	const svgEvents = {
		onPointerMove: move,
		onPointerUp: (event: PointerEvent<SVGSVGElement>) => {
			if (drag.current?.pointerId === event.pointerId) {
				move(event);
				finish(true);
			}
		},
		onPointerCancel: (event: PointerEvent<SVGSVGElement>) => {
			if (drag.current?.pointerId === event.pointerId) finish(false);
		},
		onLostPointerCapture: (event: PointerEvent<SVGSVGElement>) => {
			if (drag.current?.pointerId === event.pointerId) finish(false);
		},
	};
	return (
		<PanelSection title="Section" defaultExpanded className="shrink-0">
			<div data-bath-section>
				{baseModel.dimensions.some((field) => field.snapValues?.length) && (
					<div className="space-y-2 px-3 py-2">
						<div className="flex flex-wrap gap-1">
							{sizeOptions?.map((option) => (
								<PanelButton
									key={option.label}
									disabled={readOnly || Boolean(drag.current)}
									onClick={() => {
										finish(false);
										setProductSnap(true);
										onChange(option.patch as Partial<T>);
									}}
								>
									{option.label}
								</PanelButton>
							))}
							<PanelButton
								aria-pressed={!productSnap}
								className={
									!productSnap
										? "border-primary bg-primary/10 text-primary"
										: undefined
								}
								disabled={readOnly || Boolean(drag.current)}
								onClick={() => {
									finish(false);
									setProductSnap(false);
								}}
							>
								Custom
							</PanelButton>
						</div>
					</div>
				)}

				<div className="border-t border-border/50 px-3 pt-2 text-xs text-muted-foreground">
					Plan · A-A
				</div>
				<svg
					viewBox="0 0 280 125"
					className="block w-full select-none"
					aria-label="Plan with section cut"
					{...svgEvents}
				>
					<g
						transform={`translate(${(280 - drawing.width * planScale) / 2},18) scale(${planScale})`}
						fill="var(--background)"
						stroke="currentColor"
						strokeWidth={1 / planScale}
					>
						{(drawing.planParts ?? [drawing.plan]).map((path, index) => (
							<path key={index} d={path} fillRule="evenodd" />
						))}
						{drawing.planDetail && (
							<path
								d={drawing.planDetail}
								fill="none"
								strokeOpacity={0.5}
								strokeDasharray={`${0.015} ${0.01}`}
							/>
						)}
					</g>
					<path
						d={drawing.cutAxis === "x" ? `M${cutX},10V105` : `M24,${cutY}H256`}
						stroke="currentColor"
						strokeOpacity={0.5}
						strokeDasharray="4 4"
					/>
					<text
						x={drawing.cutAxis === "x" ? cutX - 7 : 15}
						y={drawing.cutAxis === "x" ? 9 : cutY + 3}
						fontSize={9}
						fill="currentColor"
					>
						A
					</text>
					<text
						x={drawing.cutAxis === "x" ? cutX - 7 : 261}
						y={drawing.cutAxis === "x" ? 112 : cutY + 3}
						fontSize={9}
						fill="currentColor"
					>
						A
					</text>
					{dimensions
						.filter((field) => field.view === "plan" && field.handle !== false)
						.map((field) => (
							<g key={field.key}>
								{handle(
									field,
									field.axis === "x" ? 140 + (field.span * planScale) / 2 : 140,
									field.axis === "x"
										? field.crossPosition === undefined
											? cutY
											: 18 + field.crossPosition * planScale
										: 18 +
												((field.start ?? 0) +
													field.span * (field.direction ?? 1)) *
													planScale,
									planScale,
								)}
								{snapDots(field, (value) => [
									field.axis === "x"
										? 140 + (dimensionSpanAt(field, value) * planScale) / 2
										: 140,
									field.axis === "x"
										? field.crossPosition === undefined
											? cutY
											: 18 + dimensionCrossAt(field, value)! * planScale
										: 18 +
											((field.start ?? 0) +
												dimensionSpanAt(field, value) *
													(field.direction ?? 1)) *
												planScale,
								])}
							</g>
						))}
					<text
						x={140}
						y={117}
						textAnchor="middle"
						fontSize={10}
						fill="currentColor"
						opacity={0.6}
					>
						{drawing.width.toFixed(3)} × {drawing.depth.toFixed(3)} m
					</text>
				</svg>
				<div className="flex items-center justify-between border-t border-border/50 px-3 pt-2 text-xs text-muted-foreground">
					<span>Section A-A</span>
					{drawing.fixtureHeight && (
						<PanelButton
							type="button"
							aria-pressed={floorContext}
							onClick={() => {
								finish(false);
								setFloorContext(!floorContext);
							}}
							className="rounded px-1 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
						>
							{floorContext ? "Fit fixture" : "Floor context"}
						</PanelButton>
					)}
				</div>
				<svg
					viewBox="0 0 280 155"
					className="block w-full select-none"
					aria-label="Dimensioned section A-A"
					{...svgEvents}
				>
					<defs>
						<pattern
							id={`hatch-${id}`}
							width={0.03}
							height={0.03}
							patternUnits="userSpaceOnUse"
							patternTransform="rotate(45)"
						>
							<line
								x1={0}
								y1={0}
								x2={0}
								y2={0.03}
								strokeWidth={0.001}
								stroke="currentColor"
								strokeOpacity={0.25}
							/>
						</pattern>
					</defs>
					<g
						transform={`translate(${(280 - sectionWidth * sectionScale) / 2},20) scale(${sectionScale})`}
						stroke="currentColor"
						strokeWidth={1 / sectionScale}
					>
						{(drawing.sectionParts ?? [drawing.section]).map((path, index) => (
							<path
								key={index}
								d={path}
								fill={`url(#hatch-${id})`}
								fillRule="evenodd"
							/>
						))}
						{drawing.detail && (
							<path d={drawing.detail} fill="none" strokeOpacity={0.4} />
						)}
					</g>
					<path
						d={`M25,${sectionY(drawing.height)}H255`}
						stroke="currentColor"
						strokeOpacity={0.25}
						strokeDasharray={drawing.floor ? undefined : "3 4"}
					/>
					{dimensions
						.filter(
							(field) => field.view === "section" && field.handle !== false,
						)
						.map((field, index) => {
							if (field.axis === "x") {
								const start =
									(280 - sectionWidth * sectionScale) / 2 +
									(field.start ?? 0) * sectionScale;
								const end =
									start + (field.direction ?? 1) * field.span * sectionScale;
								const y = 130 - index * 15;
								return (
									<g key={field.key}>
										<path
											d={`M${start},${y}H${end}M${start},${y - 4}v8M${end},${y - 4}v8`}
											fill="none"
											stroke="currentColor"
											strokeOpacity={0.35}
										/>
										{handle(field, end, y, sectionScale)}
										{snapDots(field, (value) => [
											start +
												(field.direction ?? 1) *
													dimensionSpanAt(field, value) *
													sectionScale,
											y,
										])}
									</g>
								);
							}
							const start = sectionY(field.start ?? 0);
							const end = sectionY(
								(field.start ?? 0) + (field.direction ?? 1) * field.span,
							);
							const x = 255 - index * 15;
							return (
								<g key={field.key}>
									<path
										d={`M${140 + (sectionWidth * sectionScale) / 2},${end}H${x}`}
										fill="none"
										stroke="currentColor"
										strokeOpacity={0.2}
										strokeDasharray="2 3"
									/>
									<path
										d={`M${x},${start}V${end}M${x - 4},${start}h8M${x - 4},${end}h8`}
										fill="none"
										stroke="currentColor"
										strokeOpacity={0.35}
									/>
									{handle(field, x, end, sectionScale)}
									{snapDots(field, (value) => [
										x,
										sectionY(
											(field.start ?? 0) +
												(field.direction ?? 1) * dimensionSpanAt(field, value),
										),
									])}
								</g>
							);
						})}
					{floorBreak && (
						<g opacity={0.5}>
							<path
								d="M33,118l4,-4l4,8l4,-4"
								fill="none"
								stroke="currentColor"
							/>
							<text x={49} y={120} fontSize={8} fill="currentColor">
								Floor · break
							</text>
						</g>
					)}
					{drawing.datum && (
						<g opacity={0.5}>
							<path
								d={`M25,${sectionY(drawing.datum.y)}H255`}
								stroke="currentColor"
								strokeDasharray="3 4"
							/>
							<text
								x={28}
								y={sectionY(drawing.datum.y) - 4}
								fontSize={8}
								fill="currentColor"
							>
								{drawing.datum.label}
							</text>
						</g>
					)}
					<text
						x={140}
						y={146}
						textAnchor="middle"
						fontSize={10}
						fill="currentColor"
						opacity={0.6}
					>
						{drawing.height.toFixed(3)} m{" "}
						{drawing.floor ? "above floor" : "overall"}
					</text>
				</svg>
				<div className="space-y-1 border-t border-border/50 px-3 py-2">
					{dimensions
						.filter((field) => field.handle !== false)
						.map((field) => (
							<DimensionInput
								key={field.key}
								field={field}
								disabled={readOnly || Boolean(drag.current)}
								onPreset={() => setProductSnap(true)}
								onBegin={() => begin(field)}
								onPreview={(value) => {
									begin(field);
									edit.current?.preview(value);
								}}
								onFinish={finish}
							/>
						))}
					{dimensions.some((field) => field.handle === false) && (
						<details className="border-t border-border/50 pt-2">
							<summary className="cursor-pointer text-xs text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring">
								Section details
							</summary>
							<div className="space-y-1 pt-2">
								{dimensions
									.filter((field) => field.handle === false)
									.map((field) => (
										<DimensionInput
											key={field.key}
											field={field}
											disabled={readOnly || Boolean(drag.current)}
											onPreset={() => setProductSnap(true)}
											onBegin={() => begin(field)}
											onPreview={(value) => {
												begin(field);
												edit.current?.preview(value);
											}}
											onFinish={finish}
										/>
									))}
							</div>
						</details>
					)}
				</div>
			</div>
		</PanelSection>
	);
}
function DimensionInput({
	field,
	disabled,
	onBegin,
	onPreset,
	onPreview,
	onFinish,
}: {
	field: SectionDimension;
	disabled: boolean;
	onBegin: () => void;
	onPreset: () => void;
	onPreview: (value: number) => void;
	onFinish: (commit: boolean) => void;
}) {
	const [text, setText] = useState<string | null>(null);
	const cancelled = useRef(false);
	useEffect(() => {
		const cancel = () => {
			cancelled.current = true;
			setText(null);
		};
		window.addEventListener("blur", cancel);
		return () => window.removeEventListener("blur", cancel);
	}, []);
	function finishInput() {
		const valid =
			text === null || (Boolean(text.trim()) && Number.isFinite(Number(text)));
		onFinish(!cancelled.current && valid);
		cancelled.current = false;
		setText(null);
	}
	return (
		<div className="text-xs" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
			<span className="text-muted-foreground" style={{ flex: 1, minWidth: 0 }}>{field.label}</span>
			<span className="flex items-center gap-1" style={{ flexShrink: 0 }}>
				<PanelNumberInput
					aria-label={`Section ${field.label}${field.unit === undefined || field.unit === "m" ? " in metres" : field.unit ? ` in ${field.unit}` : ""}`}
					type="number"
					min={field.min}
					max={field.max}
					step={field.step}
					disabled={disabled}
					value={text ?? field.value.toFixed(dimensionPrecision(field))}
					onFocus={() => {
						cancelled.current = false;
						onBegin();
					}}
					onChange={(event) => {
						const next = event.target.value;
						setText(next);
						if (next.trim() && Number.isFinite(Number(next)))
							onPreview(Number(next));
					}}
					onBlur={finishInput}
					onKeyDown={(event) => {
						event.stopPropagation();
						if (event.key === "Enter") event.currentTarget.blur();
						if (event.key === "Escape") {
							cancelled.current = true;
							event.currentTarget.blur();
						}
					}}
					className="h-7 w-20 rounded border border-border/60 bg-background px-2 text-right font-mono tabular-nums focus-visible:outline-2 focus-visible:outline-ring"
				/>
				<span className="text-muted-foreground">{field.unit ?? "m"}</span>
			</span>
			</div>
			{Boolean(field.presets?.length) && <div role="group" aria-label={`${field.label} sizes`}
				style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(64px, 1fr))', gap: 6 }}>
				{field.presets?.map((preset) => <PanelButton
					key={preset.value}
					aria-label={`${field.label}: ${preset.label}`}
					disabled={disabled}
					aria-pressed={Math.abs(field.value - preset.value) < field.step / 2}
					style={{ minWidth: 0, minHeight: 32, padding: '4px 6px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}
					onClick={() => {
						onPreset();
						onBegin();
						onPreview(preset.value);
						onFinish(true);
					}}
				>{preset.label.replace(/\s*mm$/, "")}</PanelButton>)}
			</div>}
		</div>
	);
}
