import type { GroupMoveSnapArgs, GroupMoveSnapResult } from '@pascal-app/core'
import { bathRectangularWallSnap } from '../bathtub/wall-snap'
import { BATH_DECK, BathDeckNode } from './schema'

// Snap the enclosure footprint; the bath stays in its deck-local frame.
export function bathDeckWallSnap(args: GroupMoveSnapArgs): GroupMoveSnapResult | null {
  if (String(args.node.type) !== BATH_DECK) return null
  const deck = BathDeckNode.parse(args.node)
  return bathRectangularWallSnap(args, { ...deck, shape: 'back-to-wall' })
}
