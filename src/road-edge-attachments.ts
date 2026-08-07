import type {
  RoadAttachmentAlignment,
  RoadEdgeAttachment,
  RoadGraphEdge,
  RoadNetworkNode,
  RoadSignNode,
  RoadStylePreset,
  StreetLightNode,
} from './schema'
import type { StreetInfrastructureNode } from './street-infrastructure-config'
import { buildRoadCrossSection, type RoadSide } from './road-cross-section'
import { sampleRoadEdgePoints } from './road-network-geometry'
import { DEFAULT_ROAD_STYLE_PRESETS } from './road-style-presets'
import { projectRoadPointToEdge } from './road-network-topology'
import {
  buildDrivewayPlan,
  resolveRoadBarrierLayout,
  resolveTrafficBollardLayout,
  resolveFireHydrantLayout,
  resolveManholeCoverLayout,
  resolveResidentialRoadAssetLayout,
} from './street-infrastructure-geometry'

export type RoadAttachmentAssetKind =
  | 'environment:street-light'
  | 'environment:road-sign'
  | 'environment:traffic-signal'
  | 'environment:drainage-inlet'
  | 'environment:manhole-cover'
  | 'environment:fire-hydrant'
  | 'environment:traffic-bollard'
  | 'environment:road-barrier'
  | 'environment:driveway'
  | 'environment:mailbox'
  | 'environment:parcel-box'
  | 'environment:trash-bin'
  | 'environment:recycling-bin'
  | 'environment:residential-gate'
  | 'environment:speed-hump'

type RoadAttachmentPoseNode = StreetInfrastructureNode | StreetLightNode | RoadSignNode

export type RoadAttachmentTransform = {
  position: [number, number, number]
  rotation: [number, number, number]
  tangent: [number, number]
  side: RoadSide
}

type RoadAttachmentOpening = Pick<
  RoadEdgeAttachment,
  'roadOpeningOffset' | 'roadOpeningProfile' | 'roadOpeningWidth'
>

export type RoadAttachmentTarget = {
  distance: number
  edgeId: string
  lateralOffset: number
  point: [number, number, number]
  side: RoadSide
  station: number
  tangent: [number, number]
}

export type SignalJunctionPlacement = {
  edgeId: string
  lateralOffset: number
  position: [number, number, number]
  rotationY: number
  side: RoadSide
  station: number
  tangent: [number, number]
}

/** Remove attachment records whose scene asset no longer exists. */
export function pruneOrphanedRoadAttachments(
  attachments: RoadNetworkNode['attachments'],
  existingAssetIds: ReadonlySet<string>,
): RoadNetworkNode['attachments'] {
  let result = attachments
  for (const [attachmentId, attachment] of Object.entries(attachments)) {
    if (existingAssetIds.has(attachment.assetNodeId)) continue
    if (result === attachments) result = { ...attachments }
    delete result[attachmentId]
  }
  return result
}

const ATTACHMENT_CAPTURE_PADDING = 1.2
const SIGNAL_SETBACK = 7.5
const MANHOLE_ROAD_CLEARANCE = 0.12
const ROAD_SURFACE_CLEARANCE = 0.006
const DRAINAGE_INLET_PLACEMENT_Y = 0.15
const HYDRANT_CURB_CLEARANCE = 0.05
const ROADSIDE_ASSET_CLEARANCE = 0.08

function distanceXZ(
  first: readonly [number, number, number],
  second: readonly [number, number, number],
): number {
  return Math.hypot(first[0] - second[0], first[2] - second[2])
}

function roadStyleForEdge(network: RoadNetworkNode, edge: RoadGraphEdge): RoadStylePreset {
  const styleId = network.applyStyleToAll ? network.activeStyleId : edge.styleId
  return (
    network.stylePresets[styleId] ??
    DEFAULT_ROAD_STYLE_PRESETS[styleId as keyof typeof DEFAULT_ROAD_STYLE_PRESETS] ??
    network.stylePresets[network.activeStyleId] ??
    DEFAULT_ROAD_STYLE_PRESETS['local-street']
  ) as RoadStylePreset
}

function sideFromProjection(
  point: readonly [number, number, number],
  projection: readonly [number, number, number],
  tangent: readonly [number, number],
): RoadSide {
  const cross = tangent[0] * (point[2] - projection[2]) - tangent[1] * (point[0] - projection[0])
  return cross >= 0 ? 'left' : 'right'
}

function sideSign(side: RoadSide): number {
  return side === 'left' ? 1 : -1
}

function tangentAtIndex(points: readonly (readonly [number, number, number])[], index: number): [number, number] {
  const from = points[Math.max(0, Math.min(points.length - 2, index))]!
  const to = points[Math.max(1, Math.min(points.length - 1, index + 1))]!
  const dx = to[0] - from[0]
  const dz = to[2] - from[2]
  const length = Math.max(Math.hypot(dx, dz), 1e-6)
  return [dx / length, dz / length]
}

function tangentAtParameter(
  points: readonly (readonly [number, number, number])[],
  parameter: number,
): [number, number] {
  const segmentCount = Math.max(1, points.length - 1)
  return tangentAtIndex(points, Math.min(segmentCount - 1, Math.floor(Math.max(0, Math.min(1, parameter)) * segmentCount)))
}

function edgePathMetrics(network: RoadNetworkNode, edge: RoadGraphEdge) {
  const points = sampleRoadEdgePoints(network, edge, 48)
  let length = 0
  for (let index = 0; index < points.length - 1; index += 1) {
    length += distanceXZ(points[index]!, points[index + 1]!)
  }
  return { length, points }
}

function stationAtParameter(
  points: readonly (readonly [number, number, number])[],
  parameter: number,
): number {
  if (points.length < 2) return 0
  const segmentCount = points.length - 1
  const scaled = Math.max(0, Math.min(1, parameter)) * segmentCount
  const completeSegments = Math.min(segmentCount, Math.floor(scaled))
  let station = 0
  for (let index = 0; index < completeSegments; index += 1) {
    station += distanceXZ(points[index]!, points[index + 1]!)
  }
  if (completeSegments < segmentCount) {
    station += distanceXZ(points[completeSegments]!, points[completeSegments + 1]!) * (scaled - completeSegments)
  }
  return station
}

function pointAtStation(
  points: readonly (readonly [number, number, number])[],
  requestedStation: number,
): { point: [number, number, number]; tangent: [number, number]; station: number } {
  if (points.length < 2) {
    const point = [...(points[0] ?? [0, 0, 0])] as [number, number, number]
    return { point, tangent: [1, 0], station: 0 }
  }
  const lengths = points.slice(0, -1).map((point, index) => distanceXZ(point!, points[index + 1]!))
  const total = lengths.reduce((sum, value) => sum + value, 0)
  let remaining = Math.max(0, Math.min(total, requestedStation))
  let traversed = 0
  for (let index = 0; index < lengths.length; index += 1) {
    const segmentLength = lengths[index]!
    if (remaining <= segmentLength || index === lengths.length - 1) {
      const from = points[index]!
      const to = points[index + 1]!
      const ratio = segmentLength <= 1e-6 ? 0 : remaining / segmentLength
      return {
        point: [
          from[0] + (to[0] - from[0]) * ratio,
          from[1] + (to[1] - from[1]) * ratio,
          from[2] + (to[2] - from[2]) * ratio,
        ],
        tangent: tangentAtIndex(points, index),
        station: traversed + remaining,
      }
    }
    remaining -= segmentLength
    traversed += segmentLength
  }
  const last = points.at(-1)!
  return {
    point: [...last] as [number, number, number],
    tangent: tangentAtIndex(points, points.length - 2),
    station: total,
  }
}

function sideComponentMetrics(
  style: RoadStylePreset,
  side: RoadSide,
  preferred: 'gutter' | 'curb',
) {
  const crossSection = buildRoadCrossSection(style)
  const components = crossSection.sides[side].components
  const component = components.find((candidate) => candidate.kind === preferred)
    ?? (preferred === 'gutter' ? components.find((candidate) => candidate.kind === 'curb') : undefined)
  return component
    ? { lateralOffset: Math.abs(component.lateralOffset), elevationOffset: component.elevationOffset }
    : {
        lateralOffset: crossSection.sides[side].outerOffset,
        elevationOffset: 0,
      }
}

function roadSurfaceHeightAtLateralOffset(
  style: RoadStylePreset,
  crossSection: ReturnType<typeof buildRoadCrossSection>,
  side: RoadSide,
  lateralOffset: number,
): number {
  const distanceFromCenter = Math.abs(lateralOffset)
  if (distanceFromCenter <= crossSection.carriagewayWidth / 2) {
    return style.surfaceThickness
  }
  const strip = crossSection.sides[side].components.find(
    (candidate) =>
      distanceFromCenter >= candidate.innerOffset - 1e-6 &&
      distanceFromCenter <= candidate.outerOffset + 1e-6,
  )
  return strip ? style.surfaceThickness + strip.elevationOffset : 0
}

function attachmentAlignmentForKind(kind: RoadAttachmentAssetKind): RoadAttachmentAlignment {
  if (kind === 'environment:drainage-inlet') return 'gutter'
  if (kind === 'environment:fire-hydrant') return 'curb'
  if (kind === 'environment:traffic-bollard') return 'curb'
  if (kind === 'environment:road-barrier') return 'curb'
  if (kind === 'environment:manhole-cover') return 'carriageway'
  if (kind === 'environment:driveway' || kind === 'environment:speed-hump') return 'carriageway'
  if (
    kind === 'environment:mailbox' ||
    kind === 'environment:parcel-box' ||
    kind === 'environment:trash-bin' ||
    kind === 'environment:recycling-bin' ||
    kind === 'environment:residential-gate'
  ) return 'curb'
  return 'free'
}

function nearestEdgeTarget(
  networks: readonly RoadNetworkNode[],
  point: readonly [number, number, number],
  kind: RoadAttachmentAssetKind,
  captureOnly = true,
): RoadAttachmentTarget & { network: RoadNetworkNode } | null {
  let best: (RoadAttachmentTarget & { network: RoadNetworkNode }) | null = null
  for (const network of networks) {
    for (const edge of Object.values(network.edges)) {
      const projection = projectRoadPointToEdge(network, edge.id, point)
      if (!projection) continue
      const points = sampleRoadEdgePoints(network, edge, 48)
      const tangent = tangentAtParameter(points, projection.t)
      const side = sideFromProjection(point, projection.point, tangent)
      const style = roadStyleForEdge(network, edge)
      const crossSection = buildRoadCrossSection(style)
      const maxDistance = crossSection.sides[side].outerOffset + ATTACHMENT_CAPTURE_PADDING
      if (captureOnly && projection.distance > maxDistance) continue
      const candidate = {
        network,
        distance: projection.distance,
        edgeId: edge.id,
        lateralOffset: (point[0] - projection.point[0]) * -tangent[1] + (point[2] - projection.point[2]) * tangent[0],
        point: [...projection.point] as [number, number, number],
        side,
        station: stationAtParameter(points, projection.t),
        tangent,
      }
      if (
        !best ||
        candidate.distance < best.distance - 1e-6 ||
        (Math.abs(candidate.distance - best.distance) <= 1e-6 && `${network.id}:${edge.id}`.localeCompare(`${best.network.id}:${best.edgeId}`) < 0)
      ) {
        best = candidate
      }
    }
  }
  return best
}

export function findRoadAttachmentTarget(
  networks: readonly RoadNetworkNode[],
  point: readonly [number, number, number],
  kind: RoadAttachmentAssetKind,
): (RoadAttachmentTarget & { network: RoadNetworkNode }) | null {
  return nearestEdgeTarget(networks, point, kind)
}

export function resolveRoadAttachmentTransform(
  network: RoadNetworkNode,
  attachment: RoadEdgeAttachment,
  node: RoadAttachmentPoseNode,
): RoadAttachmentTransform | null {
  const edge = network.edges[attachment.edgeId]
  if (!edge) return null
  const { length, points } = edgePathMetrics(network, edge)
  if (points.length < 2) return null
  const sampled = pointAtStation(points, Math.min(length, attachment.station))
  const side = attachment.side ?? (attachment.lateralOffset >= 0 ? 'left' : 'right')
  const sign = sideSign(side)
  const style = roadStyleForEdge(network, edge)
  // Older road graphs may have persisted the original free alignment before
  // infrastructure-specific snapping was introduced. Infer the safe default
  // from the asset kind so those assets are repaired on the next sync too.
  const alignment = attachment.alignment === 'free' && node.type === 'environment:manhole-cover'
    ? 'carriageway'
    : attachment.alignment ?? 'free'
  const component = alignment === 'gutter'
    ? sideComponentMetrics(style, side, 'gutter')
    : alignment === 'curb'
      ? sideComponentMetrics(style, side, 'curb')
      : null
  const crossSection = buildRoadCrossSection(style)
  const manholeLayout = node.type === 'environment:manhole-cover'
    ? resolveManholeCoverLayout(node)
    : null
  const hydrantLayout = node.type === 'environment:fire-hydrant'
    ? resolveFireHydrantLayout(node)
    : null
  const bollardLayout = node.type === 'environment:traffic-bollard'
    ? resolveTrafficBollardLayout(node)
    : null
  const barrierLayout = node.type === 'environment:road-barrier'
    ? resolveRoadBarrierLayout(node)
    : null
  const residentialLayout = [
    'environment:driveway',
    'environment:mailbox',
    'environment:parcel-box',
    'environment:trash-bin',
    'environment:recycling-bin',
    'environment:residential-gate',
    'environment:speed-hump',
  ].includes(node.type)
    ? resolveResidentialRoadAssetLayout(node as never)
    : null
  const curbStrip = crossSection.sides[side].components.find(
    (candidate) => candidate.kind === 'curb',
  )
  const vergeStrip = crossSection.sides[side].components.find(
    (candidate) => candidate.kind === 'verge',
  )
  const lateralOffset = alignment === 'curb' && node.type === 'environment:fire-hydrant'
    ? sign * (
        vergeStrip
          ? Math.abs(vergeStrip.lateralOffset)
          : (curbStrip?.outerOffset ?? crossSection.sides[side].outerOffset)
            + hydrantLayout!.barrelRadius
            + HYDRANT_CURB_CLEARANCE
      )
    : alignment === 'curb' && node.type === 'environment:traffic-bollard'
      ? sign * (
          (curbStrip?.outerOffset ?? crossSection.sides[side].outerOffset)
            + bollardLayout!.baseRadius
            + ROADSIDE_ASSET_CLEARANCE
        )
      : alignment === 'curb' && node.type === 'environment:road-barrier'
        ? sign * (
            vergeStrip
              ? Math.abs(vergeStrip.lateralOffset)
              : (curbStrip?.outerOffset ?? crossSection.sides[side].outerOffset)
                + barrierLayout!.width / 2
                + ROADSIDE_ASSET_CLEARANCE
          )
    : alignment === 'curb' && residentialLayout
      ? sign * ((curbStrip?.outerOffset ?? crossSection.sides[side].outerOffset) + residentialLayout.length / 2 + ROADSIDE_ASSET_CLEARANCE)
    : alignment === 'carriageway' && node.type === 'environment:driveway'
      ? sign * (crossSection.carriagewayWidth / 2 + residentialLayout!.length / 2)
    : component
    ? sign * component.lateralOffset
    : alignment === 'carriageway' && node.type === 'environment:manhole-cover'
      ? sign * Math.min(
          Math.abs(attachment.lateralOffset),
          Math.max(
            0,
            crossSection.carriagewayWidth / 2
              - manholeLayout!.radius
              - MANHOLE_ROAD_CLEARANCE,
          ),
        )
      : attachment.lateralOffset
  const leftNormal: [number, number] = [-sampled.tangent[1], sampled.tangent[0]]
  const roadSurfaceHeight = roadSurfaceHeightAtLateralOffset(
    style,
    crossSection,
    side,
    lateralOffset,
  )
  const geometryBaseOffset = alignment === 'gutter' && node.type === 'environment:drainage-inlet'
    ? DRAINAGE_INLET_PLACEMENT_Y
    : alignment === 'carriageway' && node.type === 'environment:manhole-cover'
      ? roadSurfaceHeight
        + ROAD_SURFACE_CLEARANCE
        - manholeLayout!.coverTopY
      : roadSurfaceHeight > 0
        ? roadSurfaceHeight + ROAD_SURFACE_CLEARANCE
        : 0
  const baseY = sampled.point[1] + geometryBaseOffset + attachment.verticalOffset
  const position: [number, number, number] = [
    sampled.point[0] + sampled.tangent[0] * (attachment.longitudinalOffset ?? 0) + leftNormal[0] * lateralOffset,
    baseY,
    sampled.point[2] + sampled.tangent[1] * (attachment.longitudinalOffset ?? 0) + leftNormal[1] * lateralOffset,
  ]
  const currentRotation = node.rotation ?? [0, 0, 0]
  let rotationY = currentRotation[1] ?? 0
  const tangentRotationY = -Math.atan2(sampled.tangent[1], sampled.tangent[0])
  if (attachment.headingOffset !== undefined) {
    rotationY = tangentRotationY + attachment.headingOffset
  } else if (alignment === 'gutter') {
    rotationY = tangentRotationY
      + (side === 'right' ? Math.PI : 0)
  } else if (alignment === 'curb' && node.type === 'environment:fire-hydrant') {
    rotationY = tangentRotationY + (side === 'right' ? Math.PI : 0)
  } else if (alignment === 'curb' && node.type === 'environment:road-barrier') {
    rotationY = tangentRotationY
  } else if (alignment === 'curb' && residentialLayout) {
    rotationY = tangentRotationY + (side === 'right' ? Math.PI : 0)
  } else if (alignment === 'carriageway' && node.type === 'environment:driveway') {
    // A driveway's local -Z end is its road-facing mouth. Mirror the right
    // side so that mouth always meets the carriageway instead of pointing out.
    rotationY = tangentRotationY + (side === 'right' ? Math.PI : 0)
  } else if (alignment === 'carriageway' && residentialLayout) {
    rotationY = tangentRotationY
  }
  return {
    position,
    rotation: [currentRotation[0] ?? 0, rotationY, currentRotation[2] ?? 0],
    tangent: sampled.tangent,
    side,
  }
}

function drivewayOpeningForPose(
  node: RoadAttachmentPoseNode,
  rotationY: number,
  tangent: readonly [number, number],
  side: RoadSide,
  roadsideDepth: number,
  longitudinalOffset = 0,
): RoadAttachmentOpening | null {
  if (node.type !== 'environment:driveway') return null
  const plan = buildDrivewayPlan(node)
  const mouth = [plan.leftEdge[0], plan.rightEdge[0]].filter(
    (point): point is NonNullable<typeof point> => point !== undefined,
  )
  if (mouth.length !== 2) return null
  const cosine = Math.cos(rotationY)
  const sine = Math.sin(rotationY)
  const toRoadCoordinates = ([x, z]: readonly [number, number]): [number, number] => {
    const worldX = cosine * x + sine * z
    const worldZ = -sine * x + cosine * z
    const chainage = worldX * tangent[0] + worldZ * tangent[1]
    const leftOffset = -worldX * tangent[1] + worldZ * tangent[0]
    return [chainage, (side === 'left' ? 1 : -1) * leftOffset]
  }
  const mouthCoordinates = mouth.map(toRoadCoordinates)
  const mouthOutward = (mouthCoordinates[0]![1] + mouthCoordinates[1]![1]) / 2
  let corridorPolygon = plan.outline.map((point) => {
    const [chainage, outward] = toRoadCoordinates(point)
    return [chainage, outward - mouthOutward] as [number, number]
  })
  const clipAtOutward = (boundary: number, keepGreater: boolean) => {
    const clipped: [number, number][] = []
    for (let index = 0; index < corridorPolygon.length; index += 1) {
      const current = corridorPolygon[index]!
      const previous = corridorPolygon[(index + corridorPolygon.length - 1) % corridorPolygon.length]!
      const currentInside = keepGreater ? current[1] >= boundary : current[1] <= boundary
      const previousInside = keepGreater ? previous[1] >= boundary : previous[1] <= boundary
      if (currentInside !== previousInside) {
        const ratio = (boundary - previous[1]) / (current[1] - previous[1])
        clipped.push([
          previous[0] + (current[0] - previous[0]) * ratio,
          boundary,
        ])
      }
      if (currentInside) clipped.push(current)
    }
    corridorPolygon = clipped
  }
  clipAtOutward(0, true)
  clipAtOutward(Math.max(0.001, roadsideDepth), false)
  if (corridorPolygon.length === 0) return null
  const projections = corridorPolygon.map(([chainage]) => chainage)
  const start = Math.min(...projections)
  const end = Math.max(...projections)
  const sampleCount = 24
  const clean = (value: number) => Math.round(value * 1e12) / 1e12
  const roadOpeningProfile = Array.from({ length: sampleCount + 1 }, (_, index) => {
    const outwardOffset = Math.max(0.001, roadsideDepth) * index / sampleCount
    const intersections: number[] = []
    for (let edgeIndex = 0; edgeIndex < corridorPolygon.length; edgeIndex += 1) {
      const first = corridorPolygon[edgeIndex]!
      const second = corridorPolygon[(edgeIndex + 1) % corridorPolygon.length]!
      if (Math.abs(first[1] - second[1]) <= 1e-8) {
        if (Math.abs(outwardOffset - first[1]) <= 1e-8) {
          intersections.push(first[0], second[0])
        }
        continue
      }
      if (outwardOffset < Math.min(first[1], second[1]) - 1e-8
        || outwardOffset > Math.max(first[1], second[1]) + 1e-8) continue
      const ratio = (outwardOffset - first[1]) / (second[1] - first[1])
      intersections.push(first[0] + (second[0] - first[0]) * ratio)
    }
    const sampleStart = Math.min(...intersections)
    const sampleEnd = Math.max(...intersections)
    return {
      outwardOffset: clean(outwardOffset),
      startOffset: clean(longitudinalOffset + sampleStart),
      endOffset: clean(longitudinalOffset + sampleEnd),
    }
  }).filter((sample) => Number.isFinite(sample.startOffset) && Number.isFinite(sample.endOffset))
  return {
    roadOpeningOffset: longitudinalOffset + (start + end) / 2,
    roadOpeningProfile,
    roadOpeningWidth: Math.max(0.1, end - start),
  }
}

/** Keep the road cutout aligned with the actual road-facing edge of a driveway. */
export function synchronizeRoadAttachmentOpening(
  network: RoadNetworkNode,
  attachment: RoadEdgeAttachment,
  node: RoadAttachmentPoseNode,
): RoadEdgeAttachment {
  const transform = resolveRoadAttachmentTransform(network, attachment, node)
  const edge = network.edges[attachment.edgeId]
  const crossSection = edge ? buildRoadCrossSection(roadStyleForEdge(network, edge)) : null
  const roadsideDepth = crossSection
    ? crossSection.sides[transform?.side ?? attachment.side ?? 'left'].outerOffset
      - crossSection.carriagewayWidth / 2
    : 0
  const opening = transform
    ? drivewayOpeningForPose(
        node,
        transform.rotation[1],
        transform.tangent,
        transform.side,
        roadsideDepth,
        attachment.longitudinalOffset ?? 0,
      )
    : null
  return opening ? { ...attachment, ...opening } : attachment
}

/** Convert an edited world pose back into an anchor on the same road network. */
export function reanchorRoadAttachment(
  network: RoadNetworkNode,
  attachment: RoadEdgeAttachment,
  node: RoadAttachmentPoseNode,
): RoadEdgeAttachment | null {
  const position = node.position
  if (!position) return null
  const kind = node.type as RoadAttachmentAssetKind
  const target = nearestEdgeTarget([network], position, kind, false)
  if (!target) return null
  const rotation = node.rotation ?? [0, 0, 0]
  const tangentRotationY = -Math.atan2(target.tangent[1], target.tangent[0])
  const provisional: RoadEdgeAttachment = {
    ...attachment,
    edgeId: target.edgeId,
    station: target.station,
    longitudinalOffset:
      (position[0] - target.point[0]) * target.tangent[0]
      + (position[2] - target.point[2]) * target.tangent[1],
    lateralOffset: target.lateralOffset,
    verticalOffset: 0,
    headingOffset: (rotation[1] ?? 0) - tangentRotationY,
    alignment: 'free',
    side: target.side,
    placementMode: 'adjusted',
  }
  const base = resolveRoadAttachmentTransform(network, provisional, node)
  if (!base) return null
  const reanchored = { ...provisional, verticalOffset: position[1] - base.position[1] }
  return synchronizeRoadAttachmentOpening(network, reanchored, node)
}

export function createRoadAttachmentForPlacement({
  assetNodeId,
  id,
  kind,
  node,
  networks,
  point,
}: {
  assetNodeId: string
  id: string
  kind: RoadAttachmentAssetKind
  node: StreetInfrastructureNode
  networks: readonly RoadNetworkNode[]
  point: readonly [number, number, number]
}): {
  attachment: RoadEdgeAttachment
  network: RoadNetworkNode
  target: RoadAttachmentTarget
  transform: RoadAttachmentTransform
} | null {
  const target = findRoadAttachmentTarget(networks, point, kind)
  if (!target) return null
  const alignment = attachmentAlignmentForKind(kind)
  const attachment = {
    id,
    edgeId: target.edgeId,
    assetNodeId,
    kind: 'asset' as const,
    station: target.station,
    lateralOffset: target.lateralOffset,
    verticalOffset: point[1] - target.point[1],
    roadOpeningWidth: kind === 'environment:driveway'
      ? resolveResidentialRoadAssetLayout(node as never).width
      : undefined,
    alignment,
    side: target.side,
    placementMode: 'adjusted' as const,
  }
  const transform = resolveRoadAttachmentTransform(target.network, attachment, node)
  if (!transform) return null
  return {
    attachment: synchronizeRoadAttachmentOpening(target.network, attachment, node),
    network: target.network,
    target,
    transform,
  }
}

/**
 * Use the nearest road only to resolve a helpful initial pose. The returned
 * node intentionally carries no persistent attachment, so ordinary move and
 * elevation edits remain authoritative after placement.
 */
export function resolveFreeRoadPlacement({
  assetNodeId,
  id,
  kind,
  node,
  networks,
  point,
}: {
  assetNodeId: string
  id: string
  kind: RoadAttachmentAssetKind
  node: StreetInfrastructureNode
  networks: readonly RoadNetworkNode[]
  point: readonly [number, number, number]
}): StreetInfrastructureNode {
  const attached = createRoadAttachmentForPlacement({
    assetNodeId,
    id,
    kind,
    node,
    networks,
    point,
  })
  return {
    ...node,
    ...(attached
      ? {
          position: attached.transform.position,
          rotation: attached.transform.rotation,
        }
      : null),
    roadAttachment: undefined,
  } as StreetInfrastructureNode
}

function signalSideForApproach(
  network: RoadNetworkNode,
  junctionAtEnd: boolean,
): RoadSide {
  const rightDriving = network.regionalPack !== 'left-driving'
  return rightDriving === junctionAtEnd ? 'right' : 'left'
}

function signalRotationForApproach(
  tangent: readonly [number, number],
  junctionAtEnd: boolean,
): number {
  const outward: [number, number] = junctionAtEnd
    ? [tangent[0], tangent[1]]
    : [-tangent[0], -tangent[1]]
  return Math.atan2(-outward[0], -outward[1])
}

function selectSparseSignalSupports(
  placements: readonly SignalJunctionPlacement[],
): SignalJunctionPlacement[] {
  if (placements.length <= 2) return [...placements]
  let best: readonly [SignalJunctionPlacement, SignalJunctionPlacement] | null = null
  let bestDistance = -1
  let bestKey = ''
  for (let firstIndex = 0; firstIndex < placements.length - 1; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < placements.length; secondIndex += 1) {
      const first = placements[firstIndex]!
      const second = placements[secondIndex]!
      const distance = Math.hypot(
        second.position[0] - first.position[0],
        second.position[2] - first.position[2],
      )
      const key = [first.edgeId, second.edgeId].sort().join(':')
      if (distance > bestDistance + 1e-6 || (Math.abs(distance - bestDistance) <= 1e-6 && key < bestKey)) {
        best = [first, second]
        bestDistance = distance
        bestKey = key
      }
    }
  }
  return best ? [...best] : placements.slice(0, 2)
}

/** Propose a sparse pair of editable mast-arm supports outside the junction surface. */
export function buildSignalJunctionPlacements(
  network: RoadNetworkNode,
  junctionId: string,
): SignalJunctionPlacement[] {
  const junction = network.junctions[junctionId]
  if (!junction) return []
  const edges = Object.values(network.edges)
    .filter((edge) => edge.startNodeId === junctionId || edge.endNodeId === junctionId)
    .sort((first, second) => first.id.localeCompare(second.id))
  const placements = edges.flatMap((edge) => {
    const junctionAtEnd = edge.endNodeId === junctionId
    const { length, points } = edgePathMetrics(network, edge)
    if (length < 1) return []
    const station = junctionAtEnd
      ? Math.max(0.5, length - Math.min(SIGNAL_SETBACK, length - 0.5))
      : Math.min(length - 0.5, Math.min(SIGNAL_SETBACK, length - 0.5))
    const sampled = pointAtStation(points, station)
    const side = signalSideForApproach(network, junctionAtEnd)
    const style = roadStyleForEdge(network, edge)
    const crossSection = buildRoadCrossSection(style)
    const verge = crossSection.sides[side].components.find((component) => component.kind === 'verge')
    const curb = crossSection.sides[side].components.find((component) => component.kind === 'curb')
    const lateral = verge
      ? Math.abs(verge.lateralOffset)
      : (curb?.outerOffset ?? crossSection.sides[side].outerOffset) + 0.6
    const signedLateral = sideSign(side) * lateral
    const leftNormal: [number, number] = [-sampled.tangent[1], sampled.tangent[0]]
    return [{
      edgeId: edge.id,
      lateralOffset: signedLateral,
      position: [
        sampled.point[0] + leftNormal[0] * signedLateral,
        sampled.point[1],
        sampled.point[2] + leftNormal[1] * signedLateral,
      ] as [number, number, number],
      rotationY: signalRotationForApproach(sampled.tangent, junctionAtEnd),
      side,
      station,
      tangent: sampled.tangent,
    }]
  })
  return selectSparseSignalSupports(placements)
}
