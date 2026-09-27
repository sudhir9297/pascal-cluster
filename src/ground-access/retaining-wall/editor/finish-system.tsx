'use client'
import { type AnyNode, type AnyNodeId, useScene } from '@pascal-app/core'
import { useEditor } from '@pascal-app/editor'
import { useEffect } from 'react'
import { RetainingWallNode, RETAININGWALL_KIND } from '../domain/schema'

const isRetainingWall = (node: AnyNode | undefined) =>
  node?.type === 'wall' && node.metadata?.landscapeRetainingWall === true

export function createRetainingWallFinishSync() {
  let syncing = false
  let queued = false
  let disposed = false
  let firstPrevious: ReturnType<typeof useScene.getState> | undefined
  const sync = (current: ReturnType<typeof useScene.getState>, previous?: ReturnType<typeof useScene.getState>) => {
    if (syncing || (previous && current.nodes === previous.nodes)) return
    syncing = true
    const tracking = useScene.temporal.getState().isTracking
    try {
      if (tracking) useScene.temporal.getState().pause()
      const levelSurfaceChanged = previous && Object.values(current.nodes).some((node) =>
        ['site', 'level', 'slab', 'ceiling'].includes(node.type as string) &&
        previous.nodes[node.id as AnyNodeId] !== node)
      const finishes = Object.values(current.nodes).filter((node) =>
        (node.type as string) === RETAININGWALL_KIND && Boolean((node as unknown as RetainingWallNode).hostWallId)) as unknown as RetainingWallNode[]
      const changedLevels = new Set<string>()
      if (previous) {
        for (const node of [...Object.values(previous.nodes), ...Object.values(current.nodes)]) {
          if (!isRetainingWall(node) && (node.type as string) !== RETAININGWALL_KIND) continue
          if (previous.nodes[node.id as AnyNodeId] === current.nodes[node.id as AnyNodeId]) continue
          if (node.parentId) changedLevels.add(node.parentId)
        }
      }
      const byWall = new Set(finishes.map((finish) => finish.hostWallId))
      for (const node of Object.values(current.nodes)) {
        if (!isRetainingWall(node) || !node.parentId || byWall.has(node.id)) continue
        const finish = RetainingWallNode.parse({
          ...useEditor.getState().toolDefaults[RETAININGWALL_KIND],
          hostWallId: node.id,
          parentId: node.parentId,
          position: [0, 0, 0],
          name: 'Retaining wall finish',
        })
        useScene.getState().createNode(finish as unknown as AnyNode, node.parentId as AnyNodeId)
      }
      for (const finish of finishes) {
        const host = current.nodes[finish.hostWallId as AnyNodeId]
        if (!isRetainingWall(host)) {
          useScene.getState().deleteNode(finish.id as AnyNodeId)
        } else if (previous && (changedLevels.has(host?.parentId ?? '') || levelSurfaceChanged)) {
          useScene.getState().markDirty(finish.id as AnyNodeId)
        }
      }
    } finally {
      if (tracking) useScene.temporal.getState().resume()
      syncing = false
    }
  }
  return {
    schedule(previous?: ReturnType<typeof useScene.getState>) {
      if (disposed) return
      firstPrevious ??= previous
      if (queued) return
      queued = true
      queueMicrotask(() => {
        queued = false
        if (disposed) return
        const before = firstPrevious
        firstPrevious = undefined
        sync(useScene.getState(), before)
      })
    },
    dispose() { disposed = true },
  }
}

export default function RetainingWallFinishSystem() {
  useEffect(() => {
    const sync = createRetainingWallFinishSync()
    sync.schedule()
    const unsubscribe = useScene.subscribe((current, previous) => sync.schedule(previous))
    return () => { unsubscribe(); sync.dispose() }
  }, [])
  return null
}
