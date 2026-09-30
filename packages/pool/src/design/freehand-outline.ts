import type { PoolPoint } from '../core/schema'
import {
  getPoolPolygonDimensions,
  isPoolPolygonPlaceable,
  sampleClosedPoolSpline,
} from '../design/shapes'

const EPSILON = 1e-8

function distance(a: PoolPoint, b: PoolPoint): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1])
}

function segmentIntersection(
  a: PoolPoint,
  b: PoolPoint,
  c: PoolPoint,
  d: PoolPoint,
): { point: PoolPoint; strokeT: number } | null {
  const abX = b[0] - a[0]
  const abZ = b[1] - a[1]
  const cdX = d[0] - c[0]
  const cdZ = d[1] - c[1]
  const denominator = abX * cdZ - abZ * cdX
  if (Math.abs(denominator) < EPSILON) return null

  const acX = c[0] - a[0]
  const acZ = c[1] - a[1]
  const earlierT = (acX * cdZ - acZ * cdX) / denominator
  const strokeT = (acX * abZ - acZ * abX) / denominator
  if (
    earlierT < -EPSILON || earlierT > 1 + EPSILON ||
    strokeT < -EPSILON || strokeT > 1 + EPSILON
  ) return null

  return {
    point: [a[0] + abX * earlierT, a[1] + abZ * earlierT],
    strokeT,
  }
}

function closeFreehandPoolStroke(
  points: readonly PoolPoint[],
  closeDistance: number,
): PoolPoint[] | null {
  if (points.length < 4) return null
  const first = points[0]!
  const last = points.at(-1)!
  if (distance(first, last) <= Math.max(0, closeDistance)) {
    return points.slice(0, -1).map(([x, z]) => [x, z])
  }

  const strokeStart = points.at(-2)!
  let closure: { segmentIndex: number; point: PoolPoint; strokeT: number } | null = null
  for (let segmentIndex = 0; segmentIndex < points.length - 3; segmentIndex += 1) {
    const intersection = segmentIntersection(
      points[segmentIndex]!,
      points[segmentIndex + 1]!,
      strokeStart,
      last,
    )
    if (!intersection || intersection.strokeT <= EPSILON) continue
    if (!closure || intersection.strokeT < closure.strokeT) {
      closure = { segmentIndex, ...intersection }
    }
  }
  if (!closure) return null

  return [
    closure.point,
    ...points
      .slice(closure.segmentIndex + 1, -1)
      .map(([x, z]): PoolPoint => [x, z]),
  ]
}

export function advanceFreehandPoolStroke(
  points: readonly PoolPoint[],
  nextPoint: PoolPoint,
  options: { closeDistance: number; sampleDistance: number },
): { points: PoolPoint[]; closed: PoolPoint[] | null } {
  const candidate = [...points.map(([x, z]): PoolPoint => [x, z]), nextPoint]
  const closed = closeFreehandPoolStroke(candidate, options.closeDistance)
  if (closed) return { points: candidate, closed }
  const previous = points.at(-1)
  if (previous && distance(previous, nextPoint) < Math.max(0, options.sampleDistance)) {
    return { points: points.map(([x, z]): PoolPoint => [x, z]), closed: null }
  }
  return { points: candidate, closed: null }
}

function distanceToSegment(point: PoolPoint, start: PoolPoint, end: PoolPoint): number {
  const dx = end[0] - start[0]
  const dz = end[1] - start[1]
  const lengthSquared = dx * dx + dz * dz
  if (lengthSquared < EPSILON) return distance(point, start)
  const t = Math.max(0, Math.min(1, (
    (point[0] - start[0]) * dx + (point[1] - start[1]) * dz
  ) / lengthSquared))
  return Math.hypot(
    point[0] - (start[0] + dx * t),
    point[1] - (start[1] + dz * t),
  )
}

function simplifyOpen(points: readonly PoolPoint[], tolerance: number): PoolPoint[] {
  if (points.length <= 2) return points.map(([x, z]) => [x, z])
  let furthestIndex = -1
  let furthestDistance = Math.max(tolerance, EPSILON)
  for (let index = 1; index < points.length - 1; index += 1) {
    const candidateDistance = distanceToSegment(points[index]!, points[0]!, points.at(-1)!)
    if (candidateDistance > furthestDistance) {
      furthestDistance = candidateDistance
      furthestIndex = index
    }
  }
  if (furthestIndex < 0) return [
    [points[0]![0], points[0]![1]],
    [points.at(-1)![0], points.at(-1)![1]],
  ]
  const before = simplifyOpen(points.slice(0, furthestIndex + 1), tolerance)
  const after = simplifyOpen(points.slice(furthestIndex), tolerance)
  return [...before.slice(0, -1), ...after]
}

function ringSlice(points: readonly PoolPoint[], start: number, end: number): PoolPoint[] {
  const result: PoolPoint[] = []
  let index = start
  while (true) {
    const point = points[index]!
    result.push([point[0], point[1]])
    if (index === end) return result
    index = (index + 1) % points.length
  }
}

function simplifyClosed(points: readonly PoolPoint[], tolerance: number): PoolPoint[] {
  if (points.length <= 4) return points.map(([x, z]) => [x, z])
  let first = 0
  let second = 1
  let maximumDistance = -1
  for (let a = 0; a < points.length; a += 1) {
    for (let b = a + 1; b < points.length; b += 1) {
      const candidateDistance = distance(points[a]!, points[b]!)
      if (candidateDistance > maximumDistance) {
        maximumDistance = candidateDistance
        first = a
        second = b
      }
    }
  }
  const forward = simplifyOpen(ringSlice(points, first, second), tolerance)
  const backward = simplifyOpen(ringSlice(points, second, first), tolerance)
  return [...forward.slice(0, -1), ...backward.slice(0, -1)]
}

function distanceToOutline(point: PoolPoint, outline: readonly PoolPoint[]): number {
  let minimum = Number.POSITIVE_INFINITY
  for (let index = 0; index < outline.length; index += 1) {
    minimum = Math.min(minimum, distanceToSegment(point, outline[index]!, outline[(index + 1) % outline.length]!))
  }
  return minimum
}

function outlineWithinTolerance(
  source: readonly PoolPoint[],
  target: readonly PoolPoint[],
  tolerance: number,
): boolean {
  // Distance to an outline changes by at most the distance travelled. Reserve
  // a quarter of the tolerance for the gaps between the checked samples.
  const maximum = tolerance > EPSILON ? tolerance * 0.75 : EPSILON
  for (let index = 0; index < source.length; index++) {
    const start = source[index]!
    const end = source[(index + 1) % source.length]!
    const steps = tolerance > EPSILON
      ? Math.max(1, Math.ceil(distance(start, end) / (tolerance * 0.5)))
      : 2
    for (let sample = 0; sample < steps; sample++) {
      const t = sample / steps
      const point: PoolPoint = [
        start[0] + (end[0] - start[0]) * t,
        start[1] + (end[1] - start[1]) * t,
      ]
      if (distanceToOutline(point, target) > maximum) return false
    }
  }
  return true
}

export type FreehandPoolOutline = {
  anchors: PoolPoint[]
  polygon: PoolPoint[]
}

type ReshapedFreehandPoolOutline = FreehandPoolOutline & {
  length: number
  width: number
}

function reshapeFreehandPoolOutline(
  controlPoints: readonly PoolPoint[],
  raw: readonly PoolPoint[],
  tolerance: number,
  segmentsPerSpan = 8,
): ReshapedFreehandPoolOutline | null {
  const anchors = controlPoints.map(([x, z]): PoolPoint => [x, z])
  if (anchors.length < 3 || !isPoolPolygonPlaceable(anchors)) return null
  for (const curveStrength of [0.35, 0.25, 0.15, 0]) {
    const polygon = sampleClosedPoolSpline(anchors, segmentsPerSpan, curveStrength)
    if (!isPoolPolygonPlaceable(polygon)) continue
    if (!outlineWithinTolerance(raw, polygon, tolerance) ||
      !outlineWithinTolerance(polygon, raw, tolerance)) continue
    return { anchors, polygon, ...getPoolPolygonDimensions(polygon) }
  }
  return null
}

export function buildFreehandPoolOutline(
  rawPoints: readonly PoolPoint[],
  options: {
    closeDistance: number
    simplifyTolerance: number
    segmentsPerSpan?: number
  },
): FreehandPoolOutline | null {
  const closed = closeFreehandPoolStroke(rawPoints, options.closeDistance)
  if (!closed) return null
  const deduplicated = closed.filter((point, index) => (
    index === 0 || distance(point, closed[index - 1]!) > EPSILON
  ))
  if (!isPoolPolygonPlaceable(deduplicated)) return null
  const tolerance = Math.max(0, options.simplifyTolerance)
  // Leave half the error budget for smoothing after removing redundant points.
  const anchors = simplifyClosed(deduplicated, tolerance * 0.5)
  const segmentsPerSpan = options.segmentsPerSpan ?? 8
  return reshapeFreehandPoolOutline(anchors, deduplicated, tolerance, segmentsPerSpan)
    ?? reshapeFreehandPoolOutline(deduplicated, deduplicated, tolerance, segmentsPerSpan)
}
