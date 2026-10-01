import { expect, test } from 'bun:test'
import { LevelNode, type AnyNode } from '@pascal-app/core'
import { Box3, Mesh, Raycaster, Vector3 } from 'three'
import { FreestandingVanityNode } from '../freestanding-vanity/schema'
import { buildFreestandingVanityGeometry } from '../freestanding-vanity/geometry'
import { poseVanityMovingParts } from '../freestanding-vanity/animation'
import { DrawerClearanceCache, basinDrawerVolumes } from '../freestanding-vanity/drawer-clearance'
import { DropInBasinNode, basinPresets } from './schema'
import { buildCountertopBasinGeometry, basinGeometryKey } from './geometry'
import { InsetBasinCutCache } from './inset-cut'
import { basinPlacementCandidate } from './placement-pose'
import { basinLevelPose, vanityLocalToLevel } from './attachment'

function ray(mesh: Mesh, x = 0, z = 0) {
  mesh.updateWorldMatrix(true, false)
  return new Raycaster(new Vector3(x, 2, z), new Vector3(0, -1, 0)).intersectObject(mesh)
}

test('each drop-in shape has an above-counter rim, a hanging hollow bowl and finite metre-scale UVs', () => {
  for (const preset of basinPresets) for (const rimHeight of [0.004, 0.02]) {
    const node = DropInBasinNode.parse({ ...preset, rimHeight, height: 0.18, drainCover: false })
    const root = buildCountertopBasinGeometry(node), box = new Box3().setFromObject(root)
    expect(box.max.y).toBeCloseTo(rimHeight)
    expect(box.min.y).toBeCloseTo(-node.height)
    expect(box.max.x - box.min.x).toBeCloseTo(node.width + node.flangeWidth * 2)
    const rim = root.getObjectByName('basin-drop-in-rim') as Mesh
    expect(rim.userData.slotId).toBe('bowl')
    expect(ray(rim, node.width / 2 + node.flangeWidth / 2)[0]!.point.y).toBeCloseTo(rimHeight)
    root.updateMatrixWorld(true)
    expect(new Raycaster(new Vector3(0, 1, 0), new Vector3(0, -1, 0)).intersectObject(root, true)).toHaveLength(0)
    const uv = rim.geometry.getAttribute('uv'), position = rim.geometry.getAttribute('position')
    for (let i = 0; i < 2 * 97; i++) {
      expect(uv.getX(i)).toBe(position.getX(i))
      expect(uv.getY(i)).toBe(position.getZ(i))
    }
    root.traverse(part => { if (part instanceof Mesh) for (const name of ['position', 'normal', 'uv']) {
      expect(Array.from(part.geometry.getAttribute(name).array).every(Number.isFinite)).toBe(true)
    } })
    expect(basinGeometryKey(node)).not.toBe(basinGeometryKey({ ...node, rimHeight: rimHeight + 0.001 }))
  }
})

test('drop-in ghost and placed pose agree on a rotated vanity and the mount is at countertop top', () => {
  const level = LevelNode.parse({})
  const vanity = FreestandingVanityNode.parse({ parentId: level.id, rotation: Math.PI / 2, position: [3, 0.2, 4] })
  const node = DropInBasinNode.parse({})
  const root = buildFreestandingVanityGeometry(vanity), surface = root.getObjectByName('vanity-countertop')!
  const nodes = { [level.id]: level, [vanity.id]: vanity } as unknown as Record<string, AnyNode>
  const hit = { position: vanityLocalToLevel(vanity, [0, vanity.height, 0], nodes), surface }
  const result = basinPlacementCandidate(node, hit, level.id, new Map([[vanity.id, root]]), nodes)!
  expect(result.preview.parentId).toBe(level.id)
  expect(result.placed.parentId).toBe(vanity.id)
  expect(result.placed.position[1]).toBe(vanity.height)
  expect(result.placed.rotation).toBeCloseTo(0)
  expect(basinLevelPose({ ...node, ...result.placed }, nodes)).toEqual({ position: result.preview.position, rotation: result.preview.rotation })
  expect(basinPlacementCandidate(node, { position: [0, 0, 0] }, level.id, new Map(), nodes)).toBeNull()
})

test('drop-in cutouts clear the bowl outside edge, remain covered by the rim, and restore after removal', () => {
  for (const preset of basinPresets) {
    const host = FreestandingVanityNode.parse({ width: 1.2, depth: 0.7 })
    const root = buildFreestandingVanityGeometry(host), top = root.getObjectByName('vanity-countertop') as Mesh
    const node = DropInBasinNode.parse({ ...preset, parentId: host.id, position: [0, host.height, 0] })
    const cache = new InsetBasinCutCache()
    cache.beginFrame(); cache.sync(root, host, [node] as unknown as AnyNode[]); cache.endFrame()
    expect(ray(top)).toHaveLength(0)
    // The clearance extends beyond the outer bowl, unlike an undermount's inner-mouth cut.
    expect(ray(top, node.width / 2 + 0.001)).toHaveLength(0)
    expect(ray(top, node.width / 2 + node.flangeWidth / 2)).not.toHaveLength(0)
    cache.beginFrame(); cache.sync(root, host, []); cache.endFrame()
    expect(ray(top)).not.toHaveLength(0)
    cache.dispose()
  }
})

test('drop-in bowls participate in drawer clearance and keep unsafe drawers closed', () => {
  const host = FreestandingVanityNode.parse({ width: 0.65, depth: 0.5, drawerRows: 3 })
  const node = DropInBasinNode.parse({ width: 0.6, depth: 0.45, height: 0.22, parentId: host.id, position: [0, host.height, 0] })
  const root = buildFreestandingVanityGeometry(host), cache = new DrawerClearanceCache()
  expect(basinDrawerVolumes(host, [node] as unknown as AnyNode[])).toHaveLength(1)
  cache.beginFrame(); cache.sync(root, host, [node] as unknown as AnyNode[]); cache.endFrame()
  const drawer = root.getObjectByName('vanity-drawer-0-0')!
  expect(drawer.userData.basinBlocked).toBe(true)
  poseVanityMovingParts(root, { ...host, drawerOpen: 1 })
  expect(drawer.position.z).toBe(drawer.userData.vanityPose.closedZ)
  cache.beginFrame(); cache.sync(root, host, []); cache.endFrame()
  expect(drawer.userData.basinBlocked).toBe(false)
  cache.dispose()
})
