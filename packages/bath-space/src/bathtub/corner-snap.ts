import { collectLevelWallSegments, isCurvedWall, WALL_SNAP_DISTANCE_M, type AnyNode, type AnyNodeId, type GroupMoveSnapArgs, type GroupMoveSnapResult } from '@pascal-app/core'
import { BATHTUB, BathtubNode } from './schema'

export function bathCornerSnap({ node: raw, candidatePosition, nodes, levelId, movingIds }: GroupMoveSnapArgs): GroupMoveSnapResult | null {
  if (String(raw.type) !== BATHTUB || !levelId) return null
  const node = BathtubNode.parse(raw)
  if (node.shape !== 'corner') return null
  const walls = collectLevelWallSegments(nodes as Record<AnyNodeId, AnyNode>, levelId)
    .filter(({ wall }) => wall.visible !== false && !isCurvedWall(wall) && !movingIds.includes(wall.id))
  let best: { distance: number; pose: GroupMoveSnapResult } | null = null
  // Ordered pairs assign the independent length and width to the two corner walls.
  for (const a of walls) for (const b of walls) {
    if (a.wall.id === b.wall.id || Math.abs(a.dirX * b.dirX + a.dirY * b.dirY) > 0.02) continue
    if (a.length < node.length + (b.wall.thickness ?? 0.1) / 2 || b.length < node.width + (a.wall.thickness ?? 0.1) / 2) continue
    for (const ae of [0, 1]) for (const be of [0, 1]) {
      const p = ae ? a.end : a.start, q = be ? b.end : b.start
      if (Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.02) continue
      const ux = a.dirX * (ae ? -1 : 1), uz = a.dirY * (ae ? -1 : 1)
      const vx = b.dirX * (be ? -1 : 1), vz = b.dirY * (be ? -1 : 1)
      // Local +X follows the rear wall and local -Z follows the side wall.
      if (ux * vz - uz * vx > 0) continue
      const x = p[0] + ux * (node.length / 2 + (b.wall.thickness ?? 0.1) / 2) + vx * (node.width / 2 + (a.wall.thickness ?? 0.1) / 2)
      const z = p[1] + uz * (node.length / 2 + (b.wall.thickness ?? 0.1) / 2) + vz * (node.width / 2 + (a.wall.thickness ?? 0.1) / 2)
      const distance = Math.hypot(candidatePosition[0] - x, candidatePosition[2] - z)
      if (distance > WALL_SNAP_DISTANCE_M || best && distance >= best.distance) continue
      best = { distance, pose: { position: [x, candidatePosition[1], z], rotation: Math.atan2(-uz, ux) } }
    }
  }
  return best?.pose ?? null
}
