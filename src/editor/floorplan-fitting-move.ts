import { type AnyNode, type AnyNodeId, type FloorplanMoveTarget, useLiveNodeOverrides } from '@pascal-app/core'
import { isGridSnapActive, useEditor } from '@pascal-app/editor'
import { PoolNode } from '../core/schema'
import { resolvePoolAttachment } from '../design/pool-attachments'
import { getPoolDrainPlacement } from '../drain/design/pool-placement'
import type { PoolDrainNode } from '../drain/core/schema'
import type { PoolInletNode } from '../inlet/core/schema'
import type { PoolSkimmerNode } from '../skimmer/core/schema'
import { findNearestPoolWall } from '../skimmer/design/placement'
import type { PoolStairNode } from '../stair/core/schema'

type Fitting = PoolDrainNode | PoolInletNode | PoolSkimmerNode | PoolStairNode

/** Keep the same attachment rules in the host's plan move session and 3D tools. */
export const poolFittingFloorplanMove: FloorplanMoveTarget<Fitting> = ({ node, nodes, sceneApi }) => {
  let next: Fitting | null = null
  return {
    affectedIds: [node.id as AnyNodeId],
    apply: ({ planPoint }) => {
      const poolResult = PoolNode.safeParse((sceneApi?.nodes() ?? nodes)[node.poolId as AnyNodeId])
      next = null
      if (poolResult.success) {
        const pool = poolResult.data
        const step = isGridSnapActive() ? useEditor.getState().gridSnapStep : 0
        const [x, z] = planPoint.map(value => step > 0 ? Math.round(value / step) * step : value)
        const placement = node.type === 'pool:drain'
          ? getPoolDrainPlacement(pool, [x!, pool.position[1], z!])
          : findNearestPoolWall([x!, z!], [pool])
        if (placement) {
          // The placement helpers return level-space poses. Recompute the
          // mounted child pose once, clearing the drain's previous floor anchor.
          const candidate = { ...node, ...placement, parentId: pool.parentId,
            ...(node.type === 'pool:drain' ? { floorAnchor: undefined } : {}) }
          next = resolvePoolAttachment(candidate, pool) as Fitting | null
        }
      }
      const overrides = useLiveNodeOverrides.getState()
      if (next) overrides.set(node.id, { ...next })
      else overrides.clear(node.id)
    },
    canCommit: () => next !== null,
    commit: () => {
      if (!next || !sceneApi) return
      sceneApi.update(node.id as AnyNodeId, next as unknown as Partial<AnyNode>)
      useLiveNodeOverrides.getState().clear(node.id)
    },
  }
}
