import {useScene,useLiveNodeOverrides,type FloorplanMoveTarget,type AnyNode,type AnyNodeId} from '@pascal-app/core'
import {vanityLevelId} from '../freestanding-vanity/wall-placement'
import {towelRailPlacementInPlan,towelRailPlanPose,type TowelRailPlacement} from './placement'
import type {TowelRailNode} from './schema'
export const createTowelRailPlanMove = ({ node, gridStep }: Parameters<FloorplanMoveTarget<TowelRailNode>>[0] & { gridStep?: () => number }): ReturnType<FloorplanMoveTarget<TowelRailNode>> => {
  const nodes = useScene.getState().nodes
  const parent = nodes[(node.wallId ?? node.parentId) as AnyNodeId]
  // Track the attachment point on the wall, so the towelRail remains within the snap radius.
  const original =
    parent?.type === 'wall'
      ? towelRailPlanPose(
          { ...node, position: [node.position[0], node.position[1], 0] },
          parent,
        )
      : { x: node.position[0], z: node.position[2] }
  const levelId = vanityLevelId(node.parentId, nodes)
  let anchor: readonly [number, number] | null = null
  let latest: TowelRailPlacement | null = null
  return {
    affectedIds: [node.id as AnyNodeId],
    apply({ planPoint }) {
      anchor ??= planPoint
      const point: [number, number] = [
        original.x + planPoint[0] - anchor[0],
        original.z + planPoint[1] - anchor[1],
      ]
      const step = gridStep?.() ?? 0
      latest = towelRailPlacementInPlan(
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
