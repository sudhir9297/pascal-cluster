import {
  getFloorStackedPosition,
  getEffectiveNode,
  type AnyNode,
  type MovableParentFrame,
} from '@pascal-app/core'
import { attachmentChanges } from '../attachments/slots'
import { fitBathToDeck } from './fit'
import { BathtubNode, BATHTUB } from '../bathtub/schema'
import { BATH_DECK, BathDeckNode } from './schema'
export function bathDeckParent(bath: BathtubNode, nodes: Readonly<Record<string, AnyNode>>) {
  const raw = nodes[bath.parentId ?? '']
  return raw && String(raw.type) === BATH_DECK ? BathDeckNode.parse(getEffectiveNode(raw)) : null
}
export function bathDeckLocalY(deck: BathDeckNode, bath: BathtubNode) {
  return deck.height - bath.height + (bath.shape === 'undermount' ? -deck.thickness - 0.002 : 0.025)
}
export function bathLevelNode(bath: BathtubNode, nodes: Readonly<Record<string, AnyNode>> = {}) {
  const deck = bathDeckParent(bath, nodes)
  if (!deck)
    return {
      ...bath,
      position: getFloorStackedPosition({
        node: bath as unknown as AnyNode,
        nodes: nodes as Record<string, AnyNode>,
        position: bath.position,
      }),
    }
  const deckY = getFloorStackedPosition({
    node: deck as unknown as AnyNode,
    nodes: nodes as Record<string, AnyNode>,
    position: deck.position,
  })[1]
  const c = Math.cos(deck.rotation),
    s = Math.sin(deck.rotation),
    [x, , z] = bath.position
  return {
    ...bath,
    parentId: deck.parentId,
    position: [
      deck.position[0] + x * c + z * s,
      deckY + bathDeckLocalY(deck, bath),
      deck.position[2] - x * s + z * c,
    ] as [number, number, number],
    rotation: deck.rotation + bath.rotation,
  }
}

export const bathDeckFrame: MovableParentFrame = {
  independent: true,
  resolveParent: (raw, nodes) =>
    bathDeckParent(BathtubNode.parse(raw), nodes) as unknown as AnyNode | null,
  parentRotationY: (raw) => BathDeckNode.parse(raw).rotation,
  localToPlan: (raw, [x, y, z]) => {
    const d = BathDeckNode.parse(raw),
      c = Math.cos(d.rotation),
      s = Math.sin(d.rotation)
    return [d.position[0] + x * c + z * s, d.position[1] + y, d.position[2] - x * s + z * c]
  },
  planToLocal: (raw, x, y, z) => {
    const d = BathDeckNode.parse(raw),
      c = Math.cos(d.rotation),
      s = Math.sin(d.rotation),
      dx = x - d.position[0],
      dz = z - d.position[2]
    return [dx * c - dz * s, y, dx * s + dz * c]
  },
  floorplanLiveTransform: ({ node, live }) =>
    ({ ...node, position: live.position, rotation: live.rotation }) as AnyNode,
  isValidPosition: ({ node, parent, position }) => {
    const bath = BathtubNode.parse({ ...node, position }),
      d = BathDeckNode.parse(parent),
      fit = fitBathToDeck(bath, d)
    return Boolean(
      fit &&
        Math.abs(fit.position[0] - position[0]) < 1e-6 &&
        Math.abs(fit.position[2] - position[2]) < 1e-6,
    )
  },
}
export function attachBathToDeck(
  bath: BathtubNode,
  deck: BathDeckNode,
  nodes: Readonly<Record<string, AnyNode>>,
) {
  const placed = fitBathToDeck(
    { ...bath, parentId: deck.id, position: [0, 0, 0], rotation: 0 },
    deck,
  )
  if (!placed) throw new Error('Bath does not fit this deck')
  return attachmentChanges(
    placed as unknown as AnyNode,
    { hostId: deck.id, slotId: 'bath', type: 'bath', capacity: 1 },
    'bath',
    nodes,
    (raw) =>
      String(raw.type) === BATHTUB && raw.parentId === deck.id
        ? { hostId: deck.id, slotId: 'bath' }
        : null,
    bath.id,
  )
}
export function detachBathFromDeck(bath: BathtubNode, nodes: Readonly<Record<string, AnyNode>>) {
  const deck = bathDeckParent(bath, nodes)
  if (!deck?.parentId) throw new Error('Bath has no deck with a level parent')
  const pose = bathLevelNode(bath, nodes)
  return attachmentChanges(
    { ...pose, position: [pose.position[0], 0, pose.position[2]] } as unknown as AnyNode,
    null,
    'bath',
    nodes,
    () => null,
    bath.id,
  )
}
