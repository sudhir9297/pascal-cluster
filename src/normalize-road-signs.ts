import { type AnyNode, type AnyNodeId, useScene } from '@pascal-app/core'
import {
  dedupeRoadSignChildIds,
  getRoadSignIds,
  planRoadSignNormalization,
} from './road-sign-scene-normalization'

let normalizing = false
let roadSignIds = getRoadSignIds(useScene.getState().nodes)

function normalizeRoadSignScene(nodeIds?: readonly string[]): void {
  if (normalizing) return

  const state = useScene.getState()
  const repairs: Array<{ id: AnyNodeId; children: string[] }> = []
  const candidates = nodeIds
    ? nodeIds.map((id) => [id, state.nodes[id as AnyNodeId]] as const)
    : Object.entries(state.nodes)

  for (const [id, node] of candidates) {
    if (!node || !('children' in node) || !Array.isArray(node.children)) continue

    const children = node.children as readonly string[]
    const normalized = dedupeRoadSignChildIds(children, roadSignIds)
    if (normalized.length !== children.length) {
      repairs.push({ id: node.id as AnyNodeId, children: normalized })
    }
  }

  if (repairs.length === 0) return

  normalizing = true
  try {
    for (const repair of repairs) {
      useScene.getState().updateNode(repair.id, { children: repair.children } as Partial<AnyNode>)
    }
  } finally {
    normalizing = false
  }
}

// Repair the current scene and any scene restored after this plugin loads.
normalizeRoadSignScene()
useScene.subscribe((state, previous) => {
  if (normalizing || state.nodes === previous.nodes) return
  const plan = planRoadSignNormalization(state.nodes, previous.nodes)
  if (!plan) return

  if (plan.kind === 'all') roadSignIds = getRoadSignIds(state.nodes)
  normalizeRoadSignScene(plan.kind === 'all' ? undefined : plan.nodeIds)
})
