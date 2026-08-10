type SceneNodeWithType = {
  type?: unknown
}

/**
 * LevelRenderer uses child IDs as React keys. A malformed saved scene can
 * contain the same road-sign ID twice, so remove only duplicate references to
 * actual road-sign nodes while preserving the order of every other child.
 */
export function dedupeRoadSignChildIds(
  children: readonly string[],
  nodes: Readonly<Record<string, SceneNodeWithType>>,
): string[] {
  const roadSignIds = new Set(
    Object.entries(nodes)
      .filter(([, node]) => node.type === 'streetscape:road-sign')
      .map(([id]) => id),
  )
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
