import { create } from "zustand";
import { STANDARD_LAMP_HEIGHT_M } from "./lamp-constants";
import type { RoadSide, RoadSideComponentWidthKey } from "./road-cross-section";
import { roadDraftSettingsForPreset } from "./road-draft-style";
import type { RoadSignId } from "./road-sign-config";
import type { RoadStylePresetId } from "./road-style-presets";
import {
	DEFAULT_ROAD_AUTO_INFRASTRUCTURE_SETTINGS,
	type RoadAutoInfrastructureSettings,
} from "./road-auto-infrastructure-settings";
import type { RoadSideComponents, UtilityPoleAssembly } from "./schema";
import type { StreetInfrastructureKind } from "./street-infrastructure-config";
import {
	STANDARD_UTILITY_POLE_CROSSARM_LENGTH_M,
	STANDARD_UTILITY_POLE_EXPOSED_HEIGHT_M,
} from "./utility-pole-geometry";

export type EnvironmentPlacementMode = "single" | "continuous";
export type EnvironmentPanelCategory =
	| "roads"
	| "lighting"
	| "signs"
	| "utilities";
export type RoadAlignmentMode = "straight" | "spline";
export type RoadCrossSectionEditorTab = "roadway" | RoadSide;
export type RoadElevationMode = "ground" | "bridge";
export const ROAD_ELEVATION_OPTIONS: Array<{
	label: string;
	value: RoadElevationMode;
}> = [
	{ label: "Ground", value: "ground" },
	{ label: "Bridge", value: "bridge" },
];

export function nextRoadElevationMode(
	mode: RoadElevationMode,
): RoadElevationMode {
	return mode === "bridge" ? "ground" : "bridge";
}
export type RoadJoinMode = "auto" | "suppress";
export type RoadElementSelection = {
	networkId: string;
	kind: "control" | "corner" | "edge" | "endpoint" | "junction" | "spline";
	id: string;
	cornerKey?: string;
	index?: number;
	indices?: number[];
};

/**
 * The plugin's own module-level state — the example of "plugins self-manage
 * runtime state with module-level stores" from the plugin-authoring contract.
 * It holds the active catalog category and environment placement brushes. The
 * panel writes it and placement tools read it; colours and intensity remain
 * inspector-only.
 */
type EnvironmentStore = {
	/** Active catalog category in the Environment panel. */
	panelCategory: EnvironmentPanelCategory;
	setPanelCategory: (value: EnvironmentPanelCategory) => void;
	/** Whether a placement tool exits after one click or stays armed. */
	placementMode: EnvironmentPlacementMode;
	setPlacementMode: (value: EnvironmentPlacementMode) => void;
	/** Whether the road tool commits each leg directly or drafts one multi-point spline. */
	roadAlignmentMode: RoadAlignmentMode;
	setRoadAlignmentMode: (value: RoadAlignmentMode) => void;
	roadBendRadius: number;
	setRoadBendRadius: (value: number) => void;
	roadElevationMode: RoadElevationMode;
	setRoadElevationMode: (value: RoadElevationMode) => void;
	roadCrossSectionEditorTab: RoadCrossSectionEditorTab;
	setRoadCrossSectionEditorTab: (value: RoadCrossSectionEditorTab) => void;
	roadStylePresetId: RoadStylePresetId;
	setRoadStylePresetId: (value: RoadStylePresetId) => void;
	roadLaneCount: number;
	setRoadLaneCount: (value: number) => void;
	roadLaneWidth: number;
	setRoadLaneWidth: (value: number) => void;
	roadShoulderWidth: number;
	setRoadShoulderWidth: (value: number) => void;
	roadMedianWidth: number;
	setRoadMedianWidth: (value: number) => void;
	/** Components authored for the next road, independently on each side. */
	roadSideComponents: Record<RoadSide, RoadSideComponents>;
	setRoadSideComponentWidth: (
		side: RoadSide,
		key: RoadSideComponentWidthKey,
		value: number,
	) => void;
	roadJoinMode: RoadJoinMode;
	setRoadJoinMode: (value: RoadJoinMode) => void;
	/** Automatic editable assets created with each committed road segment. */
	roadAutoInfrastructure: RoadAutoInfrastructureSettings;
	setRoadAutoInfrastructureEnabled: (value: boolean) => void;
	setRoadAutoInfrastructureItem: (
		kind: StreetInfrastructureKind,
		value: boolean,
	) => void;
	roadElementSelection: RoadElementSelection | null;
	setRoadElementSelection: (value: RoadElementSelection | null) => void;
	/** Height (m) of the next street light. */
	streetLightHeight: number;
	/** Horizontal reach (m) of the next street light's arm. */
	streetLightArmLength: number;
	/** Whether newly placed street lights start illuminated. */
	streetLightOn: boolean;
	setStreetLightHeight: (value: number) => void;
	setStreetLightArmLength: (value: number) => void;
	setStreetLightOn: (value: boolean) => void;
	/** Height (m) of the next pedestrian post-top light. */
	postTopLightHeight: number;
	/** Whether newly placed pedestrian post-top lights start illuminated. */
	postTopLightOn: boolean;
	setPostTopLightHeight: (value: number) => void;
	setPostTopLightOn: (value: boolean) => void;
	/** Height and arm reach of the next heritage Bishop's Crook light. */
	heritageCrookHeight: number;
	heritageCrookArmReach: number;
	/** Whether newly placed heritage lamps start illuminated. */
	heritageCrookLightOn: boolean;
	setHeritageCrookHeight: (value: number) => void;
	setHeritageCrookArmReach: (value: number) => void;
	setHeritageCrookLightOn: (value: boolean) => void;
	/** Height and mast-arm reach of the next cobra-head roadway light. */
	cobraHeadHeight: number;
	cobraHeadArmLength: number;
	/** Whether newly placed cobra-head lamps start illuminated. */
	cobraHeadLightOn: boolean;
	setCobraHeadHeight: (value: number) => void;
	setCobraHeadArmLength: (value: number) => void;
	setCobraHeadLightOn: (value: boolean) => void;
	/** Height and reach of the next twin-arm median roadway light. */
	twinArmMedianHeight: number;
	twinArmMedianArmLength: number;
	/** Whether newly placed twin-arm median lamps start illuminated. */
	twinArmMedianLightOn: boolean;
	setTwinArmMedianHeight: (value: number) => void;
	setTwinArmMedianArmLength: (value: number) => void;
	setTwinArmMedianLightOn: (value: boolean) => void;
	/** Brush settings for the next three- or four-head area pole. */
	multiHeadAreaHeight: number;
	multiHeadAreaArmLength: number;
	multiHeadAreaHeadCount: 3 | 4;
	multiHeadAreaLightOn: boolean;
	setMultiHeadAreaHeight: (value: number) => void;
	setMultiHeadAreaArmLength: (value: number) => void;
	setMultiHeadAreaHeadCount: (value: 3 | 4) => void;
	setMultiHeadAreaLightOn: (value: boolean) => void;
	/** Brush settings for the next truss-bracket roadway lamp. */
	trussRoadwayHeight: number;
	trussRoadwayArmLength: number;
	trussRoadwayBraceDepth: number;
	trussRoadwayLightOn: boolean;
	setTrussRoadwayHeight: (value: number) => void;
	setTrussRoadwayArmLength: (value: number) => void;
	setTrussRoadwayBraceDepth: (value: number) => void;
	setTrussRoadwayLightOn: (value: boolean) => void;
	/** Shared brush settings for the remaining lamp catalog families. */
	catalogLampHeight: number;
	catalogLampArmLength: number;
	catalogLampVisualStyle: string;
	catalogLampLightOn: boolean;
	setCatalogLampHeight: (value: number) => void;
	setCatalogLampArmLength: (value: number) => void;
	setCatalogLampVisualStyle: (value: string) => void;
	setCatalogLampLightOn: (value: boolean) => void;
	/** Height (m) of the next utility pole. */
	utilityPoleHeight: number;
	/** Span (m) of the next utility pole's crossarm. */
	utilityPoleCrossarmLength: number;
	/** Whether newly placed utility poles carry a distribution transformer. */
	utilityPoleTransformerMounted: boolean;
	/** Structural assembly for the next utility pole. */
	utilityPoleAssembly: UtilityPoleAssembly;
	setUtilityPoleHeight: (value: number) => void;
	setUtilityPoleCrossarmLength: (value: number) => void;
	setUtilityPoleTransformerMounted: (value: boolean) => void;
	setUtilityPoleAssembly: (value: UtilityPoleAssembly) => void;
	/** Brush settings for the roadside sign catalog. */
	roadSignId: RoadSignId;
	roadSignPostHeight: number;
	roadSignScale: number;
	roadSignMounting: "single-post" | "double-post";
	setRoadSignId: (value: RoadSignId) => void;
	setRoadSignPostHeight: (value: number) => void;
	setRoadSignScale: (value: number) => void;
	setRoadSignMounting: (value: "single-post" | "double-post") => void;
};

const DEFAULT_ROAD_DRAFT = roadDraftSettingsForPreset("local-street");

export const useEnvironmentStore = create<EnvironmentStore>((set) => ({
	panelCategory: "roads",
	setPanelCategory: (panelCategory) => set({ panelCategory }),
	placementMode: "continuous",
	setPlacementMode: (placementMode) => set({ placementMode }),
	roadAlignmentMode: "straight",
	setRoadAlignmentMode: (roadAlignmentMode) => set({ roadAlignmentMode }),
	roadBendRadius: 5,
	setRoadBendRadius: (roadBendRadius) => set({ roadBendRadius }),
	roadElevationMode: "ground",
	setRoadElevationMode: (roadElevationMode) => set({ roadElevationMode }),
	roadCrossSectionEditorTab: "roadway",
	setRoadCrossSectionEditorTab: (roadCrossSectionEditorTab) =>
		set({ roadCrossSectionEditorTab }),
	roadStylePresetId: DEFAULT_ROAD_DRAFT.presetId,
	setRoadStylePresetId: (roadStylePresetId) => {
		const next = roadDraftSettingsForPreset(roadStylePresetId);
		set({
			roadStylePresetId,
			roadLaneCount: next.laneCount,
			roadLaneWidth: next.laneWidth,
			roadShoulderWidth: next.shoulderWidth,
			roadMedianWidth: next.medianWidth,
			roadSideComponents: next.sides,
		});
	},
	roadLaneCount: DEFAULT_ROAD_DRAFT.laneCount,
	setRoadLaneCount: (roadLaneCount) => set({ roadLaneCount }),
	roadLaneWidth: DEFAULT_ROAD_DRAFT.laneWidth,
	setRoadLaneWidth: (roadLaneWidth) => set({ roadLaneWidth }),
	roadShoulderWidth: DEFAULT_ROAD_DRAFT.shoulderWidth,
	setRoadShoulderWidth: (roadShoulderWidth) => set({ roadShoulderWidth }),
	roadMedianWidth: DEFAULT_ROAD_DRAFT.medianWidth,
	setRoadMedianWidth: (roadMedianWidth) => set({ roadMedianWidth }),
	roadSideComponents: DEFAULT_ROAD_DRAFT.sides,
	setRoadSideComponentWidth: (side, key, value) =>
		set((state) => ({
			roadSideComponents: {
				...state.roadSideComponents,
				[side]: {
					...state.roadSideComponents[side],
					[key]: value,
				},
			},
		})),
	roadJoinMode: "auto",
	setRoadJoinMode: (roadJoinMode) => set({ roadJoinMode }),
	roadAutoInfrastructure: {
		...DEFAULT_ROAD_AUTO_INFRASTRUCTURE_SETTINGS,
		items: { ...DEFAULT_ROAD_AUTO_INFRASTRUCTURE_SETTINGS.items },
	},
	setRoadAutoInfrastructureEnabled: (enabled) =>
		set((state) => ({
			roadAutoInfrastructure: {
				...state.roadAutoInfrastructure,
				enabled,
			},
		})),
	setRoadAutoInfrastructureItem: (kind, value) =>
		set((state) => ({
			roadAutoInfrastructure: {
				...state.roadAutoInfrastructure,
				items: {
					...state.roadAutoInfrastructure.items,
					[kind]: value,
				},
			},
		})),
	roadElementSelection: null,
	setRoadElementSelection: (roadElementSelection) =>
		set({ roadElementSelection }),
	streetLightHeight: STANDARD_LAMP_HEIGHT_M,
	streetLightArmLength: 1.2,
	streetLightOn: false,
	setStreetLightHeight: (streetLightHeight) => set({ streetLightHeight }),
	setStreetLightArmLength: (streetLightArmLength) =>
		set({ streetLightArmLength }),
	setStreetLightOn: (streetLightOn) => set({ streetLightOn }),
	postTopLightHeight: STANDARD_LAMP_HEIGHT_M,
	postTopLightOn: false,
	setPostTopLightHeight: (postTopLightHeight) => set({ postTopLightHeight }),
	setPostTopLightOn: (postTopLightOn) => set({ postTopLightOn }),
	heritageCrookHeight: STANDARD_LAMP_HEIGHT_M,
	heritageCrookArmReach: 0.9,
	heritageCrookLightOn: false,
	setHeritageCrookHeight: (heritageCrookHeight) => set({ heritageCrookHeight }),
	setHeritageCrookArmReach: (heritageCrookArmReach) =>
		set({ heritageCrookArmReach }),
	setHeritageCrookLightOn: (heritageCrookLightOn) =>
		set({ heritageCrookLightOn }),
	cobraHeadHeight: STANDARD_LAMP_HEIGHT_M,
	cobraHeadArmLength: 1.25,
	cobraHeadLightOn: false,
	setCobraHeadHeight: (cobraHeadHeight) => set({ cobraHeadHeight }),
	setCobraHeadArmLength: (cobraHeadArmLength) => set({ cobraHeadArmLength }),
	setCobraHeadLightOn: (cobraHeadLightOn) => set({ cobraHeadLightOn }),
	twinArmMedianHeight: STANDARD_LAMP_HEIGHT_M,
	twinArmMedianArmLength: 1.35,
	twinArmMedianLightOn: false,
	setTwinArmMedianHeight: (twinArmMedianHeight) => set({ twinArmMedianHeight }),
	setTwinArmMedianArmLength: (twinArmMedianArmLength) =>
		set({ twinArmMedianArmLength }),
	setTwinArmMedianLightOn: (twinArmMedianLightOn) =>
		set({ twinArmMedianLightOn }),
	multiHeadAreaHeight: STANDARD_LAMP_HEIGHT_M,
	multiHeadAreaArmLength: 1.2,
	multiHeadAreaHeadCount: 4,
	multiHeadAreaLightOn: false,
	setMultiHeadAreaHeight: (multiHeadAreaHeight) => set({ multiHeadAreaHeight }),
	setMultiHeadAreaArmLength: (multiHeadAreaArmLength) =>
		set({ multiHeadAreaArmLength }),
	setMultiHeadAreaHeadCount: (multiHeadAreaHeadCount) =>
		set({ multiHeadAreaHeadCount }),
	setMultiHeadAreaLightOn: (multiHeadAreaLightOn) =>
		set({ multiHeadAreaLightOn }),
	trussRoadwayHeight: STANDARD_LAMP_HEIGHT_M,
	trussRoadwayArmLength: 2,
	trussRoadwayBraceDepth: 0.75,
	trussRoadwayLightOn: false,
	setTrussRoadwayHeight: (trussRoadwayHeight) => set({ trussRoadwayHeight }),
	setTrussRoadwayArmLength: (trussRoadwayArmLength) =>
		set({ trussRoadwayArmLength }),
	setTrussRoadwayBraceDepth: (trussRoadwayBraceDepth) =>
		set({ trussRoadwayBraceDepth }),
	setTrussRoadwayLightOn: (trussRoadwayLightOn) => set({ trussRoadwayLightOn }),
	catalogLampHeight: STANDARD_LAMP_HEIGHT_M,
	catalogLampArmLength: 1.2,
	catalogLampVisualStyle: "shoebox",
	catalogLampLightOn: false,
	setCatalogLampHeight: (catalogLampHeight) => set({ catalogLampHeight }),
	setCatalogLampArmLength: (catalogLampArmLength) =>
		set({ catalogLampArmLength }),
	setCatalogLampVisualStyle: (catalogLampVisualStyle) =>
		set({ catalogLampVisualStyle }),
	setCatalogLampLightOn: (catalogLampLightOn) => set({ catalogLampLightOn }),
	utilityPoleHeight: STANDARD_UTILITY_POLE_EXPOSED_HEIGHT_M,
	utilityPoleCrossarmLength: STANDARD_UTILITY_POLE_CROSSARM_LENGTH_M,
	utilityPoleTransformerMounted: true,
	utilityPoleAssembly: "tangent",
	setUtilityPoleHeight: (utilityPoleHeight) => set({ utilityPoleHeight }),
	setUtilityPoleCrossarmLength: (utilityPoleCrossarmLength) =>
		set({ utilityPoleCrossarmLength }),
	setUtilityPoleTransformerMounted: (utilityPoleTransformerMounted) =>
		set({ utilityPoleTransformerMounted }),
	setUtilityPoleAssembly: (utilityPoleAssembly) => set({ utilityPoleAssembly }),
	roadSignId: "stop",
	roadSignPostHeight: 2.1,
	roadSignScale: 1,
	roadSignMounting: "single-post",
	setRoadSignId: (roadSignId) => set({ roadSignId }),
	setRoadSignPostHeight: (roadSignPostHeight) => set({ roadSignPostHeight }),
	setRoadSignScale: (roadSignScale) => set({ roadSignScale }),
	setRoadSignMounting: (roadSignMounting) => set({ roadSignMounting }),
}));
