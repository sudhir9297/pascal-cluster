import {hoseTargetId} from '../shower-hose/connection'
import {BATH_SHOWER,BathShowerNode,bathShowerAssembly} from '../bath-shower/schema'
import { SHOWER_ASSEMBLY, ShowerAssemblyNode } from '../shower-assembly/schema'
import { assemblySockets } from '../shower-assembly/targets'
import { getEffectiveNode, type AnyNode } from '@pascal-app/core'
import { Euler, Matrix4, Quaternion, Vector3, type Object3D } from 'three'
import { SHOWER_HOSE, ShowerHoseNode } from '../shower-hose/schema'
import { attachmentChanges } from '../attachments/slots'
import { SHOWER_MOUNT, ShowerMountNode } from '../shower-mount/schema'
import { showerMountSockets } from '../shower-mount/targets'
import { HAND_SHOWER, HandShowerNode } from './schema'
export function handShowerOccupancy(raw: AnyNode) {
  if (String(raw.type) !== HAND_SHOWER) return null
  const n = HandShowerNode.parse(raw)
  return n.parentId ? { hostId: n.parentId, slotId: n.slotId } : null
}
export function handShowerHost(raw: AnyNode) {
  const n =
    (String(raw.type) === SHOWER_ASSEMBLY || String(raw.type) === BATH_SHOWER)
      ? String(raw.type)===BATH_SHOWER?bathShowerAssembly(BathShowerNode.parse(getEffectiveNode(raw))):ShowerAssemblyNode.parse(getEffectiveNode(raw))
      : String(raw.type) === SHOWER_MOUNT
        ? ShowerMountNode.parse(getEffectiveNode(raw))
        : null
  if (!n) return null
  const slot = (
    (String(raw.type) === SHOWER_ASSEMBLY || String(raw.type) === BATH_SHOWER)
      ? assemblySockets(n as ShowerAssemblyNode)
      : showerMountSockets(n as ShowerMountNode)
  ).find((s) => s.id === 'hand-shower')
  return slot ? { node: n, slot } : null
}
export function attachHandShower(
  n: HandShowerNode,
  hostId: string,
  nodes: Readonly<Record<string, AnyNode>>,
  existingId?: string,
) {
  const raw = nodes[hostId],
    host = raw ? handShowerHost(raw) : null
  if (!host) throw new Error('Hand showers require a holder or slide rail')
  const placed = HandShowerNode.parse({
    ...n,
    id: existingId,
    parentId: hostId,
    position: host.slot.position,
    rotation: 0,
  })
  const changes = attachmentChanges(
    placed as unknown as AnyNode,
    { hostId, slotId: host.slot.id, type: host.slot.type, capacity: 1 },
    'hand_shower',
    nodes,
    handShowerOccupancy,
    existingId,
  )
  // A handset replacement keeps connected hoses bound to the new inlet.
  const displaced = new Set(changes.delete)
  const hoses = Object.values(nodes).filter((raw) => String(raw.type) === SHOWER_HOSE)
  const displacedHoses = hoses.filter((raw) =>
    displaced.has(hoseTargetId(ShowerHoseNode.parse(raw),id=>nodes[id]) as AnyNode['id']),
  )
  const retained = hoses.some((raw) => hoseTargetId(ShowerHoseNode.parse(raw),id=>nodes[id]) === placed.id)
  const transfers =
    !retained && displacedHoses[0]
      ? [{ id: displacedHoses[0].id, data: (ShowerHoseNode.parse(displacedHoses[0]).followHostHandset&&displacedHoses[0].parentId===hostId?{targetId:null,followHostHandset:true}:{targetId:placed.id,...(ShowerHoseNode.parse(displacedHoses[0]).followHostHandset?{followHostHandset:false}:{})}) as unknown as Partial<AnyNode> }]
      : []
  const removed = displacedHoses.slice(retained ? 0 : 1).map((raw) => raw.id)
  return {
    placed,
    changes: {
      ...changes,
      delete: [...changes.delete, ...removed],
      update: [...(changes.update ?? []), ...transfers,...hoses.filter(raw=>ShowerHoseNode.parse(raw).followHostHandset&&raw.parentId!==hostId&&hoseTargetId(ShowerHoseNode.parse(raw),id=>nodes[id])===placed.id).map(raw=>({id:raw.id,data:{targetId:placed.id,followHostHandset:false} as Partial<AnyNode>}))],
    },
  }
}
export function handShowerHostFromHit(
  hit: Object3D,
  roots: ReadonlyMap<string, Object3D>,
  nodes: Readonly<Record<string, AnyNode>>,
) {
  for (let object: Object3D | null = hit; object; object = object.parent)
    for (const [id, root] of roots)
      if (object === root) {
        let raw = nodes[id]
        if (raw && String(raw.type) === HAND_SHOWER) raw = nodes[raw.parentId!]
        return raw && handShowerHost(raw) ? (raw.id as string) : null
      }
  return null
}
export function handShowerLevelPose(
  host: ReturnType<typeof handShowerHost> & {},
  root: Object3D,
  level: Object3D,
) {
  root.updateWorldMatrix(true, false)
  level.updateWorldMatrix(true, false)
  const matrix = new Matrix4().makeRotationFromEuler(new Euler(...host.slot.rotation))
  matrix.setPosition(...host.slot.position)
  matrix.premultiply(root.matrixWorld).premultiply(level.matrixWorld.clone().invert())
  const position = new Vector3(),
    quaternion = new Quaternion(),
    scale = new Vector3()
  matrix.decompose(position, quaternion, scale)
  return { position: position.toArray(), quaternion: quaternion.toArray() }
}
