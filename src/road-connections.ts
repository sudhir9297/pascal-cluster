import type { RoadSplineNode, RoadSplinePoint } from './schema'
import { sampleRoadPath } from './road-spline-geometry'

export const ROAD_CONNECTION_SNAP_DISTANCE = 1.5

export type RoadConnection = {
  nodeId: string
  point: RoadSplinePoint
  distance: number
  segmentIndex: number
  segmentT: number
  endpoint: boolean
}

export type RoadIntersection = {
  nodeId: string
  worldPoint: RoadSplinePoint
  distance: number
}

function toWorldPoint(node: RoadSplineNode, point: RoadSplinePoint): RoadSplinePoint {
  const [originX, , originZ] = node.position ?? [0, 0, 0]
  const rotation = node.rotation?.[1] ?? 0
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  return [
    originX + point[0] * cos - point[1] * sin,
    originZ + point[0] * sin + point[1] * cos,
  ]
}

export function worldToRoadLocalPoint(node: RoadSplineNode, point: RoadSplinePoint): RoadSplinePoint {
  const [originX, , originZ] = node.position ?? [0, 0, 0]
  const rotation = node.rotation?.[1] ?? 0
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  const deltaX = point[0] - originX
  const deltaZ = point[1] - originZ
  return [
    deltaX * cos + deltaZ * sin,
    -deltaX * sin + deltaZ * cos,
  ]
}

export function getRoadWorldPath(node: RoadSplineNode): RoadSplinePoint[] {
  return sampleRoadPath(
    node.points,
    node.pathMode ?? 'spline',
    Math.max(64, (node.points.length - 1) * 32),
  ).map((point) => toWorldPoint(node, point))
}

function projectPointToSegment(
  point: RoadSplinePoint,
  start: RoadSplinePoint,
  end: RoadSplinePoint,
): { point: RoadSplinePoint; distance: number; t: number } {
  const deltaX = end[0] - start[0]
  const deltaZ = end[1] - start[1]
  const lengthSquared = deltaX * deltaX + deltaZ * deltaZ
  const t = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, ((point[0] - start[0]) * deltaX + (point[1] - start[1]) * deltaZ) / lengthSquared))
  const projected: RoadSplinePoint = [start[0] + deltaX * t, start[1] + deltaZ * t]
  return {
    point: projected,
    distance: Math.hypot(point[0] - projected[0], point[1] - projected[1]),
    t,
  }
}

function cross2D(a: RoadSplinePoint, b: RoadSplinePoint): number {
  return a[0] * b[1] - a[1] * b[0]
}

function findSegmentIntersection(
  startA: RoadSplinePoint,
  endA: RoadSplinePoint,
  startB: RoadSplinePoint,
  endB: RoadSplinePoint,
): RoadSplinePoint | null {
  const directionA: RoadSplinePoint = [endA[0] - startA[0], endA[1] - startA[1]]
  const directionB: RoadSplinePoint = [endB[0] - startB[0], endB[1] - startB[1]]
  const denominator = cross2D(directionA, directionB)
  if (Math.abs(denominator) < 0.000001) return null

  const delta: RoadSplinePoint = [startB[0] - startA[0], startB[1] - startA[1]]
  const parameterA = cross2D(delta, directionB) / denominator
  const parameterB = cross2D(delta, directionA) / denominator
  if (parameterA < 0 || parameterA > 1 || parameterB < 0 || parameterB > 1) return null
  return [startA[0] + directionA[0] * parameterA, startA[1] + directionA[1] * parameterA]
}

function closestSegmentPoints(
  startA: RoadSplinePoint,
  endA: RoadSplinePoint,
  startB: RoadSplinePoint,
  endB: RoadSplinePoint,
): { pointA: RoadSplinePoint; pointB: RoadSplinePoint; distance: number } {
  const candidates = [
    { pointA: projectPointToSegment(startA, startB, endB).point, pointB: startA },
    { pointA: projectPointToSegment(endA, startB, endB).point, pointB: endA },
    { pointA: startB, pointB: projectPointToSegment(startB, startA, endA).point },
    { pointA: endB, pointB: projectPointToSegment(endB, startA, endA).point },
  ]
  let nearest: { pointA: RoadSplinePoint; pointB: RoadSplinePoint; distance: number } = {
    ...candidates[0]!,
    distance: Number.POSITIVE_INFINITY,
  }
  for (const candidate of candidates) {
    const distance = Math.hypot(
      candidate.pointA[0] - candidate.pointB[0],
      candidate.pointA[1] - candidate.pointB[1],
    )
    if (distance < nearest.distance) nearest = { ...candidate, distance }
  }
  return nearest
}

function addUniqueIntersection(
  intersections: RoadIntersection[],
  intersection: RoadIntersection,
): void {
  const duplicate = intersections.some(
    (existing) =>
      existing.nodeId === intersection.nodeId &&
      Math.hypot(
        existing.worldPoint[0] - intersection.worldPoint[0],
        existing.worldPoint[1] - intersection.worldPoint[1],
      ) < 0.25,
  )
  if (!duplicate) intersections.push(intersection)
}

export function findNearestRoadConnection(
  point: RoadSplinePoint,
  roads: readonly RoadSplineNode[],
  maxDistance = ROAD_CONNECTION_SNAP_DISTANCE,
  excludeNodeId?: string,
): RoadConnection | null {
  let nearest: RoadConnection | null = null

  for (const road of roads) {
    if (road.id === excludeNodeId) continue
    const path = getRoadWorldPath(road)
    for (let index = 0; index < path.length - 1; index += 1) {
      const start = path[index]!
      const end = path[index + 1]!
      const projected = projectPointToSegment(point, start, end)
      if (projected.distance > maxDistance) continue
      const endpoint = (index === 0 && projected.t === 0) || (index === path.length - 2 && projected.t === 1)
      if (!nearest || projected.distance < nearest.distance) {
        nearest = {
          nodeId: road.id,
          point: projected.point,
          distance: projected.distance,
          segmentIndex: index,
          segmentT: projected.t,
          endpoint,
        }
      }
    }
  }

  return nearest
}

/** Finds crossing or close, angled road segments for automatic junction patches. */
export function findRoadIntersections(
  source: RoadSplineNode,
  roads: readonly RoadSplineNode[],
  maxDistance = ROAD_CONNECTION_SNAP_DISTANCE,
): RoadIntersection[] {
  const sourcePath = getRoadWorldPath(source)
  const intersections: RoadIntersection[] = []

  for (const road of roads) {
    if (road.id === source.id) continue
    const roadPath = getRoadWorldPath(road)
    for (let sourceIndex = 0; sourceIndex < sourcePath.length - 1; sourceIndex += 1) {
      const sourceStart = sourcePath[sourceIndex]!
      const sourceEnd = sourcePath[sourceIndex + 1]!
      const sourceDirection: RoadSplinePoint = [sourceEnd[0] - sourceStart[0], sourceEnd[1] - sourceStart[1]]
      for (let roadIndex = 0; roadIndex < roadPath.length - 1; roadIndex += 1) {
        const roadStart = roadPath[roadIndex]!
        const roadEnd = roadPath[roadIndex + 1]!
        const roadDirection: RoadSplinePoint = [roadEnd[0] - roadStart[0], roadEnd[1] - roadStart[1]]
        const sourceLength = Math.hypot(sourceDirection[0], sourceDirection[1])
        const roadLength = Math.hypot(roadDirection[0], roadDirection[1])
        if (sourceLength === 0 || roadLength === 0) continue

        const crossing = findSegmentIntersection(sourceStart, sourceEnd, roadStart, roadEnd)
        if (crossing) {
          addUniqueIntersection(intersections, { nodeId: road.id, worldPoint: crossing, distance: 0 })
          continue
        }

        const angle = Math.abs(cross2D(sourceDirection, roadDirection)) / (sourceLength * roadLength)
        if (angle < 0.25) continue
        const nearest = closestSegmentPoints(sourceStart, sourceEnd, roadStart, roadEnd)
        if (nearest.distance <= maxDistance) {
          addUniqueIntersection(intersections, {
            nodeId: road.id,
            worldPoint: [
              (nearest.pointA[0] + nearest.pointB[0]) / 2,
              (nearest.pointA[1] + nearest.pointB[1]) / 2,
            ],
            distance: nearest.distance,
          })
        }
      }
    }
  }

  return intersections
}
