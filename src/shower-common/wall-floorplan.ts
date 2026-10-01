import {
  type AnyNode,
  type AnyNodeId,
  type FloorplanMoveTarget,
  useLiveNodeOverrides,
  useScene,
} from '@pascal-app/core'
import { isGridSnapActive, useEditor } from '@pascal-app/editor'
import type { WallFixture } from './wall-tool'
import { vanityLevelId } from '../freestanding-vanity/wall-placement'
import {
  showerArmPlacement,
  showerArmPlacementInPlan,
  showerArmPlanPose,
  type ShowerArmPlacement,
} from '../shower-arm/placement'

export function wallFixtureFloorplanMove<N extends WallFixture>(
  { node }: Parameters<FloorplanMoveTarget<N>>[0],
  filterPlacement?: (
    node: N,
    pose: ShowerArmPlacement,
    nodes: Readonly<Record<string, AnyNode>>,
  ) => ShowerArmPlacement | null,
): ReturnType<FloorplanMoveTarget<N>> {
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
      if (latest && filterPlacement)
        latest = filterPlacement(node, latest, useScene.getState().nodes)
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
      if (latest && filterPlacement)
        latest = filterPlacement(node, latest, useScene.getState().nodes)
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
