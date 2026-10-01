import { type AnyNode, type AnyNodeId } from '@pascal-app/core'
import { ShowerHeadNode, showerHeadPresets } from '../shower-head/schema'
import { HandShowerNode } from '../hand-shower/schema'
import { ShowerHoseNode } from '../shower-hose/schema'
import { type ShowerAssemblyNode } from './schema'
import { assemblySockets } from './targets'

export function assemblyChildren(n: ShowerAssemblyNode) {
  const slots = assemblySockets(n)
  const headSlot = slots.find((s) => s.id === 'shower-head')
  const handSlot = slots.find((s) => s.id === 'hand-shower')
  const hoseSlot = slots.find((s) => s.id === 'hose')
  const head = headSlot
    ? ShowerHeadNode.parse({
        ...showerHeadPresets.find((p) => p.style === n.defaultHead),
        parentId: n.id,
        position: headSlot.position,
        name: 'Overhead shower',
      })
    : null
  const hand = handSlot
    ? HandShowerNode.parse({
        style: n.defaultHand,
        parentId: n.id,
        position: handSlot.position,
        name: 'Hand shower',
      })
    : null
  const hose =
    hand && hoseSlot
      ? ShowerHoseNode.parse({
          parentId: n.id,
          position: hoseSlot.position,
          targetId: hand.id,
          name: 'Shower hose',
          length: 1.6,
        })
      : null
  return { head, hand, hose }
}

export function createAssemblyChanges(n: ShowerAssemblyNode) {
  const { head, hand, hose } = assemblyChildren(n)
  const children = [head, hand, hose].filter((child) => child !== null)
  return {
    create: [
      {
        node: { ...n, children: children.map((child) => child.id) } as unknown as AnyNode,
        parentId: n.parentId as AnyNodeId,
      },
      ...children.map((child) => ({
        node: child as unknown as AnyNode,
        parentId: n.id as AnyNodeId,
      })),
    ],
  }
}
