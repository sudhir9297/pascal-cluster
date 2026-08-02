import { create } from 'zustand'
import {
  STANDARD_UTILITY_POLE_CROSSARM_LENGTH_M,
  STANDARD_UTILITY_POLE_EXPOSED_HEIGHT_M,
} from './utility-pole-geometry'
import { STANDARD_LAMP_HEIGHT_M } from './lamp-constants'
import type { UtilityPoleAssembly } from './schema'
import type { RoadSignId } from './road-sign-config'

export type EnvironmentPlacementMode = 'single' | 'continuous'
export type EnvironmentPanelCategory = 'lighting' | 'signs' | 'utilities'

/**
 * The plugin's own module-level state — the example of "plugins self-manage
 * runtime state with module-level stores" from the plugin-authoring contract.
 * It holds the active catalog category and environment placement brushes. The
 * panel writes it and placement tools read it; colours and intensity remain
 * inspector-only.
 */
type EnvironmentStore = {
  /** Active catalog category in the Environment panel. */
  panelCategory: EnvironmentPanelCategory
  setPanelCategory: (value: EnvironmentPanelCategory) => void
  /** Whether a placement tool exits after one click or stays armed. */
  placementMode: EnvironmentPlacementMode
  setPlacementMode: (value: EnvironmentPlacementMode) => void
  /** Height (m) of the next street light. */
  streetLightHeight: number
  /** Horizontal reach (m) of the next street light's arm. */
  streetLightArmLength: number
  /** Whether newly placed street lights start illuminated. */
  streetLightOn: boolean
  setStreetLightHeight: (value: number) => void
  setStreetLightArmLength: (value: number) => void
  setStreetLightOn: (value: boolean) => void
  /** Height (m) of the next pedestrian post-top light. */
  postTopLightHeight: number
  /** Whether newly placed pedestrian post-top lights start illuminated. */
  postTopLightOn: boolean
  setPostTopLightHeight: (value: number) => void
  setPostTopLightOn: (value: boolean) => void
  /** Height and arm reach of the next heritage Bishop's Crook light. */
  heritageCrookHeight: number
  heritageCrookArmReach: number
  /** Whether newly placed heritage lamps start illuminated. */
  heritageCrookLightOn: boolean
  setHeritageCrookHeight: (value: number) => void
  setHeritageCrookArmReach: (value: number) => void
  setHeritageCrookLightOn: (value: boolean) => void
  /** Height and mast-arm reach of the next cobra-head roadway light. */
  cobraHeadHeight: number
  cobraHeadArmLength: number
  /** Whether newly placed cobra-head lamps start illuminated. */
  cobraHeadLightOn: boolean
  setCobraHeadHeight: (value: number) => void
  setCobraHeadArmLength: (value: number) => void
  setCobraHeadLightOn: (value: boolean) => void
  /** Height and reach of the next twin-arm median roadway light. */
  twinArmMedianHeight: number
  twinArmMedianArmLength: number
  /** Whether newly placed twin-arm median lamps start illuminated. */
  twinArmMedianLightOn: boolean
  setTwinArmMedianHeight: (value: number) => void
  setTwinArmMedianArmLength: (value: number) => void
  setTwinArmMedianLightOn: (value: boolean) => void
  /** Brush settings for the next three- or four-head area pole. */
  multiHeadAreaHeight: number
  multiHeadAreaArmLength: number
  multiHeadAreaHeadCount: 3 | 4
  multiHeadAreaLightOn: boolean
  setMultiHeadAreaHeight: (value: number) => void
  setMultiHeadAreaArmLength: (value: number) => void
  setMultiHeadAreaHeadCount: (value: 3 | 4) => void
  setMultiHeadAreaLightOn: (value: boolean) => void
  /** Brush settings for the next truss-bracket roadway lamp. */
  trussRoadwayHeight: number
  trussRoadwayArmLength: number
  trussRoadwayBraceDepth: number
  trussRoadwayLightOn: boolean
  setTrussRoadwayHeight: (value: number) => void
  setTrussRoadwayArmLength: (value: number) => void
  setTrussRoadwayBraceDepth: (value: number) => void
  setTrussRoadwayLightOn: (value: boolean) => void
  /** Shared brush settings for the remaining lamp catalog families. */
  catalogLampHeight: number
  catalogLampArmLength: number
  catalogLampVisualStyle: string
  catalogLampLightOn: boolean
  setCatalogLampHeight: (value: number) => void
  setCatalogLampArmLength: (value: number) => void
  setCatalogLampVisualStyle: (value: string) => void
  setCatalogLampLightOn: (value: boolean) => void
  /** Height (m) of the next utility pole. */
  utilityPoleHeight: number
  /** Span (m) of the next utility pole's crossarm. */
  utilityPoleCrossarmLength: number
  /** Whether newly placed utility poles carry a distribution transformer. */
  utilityPoleTransformerMounted: boolean
  /** Structural assembly for the next utility pole. */
  utilityPoleAssembly: UtilityPoleAssembly
  setUtilityPoleHeight: (value: number) => void
  setUtilityPoleCrossarmLength: (value: number) => void
  setUtilityPoleTransformerMounted: (value: boolean) => void
  setUtilityPoleAssembly: (value: UtilityPoleAssembly) => void
  /** Brush settings for the roadside sign catalog. */
  roadSignId: RoadSignId
  roadSignPostHeight: number
  roadSignScale: number
  roadSignMounting: 'single-post' | 'double-post'
  setRoadSignId: (value: RoadSignId) => void
  setRoadSignPostHeight: (value: number) => void
  setRoadSignScale: (value: number) => void
  setRoadSignMounting: (value: 'single-post' | 'double-post') => void
}

export const useEnvironmentStore = create<EnvironmentStore>((set) => ({
  panelCategory: 'lighting',
  setPanelCategory: (panelCategory) => set({ panelCategory }),
  placementMode: 'continuous',
  setPlacementMode: (placementMode) => set({ placementMode }),
  streetLightHeight: STANDARD_LAMP_HEIGHT_M,
  streetLightArmLength: 1.2,
  streetLightOn: false,
  setStreetLightHeight: (streetLightHeight) => set({ streetLightHeight }),
  setStreetLightArmLength: (streetLightArmLength) => set({ streetLightArmLength }),
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
  trussRoadwayArmLength: 1.6,
  trussRoadwayBraceDepth: 0.7,
  trussRoadwayLightOn: false,
  setTrussRoadwayHeight: (trussRoadwayHeight) => set({ trussRoadwayHeight }),
  setTrussRoadwayArmLength: (trussRoadwayArmLength) =>
    set({ trussRoadwayArmLength }),
  setTrussRoadwayBraceDepth: (trussRoadwayBraceDepth) =>
    set({ trussRoadwayBraceDepth }),
  setTrussRoadwayLightOn: (trussRoadwayLightOn) => set({ trussRoadwayLightOn }),
  catalogLampHeight: STANDARD_LAMP_HEIGHT_M,
  catalogLampArmLength: 1.2,
  catalogLampVisualStyle: 'shoebox',
  catalogLampLightOn: false,
  setCatalogLampHeight: (catalogLampHeight) => set({ catalogLampHeight }),
  setCatalogLampArmLength: (catalogLampArmLength) => set({ catalogLampArmLength }),
  setCatalogLampVisualStyle: (catalogLampVisualStyle) => set({ catalogLampVisualStyle }),
  setCatalogLampLightOn: (catalogLampLightOn) => set({ catalogLampLightOn }),
  utilityPoleHeight: STANDARD_UTILITY_POLE_EXPOSED_HEIGHT_M,
  utilityPoleCrossarmLength: STANDARD_UTILITY_POLE_CROSSARM_LENGTH_M,
  utilityPoleTransformerMounted: true,
  utilityPoleAssembly: 'tangent',
  setUtilityPoleHeight: (utilityPoleHeight) => set({ utilityPoleHeight }),
  setUtilityPoleCrossarmLength: (utilityPoleCrossarmLength) =>
    set({ utilityPoleCrossarmLength }),
  setUtilityPoleTransformerMounted: (utilityPoleTransformerMounted) =>
    set({ utilityPoleTransformerMounted }),
  setUtilityPoleAssembly: (utilityPoleAssembly) => set({ utilityPoleAssembly }),
  roadSignId: 'stop',
  roadSignPostHeight: 2.1,
  roadSignScale: 1,
  roadSignMounting: 'single-post',
  setRoadSignId: (roadSignId) => set({ roadSignId }),
  setRoadSignPostHeight: (roadSignPostHeight) => set({ roadSignPostHeight }),
  setRoadSignScale: (roadSignScale) => set({ roadSignScale }),
  setRoadSignMounting: (roadSignMounting) => set({ roadSignMounting }),
}))
