type SceneNodeWithType = {
  type?: unknown
  children?: readonly string[]
}

export type RoadSignNormalizationPlan =
  | { kind: 'all' }
  | { kind: 'changed'; nodeIds: string[] }
  | null

/**
 * Find the smallest part of a scene that needs normalization after a store
 * update. A road-sign add/remove/type change can affect any parent's children,
 * so those updates require a full pass. Ordinary edits only need to inspect
 * nodes whose child arrays changed.
 */
export function planRoadSignNormalization(
  nodes: Readonly<Record<string, SceneNodeWithType>>,
  previousNodes: Readonly<Record<string, SceneNodeWithType>>,
): RoadSignNormalizationPlan {
  if (nodes === previousNodes) return null

  const changedNodeIds = new Set<string>()
  let roadSignMembershipChanged = false

  for (const [id, node] of Object.entries(nodes)) {
    const previous = previousNodes[id]
    if (node === previous) continue
    changedNodeIds.add(id)
    if ((node.type === 'streetscape:road-sign') !== (previous?.type === 'streetscape:road-sign')) {
      roadSignMembershipChanged = true
    }
  }

  for (const [id, previous] of Object.entries(previousNodes)) {
    if (id in nodes) continue
    changedNodeIds.add(id)
    if (previous.type === 'streetscape:road-sign') roadSignMembershipChanged = true
  }

  if (changedNodeIds.size === 0) return null
  if (roadSignMembershipChanged) return { kind: 'all' }

  const nodeIds = [...changedNodeIds].filter((id) => {
    const node = nodes[id]
    const previous = previousNodes[id]
    return Array.isArray(node?.children) && node.children !== previous?.children
  })

  return nodeIds.length ? { kind: 'changed', nodeIds } : null
}

export function getRoadSignIds(
  nodes: Readonly<Record<string, SceneNodeWithType>>,
): Set<string> {
  const roadSignIds = new Set<string>()
  for (const [id, node] of Object.entries(nodes)) {
    if (node.type === 'streetscape:road-sign') roadSignIds.add(id)
  }
  return roadSignIds
}

/**
 * LevelRenderer uses child IDs as React keys. A malformed saved scene can
 * contain the same road-sign ID twice, so remove only duplicate references to
 * actual road-sign nodes while preserving the order of every other child.
 */
export function dedupeRoadSignChildIds(
  children: readonly string[],
  roadSignIds: ReadonlySet<string>,
): string[] {
  const seen = new Set<string>()
  let changed = false

  const normalized = children.filter((childId) => {
    if (!roadSignIds.has(childId)) return true
    if (seen.has(childId)) {
      changed = true
      return false
    }
    seen.add(childId)
    return true
  })

  return changed ? normalized : [...children]
}
