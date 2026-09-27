import { describe, expect, test } from 'bun:test'
import { PoolNode } from '../core/schema'
import { editPoolOutline, poolOutlineAnchors, poolOutlineTangents } from './outline-edit'
import { sampleClosedPoolSpline } from './shapes'
import { poolFloorplan } from '../core/definition'
import type { GeometryContext } from '@pascal-app/core'

describe('drawn pool outline edits', () => {
  test('moves, inserts, and removes custom corners while keeping dimensions current', () => {
    const pool = PoolNode.parse({ shape: 'custom', polygon: [[-4, -2], [4, -2], [4, 2], [-4, 2]] })
    const moved = editPoolOutline(pool, 'move', 1, [5, -2])!
    expect(moved.polygon[1]).toEqual([5, -2])
    expect(moved.length).toBe(9)
    const inserted = editPoolOutline({ ...pool, ...moved }, 'insert', 1, [5, 0])!
    expect(inserted.polygon).toHaveLength(5)
    const removed = editPoolOutline({ ...pool, ...inserted }, 'delete', 2)!
    expect(removed.polygon).toHaveLength(4)
  })

  test('resamples smooth pools from editable anchors', () => {
    const anchors: [number, number][] = [[-4, -2], [4, -2], [4, 2], [-4, 2]]
    const pool = PoolNode.parse({ shape: 'spline', outlineControlPoints: anchors,
      polygon: sampleClosedPoolSpline(anchors, 8, 0.35) })
    const moved = editPoolOutline(pool, 'move', 0, [-5, -2])!
    expect(moved.outlineControlPoints[0]).toEqual([-5, -2])
    expect(moved.polygon.length).toBeGreaterThan(moved.outlineControlPoints.length)
    expect(poolOutlineAnchors({ ...pool, ...moved })).toHaveLength(4)
    expect(editPoolOutline(pool, 'move', 0, anchors[0])?.polygon).toEqual(pool.polygon)
    const outgoing = poolOutlineTangents(pool)[0]!.outgoing
    const bent = editPoolOutline(pool, 'outgoing', 0, [outgoing[0], outgoing[1] - 1])!
    expect(bent.polygon).not.toEqual(pool.polygon)
    expect(bent.outlineTangents[0]!.outgoing[1]).toBe(outgoing[1] - 1)
    expect(bent.outlineTangents[0]!.incoming).not.toEqual(poolOutlineTangents(pool)[0]!.incoming)
    const saved = PoolNode.parse({ ...pool, ...bent })
    expect(saved.outlineTangents).toEqual(bent.outlineTangents)
    expect(saved.polygon).toEqual(bent.polygon)
  })

  test('rejects self intersections and deletion below three corners', () => {
    const pool = PoolNode.parse({ shape: 'custom', polygon: [[-4, -2], [4, -2], [4, 2], [-4, 2]] })
    expect(editPoolOutline(pool, 'move', 1, [0, 3])).toBeNull()
    const triangle = PoolNode.parse({ shape: 'custom', polygon: [[0, 0], [4, 0], [2, 3]] })
    expect(editPoolOutline(triangle, 'delete', 0)).toBeNull()
  })

  test('shows anchor, insert, and tangent controls in the selected floorplan', () => {
    const anchors: [number, number][] = [[-4, -2], [4, -2], [4, 2], [-4, 2]]
    const pool = PoolNode.parse({ shape: 'spline', outlineControlPoints: anchors,
      polygon: sampleClosedPoolSpline(anchors, 8, 0.35) })
    const plan = poolFloorplan(pool, { viewState: { selected: true, palette: { selectedStroke: '#22c55e' } } } as GeometryContext)
    expect(plan.kind).toBe('group')
    if (plan.kind !== 'group') return
    expect(plan.children.filter((item) => item.kind === 'endpoint-handle' && item.affordance === 'pool-outline-move')).toHaveLength(4)
    expect(plan.children.filter((item) => item.kind === 'midpoint-handle' && item.affordance === 'pool-outline-insert')).toHaveLength(4)
    expect(plan.children.filter((item) => item.kind === 'endpoint-handle' && item.affordance === 'pool-outline-incoming')).toHaveLength(4)
    expect(plan.children.filter((item) => item.kind === 'endpoint-handle' && item.affordance === 'pool-outline-outgoing')).toHaveLength(4)
  })
})
