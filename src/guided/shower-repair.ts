import type { AnyNode, AnyNodeId } from '@pascal-app/core'
import { ShowerAssemblyNode } from '../shower-assembly/schema'
import { assemblyChildren } from '../shower-assembly/children'
import { ShowerArmNode } from '../shower-arm/schema'
import { createKitChanges, showerKitPresets } from '../shower-kit/bundle'

export function showerRepairChanges(showerId: string, nodes: Readonly<Record<string, AnyNode>>) {
  const anchor = nodes[showerId]
  if (!anchor) return null
  if (String(anchor.type) === 'bath-space:shower-assembly') {
    const parsed = ShowerAssemblyNode.safeParse(anchor)
    if (!parsed.success) return null
    const children = Object.values(nodes).filter((node) => node.parentId === showerId)
    const defaults = assemblyChildren(parsed.data)
    const head = children.find((node) => String(node.type) === 'bath-space:shower-head') ?? defaults.head
    const hand = children.find((node) => String(node.type) === 'bath-space:hand-shower') ?? defaults.hand
    const existingHose = children.find((node) => String(node.type) === 'bath-space:shower-hose')
    const hose = existingHose ?? (defaults.hose && hand ? { ...defaults.hose, targetId: hand.id } : null)
    const missing = [head, hand, hose].filter((node): node is NonNullable<typeof node> => Boolean(node && !nodes[node.id]))
    const update = existingHose && hand && !nodes[(existingHose as unknown as { targetId: string }).targetId] ? [{ id: existingHose.id as AnyNodeId, data: { targetId: hand.id } as Partial<AnyNode> }] : []
    return missing.length || update.length ? { create: missing.map((node) => ({ node: node as unknown as AnyNode, parentId: anchor.id as AnyNodeId })), update } : null
  }
  const kit = anchor.metadata?.showerKit as { presetId?: string; included?: { id: string; name?: string }[] } | undefined
  const preset = showerKitPresets.find((preset) => preset.id === kit?.presetId)
  const parsed = ShowerArmNode.safeParse(anchor)
  if (!preset || !parsed.success || !Array.isArray(kit?.included)) return null
  const defaults = createKitChanges(preset, parsed.data, nodes)
  if (!defaults) return null
  const identities = new Map(defaults.create.map(({ node }) => [node.id, node.id === anchor.id ? anchor.id : kit.included!.find((part) => part.name === node.name)?.id]))
  if ([...identities.values()].some((id) => !id)) return null
  const create = defaults.create.filter(({ node }) => !nodes[identities.get(node.id)!]).map(({ node }) => {
    const raw = node as unknown as { targetId?: string; children?: string[] }
    const parentId = identities.get(node.parentId as AnyNodeId) ?? node.parentId
    return { node: { ...node, id: identities.get(node.id), parentId, children: (raw.children ?? []).map((id) => identities.get(id as AnyNodeId) ?? id), ...(raw.targetId ? { targetId: identities.get(raw.targetId as AnyNodeId) ?? raw.targetId } : {}), metadata: { ...node.metadata, showerKit: kit } } as AnyNode, parentId: parentId as AnyNodeId }
  })
  return create.length ? { create } : null
}
