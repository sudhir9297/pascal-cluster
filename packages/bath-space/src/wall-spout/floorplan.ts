import { wallFixtureFloorplanMove } from '../shower-common/wall-floorplan'
import {
  type AnyNode,
  type AnyNodeId,
  type FloorplanGeometry,
  type FloorplanMoveTarget,
  type GeometryContext,
  getEffectiveNode,
  useLiveNodeOverrides,
  useScene,
} from '@pascal-app/core'
import { isGridSnapActive, useEditor } from '@pascal-app/editor'
import { WallSpoutNode, waterfallSpout } from './schema'
import { vanityLevelId } from '../freestanding-vanity/wall-placement'
import {
  showerArmPlacement,
  showerArmPlacementInPlan,
  showerArmPlanPose,
  type ShowerArmPlacement,
} from '../shower-arm/placement'

export function wallSpoutFloorplan(
  node: WallSpoutNode,
  ctx: GeometryContext,
): FloorplanGeometry | null {
  const parent = ctx.resolve((node.wallId ?? node.parentId) as AnyNodeId)
  if (parent?.type !== 'wall') return null
  const wall = getEffectiveNode(parent)
  const attachment = showerArmPlacement(node, wall, node.position[0], node.side, 0, true)
  const pose = showerArmPlanPose(attachment ? { ...node, ...attachment } : node, wall)
  const half = (waterfallSpout(node) ? node.waterfallWidth : node.tubeSize) / 2
  const points = [
    [-half, 0],
    [half, 0],
    [half, node.length + node.tubeSize / 2],
    [-half, node.length + node.tubeSize / 2],
  ]
  const c2 = Math.cos(pose.yaw),
    s2 = Math.sin(pose.yaw)
  const d = `M${points.map(([x, z]) => [pose.x + x! * c2 + z! * s2, pose.z - x! * s2 + z! * c2].join(',')).join('L')}Z`
  const children: FloorplanGeometry[] = [
    {
      kind: 'path',
      d,
      fill: '#ffffff',
      stroke: ctx.viewState?.selected ? '#8b5cf6' : '#737373',
      strokeWidth: 0.008,
      cursor: 'move',
    },
  ]

  return { kind: 'group', children }
}

export const wallSpoutFloorplanMove = wallFixtureFloorplanMove<WallSpoutNode>
