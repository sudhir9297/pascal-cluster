import type { GeometryContext } from '@pascal-app/core'
import { createDefaultMaterial, resolveMaterialRef } from '@pascal-app/viewer'
import {
  Group,
  Mesh,
  LatheGeometry,
  SphereGeometry,
  TubeGeometry,
  Curve,
  Vector2,
  Vector3,
  Quaternion,
} from 'three'
import type { ShowerConnectorNode } from './schema'
import { Euler } from 'three'
export function connectorSocket(n: ShowerConnectorNode) {
  const pose=connectorOutlet(n),rotation=new Euler().setFromQuaternion(new Quaternion().fromArray(pose.quaternion))
  return {id:n.outletType==='hose'?'hose':'shower-head',type:n.outletType==='hose'?'shower_hose':'showerhead',capacity:1 as const,position:pose.position,rotation:[rotation.x,rotation.y,rotation.z] as [number,number,number]}
}
/** Inlet origin uses the existing head convention: flow is local -Y. */
export function connectorOutlet(n: ShowerConnectorNode) {
  const angle = (n.angle * Math.PI) / 180,
    azimuth = (n.azimuth * Math.PI) / 180
  const bend = n.style === 'elbow' || n.style === 'swivel'
  const direction = new Vector3(0, -Math.cos(bend ? angle : 0), Math.sin(bend ? angle : 0))
  let position: Vector3
  if (n.style === 'elbow') {
    const radius = n.length / Math.max(Math.abs(angle), 0.001)
    position =
      Math.abs(angle) < 0.001
        ? new Vector3(0, -n.length, 0)
        : new Vector3(
            0,
            -radius * Math.sin(Math.abs(angle)),
            radius * (1 - Math.cos(angle)) * Math.sign(angle),
          )
  } else if (n.style === 'articulated')
    position = new Vector3(
      0,
      -n.collarLength - n.length * Math.cos(angle),
      n.length * Math.sin(angle),
    )
  else position = direction.clone().multiplyScalar(n.length)
  position.applyAxisAngle(new Vector3(0, 1, 0), azimuth)
  direction.applyAxisAngle(new Vector3(0, 1, 0), azimuth)
  const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, -1, 0), direction)
  return {
    position: position.toArray() as [number, number, number],
    quaternion: quaternion.toArray(),
    direction: direction.toArray(),
  }
}
export function buildShowerConnectorGeometry(n: ShowerConnectorNode, ctx?: GeometryContext) {
  const root = new Group(),
    pose = connectorOutlet(n),
    endpoint = new Vector3(...pose.position)
  const material = (slot: string) =>
    (n.slots?.[slot] ? resolveMaterialRef(n.slots[slot], ctx?.materials, 'rendered') : null) ??
    createDefaultMaterial('#ffffff', 0.25, 'rendered')
  const add = (geometry: LatheGeometry | SphereGeometry | TubeGeometry, slot: string) => {
    const mesh = new Mesh(geometry, material(slot))
    mesh.userData = { slotId: slot, __fromGeometry: true }
    root.add(mesh)
    return mesh
  }
  const collar = (position: Vector3, direction: Vector3, diameter: number) => {
    const outer = Math.max(n.diameter, diameter + 0.006) / 2,
      inner = diameter * 0.38
    const geometry = new LatheGeometry(
      [
        [inner, 0],
        [outer, 0],
        [outer, n.collarLength],
        [inner, n.collarLength],
        [inner, 0],
      ].map(([x, y]) => new Vector2(x!, y!)),
      48,
    )
    const mesh = add(geometry, 'collars')
    mesh.position.copy(position)
    mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction)
    return mesh
  }
  collar(new Vector3(), new Vector3(0, -1, 0), n.inletDiameter)
  collar(endpoint, new Vector3(...pose.direction).negate(), n.outletDiameter)
  class Path extends Curve<Vector3> {
    constructor() {
      super()
    }
    getPoint(t: number, target = new Vector3()) {
      const angle = (n.angle * Math.PI) / 180
      if (n.style === 'elbow' && Math.abs(angle) >= 0.001) {
        const r = n.length / Math.abs(angle)
        return target
          .set(
            0,
            -r * Math.sin(Math.abs(angle) * t),
            r * (1 - Math.cos(angle * t)) * Math.sign(angle),
          )
          .applyAxisAngle(new Vector3(0, 1, 0), (n.azimuth * Math.PI) / 180)
      }
      if (n.style === 'articulated') {
        const start = new Vector3(0, -n.collarLength, 0)
        return target.copy(start).lerp(endpoint, t)
      }
      return target.copy(endpoint).multiplyScalar(t)
    }
  }
  add(
    new TubeGeometry(new Path(), 48, Math.min(n.inletDiameter, n.outletDiameter) / 2, 24, false),
    'body',
  )
  if (n.style === 'swivel' || n.style === 'articulated') {
    const joint = add(new SphereGeometry(n.diameter * 0.55, 32, 20), 'joint')
    joint.position.set(0, -n.collarLength, 0)
    if (n.style === 'articulated')
      add(new SphereGeometry(n.diameter * 0.55, 32, 20), 'joint').position.copy(endpoint)
  }
  const target = new Group()
  target.name = n.outletType==='hose'?'shower_connector_target_hose':'shower_connector_target_shower-head'
  target.position.copy(endpoint)
  target.quaternion.fromArray(pose.quaternion)
  target.userData = {
    attachmentTarget: n.outletType==='hose'?'shower_hose':'showerhead',
    hostId: n.id,
    slotId: n.outletType==='hose'?'hose':'shower-head',
    capacity: 1,
  }
  root.add(target)
  return root
}
