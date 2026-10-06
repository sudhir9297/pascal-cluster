
import { basinModelRotation } from './orientation'
import { tapHost, fixtureTapSlots, fixtureTapLocalToLevel } from '../taps/fixture-host'
import { getEffectiveNode, type AnyNode, type AnyNodeId } from '@pascal-app/core'
import { attachmentChanges, sameSlot, type SlotRef } from '../attachments/slots'
import { Group, type Object3D } from 'three'
import { TAP } from '../taps/schema'
import { vanityLevelId } from '../freestanding-vanity/wall-placement'
import { basinLevelPose, basinVanityParent } from './attachment'
import { basinDepth, isBasinKind, basinTapMaximumHoleSpacing, BasinNode, HALF_PEDESTAL_BASIN, FULL_PEDESTAL_BASIN, WALL_HUNG_BASIN, SEMI_RECESSED_BASIN, UNDERMOUNT_BASIN } from './schema'

import { WALL_BASIN_DRAIN_Z, wallBasinBowlSize } from '../wall-hung-basin/profile'
import { semiRecessedDeckDepth } from './semi-recessed-geometry'

type Nodes = Readonly<Record<string, AnyNode>>
export type BasinTapPose = { position: [number, number, number]; rotation: number }
export type BasinTapNode = BasinTapPose & { id: string; parentId: string | null; slotId?: string }

/** Local mounting pose: +Z is behind the bowl, Y=0 is the supporting surface. */
export function basinTapTarget(node: BasinNode, nodes: Nodes = {}, slotId = 'tap'): BasinTapPose {
  const slot = basinTapSlots(node, nodes).find(slot => slot.id === slotId) ?? basinTapSlots(node, nodes)[0]!
  return { position: slot.position, rotation: slot.rotation }
}
function basinTapDefaultTarget(node: BasinNode, nodes: Nodes): BasinTapPose {
  if (node.type === SEMI_RECESSED_BASIN) return node.tapTarget ?? { position: [0, node.height - node.recessDepth, basinDepth(node) / 2 - semiRecessedDeckDepth(node) / 2], rotation: 0 }
  if (node.type === WALL_HUNG_BASIN || node.type === FULL_PEDESTAL_BASIN || node.type === HALF_PEDESTAL_BASIN) {
    const bowlRear = WALL_BASIN_DRAIN_Z + wallBasinBowlSize(node).depth / 2
    // Classic designs have a raised rear lip occupying the last 30 mm.
    const deckRear = node.depth / 2 - (node.wallDesign === 'classic' ? 0.03 : 0.002)
    return node.tapTarget ?? { position: [0, 0, (bowlRear + deckRear) / 2], rotation: 0 }
  }
  const parent = basinVanityParent(node, nodes)
  const elevation = node.type === UNDERMOUNT_BASIN ? (parent ? parent.height - node.position[1] : 0.03) : 0
  return node.tapTarget ?? { position: [0, elevation, basinDepth(node) / 2 + 0.055], rotation: 0 }
}

export const BASIN_TAP_TARGET_NAME = 'basin-tap-target'
export const BASIN_TAP_SLOT = 'tap'

/** One tap per basin slot, including legacy taps without explicit slot metadata. */
export function tapOccupancySlot(raw: AnyNode): SlotRef | null {
  if (String(raw.type) !== TAP) return null
  const tap = raw as unknown as { parentId: string | null; wallId?: string | null; servesBasinId?: string | null; servesBathId?: string | null; slotId?: string; serviceSlotId?: string }
  if (tap.servesBathId) return { hostId: tap.servesBathId, slotId: tap.serviceSlotId ?? 'tap' }
  if (tap.servesBasinId) return { hostId: tap.servesBasinId, slotId: tap.serviceSlotId ?? 'tap' }
  return tap.parentId ? { hostId: tap.parentId, slotId: tap.slotId ?? 'tap' } : null
}
export function basinTapSlots(node: BasinNode, nodes: Nodes = {}) {
  if (node.tapMountingLayout === 'three-hole') { const pose = basinTapDefaultTarget(node, nodes); return [{ id: 'tap', ...pose, type: 'tap', capacity: 1 }] }
  if (node.tapSlots.length) return node.tapSlots.map(slot => ({ ...slot, type: 'tap', capacity: 1 }))
  const pose = basinTapDefaultTarget(node, nodes)
  const ids = node.tapSlotCount === 3 ? ['tap-left', 'tap', 'tap-right'] : ['tap']
  return ids.map(id => ({ id, position: [pose.position[0] + (id === 'tap-left' ? -1 : id === 'tap-right' ? 1 : 0) * Math.min(.15, node.width / 4), pose.position[1], pose.position[2]] as [number, number, number], rotation: pose.rotation, type: 'tap', capacity: 1 }))
}
export function basinTapSlotOccupants(basinId: string, nodes: Nodes, exceptId?: string, slotId = 'tap'): AnyNodeId[] {
  return Object.values(nodes).filter(node => node.id !== exceptId && sameSlot({ hostId: basinId, slotId }, tapOccupancySlot(node))).map(node => node.id as AnyNodeId)
}

/** Empty, basin-local mount. Geometry rebuilds replace it with the current pose. */
export function createBasinTapTarget(node: BasinNode, nodes: Nodes = {}): Group {
  const target = new Group()
  target.name = BASIN_TAP_TARGET_NAME
  target.userData.attachmentTarget = 'tap'
  target.userData.basinId = node.id
  target.userData.mount = 'countertop'
  target.userData.slotId = BASIN_TAP_SLOT
  target.userData.capacity = 1
  syncBasinTapTarget(target, node, nodes)
  return target
}

/** Update parent-dependent elevation without rebuilding the ceramic geometry. */
export function syncBasinTapTarget(target: Object3D, node: BasinNode, nodes: Nodes = {}) {
  const pose = basinTapTarget(node, nodes)
  target.position.fromArray(pose.position)
  target.rotation.set(0, pose.rotation, 0)
  const existing = new Map(target.children.filter(child => !child.userData.mountingPoint).map(child => [child.userData.slotId as string, child]))
  const active = new Set<string>()
  for (const slot of basinTapSlots(node, nodes)) {
    active.add(slot.id)
    const empty = existing.get(slot.id) ?? new Group()
    empty.name = `tap_target_${slot.id}`
    empty.userData = { attachmentTarget: 'tap', basinId: node.id, slotId: slot.id, capacity: 1 }
    // Parent target already carries the default pose.
    const dx = slot.position[0] - pose.position[0], dz = slot.position[2] - pose.position[2]
    const c = Math.cos(pose.rotation), s = Math.sin(pose.rotation)
    empty.position.set(dx * c - dz * s, slot.position[1] - pose.position[1], dx * s + dz * c)
    empty.rotation.y = slot.rotation - pose.rotation
    if (empty.parent !== target) target.add(empty)
  }
  for (const [id, child] of existing) if (!active.has(id)) target.remove(child)
  const mounts = new Map(target.children.filter(child => child.userData.mountingPoint).map(child => [child.name, child]))
  const activeMounts = new Set<string>()
  const spacing = Math.min(node.tapHoleSpacing, basinTapMaximumHoleSpacing(node))
  for (const sign of node.tapMountingLayout === 'three-hole' ? [-1, 0, 1] : [0]) {
    const name = `tap-mount-${sign < 0 ? 'hot' : sign > 0 ? 'cold' : 'spout'}`
    activeMounts.add(name)
    const point = mounts.get(name) ?? new Group(); point.name = name
    point.userData.mountingPoint = true; point.position.x = sign * spacing / 2; if (point.parent !== target) target.add(point)
  }
  for (const [name, point] of mounts) if (!activeMounts.has(name)) target.remove(point)
}

export function basinTapLocalToLevel(basin: BasinNode, pose: BasinTapPose, nodes: Nodes): BasinTapPose {
  const frame = basinLevelPose(basin, nodes), rotation = basinModelRotation(frame.rotation), c = Math.cos(rotation), s = Math.sin(rotation)
  const [x, y, z] = pose.position
  return { position: [frame.position[0] + x * c + z * s, frame.position[1] + y,
    frame.position[2] - x * s + z * c], rotation: pose.rotation + rotation }
}

export function basinTapLevelToLocal(basin: BasinNode, pose: BasinTapPose, nodes: Nodes): BasinTapPose {
  const frame = basinLevelPose(basin, nodes), rotation = basinModelRotation(frame.rotation), c = Math.cos(rotation), s = Math.sin(rotation)
  const x = pose.position[0] - frame.position[0], z = pose.position[2] - frame.position[2]
  return { position: [x * c - z * s, pose.position[1] - frame.position[1], x * s + z * c],
    rotation: pose.rotation - rotation }
}

export function basinOwnsTapSurface(surface: Object3D | undefined, roots: ReadonlyMap<string, Object3D>, nodes: Nodes) {
  for (let object = surface; object; object = object.parent ?? undefined) {
    for (const [id, root] of roots) {
      if (root !== object) continue
      const raw = nodes[id]
      const host = tapHost(raw)
      if (host && fixtureTapSlots(host, nodes).length) return host
      // Hits on unrelated objects must not snap through them to a basin.
      if (raw && String(raw.type) !== TAP && raw.type !== 'level' && raw.type !== 'building') return null
    }
  }
  return null
}

/** Placement preview and creation use this same pose when the cursor hits a basin. */
export function basinTapSnap(surface: Object3D | undefined, roots: ReadonlyMap<string, Object3D>, nodes: Nodes, altKey = false, point?: readonly number[]) {
  if (altKey) return null
  const basin = basinOwnsTapSurface(surface, roots, nodes)
  if (!basin) return null
  const slots = fixtureTapSlots(basin, nodes)
  const slot = point ? slots.reduce((best, next) => {
    const distance = (item: typeof next) => { const pose = fixtureTapLocalToLevel(basin, item, nodes); return pose.position.reduce((sum, v, i) => sum + (v - point[i]!) ** 2, 0) }
    return distance(next) < distance(best) ? next : best
  }) : slots[0]!
  const local = { position: slot.position, rotation: slot.rotation }
  return { slotId: slot.id, parentId: basin.id, ...local, levelPose: fixtureTapLocalToLevel(basin, local, nodes) }
}

/** Atomic updates for an existing tap. Attached taps stay attached until Alt is held. */
export function basinTapMoveChanges(tap: BasinTapNode, levelPose: BasinTapPose, nodes: Nodes, options: {
  altKey?: boolean; surface?: Object3D; roots?: ReadonlyMap<string, Object3D>
} = {}) {
  const parent = nodes[tap.parentId ?? '']
  const basin = parent && isBasinKind(String(parent.type)) ? BasinNode.parse(getEffectiveNode(parent)) : null
  let pose: BasinTapPose & { parentId: string | null } = { ...levelPose, parentId: tap.parentId }
  let slotId = tap.slotId ?? 'tap'
  const updates: { id: AnyNodeId; data: Partial<AnyNode> }[] = []
  if (basin && !options.altKey) {
    const local = basinTapLevelToLocal(basin, levelPose, nodes)
    pose = { ...local, parentId: basin.id }
    updates.push({ id: basin.id as AnyNodeId, data: (basin.tapSlots.length ? {
      tapSlots: basin.tapSlots.map(slot => slot.id === (tap.slotId ?? 'tap') ? { ...slot, ...local } : slot),
    } : { tapTarget: local }) as unknown as Partial<AnyNode> })
  } else if (basin) {
    const levelId = vanityLevelId(basin.parentId, nodes)
    if (!levelId) throw new Error('Cannot detach a tap without a containing level')
    pose.parentId = levelId
  } else if (!options.altKey && options.roots) {
    const snapped = basinTapSnap(options.surface, options.roots, nodes)
    if (snapped) { slotId = snapped.slotId; pose = { position: snapped.position, rotation: snapped.rotation, parentId: snapped.parentId } }
  }
  updates.push({ id: tap.id as AnyNodeId, data: pose as Partial<AnyNode> })
  const target = pose.parentId ? nodes[pose.parentId] : undefined
  if (target && isBasinKind(String(target.type))) {
    const raw = nodes[tap.id]
    if (raw) {
      const changes = attachmentChanges({ ...raw, ...pose, slotId, wallId: null, servesBasinId: null } as unknown as AnyNode,
        { hostId: target.id, slotId, type: 'tap', capacity: 1 }, 'tap', nodes, tapOccupancySlot, tap.id)
      return { ...changes, update: [...updates.slice(0, -1), ...changes.update!] }
    }
  }
  return { update: updates, delete: [] as AnyNodeId[] }
}
