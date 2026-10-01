import {
  getEffectiveNode,
  type AnyNodeId,
  type GeometryContext,
  type FloorplanGeometry,
} from '@pascal-app/core'
import { showerArmPlacement, showerArmPlanPose } from '../shower-arm/placement'
import { flangeHost } from './attachment'
import { flangeFit } from './geometry'
import type { ShowerFlangeNode } from './schema'
export function showerFlangeFloorplan(
  n: ShowerFlangeNode,
  ctx: GeometryContext,
): FloorplanGeometry | null {
  const raw = ctx.resolve(n.parentId as AnyNodeId),
    host = raw ? flangeHost(raw) : null
  if (!host) return null
  const arm = host.node,
    wall = ctx.resolve((arm.wallId ?? arm.parentId) as AnyNodeId)
  if (wall?.type !== 'wall') return null
  const placement = showerArmPlacement(
    arm,
    getEffectiveNode(wall),
    arm.position[0],
    arm.side,
    0,
    true,
  )
  if (!placement) return null
  const world = showerArmPlanPose({ ...arm, ...placement }, getEffectiveNode(wall)),
    c = Math.cos(world.yaw),
    s = Math.sin(world.yaw),
    half = flangeFit(n, ctx).width / 2
  return {
    kind: 'polygon',
    points: [
      [-half, 0],
      [half, 0],
      [half, n.depth],
      [-half, n.depth],
    ].map(([x, z]) => [world.x + x! * c + z! * s, world.z - x! * s + z! * c] as [number, number]),
    fill: '#ffffff',
    stroke: ctx.viewState?.selected ? '#8b5cf6' : '#737373',
    strokeWidth: 0.008,
  }
}
