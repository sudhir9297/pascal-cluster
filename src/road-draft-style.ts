import { withRoadSideComponents, type RoadSideComponentConfigs } from './road-cross-section'
import {
  DEFAULT_ROAD_STYLE_PRESETS,
  type RoadStylePresetId,
} from './road-style-presets'
import type { RoadStylePreset } from './schema'

const ROAD_SIDE_SETTING_KEYS = [
  'parkingLaneWidth',
  'bikeLaneWidth',
  'gutterWidth',
  'curbWidth',
  'vergeWidth',
  'sidewalkWidth',
] as const

export type RoadDraftStyleSettings = {
  laneCount: number
  laneWidth: number
  medianWidth: number
  presetId: RoadStylePresetId
  shoulderWidth: number
  sides: RoadSideComponentConfigs
}

function roadDraftStyleValues(settings: RoadDraftStyleSettings): number[] {
  return [
    settings.laneCount,
    settings.laneWidth,
    settings.shoulderWidth,
    settings.medianWidth,
    ...ROAD_SIDE_SETTING_KEYS.map((key) => settings.sides.left[key]),
    ...ROAD_SIDE_SETTING_KEYS.map((key) => settings.sides.right[key]),
  ]
}

function customRoadStyleId(settings: RoadDraftStyleSettings): string {
  const dimensions = roadDraftStyleValues(settings)
    .map((value) => value.toFixed(2).replace('.', '_'))
    .join('-')
  return `${settings.presetId}:custom:${dimensions}`
}

/** Resolve the complete style used by both the road preview and committed edge. */
export function buildRoadDraftStyle(settings: RoadDraftStyleSettings): RoadStylePreset {
  const preset = DEFAULT_ROAD_STYLE_PRESETS[settings.presetId]
  const presetValues = roadDraftStyleValues(roadDraftSettingsForPreset(settings.presetId))
  const isUnmodifiedPreset = roadDraftStyleValues(settings).every(
    (value, index) => value === presetValues[index],
  )
  return withRoadSideComponents({
    ...preset,
    id: isUnmodifiedPreset ? preset.id : customRoadStyleId(settings),
    name: isUnmodifiedPreset ? preset.name : `${preset.name} (custom)`,
    laneCount: settings.laneCount,
    laneWidth: settings.laneWidth,
    medianWidth: settings.medianWidth,
    shoulderWidth: settings.shoulderWidth,
  }, settings.sides)
}

export function roadDraftSettingsForPreset(
  presetId: RoadStylePresetId,
): RoadDraftStyleSettings {
  const preset = DEFAULT_ROAD_STYLE_PRESETS[presetId]
  return {
    laneCount: preset.laneCount,
    laneWidth: preset.laneWidth,
    medianWidth: preset.medianWidth,
    presetId,
    shoulderWidth: preset.shoulderWidth,
    sides: {
      left: { ...preset.leftSide },
      right: { ...preset.rightSide },
    },
  }
}
