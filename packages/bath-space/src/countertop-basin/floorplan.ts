import {
  type AnyNode, type AnyNodeId, type FloorplanMoveTarget, type GeometryContext,
  useLiveNodeOverrides, useScene, sceneRegistry,
} from '@pascal-app/core'
import { Ray, Vector3 } from 'three'
import { vanityLevelId } from '../freestanding-vanity/wall-placement'
import { basinMoveSurface, basinMoveCandidate } from './move-placement'
import { isGridSnapActive, useEditor } from '@pascal-app/editor'
import { semiRecessedOutline } from './semi-recessed-geometry'
import { basinOutline } from './geometry'
import { basinDepth, BasinNode, SEMI_RECESSED_BASIN } from './schema'
import { basinDetachPatch, basinLevelPose, basinVanityParent, vanityLevelToLocal } from './attachment'

export function basinFloorplan(node: BasinNode, ctx: GeometryContext) {
  const parent = node.parentId ? ctx.resolve(node.parentId as AnyNodeId) : undefined
  const nodes: Record<string, AnyNode> = {}
  if (parent) {
    nodes[parent.id] = parent
    if (parent.parentId) {
      const host = ctx.resolve(parent.parentId as AnyNodeId)
      if (host) nodes[host.id] = host
    }
  }
  const pose = basinLevelPose(node, nodes), c = Math.cos(pose.rotation), s = Math.sin(pose.rotation)
  return { kind: 'polygon' as const, fill: '#ffffff', stroke: ctx.viewState?.selected ? ctx.viewState.palette?.selectedStroke ?? '#8b5cf6' : '#737373', strokeWidth: 0.015, cursor: 'move',
    points: (node.type === SEMI_RECESSED_BASIN ? semiRecessedOutline : basinOutline)(node.shape, node.width, basinDepth(node)).map(([x, z]) =>
      [pose.position[0] + x * c + z * s, pose.position[2] - x * s + z * c] as [number, number]) }
}

export const basinFloorplanMove: FloorplanMoveTarget<BasinNode> = ({ node, nodes }) => {
  const original = basinLevelPose(node, nodes)
  let anchor: readonly [number, number] | null = null
  let latest: Partial<BasinNode> | null = null
  return {
    affectedIds: [node.id as AnyNodeId],
    apply({ planPoint }) {
      anchor ??= planPoint
      const currentNodes = useScene.getState().nodes
      let x = original.position[0] + planPoint[0] - anchor[0], z = original.position[2] + planPoint[1] - anchor[1]
      const step = isGridSnapActive() ? useEditor.getState().gridSnapStep : 0
      const levelId = vanityLevelId(node.parentId, currentNodes)
      const level = levelId ? sceneRegistry.nodes.get(levelId) : undefined
      if (level && levelId) {
        level.updateWorldMatrix(true, true)
        const matrix = level.matrixWorld
        const ray = new Ray(new Vector3(x, 10000, z), new Vector3(0, -1, 0)).applyMatrix4(matrix)
        const ownRoot = sceneRegistry.nodes.get(node.id)
        const hit = basinMoveSurface(ray, level, matrix, node, sceneRegistry.nodes, currentNodes, ownRoot ? [ownRoot] : [], step)
        latest = hit ? basinMoveCandidate(node, hit, levelId, sceneRegistry.nodes, currentNodes).placed : null
      } else {
        if (step > 0) { x = Math.round(x / step) * step; z = Math.round(z / step) * step }
        const parent = basinVanityParent(node, currentNodes)
        const position = parent ? vanityLevelToLocal(parent, [x, original.position[1], z], currentNodes) : [x, node.position[1], z] as [number, number, number]
        const moved = { ...node, position }
        latest = basinDetachPatch(moved, currentNodes) ?? { position, parentId: node.parentId, rotation: node.rotation }
      }
      if (latest) useLiveNodeOverrides.getState().set(node.id, latest)
      else useLiveNodeOverrides.getState().clearFields(node.id, ['position', 'parentId', 'rotation'])
    },
    canCommit: () => latest !== null,
    commit() {
      if (!latest) return
      useScene.getState().updateNode(node.id as AnyNodeId, latest as Partial<AnyNode>)
      useLiveNodeOverrides.getState().clearFields(node.id, ['position', 'parentId', 'rotation'])
    },
  }
}
