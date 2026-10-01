import type { GeometryContext } from '@pascal-app/core'
import { Mesh } from 'three'
import { FullPedestalBasinNode, HalfPedestalBasinNode, FULL_PEDESTAL_BASIN } from '../countertop-basin/schema'
import { createBasinTapTarget } from '../countertop-basin/tap-attachment'
import { buildFullPedestalBasinGeometry } from '../full-pedestal-basin/geometry'

export function halfPedestalBasinGeometryKey(node: HalfPedestalBasinNode) {
  const { id, position, rotation, parentId, wallId, side, children, metadata, name, visible, ...design } = node
  return JSON.stringify({ version: 1, ...design })
}

export function buildHalfPedestalBasinGeometry(raw: HalfPedestalBasinNode, ctx?: GeometryContext) {
  const node = HalfPedestalBasinNode.parse(raw), integrated = node.shroudDesign === 'integrated'
  // Reuse the closed, hollow ceramic cross-section, with a short wall-mounted profile.
  const base = FullPedestalBasinNode.parse({ ...node, id: undefined, type: FULL_PEDESTAL_BASIN, totalHeight: 0.7,
    pedestalDesign: integrated ? 'monobloc' : node.shroudDesign === 'square' ? 'square' : 'classic',
    pedestalWidth: Math.max(0.14, Math.min(0.3, integrated ? node.shroudWidth * 0.75 : node.shroudWidth / 1.18)),
    pedestalDepth: Math.max(0.14, Math.min(0.3, integrated ? node.shroudDepth * 0.75 : node.shroudDepth / 1.15)),
  })
  const root = buildFullPedestalBasinGeometry(base, ctx)
  const oldTarget = root.getObjectByName('basin-tap-target')
  if (oldTarget) root.remove(oldTarget)
  root.add(createBasinTapTarget(node))
  const shroud = root.getObjectByName('basin-full-pedestal') as Mesh
  shroud.name = 'basin-half-pedestal'
  const geometry = shroud.geometry, position = geometry.getAttribute('position')
  const top = -node.height + 0.004, sourceHeight = 0.7 - node.height + 0.004
  geometry.computeBoundingBox()
  const originalBack = geometry.boundingBox!.max.z
  const sourceDepth = originalBack - geometry.boundingBox!.min.z
  const shift = integrated ? 0 : node.depth / 2 - originalBack
  for (let i = 0; i < position.count; i++) {
    const u = Math.max(0, Math.min(1, (position.getY(i) + 0.7) / sourceHeight))
    const roundFoot = node.shroudDesign === 'curved' ? 0.62 + 0.38 * Math.sin(Math.min(1, u / 0.35) * Math.PI / 2) : 1
    const x = position.getX(i) * roundFoot * (integrated ? 1 : node.shroudWidth / (base.pedestalWidth * 1.18))
    const z = integrated ? position.getZ(i) : node.depth / 2 + (position.getZ(i) + shift - node.depth / 2) * roundFoot * node.shroudDepth / sourceDepth
    position.setXYZ(i, x, top - (1 - u) * (node.shroudHeight + 0.004), z)
  }
  geometry.computeVertexNormals()
  const normal = geometry.getAttribute('normal'), uv = geometry.getAttribute('uv')
  for (let i = 0; i < position.count; i++) {
    const x = Math.abs(normal.getX(i)), y = Math.abs(normal.getY(i)), z = Math.abs(normal.getZ(i))
    if (y >= x && y >= z) uv.setXY(i, position.getX(i), position.getZ(i))
    else if (x >= z) uv.setXY(i, position.getZ(i), position.getY(i))
    else uv.setXY(i, position.getX(i), position.getY(i))
  }
  geometry.computeBoundingBox(); geometry.computeBoundingSphere()
  return root
}
