import type { AnyNode, AnyNodeId } from '@pascal-app/core'
import { BathtubNode } from '../bathtub/schema'
import { BathDeckNode } from './schema'
export function dropInAssembly(node: BathtubNode, levelId: AnyNodeId) {
  const deck = BathDeckNode.parse({
    name: 'Bath Deck',
    supportSlabId: node.supportSlabId,
    height: node.height + (node.shape === 'undermount' ? 0.042 : -0.025),
    length: Math.max(1.5, node.length + 0.35),
    width: Math.max(0.9, node.width + 0.35),
    position: node.position,
    rotation: node.rotation,
  })
  const bath = BathtubNode.parse({ ...node, parentId: deck.id, position: [0, 0, 0], rotation: 0 })
  return {
    deck,
    bath,
    changes: {
      create: [
        { node: deck as unknown as AnyNode, parentId: levelId },
        { node: bath as unknown as AnyNode, parentId: deck.id as AnyNodeId },
      ],
    },
  }
}
