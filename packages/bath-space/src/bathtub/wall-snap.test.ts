import { expect, test } from 'bun:test'
import { LevelNode, WallNode, type AnyNode } from '@pascal-app/core'
import { BathtubNode } from './schema'
import { bathWallSnap } from './wall-snap'
import { bathMovePose } from './floorplan-move'
import { BathDeckNode } from '../bath-deck/schema'
import { bathDeckWallSnap } from '../bath-deck/wall-snap'

function fixture() {
  const level = LevelNode.parse({})
  const wall = WallNode.parse({ parentId: level.id, start: [0, 0], end: [5, 0], thickness: 0.2 })
  level.children = [wall.id]
  return { level, wall, nodes: { [level.id]: level, [wall.id]: wall } }
}

test('walk-in rear snaps to either wall face and releases beyond the editor radius', () => {
  const { level, wall, nodes } = fixture()
  const node = BathtubNode.parse({ shape: 'walk-in', parentId: level.id })
  for (const side of [-1, 1]) {
    const args = { node: node as unknown as AnyNode, nodes, levelId: level.id, movingIds: [], candidatePosition: [2, 0.15, side * 0.55] as [number, number, number] }
    const pose = bathWallSnap(args)!
    expect(pose.position).toEqual([2, 0.15, side * 0.5])
    expect(pose.rotation).toBe(side > 0 ? Math.PI : 0)
    expect(bathWallSnap({ ...args, candidatePosition: [2, 0.15, side * 2] })).toBeNull()
    expect(bathWallSnap({ ...args, movingIds: [wall.id] })).toBeNull()
  }
})

test('2D movement respects disabled snapping and retains free rotation', () => {
  const { level, nodes } = fixture()
  const node = BathtubNode.parse({ shape: 'walk-in', parentId: level.id, rotation: 0.3 })
  expect(bathMovePose(node, [2, 0, 0.55], nodes, false)).toEqual({ position: [2, 0, 0.55], rotation: 0.3 })
  expect(bathMovePose(node, [2, 0, 0.55], nodes, true)).toEqual({ position: [2, 0, 0.5], rotation: Math.PI })
})

test('built-in assemblies snap by deck dimensions, including oversized surrounds', () => {
  const { level, nodes } = fixture()
  const deck = BathDeckNode.parse({ length: 3.5, width: 2.5, parentId: level.id })
  const pose = bathDeckWallSnap({ node: deck as unknown as AnyNode, nodes, levelId: level.id, movingIds: [], candidatePosition: [2.5, 0, 1.4] })!
  expect(pose.position).toEqual([2.5, 0, 1.35])
  expect(pose.rotation).toBe(Math.PI)
})

test('freestanding shapes retain their free placement near walls', () => {
  const { level, nodes } = fixture()
  for (const shape of ['oval', 'rectangle', 'slipper', 'clawfoot', 'drop-in', 'undermount'] as const) {
    const node = BathtubNode.parse({ shape })
    expect(bathWallSnap({ node: node as unknown as AnyNode, nodes, levelId: level.id, movingIds: [], candidatePosition: [2, 0, 0.5] })).toBeNull()
  }
})
