import type { GeometryContext } from '@pascal-app/core'
import { createDefaultMaterial, resolveMaterialRef } from '@pascal-app/viewer'
import {
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  Group,
  Mesh,
  TubeGeometry,
  Vector3,
  BufferGeometry,
  Float32BufferAttribute,
} from 'three'
import { createShowerHeadTarget, createShowerFlangeTarget } from './attachment'
import type { ShowerArmNode } from './schema'

import { armPath } from './path'
export { armPath } from './path'
export function buildShowerArmGeometry(n: ShowerArmNode, ctx?: GeometryContext) {
  const root = new Group(),
    square = n.style.startsWith('square'),
    { path, end, direction } = armPath(n)
  const materials = new Map<string, ReturnType<typeof createDefaultMaterial>>()
  const add = (geometry: BufferGeometry, slot: string) => {
    let material = materials.get(slot)
    if (!material) {
      material =
        (n.slots?.[slot] ? resolveMaterialRef(n.slots[slot], ctx?.materials, 'rendered') : null) ??
        createDefaultMaterial('#ffffff', 0.22, 'rendered')
      materials.set(slot, material)
    }
    const mesh = new Mesh(geometry, material)
    mesh.userData = { slotId: slot, __fromGeometry: true }
    root.add(mesh)
    return mesh
  }
  const segment = (a: Vector3, b: Vector3, slot: string, size = n.tubeSize, round = false) => {
    const delta = b.clone().sub(a)
    const mesh = add(
      square && !round
        ? new BoxGeometry(size, delta.length(), size)
        : new CylinderGeometry(size / 2, size / 2, delta.length(), 32),
      slot,
    )
    mesh.position.copy(a).add(b).multiplyScalar(0.5)
    mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), delta.normalize())
  }
  if (square) {
    // Shared corner rings create a continuous miter, rather than overlapping boxes.
    const centres = [path.curves[0]!.getPoint(0), ...path.curves.map((c) => c.getPoint(1))],
      vertices: number[] = [],
      indices: number[] = [],
      uvs: number[] = []
    const tangents = path.curves.map((c) => c.getTangent(0.5).normalize()),
      h = n.tubeSize / 2
    for (let i = 0; i < centres.length; i++) {
      const before = tangents[Math.max(0, i - 1)]!,
        after = tangents[Math.min(i, tangents.length - 1)]!,
        a = new Vector3(0, before.z, -before.y),
        b = new Vector3(0, after.z, -after.y),
        normal = a.clone().add(b).normalize(),
        scale = h / Math.max(0.1, normal.dot(a))
      for (const [j, [x, sign]] of [
        [-h, -1],
        [h, -1],
        [h, 1],
        [-h, 1],
      ].entries()) {
        const p = centres[i]!.clone().addScaledVector(normal, sign! * scale)
        vertices.push(x!, p.y, p.z)
        uvs.push(j / 4, i / (centres.length - 1))
      }
    }
    for (let i = 0; i < centres.length - 1; i++)
      for (let j = 0; j < 4; j++) {
        const a = i * 4 + j,
          b = i * 4 + ((j + 1) % 4),
          c = b + 4,
          d = a + 4
        indices.push(a, b, c, a, c, d)
      }
    indices.push(0, 2, 1, 0, 3, 2)
    const last = (centres.length - 1) * 4
    indices.push(last, last + 1, last + 2, last, last + 2, last + 3)
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(vertices, 3))
    g.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
    g.setIndex(indices)
    const flat = g.toNonIndexed()
    g.dispose()
    flat.computeVertexNormals()
    add(flat, 'arm')
  } else if (
    n.style.endsWith('elbow') ||
    n.style.endsWith('angled') ||
    n.style.endsWith('straight') ||
    n.style.endsWith('adjustable')
  ) {
    for (const curve of path.curves) segment(curve.getPoint(0), curve.getPoint(1), 'arm')
    if (!square && path.curves.length > 1) {
      const joint = add(new SphereGeometry(n.tubeSize / 2, 24, 16), 'arm')
      joint.position.copy(path.curves[0]!.getPoint(1))
    }
  } else add(new TubeGeometry(path, 64, n.tubeSize / 2, 24, false), 'arm')
  segment(
    end,
    end.clone().addScaledVector(direction, n.connectorLength),
    'connector',
    n.tubeSize * 1.15,
    true,
  )
  if (n.flangeEnabled) {
    const flange = add(
      n.flangeShape === 'square'
        ? new BoxGeometry(n.flangeSize, n.flangeSize, n.flangeThickness)
        : new CylinderGeometry(n.flangeSize / 2, n.flangeSize / 2, n.flangeThickness, 48),
      'flange',
    )
    if (n.flangeShape === 'round') flange.rotation.x = Math.PI / 2
    flange.position.z = n.flangeThickness / 2
  }
  const target = createShowerHeadTarget(n)
  root.add(target)
  root.add(createShowerFlangeTarget(n))
  return root
}
export const showerArmGeometryKey = (n: ShowerArmNode) =>
  JSON.stringify([
    2,
    n.style,
    n.length,
    n.tubeSize,
    n.drop,
    n.rise,
    n.bendRadius,
    n.outletAngle,
    n.flangeEnabled,
    n.flangeShape,
    n.flangeSize,
    n.flangeThickness,
    n.connectorLength,
    n.slots,
  ])
