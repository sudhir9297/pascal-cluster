import { test, expect } from 'bun:test'
import { WallNode, type AnyNode } from '@pascal-app/core'
import { Mesh } from 'three'
import { ShowerMountNode, showerMountPresets, hasHolder, hasSupply } from './schema'
import { buildShowerMountGeometry } from './geometry'
import { showerMountSockets } from './targets'
import { showerArmPlacement } from '../shower-arm/placement'
import { HandShowerNode, handShowerPresets } from '../hand-shower/schema'
import { buildHandShowerGeometry, handShowerHoseTarget } from '../hand-shower/geometry'
import { attachHandShower } from '../hand-shower/attachment'
const dispose = (root: ReturnType<typeof buildShowerMountGeometry>) =>
  root.traverse((o) => {
    if (o instanceof Mesh) {
      for (const key of ['position', 'normal', 'uv'])
        for (const value of o.geometry.getAttribute(key).array)
          expect(Number.isFinite(value)).toBe(true)
      o.geometry.dispose()
      if (!Array.isArray(o.material) && !o.material.userData.__pascalCachedMaterial)
        o.material.dispose()
    }
  })
test('wall mounting variants retain explicit compatible handset and hose targets', () => {
  for (const preset of showerMountPresets)
    for (const sliderPosition of [0, 1]) {
      const n = ShowerMountNode.parse({
          ...preset,
          sliderPosition,
          railSupply: true,
          shelfEnabled: true,
        }),
        root = buildShowerMountGeometry(n),
        slots = showerMountSockets(n)
      expect(slots.some((s) => s.id === 'hand-shower')).toBe(hasHolder(n))
      expect(slots.some((s) => s.id === 'hose')).toBe(hasSupply(n))
      for (const slot of slots) {
        const target = root.getObjectByName(`${slot.type}_target_${slot.id}`)!
        expect(target.position.toArray()).toEqual(slot.position)
        expect(target.userData.capacity).toBe(1)
      }
      dispose(root)
    }
})
test('six handset variants have a bottom hose target and finite geometry at dimensional limits', () => {
  for (const preset of handShowerPresets)
    for (const size of ['min', 'max']) {
      const n = HandShowerNode.parse({
          ...preset,
          headWidth: size === 'min' ? 0.055 : 0.16,
          headHeight: size === 'min' ? 0.055 : 0.18,
          handleDiameter: size === 'min' ? 0.018 : 0.035,
          handleLength: size === 'min' ? 0.1 : 0.24,
        }),
        root = buildHandShowerGeometry(n)
      expect(root.getObjectByName('shower_hose_target_hose-end')!.position.toArray()).toEqual(
        handShowerHoseTarget(n).position,
      )
      dispose(root)
    }
})
test('slide position, length and tilt update the same slot; replacements preserve other connections', () => {
  const rail = ShowerMountNode.parse({ style: 'round-rail', railSupply: true }),
    edited = ShowerMountNode.parse({ ...rail, railLength: 1.2, sliderPosition: 1, holderTilt: 40 }),
    a = showerMountSockets(rail),
    b = showerMountSockets(edited)
  expect(a.map((s) => s.id)).toEqual(b.map((s) => s.id))
  expect(a[0]!.position).not.toEqual(b[0]!.position)
  expect(a[0]!.rotation).not.toEqual(b[0]!.rotation)
  const handset = HandShowerNode.parse({}),
    nodes = { [rail.id]: rail } as unknown as Record<string, AnyNode>,
    first = attachHandShower(handset, rail.id, nodes)
  nodes[first.placed.id] = first.placed as unknown as AnyNode
  const replaced = attachHandShower(HandShowerNode.parse({ style: 'square-wand' }), rail.id, nodes)
  expect(replaced.changes.delete).toEqual([first.placed.id])
  const moved = attachHandShower(first.placed, rail.id, nodes, first.placed.id)
  expect(moved.placed.id).toBe(first.placed.id)
  expect(moved.changes.delete).toEqual([])
  const outlet = ShowerMountNode.parse({ style: 'round-outlet' })
  nodes[outlet.id] = outlet as unknown as AnyNode
  expect(() => attachHandShower(handset, outlet.id, nodes)).toThrow('holder')
  expect(HandShowerNode.parse(JSON.parse(JSON.stringify(first.placed)))).toEqual(first.placed)
})
test('mounting fittings remain flush to either wall face after dimensional edits', () => {
  const wall = WallNode.parse({ start: [0, 0], end: [3, 0], thickness: 0.2 }),
    n = ShowerMountNode.parse({})
  for (const side of ['front', 'back'] as const) {
    const pose = showerArmPlacement(n, wall, 1, side)!
    expect(pose.parentId).toBe(wall.id)
    expect(pose.position[2]).toBe(side === 'front' ? 0.1 : -0.1)
    expect(pose.position[1]).toBe(n.mountingHeight)
  }
})

 test('outlet length and bracket inset keep the hose target at the connector end', () => {
  for (const style of ['round-outlet', 'square-combined', 'round-rail', 'square-rail'] as const) {
    for (const outletLength of [0.012, 0.045]) {
      const node = ShowerMountNode.parse({ style, railSupply: true, railLength: 0.3, railBracketInset: 0.12, outletLength, holderDepth: 0.06, shelfEnabled: true, shelfDepth: 0.16 })
      const socket = showerMountSockets(node).find(s => s.id === 'hose')!
      const bodyY = style.endsWith('rail') ? -0.15 + 0.075 : 0
      expect(socket.position[1]).toBeCloseTo(bodyY - node.tubeSize / 2 - outletLength)
      const root = buildShowerMountGeometry(node)
      expect(root.getObjectByName('shower_hose_target_hose')!.position.toArray()).toEqual(socket.position)
      dispose(root)
    }
  }
})
