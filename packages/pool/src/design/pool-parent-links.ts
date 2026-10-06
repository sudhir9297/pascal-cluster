type SceneNode = {
  id: string
  type: string
  parentId?: string | null
  children?: readonly string[]
}

/** Restore the render tree from pool parent IDs before deriving site openings. */
export function poolParentLinkUpdates(nodes: Record<string, SceneNode>, affectedPoolIds?: ReadonlySet<string>) {
  const pools = Object.values(nodes).filter((node) =>
    node.type === 'pool:pool' && (!affectedPoolIds || affectedPoolIds.has(node.id)) && Boolean(node.parentId && Array.isArray(nodes[node.parentId]?.children)),
  )
  const poolById = new Map(pools.map((pool) => [pool.id, pool]))
  const nextChildren = new Map<string, string[]>()

  for (const node of Object.values(nodes)) {
    if (!Array.isArray(node.children)) continue
    nextChildren.set(node.id, node.children.filter((childId) => {
      const pool = poolById.get(childId)
      return !pool || pool.parentId === node.id
    }))
  }

  for (const pool of pools) {
    if (!pool.parentId) continue
    const children = nextChildren.get(pool.parentId)
    if (children && !children.includes(pool.id)) children.push(pool.id)
  }

  return Object.values(nodes).flatMap((node) => {
    const next = nextChildren.get(node.id)
    if (!next || JSON.stringify(next) === JSON.stringify(node.children)) return []
    return [{ id: node.id, data: { children: next } }]
  })
}
