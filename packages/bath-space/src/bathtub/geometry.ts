import {bathWellFloor,bathBackrestProgress} from './backrest'
import {addBathPlumbing} from './plumbing'
import {partitionBathSurface} from './surface-geometry'
import {bathCornerOutline} from './corner-outline'
import {bathDrainPosition} from './drain'
import { buildWalkInGeometry } from './walk-in-geometry'
import type { GeometryContext } from '@pascal-app/core'
import { createDefaultMaterial, resolveMaterialRef } from '@pascal-app/viewer'
import { BoxGeometry, CylinderGeometry, SphereGeometry, Group, Mesh, TubeGeometry, CatmullRomCurve3, Vector3 } from 'three'
import { basinOutline } from '../countertop-basin/geometry'
import {
  buildBasinShell,
  unwrapBasinDrainCover,
  type BasinRing,
} from '../countertop-basin/uv'
import { BathtubNode, bathBowlDepth, bathRimWidth, bathBaseStyle, bathBaseHeight, bathDrainX, bathUsesDeck } from './schema'
import { createBathTargets } from './targets'

export {bathCornerOutline} from './corner-outline'
export function bathWallOutline(length: number, width: number): [number, number][] {
  return basinOutline('oval', length, width).map(([x, z]) => [x, z >= 0 ? width / 2 : z])
}
export const bathtubOutline = (node: BathtubNode) =>
  node.shape === 'corner' ? bathCornerOutline(node.length, node.width) : node.shape === 'back-to-wall' ? bathWallOutline(node.length, node.width) : basinOutline(
    node.shape === 'undermount' ? node.builtInShape : node.shape === 'rectangle' || node.shape === 'alcove' || node.shape === 'walk-in' ? 'rectangle' : 'oval',
    node.length,
    node.width,
  )
export function bathtubGeometryKey(node: BathtubNode) {
  const { id, parentId, position, rotation, children, name, ...geometry } =
    BathtubNode.parse(node)
  return JSON.stringify(geometry)
}
export function buildBathtubGeometry(raw: BathtubNode, ctx?: GeometryContext) {
  const node = BathtubNode.parse(raw)
  if(node.shape==='walk-in')return buildWalkInGeometry(node,ctx)
  const drainPosition=bathDrainPosition(node)
  const group = new Group(),
    rings: BasinRing[] = []
  const shape = node.shape === 'undermount' ? node.builtInShape : node.shape === 'rectangle' || node.shape === 'alcove' ? 'rectangle' : 'oval',
    rim = bathRimWidth(node),
    floor = node.height - bathBowlDepth(node) * node.height / (node.height - bathBaseHeight(node)),
    radius = 0.012
  const ring = (length: number, width: number, y: number, round = false) =>
    rings.push({
      points: node.shape === 'corner' && !round ? bathCornerOutline(length, width) : basinOutline(round ? 'round' : shape, length, width),
      y,
    })
  const baseL = node.length * (node.shape === 'alcove' || node.shape === 'corner' ? 1 : node.backrestProfile==='classic'?0.8:0.95),
    baseW = node.width * (node.shape === 'alcove' || node.shape === 'corner' ? 1 : 0.72)
  for (let i = 0; i <= 20; i++) {
    const u = i / 20,
      flare = Math.sin((u * Math.PI) / 2)
    ring(
      baseL + (node.length - (bathUsesDeck(node) ? 0.04 : 0) - baseL) * flare,
      baseW + (node.width - (bathUsesDeck(node) ? 0.04 : 0) - baseW) * flare,
      u * (node.height - (bathUsesDeck(node) ? 0.035 : radius)),
    )
  }
  if (bathUsesDeck(node)) ring(node.length,node.width,node.height-radius)
  const exteriorEnd=rings.length-1
  for (let i = 1; i <= 8; i++) {
    const a = (i * Math.PI) / 16
    ring(
      node.length - 2 * radius * (1 - Math.cos(a)),
      node.width - 2 * radius * (1 - Math.cos(a)),
      node.height - radius + radius * Math.sin(a),
    )
  }
  if (node.shape === 'back-to-wall') {
    for (const outer of rings) {
      const length = Math.max(...outer.points.map(p => Math.abs(p[0]))) * 2
      const width = Math.max(...outer.points.map(p => Math.abs(p[1]))) * 2
      outer.points = bathWallOutline(length, width).map(([x, z]) => [x, z >= 0 ? node.width / 2 - (node.height - outer.y < radius ? radius * (1 - Math.sqrt(Math.max(0, 1 - ((outer.y - node.height + radius) / radius) ** 2))) : 0) : z])
    }
  }
  ring(
    node.length - rim * 2 + radius * 2,
    node.width - rim * 2 + radius * 2,
    node.height,
  )
  for (let i = 1; i <= 8; i++) {
    const a = (i * Math.PI) / 16
    ring(
      node.length - rim * 2 + radius * 2 * (1 - Math.sin(a)),
      node.width - rim * 2 + radius * 2 * (1 - Math.sin(a)),
      node.height - radius * (1 - Math.cos(a)),
    )
  }
  const rimEnd = rings.length - 1,
    well = bathWellFloor(node),
    bottomL = well.length,
    bottomW = node.width * 0.48
  for (let i = 1; i <= 24; i++) {
    const u = i / 24,
      curve = bathBackrestProgress(node,u)
    ring(
      bottomL + (node.length - rim * 2 - bottomL) * curve,
      bottomW + (node.width - rim * 2 - bottomW) * curve,
      floor + (node.height - radius - floor) * (1 - u) ** 2,
    )
    for(const p of rings[rings.length-1]!.points)p[0]+=well.center*(1-curve)
  }
  const wallEnd = rings.length - 1,
    outerFloor = rings[wallEnd]!.points,
    hole = basinOutline('round', 0.052, 0.052).map(([x, z]) => [x + drainPosition[0], z+drainPosition[1]] as [number, number])
  for (let i = 1; i <= 8; i++) {
    const u = i / 8
    rings.push({
      y: floor - 0.006 * u,
      points: outerFloor.map(([x, z], j) => [
        x * (1 - u) + hole[j]![0] * u,
        z * (1 - u) + hole[j]![1] * u,
      ]),
    })
  }
  const floorEnd = rings.length - 1
  rings.push({ points: hole, y: 0 })
  ring(baseL, baseW, 0)
  if (node.shape === 'back-to-wall') rings[rings.length - 1]!.points = bathWallOutline(baseL, baseW).map(([x, z]) => [x, z >= 0 ? node.width / 2 : z])
  const geometry = buildBasinShell(rings, [
    { start: 0, end: rimEnd, mapping: 'curved' },
    { start: rimEnd, end: wallEnd, mapping: 'curved' },
    { start: wallEnd, end: floorEnd, mapping: 'planar' },
    { start: floorEnd, end: floorEnd + 1, mapping: 'curved' },
    { start: floorEnd + 1, end: floorEnd + 2, mapping: 'planar' },
  ])
  if (node.shape === 'slipper') {
    const p = geometry.getAttribute('position'),
      normals = geometry.getAttribute('normal')
    for (let i = 0; i < p.count; i++) {
      const x = Math.min(0, p.getX(i)),
        y = p.getY(i),
        halfLength = node.length / 2
      const rise = 0.14 * (x / halfLength) ** 2 * (y / node.height) ** 2
      const dx = ((0.28 * x) / halfLength ** 2) * (y / node.height) ** 2
      const dy = 1 + (0.28 * (x / halfLength) ** 2 * y) / node.height ** 2
      const ny = normals.getY(i) / dy,
        nx = normals.getX(i) - dx * ny,
        nz = normals.getZ(i)
      const magnitude = Math.hypot(nx, ny, nz) || 1
      p.setY(i, y + rise)
      // Transform the welded normals so duplicated UV seams keep matching shading.
      normals.setXYZ(i, nx / magnitude, ny / magnitude, nz / magnitude)
    }
  }
  const material = (slot: string) =>
    (node.slots?.[slot]
      ? resolveMaterialRef(node.slots[slot]!, ctx?.materials, 'rendered')
      : null) ??
    createDefaultMaterial(
      slot === 'shell' || slot === 'apron' || slot==='interior' ? '#ffffff' : '#c0c0c0',
      0.22,
      'rendered',
    )
  const add = (name: string, g: typeof geometry, slot: string) => {
    const mesh = new Mesh(g, material(slot))
    mesh.name = name
    mesh.userData = { slotId: slot, __fromGeometry: true }
    mesh.castShadow = mesh.receiveShadow = true
    group.add(mesh)
    return mesh
  }
  const baseHeight = bathBaseHeight(node)
  const positions = geometry.getAttribute('position')
  for (let i = 0; i < positions.count; i++)
    positions.setY(i, baseHeight + positions.getY(i) * (node.height - baseHeight) / node.height)
  const normals = geometry.getAttribute('normal')
  for (let i = 0; i < normals.count; i++) {
    const normal = new Vector3(normals.getX(i), normals.getY(i) * node.height / (node.height - baseHeight), normals.getZ(i)).normalize()
    normals.setXYZ(i, normal.x, normal.y, normal.z)
  }
  const stride=rings[0]!.points.length*6,[exterior,interior]=partitionBathSurface(geometry,offset=>offset>=exteriorEnd*stride&&offset<floorEnd*stride)
  add('bathtub-shell',exterior,'shell');add('bathtub-interior',interior,'interior')
  if (node.shape === 'alcove') {
    const apron = add('bathtub-apron', new BoxGeometry(node.length - 0.025, node.height - 0.02, node.apronThickness), 'apron')
    apron.position.set(0, (node.height - 0.02) / 2, -node.width / 2 + node.apronThickness / 2)
  }
  const baseStyle = bathBaseStyle(node)
  if (baseStyle === 'pedestal') {
    const pedestal = add('bathtub-pedestal', new CylinderGeometry(1, 1.05, baseHeight, 64), 'base')
    pedestal.scale.set(baseL / 2, 1, baseW / 2)
    pedestal.position.y = baseHeight / 2
  } else if (baseStyle === 'claw' || baseStyle === 'rounded') {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x = sx * node.length * 0.29, z = sz * node.width * 0.25
      const ballRadius = Math.min(0.035, baseHeight * 0.24)
      const ball = add('bathtub-foot-ball', new SphereGeometry(ballRadius, 24, 16), 'base')
      ball.position.set(x, ballRadius, z)
      const stem = add('bathtub-foot-stem', new CylinderGeometry(0.048, 0.023, baseHeight - ballRadius, 24), 'base')
      stem.position.set(x, (baseHeight + ballRadius) / 2, z)
      if (baseStyle === 'claw') {
        for (const angle of [-0.8, 0, 0.8]) {
          const dx = Math.sin(angle) * sx, dz = Math.cos(angle) * sz
          const curve = new CatmullRomCurve3([
            new Vector3(x, baseHeight * 0.78, z),
            new Vector3(x + dx * 0.025, baseHeight * 0.45, z + dz * 0.025),
            new Vector3(x + dx * ballRadius, ballRadius * 0.8, z + dz * ballRadius),
          ])
          add('bathtub-foot-claw', new TubeGeometry(curve, 16, 0.007, 8, false), 'base')
        }
      }
    }
  }
  if (node.drainCover) {
    const drain = add(
      'bathtub-drain',
      unwrapBasinDrainCover(
        new CylinderGeometry(0.03, 0.03, 0.006, 48),
        0.03,
        0.006,
      ),
      'drain',
    )
    drain.position.x = bathDrainX(node)
    drain.position.z = drainPosition[1]
    const coverY=floor-0.003,x=node.shape==='slipper'?Math.min(0,drainPosition[0]):0,halfLength=node.length/2
    const rise=node.shape==='slipper'?0.14*(x/halfLength)**2*(coverY/node.height)**2:0
    drain.position.y = baseHeight + (coverY+rise) * (node.height - baseHeight) / node.height
    if(node.shape==='slipper')drain.rotation.z=Math.atan((0.28*x/halfLength**2)*(coverY/node.height)**2*(node.height-baseHeight)/node.height)
  }
  addBathPlumbing(group,node,ctx)
  for (const target of createBathTargets(node,ctx?.parent?{[ctx.parent.id]:ctx.parent}:{})) group.add(target)
  return group
}
