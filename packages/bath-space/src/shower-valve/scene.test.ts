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
import { showerValveDefinition } from './definition'
import { showerControlDefinition } from '../shower-control/definition'
import { ShowerControlNode } from '../shower-control/schema'
import { ShowerValveNode } from './schema'
import { attachShowerValve } from './attachment'
test('valve replacement is one scene operation and undo restores the original compatible child', () => {
  const snapshot = useScene.getState(),
    restore = nodeRegistry._snapshot(),
    raf = globalThis.requestAnimationFrame,
    cancel = globalThis.cancelAnimationFrame
  globalThis.requestAnimationFrame = () => 0
  globalThis.cancelAnimationFrame = () => {}
  try {
    for (const d of [showerValveDefinition, showerControlDefinition])
      registerNode(d as unknown as AnyNodeDefinition)
    const level = LevelNode.parse({}),
      wall = WallNode.parse({ parentId: level.id, start: [0, 0], end: [3, 0], thickness: 0.15 }),
      trim = ShowerControlNode.parse({ parentId: wall.id, wallId: wall.id })
    useScene.setState({
      nodes: {
        [level.id]: { ...level, children: [wall.id] },
        [wall.id]: { ...wall, children: [trim.id] },
        [trim.id]: trim,
      } as Record<AnyNodeId, AnyNode>,
      rootNodeIds: [level.id],
      readOnly: false,
      dirtyNodes: new Set(),
    })
    useScene.temporal.getState().clear()
    const first = attachShowerValve(ShowerValveNode.parse({}), trim.id, useScene.getState().nodes)
    useScene.getState().applyNodeChanges(first.changes)
    const second = attachShowerValve(
      ShowerValveNode.parse({ serviceStops: true }),
      trim.id,
      useScene.getState().nodes,
    )
    useScene.getState().applyNodeChanges(second.changes)
    expect(useScene.getState().nodes[first.placed.id as AnyNodeId]).toBeUndefined()
    expect(useScene.getState().nodes[trim.id as AnyNodeId]!.children).toEqual([second.placed.id])
    useScene.temporal.getState().undo()
    expect(useScene.getState().nodes[trim.id as AnyNodeId]!.children).toEqual([first.placed.id])
    expect(useScene.getState().nodes[second.placed.id as AnyNodeId]).toBeUndefined()
    useScene.temporal.getState().redo()
    expect(useScene.getState().nodes[trim.id as AnyNodeId]!.children).toEqual([second.placed.id])
  } finally {
    useScene.setState(snapshot)
    useScene.temporal.getState().clear()
    restore()
    globalThis.requestAnimationFrame = raf
    globalThis.cancelAnimationFrame = cancel
  }
})
