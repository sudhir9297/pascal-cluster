import {
  type AnyNodeId, type AnyNode, type GroupMoveSnapArgs, type GroupMoveSnapResult,
  collectLevelWallSegments, closestOnSegment, isCurvedWall, WALL_SNAP_DISTANCE_M,
} from '@pascal-app/core'
import { bathCornerSnap } from './corner-snap'
import { BATHTUB, BathtubNode } from './schema'

export function bathWallSnap(args: GroupMoveSnapArgs): GroupMoveSnapResult | null {
  const { node: raw, levelId } = args
  if (String(raw.type) !== BATHTUB || !levelId) return null
  const node = BathtubNode.parse(raw)
  if (node.shape === 'corner') return bathCornerSnap(args)
  if (node.shape !== 'back-to-wall' && node.shape !== 'alcove' && node.shape !== 'walk-in') return null
  return bathRectangularWallSnap(args, node)
}

export function bathRectangularWallSnap(
  args: GroupMoveSnapArgs,
  node: Pick<BathtubNode, 'shape' | 'length' | 'width' | 'rotation'>,
): GroupMoveSnapResult | null {
  const { candidatePosition, candidateRotation, nodes, levelId, movingIds } = args
  if (!levelId) return null
  const halfWidth = node.length / 2
  const rotation = candidateRotation ?? node.rotation
  let best: { distance: number; pose: GroupMoveSnapResult } | null = null
  const walls = collectLevelWallSegments(nodes as Record<AnyNodeId, AnyNode>, levelId)
  for (const segment of walls) {
    if (segment.wall.visible === false || isCurvedWall(segment.wall) || movingIds.includes(segment.wall.id) || segment.length < halfWidth * 2) continue
    const hit = closestOnSegment(segment, candidatePosition[0], candidatePosition[2])
    const normalX = -segment.dirY, normalZ = segment.dirX
    // When directly over the wall axis, keep the face closest to the free rotation.
    const sign = Math.abs(hit.perp) < 1e-5
      ? Math.sin(rotation) * normalX + Math.cos(rotation) * normalZ <= 0 ? 1 : -1
      : hit.perp >= 0 ? 1 : -1
    let station = Math.max(halfWidth, Math.min(segment.length - halfWidth, hit.along))
    if (node.shape === 'alcove') {
      const sides = walls.filter(side => side.wall.id !== segment.wall.id && side.wall.visible !== false && !movingIds.includes(side.wall.id) && Math.abs(side.dirX * segment.dirX + side.dirY * segment.dirY) < 0.02)
        .map(side => ({ wall: side.wall, station: (side.start[0] - segment.start[0]) * segment.dirX + (side.start[1] - segment.start[1]) * segment.dirY }))
        .sort((a, b) => a.station - b.station)
      let bay: { centre: number; distance: number } | null = null
      for (let i = 0; i < sides.length; i++) for (let j = i + 1; j < sides.length; j++) {
        const left = sides[i]!, right = sides[j]!
        const low = left.station + (left.wall.thickness ?? 0.1) / 2
        const high = right.station - (right.wall.thickness ?? 0.1) / 2
        if (Math.abs(high - low - node.length) > 0.04) continue
        const centre = (low + high) / 2, distance = Math.abs(centre - hit.along)
        if (distance <= WALL_SNAP_DISTANCE_M && (!bay || distance < bay.distance)) bay = { centre, distance }
      }
      if (!bay) continue
      station = bay.centre
    }
    const offset = sign * ((segment.wall.thickness ?? 0.1) / 2 + node.width / 2)
    const x = segment.start[0] + station * segment.dirX + offset * normalX
    const z = segment.start[1] + station * segment.dirY + offset * normalZ
    if (node.shape === 'alcove') {
      const endWalls = [-1, 1].map(end => walls.find(side => {
        if (side.wall.id === segment.wall.id || side.wall.visible === false || movingIds.includes(side.wall.id)) return false
        if (Math.abs(side.dirX * segment.dirX + side.dirY * segment.dirY) > 0.02) return false
        // Check both corners of each bath end against the inner side-wall face.
        for (const depthEnd of [-1, 1]) {
          const px = x + end * node.length / 2 * segment.dirX + depthEnd * node.width / 2 * normalX
          const pz = z + end * node.length / 2 * segment.dirY + depthEnd * node.width / 2 * normalZ
          const hit = closestOnSegment(side, px, pz)
          if (Math.abs(hit.distance - (side.wall.thickness ?? 0.1) / 2) > 0.025) return false
          const centreHit = closestOnSegment(side, x, z)
          if (hit.perp * centreHit.perp < 0) return false
        }
        return true
      }))
      if (!endWalls[0] || !endWalls[1] || endWalls[0].wall.id === endWalls[1].wall.id) continue
    }
    const distance = Math.hypot(x - candidatePosition[0], z - candidatePosition[2])
    if (distance > WALL_SNAP_DISTANCE_M || best && distance >= best.distance) continue
    best = { distance, pose: {
      position: [x, candidatePosition[1], z],
      rotation: (sign > 0 ? Math.PI : 0) - Math.atan2(segment.dirY, segment.dirX),
    } }
  }
  return best?.pose ?? null
}
