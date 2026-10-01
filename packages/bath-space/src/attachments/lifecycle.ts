import type { AnyNode, AnyNodeId } from '@pascal-app/core'
import { TAP, TapNode } from '../taps/schema'
import { attachedTapPose } from '../taps/attachment'

/** Keep wall-owned taps when their weak service target is deleted. Freeze the last resolved pose. */
export function clearBasinServiceLinks(basin: { id: string }, nodes: Record<AnyNodeId, AnyNode>) {
  return Object.values(nodes).flatMap(raw => {
    if (String(raw.type) !== TAP) return []
    const tap = TapNode.parse(raw)
    if (tap.servesBasinId !== basin.id && tap.servesBathId !== basin.id) return []
    const pose = attachedTapPose(tap, nodes).local
    return [{ id: raw.id, data: { ...pose, servesBasinId: null, servesBathId: null, serviceSlotId: 'tap', linkOffset: [0, 0], slotId: `wall-point:${tap.id}` } as Partial<AnyNode> }]
  })
}
