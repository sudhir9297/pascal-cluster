import {
  getEffectiveNode,
  type AnyNode,
  type AnyNodeId,
} from '@pascal-app/core'
import {
  WallHungToiletNode,
  toiletLayout as wallToiletLayout,
} from '../wall-hung-toilet/schema'
import {
  FloorStandingToiletNode,
  FLOOR_STANDING_TOILET,
  toiletLayout as floorToiletLayout,
} from '../floor-standing-toilet/schema'
import { toiletPlacement as floorToiletPlacement } from '../floor-standing-toilet/placement'
import { z } from 'zod'
export const ToiletNode = z.union([WallHungToiletNode, FloorStandingToiletNode])
export type ToiletNode = z.infer<typeof ToiletNode>
const toiletLayout = (n: ToiletNode) =>
  n.type === FLOOR_STANDING_TOILET ? floorToiletLayout(n) : wallToiletLayout(n)
import { toiletPlacement } from '../wall-hung-toilet/placement'
import {
  CisternFlushControlNode,
  WallFlushPlateNode,
  CISTERN_FLUSH_CONTROL,
  WALL_FLUSH_PLATE,
  type FlushControlNode,
} from './schema'
import { flushPlatePlacement } from './placement'
export function toiletFlushControls(
  id: string,
  nodes: Readonly<Record<string, AnyNode>>,
) {
  return Object.values(nodes).filter(
    (raw) =>
      (String(raw.type) === CISTERN_FLUSH_CONTROL && raw.parentId === id) ||
      (String(raw.type) === WALL_FLUSH_PLATE &&
        (raw as unknown as WallFlushPlateNode).servesToiletId === id),
  )
}
export function cisternControlPose(
  n: CisternFlushControlNode,
  toilet: ToiletNode,
) {
  const l = toiletLayout(toilet),
    tankY = l.tankBottom - toilet.mountingHeight
  const z = l.projection / 2 - toilet.tankDepth / 2 + n.offsetZ
  const x = Math.max(
    -toilet.tankWidth / 2 + 0.02,
    Math.min(toilet.tankWidth / 2 - 0.02, n.offsetX),
  )
  if (n.mount === 'top')
    return {
      position: [
        x,
        tankY +
          toilet.tankHeight +
          (toilet.type === FLOOR_STANDING_TOILET
            ? toilet.tankLidThickness
            : 0.018),
        z,
      ] as [number, number, number],
      rotation: 0,
      rotationX: -Math.PI / 2,
    }
  if (n.mount === 'pull-chain')
    return {
      position: [toilet.tankWidth / 2 + 0.018, tankY + 0.1, z] as [
        number,
        number,
        number,
      ],
      rotation: Math.PI / 2,
      rotationX: 0,
    }
  return {
    position: [
      x,
      tankY + toilet.tankHeight * 0.7,
      l.projection / 2 - toilet.tankDepth,
    ] as [number, number, number],
    rotation: Math.PI,
    rotationX: 0,
  }
}
export function defaultToiletControl(
  toilet: ToiletNode,
  nodes: Readonly<Record<string, AnyNode>>,
): FlushControlNode | null {
  if (toilet.tankType === 'concealed') {
    const wall = nodes[toilet.wallId ?? toilet.parentId ?? '']
    if (wall?.type !== 'wall') return null
    const n = WallFlushPlateNode.parse({
      name: 'Toilet flush plate',
      servesToiletId: toilet.id,
      mountingHeight: 1,
    })
    const target = flushPlatePlacement(n, wall, toilet.position[0], toilet.side)
    return target ? WallFlushPlateNode.parse({ ...n, ...target }) : null
  }
  const n = CisternFlushControlNode.parse({
    name:
      toilet.tankType === 'high-level'
        ? 'Cistern pull-chain control'
        : 'Cistern flush buttons',
    parentId: toilet.id,
    mount: toilet.tankType === 'high-level' ? 'pull-chain' : 'top',
    flushMode: toilet.tankType === 'high-level' ? 'single' : 'dual',
    shape: 'round',
  })
  return CisternFlushControlNode.parse({
    ...n,
    ...cisternControlPose(n, toilet),
  })
}
export function clearToiletControlLinks(
  toilet: ToiletNode,
  nodes: Record<AnyNodeId, AnyNode>,
) {
  return toiletFlushControls(toilet.id, nodes)
    .filter((raw) => String(raw.type) === WALL_FLUSH_PLATE)
    .map((raw) => ({
      id: raw.id,
      data: { servesToiletId: null } as Partial<AnyNode>,
    }))
}
// Tank buttons inherit their toilet's current placement in floor plans; wall plates own theirs.
export function controlWallPose(
  n: FlushControlNode,
  nodes: Readonly<Record<string, AnyNode>>,
) {
  if (n.type === WALL_FLUSH_PLATE) {
    const wall = nodes[n.wallId ?? n.parentId ?? '']
    if (wall?.type !== 'wall') return null
    const pose = flushPlatePlacement(
      n,
      getEffectiveNode(wall),
      n.position[0],
      n.side,
      0,
      true,
    )
    return pose ? { wall, pose } : null
  }
  const raw = nodes[n.parentId ?? '']
  if (!raw) return null
  const parsed = ToiletNode.safeParse(getEffectiveNode(raw))
  if (!parsed.success || parsed.data.tankType === 'concealed') return null
  const toilet = parsed.data,
    wall = nodes[toilet.wallId ?? toilet.parentId ?? '']
  if (wall?.type !== 'wall') return null
  const target =
    toilet.type === FLOOR_STANDING_TOILET
      ? floorToiletPlacement(
          toilet,
          getEffectiveNode(wall),
          toilet.position[0],
          toilet.side,
          0,
          true,
        )
      : toiletPlacement(
          toilet,
          getEffectiveNode(wall),
          toilet.position[0],
          toilet.side,
          0,
          true,
        )
  if (!target) return null
  const local = cisternControlPose(n, toilet),
    c = Math.cos(target.rotation),
    s = Math.sin(target.rotation)
  return {
    wall,
    pose: {
      ...target,
      rotation: target.rotation + local.rotation,
      position: [
        target.position[0] + local.position[0] * c + local.position[2] * s,
        target.position[1] + local.position[1],
        target.position[2] - local.position[0] * s + local.position[2] * c,
      ] as [number, number, number],
    },
  }
}
