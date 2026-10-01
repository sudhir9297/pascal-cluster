import { Group } from 'three'
import { expect, test } from 'bun:test'
import { LevelNode, WallNode, type AnyNode, type AnyNodeId } from '@pascal-app/core'
import { Box3, Mesh, Raycaster, Vector3 } from 'three'
import { HalfPedestalBasinNode, halfPedestalBasinPresets } from '../countertop-basin/schema'
import { basinTapTarget, basinTapLocalToLevel } from '../countertop-basin/tap-attachment'
import { basinLevelPose } from '../countertop-basin/attachment'
import { wallBasinPlacement, wallBasinPlacementInPlan, createWallHungBasin } from '../wall-hung-basin/placement'
import { wallBasinMinimumMountHeight } from '../wall-hung-basin/profile'
import { buildHalfPedestalBasinGeometry, halfPedestalBasinGeometryKey } from './geometry'
import { halfPedestalBasinDefinition } from './definition'

test('half pedestal styles have short hollow shrouds, open drains, metre UVs and one empty tap target', () => {
  for (const preset of halfPedestalBasinPresets) {
    const node = HalfPedestalBasinNode.parse({ ...preset, drainCover: false }), root = buildHalfPedestalBasinGeometry(node)
    root.position.y = node.position[1]; root.updateMatrixWorld(true)
    const bounds = new Box3().setFromObject(root)
    expect(bounds.min.y).toBeCloseTo(node.position[1] - node.height - node.shroudHeight)
    expect(bounds.min.y).toBeGreaterThan(0)
    expect(bounds.max.z).toBeLessThanOrEqual(node.depth / 2 + 0.0001)
    expect(root.getObjectByName('basin-full-pedestal')).toBeUndefined()
    const shroud = root.getObjectByName('basin-half-pedestal') as Mesh
    expect(shroud.userData.slotId).toBe('pedestal')
    const targets = root.children.filter(part => part.name === 'basin-tap-target')
    expect(targets).toHaveLength(1)
    expect(targets[0]!.children.every(child => child instanceof Group && child.children.length === 0)).toBe(true)
    expect(targets[0]!.position.toArray()).toEqual(basinTapTarget(node).position)
    root.traverse(part => { if (part instanceof Mesh) for (const attribute of ['position', 'normal', 'uv']) expect(Array.from(part.geometry.getAttribute(attribute).array).every(Number.isFinite)).toBe(true) })
    expect(new Raycaster(new Vector3(0, 2, -0.04), new Vector3(0, -1, 0)).intersectObject(root.getObjectByName('basin-bowl')!, true)).toHaveLength(0)
  }
})

test('half pedestal dimensions remain finite and retain the freely chosen mounting height', () => {
  const wall = WallNode.parse({ start: [0, 0], end: [4, 0] })
  for (const preset of halfPedestalBasinPresets) for (const high of [false, true]) {
    const node = HalfPedestalBasinNode.parse({ ...preset, width: high ? 0.8 : 0.45, depth: high ? 0.55 : 0.42,
      height: high ? 0.22 : 0.08, shroudHeight: high ? 0.38 : 0.12, shroudWidth: high ? 0.38 : 0.18, shroudDepth: high ? 0.4 : 0.18, position: [1, 0.3, 0] })
    const placement = wallBasinPlacement(node, wall, 1, 'back')!
    expect(placement.position[1]).toBe(node.position[1])
    const root = buildHalfPedestalBasinGeometry(node); root.position.fromArray(placement.position)
    const bounds = new Box3().setFromObject(root)
    expect(bounds.min.y).toBeCloseTo(node.position[1] - wallBasinMinimumMountHeight(node) + 0.15)
    root.traverse(part => { if (part instanceof Mesh) for (const attribute of ['position', 'normal', 'uv']) expect(Array.from(part.geometry.getAttribute(attribute).array).every(Number.isFinite)).toBe(true) })
  }
})

test('wall placement and moving preserve half pedestal identity, height and tap pose on rotated walls', () => {
  const level = LevelNode.parse({}), wall = WallNode.parse({ parentId: level.id, start: [1, 2], end: [1, 5], thickness: 0.2 })
  const nodes = { [level.id]: { ...level, children: [wall.id] }, [wall.id]: wall } as Record<AnyNodeId, AnyNode>
  const node = HalfPedestalBasinNode.parse({ position: [0, 0.9, 0] })
  const placed = wallBasinPlacementInPlan(node, [0.95, 3], nodes, level.id as AnyNodeId)!
  const moved = HalfPedestalBasinNode.parse(createWallHungBasin(node, placed, node.id))
  expect(moved.id).toBe(node.id)
  expect(moved.parentId).toBe(wall.id)
  expect(moved.position[1]).toBe(0.9)
  const pose = basinLevelPose(moved, nodes), tap = basinTapLocalToLevel(moved, basinTapTarget(moved), nodes)
  expect(pose.position[1]).toBe(0.9)
  expect(tap.position[1]).toBe(0.9)
  expect(wallBasinPlacement(node, wall, 1, 'front')!.rotation).toBe(Math.PI)
  expect(wallBasinPlacement(node, WallNode.parse({ ...wall, end: [1, 2.2] }), 0.1, 'front')).toBeNull()
  expect(halfPedestalBasinDefinition.affordanceTools?.move).toBeDefined()
})

test('half pedestal design settings rebuild geometry while wall movement keeps its geometry key', () => {
  const node = HalfPedestalBasinNode.parse({})
  expect(halfPedestalBasinGeometryKey(node)).toBe(halfPedestalBasinGeometryKey({ ...node, position: [2, 1, 0], rotation: Math.PI }))
  for (const patch of [{ shroudHeight: 0.3 }, { shroudWidth: 0.32 }, { shroudDesign: 'square' as const }]) expect(halfPedestalBasinGeometryKey({ ...node, ...patch })).not.toBe(halfPedestalBasinGeometryKey(node))
  const shapes = halfPedestalBasinPresets.map(preset => (buildHalfPedestalBasinGeometry(HalfPedestalBasinNode.parse(preset)).getObjectByName('basin-half-pedestal') as Mesh).geometry.getAttribute('position').array)
  expect(Array.from(shapes[0]!)).not.toEqual(Array.from(shapes[1]!))
  expect(Array.from(shapes[1]!)).not.toEqual(Array.from(shapes[2]!))
})
