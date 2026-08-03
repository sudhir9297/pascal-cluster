import { describe, expect, test } from 'bun:test'
import { WallNode } from '@pascal-app/core'
import {
  resolveWallArmAttachment,
  resolveWallArmPlanAttachment,
  WALL_CURSOR_POINT_BOUNDS,
} from './wall-arm-light-placement'

describe('wall-arm Pascal wall hosting', () => {
  const wall = WallNode.parse({
    start: [0, 0],
    end: [4, 0],
    height: 3,
    thickness: 0.2,
  })

  test('stores the light in the wall local frame with stable host metadata', () => {
    const attachment = resolveWallArmAttachment(wall, 1, 1.73, 'front')

    expect(attachment.wallId).toBe(wall.id)
    expect(attachment.wallT).toBeCloseTo(0.25)
    expect(attachment.side).toBe('front')
    expect(attachment.position).toEqual([1, 0, 0.1])
    expect(attachment.mountHeight).toBeCloseTo(1.73)
    expect(attachment.rotation[1]).toBeCloseTo(-Math.PI / 2)
    expect(attachment.cursorPosition).toEqual([1, 0, 0.1])
    expect(attachment.cursorRotationY).toBeCloseTo(-Math.PI / 2)
  })

  test('flips outward on the back face and clamps the plate inside the wall', () => {
    const attachment = resolveWallArmAttachment(wall, 8, 9, 'back')

    expect(attachment.wallT).toBeCloseTo((4 - 0.34 / 2) / 4)
    expect(attachment.position[0]).toBeCloseTo(4 - 0.34 / 2)
    expect(attachment.position[2]).toBeCloseTo(-0.1)
    expect(attachment.mountHeight).toBeCloseTo(3 - 0.62 / 2)
    expect(attachment.rotation[1]).toBeCloseTo(Math.PI / 2)
    expect(attachment.cursorPosition[2]).toBeCloseTo(-0.1)
    expect(Math.abs(attachment.cursorRotationY)).toBeCloseTo(Math.PI / 2)
  })

  test('uses the same nearest-wall attachment path from the 2D plan', () => {
    const levelId = 'level:test' as never
    const attachment = resolveWallArmPlanAttachment(
      {
        [levelId]: { id: levelId, type: 'level', children: [wall.id] },
        [wall.id]: wall,
      } as never,
      levelId,
      [2, 0.2],
      2.2,
    )

    expect(attachment).not.toBeNull()
    expect(attachment?.wallId).toBe(wall.id)
    expect(attachment?.wallT).toBeCloseTo(0.5)
    expect(attachment?.side).toBe('front')
  })

  test('can preserve an exact wall-pack cursor anchor right up to the wall edge', () => {
    const attachment = resolveWallArmAttachment(
      wall,
      0.013,
      0.027,
      'front',
      WALL_CURSOR_POINT_BOUNDS,
    )

    expect(attachment.position[0]).toBeCloseTo(0.013)
    expect(attachment.mountHeight).toBeCloseTo(0.027)
    expect(attachment.cursorPosition).toEqual([0.013, 0, 0.1])
  })
})
