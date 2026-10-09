import { expect, test } from 'bun:test'
import { LevelNode, WallNode, type AnyNode } from '@pascal-app/core'
import { kitAnchor, createKitChanges, showerKitPresets } from '../shower-kit/bundle'
import { ShowerAssemblyNode } from '../shower-assembly/schema'
import { createAssemblyChanges } from '../shower-assembly/children'
import { showerRepairChanges } from './shower-repair'
import { bathingShowerReady, emptyBathingArea } from './bathing-area'

test('kit repair restores only missing identities and preserves all surviving parts', () => {
  const level = LevelNode.parse({}), wall = WallNode.parse({ parentId: level.id, start: [0, 0], end: [5, 0], height: 3 })
  const scene = { [level.id]: level, [wall.id]: wall } as Record<string, AnyNode>
  const anchor = { ...kitAnchor(showerKitPresets[0]), parentId: wall.id, wallId: wall.id, position: [1, 2.1, 0] as [number, number, number] }
  const bundle = createKitChanges(showerKitPresets[0], anchor, scene)!
  for (const part of bundle.create) scene[part.node.id] = part.node
  const head = bundle.create[1]!.node
  delete scene[head.id]
  const before = { ...scene }
  const changes = showerRepairChanges(anchor.id, scene)!
  expect(changes.create).toHaveLength(1)
  expect(changes.create[0]?.node.id).toBe(head.id)
  for (const part of changes.create) scene[part.node.id] = part.node
  for (const [id, node] of Object.entries(before)) expect(scene[id]).toBe(node)
  expect(bathingShowerReady({ ...emptyBathingArea, kind: 'shower', system: 'kit', showerId: anchor.id }, scene)).toBe(true)
  expect(showerRepairChanges(anchor.id, scene)).toBeNull()
})

test('assembly repair retains the handset and reconnects a replacement hose to it', () => {
  const assembly = ShowerAssemblyNode.parse({})
  const bundle = createAssemblyChanges(assembly)
  const scene = Object.fromEntries(bundle.create.map((part) => [part.node.id, part.node]))
  const hand = Object.values(scene).find((node) => String(node.type) === 'bath-space:hand-shower')!
  const hose = Object.values(scene).find((node) => String(node.type) === 'bath-space:shower-hose')!
  delete scene[hose.id]
  const changes = showerRepairChanges(assembly.id, scene)!
  expect(changes.create).toHaveLength(1)
  expect(changes.create[0]?.node).toMatchObject({ parentId: assembly.id, targetId: hand.id })
  expect(scene[hand.id]).toBe(hand)
})
