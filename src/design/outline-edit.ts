import type { PoolNode, PoolPoint } from '../core/schema'
import { getPoolPolygonDimensions, isPoolPolygonPlaceable, sampleClosedPoolSpline,
  sampleClosedPoolSplineWithTangents } from './shapes'

type Tangent = PoolNode['outlineTangents'][number]
export type PoolOutlinePatch = Pick<PoolNode, 'polygon' | 'outlineControlPoints' | 'outlineTangents' | 'length' | 'width'>
export type PoolOutlineAction = 'move' | 'insert' | 'delete' | 'incoming' | 'outgoing'

export function poolOutlineAnchors(node: PoolNode): PoolPoint[] {
  return node.shape === 'spline' && node.outlineControlPoints.length >= 3
    ? node.outlineControlPoints : node.polygon
}

function automaticTangents(anchors: readonly PoolPoint[], strength: number): Tangent[] {
  return anchors.map((anchor, index) => {
    const before = anchors[(index - 1 + anchors.length) % anchors.length]!
    const after = anchors[(index + 1) % anchors.length]!
    const distance = Math.hypot(after[0] - before[0], after[1] - before[1]) || 1
    const length = Math.min(Math.hypot(anchor[0] - before[0], anchor[1] - before[1]),
      Math.hypot(after[0] - anchor[0], after[1] - anchor[1])) * strength / 3
    const dx = (after[0] - before[0]) * length / distance
    const dz = (after[1] - before[1]) * length / distance
    return { incoming: [anchor[0] - dx, anchor[1] - dz],
      outgoing: [anchor[0] + dx, anchor[1] + dz] }
  })
}

export function poolOutlineTangents(node: PoolNode): Tangent[] {
  const anchors = poolOutlineAnchors(node)
  if (node.outlineTangents.length === anchors.length) return node.outlineTangents
  // Recover the closest sampling strength used by older freehand pools.
  const strength = [0.35, 0.25, 0.15, 0].map((value) => ({
    value,
    error: sampleClosedPoolSpline(anchors, 8, value).reduce((sum, point, index) => {
      const previous = node.polygon[index]
      return sum + (previous ? Math.hypot(point[0] - previous[0], point[1] - previous[1]) : 0)
    }, 0),
  })).sort((a, b) => a.error - b.error)[0]!.value
  return automaticTangents(anchors, strength)
}

export function editPoolOutline(
  node: PoolNode,
  action: PoolOutlineAction,
  index: number,
  point?: PoolPoint,
): PoolOutlinePatch | null {
  if (node.shape !== 'custom' && node.shape !== 'spline') return null
  const anchors = poolOutlineAnchors(node).map(([x, z]): PoolPoint => [x, z])
  if (!Number.isInteger(index) || index < 0 || index >= anchors.length) return null
  const tangents = node.shape === 'spline'
    ? poolOutlineTangents(node).map((tangent): Tangent => ({ incoming: [...tangent.incoming], outgoing: [...tangent.outgoing] })) : []
  if (action === 'delete') {
    if (anchors.length <= 3) return null
    anchors.splice(index, 1)
    tangents.splice(index, 1)
  } else {
    if (!point || !point.every(Number.isFinite)) return null
    if (action === 'move') {
      const previous = anchors[index]!
      const dx = point[0] - previous[0], dz = point[1] - previous[1]
      anchors[index] = [point[0], point[1]]
      if (tangents[index]) {
        tangents[index] = { incoming: [tangents[index]!.incoming[0] + dx, tangents[index]!.incoming[1] + dz],
          outgoing: [tangents[index]!.outgoing[0] + dx, tangents[index]!.outgoing[1] + dz] }
      }
    } else if (action === 'insert') {
      anchors.splice(index + 1, 0, [point[0], point[1]])
      if (node.shape === 'spline') tangents.splice(index + 1, 0, automaticTangents(anchors, 0.35)[index + 1]!)
    } else {
      if (node.shape !== 'spline') return null
      const opposite = action === 'incoming' ? 'outgoing' : 'incoming'
      const anchor = anchors[index]!
      const previous = tangents[index]![opposite]
      const length = Math.hypot(previous[0] - anchor[0], previous[1] - anchor[1])
      const dx = point[0] - anchor[0], dz = point[1] - anchor[1]
      const size = Math.hypot(dx, dz)
      tangents[index]![action] = [point[0], point[1]]
      if (size > 1e-6) tangents[index]![opposite] =
        [anchor[0] - dx * length / size, anchor[1] - dz * length / size]
    }
  }
  if (!isPoolPolygonPlaceable(anchors)) return null
  const polygon = node.shape === 'spline'
    ? sampleClosedPoolSplineWithTangents(anchors, tangents) : anchors
  if (!isPoolPolygonPlaceable(polygon)) return null
  const { length, width } = getPoolPolygonDimensions(polygon)
  return { polygon, outlineControlPoints: node.shape === 'spline' ? anchors : [],
    outlineTangents: tangents, length, width }
}

export function poolOutlineMidpoint(node: PoolNode, index: number): PoolPoint {
  const anchors = poolOutlineAnchors(node)
  const a = anchors[index]!, b = anchors[(index + 1) % anchors.length]!
  if (node.shape === 'spline') {
    const tangents = poolOutlineTangents(node)
    const c = tangents[index]!.outgoing, d = tangents[(index + 1) % anchors.length]!.incoming
    return [(a[0] + 3 * c[0] + 3 * d[0] + b[0]) / 8,
      (a[1] + 3 * c[1] + 3 * d[1] + b[1]) / 8]
  }
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
}
