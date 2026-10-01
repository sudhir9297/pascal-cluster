import {
  type AnyNode,
  type AnyNodeId,
  type WallNode,
  collectLevelWallSegments,
  isCurvedWall,
  nearestWallSegment,
  WALL_SNAP_DISTANCE_M,
} from '@pascal-app/core'
import { wallBasinMinimumMountHeight } from './profile'
import {
  HALF_PEDESTAL_BASIN,
  HalfPedestalBasinNode,
  FULL_PEDESTAL_BASIN,
  FullPedestalBasinNode,
  WallHungBasinNode,
  type WallSupportedBasinNode,
} from '../countertop-basin/schema'

export type WallBasinPlacement = {
  parentId: string
  wallId: string
  position: [number, number, number]
  rotation: number
  side: 'front' | 'back'
}

export function wallBasinPlacement(
  node: WallSupportedBasinNode,
  wall: WallNode,
  station: number,
  side: WallBasinPlacement['side'],
  gridStep = 0,
  keepExistingAttachment = false,
): WallBasinPlacement | null {
  if (wall.visible === false || isCurvedWall(wall)) return null
  const length = Math.hypot(
    wall.end[0] - wall.start[0],
    wall.end[1] - wall.start[1],
  )
  const halfWidth = node.width / 2
  if (length < halfWidth * 2 && !keepExistingAttachment) return null
  const snapped =
    gridStep > 0 ? Math.round(station / gridStep) * gridStep : station
  const x =
    length < halfWidth * 2
      ? length / 2
      : Math.max(halfWidth, Math.min(length - halfWidth, snapped))
  const sign = side === 'front' ? 1 : -1
  // The basin faces -Z; its back is +Z. Front-face mounting therefore turns it by π.
  return {
    parentId: wall.id,
    wallId: wall.id,
    side,
    position: [
      x,
      node.type === FULL_PEDESTAL_BASIN ? node.totalHeight : node.position[1],
      sign * ((wall.thickness ?? 0.1) / 2 + node.depth / 2),
    ],
    rotation: side === 'front' ? Math.PI : 0,
  }
}

export function wallBasinPlacementInPlan(
  node: WallSupportedBasinNode,
  point: readonly [number, number],
  nodes: Record<AnyNodeId, AnyNode>,
  levelId: AnyNodeId | null,
  gridStep = 0,
): WallBasinPlacement | null {
  const hit = nearestWallSegment(
    collectLevelWallSegments(nodes, levelId).filter(
      (segment) => segment.wall.visible !== false,
    ),
    point[0],
    point[1],
    WALL_SNAP_DISTANCE_M,
  )
  if (!hit) return null
  const side =
    Math.abs(hit.perp) < 1e-5 && node.wallId === hit.segment.wall.id
      ? node.side
      : hit.perp >= 0
        ? 'front'
        : 'back'
  return wallBasinPlacement(node, hit.segment.wall, hit.along, side, gridStep)
}

export function wallBasinPlanPose(
  node: WallSupportedBasinNode,
  wall: WallNode,
) {
  const angle = Math.atan2(
    wall.end[1] - wall.start[1],
    wall.end[0] - wall.start[0],
  )
  const c = Math.cos(angle),
    s = Math.sin(angle)
  const [x, , z] = node.position
  return {
    x: wall.start[0] + x * c - z * s,
    z: wall.start[1] + x * s + z * c,
    yaw: node.rotation - angle,
  }
}

export function createWallHungBasin(
  node: WallSupportedBasinNode,
  placement: WallBasinPlacement,
  existingId?: string,
) {
  return (
    node.type === HALF_PEDESTAL_BASIN
      ? HalfPedestalBasinNode
      : node.type === FULL_PEDESTAL_BASIN
        ? FullPedestalBasinNode
        : WallHungBasinNode
  ).parse({ ...node, ...placement, id: existingId })
}
