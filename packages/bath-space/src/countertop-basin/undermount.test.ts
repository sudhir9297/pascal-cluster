import { expect, test } from 'bun:test'
import { LevelNode, type AnyNode } from '@pascal-app/core'
import { Box3, Mesh, Raycaster, Vector3 } from 'three'
import { FreestandingVanityNode, CornerVanityNode } from '../freestanding-vanity/schema'
import { buildFreestandingVanityGeometry } from '../freestanding-vanity/geometry'
import { buildCornerVanityGeometry } from '../freestanding-vanity/corner-geometry'
import { UndermountBasinNode, basinPresets } from './schema'
import { buildCountertopBasinGeometry } from './geometry'
import { basinDetachPatch, basinRemainsOnVanity } from './attachment'
import { InsetBasinCutCache } from './inset-cut'
import { basinTapTarget } from './tap-attachment'

function hits(mesh: Mesh, x = 0, z = 0) {
  mesh.updateWorldMatrix(true, false)
  return new Raycaster(new Vector3(x, 2, z), new Vector3(0, -1, 0)).intersectObject(mesh)
}

test('every undermount shape hangs below its mounting plane with a UV-mapped flange and open drain', () => {
  for (const preset of basinPresets) {
    const basin = UndermountBasinNode.parse({ ...preset, height: 0.18, drainCover: false })
    const root = buildCountertopBasinGeometry(basin)
    const bounds = new Box3().setFromObject(root)
    expect(bounds.max.y).toBeCloseTo(0)
    expect(bounds.min.y).toBeCloseTo(-basin.height)
    expect(bounds.max.x - bounds.min.x).toBeCloseTo(basin.width + basin.flangeWidth * 2)
    expect(root.getObjectByName('basin-mounting-flange')).toBeInstanceOf(Mesh)
    root.updateMatrixWorld(true)
    expect(new Raycaster(new Vector3(0, 1, 0), new Vector3(0, -1, 0)).intersectObject(root, true)).toHaveLength(0)
    expect(new Raycaster(new Vector3(0.07, 1, 0), new Vector3(0, -1, 0)).intersectObject(root, true)[0]!.point.y).toBeLessThan(0)
    root.traverse(object => { if (object instanceof Mesh) for (const name of ['position', 'normal', 'uv']) {
      for (const value of object.geometry.getAttribute(name).array) expect(Number.isFinite(value)).toBe(true)
    } })
  }
})

test('CSG cuts each shape through the countertop and closes the previous opening after movement or removal', () => {
  for (const preset of basinPresets) {
    const vanity = FreestandingVanityNode.parse({ width: 1.5, depth: 0.7 })
    const root = buildFreestandingVanityGeometry(vanity)
    const top = root.getObjectByName('vanity-countertop') as Mesh
    const basin = UndermountBasinNode.parse({ ...preset, parentId: vanity.id, position: [0, vanity.height - vanity.countertopThickness, 0] })
    const cache = new InsetBasinCutCache()
    const sync = (children: typeof basin[]) => { cache.beginFrame(); cache.sync(root, vanity, children as unknown as AnyNode[]); cache.endFrame() }
    expect(hits(top)).not.toHaveLength(0)
    sync([basin])
    expect(hits(top)).toHaveLength(0)
    expect(hits(top, 0.65)).not.toHaveLength(0)
    const geometry = top.geometry
    sync([basin]); expect(top.geometry).toBe(geometry)
    sync([{ ...basin, position: [0.4, basin.position[1], 0] }])
    expect(hits(top)).not.toHaveLength(0)
    expect(hits(top, 0.4)).toHaveLength(0)
    sync([])
    expect(hits(top, 0.4)).not.toHaveLength(0)
    // Recreating the node, as undo does, derives the opening again.
    sync([basin]); expect(hits(top)).toHaveLength(0)
    cache.dispose()
  }
})

test('rotated and multiple basins create independent holes; resizing updates the cut perimeter', () => {
  const vanity = FreestandingVanityNode.parse({ width: 1.5, depth: 0.7 })
  const root = buildFreestandingVanityGeometry(vanity), top = root.getObjectByName('vanity-countertop') as Mesh
  const left = UndermountBasinNode.parse({ parentId: vanity.id, shape: 'round', width: 0.3, position: [-0.35, vanity.height - vanity.countertopThickness, 0] })
  const right = UndermountBasinNode.parse({ parentId: vanity.id, width: 0.4, depth: 0.3, rotation: Math.PI / 2, position: [0.35, left.position[1], 0] })
  const cache = new InsetBasinCutCache()
  cache.beginFrame(); cache.sync(root, vanity, [left, right] as unknown as AnyNode[]); cache.endFrame()
  expect(hits(top, -0.35)).toHaveLength(0)
  expect(hits(top, 0.35)).toHaveLength(0)
  expect(hits(top)).not.toHaveLength(0)
  expect(hits(top, -0.17)).not.toHaveLength(0)
  cache.beginFrame(); cache.sync(root, vanity, [{ ...left, width: 0.45 }, right] as unknown as AnyNode[]); cache.endFrame()
  expect(hits(top, -0.17)).toHaveLength(0)
  cache.dispose()
})

test('unsupported basins detach and do not cut the countertop; corner vanities also support cuts', () => {
  const level = LevelNode.parse({})
  const vanity = CornerVanityNode.parse({ width: 1.2, parentId: level.id })
  const basin = UndermountBasinNode.parse({ shape: 'round', width: 0.3, parentId: vanity.id, position: [0, vanity.height - vanity.countertopThickness, 0.1] })
  expect(basinRemainsOnVanity(basin, vanity)).toBe(true)
  expect(basinRemainsOnVanity({ ...basin, position: [3, basin.position[1], 0] }, vanity)).toBe(false)
  const nodes = { [level.id]: level, [vanity.id]: vanity } as unknown as Record<string, AnyNode>
  expect(basinDetachPatch({ ...basin, position: [3, basin.position[1], 0] }, nodes)?.parentId).toBe(level.id)
  expect(basinRemainsOnVanity({ ...basin, position: [0, basin.position[1] + 0.02, 0.1] }, vanity)).toBe(false)
  expect(basinTapTarget(basin, nodes).position[1]).toBeCloseTo(vanity.countertopThickness)
  const root = buildCornerVanityGeometry(vanity), top = root.getObjectByName('vanity-countertop') as Mesh
  const cache = new InsetBasinCutCache()
  cache.beginFrame(); cache.sync(root, vanity, [basin] as unknown as AnyNode[]); cache.endFrame()
  expect(hits(top, 0, 0.1)).toHaveLength(0)
  cache.beginFrame(); cache.sync(root, vanity, [{ ...basin, parentId: 'elsewhere' }] as unknown as AnyNode[]); cache.endFrame()
  expect(hits(top, 0, 0.1)).not.toHaveLength(0)
  cache.dispose()
})
