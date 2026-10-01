import {
  useScene,
  useLiveNodeOverrides,
  type FloorplanMoveTarget,
} from '@pascal-app/core'
import { isGridSnapActive, useEditor } from '@pascal-app/editor'
import { vanityLevelId } from '../freestanding-vanity/wall-placement'
import {
  flushPlatePlacementInPlan,
  type WallFlushPlatePlacement,
} from './placement'
import type { WallFlushPlateNode } from './schema'
import {
  type AnyNode,
  type AnyNodeId,
  type GeometryContext,
} from '@pascal-app/core'
import { controlWallPose } from './attachment'
import type { FlushControlNode } from './schema'
import { controlDimensions } from './schema'
import { flushPlatePlanPose } from './placement'
export function flushControlFloorplan(
  n: FlushControlNode,
  ctx: GeometryContext,
) {
  const nodes: Record<string, AnyNode> = {}
  let id = n.parentId
  while (id && !nodes[id]) {
    const raw = ctx.resolve(id as AnyNodeId)
    if (!raw) break
    nodes[id] = raw
    id = raw.parentId
  }
  const target = controlWallPose(n, nodes)
  if (!target) return null
  const pose = flushPlatePlanPose(target.pose, target.wall),
    d = controlDimensions(n),
    c = Math.cos(pose.yaw),
    s = Math.sin(pose.yaw)
  const top = 'mount' in n && n.mount === 'top'
  const depth = top ? d.height : d.depth
  const near = top ? -depth / 2 : 0,
    far = top ? depth / 2 : depth
  return {
    kind: 'polygon' as const,
    points: [
      [-d.width / 2, near],
      [d.width / 2, near],
      [d.width / 2, far],
      [-d.width / 2, far],
    ].map(
      ([x, z]) =>
        [pose.x + x! * c + z! * s, pose.z - x! * s + z! * c] as [
          number,
          number,
        ],
    ),
    fill: '#bbc3cb',
    stroke: ctx.viewState?.selected ? '#8b5cf6' : '#737373',
    strokeWidth: 0.006,
  }
}

export const flushPlateFloorplanMove: FloorplanMoveTarget<
  WallFlushPlateNode
> = ({ node }) => {
  const nodes = useScene.getState().nodes
  const parent = nodes[(node.wallId ?? node.parentId) as AnyNodeId]
  // Track the attachment point on the wall, so deep flushPlates remain within the snap radius.
  const original =
    parent?.type === 'wall'
      ? flushPlatePlanPose(
          { ...node, position: [node.position[0], node.position[1], 0] },
          parent,
        )
      : { x: node.position[0], z: node.position[2] }
  const levelId = vanityLevelId(node.parentId, nodes)
  let anchor: readonly [number, number] | null = null
  let latest: WallFlushPlatePlacement | null = null
  return {
    affectedIds: [node.id as AnyNodeId],
    apply({ planPoint }) {
      anchor ??= planPoint
      const point: [number, number] = [
        original.x + planPoint[0] - anchor[0],
        original.z + planPoint[1] - anchor[1],
      ]
      const step = isGridSnapActive() ? useEditor.getState().gridSnapStep : 0
      latest = flushPlatePlacementInPlan(
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
