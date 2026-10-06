import { expect, test } from 'bun:test'
import { LevelNode, nodeRegistry, registerNode, useScene, type AnyNode, type AnyNodeDefinition, type AnyNodeId } from '@pascal-app/core'
import { Mesh, Raycaster, Vector3 } from 'three'
import { BasinNode, CountertopBasinNode, SemiRecessedBasinNode, WallHungBasinNode } from './schema'
import { basinTapHoleSpacing, basinTapLayoutChanges, basinTapMountingPoints } from './tap-layout'
import { basinTapSlots, basinTapTarget } from './tap-attachment'
import { buildCountertopBasinGeometry } from './geometry'
import { buildWallHungBasinGeometry } from '../wall-hung-basin/geometry'
import { cutVanityCountertop } from './inset-cut'
import { FreestandingVanityNode } from '../freestanding-vanity/schema'
import { buildFreestandingVanityGeometry } from '../freestanding-vanity/geometry'
import { buildTapGeometry } from '../taps/geometry'
import { TapNode } from '../taps/schema'
import { tapPlacementChanges } from '../taps/placement'
import { countertopBasinDefinition } from './definition'
import { tapDefinition } from '../taps/definition'

const nodesOf = (...nodes: unknown[]) => Object.fromEntries(nodes.map(node => [(node as AnyNode).id, node])) as Record<string, AnyNode>
test('three physical mounting points keep one logical replacement slot and shrink with basin width', () => {
  const basin = CountertopBasinNode.parse({ tapMountingLayout: 'three-hole', width: .3, tapHoleSpacing: .4 })
  expect(basinTapSlots(basin)).toHaveLength(1)
  const points = basinTapMountingPoints(basin)
  expect(points.map(point => point.id)).toEqual(['hot', 'spout', 'cold'])
  expect(points[2]!.position[0] - points[0]!.position[0]).toBeCloseTo(basinTapHoleSpacing(basin))
  expect(points[2]!.position[0]).toBeLessThan(basin.width / 2 - .04)
  const model = buildTapGeometry(TapNode.parse({ presetId: 'tap-017' }))
  expect(model.getObjectByName('three-hole-hot')).toBeDefined()
  expect(model.getObjectByName('three-hole-cold')).toBeDefined()
  expect(model.getObjectByName('side-control')).toBeUndefined()
})

test('single and three-hole layouts drill matching ceramic deck holes', () => {
  for (const make of [SemiRecessedBasinNode, WallHungBasinNode]) {
    for (const layout of ['single-hole', 'three-hole'] as const) {
      const basin = make.parse({ tapMountingLayout: layout }), root = basin.type === 'bath-space:semi-recessed-basin' ? buildCountertopBasinGeometry(basin) : buildWallHungBasinGeometry(basin)
      root.updateMatrixWorld(true)
      const bowl = root.getObjectByName('basin-bowl') as Mesh, target = basinTapTarget(basin)
      for (const point of basinTapMountingPoints(basin)) expect(new Raycaster(new Vector3(point.position[0], 1, point.position[2]), new Vector3(0, -1, 0)).intersectObject(bowl)).toHaveLength(0)
      if (layout === 'single-hole') expect(new Raycaster(new Vector3(.1, 1, target.position[2]), new Vector3(0, -1, 0)).intersectObject(bowl).length).toBeGreaterThan(0)
    }
  }
})

test('placing a complete set replaces legacy occupants and switches the basin atomically; undo restores both', () => {
  const snapshot = useScene.getState(), restore = nodeRegistry._snapshot(), raf = globalThis.requestAnimationFrame, cancel = globalThis.cancelAnimationFrame
  globalThis.requestAnimationFrame = () => 0; globalThis.cancelAnimationFrame = () => {}
  try {
    registerNode(countertopBasinDefinition as unknown as AnyNodeDefinition); registerNode(tapDefinition as unknown as AnyNodeDefinition)
    const level = LevelNode.parse({}), basin = CountertopBasinNode.parse({ parentId: level.id, tapSlotCount: 3 })
    const old = TapNode.parse({ parentId: basin.id, slotId: 'tap-left', finish: 'brass' })
    const other = TapNode.parse({ parentId: basin.id, slotId: 'tap-right' })
    const nodes = nodesOf(level, { ...basin, children: [old.id, other.id] }, old, other)
    useScene.setState({ nodes: nodes as Record<AnyNodeId, AnyNode>, rootNodeIds: [level.id], readOnly: false, dirtyNodes: new Set() }); useScene.temporal.getState().clear()
    const pose = basinTapTarget(basin), candidate = { parentId: basin.id, slotId: 'tap-left', ...pose, levelPose: pose }
    const { placed, changes } = tapPlacementChanges(TapNode.parse({ presetId: 'tap-017' }), candidate, nodes)
    useScene.getState().applyNodeChanges(changes)
    expect(useScene.getState().nodes[old.id as AnyNodeId]).toBeUndefined()
    expect(useScene.getState().nodes[other.id as AnyNodeId]).toBeUndefined()
    expect(BasinNode.parse(useScene.getState().nodes[basin.id as AnyNodeId]).tapMountingLayout).toBe('three-hole')
    expect(useScene.getState().nodes[basin.id as AnyNodeId]!.children).toEqual([placed.id])
    useScene.temporal.getState().undo()
    expect(useScene.getState().nodes[placed.id as AnyNodeId]).toBeUndefined()
    expect(useScene.getState().nodes[old.id as AnyNodeId]).toBeDefined()
    expect(BasinNode.parse(useScene.getState().nodes[basin.id as AnyNodeId]).tapMountingLayout).toBe('single-hole')
  } finally { useScene.setState(snapshot); useScene.temporal.getState().clear(); restore(); globalThis.requestAnimationFrame = raf; globalThis.cancelAnimationFrame = cancel }
})

test('manual layout changes retain the tap identity and paint assignments while choosing a compatible set', () => {
  const basin = CountertopBasinNode.parse({}), tap = TapNode.parse({ parentId: basin.id, presetId: 'tap-009', slots: { body: 'scene-material:test' } })
  const changes = basinTapLayoutChanges(basin, 'three-hole', nodesOf(basin, tap)), replacement = TapNode.parse(changes.update.find(entry => String(entry.id) === tap.id)!.data)
  expect(replacement.id).toBe(tap.id); expect(replacement.presetId).toBe('tap-017'); expect(replacement.slots).toEqual(tap.slots)
  const three = BasinNode.parse({ ...basin, ...changes.update[0]!.data })
  const back = basinTapLayoutChanges(three, 'single-hole', nodesOf(three, replacement))
  expect(TapNode.parse(back.update[1]!.data).presetId).toBe('tap-001')
  expect(TapNode.parse(back.update[1]!.data).slots).toEqual(tap.slots)
})


test('supporting countertop holes follow the layout and switching to single restores the outer holes', () => {
  const host = FreestandingVanityNode.parse({ width: .9, depth: .6 }), basin = CountertopBasinNode.parse({ parentId: host.id, position: [0, host.height, 0], tapMountingLayout: 'three-hole' })
  const root = buildFreestandingVanityGeometry(host), top = root.getObjectByName('vanity-countertop') as Mesh
  top.updateMatrix(); const source = top.geometry.clone().applyMatrix4(top.matrix)
  const holes = cutVanityCountertop(source, host, [basin as unknown as AnyNode]), mesh = new Mesh(holes, top.material)
  const points = basinTapMountingPoints(basin).map(point => ({ ...point, position: [-point.position[0], point.position[1], -point.position[2]] }))
  const hits = (x: number, z: number) => new Raycaster(new Vector3(x, 2, z), new Vector3(0, -1, 0)).intersectObject(mesh)
  for (const point of points) expect(hits(point.position[0], point.position[2])).toHaveLength(0)
  mesh.geometry = cutVanityCountertop(source, host, [{ ...basin, tapMountingLayout: 'single-hole' } as unknown as AnyNode])
  expect(hits(points[0]!.position[0], points[0]!.position[2]).length).toBeGreaterThan(0)
  expect(hits(points[2]!.position[0], points[2]!.position[2]).length).toBeGreaterThan(0)
  expect(hits(0, points[1]!.position[2])).toHaveLength(0)
})
