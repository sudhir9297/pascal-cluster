import type { PoolPoint } from '../core/schema'

const GEOMETRY_EPSILON = 1e-8

export function getCrossSectionIntervals(points: PoolPoint[], x: number) {
  const intersections: number[] = []
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]!
    const next = points[(index + 1) % points.length]!
    const crosses = (current[0] <= x && next[0] > x) || (next[0] <= x && current[0] > x)
    if (!crosses) continue
    const progress = (x - current[0]) / (next[0] - current[0])
    intersections.push(current[1] + (next[1] - current[1]) * progress)
  }
  intersections.sort((left, right) => left - right)
  return Array.from({ length: Math.floor(intersections.length / 2) }, (_, index) => [
    intersections[index * 2]!,
    intersections[index * 2 + 1]!,
  ] as const)
}


export function sampleBoundaryBench(points: PoolPoint[], centerT: number, requestedLength: number, requestedWidth: number) {
  const area = points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length]!
    return sum + point[0] * next[1] - next[0] * point[1]
  }, 0)
  const winding = area >= 0 ? 1 : -1
  const lengths = points.map((point, index) => {
    const next = points[(index + 1) % points.length]!
    return Math.hypot(next[0] - point[0], next[1] - point[1])
  })
  const perimeter = lengths.reduce((sum, length) => sum + length, 0)
  const width = Math.max(0.05, requestedWidth)
  const length = Math.min(Math.max(0.5, requestedLength), perimeter * 0.8)
  const sampleCount = Math.max(4, Math.ceil(length / 0.18))
  const pointAt = (distance: number): { point: PoolPoint; tangent: PoolPoint } => {
    let remaining = ((distance % perimeter) + perimeter) % perimeter
    for (let index = 0; index < points.length; index += 1) {
      const edgeLength = lengths[index]!
      if (remaining <= edgeLength || index === points.length - 1) {
        const start = points[index]!
        const end = points[(index + 1) % points.length]!
        const progress = edgeLength <= 0.001 ? 0 : remaining / edgeLength
        return {
          point: [start[0] + (end[0] - start[0]) * progress, start[1] + (end[1] - start[1]) * progress],
          tangent: [(end[0] - start[0]) / Math.max(edgeLength, 0.001), (end[1] - start[1]) / Math.max(edgeLength, 0.001)],
        }
      }
      remaining -= edgeLength
    }
    return { point: points[0]!, tangent: [1, 0] }
  }
  return Array.from({ length: sampleCount + 1 }, (_, index) => {
    const sample = pointAt(perimeter * centerT - length / 2 + length * index / sampleCount)
    const inward: PoolPoint = winding > 0 ? [-sample.tangent[1], sample.tangent[0]] : [sample.tangent[1], -sample.tangent[0]]
    const inner: PoolPoint = [sample.point[0] + inward[0] * width, sample.point[1] + inward[1] * width]
    return { point: sample.point, inner }
  })
}

export function clipAtX(points: PoolPoint[], boundary: number, keepRight: boolean) {
  const clipped: PoolPoint[] = []
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]!
    const next = points[(index + 1) % points.length]!
    const currentInside = keepRight
      ? current[0] >= boundary - GEOMETRY_EPSILON
      : current[0] <= boundary + GEOMETRY_EPSILON
    const nextInside = keepRight
      ? next[0] >= boundary - GEOMETRY_EPSILON
      : next[0] <= boundary + GEOMETRY_EPSILON

    if (currentInside !== nextInside) {
      const progress = (boundary - current[0]) / (next[0] - current[0])
      const intersection: PoolPoint = [
        boundary,
        current[1] + (next[1] - current[1]) * progress,
      ]
      if (currentInside) clipped.push(intersection)
      else clipped.push(intersection, next)
    } else if (nextInside) {
      clipped.push(next)
    }
  }
  return clipped
}
