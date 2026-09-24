import { type AnyNodeId, useScene } from '@pascal-app/core'

/** Node kinds intentionally removed from the streetscape catalog. */
export const REMOVED_STREETSCAPE_NODE_TYPES = ['streetscape:in-ground-uplight'] as const

let purging = false

function purgeRemovedStreetscapeNodes(): void {
  if (purging) return
  const state = useScene.getState()
  const removedIds = Object.values(state.nodes)
    .filter((node) => REMOVED_STREETSCAPE_NODE_TYPES.includes(node.type as (typeof REMOVED_STREETSCAPE_NODE_TYPES)[number]))
    .map((node) => node.id as AnyNodeId)
  const utilityPoleIds = new Set(
    Object.values(state.nodes)
      .filter((node) => (node.type as string) === 'streetscape:utility-pole')
      .map((node) => node.id as string),
  )
  const orphanedWireIds = Object.values(state.nodes)
    .filter((node) => {
      if ((node.type as string) !== 'streetscape:utility-wire-span') return false
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
purgeRemovedStreetscapeNodes()
useScene.subscribe(purgeRemovedStreetscapeNodes)
