import {
  type AnyNode,
  type AnyNodeId,
  type WallNode,
  collectLevelWallSegments,
  getWallBaseElevationForNodes,
  isCurvedWall,
  nearestWallSegment,
  WALL_SNAP_DISTANCE_M,
} from '@pascal-app/core'
import { basinLevelPose } from '../countertop-basin/attachment'
import { BasinNode, isBasinKind } from '../countertop-basin/schema'
import { vanityLevelId } from '../freestanding-vanity/wall-placement'
import { TapNode } from './schema'
import { tapDimensions } from './geometry'
import { getTapPreset } from './presets'
import { bathFromNode, bathWallTapTarget, bathTapLocalToLevel } from '../bathtub/targets'

export type WallTapPlacement = {
  parentId: string
  wallId: string
  position: [number, number, number]
  rotation: number
  side: 'front' | 'back'
}

export function wallTapPlacement(
  node: TapNode,
  wall: WallNode,
  station: number,
  side: WallTapPlacement['side'],
  gridStep = 0,
  keepExistingAttachment = false,
): WallTapPlacement | null {
  if (wall.visible === false || isCurvedWall(wall)) return null
  const length = Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1])
  if (getTapPreset(node.presetId).mount !== 'wall') return null
  const dimensions = tapDimensions(node)
  const halfWidth =
    dimensions.design === 'plate'
      ? dimensions.bodyRadius * (0.052 / 0.024)
      : dimensions.wallSpacing / 2 + 0.035
  if (length < halfWidth * 2 && !keepExistingAttachment) return null
  const snapped = gridStep > 0 ? Math.round(station / gridStep) * gridStep : station
  const x =
    length < halfWidth * 2 ? length / 2 : Math.max(halfWidth, Math.min(length - halfWidth, snapped))
  const sign = side === 'front' ? 1 : -1
  // The spout projects along -Z. Front-face mounting therefore turns it by π.
  return {
    parentId: wall.id,
    wallId: wall.id,
    side,
    position: [x, node.position[1], sign * ((wall.thickness ?? 0.1) / 2)],
    rotation: side === 'front' ? Math.PI : 0,
  }
}

export function wallTapPlacementInPlan(
  node: TapNode,
  point: readonly [number, number],
  nodes: Record<AnyNodeId, AnyNode>,
  levelId: AnyNodeId | null,
  gridStep = 0,
): WallTapPlacement | null {
  const hit = nearestWallSegment(
    collectLevelWallSegments(nodes, levelId).filter((segment) => segment.wall.visible !== false),
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
  return wallTapPlacement(node, hit.segment.wall, hit.along, side, gridStep)
}

export function wallTapPlanPose(node: TapNode, wall: WallNode) {
  const angle = Math.atan2(wall.end[1] - wall.start[1], wall.end[0] - wall.start[0])
  const c = Math.cos(angle),
    s = Math.sin(angle)
  const [x, , z] = node.position
  return {
    x: wall.start[0] + x * c - z * s,
    z: wall.start[1] + x * s + z * c,
    yaw: node.rotation - angle,
  }
}

export function createWallTap(node: TapNode, placement: WallTapPlacement, existingId?: string) {
  if (getTapPreset(node.presetId).mount !== 'wall' || placement.parentId !== placement.wallId)
    throw new Error('Wall tap placement requires a wall host')
  return TapNode.parse({ ...node, ...placement, id: existingId })
}

/** A basin link identifies the served slot; the mounting parent remains the wall. */
export function wallTapServedBasin(
  target: WallTapPlacement,
  wall: WallNode,
  nodes: Readonly<Record<string, AnyNode>>,
) {
  const angle = Math.atan2(wall.end[1] - wall.start[1], wall.end[0] - wall.start[0])
  const c = Math.cos(angle),
    s = Math.sin(angle)
  let best: string | null = null,
    distance = 1.5
  for (const raw of Object.values(nodes)) {
    if (
      !isBasinKind(String(raw.type)) ||
      raw.visible === false ||
      vanityLevelId(raw.parentId, nodes) !== wall.parentId
    )
      continue
    const basin = BasinNode.parse(raw),
      pose = basinLevelPose(basin, nodes)
    const dx = pose.position[0] - wall.start[0],
      dz = pose.position[2] - wall.start[1]
    const along = dx * c + dz * s,
      perp = -dx * s + dz * c
    if (Math.abs(perp) > 1.5 || (perp >= 0 ? 'front' : 'back') !== target.side) continue
    const delta = Math.abs(along - target.position[0])
    if (delta < distance) {
      distance = delta
      best = basin.id
    }
  }
  return best
}

/** Only nearby rear targets on the chosen wall face can claim a bath fitting. */
export function wallTapServedBath(
  target: WallTapPlacement,
  wall: WallNode,
  nodes: Readonly<Record<string, AnyNode>>,
) {
  const angle = Math.atan2(wall.end[1] - wall.start[1], wall.end[0] - wall.start[0]),
    c = Math.cos(angle),
    s = Math.sin(angle)
  let best: { bathId: string; station: number; height: number } | null = null,
    distance = 0.55
  for (const raw of Object.values(nodes)) {
    const bath = bathFromNode(raw)
    if (
      !bath ||
      bath.visible === false ||
      bath.tapMount !== 'wall' ||
      vanityLevelId(bath.parentId, nodes) !== wall.parentId
    )
      continue
    const pose = bathTapLocalToLevel(bath, bathWallTapTarget(bath), nodes),
      dx = pose.position[0] - wall.start[0],
      dz = pose.position[2] - wall.start[1]
    const station = dx * c + dz * s,
      perp = -dx * s + dz * c
    if (Math.abs(perp) > 0.35 || (perp >= 0 ? 'front' : 'back') !== target.side) continue
    // The tub rear must face this wall; rotated-away tubs are not service candidates.
    const rearX = Math.sin(pose.rotation),
      rearZ = Math.cos(pose.rotation),
      normalSign = target.side === 'front' ? 1 : -1
    if ((rearX * -s + rearZ * c) * normalSign > -0.85) continue
    const delta = Math.hypot(
      station - target.position[0],
      pose.position[1] - getWallBaseElevationForNodes(wall, nodes) - target.position[1],
    )
    if (delta < distance) {
      distance = delta
      best = {
        bathId: bath.id,
        station,
        height: pose.position[1] - getWallBaseElevationForNodes(wall, nodes),
      }
    }
  }
  return best
}
