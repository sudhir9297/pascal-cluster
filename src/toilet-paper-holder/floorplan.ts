import {useScene,useLiveNodeOverrides,type FloorplanMoveTarget,type GeometryContext,type AnyNode,type AnyNodeId} from '@pascal-app/core'
import {isGridSnapActive,useEditor} from '@pascal-app/editor'
import {vanityLevelId} from '../freestanding-vanity/wall-placement'
import {holderPlacementInPlan,holderPlanPose,type HolderPlacement} from './placement'
import type {ToiletPaperHolderNode} from './schema'
export function holderFloorplan(n: ToiletPaperHolderNode, ctx: GeometryContext) {
  const wall = ctx.resolve((n.wallId ?? n.parentId) as AnyNodeId)
  if(wall?.type !== 'wall') return null
  const p = holderPlanPose(n,wall), c = Math.cos(p.yaw), s = Math.sin(p.yaw)
  const depth = n.projection+n.rollRadius
  return {kind:'polygon' as const,points:[[-n.width/2,0],[n.width/2,0],[n.width/2,depth],[-n.width/2,depth]].map(([x,z])=>[p.x+x!*c+z!*s,p.z-x!*s+z!*c] as [number,number]),fill:'#eeeae3',stroke:ctx.viewState?.selected ? '#8b5cf6' : '#737373',strokeWidth:0.006}
}
export const holderFloorplanMove: FloorplanMoveTarget<
  ToiletPaperHolderNode
> = ({ node }) => {
  const nodes = useScene.getState().nodes
  const parent = nodes[(node.wallId ?? node.parentId) as AnyNodeId]
  // Track the attachment point on the wall, so deep flushPlates remain within the snap radius.
  const original =
    parent?.type === 'wall'
      ? holderPlanPose(
          { ...node, position: [node.position[0], node.position[1], 0] },
          parent,
        )
      : { x: node.position[0], z: node.position[2] }
  const levelId = vanityLevelId(node.parentId, nodes)
  let anchor: readonly [number, number] | null = null
  let latest: HolderPlacement | null = null
  return {
    affectedIds: [node.id as AnyNodeId],
    apply({ planPoint }) {
      anchor ??= planPoint
      const point: [number, number] = [
        original.x + planPoint[0] - anchor[0],
        original.z + planPoint[1] - anchor[1],
      ]
      const step = isGridSnapActive() ? useEditor.getState().gridSnapStep : 0
      latest = holderPlacementInPlan(
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
