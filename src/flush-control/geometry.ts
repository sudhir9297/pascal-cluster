import type { GeometryContext } from '@pascal-app/core'
import { createDefaultMaterial, resolveMaterialRef } from '@pascal-app/viewer'
import {
  BoxGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  Shape,
  Path,
  type BufferGeometry,
} from 'three'
import { controlDimensions, type FlushControlNode } from './schema'
export function controlOutline(
  shape: FlushControlNode['shape'],
  width: number,
  height: number,
) {
  const path = new Shape(),
    w = width / 2,
    h = height / 2
  if (shape === 'round' || shape === 'oval')
    path.absellipse(0, 0, w, h, 0, Math.PI * 2, false, 0)
  else {
    const r = shape === 'rounded' ? Math.min(w, h) * 0.3 : 0
    path.moveTo(-w + r, -h)
    path.lineTo(w - r, -h)
    path.quadraticCurveTo(w, -h, w, -h + r)
    path.lineTo(w, h - r)
    path.quadraticCurveTo(w, h, w - r, h)
    path.lineTo(-w + r, h)
    path.quadraticCurveTo(-w, h, -w, h - r)
    path.lineTo(-w, -h + r)
    path.quadraticCurveTo(-w, -h, -w + r, -h)
  }
  return path
}
export function buildFlushControlGeometry(
  n: FlushControlNode,
  ctx?: GeometryContext,
) {
  const root = new Group(),
    d = controlDimensions(n)
  const add = (geometry: BufferGeometry, slot: string, x = 0, y = 0, z = 0) => {
    const ref = n.slots?.[slot],
      material =
        (ref ? resolveMaterialRef(ref, ctx?.materials, 'rendered') : null) ??
        createDefaultMaterial(
          slot === 'sensor' || slot === 'seams' ? '#252a30' : '#bbc3cb',
          0.2,
          'rendered',
        )
    const mesh = new Mesh(geometry, material)
    mesh.position.set(x, y, z)
    mesh.userData = { slotId: slot, __fromGeometry: true }
    mesh.castShadow = true
    root.add(mesh)
    return mesh
  }
  const beveled = (shape: FlushControlNode['shape'], width: number, height: number, depth: number) => {
    const b = Math.min(n.edgeRadius, depth / 3, width / 12, height / 12)
    const geometry = new ExtrudeGeometry(controlOutline(shape, width - 2 * b, height - 2 * b), {
      depth: depth - 2 * b, bevelEnabled: true, bevelSize: b, bevelThickness: b,
      bevelSegments: 3, steps: 1, curveSegments: 48,
    })
    geometry.translate(0, 0, b)
    return geometry
  }
  const backing = add(beveled(n.shape, d.width * 0.96, d.height * 0.96, n.thickness * 0.2), 'seams')
  backing.name = 'flush-plate-backing'
  const plate = add(beveled(n.shape, d.width, d.height, n.thickness * 0.8), 'plate', 0, 0, n.thickness * 0.2)
  plate.name = 'flush-plate-face'
  if (n.flushMode === 'touchless')
    add(
      new BoxGeometry(
        Math.min(0.04, d.width * 0.3),
        Math.min(0.018, d.height * 0.3),
        n.buttonProjection,
      ),
      'sensor',
      0,
      0,
      n.thickness + n.buttonProjection / 2,
    )
  else {
    const count = n.flushMode === 'dual' ? 2 : 1,
      size = Math.min(
        n.buttonSize,
        d.height * 0.65,
        d.width / (count === 2 ? 3 : 1.5),
      )
    for (let i = 0; i < count; i++) {
      const width = size * (count === 2 && i === 1 ? 0.75 : 1),
        height = n.buttonShape === 'oval' ? width * 0.65 : width
      const shape =
        n.buttonShape === 'rectangle'
          ? 'rectangle'
          : n.buttonShape === 'oval'
            ? 'oval'
            : 'round'
      const x = count === 1 ? 0 : (i === 0 ? -1 : 1) * d.width * 0.2
      const gap = Math.min(n.seamWidth, width * 0.05, height * 0.05)
      const seam = controlOutline(shape, width + gap * 2, height + gap * 2)
      seam.holes.push(new Path(controlOutline(shape, width, height).getPoints(48).reverse()))
      add(new ExtrudeGeometry(seam, {depth: 0.0002, bevelEnabled: false, curveSegments: 48}), 'seams', x, 0, n.thickness)
      const button = add(beveled(shape, width, height, n.buttonProjection), 'buttons', x, 0, n.thickness)
      button.name = `flush-button-${i + 1}`
    }
  }
  if ('mount' in n && n.mount === 'pull-chain') {
    add(
      new CylinderGeometry(0.002, 0.002, n.chainLength, 12),
      'buttons',
      0,
      -n.chainLength / 2,
      0,
    )
    add(
      new CylinderGeometry(0.012, 0.008, 0.06, 16),
      'buttons',
      0,
      -n.chainLength - 0.03,
      0,
    )
  }
  return root
}
export const flushControlGeometryKey = (n: FlushControlNode) =>
  JSON.stringify([
    n.edgeRadius,
    n.seamWidth,
    n.shape,
    n.width,
    n.height,
    n.thickness,
    n.buttonShape,
    n.buttonSize,
    n.buttonProjection,
    n.flushMode,
    n.slots,
    'mount' in n ? n.mount : null,
    'chainLength' in n ? n.chainLength : null,
  ])
