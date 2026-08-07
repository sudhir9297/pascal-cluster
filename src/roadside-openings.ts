import { sampleRoadEdgePoints } from './road-network-geometry'
import {
  trimRoadTransitionProfile,
  type RoadTransitionProfile,
} from './road-transition-profile'
import type { RoadEdgeAttachment, RoadGraphEdge, RoadNetworkNode } from './schema'
import type { RoadSide, RoadSideComponentKind } from './road-cross-section'

export type RoadsideOpeningInterval = {
  end: number
  start: number
}

export type RoadsideOpeningIntervals = Record<RoadSide, RoadsideOpeningInterval[]>

export type RoadsideSurfacePolygon = {
  points: [number, number, number][]
}

type OpeningEdgeSample = {
  end: number
  outward: number
  start: number
}

type OpeningShape = {
  samples: OpeningEdgeSample[]
}

const EPSILON = 1e-6
const LEGACY_DRIVEWAY_OPENING_WIDTH = 3.2

function distanceXZ(
  first: readonly [number, number, number],
  second: readonly [number, number, number],
): number {
  return Math.hypot(second[0] - first[0], second[2] - first[2])
}

function attachmentOpeningWidth(attachment: RoadEdgeAttachment): number {
  if (attachment.roadOpeningWidth && attachment.roadOpeningWidth > EPSILON) {
    return attachment.roadOpeningWidth
  }
  return attachment.assetNodeId.startsWith('driveway_')
    ? LEGACY_DRIVEWAY_OPENING_WIDTH
    : 0
}

function edgeAnchor(
  node: RoadNetworkNode,
  edge: RoadGraphEdge,
  requestedStation: number,
): { point: [number, number, number]; tangent: [number, number] } | null {
  const points = sampleRoadEdgePoints(node, edge, 48)
  if (points.length < 2) return null
  const lengths = points.slice(0, -1).map((point, index) =>
    distanceXZ(point!, points[index + 1]!),
  )
  const total = lengths.reduce((sum, length) => sum + length, 0)
  let remaining = Math.max(0, Math.min(total, requestedStation))
  for (let index = 0; index < lengths.length; index += 1) {
    const length = lengths[index]!
    if (remaining <= length || index === lengths.length - 1) {
      const from = points[index]!
      const to = points[index + 1]!
      const t = length <= EPSILON ? 0 : remaining / length
      return {
        point: [
          from[0] + (to[0] - from[0]) * t,
          from[1] + (to[1] - from[1]) * t,
          from[2] + (to[2] - from[2]) * t,
        ],
        tangent: length <= EPSILON
          ? [1, 0]
          : [(to[0] - from[0]) / length, (to[2] - from[2]) / length],
      }
    }
    remaining -= length
  }
  return null
}

function projectToProfile(
  profile: RoadTransitionProfile,
  point: readonly [number, number, number],
): { distance: number; separation: number; tangent: [number, number] } | null {
  let best: { distance: number; separation: number; tangent: [number, number] } | null = null
  for (let index = 0; index < profile.samples.length - 1; index += 1) {
    const first = profile.samples[index]!
    const second = profile.samples[index + 1]!
    const dx = second.point[0] - first.point[0]
    const dz = second.point[2] - first.point[2]
    const lengthSquared = dx * dx + dz * dz
    if (lengthSquared <= EPSILON) continue
    const t = Math.max(0, Math.min(1,
      ((point[0] - first.point[0]) * dx + (point[2] - first.point[2]) * dz)
        / lengthSquared,
    ))
    const projected: [number, number, number] = [
      first.point[0] + dx * t,
      first.point[1] + (second.point[1] - first.point[1]) * t,
      first.point[2] + dz * t,
    ]
    const separation = distanceXZ(point, projected)
    if (!best || separation < best.separation) {
      const length = Math.sqrt(lengthSquared)
      best = {
        distance: first.distance + (second.distance - first.distance) * t,
        separation,
        tangent: [dx / length, dz / length],
      }
    }
  }
  return best
}

function openingShapesForProfile(
  node: RoadNetworkNode,
  profile: RoadTransitionProfile,
  requestedSide: RoadSide,
): OpeningShape[] {
  const total = profile.samples.at(-1)?.distance ?? 0
  const shapes: OpeningShape[] = []
  for (const attachment of Object.values(node.attachments ?? {})) {
    if (!profile.edgeIds.includes(attachment.edgeId)) continue
    const width = attachmentOpeningWidth(attachment)
    const edge = node.edges[attachment.edgeId]
    if (!edge || width <= EPSILON) continue
    const anchor = edgeAnchor(node, edge, attachment.station)
    if (!anchor) continue
    const projection = projectToProfile(profile, anchor.point)
    if (!projection || projection.separation > width / 2 + 0.5) continue
    const attachmentSide = attachment.side ?? (attachment.lateralOffset >= 0 ? 'left' : 'right')
    const sameDirection =
      anchor.tangent[0] * projection.tangent[0]
        + anchor.tangent[1] * projection.tangent[1] >= 0
    const profileSide: RoadSide = sameDirection
      ? attachmentSide
      : attachmentSide === 'left' ? 'right' : 'left'
    if (profileSide !== requestedSide) continue
    const relativeSamples = attachment.roadOpeningProfile?.length
      ? attachment.roadOpeningProfile.map((sample) => ({
          outward: sample.outwardOffset,
          start: sample.startOffset,
          end: sample.endOffset,
        }))
      : [0, 20].map((outward) => ({
          outward,
          start: (attachment.roadOpeningOffset ?? 0) - width / 2,
          end: (attachment.roadOpeningOffset ?? 0) + width / 2,
        }))
    const samples = relativeSamples.map((sample) => ({
      outward: sample.outward,
      start: Math.max(0, Math.min(total, projection.distance + (sameDirection ? sample.start : -sample.end))),
      end: Math.max(0, Math.min(total, projection.distance + (sameDirection ? sample.end : -sample.start))),
    }))
    if (samples.some((sample) => sample.end - sample.start > EPSILON)) shapes.push({ samples })
  }
  return shapes.sort((left, right) => left.samples[0]!.start - right.samples[0]!.start)
}

function profileFrameAtDistance(profile: RoadTransitionProfile, requestedDistance: number) {
  const samples = profile.samples
  const total = samples.at(-1)?.distance ?? 0
  const distance = Math.max(0, Math.min(total, requestedDistance))
  let index = 0
  while (index < samples.length - 2 && samples[index + 1]!.distance < distance) index += 1
  const first = samples[index]!
  const second = samples[Math.min(samples.length - 1, index + 1)]!
  const span = Math.max(EPSILON, second.distance - first.distance)
  const ratio = Math.max(0, Math.min(1, (distance - first.distance) / span))
  const dx = second.point[0] - first.point[0]
  const dz = second.point[2] - first.point[2]
  const length = Math.max(EPSILON, Math.hypot(dx, dz))
  const interpolate = (firstValue: number, secondValue: number) =>
    firstValue + (secondValue - firstValue) * ratio
  return {
    first,
    second,
    ratio,
    point: [
      interpolate(first.point[0], second.point[0]),
      interpolate(first.point[1], second.point[1]),
      interpolate(first.point[2], second.point[2]),
    ] as [number, number, number],
    normal: [-dz / length, dx / length] as [number, number],
    interpolate,
  }
}

function componentPoint(
  profile: RoadTransitionProfile,
  side: RoadSide,
  kind: RoadSideComponentKind,
  distance: number,
  boundary: 'inner' | 'outer',
  elevationOffset: number,
): [number, number, number] {
  const frame = profileFrameAtDistance(profile, distance)
  const firstBounds = frame.first.components[side][kind]
  const secondBounds = frame.second.components[side][kind]
  const offset = frame.interpolate(
    boundary === 'inner' ? firstBounds.innerOffset : firstBounds.outerOffset,
    boundary === 'inner' ? secondBounds.innerOffset : secondBounds.outerOffset,
  ) * (side === 'left' ? 1 : -1)
  return [
    frame.point[0] + frame.normal[0] * offset,
    frame.point[1] + frame.interpolate(frame.first.surfaceThickness, frame.second.surfaceThickness) + elevationOffset,
    frame.point[2] + frame.normal[1] * offset,
  ]
}

function cutPoint(
  profile: RoadTransitionProfile,
  side: RoadSide,
  distance: number,
  outward: number,
  elevationOffset: number,
): [number, number, number] {
  const frame = profileFrameAtDistance(profile, distance)
  const halfWidth = frame.interpolate(frame.first.carriagewayHalfWidth, frame.second.carriagewayHalfWidth)
  const offset = (halfWidth + outward) * (side === 'left' ? 1 : -1)
  return [
    frame.point[0] + frame.normal[0] * offset,
    frame.point[1] + frame.interpolate(frame.first.surfaceThickness, frame.second.surfaceThickness) + elevationOffset,
    frame.point[2] + frame.normal[1] * offset,
  ]
}

function shapeDistanceAtOutward(
  shape: OpeningShape,
  edge: 'start' | 'end',
  requestedOutward: number,
): number {
  const samples = shape.samples
  const outward = Math.max(samples[0]!.outward, Math.min(samples.at(-1)!.outward, requestedOutward))
  let index = 0
  while (index < samples.length - 2 && samples[index + 1]!.outward < outward) index += 1
  const first = samples[index]!
  const second = samples[Math.min(samples.length - 1, index + 1)]!
  const span = Math.max(EPSILON, second.outward - first.outward)
  const ratio = Math.max(0, Math.min(1, (outward - first.outward) / span))
  return first[edge] + (second[edge] - first[edge]) * ratio
}

function shapeBoundaryPoints(
  profile: RoadTransitionProfile,
  side: RoadSide,
  kind: RoadSideComponentKind,
  shape: OpeningShape,
  edge: 'start' | 'end',
  outerToInner: boolean,
  elevationOffset: number,
): [number, number, number][] {
  const { inner, outer } = componentOutwardRange(profile, side, kind, shape, edge)
  const outwardSamples = [inner,
    ...shape.samples.map((sample) => sample.outward).filter((value) => value > inner + EPSILON && value < outer - EPSILON),
    outer]
  if (outerToInner) outwardSamples.reverse()
  return outwardSamples.map((outward) => cutPoint(
    profile,
    side,
    shapeDistanceAtOutward(shape, edge, outward),
    outward,
    elevationOffset,
  ))
}

function componentOutwardRange(
  profile: RoadTransitionProfile,
  side: RoadSide,
  kind: RoadSideComponentKind,
  shape: OpeningShape,
  edge: 'start' | 'end',
): { inner: number; outer: number } {
  const representativeDistance = shape.samples[Math.floor(shape.samples.length / 2)]![edge]
  const frame = profileFrameAtDistance(profile, representativeDistance)
  const firstBounds = frame.first.components[side][kind]
  const secondBounds = frame.second.components[side][kind]
  const halfWidth = frame.interpolate(frame.first.carriagewayHalfWidth, frame.second.carriagewayHalfWidth)
  const innerOffset = frame.interpolate(firstBounds.innerOffset, secondBounds.innerOffset)
  const outerOffset = frame.interpolate(firstBounds.outerOffset, secondBounds.outerOffset)
  const inner = Math.max(0, innerOffset - halfWidth)
  return { inner, outer: Math.max(inner, outerOffset - halfWidth) }
}

function longitudinalBoundaryPoints(
  profile: RoadTransitionProfile,
  side: RoadSide,
  kind: RoadSideComponentKind,
  start: number,
  end: number,
  boundary: 'inner' | 'outer',
  elevationOffset: number,
): [number, number, number][] {
  const distances = [start,
    ...profile.samples.map((sample) => sample.distance).filter((distance) => distance > start + EPSILON && distance < end - EPSILON),
    end]
  if (boundary === 'outer') distances.reverse()
  return distances.map((distance) => componentPoint(profile, side, kind, distance, boundary, elevationOffset))
}

/** Build roadside component surfaces with opening boundaries that follow driveway edges. */
export function buildRoadsideComponentSurfacePolygons(
  node: RoadNetworkNode,
  profile: RoadTransitionProfile,
  side: RoadSide,
  kind: RoadSideComponentKind,
  elevationOffset = 0,
): RoadsideSurfacePolygon[] | null {
  const shapes = openingShapesForProfile(node, profile, side)
  if (shapes.length === 0) return null
  const total = profile.samples.at(-1)?.distance ?? 0
  const polygons: RoadsideSurfacePolygon[] = []
  let previousShape: OpeningShape | null = null
  for (const nextShape of [...shapes, null]) {
    const previousRange = previousShape
      ? componentOutwardRange(profile, side, kind, previousShape, 'end')
      : null
    const nextRange = nextShape
      ? componentOutwardRange(profile, side, kind, nextShape, 'start')
      : null
    const innerStartDistance = previousShape && previousRange
      ? shapeDistanceAtOutward(previousShape, 'end', previousRange.inner)
      : 0
    const innerEndDistance = nextShape && nextRange
      ? shapeDistanceAtOutward(nextShape, 'start', nextRange.inner)
      : total
    const outerStartDistance = previousShape && previousRange
      ? shapeDistanceAtOutward(previousShape, 'end', previousRange.outer)
      : 0
    const outerEndDistance = nextShape && nextRange
      ? shapeDistanceAtOutward(nextShape, 'start', nextRange.outer)
      : total
    if (Math.max(innerEndDistance - innerStartDistance, outerEndDistance - outerStartDistance) > EPSILON) {
      const points: [number, number, number][] = []
      if (previousShape) {
        points.push(...shapeBoundaryPoints(profile, side, kind, previousShape, 'end', true, elevationOffset))
      } else {
        points.push(componentPoint(profile, side, kind, 0, 'outer', elevationOffset))
      }
      points.push(...longitudinalBoundaryPoints(
        profile, side, kind, innerStartDistance, innerEndDistance, 'inner', elevationOffset,
      ))
      if (nextShape) {
        points.push(...shapeBoundaryPoints(profile, side, kind, nextShape, 'start', false, elevationOffset))
      } else {
        points.push(componentPoint(profile, side, kind, total, 'outer', elevationOffset))
      }
      points.push(...longitudinalBoundaryPoints(
        profile, side, kind, outerStartDistance, outerEndDistance, 'outer', elevationOffset,
      ))
      const compact = points.filter((point, index) => {
        const previous = points[index - 1]
        return !previous || Math.hypot(
          point[0] - previous[0], point[1] - previous[1], point[2] - previous[2],
        ) > EPSILON
      })
      const first = compact[0]
      const last = compact.at(-1)
      if (first && last && Math.hypot(
        first[0] - last[0], first[1] - last[1], first[2] - last[2],
      ) <= EPSILON) compact.pop()
      polygons.push({ points: compact })
    }
    previousShape = nextShape
  }
  return polygons
}

function mergeIntervals(
  intervals: RoadsideOpeningInterval[],
  total: number,
): RoadsideOpeningInterval[] {
  const ordered = intervals
    .map((interval) => ({
      start: Math.max(0, Math.min(total, interval.start)),
      end: Math.max(0, Math.min(total, interval.end)),
    }))
    .filter((interval) => interval.end - interval.start > EPSILON)
    .sort((left, right) => left.start - right.start)
  const merged: RoadsideOpeningInterval[] = []
  for (const interval of ordered) {
    const previous = merged.at(-1)
    if (previous && interval.start <= previous.end + EPSILON) {
      previous.end = Math.max(previous.end, interval.end)
    } else {
      merged.push({ ...interval })
    }
  }
  return merged
}

/** Locate driveway mouths on a rendered path and express them as side-specific chainage gaps. */
export function roadsideOpeningIntervalsForProfile(
  node: RoadNetworkNode,
  profile: RoadTransitionProfile,
): RoadsideOpeningIntervals {
  const result: RoadsideOpeningIntervals = { left: [], right: [] }
  const total = profile.samples.at(-1)?.distance ?? 0
  for (const attachment of Object.values(node.attachments ?? {})) {
    if (!profile.edgeIds.includes(attachment.edgeId)) continue
    const width = attachmentOpeningWidth(attachment)
    const edge = node.edges[attachment.edgeId]
    if (!edge || width <= EPSILON) continue
    const anchor = edgeAnchor(
      node,
      edge,
      attachment.station + (attachment.roadOpeningOffset ?? 0),
    )
    if (!anchor) continue
    const projection = projectToProfile(profile, anchor.point)
    if (!projection || projection.separation > width / 2 + 0.5) continue
    const attachmentSide = attachment.side ?? (attachment.lateralOffset >= 0 ? 'left' : 'right')
    const sameDirection =
      anchor.tangent[0] * projection.tangent[0]
        + anchor.tangent[1] * projection.tangent[1] >= 0
    const profileSide: RoadSide = sameDirection
      ? attachmentSide
      : attachmentSide === 'left' ? 'right' : 'left'
    result[profileSide].push({
      start: projection.distance - width / 2,
      end: projection.distance + width / 2,
    })
  }
  return {
    left: mergeIntervals(result.left, total),
    right: mergeIntervals(result.right, total),
  }
}

/** Split one roadside ribbon into the visible runs surrounding its openings. */
export function splitRoadTransitionProfileAtOpenings(
  profile: RoadTransitionProfile,
  openings: RoadsideOpeningInterval[],
): RoadTransitionProfile[] {
  const total = profile.samples.at(-1)?.distance ?? 0
  if (total <= EPSILON) return []
  const intervals = mergeIntervals(openings, total)
  if (intervals.length === 0) return [profile]
  const runs: RoadTransitionProfile[] = []
  let cursor = 0
  for (const opening of intervals) {
    if (opening.start - cursor > EPSILON) {
      runs.push(trimRoadTransitionProfile(profile, cursor, total - opening.start))
    }
    cursor = Math.max(cursor, opening.end)
  }
  if (total - cursor > EPSILON) {
    runs.push(trimRoadTransitionProfile(profile, cursor, 0))
  }
  return runs.filter((run) => (run.samples.at(-1)?.distance ?? 0) > EPSILON)
}
