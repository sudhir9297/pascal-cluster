import type { GeometryContext } from '@pascal-app/core'
import { createDefaultMaterial, resolveMaterialRef } from '@pascal-app/viewer'
import { CylinderGeometry, Group, Mesh, MeshStandardMaterial, TorusGeometry, type BufferGeometry, type Material } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { basinOutline, basinGeometryKey } from '../countertop-basin/geometry'
import { WallHungBasinNode } from '../countertop-basin/schema'
import { buildBasinShell, unwrapBasinDrainCover, type BasinRing } from '../countertop-basin/uv'
import { createBasinTapTarget } from '../countertop-basin/tap-attachment'
import { drillBasinTapHoles } from '../countertop-basin/tap-holes'
import { addWallBasinPlumbing } from './plumbing'
import { WALL_BASIN_DRAIN_Z, wallBasinBowlSize, wallBasinOutline } from './profile'

export { wallBasinBowlSize } from './profile'

export function wallHungBasinGeometryKey(node: WallHungBasinNode) {
  return JSON.stringify({ version: 2, bowl: basinGeometryKey(node), design: node.wallDesign, plumbing: node.plumbingStyle,
    enabled: node.plumbingEnabled, drop: node.plumbingDrop, overflow: node.overflowEnabled })
}

export function buildWallHungBasinGeometry(raw: WallHungBasinNode, ctx?: GeometryContext) {
  const node = WallHungBasinNode.parse(raw), size = wallBasinBowlSize(node)
  const group = new Group()
  const material = (slot: string, metal = false): Material => {
    const ref = node.slots?.[slot]
    const resolved = ref ? resolveMaterialRef(ref, ctx?.materials, 'rendered') : null
    return resolved ?? (metal ? new MeshStandardMaterial({ color: '#bbc3cb', metalness: 0.9, roughness: 0.22 }) : createDefaultMaterial(slot === 'overflow' ? '#20252a' : '#ffffff', slot === 'overflow' ? 0.7 : 0.2, 'rendered'))
  }
  const ceramic = material('bowl'), hardware = material('plumbing', true)
  const add = (name: string, geometry: BufferGeometry, finish: Material, slotId: string) => {
    const mesh = new Mesh(geometry, finish)
    mesh.name = name
    mesh.userData.slotId = slotId
    mesh.userData.__fromGeometry = true
    mesh.castShadow = mesh.receiveShadow = true
    group.add(mesh)
    return mesh
  }
  group.add(createBasinTapTarget(node))

  const t = node.wallThickness, baseY = -node.height, floorY = baseY + t * 1.5, rimY = -0.006
  const rings: BasinRing[] = []
  const outer = (u: number, y: number) => rings.push({ y,
    points: wallBasinOutline(node, node.width * (1 - node.taper * (1 - u)), node.depth * (1 - node.taper * 0.55 * (1 - u))) })
  for (let i = 0; i <= 16; i++) {
    const u = i / 16
    outer(Math.sin(u * Math.PI / 2), baseY + (node.height + rimY) * u)
  }
  const outerTop = rings.length - 1
  rings.push({ y: 0, points: wallBasinOutline(node, node.width - 0.004, node.depth - 0.002) })
  const deckStart = rings.length - 1
  const inner = (width: number, depth: number, y: number) => rings.push({ y,
    points: (node.wallDesign === 'sculpted' ? wallBasinOutline({ ...node, width, depth }, width, depth) : basinOutline(node.shape, width, depth)).map(([x, z]) => [x, z + WALL_BASIN_DRAIN_Z]) })
  inner(size.width, size.depth, 0)
  const deckEnd = rings.length - 1
  inner(size.width - 0.006, size.depth - 0.006, rimY)
  const innerBaseWidth = size.width * (1 - node.taper) - t * 2
  const innerBaseDepth = size.depth * (1 - node.taper) - t * 2
  for (let i = 1; i <= 20; i++) {
    const u = i / 20, curve = Math.cos(u * Math.PI / 2)
    inner(innerBaseWidth + (size.width - 0.006 - innerBaseWidth) * curve,
      innerBaseDepth + (size.depth - 0.006 - innerBaseDepth) * curve,
      floorY + (rimY - floorY) * (1 - u) ** 2)
  }
  const wallEnd = rings.length - 1
  const floorOutline = rings[wallEnd]!.points
  const holePoints = basinOutline('round', node.drainDiameter, node.drainDiameter).map(([x, z]) => [x, z + WALL_BASIN_DRAIN_Z] as [number, number])
  for (let i = 1; i <= 8; i++) {
    const u = i / 8
    rings.push({ y: floorY - 0.003 * u, points: floorOutline.map(([x, z], j) =>
      [x * (1 - u) + holePoints[j]![0] * u, z * (1 - u) + holePoints[j]![1] * u]) })
  }
  const floorEnd = rings.length - 1
  rings.push({ y: baseY, points: holePoints })
  outer(0, baseY)
  add('basin-bowl', drillBasinTapHoles(buildBasinShell(rings, [
    { start: 0, end: outerTop, mapping: 'curved' },
    { start: outerTop, end: deckStart, mapping: 'curved' },
    { start: deckStart, end: deckEnd, mapping: 'planar' },
    { start: deckEnd, end: wallEnd, mapping: 'curved' },
    { start: wallEnd, end: floorEnd, mapping: 'planar' },
    { start: floorEnd, end: floorEnd + 1, mapping: 'curved' },
    { start: floorEnd + 1, end: floorEnd + 2, mapping: 'planar' },
  ]), node, -node.height / 2, node.height + .1), ceramic, 'bowl')

  if (node.drainCover) {
    const radius = node.drainDiameter / 2 + 0.004
    const cover = add('basin-drain-cover', unwrapBasinDrainCover(new CylinderGeometry(radius, radius, 0.004, 48), radius, 0.004), material('drain', true), 'drain')
    cover.position.set(0, floorY + 0.002, WALL_BASIN_DRAIN_Z)
  }

  if (node.overflowEnabled) {
    const y = Math.max(floorY + 0.016, -0.035)
    const u = 1 - Math.sqrt((y - floorY) / (rimY - floorY)), curve = Math.cos(u * Math.PI / 2)
    const z = WALL_BASIN_DRAIN_Z + (innerBaseDepth + (size.depth - 0.006 - innerBaseDepth) * curve) / 2
    const bore = add('basin-overflow-recess', new CylinderGeometry(0.007, 0.007, 0.006, 32), material('overflow'), 'overflow')
    bore.rotation.x = Math.PI / 2
    bore.position.set(0, y, z - 0.002)
    const trim = add('basin-overflow-trim', new TorusGeometry(0.0085, 0.0016, 10, 32), hardware, 'plumbing')
    trim.position.set(0, y, z - 0.005)
  }
  if (node.wallDesign === 'classic') {
    const lip = add('basin-raised-rear-lip', new RoundedBoxGeometry(node.width - 0.04, 0.04, 0.03, 3, 0.005), ceramic, 'bowl')
    lip.position.set(0, 0.02, node.depth / 2 - 0.015)
  }
  addWallBasinPlumbing(group, node, ceramic, hardware)
  if (!node.plumbingEnabled && !node.overflowEnabled && !hardware.userData.__pascalCachedMaterial) hardware.dispose()
  return group
}
