import { expect, test } from 'bun:test'
import { poolOutlineInsertIndices, visiblePoolOutlineAnchors } from './outline-control-visibility'
import type { PoolPoint } from '../core/schema'

test('caps visible anchors without modifying the precise outline, and supports detailed editing', () => {
  const anchors: PoolPoint[] = Array.from({ length: 100 }, (_, index) => [Math.cos(index / 100 * Math.PI * 2) * 5, Math.sin(index / 100 * Math.PI * 2) * 3])
  const saved = structuredClone(anchors)
  const indices = visiblePoolOutlineAnchors(anchors)
  expect(indices).toHaveLength(12)
  expect(new Set(indices).size).toBe(12)
  expect(visiblePoolOutlineAnchors(anchors, false, 57)).toContain(57)
  expect(visiblePoolOutlineAnchors(anchors, false, 57)).toHaveLength(12)
  expect(visiblePoolOutlineAnchors(anchors, true)).toHaveLength(100)
  expect(anchors).toEqual(saved)
})

test('small outlines retain every corner and insertion controls stay local', () => {
  expect(visiblePoolOutlineAnchors([[0, 0], [4, 0], [4, 4], [0, 4]])).toEqual([0, 1, 2, 3])
  expect(poolOutlineInsertIndices(20, null)).toEqual([])
  expect(poolOutlineInsertIndices(20, 0)).toEqual([19, 0])
  expect(poolOutlineInsertIndices(20, 19)).toEqual([18, 19])
  expect(poolOutlineInsertIndices(20, 20)).toEqual([])
})
