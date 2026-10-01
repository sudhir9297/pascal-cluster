import { type GeometryContext, type AnyNodeId } from '@pascal-app/core'
import { createDefaultMaterial, resolveMaterialRef } from '@pascal-app/viewer'
import { Group, Mesh, Shape, Path, ExtrudeGeometry, LatheGeometry, Vector2 } from 'three'
import { ShowerArmNode, SHOWER_ARM } from '../shower-arm/schema'
import type { ShowerFlangeNode } from './schema'
export function flangeFit(n: ShowerFlangeNode, ctx?: GeometryContext) {
  const raw = n.parentId ? ctx?.resolve(n.parentId as AnyNodeId) : null,
    arm = raw && String(raw.type) === SHOWER_ARM ? ShowerArmNode.parse(raw) : null
  const tube = arm?.tubeSize ?? 0.025,
    square = arm?.style.startsWith('square') ?? false
  const bore = tube + 2 * n.clearance,
    radialBore = (square ? Math.SQRT2 * tube : tube) / 2 + n.clearance
  const width = Math.max(
    n.width,
    (n.style.includes('round') || n.style === 'deep-bell' ? radialBore * 2 : bore) +
      (['raised-round', 'stepped-round', 'deep-bell'].includes(n.style) ? 0.024 : 0.012),
  )
  return { tube, square, bore, radialBore, width }
}
function outline(size: number, radius: number) {
  const s = new Shape(),
    h = size / 2,
    r = Math.min(radius, h)
  s.moveTo(-h + r, -h)
  s.lineTo(h - r, -h)
  s.quadraticCurveTo(h, -h, h, -h + r)
  s.lineTo(h, h - r)
  s.quadraticCurveTo(h, h, h - r, h)
  s.lineTo(-h + r, h)
  s.quadraticCurveTo(-h, h, -h, h - r)
  s.lineTo(-h, -h + r)
  s.quadraticCurveTo(-h, -h, -h + r, -h)
  return s
}
export function buildShowerFlangeGeometry(n: ShowerFlangeNode, ctx?: GeometryContext) {
  const root = new Group(),
    fit = flangeFit(n, ctx),
    r = fit.width / 2,
    b = fit.radialBore
  let geometry: ExtrudeGeometry | LatheGeometry
  if (['raised-round', 'stepped-round', 'deep-bell'].includes(n.style)) {
    const profile =
      n.style === 'stepped-round'
        ? [
            [b, 0],
            [r, 0],
            [r, n.depth * 0.35],
            [Math.max(b + 0.004, r * 0.76), n.depth * 0.35],
            [Math.max(b + 0.004, r * 0.76), n.depth * 0.7],
            [b + 0.004, n.depth * 0.7],
            [b + 0.004, n.depth],
            [b, n.depth],
            [b, 0],
          ]
        : n.style === 'raised-round'
          ? [
              [b, 0],
              [r, 0],
              [r, n.depth * 0.15],
              [r * 0.96, n.depth * 0.45],
              [Math.max(b + 0.004, r * 0.8), n.depth * 0.8],
              [b + 0.004, n.depth],
              [b, n.depth],
              [b, 0],
            ]
          : [
              [b, 0],
              [r, 0],
              [r, n.depth * 0.1],
              [Math.max(b + 0.007, r * 0.85), n.depth * 0.4],
              [b + 0.007, n.depth * 0.85],
              [b + 0.004, n.depth],
              [b, n.depth],
              [b, 0],
            ]
    geometry = new LatheGeometry(
      profile.map(([x, y]) => new Vector2(x!, y!)),
      64,
    )
    geometry.rotateX(Math.PI / 2)
  } else {
    const shape =
      n.style === 'round-plate'
        ? new Shape()
        : outline(
            fit.width,
            n.style === 'soft-square' ? Math.min(n.cornerRadius, fit.width * 0.24) : 0,
          )
    if (n.style === 'round-plate') shape.absarc(0, 0, r, 0, Math.PI * 2, false)
    const hole = new Path(),
      h = fit.bore / 2
    if (fit.square) {
      hole.moveTo(-h, -h)
      hole.lineTo(-h, h)
      hole.lineTo(h, h)
      hole.lineTo(h, -h)
      hole.closePath()
    } else hole.absarc(0, 0, h, 0, Math.PI * 2, true)
    shape.holes.push(hole)
    geometry = new ExtrudeGeometry(shape, {
      depth: n.depth,
      bevelEnabled: false,
      curveSegments: 48,
    })
  }
  const material =
    (n.slots?.cover ? resolveMaterialRef(n.slots.cover, ctx?.materials, 'rendered') : null) ??
    createDefaultMaterial('#ffffff', 0.22, 'rendered')
  const mesh = new Mesh(geometry, material)
  mesh.userData = { slotId: 'cover', __fromGeometry: true }
  root.add(mesh)
  return root
}
