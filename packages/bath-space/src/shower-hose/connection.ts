import {BATH_SHOWER,BathShowerNode} from '../bath-shower/schema'
import {bathShowerWorldPose} from '../bath-shower/mounting'
import { fitAssemblyPlacement } from '../shower-assembly/placement'
import { SHOWER_ASSEMBLY, ShowerAssemblyNode } from '../shower-assembly/schema'
import { showerSupplyHost } from '../shower-common/supply-host'
import {
  getEffectiveNode,
  type AnyNode,
  type AnyNodeId,
  type GeometryContext,
} from '@pascal-app/core'
import { Euler, Matrix4, Vector3 } from 'three'
import { HandShowerNode, HAND_SHOWER } from '../hand-shower/schema'
import { handShowerHoseTarget } from '../hand-shower/geometry'
import { showerArmPlacement, showerArmPlanPose } from '../shower-arm/placement'
import { ShowerHoseNode, SHOWER_HOSE } from './schema'
import {SHOWER_CONNECTOR,ShowerConnectorNode} from '../shower-connector/schema'
import {connectorSocket} from '../shower-connector/geometry'
type Resolve = (id: string) => AnyNode | null | undefined
function mountPose(raw: AnyNode, resolve: Resolve, seen = new Set<string>()): {n: NonNullable<ReturnType<typeof showerSupplyHost>>['node'];slots: NonNullable<ReturnType<typeof showerSupplyHost>>['slots'];matrix:Matrix4;levelId:string|null} | null {
  if(seen.has(raw.id)) return null
  seen.add(raw.id)
  if(String(raw.type)===SHOWER_CONNECTOR) {
    const n=ShowerConnectorNode.parse(getEffectiveNode(raw)),parent=resolve(n.parentId??'')
    if(n.outletType!=='hose'||!parent||raw.visible===false)return null
    const host=mountPose(parent,resolve,seen),inlet=host?.slots.find(s=>s.id==='hose')
    if(!host||!inlet)return null
    const local=new Matrix4().makeRotationFromEuler(new Euler(...inlet.rotation));local.setPosition(...inlet.position)
    return {n,slots:[connectorSocket(n)],matrix:host.matrix.clone().multiply(local),levelId:host.levelId}
  }
  const supply = showerSupplyHost(raw)
  if (!supply || raw.visible === false) return null
  if(String(raw.type)===BATH_SHOWER){const n=BathShowerNode.parse(getEffectiveNode(raw)),pose=bathShowerWorldPose(n,resolve);if(!pose)return null;const matrix=new Matrix4().makeRotationY(pose.yaw);matrix.setPosition(pose.x,pose.height,pose.z);return {n:supply.node,slots:supply.slots,matrix,levelId:pose.levelId}}
  const n = supply.node,
    wall = resolve(('wallId' in n?n.wallId:null) ?? n.parentId ?? '')
  if(n.type===SHOWER_CONNECTOR)return null
  if (wall?.type !== 'wall') return null
  let p = showerArmPlacement(n, getEffectiveNode(wall), n.position[0], n.side, 0, true)
  if (p && String(n.type) === SHOWER_ASSEMBLY)
    p = fitAssemblyPlacement(ShowerAssemblyNode.parse(n), p, {
      [wall.id]: wall,
      [wall.parentId ?? '']: resolve(wall.parentId ?? '')!,
    })
  if (!p) return null
  const pose = showerArmPlanPose({ ...n, ...p }, getEffectiveNode(wall)),
    matrix = new Matrix4().makeRotationY(pose.yaw)
  matrix.setPosition(pose.x, p.mountingHeight, pose.z)
  return { n, slots: supply.slots, matrix, levelId: wall.parentId }
}
export function hoseTargetId(n:ShowerHoseNode,resolve:Resolve){
 const source=resolve(n.parentId??'');return n.followHostHandset&&source&&String(source.type)===BATH_SHOWER?('children' in source?source.children.find(id=>String(resolve(id)?.type)===HAND_SHOWER&&resolve(id)?.parentId===source.id)??null:null):n.targetId
}
export function hoseConnection(n: ShowerHoseNode, resolve: Resolve) {
  const raw = resolve(n.parentId ?? ''),
    source = raw ? mountPose(raw, resolve) : null,
    slot = source ? source.slots.find((s) => s.id === 'hose') : null
  if (!source || !slot) return null
  const handRaw = resolve(hoseTargetId(n,resolve)??'')
  if (!handRaw || String(handRaw.type) !== HAND_SHOWER || handRaw.visible === false) return null
  const hand = HandShowerNode.parse(getEffectiveNode(handRaw)),
    hostRaw = resolve(hand.parentId ?? ''),
    host = hostRaw ? mountPose(hostRaw, resolve) : null,
    holder = host ? host.slots.find((s) => s.id === 'hand-shower') : null
  if (!host || !holder || source.levelId !== host.levelId) return null
  const sourceMatrix = source.matrix
      .clone()
      .multiply(new Matrix4().makeRotationFromEuler(new Euler(...slot.rotation)).setPosition(...slot.position)),
    handMatrix = new Matrix4().makeRotationFromEuler(new Euler(...holder.rotation))
  handMatrix.setPosition(...holder.position)
  handMatrix.premultiply(host.matrix)
  const end = new Vector3(...handShowerHoseTarget(hand).position)
      .applyMatrix4(handMatrix)
      .applyMatrix4(sourceMatrix.clone().invert()),
    endDirection = new Vector3(0, -1, 0).transformDirection(
      sourceMatrix.clone().invert().multiply(handMatrix),
    )
  return { end, endDirection, sourceMatrix, slot, levelId: source.levelId }
}
export function connectShowerHose(
  n: ShowerHoseNode,
  sourceId: string,
  targetId: string,
  nodes: Readonly<Record<string, AnyNode>>,
  existingId?: string,
) {
  const source = nodes[sourceId]
  if (!source || !showerSupplyHost(source)?.slots.some((s) => s.id === 'hose'))
    throw new Error('Choose a water supply outlet')
  const placed = ShowerHoseNode.parse({
    ...n,
    id: existingId,
    parentId: sourceId,
    targetId: String(source.type)===BATH_SHOWER&&nodes[targetId]?.parentId===sourceId?null:targetId,
    followHostHandset:String(source.type)===BATH_SHOWER&&nodes[targetId]?.parentId===sourceId,
    position: showerSupplyHost(source)!.slots.find((s) => s.id === 'hose')!.position,
  })
  const pose = hoseConnection(placed, (id) => nodes[id])
  if (!pose) throw new Error('Choose a mounted handset on the same level')
  const occupied = Object.values(nodes)
    .filter(
      (o) =>
        String(o.type) === SHOWER_HOSE &&
        o.id !== existingId &&
        (o.parentId === sourceId || hoseTargetId(ShowerHoseNode.parse(o),id=>nodes[id]) === targetId),
    )
    .map((o) => o.id as AnyNodeId)
  return {
    placed,
    changes: existingId
      ? {
          delete: occupied,
          update: [{ id: existingId as AnyNodeId, data: placed as unknown as Partial<AnyNode> }],
        }
      : {
          delete: occupied,
          create: [{ node: placed as unknown as AnyNode, parentId: sourceId as AnyNodeId }],
        },
  }
}
export const resolveHose = (n: ShowerHoseNode, ctx?: GeometryContext) =>
  ctx ? hoseConnection(n, (id) => ctx.resolve(id as AnyNodeId)) : null
