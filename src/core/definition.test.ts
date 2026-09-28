import { describe, expect, test } from 'bun:test'
import type { GeometryContext } from '@pascal-app/core'
import { poolFloorplan } from './definition'
import { PoolNode } from './schema'
import { Euler, Vector3 } from 'three'
import { poolOutlineAnchors, poolOutlineMidpoint, poolOutlineTangents } from '../design/outline-edit'

describe('pool floorplan', () => {
  test('keeps pool finishes intact and uses a thin screen-space selection outline', () => {
    const pool = PoolNode.parse({ id: 'pool_a', parentId: 'level_a' })
    const normal = poolFloorplan(pool)
    const selected = poolFloorplan(pool, {
      viewState: {
        selected: true,
        highlighted: false,
        hovered: false,
        moving: false,
        unit: 'metric',
        palette: { selectedStroke: '#ff5500' } as never,
      },
    } as unknown as GeometryContext)

    expect(normal.kind).toBe('path')
    expect(selected.kind).toBe('group')
    if (normal.kind !== 'path' || selected.kind !== 'group') return
    expect(selected.children[0]).toEqual(normal)
    expect(selected.children[1]).toMatchObject({
      kind: 'path', d: normal.d, fill: 'none', stroke: '#475569',
      strokeWidth: 1.5, vectorEffect: 'non-scaling-stroke', pointerEvents: 'none',
    })
  })
})

for (const shape of ['custom', 'spline'] as const) {
  test(`${shape} editing handles follow the pool's translated and rotated 3D frame`, () => {
    const pool = PoolNode.parse({
      shape, polygon: [[-3, -2], [3, -2], [3, 2], [-3, 2]],
      position: [11, 0, -7], rotation: [0, Math.PI / 3, 0],
    })
    const plan = poolFloorplan(pool, { viewState: { selected: true, palette: {} } } as GeometryContext)
    expect(plan.kind).toBe('group')
    if (plan.kind !== 'group') return
    const expectedPoint = ([x, z]: readonly [number, number]) => {
      const point = new Vector3(x, 0, z).applyEuler(new Euler(...pool.rotation)).add(new Vector3(...pool.position))
      return [point.x, point.z]
    }
    const anchors = poolOutlineAnchors(pool)
    const tangents = poolOutlineTangents(pool)
    for (const child of plan.children) {
      if (child.kind !== 'endpoint-handle' && child.kind !== 'midpoint-handle') continue
      const index = (child.payload as { index: number }).index
      const local = child.affordance === 'pool-outline-move' ? anchors[index]!
        : child.affordance === 'pool-outline-insert' ? poolOutlineMidpoint(pool, index)
        : child.affordance === 'pool-outline-incoming' ? tangents[index]!.incoming
        : tangents[index]!.outgoing
      const expected = expectedPoint(local)
      expect(child.point[0]).toBeCloseTo(expected[0]!, 7)
      expect(child.point[1]).toBeCloseTo(expected[1]!, 7)
    }
  })
}
