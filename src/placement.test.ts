import { describe, expect, test } from 'bun:test'
import { resolvePlacementPosition } from './placement-position'

describe('environment cursor placement', () => {
  test('keeps floor-placed assets on the level plane', () => {
    expect(resolvePlacementPosition([1.25, 3.4, -2.5])).toEqual([1.25, 0, -2.5])
  })

  test('preserves the complete cursor position for surface-mounted assets', () => {
    expect(resolvePlacementPosition([1.25, 3.4, -2.5], true)).toEqual([1.25, 3.4, -2.5])
  })
})
