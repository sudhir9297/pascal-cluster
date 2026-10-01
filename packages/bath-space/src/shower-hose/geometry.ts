import { type GeometryContext } from '@pascal-app/core'
import { createDefaultMaterial, resolveMaterialRef } from '@pascal-app/viewer'
import {
  CatmullRomCurve3,
  CylinderGeometry,
  Group,
  Mesh,
  Quaternion,
  TubeGeometry,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { resolveHose } from './connection'
import { type ShowerHoseNode } from './schema'
export function hoseCurve(n: ShowerHoseNode, end: Vector3, direction = new Vector3(0, -1, 0)) {
  const start = new Vector3(0, -n.connectorLength, 0),
    finish = end.clone().addScaledVector(direction, n.connectorLength),
    lead = 0.05,
    spread = Math.max(0.08, n.diameter * 4),
    sign = finish.x >= start.x ? 1 : -1
  const make = (sag: number) =>
    new CatmullRomCurve3(
      [
        start,
        start.clone().add(new Vector3(0, -lead, 0)),
        new Vector3(
          start.x - (sign * spread) / 2,
          Math.min(start.y, finish.y) - sag,
          (start.z + finish.z) / 2 + n.bow,
        ),
        new Vector3(
          finish.x + (sign * spread) / 2,
          Math.min(start.y, finish.y) - sag,
          (start.z + finish.z) / 2 + n.bow,
        ),
        finish.clone().addScaledVector(direction, lead),
        finish,
      ],
      false,
      'centripetal',
    )
  const min = make(0)
  if (min.getLength() > n.length + 0.005) return null
  let low = 0,
    high = n.length
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2
    if (make(mid).getLength() < n.length) low = mid
    else high = mid
  }
  return make((low + high) / 2)
}
export function buildHoseAt(
  n: ShowerHoseNode,
  end: Vector3,
  direction = new Vector3(0, -1, 0),
  ctx?: GeometryContext,
) {
  const root = new Group(),
    curve = hoseCurve(n, end, direction)
  if (!curve) return root
  const mat = (slot: string) =>
    (n.slots?.[slot] ? resolveMaterialRef(n.slots[slot]!, ctx?.materials, 'rendered') : null) ??
    createDefaultMaterial('#ffffff', 0.28, 'rendered')
  const tube = new Mesh(
    new TubeGeometry(curve, Math.ceil(n.length * 100), n.diameter / 2, 12, false),
    mat('hose'),
  )
  tube.userData = { slotId: 'hose', __fromGeometry: true }
  root.add(tube)
  if (n.style !== 'smooth') {
    const parts = []
    const count = Math.min(1000, Math.floor(n.length / n.ribSpacing))
    for (let i = 1; i < count; i++) {
      const t = i / count,
        p = curve.getPointAt(t),
        q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), curve.getTangentAt(t)),
        g = new CylinderGeometry(
          n.diameter * 0.55,
          n.diameter * 0.55,
          n.style === 'ribbon' ? n.ribSpacing * 0.55 : n.ribSpacing * 0.3,
          12,
        )
      g.applyQuaternion(q)
      g.translate(p.x, p.y, p.z)
      parts.push(g)
    }
    const merged = parts.length ? mergeGeometries(parts) : null
    for (const p of parts) p.dispose()
    if (merged) {
      const ribs = new Mesh(merged, mat('hose'))
      ribs.userData = { slotId: 'hose', __fromGeometry: true }
      root.add(ribs)
    }
  }
  for (const [point, dir] of [
    [new Vector3(), new Vector3(0, -1, 0)],
    [end, direction],
  ] as const) {
    const mesh = new Mesh(
      new CylinderGeometry(n.diameter * 0.8, n.diameter * 0.65, n.connectorLength, 24),
      mat('connectors'),
    )
    mesh.position.copy(point).addScaledVector(dir, n.connectorLength / 2)
    mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir)
    mesh.userData = { slotId: 'connectors', __fromGeometry: true }
    root.add(mesh)
  }
  return root
}
export function buildShowerHoseGeometry(n: ShowerHoseNode, ctx?: GeometryContext) {
  const pose = resolveHose(n, ctx)
  return pose ? buildHoseAt(n, pose.end, pose.endDirection, ctx) : new Group()
}
export const showerHoseGeometryKey = (n: ShowerHoseNode) =>
  JSON.stringify([
    n.style,
    n.length,
    n.diameter,
    n.connectorLength,
    n.ribSpacing,
    n.bow,
    n.targetId,
    n.followHostHandset,
    n.slots,
  ])
