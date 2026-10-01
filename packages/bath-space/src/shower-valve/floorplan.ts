import {
  getEffectiveNode,
  type AnyNodeId,
  type GeometryContext,
  type FloorplanGeometry,
} from '@pascal-app/core'
import { ShowerControlNode } from '../shower-control/schema'
import { showerArmPlacement, showerArmPlanPose } from '../shower-arm/placement'
import { valveHost } from './attachment'
import type { ShowerValveNode } from './schema'
export function showerValveFloorplan(
  n: ShowerValveNode,
  ctx: GeometryContext,
): FloorplanGeometry | null {
  const raw = ctx.resolve(n.parentId as AnyNodeId),
    host = raw ? valveHost(raw, n) : null
  if (!host) return null
  const trim = ShowerControlNode.parse(getEffectiveNode(host.node)),
    wall = ctx.resolve((trim.wallId ?? trim.parentId) as AnyNodeId)
  if (wall?.type !== 'wall') return null
  const pose = showerArmPlacement(
    trim,
    getEffectiveNode(wall),
    trim.position[0],
    trim.side,
    0,
    true,
  )
  if (!pose) return null
  const world = showerArmPlanPose({ ...trim, ...pose }, getEffectiveNode(wall)),
    c = Math.cos(world.yaw),
    s = Math.sin(world.yaw),
    half = n.width / 2 + n.portLength
  return {
    kind: 'polygon',
    points: [
      [-half, 0],
      [half, 0],
      [half, -n.mountingDepth],
      [-half, -n.mountingDepth],
    ].map(([x, z]) => [world.x + x! * c + z! * s, world.z - x! * s + z! * c] as [number, number]),
    fill: '#b79b62',
    stroke: ctx.viewState?.selected ? '#8b5cf6' : '#737373',
    strokeWidth: 0.008,
  }
}
