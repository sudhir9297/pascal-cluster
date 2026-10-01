import { expect, test } from 'bun:test'
import {
  ShowerMountNode,
  showerMountPresets,
  mountShape,
  mountType,
  mountStyle,
  hasAdjustmentLever,
  hasSupply,
} from './schema'
import { showerMountSockets } from './targets'
import { buildShowerMountGeometry, showerMountGeometryKey } from './geometry'

test('all saved mount variants retain their type, shape and connections', () => {
  for (const preset of showerMountPresets) {
    const node = ShowerMountNode.parse({ style: preset.style })
    const normalized = ShowerMountNode.parse({
      ...node,
      style: mountStyle(mountType(node), mountShape(node), hasSupply(node)),
      adjustmentLever: hasAdjustmentLever(node),
    })
    expect(showerMountSockets(normalized)).toEqual(showerMountSockets(node))
    expect(hasAdjustmentLever(normalized)).toBe(preset.style === 'adjustable-holder')
  }
})
test('square holders can independently have an outlet and adjustment lever', () => {
  const node = ShowerMountNode.parse({
    style: mountStyle('holder', 'square', true),
    adjustmentLever: true,
  })
  expect(showerMountSockets(node).map((slot) => slot.id)).toEqual(['hand-shower', 'hose'])
  const withoutLever = { ...node, adjustmentLever: false }
  expect(showerMountGeometryKey(node)).not.toBe(showerMountGeometryKey(withoutLever))
  const withGeometry = buildShowerMountGeometry(node),
    withoutGeometry = buildShowerMountGeometry(withoutLever)
  expect(withGeometry.children.length).toBe(withoutGeometry.children.length + 1)
  for (const group of [withGeometry, withoutGeometry])
    group.traverse((object) => {
      if ('geometry' in object) (object.geometry as import('three').BufferGeometry).dispose()
    })
})
