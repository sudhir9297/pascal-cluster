import {
  type AnyNode, type AnyNodeId, type FloorplanGeometry, type FloorplanMoveTarget,
  type GeometryContext, getEffectiveNode, useLiveNodeOverrides, useScene,
} from '@pascal-app/core'
import { isGridSnapActive, useEditor } from '@pascal-app/editor'
import type { WallMountedVanityNode } from './schema'
import { vanityLevelId, wallVanityPlacement, wallVanityPlacementInPlan, wallVanityPlanPose, type WallVanityPlacement } from './wall-placement'

export function wallVanityFloorplan(node: WallMountedVanityNode, ctx: GeometryContext): FloorplanGeometry | null {
  const parent = ctx.resolve((node.wallId ?? node.parentId) as AnyNodeId)
  if (parent?.type !== 'wall') return null
  const wall = getEffectiveNode(parent)
  const attachment = wallVanityPlacement(node, wall, node.position[0], node.side, 0, true)
  const pose = wallVanityPlanPose(attachment ? { ...node, ...attachment } : node, wall)
  const c = Math.cos(pose.yaw), s = Math.sin(pose.yaw)
  const overhang = node.countertopEnabled ? node.countertopOverhang : 0
  const halfW = node.width / 2 + overhang
  const frontZ = -node.depth / 2 - overhang
  const backZ = node.depth / 2
  const points = [[-halfW, frontZ], [halfW, frontZ], [halfW, backZ], [-halfW, backZ]].map(([x, z]) =>
    [pose.x + x! * c + z! * s, pose.z - x! * s + z! * c] as [number, number])
  return {
    kind: 'polygon', points, fill: '#ffffff',
    stroke: ctx.viewState?.selected ? ctx.viewState.palette?.selectedStroke ?? '#8b5cf6' : '#737373',
    strokeWidth: 0.02, cursor: 'move',
  }
}

export const wallVanityFloorplanMove: FloorplanMoveTarget<WallMountedVanityNode> = ({ node }) => {
  const nodes = useScene.getState().nodes
  const parent = nodes[(node.wallId ?? node.parentId) as AnyNodeId]
  // Track the attachment point on the wall, so deep cabinets remain within the snap radius.
  const original = parent?.type === 'wall' ? wallVanityPlanPose({ ...node, position: [node.position[0], node.position[1], 0] }, parent) : { x: node.position[0], z: node.position[2] }
  const levelId = vanityLevelId(node.parentId, nodes)
  let anchor: readonly [number, number] | null = null
  let latest: WallVanityPlacement | null = null
  return {
    affectedIds: [node.id as AnyNodeId],
    apply({ planPoint }) {
      anchor ??= planPoint
      const point: [number, number] = [original.x + planPoint[0] - anchor[0], original.z + planPoint[1] - anchor[1]]
      const step = isGridSnapActive() ? useEditor.getState().gridSnapStep : 0
      latest = wallVanityPlacementInPlan(node, point, useScene.getState().nodes, levelId, step)
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
