import { describe, expect, test } from 'bun:test'
import { WallNode, LevelNode, type AnyNode, type AnyNodeId } from '@pascal-app/core'
import { Box3, Mesh, Raycaster, Vector3, type Group, type Material } from 'three'
import { WallHungBasinNode, wallHungBasinPresets } from '../countertop-basin/schema'
import { basinLevelPose } from '../countertop-basin/attachment'
import { basinTapLocalToLevel, basinTapTarget } from '../countertop-basin/tap-attachment'
import { buildWallHungBasinGeometry } from './geometry'
import { createWallHungBasin, wallBasinPlacement, wallBasinPlacementInPlan } from './placement'
import { wallBasinMinimumMountHeight } from './profile'
import { wallHungBasinGeometryKey } from './geometry'
import { wallBasinFloorplan } from './floorplan'

function dispose(group: Group) {
  const materials = new Set<Material>()
  group.traverse(object => {
    if (!(object instanceof Mesh)) return
    object.geometry.dispose()
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material)
  })
  for (const material of materials) if (!material.userData.__pascalCachedMaterial) material.dispose()
}

describe('wall hung basins', () => {
  test('every design has a rear deck, an open bowl, a through drain, and finite metre-scale UVs', () => {
    for (const preset of wallHungBasinPresets) {
      const node = WallHungBasinNode.parse({ ...preset, drainCover: false })
      const group = buildWallHungBasinGeometry(node)
      group.updateMatrixWorld(true)
      const box = new Box3().setFromObject(group.getObjectByName('basin-bowl')!)
      expect(box.min.y).toBeCloseTo(-node.height, 6)
      expect(box.max.y).toBeCloseTo(0, 6)
      expect(box.min.z).toBeCloseTo(-node.depth / 2, 6)
      expect(box.max.z).toBeCloseTo(node.depth / 2, 6)
      expect(box.max.x - box.min.x).toBeCloseTo(node.width, 6)
      expect(new Raycaster(new Vector3(0, 1, -0.04), new Vector3(0, -1, 0)).intersectObject(group.getObjectByName('basin-bowl')!, true)).toHaveLength(0)
      const deck = new Raycaster(new Vector3(.05, 1, node.depth / 2 - 0.04), new Vector3(0, -1, 0)).intersectObject(group, true)[0]!
      expect(deck.object.name).toBe('basin-bowl')
      expect(deck.point.y).toBeCloseTo(0, 6)
      const bowl = new Raycaster(new Vector3(0.06, 1, -0.04), new Vector3(0, -1, 0)).intersectObject(group, true)[0]!
      expect(bowl.point.y).toBeLessThan(-node.height * 0.45)
      group.traverse(object => {
        if (!(object instanceof Mesh)) return
        for (const name of ['position', 'normal', 'uv']) for (const value of object.geometry.getAttribute(name).array) expect(Number.isFinite(value)).toBe(true)
      })
      expect(group.getObjectByName('basin-tap-target')!.position.toArray()).toEqual(basinTapTarget(node).position)
      dispose(group)
    }
  })

  test('dimension limits produce finite shells and retain the mounting plane', () => {
    for (const shape of ['round', 'oval', 'rectangle'] as const) for (const small of [true, false]) {
      const node = WallHungBasinNode.parse({ shape, width: small ? 0.45 : 0.8, depth: small ? 0.42 : 0.55,
        height: small ? 0.08 : 0.22, wallThickness: 0.025, taper: 0.4, plumbingEnabled: false })
      const group = buildWallHungBasinGeometry(node)
      const box = new Box3().setFromObject(group)
      expect(box.max.y).toBeCloseTo(0, 6)
      expect(box.min.y).toBeCloseTo(-node.height, 6)
      group.traverse(object => {
        if (object instanceof Mesh) for (const value of object.geometry.getAttribute('position').array) expect(Number.isFinite(value)).toBe(true)
      })
      dispose(group)
    }
  })

  test('placement keeps either rear face flush and clamps the basin within the wall', () => {
    const node = WallHungBasinNode.parse({})
    const wall = WallNode.parse({ start: [0, 0], end: [3, 0], thickness: 0.2 })
    for (const side of ['front', 'back'] as const) {
      const placed = wallBasinPlacement(node, wall, 0, side)!
      expect(placed.position[0]).toBeCloseTo(node.width / 2)
      expect(Math.abs(placed.position[2]) - node.depth / 2).toBeCloseTo(0.1)
      expect(placed.position[1]).toBe(0.85)
      expect(placed.parentId).toBe(wall.id)
    }
    expect(wallBasinPlacement(node, { ...wall, end: [0.4, 0] }, 0, 'front')).toBeNull()
    expect(wallBasinPlacement(node, { ...wall, visible: false }, 1, 'front')).toBeNull()
    expect(wallBasinPlacement(node, wall, 1.03, 'front', 0.1)!.position[0]).toBeCloseTo(1)
    const resized = { ...node, width: 0.8, depth: 0.55 }
    const target = wallBasinPlacement(resized, wall, 2.9, 'back')!
    expect(target.position[0]).toBeCloseTo(2.6)
    expect(target.position[2] + resized.depth / 2).toBeCloseTo(-0.1)
  })

  test('plan placement, floorplan, and tap targets follow a rotated wall', () => {
    const level = LevelNode.parse({})
    const wall = WallNode.parse({ parentId: level.id, start: [1, 2], end: [1, 5], thickness: 0.2 })
    const node = WallHungBasinNode.parse({})
    const nodes = { [level.id]: { ...level, children: [wall.id] }, [wall.id]: wall } as Record<AnyNodeId, AnyNode>
    const target = wallBasinPlacementInPlan(node, [0.95, 3], nodes, level.id as AnyNodeId)!
    expect(target.wallId).toBe(wall.id)
    const placed = { ...node, ...target }
    const pose = basinLevelPose(placed, nodes)
    expect(pose.position[0]).toBeCloseTo(1 - target.position[2])
    expect(pose.position[2]).toBeCloseTo(3)
    const tap = basinTapLocalToLevel(placed, basinTapTarget(placed), nodes)
    // Default box deck midpoint is 53.5 mm forward of the basin rear.
    expect(Math.abs(tap.position[0] - 1)).toBeCloseTo(wall.thickness / 2 + 0.0535)
    expect(tap.position[1]).toBeCloseTo(0.85)
    const footprint = wallBasinFloorplan(placed, { resolve: id => nodes[id] } as Parameters<typeof wallBasinFloorplan>[1])!
    const xs = footprint.points.map(point => point[0])
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(node.depth)
  })

  test('repeated placement creates separate basins while moving preserves identity', () => {
    const node = WallHungBasinNode.parse({})
    const wall = WallNode.parse({ start: [0, 0], end: [3, 0] })
    const first = createWallHungBasin(node, wallBasinPlacement(node, wall, 0.7, 'front')!)
    const second = createWallHungBasin(node, wallBasinPlacement(node, wall, 1.7, 'front')!)
    expect(first.id).not.toBe(second.id)
    expect(first.position).not.toEqual(second.position)
    const moved = createWallHungBasin(first, wallBasinPlacement(first, wall, 2.2, 'back')!, first.id)
    expect(moved.id).toBe(first.id)
    expect(moved.side).toBe('back')
  })
  test('all reference designs include a connected waste route that ends flush at the rear plane', () => {
    for (const preset of wallHungBasinPresets) for (const depth of [0.42, 0.55]) {
      const node = WallHungBasinNode.parse({ ...preset, depth })
      const group = buildWallHungBasinGeometry(node)
      group.updateMatrixWorld(true)
      const flange = group.getObjectByName('basin-wall-flange')!
      const bounds = new Box3().setFromObject(flange)
      expect(bounds.max.z).toBeCloseTo(node.depth / 2, 6)
      expect(flange.position.y).toBeCloseTo(-node.height - node.plumbingDrop)
      expect(group.getObjectByName('basin-waste-collar')).toBeDefined()
      expect(group.getObjectByName('basin-wall-socket')).toBeDefined()
      const allBounds = new Box3().setFromObject(group)
      expect(allBounds.max.z).toBeCloseTo(node.depth / 2, 6)
      expect(allBounds.min.y + wallBasinMinimumMountHeight(node)).toBeGreaterThanOrEqual(-0.000001)
      if (preset.plumbingStyle === 'concealed') expect(group.getObjectByName('basin-ceramic-shroud')).toBeDefined()
      if (preset.plumbingStyle === 'bottle') expect(group.getObjectByName('basin-bottle-trap')).toBeDefined()
      if (preset.plumbingStyle === 'p-trap') expect(group.getObjectByName('basin-curved-trap')).toBeDefined()
      if (preset.plumbingStyle === 'flexible') expect(group.getObjectByName('basin-flexible-waste')).toBeDefined()
      dispose(group)
    }
  })

  test('plumbing and overflow can be hidden and their settings rebuild the geometry', () => {
    const node = WallHungBasinNode.parse({})
    const hidden = buildWallHungBasinGeometry({ ...node, plumbingEnabled: false, overflowEnabled: false })
    expect(hidden.getObjectByName('basin-wall-flange')).toBeUndefined()
    expect(hidden.getObjectByName('basin-overflow-trim')).toBeUndefined()
    for (const patch of [{ wallDesign: 'classic' }, { plumbingStyle: 'flexible' }, { plumbingDrop: 0.3 }, { plumbingEnabled: false }, { overflowEnabled: false }]) {
      expect(wallHungBasinGeometryKey(WallHungBasinNode.parse({ ...node, ...patch }))).not.toBe(wallHungBasinGeometryKey(node))
    }
    dispose(hidden)
  })

  test('wall placement preserves the chosen height on both wall faces', () => {
    const wall = WallNode.parse({ start: [0, 0], end: [3, 0] })
    const node = WallHungBasinNode.parse({ position: [1, 0.3, 0], height: 0.22, plumbingDrop: 0.4 })
    for (const side of ['front', 'back'] as const) {
      const target = wallBasinPlacement(node, wall, 1, side)!
      expect(target.position[1]).toBeCloseTo(node.position[1])
      const pose = basinLevelPose({ ...node, ...target }, { [wall.id]: wall })
      expect(pose.position[1]).toBeCloseTo(target.position[1])
    }
  })

  test('paint assignments survive a design change and waste fittings have their own slot', () => {
    const node = WallHungBasinNode.parse({ ...wallHungBasinPresets[1], slots: { bowl: 'library:ceramic', plumbing: 'library:chrome' } })
    const changed = WallHungBasinNode.parse({ ...node, ...wallHungBasinPresets[3] })
    expect(changed.slots).toEqual(node.slots)
    const group = buildWallHungBasinGeometry(WallHungBasinNode.parse(wallHungBasinPresets[3]))
    expect(group.getObjectByName('basin-flexible-waste')!.userData.slotId).toBe('plumbing')
    expect(group.getObjectByName('basin-bowl')!.userData.slotId).toBe('bowl')
    expect(group.getObjectByName('basin-drain-cover')!.userData.slotId).toBe('drain')
    dispose(group)
  })

  test('all four bodies remain finite at both size limits with deep bowls and thick walls', () => {
    for (const preset of wallHungBasinPresets) for (const small of [true, false]) {
      const node = WallHungBasinNode.parse({ ...preset, width: small ? 0.45 : 0.8, depth: small ? 0.42 : 0.55,
        height: 0.22, wallThickness: 0.025, taper: 0.4, plumbingDrop: 0.4 })
      const group = buildWallHungBasinGeometry(node)
      group.traverse(object => {
        if (object instanceof Mesh) for (const value of object.geometry.getAttribute('position').array) expect(Number.isFinite(value)).toBe(true)
      })
      expect(new Box3().setFromObject(group).max.z).toBeCloseTo(node.depth / 2, 6)
      dispose(group)
    }
  })

})
