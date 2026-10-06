
import { basinModelRotation } from '../countertop-basin/orientation'
import {
  type AnyNode, type AnyNodeId, type FloorplanGeometry, type FloorplanMoveTarget,
  type GeometryContext, getEffectiveNode, useLiveNodeOverrides, useScene,
} from '@pascal-app/core'
import { isGridSnapActive, useEditor } from '@pascal-app/editor'
import { wallBasinOutline } from './profile'
import type { WallSupportedBasinNode } from '../countertop-basin/schema'
import { vanityLevelId } from '../freestanding-vanity/wall-placement'
import { wallBasinPlacement, wallBasinPlacementInPlan, wallBasinPlanPose, type WallBasinPlacement } from './placement'

export function wallBasinFloorplan(node: WallSupportedBasinNode, ctx: GeometryContext): FloorplanGeometry | null {
  const parent = ctx.resolve((node.wallId ?? node.parentId) as AnyNodeId)
  if (parent?.type !== 'wall') return null
  const wall = getEffectiveNode(parent)
  const attachment = wallBasinPlacement(node, wall, node.position[0], node.side, 0, true)
  const pose = wallBasinPlanPose(attachment ? { ...node, ...attachment } : node, wall)
  const c = Math.cos(basinModelRotation(pose.yaw)), s = Math.sin(basinModelRotation(pose.yaw))
  const points = wallBasinOutline(node).map(([x, z]) =>
    [pose.x + x * c + z * s, pose.z - x * s + z * c] as [number, number])
  return {
    kind: 'polygon', points, fill: '#ffffff',
    stroke: ctx.viewState?.selected ? ctx.viewState.palette?.selectedStroke ?? '#8b5cf6' : '#737373',
    strokeWidth: 0.02, cursor: 'move',
  }
}

export const wallBasinFloorplanMove: FloorplanMoveTarget<WallSupportedBasinNode> = ({ node }) => {
  const nodes = useScene.getState().nodes
  const parent = nodes[(node.wallId ?? node.parentId) as AnyNodeId]
  // Track the attachment point on the wall, so deep basins remain within the snap radius.
  const original = parent?.type === 'wall' ? wallBasinPlanPose({ ...node, position: [node.position[0], node.position[1], 0] }, parent) : { x: node.position[0], z: node.position[2] }
  const levelId = vanityLevelId(node.parentId, nodes)
  let anchor: readonly [number, number] | null = null
  let latest: WallBasinPlacement | null = null
  return {
    affectedIds: [node.id as AnyNodeId],
    apply({ planPoint }) {
      anchor ??= planPoint
      const point: [number, number] = [original.x + planPoint[0] - anchor[0], original.z + planPoint[1] - anchor[1]]
      const step = isGridSnapActive() ? useEditor.getState().gridSnapStep : 0
      latest = wallBasinPlacementInPlan(node, point, useScene.getState().nodes, levelId, step)
      if (latest) useLiveNodeOverrides.getState().set(node.id, latest)
    },
    canCommit: () => latest !== null,
    commit() {
      if (!latest) return
      useLiveNodeOverrides.getState().clearFields(node.id, ['parentId', 'wallId', 'position', 'rotation', 'side'])
      useScene.getState().updateNode(node.id as AnyNodeId, latest as Partial<AnyNode>)
    },
  }
}
