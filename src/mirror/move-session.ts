import {useScene,useLiveNodeOverrides,type FloorplanMoveTarget,type AnyNode,type AnyNodeId} from '@pascal-app/core'
import {vanityLevelId} from '../freestanding-vanity/wall-placement'
import {mirrorPlacementInPlan,mirrorPlanPose,type MirrorPlacement} from './placement'
import type {MirrorNode} from './schema'
export const createMirrorPlanMove = ({ node, gridStep }: Parameters<FloorplanMoveTarget<MirrorNode>>[0] & { gridStep?: () => number }): ReturnType<FloorplanMoveTarget<MirrorNode>> => {
  const nodes = useScene.getState().nodes
  const parent = nodes[(node.wallId ?? node.parentId) as AnyNodeId]
  // Track the attachment point on the wall, so the mirror remains within the snap radius.
  const original =
    parent?.type === 'wall'
      ? mirrorPlanPose(
          { ...node, position: [node.position[0], node.position[1], 0] },
          parent,
        )
      : { x: node.position[0], z: node.position[2] }
  const levelId = vanityLevelId(node.parentId, nodes)
  let anchor: readonly [number, number] | null = null
  let latest: MirrorPlacement | null = null
  return {
    affectedIds: [node.id as AnyNodeId],
    apply({ planPoint }) {
      anchor ??= planPoint
      const point: [number, number] = [
        original.x + planPoint[0] - anchor[0],
        original.z + planPoint[1] - anchor[1],
      ]
      const step = gridStep?.() ?? 0
      latest = mirrorPlacementInPlan(
        node,
        point,
        useScene.getState().nodes,
        levelId,
        step,
      )
      if (latest) useLiveNodeOverrides.getState().set(node.id, latest)
      else useLiveNodeOverrides.getState().clearFields(node.id, [
        'parentId', 'wallId', 'position', 'rotation', 'side', 'mountingHeight',
      ])
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
