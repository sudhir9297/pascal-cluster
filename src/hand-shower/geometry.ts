import type { GeometryContext } from '@pascal-app/core'
import { createDefaultMaterial, resolveMaterialRef } from '@pascal-app/viewer'
import {
  BoxGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  Shape,
  TorusGeometry,
  type BufferGeometry,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { HandShowerNode } from './schema'
export const handShowerHoseTarget = (n: HandShowerNode) => ({
  position: [0, -n.gripInsertion - n.connectorLength, 0] as [number, number, number],
  rotation: [0, 0, 0] as [number, number, number],
})
export function handShowerDimensions(n: HandShowerNode) {
  const wand = n.style.endsWith('wand')
  return {
    wand,
    width: wand ? n.handleDiameter * 0.82 : n.headWidth,
    height: wand ? n.handleLength * 0.65 : n.style === 'round' ? n.headWidth : n.headHeight,
    thickness: wand ? 0.004 : n.headThickness,
  }
}
function roundedPlate(w: number, h: number, r: number, t: number) {
  const s = new Shape(),
    x = w / 2,
    y = h / 2
  s.moveTo(-x + r, -y)
  s.lineTo(x - r, -y)
  s.quadraticCurveTo(x, -y, x, -y + r)
  s.lineTo(x, y - r)
  s.quadraticCurveTo(x, y, x - r, y)
  s.lineTo(-x + r, y)
  s.quadraticCurveTo(-x, y, -x, y - r)
  s.lineTo(-x, -y + r)
  s.quadraticCurveTo(-x, -y, -x + r, -y)
  const g = new ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 12 })
  g.translate(0, 0, -t / 2)
  return g
}
export function buildHandShowerGeometry(n: HandShowerNode, ctx?: GeometryContext) {
  const root = new Group(),
    wand = n.style.endsWith('wand'),
    square = n.style.startsWith('square'),
    circular = n.style === 'round' || n.style === 'oval'
  const materials = new Map<string, ReturnType<typeof createDefaultMaterial>>()
  const add = (
    parent: Group,
    g: BufferGeometry,
    slot: string,
    position: [number, number, number],
  ) => {
    let mat = materials.get(slot)
    if (!mat) {
      const ref = n.slots?.[slot]
      mat =
        (ref ? resolveMaterialRef(ref, ctx?.materials, 'rendered') : null) ??
        createDefaultMaterial('#ffffff', slot === 'nozzles' ? 0.7 : 0.25, 'rendered')
      materials.set(slot, mat)
    }
    const mesh = new Mesh(g, mat)
    mesh.position.fromArray(position)
    mesh.userData = { slotId: slot, __fromGeometry: true }
    parent.add(mesh)
    return mesh
  }
  const base = -n.gripInsertion,
    handleH = n.handleLength + n.gripInsertion
  add(
    root,
    square
      ? roundedPlate(n.handleDiameter, handleH, 0.002, n.handleDiameter)
      : new CylinderGeometry(n.handleDiameter * 0.43, n.handleDiameter / 2, handleH, 40),
    'handle',
    [0, (n.handleLength + base) / 2, 0],
  )
  add(root, new CylinderGeometry(0.0105, 0.0105, n.connectorLength, 40), 'connector', [
    0,
    base - n.connectorLength / 2,
    0,
  ])
  const dims = handShowerDimensions(n)
  // Shoulder blends the grip into the head; wands retain a single straight body.
  if (!wand) {
    const shoulder = add(
      root,
      new CylinderGeometry(n.handleDiameter * 0.7, n.handleDiameter * 0.43, dims.height * 0.35, 40),
      'body',
      [0, n.handleLength + dims.height * 0.1, 0],
    )
    shoulder.rotation.x = (-n.headAngle * Math.PI) / 360
  }
  for (let i = 0; i < 5; i++) {
    const thread = add(root, new TorusGeometry(0.0105, 0.0007, 8, 32), 'connector', [
      0,
      base - 0.002 - i * n.connectorLength * 0.15,
      0,
    ])
    thread.rotation.x = Math.PI / 2
  }
  add(
    root,
    new CylinderGeometry(n.handleDiameter / 2, n.handleDiameter / 2, 0.005, 40),
    'connector',
    [0, base + 0.0025, 0],
  )
  if (n.gripRidges && !square)
    for (let i = 0; i < 8; i++) {
      const y = n.handleLength * (0.15 + i * 0.055)
      const r = n.handleDiameter * (0.5 - (0.07 * (y - base)) / handleH)
      const ring = add(root, new TorusGeometry(r, 0.0007, 8, 32), 'handle', [0, y, 0])
      ring.rotation.x = Math.PI / 2
    }
  const head = new Group()
  root.add(head)
  head.position.y = wand ? n.handleLength * 0.6 : n.handleLength + dims.height * 0.3
  head.rotation.x = wand ? 0 : (-n.headAngle * Math.PI) / 180
  const { width, height, thickness } = dims
  let g: BufferGeometry
  if (circular) {
    g = new CylinderGeometry(width / 2, width / 2, thickness, 48)
    g.rotateX(Math.PI / 2)
    g.scale(1, height / width, 1)
  } else
    g = roundedPlate(
      width,
      height,
      n.style === 'soft-square' ? Math.min(n.cornerRadius, width / 2, height / 2) : 0.001,
      thickness,
    )
  add(head, g, 'body', [0, 0, wand ? n.handleDiameter * 0.5 : 0])
  let face: BufferGeometry
  if (circular) {
    face = new CylinderGeometry(width / 2 - 0.004, width / 2 - 0.004, 0.002, 48)
    face.rotateX(Math.PI / 2)
    face.scale(1, (height - 0.008) / (width - 0.008), 1)
  } else
    face = roundedPlate(
      width - 0.006,
      height - 0.006,
      n.style === 'soft-square'
        ? Math.max(
            0.001,
            Math.min(n.cornerRadius - 0.003, (width - 0.006) / 2, (height - 0.006) / 2),
          )
        : 0.001,
      0.002,
    )
  const z = wand ? n.handleDiameter * 0.5 + thickness / 2 : thickness / 2
  add(head, face, 'face', [0, 0, z + 0.001])
  if (n.nozzlesEnabled) {
    const parts: BufferGeometry[] = [],
      nx = Math.max(0, Math.floor((width - (wand ? 0.006 : 0.016)) / n.nozzleSpacing)),
      ny = Math.max(0, Math.floor((height - 0.016) / n.nozzleSpacing))
    const margin = Math.max(wand ? 0.003 : 0.008, n.nozzleDiameter)
    const radius = n.style === 'soft-square' ? Math.min(n.cornerRadius, width / 2, height / 2) : 0
    for (let i = 0; i <= nx; i++)
      for (let j = 0; j <= ny; j++) {
        const x = (i - nx / 2) * n.nozzleSpacing,
          y = (j - ny / 2) * n.nozzleSpacing
        if (
          circular &&
          Math.pow(x / (width / 2 - 0.008), 2) + Math.pow(y / (height / 2 - 0.008), 2) > 1
        )
          continue
        if (Math.abs(x) > width / 2 - margin || Math.abs(y) > height / 2 - margin) continue
        if (
          radius &&
          Math.hypot(
            Math.max(0, Math.abs(x) - (width / 2 - radius)),
            Math.max(0, Math.abs(y) - (height / 2 - radius)),
          ) > Math.max(0, radius - margin)
        )
          continue
        const part = new CylinderGeometry(n.nozzleDiameter / 2, n.nozzleDiameter / 2, 0.003, 8)
        part.rotateX(Math.PI / 2)
        part.translate(x, y, z + 0.003)
        parts.push(part)
      }
    if (parts.length) {
      const merged = mergeGeometries(parts)!
      for (const part of parts) part.dispose()
      add(head, merged, 'nozzles', [0, 0, 0])
    }
  }
  if (n.selectorEnabled && !wand) {
    const control = add(root, new CylinderGeometry(0.007, 0.007, 0.004, 24), 'controls', [
      0,
      n.handleLength * 0.75,
      n.handleDiameter / 2 + 0.002,
    ])
    control.rotation.x = Math.PI / 2
  }
  const target = new Group(),
    pose = handShowerHoseTarget(n)
  target.name = 'shower_hose_target_hose-end'
  target.position.fromArray(pose.position)
  target.userData = {
    attachmentTarget: 'shower_hose_end',
    hostId: n.id,
    slotId: 'hose-end',
    capacity: 1,
  }
  root.add(target)
  return root
}
export const handShowerGeometryKey = (n: HandShowerNode) =>
  JSON.stringify([
    3,
    n.style,
    n.cornerRadius,
    n.connectorLength,
    n.gripRidges,
    n.headWidth,
    n.headHeight,
    n.headThickness,
    n.handleLength,
    n.handleDiameter,
    n.gripInsertion,
    n.headAngle,
    n.nozzleSpacing,
    n.nozzleDiameter,
    n.nozzlesEnabled,
    n.selectorEnabled,
    n.slots,
  ])
