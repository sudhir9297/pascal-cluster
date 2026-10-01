import { type GeometryContext } from '@pascal-app/core'
import { createDefaultMaterial, resolveMaterialRef } from '@pascal-app/viewer'
import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  SphereGeometry,
  type BufferGeometry,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { type BodyJetNode } from './schema'
import { addBodyJetTargets, bodyJetCentre, roundBodyJet, bodyJetPivot } from './targets'
export function buildBodyJetGeometry(n: BodyJetNode, ctx?: GeometryContext) {
  const root = new Group(),
    round = roundBodyJet(n),
    height = round ? n.width : n.height,
    pivot = bodyJetPivot(n),
    materials = new Map<string, ReturnType<typeof createDefaultMaterial>>()
  const add = (g: BufferGeometry, slot: string, p: [number, number, number], parent = root) => {
    let mat = materials.get(slot)
    if (!mat) {
      mat =
        (n.slots?.[slot] ? resolveMaterialRef(n.slots[slot]!, ctx?.materials, 'rendered') : null) ??
        createDefaultMaterial(slot === 'nozzles' ? '#666666' : '#ffffff', 0.25, 'rendered')
      materials.set(slot, mat)
    }
    const m = new Mesh(g, mat)
    m.position.fromArray(p)
    m.userData = { slotId: slot, __fromGeometry: true }
    parent.add(m)
    return m
  }
  for (let index = 0; index < n.jetCount; index++) {
    const centre = bodyJetCentre(n, index),
      jet = new Group()
    jet.position.fromArray(centre)
    root.add(jet)
    if (n.flangeEnabled) {
      const width = Math.max(n.flangeSize, n.width + 0.01),
        h = Math.max(n.flangeSize, height + 0.01),
        plate = add(
          round
            ? new CylinderGeometry(width / 2, width / 2, n.flangeThickness, 40)
            : new BoxGeometry(width, h, n.flangeThickness),
          'flange',
          [0, 0, n.flangeThickness / 2],
          jet,
        )
      if (round) plate.rotation.x = Math.PI / 2
    }
    const stem = add(
      new CylinderGeometry(n.tubeSize / 2, n.tubeSize / 2, pivot, 24),
      'body',
      [0, 0, pivot / 2],
      jet,
    )
    stem.rotation.x = Math.PI / 2
    if (n.style.endsWith('swivel'))
      add(
        new SphereGeometry(n.tubeSize * 0.75, 24, 16),
        'body',
        [
          0,
          0,
          Math.max(pivot * 0.65, (n.flangeEnabled ? n.flangeThickness : 0) + n.tubeSize * 0.75),
        ],
        jet,
      )
    const face = new Group()
    face.position.z = pivot
    face.name = `body-jet-face-${index + 1}`
    face.rotation.set((n.pitch * Math.PI) / 180, (n.yaw * Math.PI) / 180, 0)
    jet.add(face)
    const dome = n.style === 'massage-dome',
      offset = dome ? n.width * 0.35 : 0
    if (dome) add(new SphereGeometry(n.width * 0.46, 32, 24), 'body', [0, 0, 0], face)
    const rim = add(
      round
        ? new CylinderGeometry(n.width / 2, n.width / 2, n.faceDepth, 40)
        : new BoxGeometry(n.width, height, n.faceDepth),
      'body',
      [0, 0, offset],
      face,
    )
    if (round) rim.rotation.x = Math.PI / 2
    const inner = add(
      round
        ? new CylinderGeometry(n.width * 0.44, n.width * 0.44, 0.002, 40)
        : new BoxGeometry(n.width * 0.88, height * 0.88, 0.002),
      'face',
      [0, 0, offset + n.faceDepth / 2 + 0.001],
      face,
    )
    if (round) inner.rotation.x = Math.PI / 2
    if (n.nozzlesEnabled) {
      const parts: BufferGeometry[] = [],
        nx = Math.floor((n.width * 0.39) / n.nozzleSpacing),
        ny = Math.floor((height * 0.39) / n.nozzleSpacing)
      for (let x = -nx; x <= nx; x++)
        for (let y = -ny; y <= ny; y++) {
          const px = x * n.nozzleSpacing,
            py = y * n.nozzleSpacing
          if (round && Math.hypot(px, py) > n.width * 0.39) continue
          const g = new CylinderGeometry(n.nozzleDiameter / 2, n.nozzleDiameter / 2, 0.003, 8)
          g.rotateX(Math.PI / 2)
          g.translate(px, py, offset + n.faceDepth / 2 + 0.003)
          parts.push(g)
        }
      const merged = mergeGeometries(parts)
      for (const p of parts) p.dispose()
      if (merged) add(merged, 'nozzles', [0, 0, 0], face)
    }
  }
  addBodyJetTargets(root, n)
  return root
}
export const bodyJetGeometryKey = (n: BodyJetNode) =>
  JSON.stringify([
    n.style,
    n.width,
    n.height,
    n.projection,
    n.faceDepth,
    n.pitch,
    n.yaw,
    n.jetCount,
    n.groupDirection,
    n.groupSpacing,
    n.tubeSize,
    n.flangeEnabled,
    n.flangeSize,
    n.flangeThickness,
    n.nozzlesEnabled,
    n.nozzleSpacing,
    n.nozzleDiameter,
    n.slots,
  ])
