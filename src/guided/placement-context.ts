import type { AnyNode } from '@pascal-app/core'
type GuidedPlacementContext = {
  vanityId: string | null
  basinId: string | null
  showerArmId?: string | null
}

let context: GuidedPlacementContext | null = null

export function setGuidedPlacementContext(next: GuidedPlacementContext | null) {
  context = next
}

export function guidedBasinHostAllowed(hostId: string | null) {
  return !context?.vanityId || hostId === context.vanityId
}

export function guidedTapHostAllowed(hostId: string | null) {
  return !context?.basinId || hostId === context.basinId
}

export function guidedShowerHeadHostAllowed(
  hostId: string | null,
  nodes: Readonly<Record<string, AnyNode>>,
) {
  if (!context?.showerArmId) return true
  const seen = new Set<string>()
  while (hostId && !seen.has(hostId)) {
    if (hostId === context.showerArmId) return true
    seen.add(hostId)
    hostId = nodes[hostId]?.parentId ?? null
  }
  return false
}

export function guidedShowerControlWallAllowed(
  wallId: string,
  nodes: Readonly<Record<string, AnyNode>>,
) {
  if (!context?.showerArmId) return true
  return nodes[context.showerArmId]?.parentId === wallId
}
