import { isGridSnapActive, isMagneticSnapActive, useEditor } from '@pascal-app/editor'
import {
  resolveSupportSlabPatch,
  useLiveNodeOverrides,
  useScene,
  type AnyNode,
  type AnyNodeId,
  type FloorplanMoveTarget,
} from '@pascal-app/core'
import { bathDeckFrame, bathDeckParent, bathLevelNode } from '../bath-deck/attachment'
import { fitBathToDeck } from '../bath-deck/fit'
import { BathtubNode } from './schema'
import { bathWallSnap } from './wall-snap'
import { vanityLevelId } from '../freestanding-vanity/wall-placement'
export function bathMovePose(
  node: BathtubNode,
  point: [number, number, number],
  nodes: Readonly<Record<string, AnyNode>>,
  attachmentEnabled = true,
) {
  const deck = bathDeckParent(node, nodes)
  if (deck) {
    const local = bathDeckFrame.planToLocal(deck as unknown as AnyNode, point[0], 0, point[2])
    const fit = fitBathToDeck({ ...node, position: local }, deck)
    return fit ? { position: fit.position, rotation: fit.rotation } : null
  }
  return (
    (attachmentEnabled
      ? bathWallSnap({
          node: node as unknown as AnyNode,
          candidatePosition: point,
          candidateRotation: node.rotation,
          nodes: nodes as Record<AnyNodeId, AnyNode>,
          levelId: vanityLevelId(node.parentId, nodes) as AnyNodeId | null,
          movingIds: [node.id as AnyNodeId],
        })
      : null) ?? { position: point, rotation: node.rotation }
  )
}
export const bathFloorplanMove: FloorplanMoveTarget<BathtubNode> = ({ node, nodes }) => {
  const original = bathLevelNode(node, nodes)
  let anchor: readonly [number, number] | null = null,
    latest: ReturnType<typeof bathMovePose> = null
  return {
    affectedIds: [node.id as AnyNodeId],
    apply({ planPoint }) {
      anchor ??= planPoint
      const point: [number, number, number] = [
        original.position[0] + planPoint[0] - anchor[0],
        node.position[1],
        original.position[2] + planPoint[1] - anchor[1],
      ]
      if (isGridSnapActive()) {
        const step = useEditor.getState().gridSnapStep
        if (step > 0) {
          point[0] = Math.round(point[0] / step) * step
          point[2] = Math.round(point[2] / step) * step
        }
      }
      latest = bathMovePose(
        node,
        point,
        useScene.getState().nodes,
        isGridSnapActive() || isMagneticSnapActive(),
      )
      if (latest && !bathDeckParent(node, nodes))
        latest = {
          ...latest,
          ...resolveSupportSlabPatch(
            { ...node, ...latest } as unknown as AnyNode,
            useScene.getState().nodes,
          ),
        }
      if (latest) useLiveNodeOverrides.getState().set(node.id, latest)
      else useLiveNodeOverrides.getState().clearFields(node.id, ['position', 'rotation'])
    },
    canCommit: () => latest !== null,
    commit() {
      if (latest) useScene.getState().updateNode(node.id as AnyNodeId, latest as Partial<AnyNode>)
      useLiveNodeOverrides.getState().clearFields(node.id, ['position', 'rotation'])
    },
  }
}
