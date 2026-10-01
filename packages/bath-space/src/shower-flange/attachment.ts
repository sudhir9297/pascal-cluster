import { getEffectiveNode, type AnyNode } from '@pascal-app/core'
import { attachmentChanges } from '../attachments/slots'
import { SHOWER_ARM, ShowerArmNode } from '../shower-arm/schema'
import { ShowerFlangeNode, SHOWER_FLANGE } from './schema'
export function flangeHost(raw: AnyNode) {
  if (String(raw.type) !== SHOWER_ARM) return null
  const node = ShowerArmNode.parse(getEffectiveNode(raw))
  return {
    node,
    slot: {
      id: 'wall-cover',
      type: 'shower_flange',
      capacity: 1 as const,
      position: [0, 0, 0] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
    },
  }
}
export function attachShowerFlange(
  n: ShowerFlangeNode,
  hostId: string,
  nodes: Readonly<Record<string, AnyNode>>,
  existingId?: string,
) {
  const raw = nodes[hostId],
    host = raw ? flangeHost(raw) : null
  if (!host || nodes[host.node.wallId ?? host.node.parentId ?? '']?.type !== 'wall')
    throw new Error('Choose a wall-mounted shower arm')
  const placed = ShowerFlangeNode.parse({
    ...n,
    id: existingId,
    parentId: hostId,
    position: [0, 0, 0],
    rotation: 0,
  })
  return {
    placed,
    changes: attachmentChanges(
      placed as unknown as AnyNode,
      { hostId, slotId: 'wall-cover', type: 'shower_flange', capacity: 1 },
      'shower_flange',
      nodes,
      (raw) =>
        String(raw.type) === SHOWER_FLANGE && raw.parentId
          ? { hostId: raw.parentId, slotId: 'wall-cover' }
          : null,
      existingId,
    ),
  }
}
export function flangeFromHit(
  object: import('three').Object3D,
  registry: ReadonlyMap<string, import('three').Object3D>,
  nodes: Readonly<Record<string, AnyNode>>,
) {
  for (let current: import('three').Object3D | null = object; current; current = current.parent)
    for (const [id, root] of registry)
      if (root === current) {
        const raw = nodes[id]
        if (raw && flangeHost(raw)) return id
      }
  return null
}
export { slotHostLevelPose as flangeLevelPose } from '../shower-common/slot-pose'
