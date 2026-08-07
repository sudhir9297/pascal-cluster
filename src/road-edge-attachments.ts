import type {
  RoadAttachmentAlignment,
  RoadEdgeAttachment,
  RoadGraphEdge,
  RoadNetworkNode,
  RoadStylePreset,
} from './schema'
import type { StreetInfrastructureNode } from './street-infrastructure-config'
import { buildRoadCrossSection, type RoadSide } from './road-cross-section'
import { sampleRoadEdgePoints } from './road-network-geometry'
import { DEFAULT_ROAD_STYLE_PRESETS } from './road-style-presets'
import { projectRoadPointToEdge } from './road-network-topology'
import {
  resolveRoadBarrierLayout,
  resolveTrafficBollardLayout,
  resolveFireHydrantLayout,
  resolveManholeCoverLayout,
  resolveResidentialRoadAssetLayout,
} from './street-infrastructure-geometry'

export type RoadAttachmentAssetKind =
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

export type RoadAttachmentTransform = {
  position: [number, number, number]
  rotation: [number, number, number]
  tangent: [number, number]
  side: RoadSide
}

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
      if (projection.distance > maxDistance) continue
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
  node: StreetInfrastructureNode,
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
  const residentialLayout = node.type.startsWith('environment:') &&
    !['environment:traffic-signal', 'environment:drainage-inlet', 'environment:manhole-cover', 'environment:fire-hydrant', 'environment:traffic-bollard', 'environment:road-barrier'].includes(node.type)
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
    sampled.point[0] + leftNormal[0] * lateralOffset,
    baseY,
    sampled.point[2] + leftNormal[1] * lateralOffset,
  ]
  const currentRotation = node.rotation ?? [0, 0, 0]
  let rotationY = currentRotation[1] ?? 0
  if (alignment === 'gutter') {
    rotationY = -Math.atan2(sampled.tangent[1], sampled.tangent[0])
      + (side === 'right' ? Math.PI : 0)
  } else if (alignment === 'curb' && node.type === 'environment:fire-hydrant') {
    rotationY = -Math.atan2(sampled.tangent[1], sampled.tangent[0]) + (side === 'right' ? Math.PI : 0)
  } else if (alignment === 'curb' && node.type === 'environment:road-barrier') {
    rotationY = -Math.atan2(sampled.tangent[1], sampled.tangent[0])
  } else if (alignment === 'curb' && residentialLayout) {
    rotationY = -Math.atan2(sampled.tangent[1], sampled.tangent[0]) + (side === 'right' ? Math.PI : 0)
  } else if (alignment === 'carriageway' && residentialLayout) {
    rotationY = -Math.atan2(sampled.tangent[1], sampled.tangent[0])
  }
  return {
    position,
    rotation: [currentRotation[0] ?? 0, rotationY, currentRotation[2] ?? 0],
    tangent: sampled.tangent,
    side,
  }
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
    alignment,
    side: target.side,
  }
  const transform = resolveRoadAttachmentTransform(target.network, attachment, node)
  if (!transform) return null
  return { attachment, network: target.network, target, transform }
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
