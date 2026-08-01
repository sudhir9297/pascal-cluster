import { BufferGeometry, Float32BufferAttribute } from 'three'
import type { RoadSplineNode, RoadSplinePoint } from './schema'
import { getRoadJunctionRadius } from './road-junctions'
import {
  offsetRoadPolyline,
  ROAD_SAMPLE_SEGMENTS_PER_SPAN,
  sampleOffsetRoadCenterline,
  sampleRoadPath,
} from './road-spline-geometry'

type MarkingLine = {
  id: string
  color: string
  offset: number
  width: number
  dashLength?: number
  gapLength?: number
}

export type RoadMarkingGeometry = {
  id: string
  color: string
  geometry: BufferGeometry
}

function buildLineGeometry(
  centerline: readonly [number, number][],
  line: MarkingLine,
  y: number,
  pathMode: 'spline' | 'orthogonal',
  roadCenterline: readonly RoadSplinePoint[],
  junctions: readonly RoadSplinePoint[],
  junctionRadius: number,
): BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []
  const distances = [0]
  for (let index = 1; index < centerline.length; index += 1) {
    const [x, z] = centerline[index]!
    const [previousX, previousZ] = centerline[index - 1]!
    distances.push(
      distances[index - 1]! + Math.hypot(x - previousX, z - previousZ),
    )
  }

  const tangentAt = (index: number): [number, number] => {
    const current = centerline[index]!
    const previous = centerline[Math.max(0, index - 1)]!
    const next = centerline[Math.min(centerline.length - 1, index + 1)]!
    return normalize(next[0] - previous[0], next[1] - previous[1])
  }

  const halfWidth = line.width / 2
  const leftBoundary: RoadSplinePoint[] = []
  const rightBoundary: RoadSplinePoint[] = []
  if (pathMode === 'orthogonal') {
    leftBoundary.push(...offsetRoadPolyline(centerline, line.offset + halfWidth))
    rightBoundary.push(...offsetRoadPolyline(centerline, line.offset - halfWidth))
  } else {
    for (let index = 0; index < centerline.length; index += 1) {
      const [x, z] = centerline[index]!
      const tangent = tangentAt(index)
      const normal: [number, number] = [-tangent[1], tangent[0]]
      leftBoundary.push([x + normal[0] * halfWidth, z + normal[1] * halfWidth])
      rightBoundary.push([x - normal[0] * halfWidth, z - normal[1] * halfWidth])
    }
  }

  for (let index = 0; index < centerline.length; index += 1) {
    const left = leftBoundary[index]!
    const right = rightBoundary[index]!
    positions.push(left[0], y, left[1], right[0], y, right[1])
  }

  for (let index = 0; index < centerline.length - 1; index += 1) {
    const midpoint = (distances[index]! + distances[index + 1]!) / 2
    const period = (line.dashLength ?? 0) + (line.gapLength ?? 0)
    const isPainted = period === 0 || Math.floor(midpoint / period) % 2 === 0
    if (!isPainted || segmentTouchesJunction(roadCenterline, index, junctions, junctionRadius)) continue
    const vertexStart = index * 2
    indices.push(
      vertexStart,
      vertexStart + 2,
      vertexStart + 3,
      vertexStart,
      vertexStart + 3,
      vertexStart + 1,
    )
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  // Markings are planar paint strips. Explicit upward normals keep curved
  // segments lit consistently even when a join reverses triangle winding.
  const normals = new Float32Array(positions.length)
  for (let index = 1; index < normals.length; index += 3) normals[index] = 1
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geometry.computeBoundingSphere()
  return geometry
}

function segmentTouchesJunction(
  centerline: readonly RoadSplinePoint[],
  index: number,
  junctions: readonly RoadSplinePoint[],
  radius: number,
): boolean {
  const start = centerline[index]!
  const end = centerline[index + 1]!
  return junctions.some((junction) => distanceToSegment(junction, start, end) <= radius)
}

function distanceToSegment(
  point: RoadSplinePoint,
  start: RoadSplinePoint,
  end: RoadSplinePoint,
): number {
  const deltaX = end[0] - start[0]
  const deltaZ = end[1] - start[1]
  const lengthSquared = deltaX * deltaX + deltaZ * deltaZ
  const t = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, ((point[0] - start[0]) * deltaX + (point[1] - start[1]) * deltaZ) / lengthSquared))
  return Math.hypot(point[0] - (start[0] + deltaX * t), point[1] - (start[1] + deltaZ * t))
}

function normalize(x: number, z: number): [number, number] {
  const length = Math.hypot(x, z) || 1
  return [x / length, z / length]
}

function subdivideRoadPolyline(
  points: readonly RoadSplinePoint[],
  maxSegmentLength = 1.5,
): RoadSplinePoint[] {
  const result: RoadSplinePoint[] = []
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index]!
    const end = points[index + 1]!
    if (index === 0) result.push([start[0], start[1]])
    const length = Math.hypot(end[0] - start[0], end[1] - start[1])
    const subdivisions = Math.max(1, Math.ceil(length / maxSegmentLength))
    for (let step = 1; step <= subdivisions; step += 1) {
      const progress = step / subdivisions
      result.push([
        start[0] + (end[0] - start[0]) * progress,
        start[1] + (end[1] - start[1]) * progress,
      ])
    }
  }
  return result
}

function buildMarkingLines(node: RoadSplineNode): MarkingLine[] {
  const lines: MarkingLine[] = []
  const laneCount = node.laneCount ?? 2
  const centerLineStyle = node.centerLineStyle ?? 'double'
  const centerLineColor = node.centerLineColor ?? '#e6c84f'
  const laneLineColor = node.laneLineColor ?? '#e8e5d7'
  const edgeLines = node.edgeLines ?? true
  if (centerLineStyle === 'single') {
    lines.push({ id: 'center-single', color: centerLineColor, offset: 0, width: 0.12 })
  } else if (centerLineStyle === 'double') {
    lines.push(
      { id: 'center-left', color: centerLineColor, offset: -0.11, width: 0.1 },
      { id: 'center-right', color: centerLineColor, offset: 0.11, width: 0.1 },
    )
  } else if (centerLineStyle === 'dashed') {
    lines.push({ id: 'center-dashed', color: centerLineColor, offset: 0, width: 0.12, dashLength: 3, gapLength: 3 })
  }

  if (laneCount > 2) {
    for (let lane = 1; lane < laneCount; lane += 1) {
      const offset = -node.width / 2 + (node.width / laneCount) * lane
      if (Math.abs(offset) < 0.2) continue
      lines.push({
        id: `lane-${lane}`,
        color: laneLineColor,
        offset,
        width: 0.1,
        dashLength: 3,
        gapLength: 6,
      })
    }
  }

  if (edgeLines) {
    const edgeOffset = Math.max(0.2, node.width / 2 - 0.22)
    lines.push(
      { id: 'edge-left', color: laneLineColor, offset: -edgeOffset, width: 0.1 },
      { id: 'edge-right', color: laneLineColor, offset: edgeOffset, width: 0.1 },
    )
  }
  return lines
}

export function buildRoadMarkingGeometries(node: RoadSplineNode): RoadMarkingGeometry[] {
  const segments = Math.max(64, (node.points.length - 1) * ROAD_SAMPLE_SEGMENTS_PER_SPAN)
  const pathMode = node.pathMode ?? 'spline'
  const roadCenterline = subdivideRoadPolyline(sampleRoadPath(node.points, pathMode, segments))
  const junctions = node.junctions ?? []
  return buildMarkingLines(node).map((line) => {
    const lineCenterline = pathMode === 'orthogonal'
      ? roadCenterline
      : sampleOffsetRoadCenterline(node.points, line.offset, segments)
    return {
      id: line.id,
      color: line.color,
      geometry: buildLineGeometry(
        lineCenterline,
        pathMode === 'orthogonal' ? line : { ...line, offset: 0 },
        node.thickness + 0.012,
        pathMode,
        roadCenterline,
        junctions,
        getRoadJunctionRadius(node.width),
      ),
    }
  })
}
