import { expect, test } from 'bun:test'
import {
  emitter,
  useScene,
  type AnyNodeId,
  type GridEvent,
} from '@pascal-app/core'
import { cancelActiveTool, useEditor } from '@pascal-app/editor'
import { acquireDividerSession } from './session'
import { SHOWER_DIVIDER } from './schema'

// Exercise the actual event subscription shared by plan and canvas, without a renderer.
test('split-view leases share one draft, create once, consume cancellation and release listeners', () => {
  const previousWindow = globalThis.window
  const target = new EventTarget()
  globalThis.window = target as unknown as Window & typeof globalThis
  const previousScene = useScene.getState()
  const previousEditor = useEditor.getState()
  const created: unknown[] = []
  useScene.setState({
    nodes: {},
    readOnly: false,
    applyNodeChanges: (changes) => {
      created.push(changes)
    },
  })
  useEditor.setState({ tool: SHOWER_DIVIDER, getContinuation: () => 'room' })
  const event = (x: number, z: number, detail = 1): GridEvent => ({
    position: [x, 1.5, z],
    localPosition: [x, 1.5, z],
    nativeEvent: {
      button: 0,
      detail,
      altKey: true,
    } as GridEvent['nativeEvent'],
  })
  const plan = acquireDividerSession('level_test' as AnyNodeId)
  const canvas = acquireDividerSession('level_test' as AnyNodeId)
  try {
    expect(plan.session).toBe(canvas.session)
    emitter.emit('grid:click', event(0, 0))
    emitter.emit('grid:move', event(2, 0))
    expect(canvas.session.getSnapshot().segments[0]!.width).toBe(2)
    const unchanged = canvas.session.getSnapshot()
    emitter.emit('grid:move', event(2, 0))
    expect(canvas.session.getSnapshot()).toBe(unchanged)
    expect(created).toHaveLength(0)
    emitter.emit('grid:click', event(2, 0))
    expect(created).toHaveLength(1)
    expect(
      (created[0] as { create: { node: { position: number[] } }[] }).create[0]!
        .node.position[1],
    ).toBe(0)
    expect(canvas.session.getSnapshot().elevation).toBe(0)
    expect(plan.session.getSnapshot().start).toEqual([2, 0])
    expect(cancelActiveTool()).toBe(true)
    expect(plan.session.getSnapshot().start).toBeNull()
    // Unmounting only one view must leave the other view's subscription alive.
    plan.release()
    emitter.emit('grid:click', event(3, 0))
    emitter.emit('grid:click', event(4, 0))
    expect(created).toHaveLength(2)
    canvas.release()
    emitter.emit('grid:click', event(5, 0))
    expect(created).toHaveLength(2)
  } finally {
    plan.release()
    canvas.release()
    useScene.setState(previousScene)
    useEditor.setState(previousEditor)
    globalThis.window = previousWindow
  }
})
