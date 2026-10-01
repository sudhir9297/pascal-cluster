import {
  getFloorStackedPosition,
  resolveFrozenFloorPlacementPatch,
  resolveSupportSlabPatch,
  type AnyNode,
  type GroupMoveSnapResult,
  type SupportSlabPatch,
} from '@pascal-app/core'

export type FloorSurface = {
  elevation: number
  supportSlabId: string | null
  sourceNodeId: string | null
}
export type FloorPlacementPose = GroupMoveSnapResult & {
  supportSlabId?: string
  previewPosition: [number, number, number]
}

// Saved Y is a clearance above support, never the slab elevation itself.
export function floorPlacementPose(
  node: AnyNode,
  pose: GroupMoveSnapResult,
  levelId: string,
  nodes: Record<string, AnyNode>,
  surface?: FloorSurface | null,
): FloorPlacementPose {
  const candidate = { ...node, ...pose, parentId: levelId } as AnyNode
  let position = pose.position
  let support: SupportSlabPatch
  if (surface?.sourceNodeId) {
    const frozen = resolveFrozenFloorPlacementPatch(candidate, nodes, {
      position,
      rotation: pose.rotation,
      elevation: surface.elevation,
      preferredSlabId: surface.supportSlabId,
    })
    position = frozen.position
    support = { supportSlabId: frozen.supportSlabId }
  } else {
    support = resolveSupportSlabPatch(candidate, nodes, {
      maxElevation: surface?.elevation,
      preferredSlabId: surface?.supportSlabId,
      pinSupport: true,
    })
  }
  const placed = { ...candidate, ...support, position } as AnyNode
  return {
    ...pose,
    ...support,
    position,
    previewPosition: getFloorStackedPosition({
      node: placed,
      nodes,
      position,
      rotation: pose.rotation,
      levelId,
    }),
  }
}
