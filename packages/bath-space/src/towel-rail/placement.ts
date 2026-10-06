import {
  type AnyNode,
  type AnyNodeId,
  type WallNode,
  collectLevelWallSegments,
  getWallEffectiveHeightForNodes,
  isCurvedWall,
  nearestWallSegment,
  WALL_SNAP_DISTANCE_M,
} from '@pascal-app/core'
import { TowelRailNode } from './schema'

export type TowelRailPlacement = {
  parentId: string
  wallId: string
  position: [number, number, number]
  rotation: number
  side: 'front' | 'back'
  mountingHeight: number
}

export function towelRailPlacement(
  node: TowelRailNode,
  wall: WallNode,
  station: number,
  side: TowelRailPlacement['side'],
  gridStep = 0,
  keepExistingAttachment = false,
  nodes: Record<string, AnyNode> = {},
): TowelRailPlacement | null {
  if (wall.visible === false || isCurvedWall(wall)) return null
  const length = Math.hypot(
    wall.end[0] - wall.start[0],
    wall.end[1] - wall.start[1],
  )
  const halfHeight = node.height / 2
  const wallHeight = getWallEffectiveHeightForNodes(wall, nodes)
  if (!keepExistingAttachment && (node.mountingHeight < halfHeight || node.mountingHeight + halfHeight > wallHeight)) return null
  const halfWidth = node.width / 2
  if (length < halfWidth * 2 && !keepExistingAttachment) return null
  const snapped =
    gridStep > 0 ? Math.round(station / gridStep) * gridStep : station
  const x =
    length < halfWidth * 2
      ? length / 2
      : Math.max(halfWidth, Math.min(length - halfWidth, snapped))
  const sign = side === 'front' ? 1 : -1
  // The control projects along local +Z away from its wall face.
  return {
    parentId: wall.id,
    wallId: wall.id,
    side,
    mountingHeight: node.mountingHeight,
    position: [x, node.mountingHeight, (sign * (wall.thickness ?? 0.1)) / 2],
    rotation: side === 'front' ? 0 : Math.PI,
  }
}

export function towelRailPlacementInPlan(
  node: TowelRailNode,
  point: readonly [number, number],
  nodes: Record<AnyNodeId, AnyNode>,
  levelId: AnyNodeId | null,
  gridStep = 0,
): TowelRailPlacement | null {
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
  return towelRailPlacement(node, hit.segment.wall, hit.along, side, gridStep, false, nodes)
}

export function towelRailPlanPose(
  node: Pick<TowelRailNode, 'position' | 'rotation'>,
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

export function createTowelRail(
  node: TowelRailNode,
  placement: TowelRailPlacement,
  existingId?: string,
) {
  return TowelRailNode.parse({ ...node, ...placement, id: existingId })
}
