import type { RoadPathMode, RoadSplinePoint } from './schema'

const POINT_EPSILON = 0.001

function isSamePoint(a: RoadSplinePoint, b: RoadSplinePoint): boolean {
  return Math.hypot(a[0] - b[0], a[1] - b[1]) < POINT_EPSILON
}

export function dedupeRoadPoints(points: readonly RoadSplinePoint[]): RoadSplinePoint[] {
  const result: RoadSplinePoint[] = []
  for (const point of points) {
    if (!result.at(-1) || !isSamePoint(result.at(-1)!, point)) result.push([point[0], point[1]])
  }
  return result
}

/**
 * Removes redundant collinear vertices while preserving deliberate reversals.
 * Orthogonal surface meshes are built one segment at a time, so keeping every
 * click as a vertex only creates duplicate/zero-length joins and makes a
 * connected branch much easier to triangulate incorrectly.
 */
export function simplifyOrthogonalRoadPoints(
  points: readonly RoadSplinePoint[],
): RoadSplinePoint[] {
  const deduped = dedupeRoadPoints(points)
  const result: RoadSplinePoint[] = []

  for (const point of deduped) {
    const previous = result.at(-1)
    const beforePrevious = result.at(-2)
    if (!previous || !beforePrevious) {
      result.push(point)
      continue
    }

    const incomingX = previous[0] - beforePrevious[0]
    const incomingZ = previous[1] - beforePrevious[1]
    const outgoingX = point[0] - previous[0]
    const outgoingZ = point[1] - previous[1]
    const cross = incomingX * outgoingZ - incomingZ * outgoingX
    const dot = incomingX * outgoingX + incomingZ * outgoingZ

    // Only collapse vertices that continue in the same direction. A 180°
    // reversal is intentional input and must remain explicit.
    if (Math.abs(cross) < POINT_EPSILON && dot > 0) {
      result[result.length - 1] = point
    } else {
      result.push(point)
    }
  }

  return result
}

/** Returns the new points needed to route from the last point to a cursor. */
export function appendOrthogonalRoute(
  points: readonly RoadSplinePoint[],
  target: RoadSplinePoint,
): RoadSplinePoint[] {
  const last = points.at(-1)
  if (!last || isSamePoint(last, target)) return []

  const deltaX = Math.abs(target[0] - last[0])
  const deltaZ = Math.abs(target[1] - last[1])
  const elbow: RoadSplinePoint = deltaX >= deltaZ
    ? [target[0], last[1]]
    : [last[0], target[1]]
  const route = isSamePoint(last, elbow) ? [] : [elbow]
  if (!isSamePoint(route.at(-1) ?? last, target)) route.push([target[0], target[1]])
  return route
}

export function previewRoadPoints(
  points: readonly RoadSplinePoint[],
  cursor: RoadSplinePoint,
  pathMode: RoadPathMode,
): RoadSplinePoint[] {
  if (pathMode === 'orthogonal') return [...points, ...appendOrthogonalRoute(points, cursor)]
  return [...points, [cursor[0], cursor[1]]]
}
