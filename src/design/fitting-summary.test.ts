import { expect, test } from 'bun:test'
import { PoolNode } from '../core/schema'
import { createPoolShapePolygon } from './shapes'
import { getPoolFittingSummary, placedPoolFittingIssues, planPoolFittings } from './pool-fitting-layout'

test.each(['rectangle', 'kidney', 'lagoon'] as const)('%s: cheap summary matches detailed placement metrics', shape => {
  const pool = PoolNode.parse({ shape, polygon: createPoolShapePolygon(shape, 8, 4) })
  const summary = getPoolFittingSummary(pool), layout = planPoolFittings(pool)
  for (const field of ['area', 'volume', 'flow', 'perimeter', 'counts'] as const) expect(summary[field]).toEqual(layout[field])
})

test('hydraulic edits reuse positions until fitting counts change', () => {
  const pool = PoolNode.parse({ fittingFlowRate: 4 })
  const first = planPoolFittings(pool)
  const second = planPoolFittings({ ...pool, fittingFlowRate: 5 })
  expect(second.flow).toBe(5)
  expect(second.inlets).toBe(first.inlets)
  expect(second.drains).toBe(first.drains)
  const third = planPoolFittings({ ...pool, fittingFlowRate: 100 })
  expect(third.counts.drain).toBeGreaterThan(first.counts.drain)
  expect(third.drains).not.toBe(first.drains)
})

test('review measures placed fittings in pool space without recommending new positions', () => {
  const pool = PoolNode.parse({ position: [10, 0, 3], rotation: [0, Math.PI / 2, 0] })
  const fittings = [
    { type: 'pool:drain', parentId: pool.id, position: [0, 0, 0] },
    { type: 'pool:drain', position: [10, 0, 3.2] },
  ]
  expect(placedPoolFittingIssues(pool, fittings).length).toBeGreaterThan(0)
  expect(placedPoolFittingIssues(pool, [fittings[0], { ...fittings[1], position: [10, 0, 6] }])).toEqual([])
})
