import {
  type AnyNode, type AnyNodeId, type WallNode, collectLevelWallSegments,
  isCurvedWall, nearestWallSegment, WALL_SNAP_DISTANCE_M,
} from '@pascal-app/core'
import type { WallMountedVanityNode } from './schema'

export type WallVanityPlacement = {
  parentId: string
  wallId: string
  position: [number, number, number]
  rotation: number
  side: 'front' | 'back'
}

export function wallVanityPlacement(node: WallMountedVanityNode, wall: WallNode, station: number,
  side: WallVanityPlacement['side'], gridStep = 0, keepExistingAttachment = false): WallVanityPlacement | null {
  if (wall.visible === false || isCurvedWall(wall)) return null
  const length = Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1])
  const overhang = node.countertopEnabled ? node.countertopOverhang : 0
  const halfWidth = node.width / 2 + overhang
  if (length < halfWidth * 2 && !keepExistingAttachment) return null
  const snapped = gridStep > 0 ? Math.round(station / gridStep) * gridStep : station
  const x = length < halfWidth * 2 ? length / 2 : Math.max(halfWidth, Math.min(length - halfWidth, snapped))
  const sign = side === 'front' ? 1 : -1
  // The vanity faces -Z; its back is +Z. Front-face mounting therefore turns it by π.
  return {
    parentId: wall.id, wallId: wall.id, side,
    position: [x, node.position[1], sign * ((wall.thickness ?? 0.1) / 2 + node.depth / 2)],
    rotation: side === 'front' ? Math.PI : 0,
  }
}

export function wallVanityPlacementInPlan(node: WallMountedVanityNode, point: readonly [number, number],
  nodes: Record<AnyNodeId, AnyNode>, levelId: AnyNodeId | null, gridStep = 0): WallVanityPlacement | null {
  const hit = nearestWallSegment(collectLevelWallSegments(nodes, levelId).filter((segment) => segment.wall.visible !== false),
    point[0], point[1], WALL_SNAP_DISTANCE_M)
  if (!hit) return null
  const side = Math.abs(hit.perp) < 1e-5 && node.wallId === hit.segment.wall.id ? node.side : hit.perp >= 0 ? 'front' : 'back'
  return wallVanityPlacement(node, hit.segment.wall, hit.along, side, gridStep)
}

export function wallVanityPlanPose(node: WallMountedVanityNode, wall: WallNode) {
  const angle = Math.atan2(wall.end[1] - wall.start[1], wall.end[0] - wall.start[0])
  const c = Math.cos(angle), s = Math.sin(angle)
  const [x, , z] = node.position
  return { x: wall.start[0] + x * c - z * s, z: wall.start[1] + x * s + z * c, yaw: node.rotation - angle }
}

export function vanityLevelId(parentId: string | null, nodes: Record<AnyNodeId, AnyNode>): AnyNodeId | null {
  const visited = new Set<string>()
  let current = parentId
  while (current && !visited.has(current)) {
    visited.add(current)
    const node = nodes[current as AnyNodeId]
    if (!node) return null
    if (node.type === 'level') return node.id as AnyNodeId
    current = node.parentId
  }
  return null
}
