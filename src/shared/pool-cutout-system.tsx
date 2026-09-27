'use client'

import { type AnyNodeId, useScene } from '@pascal-app/core'
import { useEffect } from 'react'

const CUTOUT_SURFACE_KINDS = new Set([
  'landscape:ground-area', 'landscape:pathway', 'landscape:patio',
  'landscape:deck', 'landscape:concrete-slab', 'landscape:landing',
])

/** Rebuilds landscape geometry when a pool changes its opening footprint. */
export function PoolCutoutDirtySystem() {
  useEffect(() => useScene.subscribe((current, previous) => {
    if (current.nodes === previous.nodes) return
    const ids = new Set([...Object.keys(current.nodes), ...Object.keys(previous.nodes)])
    const changedPools = [...ids].flatMap((id) => {
      const before = previous.nodes[id as AnyNodeId]
      const after = current.nodes[id as AnyNodeId]
      if (before === after) return []
      return [before, after].filter((node) => (node?.type as string | undefined) === 'pool:pool')
    })
    if (!changedPools.length) return
    const affectedLevels = new Set(changedPools.map((node) => (node as unknown as { parentId?: string | null } | undefined)?.parentId).filter(Boolean))
    for (const node of Object.values(current.nodes)) {
      if (CUTOUT_SURFACE_KINDS.has(node.type) && affectedLevels.has(node.parentId))
        current.markDirty(node.id)
    }
  }), [])
  return null
}

export default function LandscapePoolCutoutSystem() {
  return <PoolCutoutDirtySystem />
}
