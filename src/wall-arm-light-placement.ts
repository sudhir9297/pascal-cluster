import {
  type AnyNode,
  type AnyNodeId,
  type WallNode,
} from '@pascal-app/core'
import { WALL_ARM_LIGHT_DIMENSIONS } from './wall-arm-light-geometry'

export type WallArmAttachment = {
  cursorPosition: [number, number, number]
  cursorRotationY: number
  mountHeight: number
  position: [number, number, number]
  rotation: [number, number, number]
  side: 'front' | 'back'
  wallId: string
  wallT: number
}

export type WallMountBounds = {
  height: number
  width: number
}

export const WALL_ARM_MOUNT_BOUNDS: WallMountBounds = {
  height: WALL_ARM_LIGHT_DIMENSIONS.mountPlateHeight,
  width: WALL_ARM_LIGHT_DIMENSIONS.mountPlateWidth,
}

/** Preserve an exact wall-surface cursor anchor without a fixture-size inset. */
export const WALL_CURSOR_POINT_BOUNDS: WallMountBounds = {
  height: 0,
  width: 0,
}

const WALL_SNAP_DISTANCE_M = 0.4

function clampMountHeight(
  wall: WallNode,
  requestedHeight: number,
  mountBounds: WallMountBounds,
): number {
  const wallHeight = Math.max(mountBounds.height, wall.height ?? 3)
  const halfPlate = mountBounds.height / 2
  if (wallHeight <= halfPlate * 2) return wallHeight / 2
  return Math.max(halfPlate, Math.min(wallHeight - halfPlate, requestedHeight))
}

/**
 * Resolve the canonical Pascal wall-child transform for a wall-mounted light.
 *
 * Wall-local X runs along the wall, Y runs upward, and +Z is the front face.
 * The light model reaches along +X, so its local yaw is quarter-turned to make
 * that reach point away from the selected wall face.
 */
export function resolveWallArmAttachment(
  wall: WallNode,
  localX: number,
  requestedHeight: number,
  side: 'front' | 'back',
  mountBounds: WallMountBounds = WALL_ARM_MOUNT_BOUNDS,
): WallArmAttachment {
  const dx = wall.end[0] - wall.start[0]
  const dz = wall.end[1] - wall.start[1]
  const wallLength = Math.max(1e-6, Math.hypot(dx, dz))
  const dirX = dx / wallLength
  const dirZ = dz / wallLength
  const halfPlateWidth = Math.min(
    wallLength / 2,
    mountBounds.width / 2,
  )
  const clampedX = Math.max(halfPlateWidth, Math.min(wallLength - halfPlateWidth, localX))
  const mountHeight = clampMountHeight(wall, requestedHeight, mountBounds)
  const faceSign = side === 'front' ? 1 : -1
  const surfaceOffset = ((wall.thickness ?? 0.1) / 2) * faceSign
  const normalX = -dirZ * faceSign
  const normalZ = dirX * faceSign
  const cursorX = wall.start[0] + dirX * clampedX + normalX * Math.abs(surfaceOffset)
  const cursorZ = wall.start[1] + dirZ * clampedX + normalZ * Math.abs(surfaceOffset)

  return {
    // The procedural model applies `mountHeight` internally, so its preview
    // frame remains on the wall's base plane just like the committed child.
    cursorPosition: [cursorX, 0, cursorZ],
    // Three.js yaw maps local +X to [cos(yaw), -sin(yaw)] in plan.
    cursorRotationY: Math.atan2(-normalZ, normalX),
    // Elevation remains the lamp's parametric `height`; wall-local position
    // carries only its along-wall anchor and face depth.
    mountHeight,
    position: [clampedX, 0, surfaceOffset],
    rotation: [0, side === 'front' ? -Math.PI / 2 : Math.PI / 2, 0],
    side,
    wallId: wall.id,
    wallT: clampedX / wallLength,
  }
}

export function resolveWallArmPlanAttachment(
  nodes: Record<AnyNodeId, AnyNode>,
  levelId: AnyNodeId | null,
  planPoint: readonly [number, number],
  requestedHeight: number,
  mountBounds: WallMountBounds = WALL_ARM_MOUNT_BOUNDS,
): WallArmAttachment | null {
  if (!levelId) return null
  const level = nodes[levelId] as (AnyNode & { children?: AnyNodeId[] }) | undefined
  let closest: { wall: WallNode; along: number; perp: number; distance: number } | null = null

  for (const childId of level?.children ?? []) {
    const candidate = nodes[childId]
    if (candidate?.type !== 'wall') continue
    const wall = candidate as WallNode
    if (Math.abs(wall.curveOffset ?? 0) > 1e-6) continue
    const dx = wall.end[0] - wall.start[0]
    const dz = wall.end[1] - wall.start[1]
    const length = Math.hypot(dx, dz)
    if (length < 1e-6) continue
    const dirX = dx / length
    const dirZ = dz / length
    const pointX = planPoint[0] - wall.start[0]
    const pointZ = planPoint[1] - wall.start[1]
    const along = Math.max(0, Math.min(length, pointX * dirX + pointZ * dirZ))
    const perp = pointX * -dirZ + pointZ * dirX
    const nearestX = wall.start[0] + dirX * along
    const nearestZ = wall.start[1] + dirZ * along
    const distance = Math.hypot(planPoint[0] - nearestX, planPoint[1] - nearestZ)
    if (distance > WALL_SNAP_DISTANCE_M || (closest && distance >= closest.distance)) continue
    closest = { wall, along, perp, distance }
  }

  if (!closest) return null
  return resolveWallArmAttachment(
    closest.wall,
    closest.along,
    requestedHeight,
    closest.perp >= 0 ? 'front' : 'back',
    mountBounds,
  )
}
