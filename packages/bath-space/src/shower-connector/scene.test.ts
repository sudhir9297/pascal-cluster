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
import { showerHeadDefinition } from '../shower-head/definition'
import { ShowerArmNode } from '../shower-arm/schema'
import { ShowerHeadNode } from '../shower-head/schema'
import { attachShowerHead } from '../shower-head/attachment'
import { ShowerConnectorNode, SHOWER_CONNECTOR } from './schema'
import { attachShowerConnector } from './attachment'
test('insertion and replacement preserve the head through atomic scene changes and undo/redo', () => {
  const snapshot = useScene.getState(),
    restore = nodeRegistry._snapshot(),
    raf = globalThis.requestAnimationFrame,
    cancel = globalThis.cancelAnimationFrame
  globalThis.requestAnimationFrame = () => 0
  globalThis.cancelAnimationFrame = () => {}
  try {
    registerNode(showerArmDefinition as unknown as AnyNodeDefinition)
    registerNode(showerHeadDefinition as unknown as AnyNodeDefinition)
    registerNode({
      kind: SHOWER_CONNECTOR,
      schemaVersion: 1,
      schema: ShowerConnectorNode,
      category: 'furnish',
      defaults: () => ({}),
    } as unknown as AnyNodeDefinition)
    const level = LevelNode.parse({}),
      wall = WallNode.parse({ parentId: level.id, start: [0, 0], end: [4, 0] }),
      arm = ShowerArmNode.parse({ parentId: wall.id, wallId: wall.id }),
      head = ShowerHeadNode.parse({ parentId: arm.id })
    useScene.setState({
      nodes: {
        [level.id]: { ...level, children: [wall.id] },
        [wall.id]: { ...wall, children: [arm.id] },
        [arm.id]: { ...arm, children: [head.id] },
        [head.id]: head,
      } as unknown as Record<AnyNodeId, AnyNode>,
      rootNodeIds: [level.id],
      readOnly: false,
      dirtyNodes: new Set(),
    })
    useScene.temporal.getState().clear()
    const first = attachShowerConnector(
      ShowerConnectorNode.parse({ style: 'elbow' }),
      arm.id,
      useScene.getState().nodes,
    )
    useScene.getState().applyNodeChanges(first.changes)
    expect(useScene.getState().nodes[head.id as AnyNodeId]!.parentId).toBe(first.placed.id)
    expect(
      (useScene.getState().nodes[first.placed.id as AnyNodeId] as unknown as ShowerConnectorNode)
        .children,
    ).toEqual([head.id])
    const second = attachShowerConnector(
      ShowerConnectorNode.parse({ style: 'extension' }),
      arm.id,
      useScene.getState().nodes,
    )
    useScene.getState().applyNodeChanges(second.changes)
    expect(useScene.getState().nodes[first.placed.id as AnyNodeId]).toBeUndefined()
    expect(useScene.getState().nodes[head.id as AnyNodeId]!.parentId).toBe(second.placed.id)
    useScene.temporal.getState().undo()
    expect(useScene.getState().nodes[head.id as AnyNodeId]!.parentId).toBe(first.placed.id)
    useScene.temporal.getState().redo()
    expect(useScene.getState().nodes[head.id as AnyNodeId]!.parentId).toBe(second.placed.id)
    expect(() =>
      attachShowerConnector(
        second.placed,
        second.placed.id,
        useScene.getState().nodes,
        second.placed.id,
      ),
    ).toThrow('cycle')
    const replacement = attachShowerHead(
      ShowerHeadNode.parse({ style: 'square-rain' }),
      arm.id,
      useScene.getState().nodes,
    )
    expect(replacement.placed.parentId).toBe(second.placed.id)
    useScene.getState().applyNodeChanges(replacement.changes)
    expect(useScene.getState().nodes[head.id as AnyNodeId]).toBeUndefined()
    expect(useScene.getState().nodes[second.placed.id as AnyNodeId]).toBeDefined()
  } finally {
    useScene.setState(snapshot)
    useScene.temporal.getState().clear()
    restore()
    globalThis.requestAnimationFrame = raf
    globalThis.cancelAnimationFrame = cancel
  }
})
