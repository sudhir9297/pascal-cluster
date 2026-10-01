import type { AnyNode, AnyNodeId } from '@pascal-app/core'

export type SlotRef = { hostId: string; slotId: string }
export type AttachmentSlot = SlotRef & { type: string; capacity: number }
export const slotKey = (slot: SlotRef) => JSON.stringify([slot.hostId, slot.slotId])
export const sameSlot = (a: SlotRef | null, b: SlotRef | null) => Boolean(a && b && slotKey(a) === slotKey(b))

/** Shared capacity/compatibility policy. Callers supply their domain's slot adapter. */
export function attachmentChanges(node: AnyNode, slot: AttachmentSlot | null, plugType: string,
  nodes: Readonly<Record<string, AnyNode>>, occupantSlot: (node: AnyNode) => SlotRef | null, existingId?: string) {
  const host = node.parentId ? nodes[node.parentId] : null
  if (!host) throw new Error('Attachment host does not exist')
  const seen = new Set([node.id as string])
  for (let ancestor: AnyNode | null | undefined = host; ancestor; ancestor = ancestor.parentId ? nodes[ancestor.parentId] : null) {
    if (seen.has(ancestor.id)) throw new Error('Attachment would create a cycle')
    seen.add(ancestor.id)
  }
  if (slot && (!nodes[slot.hostId] || slot.type !== plugType || slot.capacity !== 1)) throw new Error('Incompatible attachment slot')
  const occupied = slot ? Object.values(nodes).filter(other => other.id !== existingId && sameSlot(slot, occupantSlot(other))).map(other => other.id as AnyNodeId) : []
  return existingId ? { delete: occupied, update: [{ id: existingId as AnyNodeId, data: node as Partial<AnyNode> }] }
    : { delete: occupied, create: [{ node, parentId: host.id as AnyNodeId }] }
}
