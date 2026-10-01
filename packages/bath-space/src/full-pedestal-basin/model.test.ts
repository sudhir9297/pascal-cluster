import { Group } from 'three'
import { expect, test } from 'bun:test'
import { LevelNode, WallNode, type AnyNode, type AnyNodeId } from '@pascal-app/core'
import { Box3, Mesh, Raycaster, Vector3 } from 'three'
import { FullPedestalBasinNode, fullPedestalBasinPresets } from '../countertop-basin/schema'
import { BASIN_TAP_TARGET_NAME, basinTapTarget, basinTapLocalToLevel } from '../countertop-basin/tap-attachment'
import { basinLevelPose } from '../countertop-basin/attachment'
import { wallBasinPlacement, wallBasinPlacementInPlan, createWallHungBasin } from '../wall-hung-basin/placement'
import { buildFullPedestalBasinGeometry, fullPedestalBasinGeometryKey } from './geometry'
import { fullPedestalBasinDefinition } from './definition'

test('every full pedestal design touches the floor and has a hollow bowl, UVs and empty tap target', () => {
  for (const preset of fullPedestalBasinPresets) for (const totalHeight of [0.7, 0.95]) {
    const node = FullPedestalBasinNode.parse({ ...preset, totalHeight, drainCover: false })
    const root = buildFullPedestalBasinGeometry(node)
    root.position.y = totalHeight; root.updateMatrixWorld(true)
    const bounds = new Box3().setFromObject(root)
    expect(bounds.min.y).toBeCloseTo(0)
    expect(bounds.max.y).toBeCloseTo(totalHeight)
    expect(bounds.max.z).toBeLessThanOrEqual(node.depth / 2 + 0.0001)
    const target = root.getObjectByName(BASIN_TAP_TARGET_NAME)!
    expect(target.children.every(child => child instanceof Group && child.children.length === 0)).toBe(true)
    expect(target.userData.attachmentTarget).toBe('tap')
    expect(target.getWorldPosition(new Vector3()).y).toBeCloseTo(totalHeight)
    expect(target.position.toArray()).toEqual(basinTapTarget(node).position)
    expect(root.getObjectByName('basin-full-pedestal')).toBeInstanceOf(Mesh)
    root.traverse(part => { if (part instanceof Mesh) for (const attribute of ['position', 'normal', 'uv']) expect(Array.from(part.geometry.getAttribute(attribute).array).every(Number.isFinite)).toBe(true) })
    expect(new Raycaster(new Vector3(0, 2, -0.04), new Vector3(0, -1, 0)).intersectObject(root, true)).toHaveLength(0)
  }
})

test('full pedestal placement clamps to both wall faces and remains floor anchored after movement', () => {
  const level = LevelNode.parse({}), wall = WallNode.parse({ parentId: level.id, start: [1, 2], end: [1, 5], thickness: 0.2 })
  const node = FullPedestalBasinNode.parse({ totalHeight: 0.8, position: [0, 1.5, 0] })
  const nodes = { [level.id]: { ...level, children: [wall.id] }, [wall.id]: wall } as Record<AnyNodeId, AnyNode>
  for (const side of ['front', 'back'] as const) {
    const placed = wallBasinPlacement(node, wall, 1.5, side)!
    expect(placed.position[1]).toBe(0.8)
    expect(placed.parentId).toBe(wall.id)
    const saved = createWallHungBasin(node, placed, node.id)
    expect(saved.id).toBe(node.id)
    const pose = basinLevelPose(FullPedestalBasinNode.parse(saved), nodes)
    expect(pose.position[1]).toBe(0.8)
    const tap = basinTapLocalToLevel(FullPedestalBasinNode.parse(saved), basinTapTarget(FullPedestalBasinNode.parse(saved)), nodes)
    expect(tap.position[1]).toBe(0.8)
  }
  const target = wallBasinPlacementInPlan(node, [0.95, 3], nodes, level.id as AnyNodeId)!
  expect(target.position[1]).toBe(0.8)
  expect(wallBasinPlacement(node, WallNode.parse({ ...wall, end: [1, 2.2] }), 0.1, 'front')).toBeNull()
})

test('pedestal geometry responds to design and size while ignoring the wall station; creation and moving share one tool', () => {
  const node = FullPedestalBasinNode.parse({})
  expect(fullPedestalBasinGeometryKey(node)).toBe(fullPedestalBasinGeometryKey({ ...node, position: [2, 0.85, 0], rotation: Math.PI }))
  for (const patch of [{ totalHeight: 0.9 }, { pedestalWidth: 0.24 }, { pedestalDesign: 'square' as const }]) expect(fullPedestalBasinGeometryKey({ ...node, ...patch })).not.toBe(fullPedestalBasinGeometryKey(node))
  expect(fullPedestalBasinDefinition.affordanceTools?.move).toBeDefined()
  const meshes = fullPedestalBasinPresets.map(preset => (buildFullPedestalBasinGeometry(FullPedestalBasinNode.parse(preset)).getObjectByName('basin-full-pedestal') as Mesh).geometry.getAttribute('position').array)
  expect(Array.from(meshes[0]!)).not.toEqual(Array.from(meshes[1]!))
  expect(Array.from(meshes[1]!)).not.toEqual(Array.from(meshes[2]!))
})
