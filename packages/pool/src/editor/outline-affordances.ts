import { type AnyNode, type AnyNodeId, type FloorplanAffordance, useLiveNodeOverrides, useScene } from '@pascal-app/core'
import type { PoolNode, PoolPoint } from '../core/schema'
import { editPoolOutline, type PoolOutlinePatch } from '../design/outline-edit'

function localPoint(node: PoolNode, [x, z]: readonly [number, number]): PoolPoint {
  const dx = x - node.position[0], dz = z - node.position[2]
  const angle = node.rotation[1]
  return [dx * Math.cos(angle) - dz * Math.sin(angle), dx * Math.sin(angle) + dz * Math.cos(angle)]
}

function outlineAffordance(action: 'move' | 'insert' | 'delete' | 'incoming' | 'outgoing'): FloorplanAffordance<PoolNode> {
  return {
    start({ node, payload }) {
      const index = (payload as { index?: number }).index
      const id = node.id as AnyNodeId
      let patch: PoolOutlinePatch | null = null
      return {
        affectedIds: [id],
        apply({ planPoint }) {
          if (index === undefined) return
          const next = editPoolOutline(node, action, index,
            action === 'delete' ? undefined : localPoint(node, planPoint))
          if (!next) return
          patch = next
          useLiveNodeOverrides.getState().set(id, patch)
          useScene.getState().markDirty(id)
        },
        canCommit() { return patch !== null },
        commit() {
          if (patch) useScene.getState().updateNode(id, patch as Partial<AnyNode>)
          useLiveNodeOverrides.getState().clear(id)
          useScene.getState().markDirty(id)
        },
      }
    },
  }
}

export const poolOutlineAffordances = {
  'pool-outline-move': outlineAffordance('move'),
  'pool-outline-insert': outlineAffordance('insert'),
  'pool-outline-delete': outlineAffordance('delete'),
  'pool-outline-incoming': outlineAffordance('incoming'),
  'pool-outline-outgoing': outlineAffordance('outgoing'),
}
