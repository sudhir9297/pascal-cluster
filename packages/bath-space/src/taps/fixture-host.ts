import { getEffectiveNode, type AnyNode } from '@pascal-app/core'
import { BasinNode, isBasinKind } from '../countertop-basin/schema'
import {
  basinTapLocalToLevel,
  basinTapSlots,
} from '../countertop-basin/tap-attachment'
import {
  bathFromNode,
  bathTapLocalToLevel,
  bathTapTarget,
} from '../bathtub/targets'

export function tapHost(raw: AnyNode | undefined) {
  if (!raw) return null
  const node = getEffectiveNode(raw)
  return (
    bathFromNode(node) ??
    (isBasinKind(String(node.type)) ? BasinNode.parse(node) : null)
  )
}
export type TapHost = NonNullable<ReturnType<typeof tapHost>>
export function fixtureTapSlots(
  host: TapHost,
  nodes: Readonly<Record<string, AnyNode>>,
) {
  return 'tapMount' in host
    ? host.tapMount === 'rim' && host.shape !== 'undermount'
      ? [{ id: 'tap', ...bathTapTarget(host), type: 'tap', capacity: 1 }]
      : []
    : basinTapSlots(host, nodes)
}
export function fixtureTapLocalToLevel(
  host: TapHost,
  pose: { position: [number, number, number]; rotation: number },
  nodes: Readonly<Record<string, AnyNode>>,
) {
  return 'tapMount' in host
    ? bathTapLocalToLevel(host, pose, nodes)
    : basinTapLocalToLevel(host, pose, nodes)
}
