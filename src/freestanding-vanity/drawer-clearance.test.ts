import { expect, test } from 'bun:test'
import type { AnyNode } from '@pascal-app/core'
import { Box3, Mesh, Triangle, Vector3, type Object3D } from 'three'
import { FreestandingVanityNode } from './schema'
import { buildFreestandingVanityGeometry } from './geometry'
import { poseVanityMovingParts } from './animation'
import { SemiRecessedBasinNode, UndermountBasinNode } from '../countertop-basin/schema'
import { SemiRecessedClearanceCache } from './semi-recessed-clearance'
import { vanityFrontZ } from '../countertop-basin/attachment'
import { basinDrawerVolumes, DrawerClearanceCache } from './drawer-clearance'

function overlaps(root: Object3D, volume: Box3) {
  let count = 0
  root.updateMatrixWorld(true)
  const triangle = new Triangle(), a = new Vector3(), b = new Vector3(), c = new Vector3()
  root.traverse(part => {
    if (!(part instanceof Mesh)) return
    const position = part.geometry.getAttribute('position'), index = part.geometry.getIndex()
    const length = index?.count ?? position.count
    for (let i = 0; i < length; i += 3) {
      a.fromBufferAttribute(position, index ? index.getX(i) : i).applyMatrix4(part.matrixWorld)
      b.fromBufferAttribute(position, index ? index.getX(i + 1) : i + 1).applyMatrix4(part.matrixWorld)
      c.fromBufferAttribute(position, index ? index.getX(i + 2) : i + 2).applyMatrix4(part.matrixWorld)
      triangle.set(a, b, c)
      if (triangle.getArea() > 1e-10 && volume.intersectsTriangle(triangle)) count++
    }
  })
  return count
}

function fixture(options = {}) {
  const host = FreestandingVanityNode.parse({ width: 1, depth: 0.6, drawerRows: 3, ...options })
  const basin = UndermountBasinNode.parse({ parentId: host.id, width: 0.5, depth: 0.38,
    position: [0, host.height - host.countertopThickness, 0], height: 0.18 })
  const root = buildFreestandingVanityGeometry(host)
  const drawers: Object3D[] = []
  root.traverse(part => { if (part.userData.drawerBox) drawers.push(part) })
  const cache = new DrawerClearanceCache()
  const sync = (basins: typeof basin[]) => { cache.beginFrame(); cache.sync(root, host, basins as unknown as AnyNode[]); cache.endFrame() }
  return { host, basin, root, drawers, cache, sync }
}

test('top drawer clears the basin at every opening fraction and has sealed U-shaped lining', () => {
  const { host, basin, root, drawers, cache, sync } = fixture()
  const reserved = basinDrawerVolumes(host, [basin] as unknown as AnyNode[])[0]!.clone().expandByScalar(-0.0001)
  expect(overlaps(drawers[0]!, reserved)).toBeGreaterThan(0)
  const lower = (drawers.at(-1)!.getObjectByName(`${drawers.at(-1)!.name}-bottom`) as Mesh).geometry
  sync([basin])
  expect(drawers[0]!.userData.basinBlocked).toBe(false)
  const liners: Mesh[] = []
  drawers[0]!.traverse(p => { if (p instanceof Mesh && p.name === 'vanity-drawer-basin-liner') liners.push(p) })
  expect(liners.length).toBeGreaterThanOrEqual(3)
  expect(liners.every(p => p.userData.slotId === 'interior')).toBe(true)
  for (let step = 0; step <= 20; step++) {
    poseVanityMovingParts(root, { ...host, drawerOpen: step / 20 })
    expect(overlaps(drawers[0]!, reserved)).toBe(0)
  }
  // Unaffected drawers retain their shape, even if the buffer is rebuilt.
  const current = (drawers.at(-1)!.getObjectByName(`${drawers.at(-1)!.name}-bottom`) as Mesh).geometry
  expect(Array.from(current.getAttribute('position').array)).toEqual(Array.from(lower.getAttribute('position').array))
  cache.dispose()
})

test('moving, rotating, resizing and removing a basin rebuilds clearance from the original boxes', () => {
  const { host, basin, root, drawers, cache, sync } = fixture()
  const bottom = drawers[0]!.getObjectByName(`${drawers[0]!.name}-bottom`) as Mesh
  const original = Array.from(bottom.geometry.getAttribute('position').array)
  sync([basin])
  const first = bottom.geometry
  sync([basin]); expect(bottom.geometry).toBe(first)
  const moved = { ...basin, width: 0.4, depth: 0.3, rotation: 0.3, position: [0.12, basin.position[1], 0.03] as [number, number, number] }
  sync([moved]); expect(bottom.geometry).not.toBe(first)
  const reserved = basinDrawerVolumes(host, [moved] as unknown as AnyNode[])[0]!.expandByScalar(-0.0001)
  for (const opening of [0, 0.25, 0.5, 0.75, 1]) {
    poseVanityMovingParts(root, { ...host, drawerOpen: opening })
    expect(overlaps(drawers[0]!, reserved)).toBe(0)
  }
  sync([])
  expect(Array.from(bottom.geometry.getAttribute('position').array)).toEqual(original)
  expect(drawers[0]!.userData.basinBlocked).toBe(false)
  cache.dispose()
})

test('a basin that consumes the drawer footprint locks it closed, and removal restores travel', () => {
  const { host, basin, root, drawers, cache, sync } = fixture({ width: 0.65, depth: 0.5 })
  const large = { ...basin, width: 0.6, depth: 0.45 }
  sync([large])
  expect(drawers[0]!.userData.basinBlocked).toBe(true)
  poseVanityMovingParts(root, { ...host, drawerOpen: 1 })
  expect(drawers[0]!.position.z).toBe(drawers[0]!.userData.vanityPose.closedZ)
  sync([]); poseVanityMovingParts(root, { ...host, drawerOpen: 1 })
  expect(drawers[0]!.position.z).toBeLessThan(drawers[0]!.userData.vanityPose.closedZ)
  cache.dispose()
})

test('round and rectangular bowls and multiple drawer bays clear their entire opening paths', () => {
  for (const shape of ['round', 'rectangle'] as const) {
    const { host, basin, root, drawers, cache, sync } = fixture({ width: 1.5, depth: 0.7, drawerColumns: 2 })
    const basins = [-0.35, 0.35].map(x => UndermountBasinNode.parse({ ...basin, id: undefined, shape,
      width: 0.3, depth: 0.3, position: [x, basin.position[1], 0], height: 0.18 }))
    sync(basins)
    const reserved = basinDrawerVolumes(host, basins as unknown as AnyNode[]).map(v => v.clone().expandByScalar(-0.0001))
    for (const opening of [0, 0.1, 0.3, 0.5, 0.7, 0.9, 1]) {
      poseVanityMovingParts(root, { ...host, drawerOpen: opening })
      for (const drawer of drawers) {
        expect(drawer.userData.basinBlocked).toBe(false)
        for (const volume of reserved) expect(overlaps(drawer, volume)).toBe(0)
      }
    }
    cache.dispose()
  }
})

 test('semi-recessed front notches clear fixed cabinetry and the full drawer travel', () => {
  const { host, root, drawers, cache } = fixture()
  const basin = SemiRecessedBasinNode.parse({ parentId: host.id, position: [0, host.height, vanityFrontZ(host) + 0.09], recessDepth: 0.1 })
  const children = [basin] as unknown as AnyNode[], cabinets = new SemiRecessedClearanceCache()
  const reserved = basinDrawerVolumes(host, children)[0]!.clone().expandByScalar(-0.0001)
  expect(overlaps(root, reserved)).toBeGreaterThan(0)
  cabinets.beginFrame(); cabinets.sync(root, host, children); cabinets.endFrame()
  cache.beginFrame(); cache.sync(root, host, children); cache.endFrame()
  root.traverse(part => {
    if (!(part instanceof Mesh) || part.userData.slotId === 'countertop' || part.parent?.userData.drawerBox) return
    expect(overlaps(part, reserved)).toBe(0)
  })
  for (let step = 0; step <= 20; step++) {
    poseVanityMovingParts(root, { ...host, drawerOpen: step / 20 })
    expect(overlaps(drawers[0]!, reserved)).toBe(0)
  }
  cabinets.dispose(); cache.dispose()
})
