import { expect, test } from 'bun:test'
import { BaseNode, LevelNode, nodeType, objectId, nodeRegistry, registerNode, useScene, type AnyNode, type AnyNodeId, type AnyNodeDefinition } from '@pascal-app/core'
import { z } from 'zod'
import { Group, Mesh, BoxGeometry, MeshBasicMaterial } from 'three'
import { FreestandingVanityNode } from '../freestanding-vanity/schema'
import { CountertopBasinNode, UndermountBasinNode, DropInBasinNode, SemiRecessedBasinNode, WallHungBasinNode, BasinNode, WALL_HUNG_BASIN, SEMI_RECESSED_BASIN, basinDepth, wallHungBasinPresets } from './schema'
import { basinGeometryKey, buildCountertopBasinGeometry } from './geometry'
import { BASIN_TAP_TARGET_NAME, createBasinTapTarget, syncBasinTapTarget, basinTapTarget, basinTapSnap, basinTapMoveChanges, basinTapLocalToLevel } from './tap-attachment'
import { countertopBasinDefinition } from './definition'
import { freestandingVanityDefinition } from '../freestanding-vanity/definition'

import { buildWallHungBasinGeometry } from '../wall-hung-basin/geometry'
import { WALL_BASIN_DRAIN_Z, wallBasinBowlSize } from '../wall-hung-basin/profile'
import { semiRecessedDeckDepth } from './semi-recessed-geometry'

function fixture() {
  const level = LevelNode.parse({})
  const vanity = FreestandingVanityNode.parse({ parentId: level.id, position: [3, 0.2, -2], rotation: Math.PI / 3 })
  const basin = CountertopBasinNode.parse({ parentId: vanity.id, position: [0.1, vanity.height, 0], rotation: 0.4 })
  const nodes = { [level.id]: level, [vanity.id]: vanity, [basin.id]: basin } as unknown as Record<string, AnyNode>
  const root = new Group(), mesh = new Mesh(new BoxGeometry(), new MeshBasicMaterial())
  root.add(mesh)
  const roots = new Map([[basin.id, root]])
  return { level, vanity, basin, nodes, root, mesh, roots }
}

test('basin geometry has an empty mounting target behind each bowl at its base elevation', () => {
  for (const shape of ['round', 'oval', 'rectangle'] as const) {
    const basin = CountertopBasinNode.parse({ shape, width: 0.6, depth: 0.4 })
    const geometry = buildCountertopBasinGeometry(basin)
    const target = geometry.getObjectByName('basin-tap-target')!
    expect(target).toBeInstanceOf(Group)
    expect(target.children.every(child => child instanceof Group && child.children.length === 0)).toBe(true)
    expect(target.parent).toBe(geometry)
    expect(target.position.toArray()).toEqual(basinTapTarget(basin).position)
    expect(target.position.z).toBeCloseTo((shape === 'round' ? 0.6 : 0.4) / 2 + 0.055)
  }
})

test('hovering the bowl snaps to the basin target in a rotated vanity hierarchy; Alt bypasses', () => {
  const { basin, nodes, mesh, roots } = fixture()
  const snap = basinTapSnap(mesh, roots, nodes)!
  expect(snap.parentId).toBe(basin.id)
  expect(snap.position).toEqual(basinTapTarget(basin).position)
  expect(snap.levelPose).toEqual(basinTapLocalToLevel(basin, basinTapTarget(basin), nodes))
  expect(basinTapSnap(mesh, roots, nodes, true)).toBeNull()
  expect(basinTapSnap(new Group(), roots, nodes)).toBeNull()
  const tap = { id: 'future-tap', parentId: 'level', position: [0, 0, 0] as [number, number, number], rotation: 0 }
  const changes = basinTapMoveChanges(tap, tap, nodes, { surface: mesh, roots })
  expect(changes.update[0]!.data).toEqual({ parentId: basin.id, position: snap.position, rotation: snap.rotation })
})

test('moving an attached tap moves its persisted target, even outside the basin footprint', () => {
  const { basin, nodes, mesh, roots } = fixture()
  const tap = { id: 'future-tap', parentId: basin.id, ...basinTapTarget(basin) }
  const local = { position: [0.6, 0.02, -0.3] as [number, number, number], rotation: 0.8 }
  const levelPose = basinTapLocalToLevel(basin, local, nodes)
  const changes = basinTapMoveChanges(tap, levelPose, nodes)
  const target = (changes.update[0]!.data as unknown as { tapTarget: typeof local }).tapTarget
  target.position.forEach((value, i) => expect(value).toBeCloseTo(local.position[i]!))
  expect(target.rotation).toBeCloseTo(local.rotation)
  expect(changes.update[1]!.data.parentId).toBe(basin.id)
  const moved = CountertopBasinNode.parse({ ...basin, tapTarget: target })
  nodes[basin.id] = moved as unknown as AnyNode
  expect(basinTapSnap(mesh, roots, nodes)!.position).toEqual(target.position)
  expect(basinGeometryKey(moved)).not.toBe(basinGeometryKey(basin))
  expect(buildCountertopBasinGeometry(moved).getObjectByName('basin-tap-target')!.position.toArray()).toEqual(target.position)
  // The new mount is local to the basin and follows subsequent parent movement.
  const old = basinTapLocalToLevel(moved, target, nodes)
  nodes[basin.parentId!] = { ...nodes[basin.parentId!]!, position: [5, 0.2, -2] } as AnyNode
  const carried = basinTapLocalToLevel(moved, target, nodes)
  expect(carried.position[0] - old.position[0]).toBeCloseTo(2)
})

test('Alt releases an attached tap to the containing level without moving the target or changing the world pose', () => {
  const { level, basin, nodes, mesh, roots } = fixture()
  const tap = { id: 'future-tap', parentId: basin.id, ...basinTapTarget(basin) }
  const world = basinTapLocalToLevel(basin, tap, nodes)
  const changes = basinTapMoveChanges(tap, world, nodes, { altKey: true, surface: mesh, roots })
  expect(changes.update).toHaveLength(1)
  expect(changes.update[0]!.data).toEqual({ ...world, parentId: level.id })
  expect(basin.tapTarget).toBeUndefined()
})

test('old saved basins get child lists and dimension-based targets; customized targets survive reload', () => {
  const old = CountertopBasinNode.parse({ width: 0.7, shape: 'round' })
  expect(old.children).toEqual([])
  expect(basinTapTarget(old).position[2]).toBeCloseTo(0.405)
  const customized = CountertopBasinNode.parse({ ...old, tapTarget: { position: [0.1, 0, 0.2], rotation: 0.6 }, children: ['tap'] })
  expect(CountertopBasinNode.parse(JSON.parse(JSON.stringify(customized))).tapTarget).toEqual(customized.tapTarget)
  expect(basinTapTarget({ ...customized, width: 0.8 })).toEqual(customized.tapTarget!)
})

test('scene transactions maintain child lists and undo tap movement and Alt detachment', () => {
  const snapshot = useScene.getState(), restoreRegistry = nodeRegistry._snapshot()
  const raf = globalThis.requestAnimationFrame, cancelRaf = globalThis.cancelAnimationFrame
  globalThis.requestAnimationFrame = () => 0
  globalThis.cancelAnimationFrame = () => {}
  try {
    const TapFixture = BaseNode.extend({ id: objectId('test-tap'), type: nodeType('test:tap'),
      position: z.tuple([z.number(), z.number(), z.number()]), rotation: z.number() })
    registerNode({ kind: 'test:tap', schemaVersion: 1, schema: TapFixture } as unknown as AnyNodeDefinition)
    registerNode(countertopBasinDefinition as unknown as AnyNodeDefinition)
    registerNode(freestandingVanityDefinition as unknown as AnyNodeDefinition)
    const { level, vanity, basin, nodes, mesh, roots } = fixture()
    useScene.setState({ nodes: { ...nodes, [level.id]: { ...level, children: [vanity.id] },
      [vanity.id]: { ...vanity, children: [basin.id] } } as unknown as Record<AnyNodeId, AnyNode>,
      rootNodeIds: [level.id], readOnly: false, dirtyNodes: new Set() })
    const tap = TapFixture.parse({ parentId: level.id, position: [0, 0, 0], rotation: 0 })
    const id = tap.id as AnyNodeId
    useScene.getState().createNode(tap as unknown as AnyNode, level.id)
    useScene.getState().applyNodeChanges(basinTapMoveChanges(tap, tap, useScene.getState().nodes, { surface: mesh, roots }))
    expect(CountertopBasinNode.parse(useScene.getState().nodes[basin.id as AnyNodeId]).children).toContain(id)
    expect(LevelNode.parse(useScene.getState().nodes[level.id]).children).not.toContain(id)
    const attached = TapFixture.parse(useScene.getState().nodes[id])
    const local = { position: [0.2, 0, 0.25] as [number, number, number], rotation: 0.3 }
    const world = basinTapLocalToLevel(basin, local, nodes)
    useScene.temporal.getState().clear()
    useScene.getState().applyNodeChanges(basinTapMoveChanges(attached, world, useScene.getState().nodes))
    expect(CountertopBasinNode.parse(useScene.getState().nodes[basin.id as AnyNodeId]).tapTarget).toBeDefined()
    useScene.temporal.getState().undo()
    expect(CountertopBasinNode.parse(useScene.getState().nodes[basin.id as AnyNodeId]).tapTarget).toBeUndefined()
    expect(TapFixture.parse(useScene.getState().nodes[id])).toEqual(attached)
    useScene.temporal.getState().clear()
    useScene.getState().applyNodeChanges(basinTapMoveChanges(attached, world, useScene.getState().nodes, { altKey: true }))
    expect(useScene.getState().nodes[id]!.parentId).toBe(level.id)
    expect(CountertopBasinNode.parse(useScene.getState().nodes[basin.id as AnyNodeId]).children).not.toContain(id)
    expect(LevelNode.parse(useScene.getState().nodes[level.id]).children).toContain(id)
    useScene.temporal.getState().undo()
    expect(useScene.getState().nodes[id]!.parentId).toBe(basin.id)
    expect(CountertopBasinNode.parse(useScene.getState().nodes[basin.id as AnyNodeId]).children).toContain(id)
  } finally {
    useScene.setState(snapshot)
    useScene.temporal.getState().clear()
    restoreRegistry()
    globalThis.requestAnimationFrame = raf
    globalThis.cancelAnimationFrame = cancelRaf
  }
})

test('every basin design owns one empty tap group and recomputes it after dimension changes', () => {
  const cases = [
    ...['round', 'oval', 'rectangle'].flatMap(shape => [
      CountertopBasinNode.parse({ shape }), UndermountBasinNode.parse({ shape }),
      DropInBasinNode.parse({ shape }), SemiRecessedBasinNode.parse({ shape }),
    ]),
    ...wallHungBasinPresets.map(preset => WallHungBasinNode.parse(preset)),
  ]
  for (const original of cases) {
    for (const parameters of [{}, { width: .75, depth: .52, height: .2 }, { width: original.type === WALL_HUNG_BASIN ? .45 : .35, depth: original.type === WALL_HUNG_BASIN ? .42 : .32 }]) {
      const node = BasinNode.parse({ ...original, ...parameters })
      const model = node.type === WALL_HUNG_BASIN ? buildWallHungBasinGeometry(node) : buildCountertopBasinGeometry(node)
      const targets: Group[] = []
      model.traverse(object => { if (object.name === BASIN_TAP_TARGET_NAME) targets.push(object as Group) })
      expect(targets).toHaveLength(1)
      const target = targets[0]!
      expect(target).toBeInstanceOf(Group)
      expect(target.children.every(child => child instanceof Group && child.children.length === 0)).toBe(true)
      expect(target.parent).toBe(model)
      expect(target.userData.attachmentTarget).toBe('tap')
      expect(target.userData.basinId).toBe(node.id)
      expect(target.position.toArray()).toEqual(basinTapTarget(node).position)
      expect(target.position.x).toBe(0)
      if (node.type === SEMI_RECESSED_BASIN) {
        expect(target.position.y).toBeCloseTo(node.height - node.recessDepth)
        expect(target.position.z).toBeCloseTo(basinDepth(node)/2 - semiRecessedDeckDepth(node)/2)
      } else if (node.type === WALL_HUNG_BASIN) {
        expect(target.position.y).toBe(0)
        expect(target.position.z).toBeGreaterThan(WALL_BASIN_DRAIN_Z + wallBasinBowlSize(node).depth/2)
        expect(target.position.z).toBeLessThan(node.depth/2 - (node.wallDesign === 'classic' ? .03 : 0))
      } else expect(target.position.z).toBeCloseTo(basinDepth(node)/2 + .055)
      disposeBasin(model)
    }
  }
})

test('round targets follow diameter, oval targets follow depth, and deck targets follow height and recess', () => {
  const round = CountertopBasinNode.parse({ shape: 'round', width: .4 })
  expect(basinTapTarget({ ...round, width: .6 }).position[2] - basinTapTarget(round).position[2]).toBeCloseTo(.1)
  const oval = CountertopBasinNode.parse({ shape: 'oval', depth: .4 })
  expect(basinTapTarget({ ...oval, width: .7 })).toEqual(basinTapTarget(oval))
  expect(basinTapTarget({ ...oval, depth: .5 }).position[2] - basinTapTarget(oval).position[2]).toBeCloseTo(.05)
  const semi = SemiRecessedBasinNode.parse({})
  expect(basinTapTarget({ ...semi, height: semi.height + .02 }).position[1] - basinTapTarget(semi).position[1]).toBeCloseTo(.02)
  expect(basinTapTarget({ ...semi, recessDepth: semi.recessDepth + .01 }).position[1] - basinTapTarget(semi).position[1]).toBeCloseTo(-.01)
  const wall = WallHungBasinNode.parse({ shape: 'round', width: .45, depth: .55 })
  expect(basinTapTarget({ ...wall, width: .6 }).position[2]).toBeGreaterThan(basinTapTarget(wall).position[2])
})

test('undermount target follows a changed supporting countertop without rebuilding the basin', () => {
  let vanity = FreestandingVanityNode.parse({ height: .85, countertopThickness: .03 })
  const basin = UndermountBasinNode.parse({ parentId: vanity.id, position: [0,.82,0] })
  const nodes = { [vanity.id]: vanity } as unknown as Record<string, AnyNode>
  const target = createBasinTapTarget(basin, nodes)
  expect(target.position.y).toBeCloseTo(.03)
  vanity = FreestandingVanityNode.parse({ ...vanity, height: .9 })
  nodes[vanity.id] = vanity as unknown as AnyNode
  syncBasinTapTarget(target, basin, nodes)
  expect(target.position.y).toBeCloseTo(.08)
  expect(target.position.y + basin.position[1]).toBeCloseTo(vanity.height)
  const adjusted = { ...basin, position: [0,.86,0] as [number,number,number] }
  syncBasinTapTarget(target, adjusted, nodes)
  expect(target.position.y).toBeCloseTo(.04)
})

function disposeBasin(group: Group) {
  group.traverse(object => {
    if (!(object instanceof Mesh)) return
    object.geometry.dispose()
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!material.userData.__pascalCachedMaterial) material.dispose()
    }
  })
}

