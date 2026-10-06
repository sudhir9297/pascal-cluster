import { expect, test } from 'bun:test'
import { BufferGeometry, Vector3 } from 'three'
import { updateDynamicLine } from './dynamic-line'
import { createFrameInput } from './frame-input'
import { equipmentGeometrySignature } from './geometry-input'

test('moving equipment reuses geometry inputs while shape changes invalidate them', () => {
  const node = { type: 'pool:pump', position: [0, 0, 0], rotation: [0, 0, 0], power: 2, color: '#fff' }
  expect(equipmentGeometrySignature({ ...node, position: [3, 0, 5], rotation: [0, 1, 0], parentId: 'pool' })).toBe(equipmentGeometrySignature(node))
  expect(equipmentGeometrySignature({ ...node, power: 3 })).not.toBe(equipmentGeometrySignature(node))
  expect(equipmentGeometrySignature({ ...node, color: '#000' })).not.toBe(equipmentGeometrySignature(node))
})

test('line buffers reuse capacity and render only live points', () => {
  const geometry = new BufferGeometry()
  updateDynamicLine(geometry, [new Vector3(1, 2, 3), new Vector3(4, 5, 6)])
  const buffer = geometry.getAttribute('position')
  updateDynamicLine(geometry, [new Vector3(7, 8, 9)])
  expect(geometry.getAttribute('position')).toBe(buffer)
  expect(geometry.drawRange.count).toBe(1)
  expect(buffer.getX(0)).toBe(7)
  updateDynamicLine(geometry, Array.from({ length: 33 }, (_, i) => new Vector3(i, 0, 0)))
  expect(geometry.getAttribute('position')).not.toBe(buffer)
  expect(geometry.drawRange.count).toBe(33)
  geometry.dispose()
})

test('hover coalesces, strokes retain samples, release flushes and cancellation discards', () => {
  const queue = new Map<number, () => void>(), consumed: number[] = []
  let id = 0, drawing = false
  const input = createFrameInput<number>(v => consumed.push(v), () => drawing,
    fn => { queue.set(++id, fn); return id }, i => { queue.delete(i) })
  input.push(1); input.push(2); input.push(3)
  expect(queue.size).toBe(1)
  input.flush()
  expect(consumed).toEqual([3])
  drawing = true
  input.push(4); input.push(5); input.push(6)
  input.flush()
  expect(consumed).toEqual([3, 4, 5, 6])
  input.push(7); input.dispose(); input.flush()
  expect(consumed).toEqual([3, 4, 5, 6])
  expect(queue.size).toBe(0)
})
