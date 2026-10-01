import type { AnyNode, AnyNodeId } from '@pascal-app/core'
import { TapNode } from '../taps/schema'
import { tapMountingLayout } from '../taps/presets'
import { basinTapMaximumHoleSpacing, BasinNode, type BasinNode as Basin } from './schema'
import { basinTapTarget, tapOccupancySlot } from './tap-attachment'

export type TapMountingLayout = 'single-hole' | 'three-hole'
/** Overall hot-to-cold spacing, bounded by the rear deck/support width. */
export function basinTapHoleSpacing(node: Basin) { return Math.min(node.tapHoleSpacing, basinTapMaximumHoleSpacing(node)) }
export function basinTapMountingPoints(node: Basin) {
  const pose = basinTapTarget(node), spacing = basinTapHoleSpacing(node)
  return (node.tapMountingLayout === 'three-hole' ? [-1, 0, 1] : [0]).map(sign => ({
    id: sign < 0 ? 'hot' : sign > 0 ? 'cold' : 'spout',
    position: [pose.position[0] + sign * spacing / 2 * Math.cos(pose.rotation), pose.position[1], pose.position[2] - sign * spacing / 2 * Math.sin(pose.rotation)] as [number, number, number],
  }))
}
/** Basin and compatible complete tap are changed in one undoable transaction. */
export function basinTapLayoutChanges(node: Basin, layout: TapMountingLayout, nodes: Readonly<Record<string, AnyNode>>, spacing = node.tapHoleSpacing) {
  const next = BasinNode.parse({ ...node, tapMountingLayout: layout, tapHoleSpacing: spacing, tapSlotCount: 1, tapSlots: [], tapTarget: undefined })
  const occupied = Object.values(nodes).filter(raw => tapOccupancySlot(raw)?.hostId === node.id)
  const update: { id: AnyNodeId; data: Partial<AnyNode> }[] = [{ id: node.id as AnyNodeId, data: { tapMountingLayout: layout, tapHoleSpacing: spacing, tapSlotCount: 1, tapSlots: [], tapTarget: undefined } as unknown as Partial<AnyNode> }]
  const current = occupied.find(raw => tapOccupancySlot(raw)?.slotId === 'tap') ?? occupied[0]
  if (current) {
    const tap = TapNode.parse(current), pose = basinTapTarget(next, nodes)
    const compatible = tapMountingLayout(tap) === layout && !tap.wallId
    const replacement = TapNode.parse({ ...tap, ...(compatible ? {} : { presetId: layout === 'three-hole' ? 'tap-017' : 'tap-001', height: undefined, reach: undefined, bodyRadius: undefined }),
      mountingLayout: layout, holeSpacing: basinTapHoleSpacing(next), parentId: node.id, wallId: null, servesBasinId: null, linkOffset: null, slotId: 'tap', serviceSlotId: 'tap', ...pose })
    update.push({ id: current.id, data: replacement as unknown as Partial<AnyNode> })
  }
  return { update, delete: occupied.filter(raw => raw.id !== current?.id).map(raw => raw.id) }
}
