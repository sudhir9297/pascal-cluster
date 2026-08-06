import { describe, expect, test } from 'bun:test'
import { buildRoadDraftStyle, roadDraftSettingsForPreset } from './road-draft-style'
import {
  applyRoadAutoInfrastructureClearances,
  AUTO_DRAINAGE_MIN_GUTTER_WIDTH,
  AUTO_HYDRANT_MIN_VERGE_WIDTH,
} from './road-auto-infrastructure-style'
import { DEFAULT_ROAD_AUTO_INFRASTRUCTURE_SETTINGS } from './road-auto-infrastructure-settings'

describe('automatic infrastructure road clearances', () => {
  test('widens only curb-and-gutter roads for enabled drainage and hydrants', () => {
    const source = buildRoadDraftStyle(roadDraftSettingsForPreset('local-street'))
    const style = applyRoadAutoInfrastructureClearances(
      source,
      DEFAULT_ROAD_AUTO_INFRASTRUCTURE_SETTINGS,
    )

    expect(style.leftSide?.gutterWidth).toBe(AUTO_DRAINAGE_MIN_GUTTER_WIDTH)
    expect(style.rightSide?.gutterWidth).toBe(AUTO_DRAINAGE_MIN_GUTTER_WIDTH)
    expect(style.leftSide?.vergeWidth).toBe(AUTO_HYDRANT_MIN_VERGE_WIDTH)
    expect(style.rightSide?.vergeWidth).toBe(AUTO_HYDRANT_MIN_VERGE_WIDTH)
    expect(source.leftSide?.gutterWidth).toBe(0.35)
    expect(source.leftSide?.vergeWidth).toBe(0.45)
  })

  test('preserves authored widths when automatic items are disabled', () => {
    const source = buildRoadDraftStyle(roadDraftSettingsForPreset('local-street'))
    const style = applyRoadAutoInfrastructureClearances(source, {
      enabled: false,
      items: { ...DEFAULT_ROAD_AUTO_INFRASTRUCTURE_SETTINGS.items },
    })

    expect(style).toBe(source)
    expect(style.leftSide?.gutterWidth).toBe(0.35)
    expect(style.leftSide?.vergeWidth).toBe(0.45)
  })

  test('does not invent urban curb bands for highway roads', () => {
    const source = buildRoadDraftStyle(roadDraftSettingsForPreset('highway'))
    const style = applyRoadAutoInfrastructureClearances(
      source,
      DEFAULT_ROAD_AUTO_INFRASTRUCTURE_SETTINGS,
    )

    expect(style.leftSide?.gutterWidth).toBe(0)
    expect(style.leftSide?.curbWidth).toBe(0)
    expect(style.leftSide?.vergeWidth).toBe(1.2)
  })
})
