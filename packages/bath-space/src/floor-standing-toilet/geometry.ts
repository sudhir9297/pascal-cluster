import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { ceramicRings, toiletOutline } from './profile'
import type { GeometryContext } from '@pascal-app/core'
import { createDefaultMaterial, resolveMaterialRef } from '@pascal-app/viewer'
import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  CylinderGeometry,
  Vector3,
  type Material,
} from 'three'
import { FloorStandingToiletNode, toiletLayout, isOnePiece } from './schema'
// Closed loops through the outer shell, rim, inner bowl and sump.
function shell(n: FloorStandingToiletNode, rings: [number, number, number][]) {
  const vertices: number[] = [],
    indices: number[] = [],
    uvs: number[] = []
  for (const [w, d, y] of rings)
    for (const [x, z] of toiletOutline(n, w, d)) {
      vertices.push(x, y, z)
      uvs.push(x, z)
    }
  for (let j = 0; j < rings.length; j++)
    for (let i = 0; i < 64; i++) {
      const a = j * 64 + i,
        b = j * 64 + ((i + 1) % 64),
        c = ((j + 1) % rings.length) * 64 + i,
        d = ((j + 1) % rings.length) * 64 + ((i + 1) % 64)
      indices.push(a, c, b, b, c, d)
    }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}
export function buildFloorStandingToiletGeometry(
  n: FloorStandingToiletNode,
  ctx?: GeometryContext,
) {
  const root = new Group(),
    layout = toiletLayout(n),
    rear = layout.projection / 2
  const materials = new Map<string, Material>()
  const add = (
    geometry: BufferGeometry,
    slot: string,
    x: number,
    y: number,
    z: number,
  ) => {
    let material = materials.get(slot)
    if (!material) {
      material =
        (n.slots?.[slot]
          ? resolveMaterialRef(n.slots[slot]!, ctx?.materials, 'rendered')
          : null) ??
        createDefaultMaterial(
          slot === 'hardware' ? '#bbc3cb' : '#ffffff',
          0.22,
          'rendered',
        )
      materials.set(slot, material)
    }
    const mesh = new Mesh(geometry, material)
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.userData = { slotId: slot, __fromGeometry: true }
    root.add(mesh)
    return mesh
  }
  const center = rear - layout.rearSpace - n.depth / 2,
    t = n.wallThickness
  add(shell(n, ceramicRings(n)), 'ceramic', 0, 0, center)
  if (isOnePiece(n) && n.tankType === 'attached') {
    add(
      new RoundedBoxGeometry(
        n.tankWidth * 0.85,
        n.mountingHeight + 0.02,
        n.tankDepth,
        4,
        0.018,
      ),
      'ceramic',
      0,
      -n.mountingHeight / 2 + 0.01,
      rear - n.tankDepth / 2,
    )
  }
  if (!n.rimless)
    add(
      shell(n, [
        [n.width, n.depth, 0],
        [n.width, n.depth, 0.012],
        [n.width - 3 * t, n.depth - 3 * t, 0.012],
        [n.width - 3 * t, n.depth - 3 * t, 0],
      ]),
      'ceramic',
      0,
      0,
      center,
    )
  if (n.seatEnabled)
    add(
      shell(n, [
        [n.width - 0.006, n.depth - 0.006, 0.005],
        [n.width, n.depth, 0.008],
        [n.width, n.depth, n.seatThickness - 0.003],
        [n.width - 0.006, n.depth - 0.006, n.seatThickness],
        [n.width - 0.09, n.depth - 0.1, n.seatThickness],
        [n.width - 0.096, n.depth - 0.106, n.seatThickness - 0.003],
        [n.width - 0.096, n.depth - 0.106, 0.008],
        [n.width - 0.09, n.depth - 0.1, 0.005],
      ]),
      'seat',
      0,
      0,
      center,
    )
  if (n.lidEnabled) {
    const lid = add(
      shell(n, [
        [n.width - 0.008, n.depth - 0.008, 0],
        [n.width, n.depth, 0.004],
        [n.width, n.depth, 0.01],
        [n.width - 0.008, n.depth - 0.008, 0.015],
        [0.001, 0.001, 0.015],
        [0.001, 0.001, 0],
      ]),
      'seat',
      0,
      n.seatEnabled ? n.seatThickness + 0.005 : 0.008,
      center,
    )
    if (n.lidOpen) {
      lid.rotation.x = -Math.PI / 2
      lid.position.y += n.depth / 2
      lid.position.z += n.depth / 2
    }
  }
  const pipe = (start: Vector3, end: Vector3) => {
    const direction = end.clone().sub(start)
    const m = add(
      new CylinderGeometry(
        n.pipeDiameter / 2,
        n.pipeDiameter / 2,
        direction.length(),
        24,
      ),
      'hardware',
      0,
      0,
      0,
    )
    m.position.copy(start.clone().add(end).multiplyScalar(0.5))
    m.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize())
  }
  if (layout.external) {
    const y = layout.tankBottom - n.mountingHeight,
      z = rear - n.tankDepth / 2
    const tank = new RoundedBoxGeometry(
      n.tankWidth,
      n.tankHeight,
      n.tankDepth,
      4,
      n.tankCornerRadius,
    )
    const positions = tank.getAttribute('position')
    for (let i = 0; i < positions.count; i++) {
      const fraction = (positions.getY(i) + n.tankHeight / 2) / n.tankHeight
      positions.setX(i, positions.getX(i) * (1 - n.tankTaper * (1 - fraction)))
    }
    positions.needsUpdate = true
    tank.computeVertexNormals()
    add(tank, 'tank', 0, y + n.tankHeight / 2, z)
    add(
      new RoundedBoxGeometry(
        n.tankWidth + 0.008,
        n.tankLidThickness,
        n.tankDepth,
        3,
        Math.min(0.006, n.tankLidThickness / 2),
      ),
      'tank',
      0,
      y + n.tankHeight + n.tankLidThickness / 2,
      z,
    )
    const junction = new Vector3(0, 0.02, rear - layout.rearSpace - 0.035)
    if (n.tankType !== 'attached') {
      pipe(new Vector3(0, y, z), new Vector3(0, 0.02, z))
      pipe(new Vector3(0, 0.02, z), junction)
    } else if (!isOnePiece(n)) {
      add(
        new RoundedBoxGeometry(n.tankWidth * 0.8, 0.045, n.tankDepth, 3, 0.012),
        'ceramic',
        0,
        -0.0075,
        z,
      )
    }
  }

  return root
}
export const toiletGeometryKey = (n: FloorStandingToiletNode) =>
  JSON.stringify(
    Object.fromEntries(
      Object.keys(FloorStandingToiletNode.shape)
        .filter(
          (k) =>
            ![
              'id',
              'name',
              'position',
              'rotation',
              'parentId',
              'wallId',
              'side',
              'metadata',
              'children',
              'visible',
            ].includes(k),
        )
        .map((k) => [k, n[k as keyof FloorStandingToiletNode]]),
    ),
  )
