import {
  type AnyNode,
  type AnyNodeId,
  type WallNode,
  collectLevelWallSegments,
  isCurvedWall,
  nearestWallSegment,
  WALL_SNAP_DISTANCE_M,
} from '@pascal-app/core'
import { ShowerArmNode } from './schema'
export type WallMountNode = Pick<ShowerArmNode, 'position' | 'rotation' | 'side' | 'mountingHeight' | 'tubeSize' | 'flangeEnabled' | 'flangeSize'> & {wallId: string | null}


export type ShowerArmPlacement = {
  parentId: string
  wallId: string
  position: [number, number, number]
  rotation: number
  side: 'front' | 'back'
  mountingHeight: number
}

export function showerArmPlacement(
  node: WallMountNode,
  wall: WallNode,
  station: number,
  side: ShowerArmPlacement['side'],
  gridStep = 0,
  keepExistingAttachment = false,
): ShowerArmPlacement | null {
  if (wall.type !== 'wall' || wall.visible === false || isCurvedWall(wall)) return null
  const length = Math.hypot(
    wall.end[0] - wall.start[0],
    wall.end[1] - wall.start[1],
  )
  const halfWidth =
    Math.max(node.tubeSize, node.flangeEnabled ? node.flangeSize : 0) / 2
  if (length < halfWidth * 2 && !keepExistingAttachment) return null
  const snapped =
    gridStep > 0 ? Math.round(station / gridStep) * gridStep : station
  const x =
    length < halfWidth * 2
      ? length / 2
      : Math.max(halfWidth, Math.min(length - halfWidth, snapped))
  const sign = side === 'front' ? 1 : -1
  // Arms project along local +Z away from the selected wall face.
  return {
    parentId: wall.id,
    wallId: wall.id,
    side,
    mountingHeight: node.mountingHeight,
    position: [
      x,
      node.mountingHeight,
      sign * (wall.thickness ?? 0.1) / 2,
    ],
    rotation: side === 'front' ? 0 : Math.PI,
  }
}

export function showerArmPlacementInPlan(
  node: WallMountNode,
  point: readonly [number, number],
  nodes: Record<AnyNodeId, AnyNode>,
  levelId: AnyNodeId | null,
  gridStep = 0,
): ShowerArmPlacement | null {
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
  return showerArmPlacement(node, hit.segment.wall, hit.along, side, gridStep)
}

export function showerArmPlanPose(node: WallMountNode, wall: WallNode) {
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

export function createShowerArm(
  node: ShowerArmNode,
  placement: ShowerArmPlacement,
  existingId?: string,
) {
  if (!placement.wallId || placement.parentId !== placement.wallId) {
    throw new Error('Shower arms require a wall host')
  }
  return ShowerArmNode.parse({ ...node, ...placement, id: existingId })
}
