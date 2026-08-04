import { describe, expect, test } from 'bun:test'
import { buildRoadCrossSection } from './road-cross-section'
import { buildRoadDraftStyle, roadDraftSettingsForPreset } from './road-draft-style'

describe('road draft styles', () => {
  test('loads every roadway and side value from a selected preset', () => {
    const settings = roadDraftSettingsForPreset('collector')
    const style = buildRoadDraftStyle(settings)

    expect(style.id).toBe('collector')
    expect(style.laneCount).toBe(2)
    expect(style.laneWidth).toBe(3.5)
    expect(style.leftSide?.bikeLaneWidth).toBe(1.6)
    expect(style.rightSide?.gutterWidth).toBe(0.4)
  })

  test('keeps roadway and left/right overrides in the complete preview width', () => {
    const settings = roadDraftSettingsForPreset('local-street')
    settings.laneCount = 4
    settings.laneWidth = 3.6
    settings.medianWidth = 1.2
    settings.sides.left.parkingLaneWidth = 2.5
    settings.sides.right.sidewalkWidth = 2
    const style = buildRoadDraftStyle(settings)
    const section = buildRoadCrossSection(style)

    expect(style.id).not.toBe('local-street')
    expect(style.id).toBe(buildRoadDraftStyle(settings).id)
    expect(style.laneCount).toBe(4)
    expect(style.leftSide?.parkingLaneWidth).toBe(2.5)
    expect(style.rightSide?.sidewalkWidth).toBe(2)
    expect(section.totalWidth).toBeGreaterThan(section.carriagewayWidth)
  })
})
