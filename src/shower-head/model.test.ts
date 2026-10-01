import { test, expect } from 'bun:test'
import { type AnyNode } from '@pascal-app/core'
import { Group, Mesh, Vector3 } from 'three'
import { ShowerHeadNode, showerHeadPresets } from './schema'
import { buildShowerHeadGeometry, nozzlePositions } from './geometry'
import { attachShowerHead, showerHeadLevelPose } from './attachment'
import { ShowerArmNode } from '../shower-arm/schema'
import { showerHeadTarget } from '../shower-arm/attachment'
test('six head shapes have finite geometry and spray-face nozzles at dimension limits', () => {
  for (const preset of showerHeadPresets)
    for (const width of [0.06, 0.6]) {
      const n = ShowerHeadNode.parse({ ...preset, width, depth: width }),
        root = buildShowerHeadGeometry(n)
      expect(nozzlePositions(n).length).toBeGreaterThan(0)
      for (const [x, z] of nozzlePositions(n)) {
        expect(Math.abs(x)).toBeLessThan(n.width / 2)
        expect(Math.abs(z)).toBeLessThan(n.depth / 2)
      }
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
    }
})
test('head attachment replaces exactly one slot occupant and moving preserves identity', () => {
  const arm = ShowerArmNode.parse({}),
    head = ShowerHeadNode.parse({}),
    nodes = { [arm.id]: arm } as unknown as Record<string, AnyNode>
  const first = attachShowerHead(head, arm.id, nodes)
  nodes[first.placed.id] = first.placed as unknown as AnyNode
  const next = attachShowerHead(ShowerHeadNode.parse({ style: 'square-rain' }), arm.id, nodes)
  expect(next.changes.delete).toEqual([first.placed.id])
  expect(next.placed.parentId).toBe(arm.id)
  const moved = attachShowerHead(first.placed, arm.id, nodes, first.placed.id)
  expect(moved.placed.id).toBe(first.placed.id)
  expect(moved.changes.delete).toEqual([])
  expect(() => attachShowerHead(head, 'missing', nodes)).toThrow('shower arm')
})
test('outlet preview follows arm resize and parent transforms without scaling the head', () => {
  const level = new Group(),
    wall = new Group(),
    root = new Group()
  level.add(wall)
  wall.add(root)
  wall.rotation.y = 0.7
  root.position.set(1, 2, 0.1)
  const arm = ShowerArmNode.parse({}),
    a = showerHeadLevelPose(arm, root, level),
    resized = ShowerArmNode.parse({
      ...arm,
      length: 0.8,
      style: 'square-adjustable',
      outletAngle: 45,
    }),
    b = showerHeadLevelPose(resized, root, level)
  expect(a.position).not.toEqual(b.position)
  expect(a.quaternion).not.toEqual(b.quaternion)
  const expected = new Vector3(...showerHeadTarget(resized).position)
  root.localToWorld(expected)
  expect(new Vector3(...b.position).distanceTo(expected)).toBeLessThan(1e-8)
})
