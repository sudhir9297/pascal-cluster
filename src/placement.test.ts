import { describe, expect, test } from 'bun:test'
import { advancePlacementRotation, PLACEMENT_ROTATION_STEP } from './placement'
import { resolvePlacementPosition } from './placement-position'

describe('environment cursor placement', () => {
  test('keeps floor-placed assets on the level plane', () => {
    expect(resolvePlacementPosition([1.25, 3.4, -2.5])).toEqual([1.25, 0, -2.5])
  })

  test('preserves the complete cursor position for surface-mounted assets', () => {
    expect(resolvePlacementPosition([1.25, 3.4, -2.5], true)).toEqual([1.25, 3.4, -2.5])
  })

  test('rotates placement previews in reversible 45-degree steps', () => {
    expect(advancePlacementRotation(0)).toBe(PLACEMENT_ROTATION_STEP)
    expect(advancePlacementRotation(PLACEMENT_ROTATION_STEP)).toBe(Math.PI / 2)
    expect(advancePlacementRotation(PLACEMENT_ROTATION_STEP, true)).toBe(0)
  })
})
