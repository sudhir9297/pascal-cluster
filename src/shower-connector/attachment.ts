import { getEffectiveNode, type AnyNode, type AnyNodeId } from '@pascal-app/core'
import { showerHeadHost } from '../shower-head/attachment'
import { SHOWER_HEAD } from '../shower-head/schema'
import { SHOWER_CONNECTOR, ShowerConnectorNode } from './schema'
import { connectorOutlet } from './geometry'
import {showerSupplyHost} from '../shower-common/supply-host'
import {SHOWER_HOSE} from '../shower-hose/schema'
import {Euler,Matrix4,Quaternion,Vector3,type Object3D} from 'three'
export function connectorFromHit(object:Object3D,registry:ReadonlyMap<string,Object3D>,nodes:Readonly<Record<string,AnyNode>>,n:ShowerConnectorNode) {
  for(let o:Object3D|null=object;o;o=o.parent)for(const[id,root]of registry)if(root===o){
    let raw=nodes[id]
    if(raw&&[SHOWER_HEAD,SHOWER_HOSE,SHOWER_CONNECTOR].includes(String(raw.type)))raw=nodes[raw.parentId??'']
    return raw&&connectorHost(raw,n)?raw.id:null
  }
  return null
}
export function connectorLevelPose(raw:AnyNode,n:ShowerConnectorNode,root:Object3D,level:Object3D) {
  const slot=connectorHost(raw,n)?.slot
  if(!slot)return null
  root.updateWorldMatrix(true,false);level.updateWorldMatrix(true,false)
  const matrix=new Matrix4().makeRotationFromEuler(new Euler(...slot.rotation));matrix.setPosition(...slot.position);matrix.premultiply(root.matrixWorld).premultiply(level.matrixWorld.clone().invert())
  const position=new Vector3(),quaternion=new Quaternion(),scale=new Vector3();matrix.decompose(position,quaternion,scale)
  return {position:position.toArray(),quaternion:quaternion.toArray()}
}
export function connectorHost(raw:AnyNode,n:ShowerConnectorNode) {
  if(n.outletType==='head')return showerHeadHost(raw)
  const host=showerSupplyHost(raw),slot=host?.slots.find(s=>s.id==='hose')
  return host&&slot?{node:host.node,slot}:null
}
/** Insert/replace a connector without deleting the downstream head. */
export function attachShowerConnector(
  n: ShowerConnectorNode,
  hostId: string,
  nodes: Readonly<Record<string, AnyNode>>,
  existingId?: string,
) {
  const raw = nodes[hostId],
    host = raw ? connectorHost(raw,n) : null
  if (!host) throw new Error('Choose a compatible overhead shower outlet')
  const seen = new Set<string>(existingId ? [existingId] : [])
  for (
    let ancestor: AnyNode | undefined = raw;
    ancestor;
    ancestor = ancestor.parentId ? nodes[ancestor.parentId] : undefined
  ) {
    if (seen.has(ancestor.id)) throw new Error('Connector attachment would create a cycle')
    seen.add(ancestor.id)
  }
  const slotId=n.outletType==='hose'?'hose':'shower-head', downstreamType=n.outletType==='hose'?SHOWER_HOSE:SHOWER_HEAD
  const occupied = Object.values(nodes).filter(
    (x) =>
      x.parentId === hostId &&
      (x as unknown as { slotId?: string }).slotId === slotId &&
      x.id !== existingId,
  )
  if (
    occupied.some((x) => ![downstreamType, SHOWER_CONNECTOR].includes(String(x.type))) ||
    occupied.length > 1
  )
    throw new Error('Unsupported outlet occupancy')
  const previous = occupied[0]
  const oldRaw = existingId ? nodes[existingId] : null
  const old = oldRaw ? ShowerConnectorNode.parse(getEffectiveNode(oldRaw)) : null
  const downstream = old?.children.length
    ? old.children
    : previous && String(previous.type) === SHOWER_CONNECTOR
      ? ShowerConnectorNode.parse(previous).children
      : previous
        ? [previous.id]
        : []
  if (old?.children.length && previous)
    throw new Error('Destination occupied; move the downstream fixture first')
  if (downstream.some((id) => String(nodes[id]?.type) !== downstreamType) || downstream.length > 1)
    throw new Error('Unsupported downstream connector chain')
  const placed = ShowerConnectorNode.parse({
    ...n,
    id: existingId,
    parentId: hostId,
    slotId,
    children: downstream,
    position: host.slot.position,
  })
  const pose = connectorOutlet(placed)
  const update = downstream.map((id) => ({
    id: id as AnyNodeId,
    data: { parentId: placed.id, position: pose.position } as unknown as Partial<AnyNode>,
  }))
  return {
    placed,
    changes: {
      delete:
        previous && String(previous.type) === SHOWER_CONNECTOR ? [previous.id as AnyNodeId] : [],
      update: existingId
        ? [...update, { id: existingId as AnyNodeId, data: placed as unknown as Partial<AnyNode> }]
        : update,
      create: existingId
        ? []
        : [{ node: placed as unknown as AnyNode, parentId: hostId as AnyNodeId }],
    },
  }
}
