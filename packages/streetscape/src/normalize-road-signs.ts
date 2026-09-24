import { type AnyNode, type AnyNodeId, useScene } from '@pascal-app/core'
import { dedupeRoadSignChildIds } from './road-sign-scene-normalization'

let normalizing = false

/** Repair duplicate road-sign references already present in a loaded scene. */
export function normalizeRoadSignScene(): void {
  if (normalizing) return

  const state = useScene.getState()
  const repairs: Array<{ id: AnyNodeId; children: string[] }> = []

  for (const node of Object.values(state.nodes)) {
    if (!('children' in node) || !Array.isArray(node.children)) continue

    const children = node.children as readonly string[]
    const normalized = dedupeRoadSignChildIds(children, state.nodes)
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
useScene.subscribe(normalizeRoadSignScene)
