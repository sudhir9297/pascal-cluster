import { BATH_SHOWER, BathShowerNode, bathShowerAssembly } from '../bath-shower/schema'
import { SHOWER_ASSEMBLY, ShowerAssemblyNode } from '../shower-assembly/schema'
import { assemblySockets } from '../shower-assembly/targets'
import { getEffectiveNode, type AnyNode } from '@pascal-app/core'
import { Euler, Matrix4, Quaternion, Vector3, type Object3D } from 'three'
import { attachmentChanges } from '../attachments/slots'
import { SHOWER_ARM, ShowerArmNode } from '../shower-arm/schema'
import { showerHeadSlot, showerHeadTarget } from '../shower-arm/attachment'
import { SHOWER_HEAD, ShowerHeadNode } from './schema'
import { SHOWER_CONNECTOR, ShowerConnectorNode } from '../shower-connector/schema'
import { connectorOutlet } from '../shower-connector/geometry'
export function showerHeadHost(raw: AnyNode) {
  if (String(raw.type) === SHOWER_CONNECTOR) {
    const node = ShowerConnectorNode.parse(getEffectiveNode(raw)),
      pose = connectorOutlet(node)
    if(node.outletType!=='head') return null
    const rotation = new Euler().setFromQuaternion(new Quaternion().fromArray(pose.quaternion))
    return {
      node,
      slot: {
        id: 'shower-head',
        type: 'showerhead',
        capacity: 1 as const,
        position: pose.position,
        rotation: [rotation.x, rotation.y, rotation.z] as [number, number, number],
      },
    }
  }
  if (String(raw.type) === SHOWER_ARM) {
    const node = ShowerArmNode.parse(getEffectiveNode(raw))
    return {
      node,
      slot: {
        ...showerHeadTarget(node),
        id: 'shower-head',
        type: 'showerhead',
        capacity: 1 as const,
      },
    }
  }
  if (String(raw.type) === SHOWER_ASSEMBLY || String(raw.type) === BATH_SHOWER) {
    const node =
      String(raw.type) === BATH_SHOWER
        ? bathShowerAssembly(BathShowerNode.parse(getEffectiveNode(raw)))
        : ShowerAssemblyNode.parse(getEffectiveNode(raw))
    const slot = assemblySockets(node).find((s) => s.id === 'shower-head')
    return slot ? { node, slot } : null
  }
  return null
}
export function showerHeadOccupancy(raw: AnyNode) {
  if (String(raw.type) !== SHOWER_HEAD) return null
  const n = ShowerHeadNode.parse(raw)
  return n.parentId ? { hostId: n.parentId, slotId: n.slotId } : null
}
export function resolveShowerHeadHostId(hostId: string, nodes: Readonly<Record<string, AnyNode>>) {
  const seen = new Set<string>()
  while (true) {
    if (seen.has(hostId)) throw new Error('Cyclic shower connector chain')
    seen.add(hostId)
    const adapter = Object.values(nodes).find(
      (raw) =>
        raw.parentId === hostId &&
        String(raw.type) === SHOWER_CONNECTOR &&
        (raw as unknown as { slotId?: string }).slotId === 'shower-head',
    )
    if (!adapter) return hostId
    hostId = adapter.id
  }
}
export function attachShowerHead(
  node: ShowerHeadNode,
  hostId: string,
  nodes: Readonly<Record<string, AnyNode>>,
  existingId?: string,
) {
  hostId = resolveShowerHeadHostId(hostId, nodes)
  const raw = nodes[hostId]
  const host = raw ? showerHeadHost(raw) : null
  if (!host) throw new Error('Shower heads require a compatible shower arm or assembly outlet')
  const pose = host.slot
  const placed = ShowerHeadNode.parse({
    ...node,
    id: existingId,
    parentId: hostId,
    slotId: 'shower-head',
    position: pose.position,
    rotation: 0,
  })
  return {
    placed,
    changes: attachmentChanges(
      placed as unknown as AnyNode,
      { hostId, slotId: host.slot.id, type: host.slot.type, capacity: 1 },
      'showerhead',
      nodes,
      showerHeadOccupancy,
      existingId,
    ),
  }
}
export function showerArmFromHit(
  hit: Object3D,
  roots: ReadonlyMap<string, Object3D>,
  nodes: Readonly<Record<string, AnyNode>>,
) {
  for (let object: Object3D | null = hit; object; object = object.parent)
    for (const [id, root] of roots)
      if (root === object) {
        let raw = nodes[id]
        if (raw && String(raw.type) === SHOWER_HEAD) raw = nodes[raw.parentId!]
        return raw && showerHeadHost(raw) ? resolveShowerHeadHostId(raw.id, nodes) : null
      }
  return null
}
export function showerHeadLevelPose(
  host: ShowerArmNode | ShowerAssemblyNode | ShowerConnectorNode,
  root: Object3D,
  level: Object3D,
) {
  root.updateWorldMatrix(true, false)
  level.updateWorldMatrix(true, false)
  const pose = showerHeadHost(host as unknown as AnyNode)!.slot,
    matrix = new Matrix4().makeRotationFromEuler(new Euler(...pose.rotation))
  matrix.setPosition(...pose.position)
  matrix.premultiply(root.matrixWorld).premultiply(level.matrixWorld.clone().invert())
  const position = new Vector3(),
    quaternion = new Quaternion(),
    scale = new Vector3()
  matrix.decompose(position, quaternion, scale)
  return { position: position.toArray(), quaternion: quaternion.toArray() }
}
