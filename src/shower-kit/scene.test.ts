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
import { showerArmDefinition } from '../shower-arm/definition'
import { showerMountDefinition } from '../shower-mount/definition'
import { showerControlDefinition } from '../shower-control/definition'
import { kitAnchor, showerKitPresets, createKitChanges } from './bundle'
import { showerArmPlacement } from '../shower-arm/placement'
import { showerHeadDefinition } from '../shower-head/definition'
import { handShowerDefinition } from '../hand-shower/definition'
import { showerHoseDefinition } from '../shower-hose/definition'
test('placing a complete shower kit creates all real parts in one undo step', () => {
  const snapshot = useScene.getState(),
    restore = nodeRegistry._snapshot(),
    raf = globalThis.requestAnimationFrame,
    cancel = globalThis.cancelAnimationFrame
  globalThis.requestAnimationFrame = () => 0
  globalThis.cancelAnimationFrame = () => {}
  try {
    for (const d of [
      showerArmDefinition,
      showerMountDefinition,
      showerControlDefinition,
      showerHeadDefinition,
      handShowerDefinition,
      showerHoseDefinition,
    ])
      registerNode(d as unknown as AnyNodeDefinition)
    const level = LevelNode.parse({}),
      wall = WallNode.parse({ parentId: level.id, start: [0, 0], end: [4, 0] }),
      anchor = kitAnchor(showerKitPresets[0]),
      n = { ...anchor, ...showerArmPlacement(anchor, wall, 1, 'front')! }
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
    const changes = createKitChanges(showerKitPresets[0], n, useScene.getState().nodes)!
    useScene.getState().applyNodeChanges(changes)
    const root = useScene.getState().nodes[n.id as AnyNodeId]!
    expect(root.children).toHaveLength(1)
    expect(changes.create).toHaveLength(6)
    for (const id of root.children)
      expect(useScene.getState().nodes[id as AnyNodeId]!.parentId).toBe(n.id)
    expect(useScene.getState().nodes[wall.id as AnyNodeId]!.children).toContain(n.id)
    useScene.temporal.getState().undo()
    for (const c of changes.create) expect(useScene.getState().nodes[c.node.id]).toBeUndefined()
    useScene.temporal.getState().redo()
    expect(useScene.getState().nodes[n.id as AnyNodeId]!.children).toHaveLength(1)
  } finally {
    useScene.setState(snapshot)
    useScene.temporal.getState().clear()
    restore()
    globalThis.requestAnimationFrame = raf
    globalThis.cancelAnimationFrame = cancel
  }
})
