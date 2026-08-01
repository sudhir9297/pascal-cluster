import { type AnyNodeId, useScene } from '@pascal-app/core'

/** Node kinds intentionally removed from the environment catalog. */
export const REMOVED_ENVIRONMENT_NODE_TYPES = ['environment:in-ground-uplight'] as const

let purging = false

function purgeRemovedEnvironmentNodes(): void {
  if (purging) return
  const state = useScene.getState()
  const removedIds = Object.values(state.nodes)
    .filter((node) => REMOVED_ENVIRONMENT_NODE_TYPES.includes(node.type as (typeof REMOVED_ENVIRONMENT_NODE_TYPES)[number]))
    .map((node) => node.id as AnyNodeId)
  const utilityPoleIds = new Set(
    Object.values(state.nodes)
      .filter((node) => (node.type as string) === 'environment:utility-pole')
      .map((node) => node.id as string),
  )
  const orphanedWireIds = Object.values(state.nodes)
    .filter((node) => {
      if ((node.type as string) !== 'environment:utility-wire-span') return false
      const wire = node as unknown as { fromPoleId?: string; toPoleId?: string }
      return (
        !wire.fromPoleId ||
        !utilityPoleIds.has(wire.fromPoleId) ||
        !wire.toPoleId ||
        !utilityPoleIds.has(wire.toPoleId)
      )
    })
    .map((node) => node.id as AnyNodeId)
  const idsToDelete = [...removedIds, ...orphanedWireIds]
  if (idsToDelete.length === 0) return

  purging = true
  try {
    state.deleteNodes(idsToDelete)
  } finally {
    purging = false
  }
}

// Run once for an already-loaded scene, then catch nodes restored later from storage.
purgeRemovedEnvironmentNodes()
useScene.subscribe(purgeRemovedEnvironmentNodes)
