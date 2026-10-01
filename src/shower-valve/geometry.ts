import { type GeometryContext } from '@pascal-app/core'
import { createDefaultMaterial, resolveMaterialRef } from '@pascal-app/viewer'
import {
  BoxGeometry,
  CylinderGeometry,
  TorusGeometry,
  type BufferGeometry,
  Group,
  Mesh,
  Vector3,
} from 'three'
import type { ShowerValveNode } from './schema'
export function valvePorts(n: ShowerValveNode) {
  const z = -n.mountingDepth * 0.65
  const result: {
    id: string
    type: string
    position: [number, number, number]
    direction: [number, number, number]
  }[] = []
  if (n.family === 'transfer' || n.family === 'stop')
    result.push({
      id: 'water-inlet',
      type: 'shower_water_inlet',
      position: [0, -n.height / 2 - n.portLength, z],
      direction: [0, -1, 0],
    })
  else
    for (const [id, sign] of [
      ['hot-inlet', -1],
      ['cold-inlet', 1],
    ] as const)
      result.push({
        id,
        type: 'shower_water_inlet',
        position: [sign * (n.width / 2 + n.portLength), 0, z],
        direction: [sign, 0, 0],
      })
  for (let i = 1; i <= n.outletCount; i++)
    result.push({
      id: `outlet-${i}`,
      type: 'shower_water',
      position: [
        (i - (n.outletCount + 1) / 2) * (n.width / n.outletCount),
        n.height / 2 + n.portLength,
        z,
      ],
      direction: [0, 1, 0],
    })
  return result
}
export function buildShowerValveGeometry(n: ShowerValveNode, ctx?: GeometryContext) {
  const root = new Group()
  const material = (slot: string, color: string) =>
    (n.slots?.[slot] ? resolveMaterialRef(n.slots[slot], ctx?.materials, 'rendered') : null) ??
    createDefaultMaterial(color, 0.35, 'rendered')
  const add = (g: BufferGeometry, slot: string, color: string, p: [number, number, number]) => {
    const m = new Mesh(g, material(slot, color))
    m.userData = { slotId: slot, __fromGeometry: true }
    m.position.fromArray(p)
    root.add(m)
    return m
  }
  const z = -n.mountingDepth * 0.65
  if (n.bodyShape === 'round') {
    const casting = new CylinderGeometry(n.width / 2, n.width / 2, n.mountingDepth * 0.7, 48)
    casting.scale(1, 1, n.height / n.width)
    const body = add(casting, 'body', '#b79b62', [0, 0, z])
    body.rotation.x = Math.PI / 2
    add(new BoxGeometry(n.width, n.portDiameter, n.portDiameter), 'body', '#b79b62', [
      0,
      n.height / 2 - n.portDiameter / 2,
      z,
    ])
  } else
    add(new BoxGeometry(n.width, n.height, n.mountingDepth * 0.7), 'body', '#b79b62', [0, 0, z])
  const cartridge = (y: number) => {
    const m = add(
      new CylinderGeometry(n.width * 0.25, n.width * 0.25, n.mountingDepth * 0.55, 32),
      'cartridge',
      '#686b70',
      [0, y, -n.mountingDepth * 0.275],
    )
    m.rotation.x = Math.PI / 2
  }
  cartridge(n.family === 'thermostatic' ? -n.height * 0.24 : 0)
  if (n.family === 'thermostatic') cartridge(n.height * 0.24)
  for (const port of valvePorts(n)) {
    const d = new Vector3(...port.direction),
      tip = new Vector3(...port.position)
    const m = add(
      new CylinderGeometry(n.portDiameter / 2, n.portDiameter / 2, n.portLength, 24),
      'ports',
      '#b79b62',
      tip
        .clone()
        .addScaledVector(d, -n.portLength / 2)
        .toArray(),
    )
    m.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), d)
    const target = new Group()
    target.name = `${port.type}_target_${port.id}`
    target.position.copy(tip)
    target.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), d)
    target.userData = { hostId: n.id, slotId: port.id, attachmentTarget: port.type, capacity: 1 }
    root.add(target)
  }
  if (n.serviceStops)
    for (const sign of [-1, 1]) {
      const m = add(
        new CylinderGeometry(n.portDiameter * 0.6, n.portDiameter * 0.6, 0.016, 24),
        'stops',
        '#686b70',
        [sign * n.width * 0.36, 0, -n.mountingDepth * 0.25],
      )
      m.rotation.x = Math.PI / 2
    }
  if (n.housingEnabled) {
    const t = 0.006
    if (n.bodyShape === 'round') {
      for (const depth of [-t, -n.mountingDepth + t]) {
        const ring = new TorusGeometry(n.width / 2 + t, t, 12, 64)
        ring.scale(1, n.height / n.width, 1)
        add(ring, 'housing', '#3b756c', [0, 0, depth])
      }
      for (const sign of [-1, 1])
        add(new BoxGeometry(t, t, n.mountingDepth), 'housing', '#3b756c', [
          sign * (n.width / 2 + t),
          0,
          -n.mountingDepth / 2,
        ])
    } else
      for (const sign of [-1, 1]) {
        add(new BoxGeometry(t, n.height + t * 2, n.mountingDepth), 'housing', '#3b756c', [
          sign * (n.width / 2 + t / 2),
          0,
          -n.mountingDepth / 2,
        ])
        add(new BoxGeometry(n.width, t, n.mountingDepth), 'housing', '#3b756c', [
          0,
          sign * (n.height / 2 + t / 2),
          -n.mountingDepth / 2,
        ])
      }
  }
  return root
}
export const showerValveGeometryKey = (n: ShowerValveNode) =>
  JSON.stringify([
    n.family,
    n.bodyShape,
    n.width,
    n.height,
    n.mountingDepth,
    n.portDiameter,
    n.portLength,
    n.outletCount,
    n.serviceStops,
    n.housingEnabled,
    n.slots,
  ])
