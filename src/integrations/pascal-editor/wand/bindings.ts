import type { RoofType } from '@pascal-app/core'
import type { FloorplanMode } from '@pascal-app/editor'
import type { XRWandBuildModel } from '../../../xr/wand/adapter'

export type PascalXRBuildType = {
  iconSrc: string
  id: string
  kind?: string
  label: string
  mode?: 'material-paint' | 'terrain-sculpt'
  paletteOrder?: number
}

export type PascalXRMepItem = {
  iconSrc: string
  id: string
  kind: string
  label: string
}

export type PascalXRRoofFeature = {
  iconSrc: string
  id: string
  kind?: string
  label: string
}

export type PascalXRRoofFootprintSource = 'draw' | 'room' | 'walls'

export type PanelToolOption = {
  id: string
  label: string
  value: string
  choices: readonly { label: string; value: string }[]
  set: (value: string) => void
}

export type PascalXRWandBindings = {
  useBuildPalette: () => XRWandBuildModel
  useToolOptions: () => PanelToolOption[]
  activateBuildTool: (kind: string) => void
  activateModularCabinetTool: () => void
  activatePaintMode: () => void
  activateRoofFeatureTool: (feature: PascalXRRoofFeature) => void
  activateRoofFootprintSource: (source: PascalXRRoofFootprintSource) => void
  activateRoofType: (roofType: RoofType) => void
  activateSelectMode: () => void
  activateTerrainSculptMode: () => void
  collectBuildTypes: (floorplanMode: FloorplanMode) => PascalXRBuildType[]
  collectRoofFeatures: () => PascalXRRoofFeature[]
  getRoofFootprintSources: (roofType: RoofType) => readonly {
    label: string
    value: PascalXRRoofFootprintSource
  }[]
  roofTypeOptions: ReadonlyArray<{ label: string; value: RoofType }>
  xrMepItems: readonly PascalXRMepItem[]
}
