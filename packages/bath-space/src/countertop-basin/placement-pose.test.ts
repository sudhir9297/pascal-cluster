import { expect, test } from 'bun:test'
import { LevelNode, type AnyNode } from '@pascal-app/core'
import { Group, Mesh, BoxGeometry, MeshBasicMaterial, Matrix4, Vector3 } from 'three'
import { FreestandingVanityNode } from '../freestanding-vanity/schema'
import { CountertopBasinNode, UndermountBasinNode } from './schema'
import { basinLevelPose, vanityLocalToLevel } from './attachment'
import { basinPlacementCandidate } from './placement-pose'

function fixture() {
  const level = LevelNode.parse({})
  const vanity = FreestandingVanityNode.parse({ parentId: level.id, position: [4, 0.2, -3], rotation: 0.8 })
  const nodes = { [level.id]: level, [vanity.id]: vanity } as unknown as Record<string, AnyNode>
  const root = new Group(), surface = new Mesh(new BoxGeometry(), new MeshBasicMaterial())
  surface.name = 'vanity-countertop'; root.add(surface)
  const roots = new Map([[vanity.id, root]])
  return { level, vanity, nodes, root, surface, roots }
}
function close(actual: readonly number[], expected: readonly number[]) {
  expected.forEach((value, i) => expect(actual[i]).toBeCloseTo(value, 6))
}

test('hovering a translated and rotated vanity keeps the ghost level-local and attaches only the committed pose', () => {
  const { level, vanity, nodes, root, surface, roots } = fixture()
  const basin = CountertopBasinNode.parse({})
  const position = vanityLocalToLevel(vanity, [0.1, vanity.height, -0.04], nodes)
  const snapshot = JSON.stringify(nodes), childCount = root.children.length
  const result = basinPlacementCandidate(basin, { position, rotation: 0.3, surface }, level.id, roots, nodes)!
  expect(result.preview.parentId).toBe(level.id)
  expect(result.preview.position).toEqual(position)
  expect(result.placed.parentId).toBe(vanity.id)
  close(result.placed.position, [0.1, vanity.height, -0.04])
  const committed = basinLevelPose({ ...basin, ...result.placed }, nodes)
  close(committed.position, result.preview.position)
  expect(committed.rotation).toBeCloseTo(result.preview.rotation)
  expect(JSON.stringify(nodes)).toBe(snapshot)
  expect(root.children.length).toBe(childCount)
  // The single level transform places preview and saved node at the same world point.
  const levelMatrix = new Matrix4().makeRotationY(0.5).setPosition(10, 3, 2)
  close(new Vector3(...committed.position).applyMatrix4(levelMatrix).toArray(),
    new Vector3(...result.preview.position).applyMatrix4(levelMatrix).toArray())
})

test('crossing between ground, vanity and another item never changes the ghost parent frame', () => {
  const { level, nodes, surface, roots } = fixture()
  const basin = CountertopBasinNode.parse({})
  for (const hit of [
    { position: [2, 0, 1] as [number, number, number] },
    { position: [4, 1.02, -3] as [number, number, number], surface },
    { position: [2, 0.6, 1] as [number, number, number], surface: new Mesh() },
    { position: [4.1, 1.02, -3] as [number, number, number], surface },
  ]) {
    const result = basinPlacementCandidate(basin, hit, level.id, roots, nodes)!
    expect(result.preview.parentId).toBe(level.id)
    expect(result.preview.position).toEqual(hit.position)
  }
})

test('undermount ghost uses the underside elevation in the level frame and matches its saved pose', () => {
  const { level, vanity, nodes, surface, roots } = fixture()
  const basin = UndermountBasinNode.parse({ width: 0.4, depth: 0.3 })
  const position = vanityLocalToLevel(vanity, [0, vanity.height, 0], nodes)
  // A level-aligned draft must fit and preview correctly on a rotated vanity.
  const result = basinPlacementCandidate(basin, { position, rotation: 0, surface }, level.id, roots, nodes)!
  expect(result.preview.parentId).toBe(level.id)
  expect(result.placed.parentId).toBe(vanity.id)
  expect(result.placed.rotation).toBeCloseTo(0)
  expect(result.preview.rotation).toBeCloseTo(vanity.rotation)
  expect(result.preview.position[1]).toBeCloseTo(position[1] - vanity.countertopThickness)
  const committed = basinLevelPose({ ...basin, ...result.placed }, nodes)
  close(result.preview.position, committed.position)
  expect(result.preview.rotation).toBeCloseTo(committed.rotation)
  expect(basinPlacementCandidate(basin, { position: [0, 0, 0] }, level.id, roots, nodes)).toBeNull()
})
