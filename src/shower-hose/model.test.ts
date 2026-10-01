import { test, expect } from 'bun:test'
import { LevelNode, WallNode, type AnyNode } from '@pascal-app/core'
import { Vector3, Mesh } from 'three'
import { ShowerHoseNode } from './schema'
import { hoseCurve, buildHoseAt } from './geometry'
import { connectShowerHose, hoseConnection } from './connection'
import { ShowerMountNode } from '../shower-mount/schema'
import { HandShowerNode } from '../hand-shower/schema'
import { attachHandShower } from '../hand-shower/attachment'
function fixture() {
  const level = LevelNode.parse({}),
    wall = WallNode.parse({ parentId: level.id, start: [0, 0], end: [3, 0] }),
    outlet = ShowerMountNode.parse({
      style: 'round-outlet',
      parentId: wall.id,
      wallId: wall.id,
      position: [1, 1.2, 0.05],
    }),
    rail = ShowerMountNode.parse({
      style: 'square-rail',
      parentId: wall.id,
      wallId: wall.id,
      position: [1.3, 1.2, 0.05],
    }),
    hand = HandShowerNode.parse({ parentId: rail.id })
  return {
    level,
    wall,
    outlet,
    rail,
    hand,
    nodes: Object.fromEntries(
      [level, wall, outlet, rail, hand].map((o) => [o.id, o]),
    ) as unknown as Record<string, AnyNode>,
  }
}
test('hoses have fixed endpoint collars, finite merged geometry and requested curve length', () => {
  for (const style of ['smooth', 'metal', 'ribbon'] as const) {
    const n = ShowerHoseNode.parse({ style }),
      end = new Vector3(0.3, 0.2, 0.05),
      curve = hoseCurve(n, end)!
    expect(curve.getLength()).toBeCloseTo(n.length, 3)
    expect(curve.getPoint(0).toArray()).toEqual([0, -n.connectorLength, 0])
    expect(
      curve.getPoint(1).distanceTo(end.clone().add(new Vector3(0, -n.connectorLength, 0))),
    ).toBeLessThan(0.00001)
    const root = buildHoseAt(n, end)
    expect(root.children.length).toBe(style === 'smooth' ? 3 : 4)
    root.traverse((o) => {
      if (o instanceof Mesh) {
        for (const value of o.geometry.getAttribute('position').array)
          expect(Number.isFinite(value)).toBe(true)
        o.geometry.dispose()
      }
    })
  }
  expect(hoseCurve(ShowerHoseNode.parse({ length: 0.5 }), new Vector3(2, 0, 0))).toBeNull()
})
test('capacity is enforced at both ends and slider edits follow the same endpoint references', () => {
  const f = fixture(),
    first = connectShowerHose(ShowerHoseNode.parse({}), f.outlet.id, f.hand.id, f.nodes)
  f.nodes[first.placed.id] = first.placed as unknown as AnyNode
  const second = connectShowerHose(
    ShowerHoseNode.parse({ style: 'metal' }),
    f.outlet.id,
    f.hand.id,
    f.nodes,
  )
  expect(second.changes.delete).toEqual([first.placed.id])
  const before = hoseConnection(first.placed, (id) => f.nodes[id])!
  f.nodes[f.rail.id] = {
    ...f.rail,
    sliderPosition: 1,
    holderTilt: 40,
    railLength: 1.1,
  } as unknown as AnyNode
  const after = hoseConnection(first.placed, (id) => f.nodes[id])!
  expect(after.end.distanceTo(before.end)).toBeGreaterThan(0.1)
  expect(after.endDirection.distanceTo(before.endDirection)).toBeGreaterThan(0.1)
  expect(ShowerHoseNode.parse(JSON.parse(JSON.stringify(first.placed)))).toEqual(first.placed)
  expect(() => connectShowerHose(first.placed, f.rail.id, f.hand.id, f.nodes)).toThrow('supply')
})
test('handset replacement transfers the hose; missing and cross-level endpoints are rejected', () => {
  const f = fixture(),
    hose = connectShowerHose(ShowerHoseNode.parse({}), f.outlet.id, f.hand.id, f.nodes).placed
  f.nodes[hose.id] = hose as unknown as AnyNode
  const result = attachHandShower(HandShowerNode.parse({ style: 'square' }), f.rail.id, f.nodes)
  expect(result.changes.update.find((o) => String(o.id) === hose.id)?.data).toEqual({
    targetId: result.placed.id,
  })
  delete f.nodes[f.hand.id]
  expect(hoseConnection(hose, (id) => f.nodes[id])).toBeNull()
  f.nodes[f.hand.id] = f.hand as unknown as AnyNode
  const anotherWall = WallNode.parse({
    parentId: LevelNode.parse({}).id,
    start: [0, 0],
    end: [3, 0],
  })
  f.nodes[anotherWall.id] = anotherWall
  f.nodes[f.rail.id] = {
    ...f.rail,
    parentId: anotherWall.id,
    wallId: anotherWall.id,
  } as unknown as AnyNode
  expect(() => connectShowerHose(hose, f.outlet.id, f.hand.id, f.nodes)).toThrow('same level')
})

test('moving a connected handset into an occupied holder keeps its own hose and removes the displaced hose', () => {
  const f = fixture(),
    otherMount = ShowerMountNode.parse({ parentId: f.wall.id, wallId: f.wall.id }),
    otherHand = HandShowerNode.parse({ parentId: otherMount.id }),
    otherSupply = ShowerMountNode.parse({
      style: 'square-outlet',
      parentId: f.wall.id,
      wallId: f.wall.id,
    })
  for (const o of [otherMount, otherHand, otherSupply]) f.nodes[o.id] = o as unknown as AnyNode
  const own = connectShowerHose(ShowerHoseNode.parse({}), f.outlet.id, f.hand.id, f.nodes).placed,
    displaced = connectShowerHose(
      ShowerHoseNode.parse({}),
      otherSupply.id,
      otherHand.id,
      f.nodes,
    ).placed
  for (const o of [own, displaced]) f.nodes[o.id] = o as unknown as AnyNode
  const moved = attachHandShower(f.hand, otherMount.id, f.nodes, f.hand.id)
  expect(moved.changes.delete).toContain(displaced.id)
  expect(moved.changes.delete).not.toContain(own.id)
  expect(moved.changes.update.filter((o) => String(o.id) === own.id)).toHaveLength(0)
})
