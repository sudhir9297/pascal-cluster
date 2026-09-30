import {
  type AnyNodeId, type AnyNode, type GroupMoveSnapArgs, type GroupMoveSnapResult,
  collectLevelWallSegments, closestOnSegment, WALL_SNAP_DISTANCE_M,
} from '@pascal-app/core'
import { FREESTANDING_VANITY, FreestandingVanityNode } from './schema'

export function freestandingVanityWallSnap({ node: raw, candidatePosition, candidateRotation, nodes, levelId, movingIds }: GroupMoveSnapArgs): GroupMoveSnapResult | null {
  if (String(raw.type) !== FREESTANDING_VANITY || !levelId) return null
  const node = FreestandingVanityNode.parse(raw)
  const overhang = node.countertopEnabled ? node.countertopOverhang : 0
  const halfWidth = node.width / 2 + overhang
  const rotation = candidateRotation ?? node.rotation
  let best: { distance: number; pose: GroupMoveSnapResult } | null = null
  for (const segment of collectLevelWallSegments(nodes as Record<AnyNodeId, AnyNode>, levelId)) {
    if (segment.wall.visible === false || movingIds.includes(segment.wall.id) || segment.length < halfWidth * 2) continue
    const hit = closestOnSegment(segment, candidatePosition[0], candidatePosition[2])
    const normalX = -segment.dirY, normalZ = segment.dirX
    // When directly over the wall axis, keep the face closest to the free rotation.
    const sign = Math.abs(hit.perp) < 1e-5
      ? Math.sin(rotation) * normalX + Math.cos(rotation) * normalZ <= 0 ? 1 : -1
      : hit.perp >= 0 ? 1 : -1
    const station = Math.max(halfWidth, Math.min(segment.length - halfWidth, hit.along))
    const offset = sign * ((segment.wall.thickness ?? 0.1) / 2 + node.depth / 2)
    const x = segment.start[0] + station * segment.dirX + offset * normalX
    const z = segment.start[1] + station * segment.dirY + offset * normalZ
    const distance = Math.hypot(x - candidatePosition[0], z - candidatePosition[2])
    if (distance > WALL_SNAP_DISTANCE_M || best && distance >= best.distance) continue
    best = { distance, pose: {
      position: [x, candidatePosition[1], z],
      rotation: (sign > 0 ? Math.PI : 0) - Math.atan2(segment.dirY, segment.dirX),
    } }
  }
  return best?.pose ?? null
}
