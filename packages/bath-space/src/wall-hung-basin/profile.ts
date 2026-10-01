import { Shape } from 'three'
import { HALF_PEDESTAL_BASIN, FULL_PEDESTAL_BASIN, type WallSupportedBasinNode } from '../countertop-basin/schema'

export const WALL_BASIN_SEGMENTS = 96
export const WALL_BASIN_DRAIN_Z = -0.04

export function wallBasinBowlSize(node: WallSupportedBasinNode) {
  const width = node.width - (node.wallDesign === 'sculpted' ? 0.045 : 0.055)
  const depth = node.depth - 0.13
  return node.shape === 'round' ? { width: Math.min(width, depth), depth: Math.min(width, depth) } : { width, depth }
}

export function wallBasinOutline(node: WallSupportedBasinNode, width = node.width, depth = node.depth): [number, number][] {
  const w = width / 2, back = node.depth / 2, front = back - depth
  const r = Math.min(width, depth) * (node.wallDesign === 'shallow' ? 0.09 : 0.035)
  const shape = new Shape()
  shape.moveTo(w, back - depth / 2)
  shape.lineTo(w, back - r)
  shape.quadraticCurveTo(w, back, w - r, back)
  shape.lineTo(-w + r, back)
  shape.quadraticCurveTo(-w, back, -w, back - r)
  if (node.wallDesign === 'classic' || node.wallDesign === 'sculpted') {
    shape.lineTo(-w, back - depth * 0.3)
    shape.bezierCurveTo(-w, front + depth * 0.18, -w * 0.55, front, 0, front)
    shape.bezierCurveTo(w * 0.55, front, w, front + depth * 0.18, w, back - depth * 0.3)
  } else {
    shape.lineTo(-w, front + r)
    shape.quadraticCurveTo(-w, front, -w + r, front)
    shape.lineTo(w - r, front)
    shape.quadraticCurveTo(w, front, w, front + r)
  }
  shape.closePath()
  const polygon = shape.getPoints(32), centerZ = back - depth / 2
  return Array.from({ length: WALL_BASIN_SEGMENTS }, (_, i) => {
    const angle = i * Math.PI * 2 / WALL_BASIN_SEGMENTS, dx = Math.cos(angle), dz = Math.sin(angle)
    let distance = Infinity
    for (let j = 0; j < polygon.length - 1; j++) {
      const a = polygon[j]!, b = polygon[j + 1]!
      const x = a.x, z = a.y - centerZ, ex = b.x - a.x, ez = b.y - a.y
      const cross = dx * ez - dz * ex
      if (Math.abs(cross) < 1e-10) continue
      const ray = (x * ez - z * ex) / cross, edge = (x * dz - z * dx) / cross
      if (ray >= 0 && edge >= -1e-8 && edge <= 1 + 1e-8) distance = Math.min(distance, ray)
    }
    return [dx * distance, centerZ + dz * distance]
  })
}

export function wallBasinMinimumMountHeight(node: WallSupportedBasinNode) {
  if (node.type === HALF_PEDESTAL_BASIN) return Math.max(0.3, node.height + node.shroudHeight + 0.15)
  if (node.type === FULL_PEDESTAL_BASIN) return node.totalHeight
  return Math.max(0.3, node.height + (node.plumbingEnabled ? node.plumbingDrop + 0.12 : 0))
}
