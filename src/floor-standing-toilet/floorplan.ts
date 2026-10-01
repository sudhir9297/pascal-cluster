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
import { toiletOutline } from './profile'
import { toiletLayout } from './schema'
import type { FloorStandingToiletNode } from './schema'
import { vanityLevelId } from '../freestanding-vanity/wall-placement'
import {
  toiletPlacement,
  toiletPlacementInPlan,
  toiletPlanPose,
  type ToiletPlacement,
} from './placement'

export function toiletFloorplan(
  node: FloorStandingToiletNode,
  ctx: GeometryContext,
): FloorplanGeometry | null {
  const parent = ctx.resolve((node.wallId ?? node.parentId) as AnyNodeId)
  if (parent?.type !== 'wall') return null
  const wall = getEffectiveNode(parent)
  const attachment = toiletPlacement(
    node,
    wall,
    node.position[0],
    node.side,
    0,
    true,
  )
  const pose = toiletPlanPose(
    attachment ? { ...node, ...attachment } : node,
    wall,
  )
  const c = Math.cos(pose.yaw),
    s = Math.sin(pose.yaw)
  const layout = toiletLayout(node)
  const transform = ([x, z]: [number, number]) => [
    pose.x + x * c + z * s,
    pose.z - x * s + z * c,
  ]
  const path = (points: [number, number][]) =>
    `M${points.map((p) => transform(p).join(',')).join('L')}Z`
  const bowl = toiletOutline(node).map(
    ([x, z]) => [x, z - layout.rearSpace / 2] as [number, number],
  )
  const stroke = ctx.viewState?.selected
    ? (ctx.viewState.palette?.selectedStroke ?? '#8b5cf6')
    : '#737373'
  const children: FloorplanGeometry[] = [
    {
      kind: 'path',
      d: path(bowl),
      fill: '#ffffff',
      stroke,
      strokeWidth: 0.012,
      cursor: 'move',
    },
  ]
  if (node.seatEnabled)
    children.push({
      kind: 'path',
      d: path(
        toiletOutline(node, node.width - 0.09, node.depth - 0.1).map(
          ([x, z]) => [x, z - layout.rearSpace / 2],
        ),
      ),
      fill: 'none',
      stroke,
      strokeWidth: 0.008,
    })
  if (layout.external) {
    const rear = layout.projection / 2,
      half = node.tankWidth / 2
    children.push({
      kind: 'path',
      d: path([
        [-half, rear],
        [half, rear],
        [half, rear - node.tankDepth],
        [-half, rear - node.tankDepth],
      ]),
      fill: '#ffffff',
      stroke,
      strokeWidth: 0.012,
      cursor: 'move',
    })
  }
  return { kind: 'group', children }
}

export const toiletFloorplanMove: FloorplanMoveTarget<
  FloorStandingToiletNode
> = ({ node }) => {
  const nodes = useScene.getState().nodes
  const parent = nodes[(node.wallId ?? node.parentId) as AnyNodeId]
  // Track the attachment point on the wall, so deep toilets remain within the snap radius.
  const original =
    parent?.type === 'wall'
      ? toiletPlanPose(
          { ...node, position: [node.position[0], node.position[1], 0] },
          parent,
        )
      : { x: node.position[0], z: node.position[2] }
  const levelId = vanityLevelId(node.parentId, nodes)
  let anchor: readonly [number, number] | null = null
  let latest: ToiletPlacement | null = null
  return {
    affectedIds: [node.id as AnyNodeId],
    apply({ planPoint }) {
      anchor ??= planPoint
      const point: [number, number] = [
        original.x + planPoint[0] - anchor[0],
        original.z + planPoint[1] - anchor[1],
      ]
      const step = isGridSnapActive() ? useEditor.getState().gridSnapStep : 0
      latest = toiletPlacementInPlan(
        node,
        point,
        useScene.getState().nodes,
        levelId,
        step,
      )
      if (latest) useLiveNodeOverrides.getState().set(node.id, latest)
    },
    canCommit: () => latest !== null,
    commit() {
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
      useScene
        .getState()
        .updateNode(node.id as AnyNodeId, latest as Partial<AnyNode>)
    },
  }
}
