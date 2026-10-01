import { expect, test } from 'bun:test'
import {
  useScene,
  nodeRegistry,
  registerNode,
  LevelNode,
  WallNode,
  type AnyNode,
  type AnyNodeId,
  type AnyNodeDefinition,
} from '@pascal-app/core'
import { showerAssemblyDefinition } from './definition'
import { assemblyPresetNode, showerAssemblyPresets } from './schema'
import { createAssemblyChanges } from './children'
import { showerHeadDefinition } from '../shower-head/definition'
import { handShowerDefinition } from '../hand-shower/definition'
import { showerHoseDefinition } from '../shower-hose/definition'
test('placing an assembled column creates real children in one undo step', () => {
  const snapshot = useScene.getState(),
    restore = nodeRegistry._snapshot(),
    raf = globalThis.requestAnimationFrame,
    cancel = globalThis.cancelAnimationFrame
  globalThis.requestAnimationFrame = () => 0
  globalThis.cancelAnimationFrame = () => {}
  try {
    for (const d of [
      showerAssemblyDefinition,
      showerHeadDefinition,
      handShowerDefinition,
      showerHoseDefinition,
    ])
      registerNode(d as unknown as AnyNodeDefinition)
    const level = LevelNode.parse({}),
      wall = WallNode.parse({ parentId: level.id, start: [0, 0], end: [4, 0] }),
      n = { ...assemblyPresetNode(showerAssemblyPresets[0]), parentId: wall.id, wallId: wall.id }
    useScene.setState({
      nodes: { [level.id]: { ...level, children: [wall.id] }, [wall.id]: wall } as Record<
        AnyNodeId,
        AnyNode
      >,
      rootNodeIds: [level.id],
      readOnly: false,
      dirtyNodes: new Set(),
    })
    useScene.temporal.getState().clear()
    const changes = createAssemblyChanges(n)
    useScene.getState().applyNodeChanges(changes)
    const root = useScene.getState().nodes[n.id as AnyNodeId]!
    expect(root.children).toHaveLength(3)
    expect(new Set(root.children).size).toBe(3)
    for (const id of root.children)
      expect(useScene.getState().nodes[id as AnyNodeId]!.parentId).toBe(n.id)
    expect(useScene.getState().nodes[wall.id as AnyNodeId]!.children).toContain(n.id)
    useScene.temporal.getState().undo()
    for (const c of changes.create) expect(useScene.getState().nodes[c.node.id]).toBeUndefined()
    useScene.temporal.getState().redo()
    expect(useScene.getState().nodes[n.id as AnyNodeId]!.children).toHaveLength(3)
  } finally {
    useScene.setState(snapshot)
    useScene.temporal.getState().clear()
    restore()
    globalThis.requestAnimationFrame = raf
    globalThis.cancelAnimationFrame = cancel
  }
})
