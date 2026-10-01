import { expect, test } from 'bun:test'
import {
  LevelNode, WallNode, createSceneApi, nodeRegistry, registerNode, useScene,
  type AnyNode, type AnyNodeId, type AnyNodeDefinition, type GeometryContext,
} from '@pascal-app/core'
import { Group, Mesh, BoxGeometry, MeshBasicMaterial } from 'three'
import { CountertopBasinNode } from './schema'
import { basinAttachPose, basinDetachPatch, basinLevelPose, basinParentFrame, vanityFrame, vanityLocalToLevel, vanityOwnsSurface } from './attachment'
import { FreestandingVanityNode, CornerVanityNode, WallMountedVanityNode } from '../freestanding-vanity/schema'
import { freestandingVanityDefinition } from '../freestanding-vanity/definition'
import { countertopBasinDefinition } from './definition'
import { basinFloorplan, basinFloorplanMove } from './floorplan'

function fixtures() {
  const level = LevelNode.parse({})
  const vanity = FreestandingVanityNode.parse({ parentId: level.id, position: [2, 0.2, 3], rotation: Math.PI / 3 })
  const nodes = { [level.id]: level, [vanity.id]: vanity } as unknown as Record<AnyNodeId, AnyNode>
  const world = vanityLocalToLevel(vanity, [0.1, vanity.height, -0.05], nodes)
  const attached = basinAttachPose(world, 0.4, vanity as unknown as AnyNode, nodes)
  const basin = CountertopBasinNode.parse(attached)
  return { level, vanity, nodes, world, basin }
}

function closeVec(actual: number[], expected: number[]) { expected.forEach((value, i) => expect(actual[i]).toBeCloseTo(value, 6)) }

test('attachment keeps the world pose and moving or rotating the vanity carries the basin', () => {
  const { vanity, nodes, world, basin } = fixtures()
  expect(basin.parentId).toBe(vanity.id)
  closeVec(basin.position, [0.1, vanity.height, -0.05])
  closeVec(basinLevelPose(basin, nodes).position, world)
  expect(basinLevelPose(basin, nodes).rotation).toBeCloseTo(0.4)
  const moved = { ...vanity, position: [4, 0.5, 5] as [number, number, number], rotation: -0.6 }
  nodes[vanity.id as AnyNodeId] = moved as unknown as AnyNode
  closeVec(basinLevelPose(basin, nodes).position, vanityLocalToLevel(moved, basin.position, nodes))
  expect(basinLevelPose(basin, nodes).rotation).toBeCloseTo(basin.rotation - 0.6)
})

test('a move within the top keeps the relationship; a move outside detaches without jumping or turning', () => {
  const { level, vanity, nodes, basin } = fixtures()
  expect(basinDetachPatch(basin, nodes)).toBeNull()
  const outside = { ...basin, position: [vanity.width + 0.2, vanity.height, 0] as [number, number, number] }
  const patch = basinDetachPatch(outside, nodes)!
  expect(patch.parentId).toBe(level.id)
  closeVec(patch.position, basinLevelPose(outside, nodes).position)
  expect(patch.rotation).toBeCloseTo(basinLevelPose(outside, nodes).rotation)
  const raised = { ...basin, position: [0, vanity.height + 0.2, 0] as [number, number, number] }
  expect(basinDetachPatch(raised, nodes)?.parentId).toBe(level.id)
})

test('corner vanity containment uses its actual polygon', () => {
  const { level } = fixtures()
  const vanity = CornerVanityNode.parse({ parentId: level.id })
  const nodes = { [level.id]: level, [vanity.id]: vanity } as unknown as Record<AnyNodeId, AnyNode>
  const attached = CountertopBasinNode.parse({ parentId: vanity.id, position: [0, vanity.height, 0] })
  expect(basinDetachPatch(attached, nodes)).toBeNull()
  expect(basinDetachPatch({ ...attached, position: [0.4, vanity.height, 0.4] }, nodes)?.parentId).toBe(level.id)
})

test('wall-mounted attachment composes both wall and vanity transforms', () => {
  const level = LevelNode.parse({}), wall = WallNode.parse({ parentId: level.id, start: [2, 3], end: [2, 7] })
  const vanity = WallMountedVanityNode.parse({ parentId: wall.id, wallId: wall.id, position: [2, 0.1, 0.29], rotation: Math.PI })
  const nodes = { [level.id]: level, [wall.id]: wall, [vanity.id]: vanity } as unknown as Record<AnyNodeId, AnyNode>
  const position = vanityLocalToLevel(vanity, [0, vanity.height, 0], nodes)
  const basin = CountertopBasinNode.parse(basinAttachPose(position, 0.3, vanity as unknown as AnyNode, nodes))
  closeVec(basinLevelPose(basin, nodes).position, position)
  expect(basinLevelPose(basin, nodes).rotation).toBeCloseTo(0.3)
  expect(basinDetachPatch({ ...basin, position: [1, vanity.height, 0] }, nodes)?.parentId).toBe(level.id)
  expect(vanityFrame(vanity, nodes).rotation).toBeCloseTo(Math.PI / 2)
})

test('ray hit selects its vanity parent and does not attach when another child was hit', () => {
  const { vanity, nodes, basin } = fixtures()
  const root = new Group(), mesh = new Mesh(new BoxGeometry(), new MeshBasicMaterial())
  root.add(mesh)
  const roots = new Map<string, Group>([[vanity.id, root]])
  expect(vanityOwnsSurface(mesh, roots, nodes)?.id).toBe(vanity.id)
  const child = new Group(), childMesh = mesh.clone()
  root.add(child); child.add(childMesh)
  roots.set(basin.id, child)
  nodes[basin.id as AnyNodeId] = basin as unknown as AnyNode
  expect(vanityOwnsSurface(childMesh, roots, nodes)).toBeNull()
  mesh.geometry.dispose(); (mesh.material as MeshBasicMaterial).dispose()
})

test('parent-frame movement converts the cursor and preserves independent basin selection', () => {
  const { vanity, nodes, world, basin } = fixtures()
  const parent = vanity as unknown as AnyNode
  expect(basinParentFrame.independent).toBe(true)
  closeVec(basinParentFrame.localToPlan(parent, basin.position, nodes), world)
  closeVec(basinParentFrame.planToLocal(parent, world[0], basin.position[1], world[2], nodes), basin.position)
})

test('committing 3D and 2D moves updates both child lists, and undo restores attachment', () => {
  const snapshot = useScene.getState(), restoreRegistry = nodeRegistry._snapshot()
  const raf = globalThis.requestAnimationFrame, cancelRaf = globalThis.cancelAnimationFrame
  globalThis.requestAnimationFrame = () => 0
  globalThis.cancelAnimationFrame = () => {}
  try {
    registerNode(freestandingVanityDefinition as unknown as AnyNodeDefinition)
    registerNode(countertopBasinDefinition as unknown as AnyNodeDefinition)
    const { level, vanity, nodes, basin } = fixtures()
    const id = basin.id as AnyNodeId
    useScene.setState({ nodes: { ...nodes, [level.id]: { ...level, children: [vanity.id] } as unknown as AnyNode }, rootNodeIds: [level.id], readOnly: false, dirtyNodes: new Set() })
    useScene.getState().createNode(basin as unknown as AnyNode, vanity.id as AnyNodeId)
    expect((useScene.getState().nodes[vanity.id as AnyNodeId] as unknown as { children: string[] }).children).toContain(basin.id)
    const outside = CountertopBasinNode.parse({ ...basin, position: [1, vanity.height, 0] })
    useScene.getState().updateNode(id, { position: outside.position } as Partial<AnyNode>)
    useScene.temporal.getState().clear()
    basinParentFrame.onCommit!(outside as unknown as AnyNode, vanity as unknown as AnyNode, createSceneApi(useScene))
    expect(useScene.getState().nodes[id]!.parentId).toBe(level.id)
    expect((useScene.getState().nodes[vanity.id as AnyNodeId] as unknown as { children: string[] }).children).not.toContain(basin.id)
    expect((useScene.getState().nodes[level.id] as unknown as { children: string[] }).children).toContain(basin.id)
    useScene.temporal.getState().undo()
    expect(useScene.getState().nodes[id]!.parentId).toBe(vanity.id)
    // Return inside the top and check the kind-owned plan-view move session.
    useScene.getState().updateNode(id, { position: basin.position } as Partial<AnyNode>)
    const session = basinFloorplanMove({ node: basin, nodes: useScene.getState().nodes })
    session.apply({ planPoint: [0, 0], modifiers: { shiftKey: false, ctrlKey: false, metaKey: false, altKey: false } })
    session.apply({ planPoint: [3, 0], modifiers: { shiftKey: false, ctrlKey: false, metaKey: false, altKey: false } })
    expect(session.canCommit()).toBe(true)
    session.commit!()
    expect(useScene.getState().nodes[id]!.parentId).toBe(level.id)
    const current = CountertopBasinNode.parse(useScene.getState().nodes[id])
    expect(current.position[0]).toBeGreaterThan(basinLevelPose(basin, nodes).position[0] + 2)
    const ctx = { resolve: (nodeId: AnyNodeId) => useScene.getState().nodes[nodeId] } as GeometryContext
    const outline = basinFloorplan(current, ctx)
    expect(outline.points).toHaveLength(96)
  } finally {
    useScene.setState(snapshot)
    useScene.temporal.getState().clear()
    restoreRegistry()
    globalThis.requestAnimationFrame = raf
    globalThis.cancelAnimationFrame = cancelRaf
  }
})
