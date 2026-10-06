import { expect, test } from 'bun:test'
import { useScene, type AnyNode } from '@pascal-app/core'
import { PoolNode } from '../core/schema'
import { createPoolPluginNode } from './scene-nodes'
import { initializePoolOpeningSync, isAppearanceOnlyPoolChange } from './opening-system'
import { poolParametrics } from './parametrics'
import { syncAutomaticPoolFittings } from '../design/sync-pool-fittings'

test('pool appearance changes skip opening and fitting reconciliation', () => {
  const pool = PoolNode.parse({})
  expect(isAppearanceOnlyPoolChange(PoolNode.parse({ ...pool, copingStyle: 'rock' }) as unknown as AnyNode, pool as unknown as AnyNode)).toBe(true)
  expect(isAppearanceOnlyPoolChange(PoolNode.parse({ ...pool, interiorFinish: 'natural-pebble-aqua' }) as unknown as AnyNode, pool as unknown as AnyNode)).toBe(true)
  expect(isAppearanceOnlyPoolChange(PoolNode.parse({ ...pool, rain: 0.8, waterColor: '#123456' }) as unknown as AnyNode, pool as unknown as AnyNode)).toBe(true)
  expect(isAppearanceOnlyPoolChange(PoolNode.parse({ ...pool, copingWidth: 0.5 }) as unknown as AnyNode, pool as unknown as AnyNode)).toBe(false)
})

test('scene subscription reconciles resize and restored snapshots', () => {
  const before = useScene.getState()
  const history = useScene.temporal.getState()
  let stop = () => {}
  try {
    // Keep this test independent of the host's built-in AnyNode union. The
    // installed beta core currently throws on its duplicate default discriminator.
    useScene.setState({ nodes: {}, rootNodeIds: [], readOnly: false, applyNodeChanges: (changes) => {
      const nodes: Record<string, AnyNode> = { ...useScene.getState().nodes }
      for (const { id, data } of changes.update ?? []) nodes[id] = { ...nodes[id], ...data } as AnyNode
      for (const { node, parentId } of changes.create ?? []) {
        nodes[node.id] = node
        if (parentId && nodes[parentId]) {
          const parent = nodes[parentId]!
          nodes[parentId] = { ...parent, children: [...new Set([...('children' in parent ? parent.children : []), node.id])] } as AnyNode
        }
      }
      for (const id of changes.delete ?? []) {
        delete nodes[id]
        for (const [parentId, parent] of Object.entries(nodes)) {
          if ('children' in parent) nodes[parentId] = { ...parent, children: parent.children.filter((child) => child !== id) } as AnyNode
        }
      }
      useScene.setState({ nodes })
    } })
    stop = initializePoolOpeningSync()
    const pool = PoolNode.parse({})
    createPoolPluginNode(pool, '')
    const initial = PoolNode.parse((useScene.getState().nodes as Record<string, unknown>)[pool.id])
    expect(initial.children).toHaveLength(9)
    const initialNodes = useScene.getState().nodes
    const patch = { length: 20, width: 12 }
    const next = { ...initial, ...patch }
    useScene.getState().applyNodeChanges({ update: [{ id: pool.id as never, data: { ...patch, ...poolParametrics.derive!(next, patch) } as Partial<AnyNode> }] })
    const larger = PoolNode.parse((useScene.getState().nodes as Record<string, unknown>)[pool.id])
    expect(larger.children.length).toBe(initial.children.length)
    expect(syncAutomaticPoolFittings(useScene.getState().nodes)).toEqual({ create: [], update: [], delete: [] })
    const largerNodes = useScene.getState().nodes
    useScene.setState({ nodes: initialNodes })
    const restored = PoolNode.parse((useScene.getState().nodes as Record<string, unknown>)[pool.id])
    expect(restored.length).toBe(8)
    expect(restored.children).toHaveLength(9)
    useScene.setState({ nodes: largerNodes })
    expect(PoolNode.parse((useScene.getState().nodes as Record<string, unknown>)[pool.id]).children).toHaveLength(larger.children.length)
    const deletedIds = Object.values(useScene.getState().nodes)
      .filter(node => ['pool:skimmer', 'pool:drain'].includes(String(node.type))).map(node => node.id)
    useScene.getState().applyNodeChanges({ delete: deletedIds })
    for (const id of deletedIds) expect(useScene.getState().nodes[id]).toBeUndefined()
    const saved = JSON.parse(JSON.stringify(useScene.getState().nodes))
    stop()
    useScene.setState({ nodes: saved })
    stop = initializePoolOpeningSync()
    for (const id of deletedIds) expect(useScene.getState().nodes[id]).toBeUndefined()
  } finally {
    stop()
    useScene.setState(before)
    useScene.temporal.setState(history)
  }
})

test('targeted fitting synchronization ignores unchanged pools', async () => {
  const { createDefaultPoolAttachments } = await import('../design/default-pool-attachments')
  const first = PoolNode.parse({ automaticFittings: true }), second = PoolNode.parse({ automaticFittings: true })
  const children = [...createDefaultPoolAttachments(first), ...createDefaultPoolAttachments(second)]
  const patch = { length: 20, width: 12 }
  const larger = { ...first, ...patch, ...poolParametrics.derive!({ ...first, ...patch }, patch) }
  // Both pools have moved, but this pass is explicitly scoped to the first.
  const movedSecond = { ...second, depth: 3 }
  const nodes = Object.fromEntries([larger, movedSecond, ...children].map(n => [n.id, n]))
  const changes = syncAutomaticPoolFittings(nodes, new Set([first.id]))
  expect(changes.update.length).toBeGreaterThan(0)
  expect(changes.update.every(u => (nodes[u.id] as { poolId?: string }).poolId === first.id)).toBe(true)
})

test('sync diff includes old and new levels and skips unrelated scene edits', async () => {
  const { collectPoolSyncChanges } = await import('./opening-system')
  const pool = PoolNode.parse({ parentId: 'level_old' }) as unknown as AnyNode
  const next = { ...pool, parentId: 'level_new' } as AnyNode
  const changes = collectPoolSyncChanges({ [pool.id]: next }, { [pool.id]: pool })
  expect([...changes.poolIds]).toEqual([pool.id])
  expect(changes.levelIds.has('level_old')).toBe(true)
  expect(changes.levelIds.has('level_new')).toBe(true)
  const appearance = { ...pool, waterColor: '#000000' } as unknown as AnyNode
  expect(collectPoolSyncChanges({ [pool.id]: appearance }, { [pool.id]: pool }).relevant).toBe(false)
})
