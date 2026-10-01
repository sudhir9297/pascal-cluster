import type { GeometryContext } from '@pascal-app/core'
import { createDefaultMaterial, resolveMaterialRef } from '@pascal-app/viewer'
import { BufferGeometry, CylinderGeometry, Group, Mesh, type Material } from 'three'
import { BasinParameters, BasinNode, basinDepth, DROP_IN_BASIN, SEMI_RECESSED_BASIN, isInsetBasinKind } from './schema'
import { createBasinTapTarget } from './tap-attachment'
import { buildBasinShell, unwrapBasinDrainCover, type BasinRing } from './uv'

import { buildSemiRecessedShell, semiRecessedDrainZ } from './semi-recessed-geometry'

const segments = 96
export function basinOutline(shape: BasinNode['shape'], width: number, depth: number, count = segments): [number, number][] {
  const power = shape === 'rectangle' ? 0.5 : 1
  return Array.from({ length: count }, (_, i) => {
    const angle = i * Math.PI * 2 / count, c = Math.cos(angle), s = Math.sin(angle)
    return [Math.sign(c) * Math.abs(c) ** power * width / 2, Math.sign(s) * Math.abs(s) ** power * depth / 2]
  })
}

export function basinGeometryKey(node: BasinNode) {
  return JSON.stringify({ version: 8, kind: node.type, recessDepth: node.type === SEMI_RECESSED_BASIN ? node.recessDepth : undefined, parameters: BasinParameters.parse(node), flangeWidth: node.flangeWidth, rimHeight: node.type === DROP_IN_BASIN ? node.rimHeight : undefined, slots: node.slots ?? {}, tapTarget: node.tapTarget, tapSlots: node.tapSlots, tapSlotCount: node.tapSlotCount, tapMountingLayout: node.tapMountingLayout, tapHoleSpacing: node.tapHoleSpacing })
}

export function buildCountertopBasinGeometry(raw: BasinNode, ctx?: GeometryContext): Group {
  const node = BasinNode.parse(raw), depth = basinDepth(node)
  const group = new Group()
  group.add(createBasinTapTarget(node, ctx?.parent ? { [ctx.parent.id]: ctx.parent } : {}))
  const material = (slot: string) => {
    const ref = node.slots?.[slot]
    return (ref ? resolveMaterialRef(ref, ctx?.materials, 'rendered') : null) ?? createDefaultMaterial('#ffffff', 0.25, 'rendered')
  }
  const add = (name: string, geometry: BufferGeometry, finish: Material, slotId: string) => {
    const mesh = new Mesh(geometry, finish)
    mesh.name = name
    mesh.userData.slotId = slotId
    mesh.userData.__fromGeometry = true
    mesh.castShadow = mesh.receiveShadow = true
    group.add(mesh)
    return mesh
  }
  if (node.type === SEMI_RECESSED_BASIN) {
    const bowl = add('basin-bowl', buildSemiRecessedShell(node), material('bowl'), 'bowl')
    bowl.position.y = -node.recessDepth
    if (node.drainCover) {
      const radius = node.drainDiameter / 2 + 0.004
      const cover = add('basin-drain-cover', unwrapBasinDrainCover(new CylinderGeometry(radius, radius, 0.004, 48), radius, 0.004), material('drain'), 'drain')
      cover.position.set(0, node.wallThickness * 1.5 + 0.002 - node.recessDepth, semiRecessedDrainZ(node))
    }
    return group
  }
  const t = node.wallThickness, rimRadius = t / 2, floor = t * 1.5
  const rings: BasinRing[] = []
  const ring = (width: number, d: number, y: number, shape = node.shape) => rings.push({ points: basinOutline(shape, width, d), y })
  const baseWidth = node.width * (1 - node.taper), baseDepth = depth * (1 - node.taper)
  for (let i = 0; i <= 16; i++) {
    const u = i / 16, flare = Math.sin(u * Math.PI / 2)
    ring(baseWidth + (node.width - baseWidth) * flare, baseDepth + (depth - baseDepth) * flare, u * (node.height - rimRadius))
  }
  for (let i = 1; i <= 8; i++) {
    const angle = i * Math.PI / 8, inset = rimRadius * (1 - Math.cos(angle))
    ring(node.width - inset * 2, depth - inset * 2, node.height - rimRadius + rimRadius * Math.sin(angle))
  }
  const rimEnd = rings.length - 1
  const innerBaseWidth = baseWidth - t * 2, innerBaseDepth = baseDepth - t * 2
  for (let i = 1; i <= 20; i++) {
    const u = i / 20, curve = Math.cos(u * Math.PI / 2)
    ring(innerBaseWidth + (node.width - t * 2 - innerBaseWidth) * curve,
      innerBaseDepth + (depth - t * 2 - innerBaseDepth) * curve,
      floor + (node.height - rimRadius - floor) * (1 - u) ** 2)
  }
  const wallEnd = rings.length - 1
  const hole = node.drainDiameter
  const outerFloor = basinOutline(node.shape, innerBaseWidth, innerBaseDepth)
  const holePoints = basinOutline('round', hole, hole)
  for (let i = 1; i <= 8; i++) {
    const u = i / 8
    rings.push({ y: floor - 0.003 * u, points: outerFloor.map(([x, z], j) => [x * (1 - u) + holePoints[j]![0] * u, z * (1 - u) + holePoints[j]![1] * u]) })
  }
  const floorEnd = rings.length - 1
  ring(hole, hole, 0, 'round')
  ring(baseWidth, baseDepth, 0)
  const shell = buildBasinShell(rings, [
    { start: 0, end: rimEnd, mapping: 'curved' },
    { start: rimEnd, end: wallEnd, mapping: 'curved' },
    { start: wallEnd, end: floorEnd, mapping: 'planar' },
    { start: floorEnd, end: floorEnd + 1, mapping: 'curved' },
    { start: floorEnd + 1, end: floorEnd + 2, mapping: 'planar' },
  ])
  add('basin-bowl', shell, material('bowl'), 'bowl')
  if (node.drainCover) {
    const radius = hole / 2 + 0.004
    const cover = add('basin-drain-cover', unwrapBasinDrainCover(new CylinderGeometry(radius, radius, 0.004, 48), radius, 0.004), material('drain'), 'drain')
    cover.position.y = floor + 0.002
  }
  if (isInsetBasinKind(node.type)) {
    // The mount plane is the underside for undermount, and the top for drop-in.
    for (const child of group.children) if (child instanceof Mesh) child.position.y -= node.height
    const dropIn = node.type === DROP_IN_BASIN
    const top = dropIn ? node.rimHeight : 0, bottom = dropIn ? 0 : -0.004
    const innerWidth = node.width - (dropIn ? node.wallThickness * 2 : 0)
    const innerDepth = depth - (dropIn ? node.wallThickness * 2 : 0)
    const flangeRings: BasinRing[] = [
      { points: basinOutline(node.shape, node.width + node.flangeWidth * 2, depth + node.flangeWidth * 2), y: top },
      { points: basinOutline(node.shape, innerWidth, innerDepth), y: top },
      { points: basinOutline(node.shape, innerWidth, innerDepth), y: bottom },
      { points: basinOutline(node.shape, node.width + node.flangeWidth * 2, depth + node.flangeWidth * 2), y: bottom },
      { points: basinOutline(node.shape, node.width + node.flangeWidth * 2, depth + node.flangeWidth * 2), y: top },
    ]
    add(dropIn ? 'basin-drop-in-rim' : 'basin-mounting-flange', buildBasinShell(flangeRings, [
      { start: 0, end: 1, mapping: 'planar' }, { start: 1, end: 2, mapping: 'curved' },
      { start: 2, end: 3, mapping: 'planar' }, { start: 3, end: 4, mapping: 'curved' },
    ]), material('bowl'), 'bowl')
  }
  return group
}
