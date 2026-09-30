import { collectLevelWallSegments, WALL_SNAP_DISTANCE_M, type AnyNode, type AnyNodeId, type GroupMoveSnapArgs, type GroupMoveSnapResult } from '@pascal-app/core'
import { CORNER_VANITY, CornerVanityNode } from './schema'

export function cornerVanitySnap({ node: raw, candidatePosition, nodes, levelId, movingIds }: GroupMoveSnapArgs): GroupMoveSnapResult | null {
  if (String(raw.type) !== CORNER_VANITY || !levelId) return null
  const node = CornerVanityNode.parse(raw)
  const walls = collectLevelWallSegments(nodes as Record<AnyNodeId, AnyNode>, levelId)
    .filter(({ wall, length }) => wall.visible !== false && !movingIds.includes(wall.id) && length >= node.width + 0.05)
  let best: { distance: number; pose: GroupMoveSnapResult } | null = null
  for (let i = 0; i < walls.length; i++) for (let j = i + 1; j < walls.length; j++) {
    const a = walls[i]!, b = walls[j]!
    if (Math.abs(a.dirX * b.dirX + a.dirY * b.dirY) > 0.03) continue
    for (const ae of [0, 1]) for (const be of [0, 1]) {
      const p = ae ? a.end : a.start, q = be ? b.end : b.start
      if (Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.03) continue
      const ux = a.dirX * (ae ? -1 : 1), uz = a.dirY * (ae ? -1 : 1)
      const vx = b.dirX * (be ? -1 : 1), vz = b.dirY * (be ? -1 : 1)
      const bx = (ux + vx) / Math.SQRT2, bz = (uz + vz) / Math.SQRT2
      const r = node.width / Math.SQRT2
      const x = p[0] + ux * (b.wall.thickness ?? 0.1) / 2 + vx * (a.wall.thickness ?? 0.1) / 2 + bx * r
      const z = p[1] + uz * (b.wall.thickness ?? 0.1) / 2 + vz * (a.wall.thickness ?? 0.1) / 2 + bz * r
      const distance = Math.hypot(candidatePosition[0] - x, candidatePosition[2] - z)
      if (distance > WALL_SNAP_DISTANCE_M || best && distance >= best.distance) continue
      best = { distance, pose: { position: [x, candidatePosition[1], z], rotation: Math.atan2(-bx, -bz) } }
    }
  }
  return best?.pose ?? null
}
