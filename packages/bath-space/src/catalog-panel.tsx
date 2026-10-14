"use client";
import { type AnyNode, useScene } from "@pascal-app/core";
import { useEditor } from "@pascal-app/editor";
import { useViewer } from "@pascal-app/viewer";
import { type ReactNode, useEffect, useId, useState } from "react";
import { BATH_DECK } from "./bath-deck/schema";
import { BATH_SCREEN } from "./bath-screen/schema";
import { BATH_SHOWER } from "./bath-shower/schema";
import BathCatalog, { BathPreview } from "./bathtub/catalog";
import { BATHTUB } from "./bathtub/schema";
import BodyJetCatalog, { bodyJetThumbnails } from "./body-jet/catalog";
import { bodyJetPresets } from "./body-jet/schema";
import {
	CatalogPlacementProvider,
	useCatalogPlacement,
} from "./catalog-placement";
import {
	CatalogChoiceGroup,
	CatalogDimensions,
	CatalogEmptyState,
	CatalogGrid,
	CatalogHeading,
	CatalogItemCard,
	CatalogResults,
	CatalogScrollArea,
	CatalogSection,
} from "./catalog-ui";
import {
	setBasinPlacementShape,
	setWallBasinPlacementDesign,
	useBasinPlacementShape,
	useWallBasinPlacementDesign,
} from "./countertop-basin/placement-settings";
import {
	basinPresets,
	COUNTERTOP_BASIN,
	DROP_IN_BASIN,
	FULL_PEDESTAL_BASIN,
	fullPedestalBasinPresets,
	HALF_PEDESTAL_BASIN,
	halfPedestalBasinPresets,
	isBasinKind,
	isInsetBasinKind,
	SEMI_RECESSED_BASIN,
	semiRecessedBasinPresets,
	UNDERMOUNT_BASIN,
	WALL_HUNG_BASIN,
	wallHungBasinPresets,
} from "./countertop-basin/schema";
import FloorToiletCatalog, {
	ToiletPreview as FloorToiletPreview,
} from "./floor-standing-toilet/catalog";
import {
	FLOOR_STANDING_TOILET,
	type FloorStandingToiletNode,
} from "./floor-standing-toilet/schema";
import FlushPlateCatalog, { FlushPlatePreview } from "./flush-control/catalog";
import {
	setVanityPlacementPreset,
	useVanityPlacementPreset,
} from "./freestanding-vanity/placement-settings";
import { vanityPresets } from "./freestanding-vanity/presets";
import {
	PlacedVanityPreview,
	VanityPreview,
} from "./freestanding-vanity/preview";
import {
	CORNER_VANITY,
	FREESTANDING_VANITY,
	type VanityNode,
	WALL_MOUNTED_VANITY,
} from "./freestanding-vanity/schema";
import HandShowerCatalog, { handShowerThumbnails } from "./hand-shower/catalog";
import MirrorCatalog, { MirrorPreview } from "./mirror/catalog";
import ShowerArmCatalog, { showerArmThumbnails } from "./shower-arm/catalog";
import ShowerAssemblyCatalog, {
	assemblyThumbnails,
} from "./shower-assembly/catalog";
import { showerAssemblyPresets } from "./shower-assembly/schema";
import { useCatalogPreferences } from "./shower-common/catalog-preferences";
import ShowerControlCatalog, {
	showerControlThumbnails,
} from "./shower-control/catalog";
import { showerControlPresets } from "./shower-control/schema";
import DividerCatalog, { DividerPreview } from "./shower-divider/catalog";
import { SHOWER_DIVIDER } from "./shower-divider/schema";
import ShowerHeadCatalog, { showerHeadThumbnails } from "./shower-head/catalog";
import ShowerHoseCatalog, { showerHoseThumbnails } from "./shower-hose/catalog";
import ShowerKitCatalog from "./shower-kit/catalog";
import ShowerMountCatalog, {
	showerMountThumbnails,
} from "./shower-mount/catalog";
import TapCatalog from "./taps/catalog";
import { tapPresets } from "./taps/presets";
import HolderCatalog, { HolderPreview } from "./toilet-paper-holder/catalog";
import TowelRailCatalog, { TowelRailPreview } from "./towel-rail/catalog";
import ToiletCatalog, { ToiletPreview } from "./wall-hung-toilet/catalog";
import {
	WALL_HUNG_TOILET,
	type WallHungToiletNode,
} from "./wall-hung-toilet/schema";
import WallLightCatalog, { WallLightPreview } from "./wall-light/catalog";
import WallSpoutCatalog, { wallSpoutThumbnails } from "./wall-spout/catalog";
import { wallSpoutPresets } from "./wall-spout/schema";
import { type FixtureRow, fixtureInventory } from "./workspace/inventory";
import FixtureScheduleDialog from "./workspace/schedule-dialog";

const countertopBasinThumbnail = new URL(
	"./countertop-basin/assets/countertop-basin.webp",
	import.meta.url,
).href;
const countertopBasinShapeThumbnails = {
	round: countertopBasinThumbnail,
	oval: new URL(
		"./countertop-basin/assets/countertop-basin-oval.webp",
		import.meta.url,
	).href,
	rectangle: new URL(
		"./countertop-basin/assets/countertop-basin-rounded-rectangle.webp",
		import.meta.url,
	).href,
} as const;
const undermountBasinShapeThumbnails = {
	round: new URL(
		"./countertop-basin/assets/undermount-basin-round.webp",
		import.meta.url,
	).href,
	oval: new URL(
		"./countertop-basin/assets/undermount-basin-oval.webp",
		import.meta.url,
	).href,
	rectangle: new URL(
		"./countertop-basin/assets/undermount-basin-rounded-rectangle.webp",
		import.meta.url,
	).href,
} as const;
const dropInBasinShapeThumbnails = {
	round: new URL(
		"./countertop-basin/assets/drop-in-basin-round.webp",
		import.meta.url,
	).href,
	oval: new URL(
		"./countertop-basin/assets/drop-in-basin-oval.webp",
		import.meta.url,
	).href,
	rectangle: new URL(
		"./countertop-basin/assets/drop-in-basin-rounded-rectangle.webp",
		import.meta.url,
	).href,
} as const;
const semiRecessedBasinShapeThumbnails = {
	round: new URL(
		"./countertop-basin/assets/semi-recessed-basin-round.webp",
		import.meta.url,
	).href,
	oval: new URL(
		"./countertop-basin/assets/semi-recessed-basin-oval.webp",
		import.meta.url,
	).href,
	rectangle: new URL(
		"./countertop-basin/assets/semi-recessed-basin-rounded-rectangle.webp",
		import.meta.url,
	).href,
} as const;
const wallHungBasinThumbnail = new URL(
	"./wall-hung-basin/assets/sculpted.webp",
	import.meta.url,
).href;
const fullPedestalBasinThumbnail = new URL(
	"./full-pedestal-basin/assets/classic-full-pedestal.webp",
	import.meta.url,
).href;
const squareFullPedestalBasinThumbnail = new URL(
	"./full-pedestal-basin/assets/square-full-pedestal.webp",
	import.meta.url,
).href;
const taperedMonoblocBasinThumbnail = new URL(
	"./full-pedestal-basin/assets/tapered-monobloc.webp",
	import.meta.url,
).href;
const halfPedestalBasinThumbnail = new URL(
	"./half-pedestal-basin/assets/classic-half-pedestal.webp",
	import.meta.url,
).href;
const squareHalfPedestalBasinThumbnail = new URL(
	"./half-pedestal-basin/assets/square-half-pedestal.webp",
	import.meta.url,
).href;
const integratedHalfPedestalBasinThumbnail = new URL(
	"./half-pedestal-basin/assets/integrated-tapered-shroud.webp",
	import.meta.url,
).href;

function getBasinShapeThumbnail(
	kind: string | null,
	shape: "round" | "oval" | "rectangle",
) {
	if (kind === COUNTERTOP_BASIN) return countertopBasinShapeThumbnails[shape];
	if (kind === UNDERMOUNT_BASIN) return undermountBasinShapeThumbnails[shape];
	if (kind === DROP_IN_BASIN) return dropInBasinShapeThumbnails[shape];
	if (kind === SEMI_RECESSED_BASIN)
		return semiRecessedBasinShapeThumbnails[shape];
	return null;
}

type VanityKind =
	| typeof FREESTANDING_VANITY
	| typeof WALL_MOUNTED_VANITY
	| typeof CORNER_VANITY;

function BasinPreview({
	shape,
	wallHung = false,
	semiRecessed = false,
	pedestal = false,
	halfPedestal = false,
}: {
	shape: "round" | "oval" | "rectangle";
	wallHung?: boolean;
	semiRecessed?: boolean;
	pedestal?: boolean;
	halfPedestal?: boolean;
}) {
	if (pedestal || halfPedestal)
		return (
			<svg
				aria-hidden="true"
				viewBox="0 0 88 80"
				className="h-full w-full p-3 text-foreground/85"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
			>
				<path
					d={
						halfPedestal
							? shape === "round"
								? "M22 19h44L58 56H30Z"
								: shape === "rectangle"
									? "M30 30h28v26H30Z"
									: "M31 30h26l-4 23q-9 8-18 0Z"
							: shape === "round"
								? "M22 19h44L57 72H31Z"
								: shape === "rectangle"
									? "M32 30h24v42H32Z"
									: "M35 29h18l4 43H31Z"
					}
					fill="currentColor"
					fillOpacity="0.06"
				/>
				<path
					d={
						shape === "rectangle"
							? "M12 12h64v12q0 10-32 10T12 24Z"
							: "M12 19q0-8 32-8t32 8q0 16-32 16T12 19Z"
					}
					fill="currentColor"
					fillOpacity="0.06"
				/>
				<ellipse cx="44" cy="19" rx="25" ry="6" />
				<ellipse cx="44" cy="13" rx="2" ry="1" />
			</svg>
		);
	if (semiRecessed)
		return (
			<svg
				aria-hidden="true"
				viewBox="0 0 88 64"
				className="h-full w-full p-3 text-foreground/85"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
			>
				<path
					d={
						shape === "rectangle"
							? "M12 17q0-5 6-5h52q6 0 6 5v25q0 9-9 9H21q-9 0-9-9Z"
							: "M15 17q0-5 7-5h44q7 0 7 5v18q0 17-29 17T15 35Z"
					}
					fill="currentColor"
					fillOpacity="0.06"
				/>
				<path
					d={
						shape === "rectangle"
							? "M17 24q0-3 4-3h46q4 0 4 3v9q0 7-7 7H24q-7 0-7-7Z"
							: "M21 24q0-3 23-3t23 3q0 16-23 16T21 24Z"
					}
				/>
				<ellipse cx="44" cy="17" rx="2.5" ry="1.5" />
				<ellipse cx="44" cy="33" rx="3" ry="1.5" />
			</svg>
		);
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 88 64"
			className="h-full w-full p-3 text-foreground/85"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
		>
			{wallHung && <path d="M9 7v47M9 16h67v8M13 16v8" strokeOpacity="0.65" />}
			{shape === "rectangle" ? (
				<>
					<path
						d="M13 21q0-7 8-7h46q8 0 8 7v18q0 9-9 9H22q-9 0-9-9Z"
						fill="currentColor"
						fillOpacity="0.06"
					/>
					<rect x="17" y="17" width="54" height="17" rx="7" />
				</>
			) : (
				<>
					<path
						d={
							shape === "round"
								? "M21 25q0 25 23 25t23-25"
								: "M11 25q3 23 33 23t33-23"
						}
						fill="currentColor"
						fillOpacity="0.06"
					/>
					<ellipse cx="44" cy="25" rx={shape === "round" ? 23 : 33} ry="12" />
					<ellipse cx="44" cy="25" rx={shape === "round" ? 19 : 29} ry="8" />
				</>
			)}
			<ellipse cx="44" cy="28" rx="3" ry="1.5" />
		</svg>
	);
}

type ThumbnailAsset = string | { src: string };
function RenderedThumbnail({
	assets,
	style,
	fallback,
}: {
	assets: Readonly<Record<string, ThumbnailAsset | undefined>>;
	style: string;
	fallback: string;
}) {
	const asset = assets[style] ?? assets[fallback];
	return (
		<img
			src={typeof asset === "string" ? asset : asset?.src}
			alt=""
			loading="lazy"
			className="h-full w-full object-contain"
		/>
	);
}
function matchingPreset(
	node: AnyNode,
	presets: readonly { id: string; label: string }[],
) {
	const raw = node as unknown as Record<string, unknown>;
	return (
		presets.find((preset) =>
			Object.entries(preset).every(
				([key, value]) => ["id", "label"].includes(key) || raw[key] === value,
			),
		)?.id ??
		presets[0]?.id ??
		""
	);
}

export function PlacedPreview({ node }: { node: AnyNode }) {
	const type = String(node.type);
	const style = "style" in node ? String(node.style) : "";
	if (type === "bath-space:wall-light") return <WallLightPreview />;
	if (type === "bath-space:towel-rail")
		return (
			<TowelRailPreview
				shape={"shape" in node ? String(node.shape) : undefined}
			/>
		);
	if (type === "bath-space:mirror")
		return (
			<MirrorPreview shape={"shape" in node ? String(node.shape) : undefined} />
		);
	if (type === SHOWER_DIVIDER)
		return (
			<DividerPreview
				columns={"columns" in node ? Number(node.columns) : 1}
				rows={"rows" in node ? Number(node.rows) : 1}
			/>
		);
	if (type.includes("wall-spout"))
		return (
			<RenderedThumbnail
				assets={wallSpoutThumbnails}
				style={matchingPreset(node, wallSpoutPresets)}
				fallback="round"
			/>
		);
	if (type.includes("body-jet"))
		return (
			<RenderedThumbnail
				assets={bodyJetThumbnails}
				style={matchingPreset(node, bodyJetPresets)}
				fallback="round-flush"
			/>
		);
	if (type.includes("shower-control"))
		return (
			<RenderedThumbnail
				assets={showerControlThumbnails}
				style={matchingPreset(node, showerControlPresets)}
				fallback="round-lever"
			/>
		);
	if (type.includes("shower-hose"))
		return (
			<RenderedThumbnail
				assets={showerHoseThumbnails}
				style={style}
				fallback="smooth"
			/>
		);
	if (type.includes("hand-shower"))
		return (
			<RenderedThumbnail
				assets={handShowerThumbnails}
				style={style}
				fallback="round"
			/>
		);
	if (type.includes("shower-mount"))
		return (
			<RenderedThumbnail
				assets={showerMountThumbnails}
				style={style}
				fallback="round-holder"
			/>
		);
	if (type.includes("shower-head"))
		return (
			<RenderedThumbnail
				assets={showerHeadThumbnails}
				style={style}
				fallback="round-rain"
			/>
		);
	if (type.includes("shower-arm"))
		return (
			<RenderedThumbnail
				assets={showerArmThumbnails}
				style={style}
				fallback="round-adjustable"
			/>
		);
	if (type.includes("shower-assembly"))
		return (
			<RenderedThumbnail
				assets={assemblyThumbnails}
				style={matchingPreset(node, showerAssemblyPresets)}
				fallback="round-column"
			/>
		);
	if (type === BATHTUB)
		return (
			<BathPreview shape={"shape" in node ? String(node.shape) : undefined} />
		);
	if (type.includes("toilet-paper-holder"))
		return (
			<HolderPreview
				shape={
					"shape" in node && typeof node.shape === "string"
						? node.shape
						: undefined
				}
			/>
		);
	if (type.includes("flush-"))
		return (
			<FlushPlatePreview
				shape={
					"shape" in node && typeof node.shape === "string"
						? node.shape
						: undefined
				}
			/>
		);
	if (type === FLOOR_STANDING_TOILET)
		return (
			<FloorToiletPreview
				design={(node as unknown as FloorStandingToiletNode).design}
			/>
		);
	if (type === WALL_HUNG_TOILET)
		return (
			<ToiletPreview style={(node as unknown as WallHungToiletNode).style} />
		);
	if (type.includes("vanity"))
		return <PlacedVanityPreview node={node as unknown as VanityNode} />;
	if (type === "bath-space:tap") {
		const preset = tapPresets.find(
			(preset) => preset.id === ("presetId" in node ? node.presetId : null),
		);
		if (preset)
			return (
				<img
					src={preset.thumbnail}
					alt=""
					className="h-full w-full object-contain"
				/>
			);
	}
	if (isBasinKind(type)) {
		const shape =
			"shape" in node &&
			["round", "oval", "rectangle"].includes(String(node.shape))
				? (node.shape as "round" | "oval" | "rectangle")
				: "oval";
		const thumbnail = getBasinShapeThumbnail(type, shape);
		if (thumbnail)
			return (
				<img src={thumbnail} alt="" className="h-full w-full object-contain" />
			);
		if (type === WALL_HUNG_BASIN) {
			const design =
				"wallDesign" in node ? String(node.wallDesign) : "sculpted";
			const assets = {
				classic: new URL(
					"./wall-hung-basin/assets/classic.webp",
					import.meta.url,
				).href,
				box: new URL("./wall-hung-basin/assets/box.webp", import.meta.url).href,
				shallow: new URL(
					"./wall-hung-basin/assets/shallow.webp",
					import.meta.url,
				).href,
				sculpted: wallHungBasinThumbnail,
			};
			return (
				<RenderedThumbnail assets={assets} style={design} fallback="sculpted" />
			);
		}
		const src =
			type === FULL_PEDESTAL_BASIN
				? fullPedestalBasinThumbnail
				: halfPedestalBasinThumbnail;
		return <img src={src} alt="" className="h-full w-full object-contain" />;
	}
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 88 64"
			className="h-full w-full p-4 text-foreground/85"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.6"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M43 51V25c0-8 4-13 9-13s9 5 9 13v26M39 51h26M52 12V8m5 4V8" />
		</svg>
	);
}

function PlacedItemCard({
	node,
	location,
}: {
	node: AnyNode;
	location: FixtureRow | undefined;
}) {
	const selected = useViewer((state) =>
		state.selection.selectedIds.includes(node.id),
	);
	const type = String(node.type);
	const label =
		node.name || type.replace("bath-space:", "").replaceAll("-", " ");
	return (
		<CatalogItemCard
			type="button"
			aria-label={`Select ${label}`}
			aria-pressed={selected}
			onClick={() => {
				const editor = useEditor.getState();
				editor.setTool(null);
				editor.setMode("select");
				editor.setPhase("building");
				useViewer.getState().setSelection({
					buildingId: location?.buildingId ?? null,
					levelId: location?.levelId ?? null,
					zoneId: null,
					selectedIds: [node.id],
				});
			}}
			label={label}
		>
			<PlacedPreview node={node} />
		</CatalogItemCard>
	);
}

type BathSpaceCatalogProps = {
	category?: string;
	basinMount?: "vanity" | "wall";
	footer?: ReactNode;
	completed?: boolean;
};

export default function BathSpaceCatalog(props: BathSpaceCatalogProps = {}) {
	return (
		<CatalogPlacementProvider footer={props.footer} completed={props.completed}>
			<BathSpaceCatalogContent {...props} />
		</CatalogPlacementProvider>
	);
}

function BathSpaceCatalogContent({
	category,
	basinMount,
}: BathSpaceCatalogProps) {
	const placement = useCatalogPlacement()!;
	const preferences = useCatalogPreferences();

	const styleKey = (mount: string | null, style: string) => `${mount}:${style}`;

	const activeTool = useEditor((state) => state.tool);
	const setTool = useEditor((state) => state.setTool);
	const nodes = useScene((state) => state.nodes);
	const presetId = useVanityPlacementPreset();
	const basinShape = useBasinPlacementShape();
	const wallDesign = useWallBasinPlacementDesign();
	const placingBasin = isBasinKind(activeTool ?? "");
	const basinKind =
		placement.category?.group === "basin"
			? placement.category.value
			: placement.category?.group === "catalog" &&
					placement.category.value === "Basin"
				? basinMount === "wall"
					? WALL_HUNG_BASIN
					: COUNTERTOP_BASIN
				: null;
	const [query, setQuery] = useState("");
	const [browseCategory, setActiveCategory] = useState("Vanity");
	const [categoryRevision, setCategoryRevision] = useState(0);
	const [scheduleOpen, setScheduleOpen] = useState(false);
	const tabsId = useId();
	useEffect(() => {
		if (category) return;
		try {
			const saved = localStorage.getItem("bath-space-catalog-category");
			if (
				saved &&
				[
					"Everything",
					"Vanity",
					"Basin",
					"Toilet",
					"Shower",
					"Bath",
					"Taps",
					"Accessories",
				].includes(saved)
			)
				setActiveCategory(saved);
		} catch {}
	}, [category]);
	const chooseCategory = (next: string) => {
		setActiveCategory(next);
		setCategoryRevision((revision) => revision + 1);
		placement.selectCategory("catalog", next);
		if (!category)
			try {
				localStorage.setItem("bath-space-catalog-category", next);
			} catch {}
	};
	const activeCategory = category ?? browseCategory;
	const [activeTab, setActiveTab] = useState<"All" | "Placed">("All");
	const selectedKind =
		placement.category?.group === "vanity"
			? placement.category.value
			: placement.category?.group === "catalog" &&
					placement.category.value === "Vanity"
				? FREESTANDING_VANITY
				: null;
	const placing =
		activeTool === FREESTANDING_VANITY ||
		activeTool === WALL_MOUNTED_VANITY ||
		activeTool === CORNER_VANITY;
	const vanityCategories = [
		{
			value: FREESTANDING_VANITY,
			label: "Freestanding",
			description: "Floor-standing vanities",
		},
		{
			value: WALL_MOUNTED_VANITY,
			label: "Wall-mounted",
			description: "Floating wall vanities",
		},
		{
			value: CORNER_VANITY,
			label: "Corner",
			description: "Angled front vanities for 90° corners",
		},
	] as const;
	const basinCategories = [
		{
			label: "Countertop",
			description: "Vessel basin",
			value: COUNTERTOP_BASIN,
		},
		{
			label: "Undermount",
			description: "Below the counter",
			value: UNDERMOUNT_BASIN,
		},
		{
			label: "Drop-in",
			description: "Rim sits on counter",
			value: DROP_IN_BASIN,
		},
		{
			label: "Semi-recessed",
			description: "Projects from counter",
			value: SEMI_RECESSED_BASIN,
		},
		{
			label: "Wall hung",
			description: "Mounted to a wall",
			value: WALL_HUNG_BASIN,
		},
		{
			label: "Full pedestal",
			description: "Wall attached, floor standing",
			value: FULL_PEDESTAL_BASIN,
		},
		{
			label: "Half pedestal",
			description: "Wall mounted with a short shroud",
			value: HALF_PEDESTAL_BASIN,
		},
	] as const;
	const search = query.trim().toLowerCase();
	const words = search.replaceAll("-", " ").split(/\s+/).filter(Boolean);
	const matches = (text: string) =>
		words.every((word) =>
			text.toLowerCase().replaceAll("-", " ").includes(word),
		);
	const categoryItems = Object.values(nodes).filter((node) => {
		const type = String(node.type);
		if (!type.startsWith("bath-space:")) return false;
		if (activeCategory === "Accessories")
			return (
				type === "bath-space:wall-light" ||
				type === "bath-space:mirror" ||
				type === "bath-space:towel-rail" ||
				type.includes("toilet-paper-holder")
			);
		if (activeCategory === "Everything") return true;
		if (activeCategory === "Vanity") return type.includes("vanity");
		if (activeCategory === "Basin") return type.includes("basin");
		if (activeCategory === "Taps") return type.includes("tap");
		if (activeCategory === "Shower")
			return (
				type.includes("shower") ||
				type.includes("wall-spout") ||
				type.includes("body-jet")
			);
		if (activeCategory === "Bath")
			return (
				type === BATHTUB ||
				type === BATH_DECK ||
				type === BATH_SCREEN ||
				type === BATH_SHOWER
			);
		if (activeCategory === "Toilet")
			return type.includes("toilet") || type.includes("flush-");
		return false;
	});
	const fixtureLocations = new Map(
		fixtureInventory(nodes).map((row) => [row.id, row]),
	);
	const showCategory = (name: string) =>
		(!category && search && activeTab === "All") ||
		activeCategory === "Everything" ||
		activeCategory === name;
	const searchWords = search.split(/\s+/).filter(Boolean);
	const placedItems = categoryItems.filter((node) =>
		searchWords.every((word) =>
			`${node.name || ""} ${String(node.type).replace("bath-space:", "").replaceAll("-", " ")}`
				.toLowerCase()
				.includes(word),
		),
	);
	const vanityText = (value: string | null) => {
		const category = vanityCategories.find((option) => option.value === value);
		return `vanity ${category?.label ?? ""} ${category?.description ?? ""}`;
	};
	const basinText = (value: string | null) => {
		const category = basinCategories.find((option) => option.value === value);
		return `basin ${category?.label ?? ""} ${category?.description ?? ""}`;
	};
	const presetsForBasin = (value: string | null) =>
		value === HALF_PEDESTAL_BASIN
			? halfPedestalBasinPresets
			: value === FULL_PEDESTAL_BASIN
				? fullPedestalBasinPresets
				: value === WALL_HUNG_BASIN
					? wallHungBasinPresets
					: value === SEMI_RECESSED_BASIN
						? semiRecessedBasinPresets
						: basinPresets;
	const visibleVanityCategories = vanityCategories.filter((category) =>
		category.value === CORNER_VANITY
			? matches(`${vanityText(category.value)} angled front`)
			: vanityPresets.some((preset) =>
					matches(
						`${vanityText(category.value)} ${preset.label} ${preset.description}`,
					),
				),
	);
	const visibleBasinCategories = basinCategories
		.filter(
			(category) =>
				!basinMount ||
				(basinMount === "wall"
					? [
							WALL_HUNG_BASIN,
							FULL_PEDESTAL_BASIN,
							HALF_PEDESTAL_BASIN,
						].includes(category.value)
					: [
							COUNTERTOP_BASIN,
							UNDERMOUNT_BASIN,
							DROP_IN_BASIN,
							SEMI_RECESSED_BASIN,
						].includes(category.value)),
		)
		.filter((category) =>
			presetsForBasin(category.value).some((preset) =>
				matches(
					`${basinText(category.value)} ${preset.label} ${"description" in preset ? preset.description : ""}`,
				),
			),
		);
	const kind = visibleVanityCategories.some(
		(option) => option.value === selectedKind,
	)
		? (visibleVanityCategories.find((option) => option.value === selectedKind)
				?.value ?? FREESTANDING_VANITY)
		: (visibleVanityCategories[0]?.value ?? FREESTANDING_VANITY);
	const wallMounted = kind === WALL_MOUNTED_VANITY;
	const corner = kind === CORNER_VANITY;
	const placingKind = placing && activeTool === kind;
	const visibleVanityPresets = vanityPresets.filter((preset) =>
		matches(`${vanityText(kind)} ${preset.label} ${preset.description}`),
	);
	const currentBasinKind = visibleBasinCategories.some(
		(option) => option.value === basinKind,
	)
		? (basinKind ?? COUNTERTOP_BASIN)
		: (visibleBasinCategories[0]?.value ?? COUNTERTOP_BASIN);
	const halfPedestal = currentBasinKind === HALF_PEDESTAL_BASIN;
	const fullPedestal = currentBasinKind === FULL_PEDESTAL_BASIN;
	const wallHung = currentBasinKind === WALL_HUNG_BASIN;
	const inset = isInsetBasinKind(currentBasinKind);
	const visibleWallBasinPresets = wallHungBasinPresets.filter((preset) =>
		matches(
			`${basinText(currentBasinKind)} ${preset.label} ${preset.description}`,
		),
	);
	const visibleBasinPresets = (
		halfPedestal
			? halfPedestalBasinPresets
			: fullPedestal
				? fullPedestalBasinPresets
				: currentBasinKind === SEMI_RECESSED_BASIN
					? semiRecessedBasinPresets
					: basinPresets
	).filter((preset) =>
		matches(`${basinText(currentBasinKind)} ${preset.label}`),
	);

	const vanityStyleId = placement.selection?.key.startsWith(`${kind}:`)
		? placement.selection.key.slice(kind.length + 1)
		: presetId;
	const vanityStyleLabel = corner
		? "Angled front"
		: vanityPresets.find((preset) => preset.id === vanityStyleId)?.label;
	const basinStyleId = placement.selection?.key.startsWith(
		`${currentBasinKind}:`,
	)
		? placement.selection.key.slice(currentBasinKind.length + 1)
		: wallHung
			? wallDesign
			: basinShape;
	const basinStyleLabel = wallHung
		? visibleWallBasinPresets.find(
				(preset) => preset.wallDesign === basinStyleId,
			)?.label
		: visibleBasinPresets.find((preset) => preset.shape === basinStyleId)
				?.label;

	return (
		<div className="flex h-full min-h-0 flex-col">
			{!category && (
				<header className="shrink-0 px-4 pb-2 pt-3">
					<div className="mb-2 flex items-center justify-between gap-2">
						<h1 className="text-sm font-semibold text-foreground">Bathroom</h1>
						<button
							type="button"
							onClick={() => {
								placement.clear();
								setScheduleOpen(true);
							}}
							className="min-h-8 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent/40 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
						>
							Schedule
						</button>
					</div>
					{
						<label
							className="focus-within:ring-2 focus-within:ring-ring"
							style={{
								height: 36,
								display: "flex",
								alignItems: "center",
								gap: 8,
								padding: "0 10px",
								border: "1px solid var(--border)",
								borderRadius: 6,
								background: "var(--secondary)",
								color: "var(--muted-foreground)",
							}}
						>
							<svg
								viewBox="0 0 24 24"
								aria-hidden="true"
								width="17"
								height="17"
								style={{ width: 17, height: 17, flex: "0 0 17px" }}
								fill="none"
								stroke="currentColor"
								strokeWidth="1.8"
								strokeLinecap="round"
							>
								<circle cx="10.8" cy="10.8" r="6.3" />
								<path d="m16 16 4.2 4.2" />
							</svg>
							<input
								type="search"
								value={query}
								onChange={(event) => {
									setQuery(event.currentTarget.value);
									placement.clear();
								}}
								placeholder={
									activeTab === "Placed"
										? "Search fixtures in scene"
										: category
											? `Search ${category.toLowerCase()}`
											: "Search bathroom items"
								}
								aria-label="Search bathroom fixtures"
								style={{
									width: "100%",
									minWidth: 0,
									flex: 1,
									border: 0,
									outline: 0,
									padding: 0,
									background: "transparent",
									color: "var(--foreground)",
									font: "inherit",
									fontSize: 13,
								}}
							/>
						</label>
					}
					<div
						role="tablist"
						aria-label="Bathroom catalog filter"
						className="mt-2 grid grid-cols-2 border-b border-border"
						style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
					>
						{(["All", "Placed"] as const).map((tab) => (
							<button
								key={tab === "All" ? "Browse" : "In scene"}
								role="tab"
								aria-selected={activeTab === tab}
								id={`${tabsId}-${tab}`}
								aria-controls={`${tabsId}-content`}
								tabIndex={activeTab === tab ? 0 : -1}
								onKeyDown={(event) => {
									if (
										!["ArrowLeft", "ArrowRight", "Home", "End"].includes(
											event.key,
										)
									)
										return;
									event.preventDefault();
									const next =
										event.key === "Home"
											? "All"
											: event.key === "End"
												? "Placed"
												: activeTab === "All"
													? "Placed"
													: "All";
									setActiveTab(next);
									placement.clear();
									document.getElementById(`${tabsId}-${next}`)?.focus();
								}}
								onClick={() => {
									setActiveTab(tab);
									placement.clear();
								}}
								type="button"
								className={`flex items-center justify-center gap-1.5 border-b-2 px-2 py-2 text-xs font-medium transition-colors ${activeTab === tab ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
							>
								{tab === "All" ? "Browse" : "In scene"}{" "}
								{tab === "Placed" && (
									<span className="rounded bg-secondary/60 px-1.5 text-[11px] tabular-nums">
										{categoryItems.length}
									</span>
								)}
							</button>
						))}
					</div>
				</header>
			)}
			<CatalogScrollArea
				resetKey={`${activeTab}:${activeCategory}:${categoryRevision}:${query}`}
				role={!category ? "tabpanel" : undefined}
				id={`${tabsId}-content`}
				aria-labelledby={!category ? `${tabsId}-${activeTab}` : undefined}
				className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4"
			>
				{!category && (
					<div
						className="flex flex-wrap gap-1.5 pb-4"
						aria-label="Bathroom fixture categories"
					>
						{[
							"Everything",
							"Vanity",
							"Basin",
							"Toilet",
							"Shower",
							"Bath",
							"Taps",
							"Accessories",
						].map((category) => (
							<button
								key={category === "Everything" ? "All categories" : category}
								type="button"
								aria-pressed={activeCategory === category}
								onClick={() => {
									chooseCategory(category);
								}}
								className={`rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring ${activeCategory === category ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/40 text-foreground hover:bg-accent/40"}`}
							>
								{category === "Everything" ? "All categories" : category}
							</button>
						))}
					</div>
				)}
				{activeTab === "Placed" ? (
					<div className="pt-2">
						{placedItems.length ? (
							<div className="space-y-3">
								<CatalogHeading>{activeCategory}</CatalogHeading>
								<CatalogGrid aria-label="Placed bathroom fixtures">
									{placedItems.map((node) => (
										<PlacedItemCard
											key={node.id}
											node={node}
											location={fixtureLocations.get(node.id)}
										/>
									))}
								</CatalogGrid>
							</div>
						) : (
							<CatalogEmptyState>
								{categoryItems.length
									? `No placed items match "${query.trim()}".`
									: activeCategory === "Everything"
										? "No bathroom items placed yet."
										: `No ${activeCategory.toLowerCase()} items placed yet.`}
							</CatalogEmptyState>
						)}
					</div>
				) : (
					<CatalogResults
						key={`${activeCategory}:${categoryRevision}`}
						query={query}
					>
						{showCategory("Vanity") && visibleVanityCategories.length > 0 && (
							<CatalogSection>
								<div className="space-y-3">
									<CatalogHeading
										selection={
											selectedKind
												? `${vanityCategories.find((option) => option.value === kind)?.label} · ${vanityStyleLabel ?? ""}`
												: undefined
										}
									>
										Vanity
									</CatalogHeading>
									<CatalogChoiceGroup
										value={selectedKind}
										onChange={(value) => {
											placement.selectCategory("vanity", value);
										}}
										options={visibleVanityCategories.map((option) => ({
											id: option.value,
											label: option.label,
											count:
												option.value === CORNER_VANITY
													? 1
													: vanityPresets.filter((preset) =>
															matches(
																`${vanityText(option.value)} ${preset.label} ${preset.description}`,
															),
														).length,
											selectedStyle:
												option.value === kind ? vanityStyleLabel : undefined,
											preview: (
												<VanityPreview
													design={
														option.value === kind ? vanityStyleId : "modern"
													}
													wallMounted={option.value === WALL_MOUNTED_VANITY}
													corner={option.value === CORNER_VANITY}
												/>
											),
										}))}
									>
										{corner ? (
											<CatalogGrid columns={4} aria-label="Vanity style">
												<CatalogItemCard
													type="button"
													aria-label="Choose Angled front vanity"
													placementKey={styleKey(CORNER_VANITY, "angled-front")}
													placementHint={
														corner
															? "Click near a 90° corner."
															: wallMounted
																? "Click a wall to attach."
																: "Click the floor to place."
													}
													placementNoun="vanity"
													placementLabel="Corner vanity · Angled front"
													onPlace={() => {
														preferences.remember(
															styleKey(CORNER_VANITY, "angled-front"),
														);
														setTool(CORNER_VANITY);
													}}
													aria-pressed={true}
													label="Angled front"
												>
													<VanityPreview corner />
												</CatalogItemCard>
											</CatalogGrid>
										) : (
											<CatalogGrid columns={4} aria-label="Vanity style">
												{visibleVanityPresets.map((preset) => {
													const selected = vanityStyleId === preset.id;
													return (
														<CatalogItemCard
															key={preset.id}
															type="button"
															aria-pressed={selected}
															aria-label={`Choose ${preset.label} vanity`}
															placementKey={styleKey(kind, preset.id)}
															placementHint={
																corner
																	? "Click near a 90° corner."
																	: wallMounted
																		? "Click a wall to attach."
																		: "Click the floor to place."
															}
															placementNoun="vanity"
															placementLabel={`${vanityCategories.find((option) => option.value === kind)?.label} vanity · ${preset.label}`}
															placementDescription={preset.description}
															onPlace={() => {
																preferences.remember(styleKey(kind, preset.id));
																setVanityPlacementPreset(preset.id);
																setTool(kind);
															}}
															label={preset.label}
														>
															<VanityPreview
																design={preset.id}
																wallMounted={wallMounted}
															/>
														</CatalogItemCard>
													);
												})}
											</CatalogGrid>
										)}
										{!corner && visibleVanityPresets.length === 0 && (
											<CatalogEmptyState>{`No vanity styles match "${query.trim()}".`}</CatalogEmptyState>
										)}
									</CatalogChoiceGroup>
									{placingKind && (
										<p role="status" className="text-xs text-muted-foreground">
											{corner
												? "Click near a 90° corner."
												: wallMounted
													? "Click a wall to place."
													: "Click to place."}{" "}
											Esc to cancel.
										</p>
									)}
								</div>
							</CatalogSection>
						)}
						{showCategory("Basin") && visibleBasinCategories.length > 0 && (
							<CatalogSection>
								<div className="space-y-3">
									<CatalogHeading
										selection={
											basinKind
												? `${basinCategories.find((option) => option.value === currentBasinKind)?.label} · ${basinStyleLabel ?? ""}`
												: undefined
										}
									>
										Basin
									</CatalogHeading>
									<CatalogChoiceGroup
										value={basinKind}
										onChange={(value) => {
											placement.selectCategory("basin", value);
										}}
										options={visibleBasinCategories.map((option) => ({
											id: option.value,
											label: option.label,
											count: presetsForBasin(option.value).filter((preset) =>
												matches(
													`${basinText(option.value)} ${preset.label} ${"description" in preset ? preset.description : ""}`,
												),
											).length,
											selectedStyle:
												option.value === currentBasinKind
													? basinStyleLabel
													: undefined,
											preview:
												option.value === WALL_HUNG_BASIN ? (
													<img
														src={wallHungBasinThumbnail}
														alt=""
														loading="lazy"
														className="h-full w-full object-contain"
													/>
												) : option.value === FULL_PEDESTAL_BASIN ? (
													<img
														src={fullPedestalBasinThumbnail}
														alt=""
														loading="lazy"
														className="h-full w-full object-contain"
													/>
												) : option.value === HALF_PEDESTAL_BASIN ? (
													<img
														src={halfPedestalBasinThumbnail}
														alt=""
														loading="lazy"
														className="h-full w-full object-contain"
													/>
												) : getBasinShapeThumbnail(option.value, "round") ? (
													<img
														src={getBasinShapeThumbnail(option.value, "round")!}
														alt=""
														loading="lazy"
														style={{ transform: "scale(1.28)" }}
														className="h-full w-full object-contain"
													/>
												) : (
													<BasinPreview
														shape="oval"
														semiRecessed={option.value === SEMI_RECESSED_BASIN}
													/>
												),
										}))}
									>
										{wallHung ? (
											<CatalogGrid
												columns={4}
												aria-label="Wall hung basin designs"
											>
												{visibleWallBasinPresets.map((preset) => {
													const selected = basinStyleId === preset.wallDesign;
													return (
														<CatalogItemCard
															key={preset.wallDesign}
															type="button"
															aria-pressed={selected}
															aria-label={`Choose ${preset.label} basin`}
															placementKey={styleKey(
																currentBasinKind,
																preset.wallDesign,
															)}
															placementHint={
																halfPedestal || fullPedestal || wallHung
																	? "Click a wall to attach."
																	: inset
																		? "Click a vanity countertop to place."
																		: "Click a countertop or top surface to place."
															}
															placementNoun="basin"
															placementLabel={`Wall hung basin · ${preset.label}`}
															placementDescription={
																<CatalogDimensions
																	width={preset.width}
																	depth={preset.depth}
																/>
															}
															onPlace={() => {
																preferences.remember(
																	styleKey(currentBasinKind, preset.wallDesign),
																);
																setWallBasinPlacementDesign(preset.wallDesign);
																setTool(WALL_HUNG_BASIN);
															}}
															label={preset.label}
														>
															<img
																src={preset.thumbnail}
																alt=""
																width={720}
																height={540}
																loading="lazy"
																className="h-full w-full object-cover"
															/>
														</CatalogItemCard>
													);
												})}
											</CatalogGrid>
										) : (
											<CatalogGrid columns={4} aria-label="Basin shape">
												{visibleBasinPresets.map((preset) => {
													const presetThumbnail =
														fullPedestal && "pedestalDesign" in preset
															? preset.pedestalDesign === "classic"
																? fullPedestalBasinThumbnail
																: preset.pedestalDesign === "square"
																	? squareFullPedestalBasinThumbnail
																	: taperedMonoblocBasinThumbnail
															: halfPedestal && "shroudDesign" in preset
																? preset.shroudDesign === "curved"
																	? halfPedestalBasinThumbnail
																	: preset.shroudDesign === "square"
																		? squareHalfPedestalBasinThumbnail
																		: integratedHalfPedestalBasinThumbnail
																: getBasinShapeThumbnail(
																		currentBasinKind ?? COUNTERTOP_BASIN,
																		preset.shape,
																	);
													return (
														<CatalogItemCard
															key={preset.shape}
															type="button"
															aria-pressed={basinStyleId === preset.shape}
															aria-label={`Choose ${preset.label} basin`}
															placementKey={styleKey(
																currentBasinKind,
																preset.shape,
															)}
															placementHint={
																halfPedestal || fullPedestal || wallHung
																	? "Click a wall to attach."
																	: inset
																		? "Click a vanity countertop to place."
																		: "Click a countertop or top surface to place."
															}
															placementNoun="basin"
															placementLabel={`${basinCategories.find((option) => option.value === currentBasinKind)?.label} basin · ${preset.label}`}
															placementDescription={
																<CatalogDimensions
																	width={preset.width}
																	depth={preset.depth}
																/>
															}
															onPlace={() => {
																preferences.remember(
																	styleKey(currentBasinKind, preset.shape),
																);
																setBasinPlacementShape(preset.shape);
																setTool(currentBasinKind);
															}}
															label={preset.label}
														>
															{presetThumbnail ? (
																<img
																	src={presetThumbnail}
																	alt=""
																	loading="lazy"
																	style={{ transform: "scale(1.28)" }}
																	className="h-full w-full object-contain"
																/>
															) : (
																<BasinPreview
																	shape={preset.shape}
																	pedestal={fullPedestal}
																	halfPedestal={halfPedestal}
																	semiRecessed={
																		currentBasinKind === SEMI_RECESSED_BASIN
																	}
																/>
															)}
														</CatalogItemCard>
													);
												})}
											</CatalogGrid>
										)}
										{(wallHung
											? visibleWallBasinPresets.length
											: visibleBasinPresets.length) === 0 && (
											<CatalogEmptyState>{`No basin styles match "${query.trim()}".`}</CatalogEmptyState>
										)}
									</CatalogChoiceGroup>
									{placingBasin && activeTool === currentBasinKind && (
										<p role="status" className="text-xs text-muted-foreground">
											{halfPedestal || fullPedestal || wallHung
												? "Click a wall to place."
												: inset
													? "Click a vanity countertop to place."
													: "Click a surface to place."}{" "}
											Esc to cancel.
										</p>
									)}
								</div>
							</CatalogSection>
						)}
						{showCategory("Taps") && <TapCatalog query={query} />}
						{showCategory("Toilet") && <ToiletCatalog query={query} />}
						{showCategory("Toilet") && <FloorToiletCatalog query={query} />}
						{showCategory("Toilet") && <FlushPlateCatalog query={query} />}
						{(showCategory("Toilet") || activeCategory === "Accessories") && (
							<HolderCatalog query={query} />
						)}
						{showCategory("Accessories") && <MirrorCatalog query={query} />}
						{showCategory("Accessories") && <TowelRailCatalog query={query} />}
						{showCategory("Accessories") && <WallLightCatalog query={query} />}
						{showCategory("Shower") && <ShowerArmCatalog query={query} />}
						{showCategory("Shower") && <ShowerHeadCatalog query={query} />}
						{showCategory("Shower") && <ShowerMountCatalog query={query} />}
						{showCategory("Shower") && <HandShowerCatalog query={query} />}
						{showCategory("Shower") && <ShowerControlCatalog query={query} />}
						{showCategory("Shower") && <WallSpoutCatalog query={query} />}
						{showCategory("Shower") && <DividerCatalog query={query} />}
						{showCategory("Shower") && <ShowerKitCatalog query={query} />}
						{showCategory("Shower") && <ShowerAssemblyCatalog query={query} />}
						{showCategory("Shower") && <BodyJetCatalog query={query} />}
						{showCategory("Shower") && <ShowerHoseCatalog query={query} />}
						{showCategory("Bath") && <BathCatalog query={query} />}
					</CatalogResults>
				)}
			</CatalogScrollArea>
			<FixtureScheduleDialog
				open={scheduleOpen}
				onClose={() => setScheduleOpen(false)}
			/>
		</div>
	);
}
