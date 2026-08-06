import { buildSignalJunctionPlacements, resolveRoadAttachmentTransform } from './road-edge-attachments'
export {
  DEFAULT_ROAD_AUTO_INFRASTRUCTURE_SETTINGS,
  type RoadAutoInfrastructureSettings,
} from './road-auto-infrastructure-settings'
import type { RoadAutoInfrastructureSettings } from './road-auto-infrastructure-settings'
import { sampleRoadEdgePoints } from './road-network-geometry'
import type { RoadGraphEdge, RoadNetworkNode } from './schema'
import {
  parseStreetInfrastructure,
  type StreetInfrastructureKind,
  type StreetInfrastructureNode,
} from './street-infrastructure-config'

const MINIMUM_EDGE_LENGTH = 6
const DRAINAGE_SPACING = 20
const MANHOLE_SPACING = 35
const HYDRANT_SPACING = 60
const BOLLARD_SPACING = 25
const BARRIER_SPACING = 80

type ExistingNode = {
  id?: string
  position?: unknown
  rotation?: unknown
  metadata?: unknown
}

const INITIAL_POSITION_KEY = 'roadAutoInfrastructureInitialPosition'
const INITIAL_ROTATION_KEY = 'roadAutoInfrastructureInitialRotation'

function sampledLength(points: readonly (readonly [number, number, number])[]): number {
  let length = 0
  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index]!
    const to = points[index + 1]!
    length += Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2])
  }
  return length
}

function centeredStations(length: number, spacing: number): number[] {
  if (length < MINIMUM_EDGE_LENGTH) return []
  const count = Math.max(1, Math.floor(length / spacing))
  return Array.from({ length: count }, (_, index) => length * (index + 1) / (count + 1))
}

function separatedStations(length: number, spacing: number, singletonFraction: number): number[] {
  const stations = centeredStations(length, spacing)
  return stations.length === 1 ? [length * singletonFraction] : stations
}

function generatedKey(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null
  const key = (metadata as Record<string, unknown>).roadAutoInfrastructureKey
  return typeof key === 'string' ? key : null
}

function metadataRecord(metadata: unknown): Record<string, unknown> | null {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? metadata as Record<string, unknown>
    : null
}

function equalPosePart(current: unknown, initial: unknown): boolean {
  if (!Array.isArray(current) || !Array.isArray(initial) || current.length !== initial.length) return false
  return current.every((value, index) => (
    typeof value === 'number' &&
    typeof initial[index] === 'number' &&
    Math.abs(value - initial[index]) < 1e-5
  ))
}

function infrastructureKey(
  kind: StreetInfrastructureKind,
  ownerId: string,
  stationOrApproach: string,
  side?: 'left' | 'right',
): string {
  return ['road-auto', kind, ownerId, stationOrApproach, side].filter(Boolean).join(':')
}

function freeNodeAtStation({
  edge,
  kind,
  network,
  side,
  station,
}: {
  edge: RoadGraphEdge
  kind: Exclude<StreetInfrastructureKind, 'environment:traffic-signal'>
  network: RoadNetworkNode
  side: 'left' | 'right'
  station: number
}): StreetInfrastructureNode | null {
  const key = infrastructureKey(kind, edge.id, station.toFixed(2), side)
  const node = parseStreetInfrastructure(kind, {
    parentId: network.parentId,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    metadata: {
      generatedBy: 'road-auto-infrastructure',
      roadAutoInfrastructureKey: key,
      roadEdgeId: edge.id,
      roadNetworkId: network.id,
      roadStation: station,
    },
  })
  const alignment = kind === 'environment:drainage-inlet'
    ? 'gutter'
    : kind === 'environment:manhole-cover'
      ? 'carriageway'
      : 'curb'
  const lateralOffset = kind === 'environment:manhole-cover'
    ? 0
    : side === 'left' ? 1 : -1
  const transform = resolveRoadAttachmentTransform(
    network,
    {
      id: `${node.id}:auto-road-pose`,
      edgeId: edge.id,
      assetNodeId: node.id,
      kind: 'asset',
      station,
      lateralOffset,
      verticalOffset: 0,
      alignment,
      side,
    },
    node,
  )
  if (!transform) return null
  return parseStreetInfrastructure(kind, {
    ...node,
    position: transform.position,
    rotation: transform.rotation,
    metadata: {
      ...metadataRecord(node.metadata),
      [INITIAL_POSITION_KEY]: transform.position,
      [INITIAL_ROTATION_KEY]: transform.rotation,
    },
    roadAttachment: undefined,
  })
}

function touchedJunctionIds(network: RoadNetworkNode, edgeIds: readonly string[]): string[] {
  const ids = new Set<string>()
  for (const edgeId of edgeIds) {
    const edge = network.edges[edgeId]
    if (!edge) continue
    if (network.junctions[edge.startNodeId]) ids.add(edge.startNodeId)
    if (network.junctions[edge.endNodeId]) ids.add(edge.endNodeId)
  }
  return [...ids].sort()
}

export function roadAutoInfrastructureAffectedEdgeIds(
  network: RoadNetworkNode,
  edgeIds: readonly string[],
): string[] {
  const result = new Set(edgeIds.filter((edgeId) => edgeId in network.edges))
  const junctionIds = new Set(touchedJunctionIds(network, edgeIds))
  for (const edge of Object.values(network.edges)) {
    if (junctionIds.has(edge.startNodeId) || junctionIds.has(edge.endNodeId)) result.add(edge.id)
  }
  return [...result].sort()
}

export function roadAutoInfrastructureNodeIdsToReplace({
  edgeIds,
  existingNodes,
  network,
}: {
  edgeIds: readonly string[]
  existingNodes: readonly ExistingNode[]
  network: RoadNetworkNode
}): string[] {
  const affectedEdgeIds = new Set(edgeIds)
  return existingNodes.flatMap((node) => {
    const metadata = metadataRecord(node.metadata)
    if (!node.id || metadata?.generatedBy !== 'road-auto-infrastructure') return []
    if (metadata.roadNetworkId !== network.id) return []
    const edgeId = metadata.roadEdgeId
    if (typeof edgeId !== 'string') return []
    if (!affectedEdgeIds.has(edgeId) && edgeId in network.edges) return []
    if (!equalPosePart(node.position, metadata[INITIAL_POSITION_KEY])) return []
    if (!equalPosePart(node.rotation, metadata[INITIAL_ROTATION_KEY])) return []
    return [node.id]
  })
}

export function buildRoadAutoInfrastructure({
  edgeIds,
  existingNodes = [],
  network,
  settings,
}: {
  edgeIds: readonly string[]
  existingNodes?: readonly ExistingNode[]
  network: RoadNetworkNode
  settings: RoadAutoInfrastructureSettings
}): StreetInfrastructureNode[] {
  if (!settings.enabled) return []
  const existingKeys = new Set(existingNodes.flatMap((node) => {
    const key = generatedKey(node.metadata)
    return key ? [key] : []
  }))
  const createdKeys = new Set<string>()
  const result: StreetInfrastructureNode[] = []
  const add = (node: StreetInfrastructureNode | null) => {
    if (!node) return
    const key = generatedKey(node.metadata)
    if (!key || existingKeys.has(key) || createdKeys.has(key)) return
    createdKeys.add(key)
    result.push(node)
  }

  for (const edgeId of [...edgeIds].sort()) {
    const edge = network.edges[edgeId]
    if (!edge || edge.stackLevel !== 0) continue
    const length = sampledLength(sampleRoadEdgePoints(network, edge, 48))
    if (settings.items['environment:drainage-inlet']) {
      for (const [index, station] of centeredStations(length, DRAINAGE_SPACING).entries()) {
        add(freeNodeAtStation({
          edge,
          kind: 'environment:drainage-inlet',
          network,
          side: index % 2 === 0 ? 'left' : 'right',
          station,
        }))
      }
    }
    if (settings.items['environment:manhole-cover']) {
      for (const station of centeredStations(length, MANHOLE_SPACING)) {
        add(freeNodeAtStation({
          edge,
          kind: 'environment:manhole-cover',
          network,
          side: 'left',
          station,
        }))
      }
    }
    if (settings.items['environment:fire-hydrant']) {
      for (const station of centeredStations(length, HYDRANT_SPACING)) {
        add(freeNodeAtStation({
          edge,
          kind: 'environment:fire-hydrant',
          network,
          side: 'right',
          station,
        }))
      }
    }
    if (settings.items['environment:traffic-bollard']) {
      for (const [index, station] of separatedStations(length, BOLLARD_SPACING, 0.32).entries()) {
        add(freeNodeAtStation({
          edge,
          kind: 'environment:traffic-bollard',
          network,
          side: index % 2 === 0 ? 'left' : 'right',
          station,
        }))
      }
    }
    if (settings.items['environment:road-barrier']) {
      for (const station of separatedStations(length, BARRIER_SPACING, 0.68)) {
        add(freeNodeAtStation({
          edge,
          kind: 'environment:road-barrier',
          network,
          side: 'left',
          station,
        }))
      }
    }
  }

  if (settings.items['environment:traffic-signal']) {
    for (const junctionId of touchedJunctionIds(network, edgeIds)) {
      for (const placement of buildSignalJunctionPlacements(network, junctionId)) {
        const kind = 'environment:traffic-signal' as const
        const key = infrastructureKey(kind, junctionId, placement.edgeId, placement.side)
        const position = placement.position
        const rotation: [number, number, number] = [0, placement.rotationY, 0]
        add(parseStreetInfrastructure(kind, {
          parentId: network.parentId,
          position,
          rotation,
          mount: 'mast-arm',
          headCount: 'two',
          signalState: 'red',
          cabinet: false,
          streetNameSign: false,
          metadata: {
            generatedBy: 'road-auto-infrastructure',
            roadAutoInfrastructureKey: key,
            roadEdgeId: placement.edgeId,
            roadJunctionId: junctionId,
            roadNetworkId: network.id,
            roadStation: placement.station,
            [INITIAL_POSITION_KEY]: position,
            [INITIAL_ROTATION_KEY]: rotation,
          },
        }))
      }
    }
  }

  return result
}
