import {
  type AnyNode, type AnyNodeId, type ParametricDescriptor, GROUND_SUPPORT_ID,
  getCeilingClampBound, getWallEffectiveHeightForNodes, nodeRegistry,
  resolveCeilingHeight, resolveSelectionProxyId, terrainSupportLift,
  useLiveNodeOverrides, useScene,
} from '@pascal-app/core'

const MIXED = { kind: 'mixed' } as const

type Nodes = Readonly<Record<string, AnyNode | undefined>>

export function resolveUniqueSelectionIds(ids: readonly string[], nodes: Nodes): AnyNodeId[] {
  const resolved: AnyNodeId[] = []
  const seen = new Set<string>()
  for (const id of ids) {
    const node = nodes[id]
    if (!node) continue
    const actual = resolveSelectionProxyId(node, nodes)
    if (seen.has(actual)) continue
    seen.add(actual)
    resolved.push(actual)
  }
  return resolved
}

export function resolveHomogeneousSelection(ids: readonly string[], nodes: Nodes): AnyNode['type'] | null {
  const resolved = resolveUniqueSelectionIds(ids, nodes)
  if (resolved.length < 2) return null
  const type = nodes[resolved[0]!]?.type
  return type && resolved.every((id) => nodes[id]?.type === type) ? type : null
}

export function fieldVisibleForAll(ids: readonly string[], visibleIf: ((node: AnyNode) => boolean) | undefined, nodes: Nodes): boolean {
  return !visibleIf || ids.every((id) => { const node = nodes[id]; return !!node && visibleIf(node) })
}

export function reduceFieldValue(ids: readonly string[], key: string, nodes: Nodes): { kind: 'same'; value: unknown } | typeof MIXED {
  let seen = false
  let shared: unknown
  for (const id of ids) {
    const node = nodes[id]
    if (!node) continue
    const value = (node as Record<string, unknown>)[key]
    if (seen && !(Object.is(shared, value) ||
      Array.isArray(shared) && Array.isArray(value) && shared.length === value.length && shared.every((part, index) => Object.is(part, value[index])))) return MIXED
    shared = value
    seen = true
  }
  return seen ? { kind: 'same', value: shared } : MIXED
}

export function reduceHeightBoundMode(ids: readonly string[], nodes: Nodes): { kind: 'same'; value: 'storey' | 'custom' } | typeof MIXED {
  const first = ids[0] ? nodes[ids[0]] : undefined
  if (!first) return MIXED
  const value = (first as { height?: number }).height == null ? 'storey' : 'custom'
  return ids.every((id) => {
    const node = nodes[id]
    return node && ((node as { height?: number }).height == null ? 'storey' : 'custom') === value
  }) ? { kind: 'same', value } : MIXED
}

export function commitMultiNodeFields(
  ids: readonly AnyNodeId[], patchFor: (node: AnyNode) => Partial<AnyNode>,
  parametrics?: Pick<ParametricDescriptor<AnyNode>, 'derive' | 'reconcile'>,
): void {
  const scene = useScene.getState()
  const updates: { id: AnyNodeId; data: Partial<AnyNode> }[] = []
  const followUps: { id: AnyNodeId; data: Partial<AnyNode> }[] = []
  const keys = new Set<string>()
  for (const id of ids) {
    const node = scene.nodes[id]
    if (!node) continue
    let patch = patchFor(node)
    if (!Object.keys(patch).length) continue
    if (parametrics?.derive) patch = { ...patch, ...parametrics.derive({ ...node, ...patch } as AnyNode, patch, node) } as Partial<AnyNode>
    updates.push({ id, data: patch })
    for (const key of Object.keys(patch)) keys.add(key)
  }
  if (parametrics?.reconcile) {
    const pendingNodes = { ...scene.nodes }
    for (const { id, data } of updates) pendingNodes[id] = { ...scene.nodes[id], ...data } as AnyNode
    for (const { id } of updates) {
      followUps.push(...parametrics.reconcile(scene.nodes[id]!, pendingNodes[id]!, pendingNodes))
    }
  }
  const live = useLiveNodeOverrides.getState()
  for (const id of ids) {
    if (keys.size) live.clearFields(id, [...keys])
    scene.markDirty(id)
  }
  if (updates.length || followUps.length) scene.updateNodes([...updates, ...followUps])
}

export function commitParametricNodeFields(id: AnyNodeId, patch: Record<string, unknown>): void {
  const node = useScene.getState().nodes[id]
  if (!node) return
  const parametrics = nodeRegistry.get(node.type)?.parametrics as ParametricDescriptor<AnyNode> | undefined
  commitMultiNodeFields([id], () => patch as Partial<AnyNode>, parametrics)
}

export function applyMultiHeightMode(
  ids: readonly AnyNodeId[], next: 'storey' | 'custom', parametrics: ParametricDescriptor<AnyNode>,
): void {
  const nodes = useScene.getState().nodes as Record<string, AnyNode>
  commitMultiNodeFields(ids, (node) => {
    if (next === 'custom') {
      if ((node as { height?: number }).height != null) return {}
      if (node.type === 'wall') return { height: Math.max(0.1, getWallEffectiveHeightForNodes(node, nodes)) }
      if (node.type === 'ceiling') {
        const resolved = resolveCeilingHeight(node, nodes)
        const parent = node.parentId ? nodes[node.parentId] : undefined
        const max = parent?.type === 'level'
          ? getCeilingClampBound(parent.id, nodes as Record<AnyNodeId, AnyNode>, node.polygon ?? [])
          : Number.POSITIVE_INFINITY
        return { height: Math.min(resolved, max) }
      }
      return {}
    }
    if ((node as { height?: number }).height == null) return {}
    if (node.type === 'wall') {
      const terrainSupported = node.parentId != null &&
        terrainSupportLift(nodes, node.parentId, node.start[0], node.start[1]) != null
      return {
        height: undefined, supportOffset: undefined,
        ...(node.supportSlabId === GROUND_SUPPORT_ID && !terrainSupported ? { supportSlabId: undefined } : {}),
      }
    }
    return { height: undefined }
  }, parametrics)
}
