import { expect, test } from 'bun:test'
import {
  LevelNode,
  WallNode,
  nodeRegistry,
  registerNode,
  useScene,
  type AnyNode,
  type AnyNodeDefinition,
  type AnyNodeId,
} from '@pascal-app/core'
import { showerMountDefinition } from '../shower-mount/definition'
import { ShowerMountNode } from '../shower-mount/schema'
import { handShowerDefinition } from './definition'
import { HandShowerNode } from './schema'
import { attachHandShower } from './attachment'
import { ShowerHoseNode } from '../shower-hose/schema'
import { showerHoseDefinition } from '../shower-hose/definition'

test('handset replacement, host transfer, undo and redo preserve the scene hierarchy', () => {
  const snapshot = useScene.getState(),
    restore = nodeRegistry._snapshot(),
    raf = globalThis.requestAnimationFrame,
    cancel = globalThis.cancelAnimationFrame
  globalThis.requestAnimationFrame = () => 0
  globalThis.cancelAnimationFrame = () => {}
  try {
    registerNode(showerMountDefinition as unknown as AnyNodeDefinition)
    registerNode(handShowerDefinition as unknown as AnyNodeDefinition)
    registerNode(showerHoseDefinition as unknown as AnyNodeDefinition)
    const level = LevelNode.parse({}),
      wall = WallNode.parse({ parentId: level.id, start: [0, 0], end: [3, 0] }),
      first = ShowerMountNode.parse({ parentId: wall.id, wallId: wall.id }),
      second = ShowerMountNode.parse({ parentId: wall.id, wallId: wall.id, style: 'square-rail' }),
      old = HandShowerNode.parse({ parentId: first.id })
    const hose = ShowerHoseNode.parse({ parentId: first.id, targetId: old.id })
    const nodes = Object.fromEntries(
      [
        { ...level, children: [wall.id] },
        { ...wall, children: [first.id, second.id] },
        { ...first, children: [old.id] },
        second,
        old,
        hose,
      ].map((n) => [n.id, n]),
    ) as Record<AnyNodeId, AnyNode>
    useScene.setState({ nodes, rootNodeIds: [level.id], readOnly: false, dirtyNodes: new Set() })
    useScene.temporal.getState().clear()
    const replacement = attachHandShower(
      HandShowerNode.parse({ style: 'square-wand' }),
      first.id,
      nodes,
    )
    useScene.getState().applyNodeChanges(replacement.changes)
    expect(
      ShowerHoseNode.parse(useScene.getState().nodes[hose.id as unknown as AnyNodeId]).targetId,
    ).toBe(replacement.placed.id)
    expect(useScene.getState().nodes[old.id as AnyNodeId]).toBeUndefined()
    expect(useScene.getState().nodes[first.id as AnyNodeId]!.children).toEqual([
      replacement.placed.id,
    ])
    const move = attachHandShower(
      replacement.placed,
      second.id,
      useScene.getState().nodes,
      replacement.placed.id,
    )
    useScene.getState().applyNodeChanges(move.changes)
    expect(useScene.getState().nodes[first.id as AnyNodeId]!.children).toEqual([])
    expect(useScene.getState().nodes[second.id as AnyNodeId]!.children).toEqual([
      replacement.placed.id,
    ])
    useScene.temporal.getState().undo()
    expect(useScene.getState().nodes[first.id as AnyNodeId]!.children).toEqual([
      replacement.placed.id,
    ])
    useScene.temporal.getState().undo()
    expect(useScene.getState().nodes[first.id as AnyNodeId]!.children).toEqual([old.id])
    expect(
      ShowerHoseNode.parse(useScene.getState().nodes[hose.id as unknown as AnyNodeId]).targetId,
    ).toBe(old.id)
    useScene.temporal.getState().redo()
    expect(useScene.getState().nodes[old.id as AnyNodeId]).toBeUndefined()
    expect(useScene.getState().nodes[first.id as AnyNodeId]!.children).toEqual([
      replacement.placed.id,
    ])
  } finally {
    useScene.setState(snapshot)
    useScene.temporal.getState().clear()
    restore()
    globalThis.requestAnimationFrame = raf
    globalThis.cancelAnimationFrame = cancel
  }
})
