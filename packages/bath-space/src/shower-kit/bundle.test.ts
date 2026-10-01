import { Mesh } from 'three'
import { buildKitPreview } from './geometry'
import { expect, test } from 'bun:test'
import { LevelNode, WallNode, type AnyNode } from '@pascal-app/core'
import { showerKitPresets, kitAnchor, fitKitPlacement, createKitChanges } from './bundle'
import { showerArmPlacement } from '../shower-arm/placement'
import { ShowerHoseNode } from '../shower-hose/schema'
import { hoseConnection } from '../shower-hose/connection'
import { showerHeadHost, attachShowerHead } from '../shower-head/attachment'
import { ShowerHeadNode } from '../shower-head/schema'
import { ShowerMountNode } from '../shower-mount/schema'
import { handShowerHost } from '../hand-shower/attachment'

test('kit variants persist actual parts, compatible hosts and connected hose endpoints on both wall faces', () => {
  const level = LevelNode.parse({ height: 2.5 })
  const wall = WallNode.parse({ parentId: level.id, start: [0, 0], end: [4, 0] })
  for (const p of showerKitPresets)
    for (const side of ['front', 'back'] as const) {
      const nodes = { [level.id]: level, [wall.id]: wall } as Record<string, AnyNode>
      const anchor = kitAnchor(p),
        raw = showerArmPlacement(anchor, wall, 0, side)!
      const pose = fitKitPlacement(p, anchor, raw, nodes)!
      const changes = createKitChanges(p, { ...anchor, ...pose }, nodes)!
      expect(changes.create).toHaveLength(6)
      for (const c of changes.create) nodes[c.node.id] = c.node
      const arm = nodes[anchor.id]!,
        head = changes.create[1]!.node
      expect(head.parentId).toBe(arm.id)
      expect(showerHeadHost(arm)!.slot.capacity).toBe(1)
      const mount = ShowerMountNode.parse(changes.create[2]!.node)
      expect(mount.parentId).toBe(wall.id)
      expect(mount.position[0]).toBeGreaterThanOrEqual(0)
      expect(mount.position[0]).toBeLessThanOrEqual(4)
      expect(handShowerHost(changes.create[2]!.node)!.slot.id === 'hand-shower').toBe(true)
      const hose = ShowerHoseNode.parse(changes.create[4]!.node)
      const connection = hoseConnection(hose, (id) => nodes[id])!
      expect(connection).not.toBeNull()
      expect(connection.end.toArray().every(Number.isFinite)).toBe(true)
      const persisted = JSON.parse(JSON.stringify(changes))
      expect(persisted.create[0].node.metadata.showerKit.included).toHaveLength(6)
      const replacement = attachShowerHead(
        ShowerHeadNode.parse({ style: 'rectangular' }),
        arm.id,
        nodes,
      )
      expect(replacement.changes.delete).toContain(head.id)
      nodes[mount.id] = { ...mount, sliderPosition: 0.9, holderTilt: -20 } as unknown as AnyNode
      expect(
        hoseConnection(hose, (id) => nodes[id])!.end.distanceTo(connection.end),
      ).toBeGreaterThan(0.001)
    }
})

test('kit placement rejects insufficient walls and bounds all wall parts without flipping relative layout', () => {
  const p = showerKitPresets[0],
    n = kitAnchor(p)
  const level = LevelNode.parse({ height: 1.9 }),
    wall = WallNode.parse({ parentId: level.id, start: [0, 0], end: [4, 0] })
  const pose = showerArmPlacement(n, wall, 2, 'front')!
  expect(
    fitKitPlacement(p, n, pose, { [level.id]: level, [wall.id]: wall } as Record<string, AnyNode>),
  ).toBeNull()
  const short = { ...wall, height: 2.5, end: [0.3, 0] } as typeof wall
  expect(fitKitPlacement(p, n, pose, { [wall.id]: short } as Record<string, AnyNode>)).toBeNull()
  expect(createKitChanges(p, n, {})).toBeNull()
})

test('kit preview contains finite real fixture geometry for every preset', () => {
  for (const p of showerKitPresets) {
    const root = buildKitPreview(p, kitAnchor(p))
    let meshes = 0
    root.traverse((o) => {
      if (o instanceof Mesh) {
        meshes++
        for (const v of o.geometry.getAttribute('position').array)
          expect(Number.isFinite(v)).toBe(true)
        o.geometry.dispose()
      }
    })
    expect(meshes).toBeGreaterThan(20)
    expect(root.children).toHaveLength(3)
  }
})
