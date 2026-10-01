import type { GeometryContext } from '@pascal-app/core'
import { createDefaultMaterial, resolveMaterialRef } from '@pascal-app/viewer'
import { ExtrudeGeometry, Mesh, Shape } from 'three'
import { FullPedestalBasinNode, WALL_HUNG_BASIN, WallHungBasinNode } from '../countertop-basin/schema'
import { createBasinTapTarget } from '../countertop-basin/tap-attachment'
import { wallBasinOutline } from '../wall-hung-basin/profile'
import { buildWallHungBasinGeometry } from '../wall-hung-basin/geometry'

export function fullPedestalBasinGeometryKey(node: FullPedestalBasinNode) {
  const { id, position, rotation, parentId, wallId, side, children, metadata, name, visible, ...design } = node
  return JSON.stringify({ version: 1, ...design })
}

export function buildFullPedestalBasinGeometry(raw: FullPedestalBasinNode, ctx?: GeometryContext) {
  const node = FullPedestalBasinNode.parse(raw)
  const bowl = WallHungBasinNode.parse({ ...node, type: WALL_HUNG_BASIN, id: undefined, plumbingEnabled: false })
  const root = buildWallHungBasinGeometry(bowl, ctx)
  const oldTarget = root.getObjectByName('basin-tap-target')
  if (oldTarget) root.remove(oldTarget)
  const lip = root.getObjectByName('basin-raised-rear-lip')
  if (lip instanceof Mesh) { root.remove(lip); lip.geometry.dispose() }
  root.add(createBasinTapTarget(node))
  const tall = node.pedestalDesign === 'monobloc', square = node.pedestalDesign === 'square'
  const topW = tall ? node.width * (1 - node.taper) : node.pedestalWidth * 1.18
  const topD = tall ? node.depth * (1 - node.taper * 0.55) : node.pedestalDepth * 1.15
  const bottomW = node.pedestalWidth, bottomD = node.pedestalDepth
  const height = node.totalHeight - node.height + 0.004
  const centerZ = tall ? node.depth / 2 - topD / 2 : -0.04
  const wall = 0.014, power = square ? 0.3 : 1, profile: [number, number][] = []
  // A closed U cross-section leaves the rear open for concealed plumbing access.
  const arc = (w: number, d: number, reverse: boolean) => {
    const outline = tall ? wallBasinOutline(bowl, w, d) : null
    for (let j = 0; j <= 64; j++) {
      const i = reverse ? 64 - j : j, a = Math.PI * 0.75 + i / 64 * Math.PI * 1.5
      if (tall) {
        const station = 36 + i / 64 * 72
        const index = Math.floor(station), fraction = station - index
        const p = outline![index % 96]!, q = outline![(index + 1) % 96]!
        profile.push([p[0] + (q[0] - p[0]) * fraction, p[1] + (q[1] - p[1]) * fraction])
      } else {
        const c = Math.cos(a), s = Math.sin(a)
        profile.push([Math.sign(c) * Math.abs(c) ** power * w / 2, Math.sign(s) * Math.abs(s) ** power * d / 2 + centerZ])
      }
    }
  }
  arc(topW, topD, false); arc(topW - wall * 2, topD - wall * 2, true)
  const shape = new Shape()
  profile.forEach(([x, z], i) => i ? shape.lineTo(x, -z) : shape.moveTo(x, -z)); shape.closePath()
  const geometry = new ExtrudeGeometry(shape, { depth: height, steps: 32, bevelEnabled: false })
  geometry.rotateX(-Math.PI / 2)
  const position = geometry.getAttribute('position')
  for (let i = 0; i < position.count; i++) {
    const u = position.getY(i) / height
    const flare = tall ? u : 0.35 * u + 0.65 * u ** 5
    const w = bottomW + (topW - bottomW) * flare, d = bottomD + (topD - bottomD) * flare
    position.setXYZ(i, position.getX(i) * w / topW, position.getY(i) - node.totalHeight, (position.getZ(i) - centerZ) * d / topD + centerZ)
  }
  geometry.computeVertexNormals()
  const normal = geometry.getAttribute('normal'), uv = geometry.getAttribute('uv')
  for (let i = 0; i < position.count; i++) {
    const x = Math.abs(normal.getX(i)), y = Math.abs(normal.getY(i)), z = Math.abs(normal.getZ(i))
    if (y >= x && y >= z) uv.setXY(i, position.getX(i), position.getZ(i))
    else if (x >= z) uv.setXY(i, position.getZ(i), position.getY(i))
    else uv.setXY(i, position.getX(i), position.getY(i))
  }
  const ref = node.slots?.pedestal
  const finish = (ref ? resolveMaterialRef(ref, ctx?.materials, 'rendered') : null) ?? createDefaultMaterial('#ffffff', 0.2, 'rendered')
  const pedestal = new Mesh(geometry, finish)
  pedestal.name = 'basin-full-pedestal'; pedestal.userData.slotId = 'pedestal'; pedestal.userData.__fromGeometry = true
  pedestal.castShadow = pedestal.receiveShadow = true
  root.add(pedestal)
  return root
}
