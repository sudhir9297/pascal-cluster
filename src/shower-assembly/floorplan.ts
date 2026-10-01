import { fitShowerPlacement } from '../shower-assembly/placement'
import { fitAssemblyPlacement } from './placement'
import {
  getEffectiveNode,
  type AnyNodeId,
  type GeometryContext,
  type FloorplanGeometry,
} from '@pascal-app/core'
import { type ShowerAssemblyNode } from './schema'
import { assemblyFront, assemblyHolder } from './targets'
import { showerArmPlacement, showerArmPlanPose } from '../shower-arm/placement'
import { wallFixtureFloorplanMove } from '../shower-common/wall-floorplan'
export function showerAssemblyFloorplan(
  n: ShowerAssemblyNode,
  ctx: GeometryContext,
): FloorplanGeometry | null {
  const raw = ctx.resolve((n.wallId ?? n.parentId) as AnyNodeId)
  if (raw?.type !== 'wall') return null
  const wall = getEffectiveNode(raw),
    rawPlacement = showerArmPlacement(n, wall, n.position[0], n.side, 0, true),
    placement = fitShowerPlacement(n, rawPlacement, (id) => ctx.resolve(id)),
    pose = showerArmPlanPose({ ...n, ...placement }, wall)
  if (!placement) return null
  const half = Math.max(
      n.family === 'panel' ? n.width / 2 : 0.15,
      Math.abs(assemblyHolder(n)[0]) + 0.02,
    ),
    depth = assemblyFront(n) + n.armLength + n.tubeSize
  if (!placement) return null
  const c = Math.cos(pose.yaw),
    s = Math.sin(pose.yaw),
    points = [
      [-half, 0],
      [half, 0],
      [half, depth],
      [-half, depth],
    ]
  return {
    kind: 'path',
    d: `M${points.map(([x, z]) => [pose.x + x! * c + z! * s, pose.z - x! * s + z! * c].join(',')).join('L')}Z`,
    fill: '#ffffff',
    stroke: ctx.viewState?.selected ? '#8b5cf6' : '#737373',
    strokeWidth: 0.008,
    cursor: 'move',
  }
}
export const showerAssemblyFloorplanMove: import('@pascal-app/core').FloorplanMoveTarget<
  ShowerAssemblyNode
> = (context) => wallFixtureFloorplanMove(context, fitAssemblyPlacement)
