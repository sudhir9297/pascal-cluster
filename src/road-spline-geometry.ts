import {
  BufferGeometry,
  CatmullRomCurve3,
  Float32BufferAttribute,
  Vector3,
} from 'three'
import { dedupeRoadPoints, simplifyOrthogonalRoadPoints } from './road-path'
import type { RoadPathMode, RoadSplineNode, RoadSplinePoint } from './schema'

export const ROAD_SAMPLE_SEGMENTS_PER_SPAN = 32

export function createRoadSplineCurve(points: readonly RoadSplinePoint[]): CatmullRomCurve3 {
  return new CatmullRomCurve3(
    points.map(([x, z]) => new Vector3(x, 0, z)),
    false,
    'centripetal',
    0.5,
  )
}

export function sampleRoadCenterline(
  points: readonly RoadSplinePoint[],
  segments = Math.max(16, (points.length - 1) * ROAD_SAMPLE_SEGMENTS_PER_SPAN),
): RoadSplinePoint[] {
  const curve = createRoadSplineCurve(points)
  return curve.getSpacedPoints(segments).map((point) => [point.x, point.z])
}

function discreteRoadTangent(
  centerline: readonly RoadSplinePoint[],
  index: number,
): RoadSplinePoint {
  const current = centerline[index]!
  let previousIndex = index - 1
  while (previousIndex >= 0) {
    const previous = centerline[previousIndex]!
    if (Math.hypot(current[0] - previous[0], current[1] - previous[1]) > 0.000001) break
    previousIndex -= 1
  }
  let nextIndex = index + 1
  while (nextIndex < centerline.length) {
    const next = centerline[nextIndex]!
    if (Math.hypot(next[0] - current[0], next[1] - current[1]) > 0.000001) break
    nextIndex += 1
  }

  const previous = previousIndex >= 0 ? centerline[previousIndex]! : current
  const next = nextIndex < centerline.length ? centerline[nextIndex]! : current
  const tangentX = next[0] - previous[0]
  const tangentZ = next[1] - previous[1]
  const tangentLength = Math.hypot(tangentX, tangentZ)
  if (tangentLength > 0.000001) return [tangentX / tangentLength, tangentZ / tangentLength]

  return [1, 0]
}

function sampleRoadCenterlineTangents(
  centerline: readonly RoadSplinePoint[],
): RoadSplinePoint[] {
  let previousTangent: RoadSplinePoint | undefined

  return centerline.map((_, index) => {
    const tangent = discreteRoadTangent(centerline, index)
    let tangentX = tangent[0]
    let tangentZ = tangent[1]

    // A degenerate Catmull–Rom derivative can point backwards for one sample.
    // Keep the frame continuous so a boundary never flips across the centerline.
    if (previousTangent && tangentX * previousTangent[0] + tangentZ * previousTangent[1] < 0) {
      tangentX = -tangentX
      tangentZ = -tangentZ
    }
    previousTangent = [tangentX, tangentZ]
    return previousTangent
  })
}

function safeSplineOffset(
  centerline: readonly RoadSplinePoint[],
  tangents: readonly RoadSplinePoint[],
  offset: number,
): number {
  const requested = Math.abs(offset)
  if (requested < 0.000001) return 0

  let minimumRadius = Number.POSITIVE_INFINITY
  for (let index = 1; index < centerline.length - 1; index += 1) {
    const previous = centerline[index - 1]!
    const current = centerline[index]!
    const next = centerline[index + 1]!
    const span = Math.hypot(current[0] - previous[0], current[1] - previous[1])
      + Math.hypot(next[0] - current[0], next[1] - current[1])
    if (span < 0.000001) continue

    const previousTangent = tangents[index - 1]!
    const nextTangent = tangents[index + 1]!
    const turn = Math.abs(Math.atan2(
      cross2D(previousTangent[0], previousTangent[1], nextTangent[0], nextTangent[1]),
      previousTangent[0] * nextTangent[0] + previousTangent[1] * nextTangent[1],
    ))
    if (turn < 0.000001) continue
    minimumRadius = Math.min(minimumRadius, span / turn)
  }

  if (!Number.isFinite(minimumRadius) || requested <= minimumRadius * 0.85) return offset
  return Math.sign(offset) * minimumRadius * 0.85
}

export function offsetRoadControlPoints(
  points: readonly RoadSplinePoint[],
  offset: number,
): RoadSplinePoint[] {
  return points.map(([x, z], index) => {
    const previous = points[Math.max(0, index - 1)]!
    const next = points[Math.min(points.length - 1, index + 1)]!
    const tangentX = next[0] - previous[0]
    const tangentZ = next[1] - previous[1]
    const tangentLength = Math.hypot(tangentX, tangentZ) || 1
    const normalX = -tangentZ / tangentLength
    const normalZ = tangentX / tangentLength
    return [x + normalX * offset, z + normalZ * offset]
  })
}

export function sampleOffsetRoadCenterline(
  points: readonly RoadSplinePoint[],
  offset: number,
  segments = Math.max(16, (points.length - 1) * ROAD_SAMPLE_SEGMENTS_PER_SPAN),
): RoadSplinePoint[] {
  const centerline = sampleRoadCenterline(points, segments)
  const tangents = sampleRoadCenterlineTangents(centerline)
  const safeOffset = safeSplineOffset(centerline, tangents, offset)

  return centerline.map(([x, z], index) => {
    const tangent = tangents[index]!
    const normalX = -tangent[1]
    const normalZ = tangent[0]
    return [x + normalX * safeOffset, z + normalZ * safeOffset]
  })
}

function cross2D(aX: number, aZ: number, bX: number, bZ: number): number {
  return aX * bZ - aZ * bX
}

function normalizeDirection(x: number, z: number): [number, number] {
  const length = Math.hypot(x, z) || 1
  return [x / length, z / length]
}

function intersectOffsetLines(
  firstPoint: RoadSplinePoint,
  firstDirection: RoadSplinePoint,
  secondPoint: RoadSplinePoint,
  secondDirection: RoadSplinePoint,
): RoadSplinePoint | null {
  const denominator = cross2D(firstDirection[0], firstDirection[1], secondDirection[0], secondDirection[1])
  if (Math.abs(denominator) < 0.000001) return null
  const delta: RoadSplinePoint = [secondPoint[0] - firstPoint[0], secondPoint[1] - firstPoint[1]]
  const distance = cross2D(delta[0], delta[1], secondDirection[0], secondDirection[1]) / denominator
  return [
    firstPoint[0] + firstDirection[0] * distance,
    firstPoint[1] + firstDirection[1] * distance,
  ]
}

/** Offsets an angular polyline with mitered joins for straight and L-shaped roads. */
export function offsetRoadPolyline(
  points: readonly RoadSplinePoint[],
  offset: number,
): RoadSplinePoint[] {
  // Preserve collinear samples here. Marking meshes deliberately subdivide
  // long straight runs for dash placement and need one offset point per input
  // sample; the road surface itself is simplified by sampleRoadPath below.
  const cleanPoints = dedupeRoadPoints(points)
  if (cleanPoints.length < 2 || Math.abs(offset) < 0.000001) return cleanPoints

  return cleanPoints.map((point, index) => {
    const previous = cleanPoints[Math.max(0, index - 1)]!
    const next = cleanPoints[Math.min(cleanPoints.length - 1, index + 1)]!
    const incoming = normalizeDirection(point[0] - previous[0], point[1] - previous[1])
    const outgoing = normalizeDirection(next[0] - point[0], next[1] - point[1])
    const incomingNormal: RoadSplinePoint = [-incoming[1], incoming[0]]
    const outgoingNormal: RoadSplinePoint = [-outgoing[1], outgoing[0]]

    if (index === 0) {
      return [
        point[0] + outgoingNormal[0] * offset,
        point[1] + outgoingNormal[1] * offset,
      ]
    }
    if (index === cleanPoints.length - 1) {
      return [
        point[0] + incomingNormal[0] * offset,
        point[1] + incomingNormal[1] * offset,
      ]
    }

    const incomingOffset: RoadSplinePoint = [
      point[0] + incomingNormal[0] * offset,
      point[1] + incomingNormal[1] * offset,
    ]
    const outgoingOffset: RoadSplinePoint = [
      point[0] + outgoingNormal[0] * offset,
      point[1] + outgoingNormal[1] * offset,
    ]
    const miter = intersectOffsetLines(incomingOffset, incoming, outgoingOffset, outgoing)
    if (miter && Math.hypot(miter[0] - point[0], miter[1] - point[1]) <= Math.max(0.25, Math.abs(offset) * 4)) {
      return miter
    }
    return [
      (incomingOffset[0] + outgoingOffset[0]) / 2,
      (incomingOffset[1] + outgoingOffset[1]) / 2,
    ]
  })
}

export function sampleRoadPath(
  points: readonly RoadSplinePoint[],
  pathMode: RoadPathMode,
  segments = Math.max(16, (points.length - 1) * ROAD_SAMPLE_SEGMENTS_PER_SPAN),
): RoadSplinePoint[] {
  return pathMode === 'orthogonal'
    ? simplifyOrthogonalRoadPoints(points)
    : sampleRoadCenterline(points, segments)
}

export function sampleOffsetRoadPath(
  points: readonly RoadSplinePoint[],
  offset: number,
  pathMode: RoadPathMode,
  segments = Math.max(16, (points.length - 1) * ROAD_SAMPLE_SEGMENTS_PER_SPAN),
): RoadSplinePoint[] {
  return pathMode === 'orthogonal'
    ? offsetRoadPolyline(simplifyOrthogonalRoadPoints(points), offset)
    : sampleOffsetRoadCenterline(points, offset, segments)
}

function addVertex(vertices: number[], uvs: number[], point: Vector3, y: number, u: number, v: number): number {
  vertices.push(point.x, y, point.z)
  uvs.push(u, v)
  return vertices.length / 3 - 1
}

function isJunctionEndpoint(
  point: RoadSplinePoint,
  junctions: readonly RoadSplinePoint[],
): boolean {
  return junctions.some(
    (junction) => Math.hypot(point[0] - junction[0], point[1] - junction[1]) < 0.01,
  )
}

function appendTriangle(
  indices: number[],
  vertices: readonly number[],
  first: number,
  second: number,
  third: number,
  counterClockwise: boolean,
): void {
  const firstOffset = first * 3
  const secondOffset = second * 3
  const thirdOffset = third * 3
  const cross =
    (vertices[secondOffset + 0]! - vertices[firstOffset + 0]!) *
      (vertices[thirdOffset + 2]! - vertices[firstOffset + 2]!) -
    (vertices[secondOffset + 2]! - vertices[firstOffset + 2]!) *
      (vertices[thirdOffset + 0]! - vertices[firstOffset + 0]!)
  if (Math.abs(cross) < 0.000001) return
  if ((counterClockwise && cross > 0) || (!counterClockwise && cross < 0)) {
    indices.push(first, second, third)
  } else {
    indices.push(first, third, second)
  }
}

function appendQuad(
  indices: number[],
  vertices: readonly number[],
  first: number,
  second: number,
  third: number,
  fourth: number,
  counterClockwise: boolean,
): void {
  appendTriangle(indices, vertices, first, second, third, counterClockwise)
  appendTriangle(indices, vertices, first, third, fourth, counterClockwise)
}

/**
 * Builds a thick, capped road strip from the sampled centerline. The road is
 * intentionally planar for v1; the same centerline can later drive curbs,
 * lane markings, sidewalks, and drainage.
 */
export function buildRoadSplineGeometry(node: RoadSplineNode): BufferGeometry {
  const sampleSegments = Math.max(64, (node.points.length - 1) * ROAD_SAMPLE_SEGMENTS_PER_SPAN)
  const pathMode = node.pathMode ?? 'spline'
  const centerline = sampleRoadPath(node.points, pathMode, sampleSegments)
  const halfWidth = node.width / 2
  const leftBoundary = sampleOffsetRoadPath(node.points, halfWidth, pathMode, sampleSegments)
  const rightBoundary = sampleOffsetRoadPath(node.points, -halfWidth, pathMode, sampleSegments)
  const topY = node.thickness
  const bottomY = 0
  const textureScale = node.textureScale ?? 4
  const vertices: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const rings: Array<{ topLeft: number; topRight: number; bottomLeft: number; bottomRight: number }> = []
  let distanceAlong = 0

  for (let index = 0; index < centerline.length; index += 1) {
    const [x, z] = centerline[index]!
    const [leftX, leftZ] = leftBoundary[index]!
    const [rightX, rightZ] = rightBoundary[index]!
    if (index > 0) {
      const [previousX, previousZ] = centerline[index - 1]!
      distanceAlong += Math.hypot(x - previousX, z - previousZ)
    }
    const left = new Vector3(leftX, 0, leftZ)
    const right = new Vector3(rightX, 0, rightZ)

    rings.push({
      topLeft: addVertex(vertices, uvs, left, topY, distanceAlong / textureScale, 1),
      topRight: addVertex(vertices, uvs, right, topY, distanceAlong / textureScale, 0),
      bottomLeft: addVertex(vertices, uvs, left, bottomY, distanceAlong / textureScale, 1),
      bottomRight: addVertex(vertices, uvs, right, bottomY, distanceAlong / textureScale, 0),
    })
  }

  if (pathMode === 'orthogonal') {
    // Keep every orthogonal segment local. A single outline is not safe for
    // retraced roads or connected branches: a self-touching contour can make
    // ear-clipping bridge distant vertices and produce a giant asphalt slab.
    // Segment quads overlap harmlessly at joins and cannot create those
    // non-local diagonals.
    for (let index = 0; index < rings.length - 1; index += 1) {
      const current = rings[index]!
      const next = rings[index + 1]!
      appendQuad(
        indices,
        vertices,
        current.topLeft,
        current.topRight,
        next.topRight,
        next.topLeft,
        true,
      )
      appendQuad(
        indices,
        vertices,
        current.bottomLeft,
        next.bottomLeft,
        next.bottomRight,
        current.bottomRight,
        false,
      )
    }
  } else {
    for (let index = 0; index < rings.length - 1; index += 1) {
      const current = rings[index]!
      const next = rings[index + 1]!

      // Top and underside.
      indices.push(current.topLeft, current.topRight, next.topRight, current.topLeft, next.topRight, next.topLeft)
      indices.push(current.bottomLeft, next.bottomRight, current.bottomRight, current.bottomLeft, next.bottomLeft, next.bottomRight)

      // Left and right edges.
      indices.push(current.topLeft, next.topLeft, next.bottomLeft, current.topLeft, next.bottomLeft, current.bottomLeft)
      indices.push(current.topRight, current.bottomRight, next.bottomRight, current.topRight, next.bottomRight, next.topRight)
    }
  }

  if (pathMode === 'orthogonal') {
    for (let index = 0; index < rings.length - 1; index += 1) {
      const current = rings[index]!
      const next = rings[index + 1]!

      // Left and right boundary walls.
      indices.push(current.topLeft, next.topLeft, next.bottomLeft, current.topLeft, next.bottomLeft, current.bottomLeft)
      indices.push(current.topRight, current.bottomRight, next.bottomRight, current.topRight, next.bottomRight, next.topRight)
    }
  }

  const first = rings[0]!
  const last = rings[rings.length - 1]!
  const junctions = node.junctions ?? []
  if (!isJunctionEndpoint(centerline[0]!, junctions)) {
    indices.push(first.topRight, first.topLeft, first.bottomLeft, first.topRight, first.bottomLeft, first.bottomRight)
  }
  if (!isJunctionEndpoint(centerline.at(-1)!, junctions)) {
    indices.push(last.topLeft, last.topRight, last.bottomRight, last.topLeft, last.bottomRight, last.bottomLeft)
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}
