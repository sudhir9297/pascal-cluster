type IndexedNode = { id?: string; type?: string; poolId?: string; sourcePoolId?: string; targetPoolId?: string; poolIds?: string[] }
const cache = new WeakMap<object, ReturnType<typeof buildIndex>>()
function buildIndex(nodes: Record<string, unknown>) {
  const pools: unknown[] = []
  const attachments = new Map<string, unknown[]>()
  const connections: unknown[] = []
  for (const value of Object.values(nodes)) {
    if (!value || typeof value !== 'object') continue
    const node = value as IndexedNode
    if (node.type === 'pool:pool') pools.push(value)
    if (node.poolId) {
      const list = attachments.get(node.poolId) ?? []
      list.push(value)
      attachments.set(node.poolId, list)
    }
    if (node.type === 'pool:spillover' || node.type === 'pool:shared-joint') connections.push(value)
  }
  return { pools, attachments, connections }
}
/** Scene snapshots are immutable: all synchronization passes share one inventory. */
export function poolSceneIndex(nodes: Record<string, unknown>) {
  let index = cache.get(nodes)
  if (!index) { index = buildIndex(nodes); cache.set(nodes, index) }
  return index
}
