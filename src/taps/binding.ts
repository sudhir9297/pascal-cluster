import { getEffectiveNode, getWallBaseElevationForNodes, type AnyNode } from '@pascal-app/core'
import { attachmentChanges } from '../attachments/slots'
import { BasinNode } from '../countertop-basin/schema'
import {
  basinTapSlots,
  basinTapLocalToLevel,
  tapOccupancySlot,
} from '../countertop-basin/tap-attachment'
import { TAP, TapNode } from './schema'
import {
  wallTapPlacement,
  wallTapServedBasin,
  wallTapServedBath,
  type WallTapPlacement,
} from './wall-placement'
import { bathFromNode, bathWallTapTarget, bathTapLocalToLevel } from '../bathtub/targets'

function wallCoordinates(
  point: readonly number[],
  wall: { start: [number, number]; end: [number, number] },
) {
  const angle = Math.atan2(wall.end[1] - wall.start[1], wall.end[0] - wall.start[0])
  return (
    (point[0]! - wall.start[0]) * Math.cos(angle) + (point[2]! - wall.start[1]) * Math.sin(angle)
  )
}

/** Resolve once for the ghost, commit, movement and both renderers. */
export function resolveWallTapTarget(
  node: TapNode,
  target: WallTapPlacement,
  nodes: Readonly<Record<string, AnyNode>>,
) {
  const wall = nodes[target.wallId]
  if (wall?.type !== 'wall') throw new Error('Wall tap requires an existing wall')
  const bathTarget = wallTapServedBath(target, wall, nodes)
  const basinId = bathTarget ? null : wallTapServedBasin(target, wall, nodes)
  let serviceSlotId = 'tap',
    linkOffset: [number, number] = [0, 0]
  if (basinId) {
    const basin = BasinNode.parse(getEffectiveNode(nodes[basinId]!))
    const slots = basinTapSlots(
      {
        ...basin,
        tapMountingLayout: 'single-hole',
        tapSlotCount: 1,
        tapSlots: [],
        tapTarget: undefined,
      },
      nodes,
    )
    const slot = slots.reduce((best, next) =>
      Math.abs(
        wallCoordinates(basinTapLocalToLevel(basin, next, nodes).position, wall) -
          target.position[0],
      ) <
      Math.abs(
        wallCoordinates(basinTapLocalToLevel(basin, best, nodes).position, wall) -
          target.position[0],
      )
        ? next
        : best,
    )
    serviceSlotId = slot.id
    const pose = basinTapLocalToLevel(basin, slot, nodes)
    linkOffset = [
      target.position[0] - wallCoordinates(pose.position, wall),
      target.position[1] + getWallBaseElevationForNodes(wall, nodes) - pose.position[1],
    ]
  }
  if (bathTarget)
    linkOffset = [target.position[0] - bathTarget.station, target.position[1] - bathTarget.height]
  // Proximity is only a picking aid for a free wall point. Occupancy uses its saved ID.
  const existing = Object.values(nodes).find((raw) => {
    if (String(raw.type) !== TAP || String(raw.id) === node.id || raw.parentId !== wall.id)
      return false
    const tap = TapNode.parse(raw)
    return (
      !tap.servesBasinId &&
      !tap.servesBathId &&
      tap.side === target.side &&
      Math.abs(tap.position[0] - target.position[0]) < 0.01 &&
      Math.abs(tap.position[1] - target.position[1]) < 0.01
    )
  })
  const slotId = existing
    ? TapNode.parse(existing).slotId
    : node.wallId === wall.id
      ? node.slotId
      : `wall-point:${node.id}`
  return TapNode.parse({
    ...node,
    ...target,
    servesBathId: bathTarget?.bathId ?? null,
    servesBasinId: basinId,
    serviceSlotId,
    slotId,
    linkOffset,
  })
}

export function wallTapAttachmentChanges(
  placed: TapNode,
  nodes: Readonly<Record<string, AnyNode>>,
  existingId?: string,
) {
  const ref = tapOccupancySlot(placed as unknown as AnyNode)!
  const changes = attachmentChanges(
    placed as unknown as AnyNode,
    { ...ref, type: 'tap', capacity: 1 },
    'tap',
    nodes,
    tapOccupancySlot,
    existingId,
  )
  if (placed.servesBasinId) {
    placed.serviceSlotId = 'tap'
    changes.delete = Object.values(nodes)
      .filter(
        (raw) => raw.id !== existingId && tapOccupancySlot(raw)?.hostId === placed.servesBasinId,
      )
      .map((raw) => raw.id)
    changes.update = [
      ...('update' in changes ? (changes.update ?? []) : []),
      {
        id: placed.servesBasinId as import('@pascal-app/core').AnyNodeId,
        data: {
          tapMountingLayout: 'single-hole',
          tapSlotCount: 1,
          tapSlots: [],
          tapTarget: undefined,
        } as unknown as Partial<AnyNode>,
      },
    ]
  }
  return changes
}

/** Preserve along-wall and height offsets while the served basin moves or resizes. */
export function followingWallTapPlacement(node: TapNode, nodes: Readonly<Record<string, AnyNode>>) {
  const wall = nodes[node.wallId ?? '']
  if (wall?.type !== 'wall') return null
  const raw = nodes[node.servesBasinId ?? '']
  const basin = raw ? BasinNode.safeParse(getEffectiveNode(raw)) : null
  let station = node.position[0],
    height = node.position[1]
  const rawBath = nodes[node.servesBathId ?? '']
  const bath = bathFromNode(rawBath ? getEffectiveNode(rawBath) : undefined)
  if (bath && node.linkOffset) {
    const pose = bathTapLocalToLevel(bath, bathWallTapTarget(bath), nodes)
    station = wallCoordinates(pose.position, wall) + node.linkOffset[0]
    height = pose.position[1] + node.linkOffset[1] - getWallBaseElevationForNodes(wall, nodes)
  }
  if (basin?.success && node.linkOffset) {
    const pose = basinTapLocalToLevel(
      basin.data,
      basinTapSlots(basin.data, nodes).find((slot) => slot.id === node.serviceSlotId) ??
        basinTapSlots(basin.data, nodes)[0]!,
      nodes,
    )
    station = wallCoordinates(pose.position, wall) + node.linkOffset[0]
    height = pose.position[1] + node.linkOffset[1] - getWallBaseElevationForNodes(wall, nodes)
  }
  return wallTapPlacement(
    { ...node, position: [station, height, node.position[2]] },
    getEffectiveNode(wall),
    station,
    node.side,
    0,
    true,
  )
}

/** Add stable bindings to older saved taps without changing their visible placement. */
export function legacyTapBindingPatch(node: TapNode, nodes: Readonly<Record<string, AnyNode>>) {
  const wall = nodes[node.wallId ?? node.parentId ?? '']
  if (wall?.type !== 'wall') return null
  const patch: Partial<TapNode> = {}
  if (node.servesBathId && !nodes[node.servesBathId]) {
    patch.servesBathId = null
    patch.linkOffset = null
  }
  if (!node.slotId || node.slotId === 'tap') patch.slotId = `wall-point:${node.id}`
  if (node.wallId !== wall.id) patch.wallId = wall.id
  const raw = nodes[node.servesBasinId ?? '']
  if (node.servesBasinId && !raw) {
    patch.servesBasinId = null
    patch.linkOffset = null
  } else if (raw && node.linkOffset === null) {
    const basin = BasinNode.parse(raw),
      slot =
        basinTapSlots(basin, nodes).find((slot) => slot.id === node.serviceSlotId) ??
        basinTapSlots(basin, nodes)[0]!
    const pose = basinTapLocalToLevel(basin, slot, nodes)
    patch.linkOffset = [
      node.position[0] - wallCoordinates(pose.position, wall),
      node.position[1] + getWallBaseElevationForNodes(wall, nodes) - pose.position[1],
    ]
  }
  return Object.keys(patch).length ? patch : null
}
