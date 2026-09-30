import type { GeometryContext } from '@pascal-app/core'
import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Group, Mesh, Shape, SphereGeometry, type BufferGeometry } from 'three'
import { CornerVanityNode } from './schema'
import { vanityMaterials } from './materials'
import { vanitySlotForPart } from './slots'
import { vanityPartOpening } from './layout'

export function cornerVanityOutline(node: CornerVanityNode, overhang = 0): [number, number][] {
  const r = node.width / Math.SQRT2, f = r * 0.65
  return [[0, r], [-r, 0], [-f - overhang, f - r - overhang], [f + overhang, f - r - overhang], [r, 0]]
}

export function buildCornerVanityGeometry(raw: CornerVanityNode, ctx?: GeometryContext): Group {
  const node = CornerVanityNode.parse(raw)
  const group = new Group(), materials = vanityMaterials(node, ctx)
  const r = node.width / Math.SQRT2, f = r * 0.65, frontZ = f - r
  const t = node.panelThickness, gap = node.frontGap, bottom = node.legHeight
  const top = node.height - (node.countertopEnabled ? node.countertopThickness : 0)
  const points = cornerVanityOutline(node)
  const mesh = (name: string, geometry: BufferGeometry, position: [number, number, number], parent = group) => {
    const part = new Mesh(geometry, materials[vanitySlotForPart(name)])
    part.name = name
    part.userData.slotId = vanitySlotForPart(name)
    part.userData.__fromGeometry = true
    part.position.set(...position)
    part.castShadow = part.receiveShadow = true
    parent.add(part)
    return part
  }
  const box = (name: string, dimensions: [number, number, number], position: [number, number, number], parent = group) =>
    mesh(name, new BoxGeometry(...dimensions), position, parent)
  const plate = (name: string, outline: [number, number][], y: number, thickness: number) => {
    const shape = new Shape()
    outline.forEach(([x, z], i) => i ? shape.lineTo(x, z) : shape.moveTo(x, z))
    shape.closePath()
    const geometry = new ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false })
    geometry.rotateX(Math.PI / 2)
    return mesh(name, geometry, [0, y, 0])
  }
  for (const index of [0, 1, 3, 4]) {
    const a = points[index]!, b = points[(index + 1) % points.length]!
    const length = Math.hypot(b[0] - a[0], b[1] - a[1])
    const panel = box(`vanity-corner-side-${index}`, [length, top - bottom, t],
      [(a[0] + b[0]) / 2 - (b[1] - a[1]) * t / (2 * length), (top + bottom) / 2, (a[1] + b[1]) / 2 + (b[0] - a[0]) * t / (2 * length)])
    panel.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0])
  }
  plate('vanity-bottom', points.map(([x, z]) => [x * 0.97, z * 0.97]), bottom + t, t)
  plate('vanity-recessed-plinth', points.map(([x, z]) => [x * 0.9, z * 0.9]), bottom, bottom)
  for (let i = 0; i < node.interiorShelves; i++) {
    plate(`vanity-shelf-0-${i}`, points.map(([x, z]) => [x * 0.94, z * 0.94]), bottom + (top - bottom) * (i + 1) / (node.interiorShelves + 1), t)
  }
  const total = f * 2 - gap * 2, w = (total - gap * (node.doorCount - 1)) / node.doorCount, h = top - bottom - gap * 2
  for (let i = 0; i < node.doorCount; i++) {
    const left = i === 0, direction = left ? 1 : -1
    const center = -total / 2 + w / 2 + i * (w + gap)
    const pivot = new Group()
    pivot.name = `vanity-door-0-${i}`
    pivot.position.set(center - direction * w / 2, (top + bottom) / 2, frontZ)
    pivot.userData.vanityPose = { id: pivot.name, kind: 'door', direction }
    pivot.rotation.y = direction * vanityPartOpening(node, { id: pivot.name, kind: 'door' }) * Math.PI / 2
    group.add(pivot)
    const x = direction * w / 2
    if (node.frontStyle === 'shaker') {
      const frame = Math.min(node.frameWidth, w * 0.22, h * 0.22)
      box(`${pivot.name}-panel`, [w - frame * 2, h - frame * 2, t / 2], [x, 0, t * 0.65], pivot)
      for (const side of [-1, 1]) {
        box(`${pivot.name}-stile-${side}`, [frame, h, t], [x + side * (w - frame) / 2, 0, t / 2], pivot)
        box(`${pivot.name}-rail-${side}`, [w - frame * 2, frame, t], [x, side * (h - frame) / 2, t / 2], pivot)
      }
    } else {
      box(`${pivot.name}-panel`, [w, h, t], [x, 0, t / 2], pivot)
      if (node.frontStyle === 'fluted') {
        const count = Math.max(2, Math.floor(w / node.fluteSpacing))
        for (let j = 0; j < count; j++) {
          const rib = mesh(`${pivot.name}-flute-${j}`, new CylinderGeometry(0.004, 0.004, h - 0.004, 10), [x - w / 2 + w * (j + 0.5) / count, 0, 0], pivot)
          rib.scale.z = 0.6
        }
      }
    }
    const pullX = x + direction * w * 0.3
    if (node.handleStyle === 'knob') mesh(`${pivot.name}-knob`, new SphereGeometry(0.012, 12, 10), [pullX, h * 0.2, -0.02], pivot)
    else if (node.handleStyle === 'bar') {
      box(`${pivot.name}-bar`, [0.009, Math.min(node.handleLength, h * 0.5), 0.009], [pullX, h * 0.2, -0.028], pivot)
      for (const side of [-1, 1]) box(`${pivot.name}-mount-${side}`, [0.009, 0.009, 0.025], [pullX, h * 0.2 + side * Math.min(node.handleLength, h * 0.5) * 0.35, -0.013], pivot)
    } else if (node.handleStyle === 'edge') box(`${pivot.name}-edge-lip`, [w * 0.5, 0.008, 0.025], [x, h / 2, -0.01], pivot)
  }
  if (node.countertopEnabled) plate('vanity-countertop', cornerVanityOutline(node, node.countertopOverhang), node.height, node.countertopThickness)
  return group
}
