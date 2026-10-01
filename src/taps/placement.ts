import { tapHost } from './fixture-host'
import { bathTapTarget } from '../bathtub/targets'
import type { AnyNode, AnyNodeId } from '@pascal-app/core'
import type { Matrix4, Object3D, Ray } from 'three'
import { basinPlacement } from '../countertop-basin/placement'
import { basinTapSnap, tapOccupancySlot } from '../countertop-basin/tap-attachment'
import { vanityLevelId } from '../freestanding-vanity/wall-placement'
import { attachmentChanges } from '../attachments/slots'
import { BasinNode } from '../countertop-basin/schema'
import { basinTapTarget } from '../countertop-basin/tap-attachment'
import { basinTapHoleSpacing } from '../countertop-basin/tap-layout'
import { getTapPreset, tapMountingLayout } from './presets'
import { TapNode } from './schema'

export type TapPlacementCandidate = NonNullable<ReturnType<typeof basinTapSnap>>
export function tapPlacementCandidate(ray: Ray, surfaces: Object3D, levelMatrix: Matrix4, levelId: string,
  roots: ReadonlyMap<string, Object3D>, nodes: Readonly<Record<string, AnyNode>>, excluded: readonly Object3D[] = []): TapPlacementCandidate | null {
  const hit = basinPlacement(ray, surfaces, levelMatrix, 0, 0, excluded)
  const snap = hit?.surface ? basinTapSnap(hit.surface, roots, nodes, false, hit.position) : null
  return snap && vanityLevelId(snap.parentId, nodes) === levelId ? snap : null
}
export function createPlacedTap(node: TapNode, candidate: TapPlacementCandidate) {
  if (getTapPreset(node.presetId).mount === 'wall') throw new Error('Wall mounted taps require a wall binding')
  return TapNode.parse({ ...node, wallId: null, servesBasinId: null, servesBathId: null, id: undefined, parentId: candidate.parentId,
    slotId: candidate.slotId, position: candidate.position, rotation: candidate.rotation })
}

/** Replacement and creation are one scene transaction for both 3D and plan tools. */
export function tapPlacementChanges(node: TapNode, candidate: TapPlacementCandidate, nodes: Readonly<Record<string, AnyNode>>, existingId?: string) {
  const host = tapHost(nodes[candidate.parentId])
  if (host && 'tapMount' in host) {
    if (host.tapMount !== 'rim' || host.shape === 'undermount') throw new Error('This bath has no rim mounting slot')
    if (tapMountingLayout(node) !== 'single-hole') throw new Error('Bath rim currently supports single-hole fittings')
    const placed = createPlacedTap(node, { ...candidate, ...bathTapTarget(host) })
    if (existingId) placed.id = existingId as TapNode['id']
    const changes = attachmentChanges(placed as unknown as AnyNode, { hostId:host.id, slotId:'tap', type:'tap',capacity:1 }, 'tap',nodes,tapOccupancySlot,existingId)
    return { placed, changes }
  }
  const layout = tapMountingLayout(node), basin = BasinNode.parse(nodes[candidate.parentId]!)
  const next = BasinNode.parse({ ...basin, tapMountingLayout: layout, tapSlotCount: 1, tapSlots: [], tapTarget: undefined })
  const pose = basinTapTarget(next, nodes)
  const placed = createPlacedTap({ ...node, mountingLayout: layout, holeSpacing: basinTapHoleSpacing(next) }, { ...candidate, slotId: 'tap', ...pose })
  if (existingId) placed.id = existingId as TapNode['id']
  const changes = attachmentChanges(placed as unknown as AnyNode,
    { hostId: candidate.parentId, slotId: 'tap', type: 'tap', capacity: 1 }, 'tap', nodes, tapOccupancySlot, existingId)
  // A complete set replaces all legacy independent slot occupants as well.
  changes.delete = Object.values(nodes).filter(raw => raw.id !== existingId && tapOccupancySlot(raw)?.hostId === basin.id).map(raw => raw.id)
  changes.update = [...('update' in changes ? changes.update ?? [] : []), { id: basin.id as AnyNodeId, data: { tapMountingLayout: layout, tapSlotCount: 1, tapSlots: [], tapTarget: undefined } as unknown as Partial<AnyNode> }]
  return { placed, changes }
}
