import { getEffectiveNode, type AnyNode } from '@pascal-app/core'
import { attachmentChanges } from '../attachments/slots'
import { ShowerControlNode, SHOWER_CONTROL, exposedControl } from '../shower-control/schema'
import { ShowerValveNode, SHOWER_VALVE } from './schema'
export function valveCompatible(n: ShowerValveNode, trim: ShowerControlNode) {
  if (exposedControl(trim) || n.outletCount < trim.outletCount) return false
  if (n.family === 'universal') return true
  if (trim.function === 'flow') return n.family === 'stop'
  if (trim.function === 'diverter') return n.family === 'transfer'
  return trim.layout === 'dual' || trim.layout === 'buttons'
    ? n.family === 'thermostatic'
    : n.family === 'pressure-balance'
}
export function valveHost(raw: AnyNode, n: ShowerValveNode) {
  if (String(raw.type) !== SHOWER_CONTROL) return null
  const node = ShowerControlNode.parse(getEffectiveNode(raw))
  return valveCompatible(n, node)
    ? {
        node,
        slot: {
          id: 'valve-body',
          type: 'shower_valve',
          capacity: 1 as const,
          position: [0, 0, 0] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
        },
      }
    : null
}
export function attachShowerValve(
  n: ShowerValveNode,
  hostId: string,
  nodes: Readonly<Record<string, AnyNode>>,
  existingId?: string,
) {
  const raw = nodes[hostId],
    host = raw ? valveHost(raw, n) : null
  if (!host) throw new Error('Choose compatible concealed control trim')
  const wall = nodes[host.node.wallId ?? host.node.parentId ?? '']
  if (wall?.type !== 'wall' || n.mountingDepth > (getEffectiveNode(wall).thickness ?? 0.1))
    throw new Error('Valve depth exceeds wall thickness')
  const placed = ShowerValveNode.parse({
    ...n,
    id: existingId,
    parentId: hostId,
    position: host.slot.position,
  })
  return {
    placed,
    changes: attachmentChanges(
      placed as unknown as AnyNode,
      { hostId, slotId: host.slot.id, type: host.slot.type, capacity: host.slot.capacity },
      'shower_valve',
      nodes,
      (raw) =>
        String(raw.type) === SHOWER_VALVE && raw.parentId
          ? { hostId: raw.parentId, slotId: 'valve-body' }
          : null,
      existingId,
    ),
  }
}

export function valveFromHit(
  object: import('three').Object3D,
  registry: ReadonlyMap<string, import('three').Object3D>,
  nodes: Readonly<Record<string, AnyNode>>,
  n: ShowerValveNode,
) {
  for (let current: import('three').Object3D | null = object; current; current = current.parent)
    for (const [id, root] of registry)
      if (root === current) {
        const raw = nodes[id]
        if (raw && valveHost(raw, n)) {
          const trim = ShowerControlNode.parse(getEffectiveNode(raw)),
            wall = nodes[trim.wallId ?? trim.parentId ?? '']
          return wall?.type === 'wall' &&
            n.mountingDepth <= (getEffectiveNode(wall).thickness ?? 0.1)
            ? id
            : null
        }
      }
  return null
}
export { slotHostLevelPose as valveLevelPose } from '../shower-common/slot-pose'
