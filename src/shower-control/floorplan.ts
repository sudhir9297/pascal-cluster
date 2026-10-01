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
import { ShowerControlNode, exposedControl } from './schema'
import { vanityLevelId } from '../freestanding-vanity/wall-placement'
import {
  showerArmPlacement,
  showerArmPlacementInPlan,
  showerArmPlanPose,
  type ShowerArmPlacement,
} from '../shower-arm/placement'

export function showerControlFloorplan(
  node: ShowerControlNode,
  ctx: GeometryContext,
): FloorplanGeometry | null {
  const parent = ctx.resolve((node.wallId ?? node.parentId) as AnyNodeId)
  if (parent?.type !== 'wall') return null
  const wall = getEffectiveNode(parent)
  const attachment = showerArmPlacement(node, wall, node.position[0], node.side, 0, true)
  const pose = showerArmPlanPose(attachment ? { ...node, ...attachment } : node, wall)
  const half = Math.max(
    (exposedControl(node) ? node.bodyWidth : node.plateWidth) / 2,
    node.spoutEnabled && exposedControl(node)
      ? Math.abs(Math.sin((node.spoutSwivel * Math.PI) / 180)) * node.spoutLength +
          (node.spoutStyle.startsWith('waterfall') ? node.spoutWidth : node.tubeSize) / 2
      : 0,
  )
  const depth = exposedControl(node)
    ? node.projection +
      Math.max(node.handleProjection, node.spoutEnabled ? node.spoutLength + node.tubeSize : 0)
    : node.handleProjection + node.flangeThickness
  const points = [
    [-half, 0],
    [half, 0],
    [half, exposedControl(node) ? depth : node.handleProjection + node.flangeThickness],
    [-half, exposedControl(node) ? depth : node.handleProjection + node.flangeThickness],
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

export const showerControlFloorplanMove: FloorplanMoveTarget<ShowerControlNode> = ({ node }) => {
  const nodes = useScene.getState().nodes
  const parent = nodes[(node.wallId ?? node.parentId) as AnyNodeId]
  // Track the attachment point on the wall, so deep showerArms remain within the snap radius.
  const original =
    parent?.type === 'wall'
      ? showerArmPlanPose({ ...node, position: [node.position[0], node.position[1], 0] }, parent)
      : { x: node.position[0], z: node.position[2] }
  const levelId = vanityLevelId(node.parentId, nodes)
  let anchor: readonly [number, number] | null = null
  let latest: ShowerArmPlacement | null = null
  return {
    affectedIds: [node.id as AnyNodeId],
    apply({ planPoint }) {
      anchor ??= planPoint
      const point: [number, number] = [
        original.x + planPoint[0] - anchor[0],
        original.z + planPoint[1] - anchor[1],
      ]
      const step = isGridSnapActive() ? useEditor.getState().gridSnapStep : 0
      latest = showerArmPlacementInPlan(node, point, useScene.getState().nodes, levelId, step)
      if (latest) useLiveNodeOverrides.getState().set(node.id, latest)
      else
        useLiveNodeOverrides
          .getState()
          .clearFields(node.id, [
            'parentId',
            'wallId',
            'position',
            'rotation',
            'side',
            'mountingHeight',
          ])
    },
    canCommit: () => latest !== null,
    commit() {
      if (!latest) return
      const wall = useScene.getState().nodes[latest.wallId as AnyNodeId]
      if (wall?.type !== 'wall' || latest.parentId !== wall.id) return
      latest = showerArmPlacement(node, wall, latest.position[0], latest.side)
      if (!latest) return
      useLiveNodeOverrides
        .getState()
        .clearFields(node.id, [
          'parentId',
          'wallId',
          'position',
          'rotation',
          'side',
          'mountingHeight',
        ])
      useScene.getState().updateNode(node.id as AnyNodeId, latest as Partial<AnyNode>)
    },
  }
}
