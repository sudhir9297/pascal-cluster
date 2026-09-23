import type { FloorplanGeometry, GeometryContext } from '@pascal-app/core'
import { DoubleSide, Group, Mesh, MeshStandardMaterial, Path, Shape, ShapeGeometry, Vector2 } from 'three'
import type { Texture } from 'three'
import type { GroundAreaNode, GroundSurface } from '../domain/schema'
import { grassTexture, makeGrassBlades } from './grass'
import { grassContainsPoint, visibleGrassFootprint } from './footprint'
import { gravelTexture } from './gravel'
import { getMudTexture } from './mud'
import { makeMulchChips, mulchTexture } from './mulch'
import { sandTexture } from './sand'
import { makeSoilClods, soilTexture } from './soil'

const SURFACE_STYLE: Record<GroundSurface, { color: string; roughness: number }> = {
  grass: { color: '#718451', roughness: 0.98 },
  soil: { color: '#5b5841', roughness: 1 },
  mulch: { color: '#76523b', roughness: 1 },
  gravel: { color: '#918f83', roughness: 0.96 },
  sand: { color: '#cbb78d', roughness: 1 },
  mud: { color: '#614533', roughness: 0.88 },
}

const SURFACE_TEXTURE: Record<Exclude<GroundSurface, 'mud'>, Texture> = {
  grass: grassTexture,
  soil: soilTexture,
  mulch: mulchTexture,
  gravel: gravelTexture,
  sand: sandTexture,
}

export function groundSurfaceColor(surface: GroundSurface) {
  return SURFACE_STYLE[surface].color
}

function buildGroundAreaSurface(node: GroundAreaNode, includeDetails: boolean, ctx?: GeometryContext): Group {
  const group = new Group()
  if (node.outline.length < 3) return group
  const footprint = node.surface === 'grass' && includeDetails
    ? visibleGrassFootprint(node, ctx)
    : [[node.outline]]
  if (!footprint.length) return group
  const material = new MeshStandardMaterial({
    color: '#ffffff',
    map: node.surface === 'mud' ? getMudTexture() : SURFACE_TEXTURE[node.surface],
    roughness: SURFACE_STYLE[node.surface].roughness,
    side: DoubleSide,
  })
  for (const polygon of footprint) {
    const outer = polygon[0]
    if (!outer || outer.length < 3) continue
    const shape = new Shape(outer.map(([x, z]) => new Vector2(x, -z)))
    shape.holes = polygon.slice(1).map((ring) => new Path(ring.map(([x, z]) => new Vector2(x, -z))))
    const geometry = new ShapeGeometry(shape)
    geometry.rotateX(-Math.PI / 2)
    geometry.translate(0, node.elevation + 0.018, 0)
    geometry.computeVertexNormals()
    const mesh = new Mesh(geometry, material)
    mesh.name = `ground-area-${node.surface}`
    mesh.receiveShadow = true
    mesh.castShadow = false
    group.add(mesh)
  }
  if (node.surface === 'grass' && includeDetails) {
    const blades = makeGrassBlades(node.outline, node.elevation, (x, z) => grassContainsPoint(footprint, x, z))
    if (blades) group.add(blades)
  }
  if (node.surface === 'soil' && includeDetails) {
    const clods = makeSoilClods(node.outline, node.elevation)
    if (clods) group.add(clods)
  }
  if (node.surface === 'mulch' && includeDetails) {
    const chips = makeMulchChips(node.outline, node.elevation)
    if (chips) group.add(chips)
  }
  return group
}

export function buildGroundAreaGeometry(node: GroundAreaNode, ctx?: GeometryContext): Group {
  return buildGroundAreaSurface(node, true, ctx)
}

export function buildGroundAreaPreviewGeometry(node: GroundAreaNode): Group {
  return buildGroundAreaSurface(node, false)
}

export function buildGroundAreaFloorplan(
  node: GroundAreaNode,
  ctx: GeometryContext,
): FloorplanGeometry {
  if (node.outline.length < 3) return { kind: 'group', children: [] }
  const selected = ctx.viewState?.selected || ctx.viewState?.highlighted
  const footprint = node.surface === 'grass' ? visibleGrassFootprint(node, ctx) : [[node.outline]]
  if (!footprint.length) return { kind: 'group', children: [] }
  const d = footprint.flatMap((polygon) => polygon.map((ring) =>
    ring.map(([x, z], index) => `${index ? 'L' : 'M'}${x} ${z}`).join(' ') + ' Z')).join(' ')
  return {
    kind: 'path',
    d,
    fillRule: 'evenodd',
    fill: groundSurfaceColor(node.surface),
    stroke: selected ? (ctx.viewState?.palette?.selectedStroke ?? '#f97316') : '#64714c',
    strokeWidth: selected ? 0.045 : 0.018,
    opacity: 0.9,
  }
}

export function disposeGroundAreaGeometry(group: Group) {
  group.traverse((object) => {
    if (!(object instanceof Mesh)) return
    object.geometry.dispose()
    for (const material of Array.isArray(object.material) ? object.material : [object.material])
      material.dispose()
  })
}
