import { expect, test } from 'bun:test'
import { LevelNode, type AnyNode, type AnyNodeId, useScene, nodeRegistry, registerNode, type AnyNodeDefinition, sceneRegistry, useLiveNodeOverrides } from '@pascal-app/core'
import { Group, Matrix4, Ray, Vector3 } from 'three'
import { FreestandingVanityNode } from '../freestanding-vanity/schema'
import { freestandingVanityDefinition } from '../freestanding-vanity/definition'
import { buildFreestandingVanityGeometry } from '../freestanding-vanity/geometry'
import { CountertopBasinNode, DropInBasinNode, UndermountBasinNode, SemiRecessedBasinNode, type BasinNode } from './schema'
import { basinFloorplanMove } from './floorplan'
import { countertopBasinDefinition } from './definition'
import { buildCountertopBasinGeometry } from './geometry'
import { InsetBasinCutCache } from './inset-cut'
import { basinLevelPose, vanityFrontZ } from './attachment'
import { basinMoveCandidate, basinMoveSurface } from './move-placement'

function fixture(schema = DropInBasinNode) {
  const level = LevelNode.parse({}), host = FreestandingVanityNode.parse({ parentId: level.id, width: 1.2, depth: 0.7 })
  const other = FreestandingVanityNode.parse({ parentId: level.id, width: 1.2, depth: 0.7, height: 1, position: [2, 0.2, 0], rotation: Math.PI / 2 })
  const basin = schema.parse({ parentId: host.id, position: [0, host.height, 0] })
  const root = new Group(), a = buildFreestandingVanityGeometry(host), b = buildFreestandingVanityGeometry(other), own = buildCountertopBasinGeometry(basin)
  b.position.fromArray(other.position); b.rotation.y = other.rotation
  a.add(own); own.position.fromArray(basin.position); root.add(a, b)
  const nodes = { [level.id]: level, [host.id]: host, [other.id]: other, [basin.id]: basin } as unknown as Record<string, AnyNode>
  const roots = new Map([[host.id, a], [other.id, b], [basin.id, own]])
  return { level, host, other, basin, root, a, b, own, nodes, roots }
}

test('moving through its own CSG hole still resolves the countertop rather than the cabinet below', () => {
  const f = fixture(), cuts = new InsetBasinCutCache()
  cuts.beginFrame(); cuts.sync(f.a, f.host, [f.basin] as unknown as AnyNode[]); cuts.endFrame()
  const hit = basinMoveSurface(new Ray(new Vector3(0, 3, 0), new Vector3(0, -1, 0)), f.root, new Matrix4(), f.basin, f.roots, f.nodes, [f.own])!
  expect(hit.surface?.name).toBe('vanity-countertop')
  expect(hit.position[1]).toBeCloseTo(f.host.height)
  expect(basinMoveCandidate(f.basin, hit, f.level.id, f.roots, f.nodes).placed.parentId).toBe(f.host.id)
  cuts.dispose()
})

test('all basin moves transfer onto a rotated vanity at its actual elevation and detach to ground', () => {
  for (const schema of [CountertopBasinNode, DropInBasinNode, UndermountBasinNode, SemiRecessedBasinNode]) {
    const f = fixture(), basin = schema.parse({ ...f.basin, id: undefined, type: undefined })
    const hit = basinMoveSurface(new Ray(new Vector3(2, 4, 0), new Vector3(0, -1, 0)), f.root, new Matrix4(), basin, f.roots, f.nodes, [f.own])!
    const candidate = basinMoveCandidate(basin, hit, f.level.id, f.roots, f.nodes)
    expect(candidate.placed.parentId).toBe(f.other.id)
    expect(basinLevelPose({ ...basin, ...candidate.placed } as BasinNode, f.nodes)).toEqual({ position: candidate.preview.position, rotation: candidate.preview.rotation })
    const mount = basin.type === 'bath-space:undermount-basin' ? f.other.height - f.other.countertopThickness : f.other.height
    expect(candidate.placed.position[1]).toBeCloseTo(mount)
    if (basin.type === 'bath-space:semi-recessed-basin') expect(candidate.placed.position[2]).toBeCloseTo(vanityFrontZ(f.other) + basin.depth / 2 - basin.frontProjection)
    const groundHit = basinMoveSurface(new Ray(new Vector3(5.13, 4, 0), new Vector3(0, -1, 0)), f.root, new Matrix4(), basin, f.roots, f.nodes, [f.own], 0.5)!
    const free = basinMoveCandidate(basin, groundHit, f.level.id, f.roots, f.nodes).placed
    expect(free.parentId).toBe(f.level.id)
    expect(free.position[0]).toBe(5)
    const mesh = buildCountertopBasinGeometry({ ...basin, ...free } as BasinNode)
    mesh.position.fromArray(free.position)
    // Detached inset basins rest on the ground instead of sinking beneath it.
    mesh.updateMatrixWorld(true)
    const bowl = mesh.getObjectByName('basin-bowl')!
    expect(bowl.getWorldPosition(new Vector3()).y).toBeCloseTo(0)
  }
})

test('moving keeps identity and child lists, and one undo restores the old host', () => {
  const saved = useScene.getState(), restore = nodeRegistry._snapshot(), raf = globalThis.requestAnimationFrame, cancel = globalThis.cancelAnimationFrame
  globalThis.requestAnimationFrame = () => 0; globalThis.cancelAnimationFrame = () => {}
  try {
    registerNode(freestandingVanityDefinition as unknown as AnyNodeDefinition)
    registerNode(countertopBasinDefinition as unknown as AnyNodeDefinition)
    const f = fixture(), basin = CountertopBasinNode.parse({ ...f.basin, id: undefined, type: undefined })
    useScene.setState({ nodes: f.nodes as Record<AnyNodeId, AnyNode>, rootNodeIds: [f.level.id], readOnly: false, dirtyNodes: new Set() })
    useScene.getState().createNode(basin as AnyNode, f.host.id as AnyNodeId)
    useScene.temporal.getState().clear()
    const hit = basinMoveSurface(new Ray(new Vector3(2, 4, 0), new Vector3(0, -1, 0)), f.root, new Matrix4(), basin, f.roots, f.nodes, [f.own])!
    const moved = basinMoveCandidate(basin, hit, f.level.id, f.roots, f.nodes).placed
    useScene.getState().updateNode(basin.id as AnyNodeId, moved as Partial<AnyNode>)
    expect(useScene.getState().nodes[basin.id as AnyNodeId]!.parentId).toBe(f.other.id)
    expect((useScene.getState().nodes[f.other.id as AnyNodeId] as unknown as {children:string[]}).children).toContain(basin.id)
    expect((useScene.getState().nodes[f.host.id as AnyNodeId] as unknown as {children:string[]}).children).not.toContain(basin.id)
    useScene.temporal.getState().undo()
    expect(useScene.getState().nodes[basin.id as AnyNodeId]!.parentId).toBe(f.host.id)
  } finally { useScene.setState(saved); useScene.temporal.getState().clear(); restore(); globalThis.requestAnimationFrame = raf; globalThis.cancelAnimationFrame = cancel }
})

 test('plan dragging uses surface placement and can move an existing basin between hosts', () => {
  const saved = useScene.getState(), f = fixture(), savedRoots = new Map(sceneRegistry.nodes)
  const raf = globalThis.requestAnimationFrame, cancel = globalThis.cancelAnimationFrame
  globalThis.requestAnimationFrame = () => 0; globalThis.cancelAnimationFrame = () => {}
  try {
    useScene.setState({ nodes: f.nodes as Record<AnyNodeId, AnyNode>, rootNodeIds: [f.level.id], readOnly: false, dirtyNodes: new Set() })
    sceneRegistry.nodes.set(f.level.id, f.root)
    for (const [id, root] of f.roots) sceneRegistry.nodes.set(id, root)
    const session = basinFloorplanMove({ node: f.basin, nodes: useScene.getState().nodes })
    const modifiers = { shiftKey: false, ctrlKey: false, metaKey: false, altKey: false }
    session.apply({ planPoint: [0, 0], modifiers })
    session.apply({ planPoint: [2, 0], modifiers })
    expect(session.canCommit()).toBe(true)
    expect(useScene.getState().nodes[f.basin.id as AnyNodeId]!.parentId).toBe(f.host.id)
    session.commit!()
    const moved = useScene.getState().nodes[f.basin.id as AnyNodeId]!
    expect(moved.parentId).toBe(f.other.id)
    expect((moved as unknown as BasinNode).position[1]).toBeCloseTo(f.other.height)
  } finally {
    useLiveNodeOverrides.getState().clearFields(f.basin.id, ['position', 'parentId', 'rotation'])
    sceneRegistry.nodes.clear(); for (const [id, root] of savedRoots) sceneRegistry.nodes.set(id, root)
    useScene.setState(saved); useScene.temporal.getState().clear()
    globalThis.requestAnimationFrame = raf; globalThis.cancelAnimationFrame = cancel
  }
})
