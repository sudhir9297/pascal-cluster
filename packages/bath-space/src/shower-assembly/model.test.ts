import { expect, test } from 'bun:test'
import { WallNode, LevelNode, type AnyNode, type GeometryContext } from '@pascal-app/core'
import { Mesh, Vector3, Group, Euler } from 'three'
import {
  ShowerAssemblyNode,
  showerAssemblyPresets,
  assemblyPresetNode,
  assemblyPresetParameters,
} from './schema'
import { assemblySockets } from './targets'
import { assemblyChildren, createAssemblyChanges } from './children'
import {
  buildShowerAssemblyGeometry,
  buildAssemblyPreview,
  showerAssemblyGeometryKey,
} from './geometry'
import { attachShowerHead, showerHeadHost, showerHeadLevelPose } from '../shower-head/attachment'
import { attachHandShower, handShowerHost } from '../hand-shower/attachment'
import { ShowerHeadNode } from '../shower-head/schema'
import { HandShowerNode } from '../hand-shower/schema'
import { ShowerHoseNode } from '../shower-hose/schema'
import { connectShowerHose, hoseConnection } from '../shower-hose/connection'
import { showerArmPlacement, showerArmPlacementInPlan } from '../shower-arm/placement'
import { showerAssemblyFloorplan } from './floorplan'
import { fitAssemblyPlacement } from './placement'

test('tall or wide assemblies fit their wall and unsuitable walls reject placement', () => {
  const level = LevelNode.parse({ height: 2.5 }),
    wall = WallNode.parse({ parentId: level.id, start: [0, 0], end: [3, 0] }),
    n = ShowerAssemblyNode.parse({ family: 'panel', height: 1.5, width: 0.4, mountingHeight: 2 })
  const nodes = { [level.id]: level, [wall.id]: wall } as Record<string, AnyNode>,
    raw = showerArmPlacement(n, wall, 0.03, 'back')!
  const fit = fitAssemblyPlacement(n, raw, nodes)!
  expect(fit.mountingHeight).toBe(1)
  expect(fit.position[0]).toBe(0.2)
  expect(fit.position[2]).toBe(-0.05)
  expect(fit.mountingHeight + n.height).toBeLessThanOrEqual(2.5)
  expect(
    fitAssemblyPlacement(n, raw, { ...nodes, [wall.id]: { ...wall, height: 0.8 } } as Record<
      string,
      AnyNode
    >),
  ).toBeNull()
  expect(
    fitAssemblyPlacement(n, raw, { ...nodes, [wall.id]: { ...wall, end: [0.1, 0] } } as Record<
      string,
      AnyNode
    >),
  ).toBeNull()
})

test('all column and panel presets have finite editable geometry and exact stable component sockets', () => {
  for (const p of showerAssemblyPresets)
    for (const max of [false, true]) {
      const n = ShowerAssemblyNode.parse({
        ...assemblyPresetNode(p),
        height: max ? 1.8 : 0.7,
        width: max ? 0.4 : 0.14,
        depth: max ? 0.12 : 0.025,
        tubeSize: max ? 0.05 : 0.02,
        armLength: max ? 0.6 : 0.15,
        holderSlide: 0.8,
        holderTilt: 40,
        jets: 4,
        jetSize: 0.12,
        jetTilt: 25,
      })
      const slots = assemblySockets(n),
        root = buildShowerAssemblyGeometry(n)
      for (const slot of slots) {
        const target = root.getObjectByName(`${slot.type}_target_${slot.id}`)!
        expect(target.position.toArray()).toEqual(slot.position)
        expect(target.rotation.toArray().slice(0, 3)).toEqual(slot.rotation)
      }
      root.traverse((o) => {
        if (o instanceof Mesh) {
          for (const v of o.geometry.getAttribute('position').array)
            expect(Number.isFinite(v)).toBe(true)
          o.geometry.dispose()
        }
      })
      expect(ShowerAssemblyNode.parse(JSON.parse(JSON.stringify(n)))).toEqual(n)
      const resized = {
        ...n,
        height: 1.2,
        holderTilt: -20,
        holderSlide: 0.3,
        armLength: 0.4,
      } as ShowerAssemblyNode
      expect(assemblySockets(resized).map((s) => s.id)).toEqual(slots.map((s) => s.id))
      expect(assemblySockets(resized).find((s) => s.id === 'shower-head')!.position).not.toEqual(
        slots.find((s) => s.id === 'shower-head')!.position,
      )
      expect(showerAssemblyGeometryKey(resized)).not.toBe(showerAssemblyGeometryKey(n))
      expect(ShowerAssemblyNode.parse({ ...n, ...assemblyPresetParameters(p) }).id).toBe(n.id)
      const children = assemblyChildren(n)
      expect(children.head?.parentId).toBe(n.id)
      expect(children.hose?.targetId).toBe(children.hand?.id)
    }
})

test('assembly child replacement and hose following work across resize, holder slide and either wall face', () => {
  const level = LevelNode.parse({}),
    wall = WallNode.parse({ parentId: level.id, start: [0, 0], end: [4, 1], thickness: 0.2 })
  const base = assemblyPresetNode(showerAssemblyPresets[4]),
    pose = showerArmPlacement(base, wall, 1, 'back')!
  const assembly = ShowerAssemblyNode.parse({ ...base, ...pose }),
    bundle = createAssemblyChanges(assembly)
  const nodes = Object.fromEntries(
    [level, wall, ...bundle.create.map((c) => c.node)].map((n) => [n.id, n]),
  ) as Record<string, AnyNode>
  const head = bundle.create
      .map((c) => c.node)
      .find((n) => String(n.type) === 'bath-space:shower-head')!,
    hand = bundle.create
      .map((c) => c.node)
      .find((n) => String(n.type) === 'bath-space:hand-shower')!,
    hose = ShowerHoseNode.parse(
      bundle.create.map((c) => c.node).find((n) => String(n.type) === 'bath-space:shower-hose')!,
    )
  expect(
    attachShowerHead(ShowerHeadNode.parse({ style: 'compact' }), assembly.id, nodes).changes.delete,
  ).toEqual([head.id])
  const replacement = attachHandShower(
    HandShowerNode.parse({ style: 'round-wand' }),
    assembly.id,
    nodes,
  )
  expect(replacement.changes.delete).toContain(hand.id)
  expect(
    replacement.changes.update!.some(
      (u) =>
        u.id === hose.id && (u.data as { targetId?: string }).targetId === replacement.placed.id,
    ),
  ).toBe(true)
  const before = hoseConnection(hose, (id) => nodes[id])!
  expect(before).not.toBeNull()
  const resized = {
    ...assembly,
    height: 1.8,
    armLength: 0.6,
    holderSlide: 0.7,
    holderTilt: -30,
  } as ShowerAssemblyNode
  nodes[assembly.id] = resized as unknown as AnyNode
  const after = hoseConnection(hose, (id) => nodes[id])!
  expect(after.end.distanceTo(before.end)).toBeGreaterThan(0.2)
  expect(after.endDirection.distanceTo(before.endDirection)).toBeGreaterThan(0.1)
  expect(showerHeadHost(nodes[assembly.id]!)!.slot.position).toEqual(
    assemblySockets(resized).find((s) => s.id === 'shower-head')!.position,
  )
  expect(handShowerHost(nodes[assembly.id]!)!.slot.rotation[0]).toBe(-Math.PI / 6)
  expect(
    connectShowerHose(ShowerHoseNode.parse({}), assembly.id, hand.id, nodes).changes.delete,
  ).toContain(hose.id)
  expect(pose.position[2]).toBe(-0.1)
  expect(pose.rotation).toBe(Math.PI)
  const ctx = { resolve: (id: string) => nodes[id] } as GeometryContext
  expect(showerAssemblyFloorplan(resized, ctx)).not.toBeNull()
  expect(showerArmPlacementInPlan(resized, [20, 20], nodes, level.id)).toBeNull()
  const root = new Group(),
    levelRoot = new Group()
  root.position.set(1, 1, 0)
  root.rotation.y = 0.6
  levelRoot.add(root)
  const preview = showerHeadLevelPose(resized, root, levelRoot),
    point = new Vector3(...showerHeadHost(nodes[assembly.id]!)!.slot.position)
      .applyEuler(new Euler(0, 0.6, 0))
      .add(root.position)
  expect(new Vector3(...preview.position).distanceTo(point)).toBeLessThan(1e-9)
  const model = buildAssemblyPreview(resized, ctx)
  let meshes = 0
  model.traverse((o) => {
    if (o instanceof Mesh) {
      meshes++
      o.geometry.dispose()
    }
  })
  expect(meshes).toBeGreaterThan(20)
})
