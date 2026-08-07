import { describe, expect, test } from 'bun:test'
import {
  buildRoadAutoInfrastructure,
  DEFAULT_ROAD_AUTO_INFRASTRUCTURE_SETTINGS,
  roadAutoInfrastructureAffectedEdgeIds,
  roadAutoInfrastructureNodeIdsToReplace,
  type RoadAutoInfrastructureSettings,
} from './road-auto-infrastructure'
import { applyRoadAutoInfrastructureClearances } from './road-auto-infrastructure-style'
import { createEmptyRoadGraph, insertRoadSegment } from './road-network-topology'
import { RoadNetworkNode } from './schema'

function straightRoad(length = 40) {
  const inserted = insertRoadSegment(createEmptyRoadGraph(), [0, 0, 0], [length, 0, 0])
  return {
    edgeIds: inserted.createdEdgeIds,
    network: RoadNetworkNode.parse({ ...inserted.graph, parentId: 'level_test' }),
  }
}

const ENABLED_ROAD_AUTO_INFRASTRUCTURE_SETTINGS: RoadAutoInfrastructureSettings = {
  enabled: true,
  items: {
    'environment:traffic-signal': true,
    'environment:drainage-inlet': true,
    'environment:manhole-cover': true,
    'environment:fire-hydrant': true,
    'environment:traffic-bollard': true,
    'environment:road-barrier': true,
  },
}

describe('automatic road infrastructure', () => {
  test('creates every enabled editable infrastructure kind for a new ground road', () => {
    const { edgeIds, network: sourceNetwork } = straightRoad()
    const activeStyle = sourceNetwork.stylePresets[sourceNetwork.activeStyleId]!
    const network = RoadNetworkNode.parse({
      ...sourceNetwork,
      stylePresets: {
        ...sourceNetwork.stylePresets,
        [sourceNetwork.activeStyleId]: applyRoadAutoInfrastructureClearances(
          activeStyle,
          ENABLED_ROAD_AUTO_INFRASTRUCTURE_SETTINGS,
        ),
      },
    })
    const nodes = buildRoadAutoInfrastructure({
      edgeIds,
      network,
      settings: ENABLED_ROAD_AUTO_INFRASTRUCTURE_SETTINGS,
    })

    expect(nodes.filter((node) => node.type === 'environment:drainage-inlet')).toHaveLength(2)
    expect(nodes.filter((node) => node.type === 'environment:manhole-cover')).toHaveLength(1)
    expect(nodes.filter((node) => node.type === 'environment:fire-hydrant')).toHaveLength(1)
    expect(nodes.filter((node) => node.type === 'environment:traffic-bollard')).toHaveLength(1)
    expect(nodes.filter((node) => node.type === 'environment:road-barrier')).toHaveLength(1)
    expect(nodes.some((node) => node.type === 'environment:traffic-signal')).toBe(false)
    expect(nodes.every((node) => node.parentId === 'level_test')).toBe(true)
    expect(nodes.every((node) => node.roadAttachment === undefined)).toBe(true)
    expect(
      nodes
        .filter((node) => node.type === 'environment:drainage-inlet')
        .every((node) => Math.abs(node.position[1] - 0.15) < 1e-6),
    ).toBe(true)
    expect(new Set(nodes.map((node) =>
      (node.metadata as Record<string, unknown>).roadAutoInfrastructureKey,
    )).size).toBe(nodes.length)
    const bollardStation = nodes.find((node) => node.type === 'environment:traffic-bollard')
      ?.metadata as Record<string, unknown>
    const barrierStation = nodes.find((node) => node.type === 'environment:road-barrier')
      ?.metadata as Record<string, unknown>
    const hydrant = nodes.find((node) => node.type === 'environment:fire-hydrant')!
    const barrier = nodes.find((node) => node.type === 'environment:road-barrier')!
    expect(bollardStation.roadStation).toBeCloseTo(12.8, 5)
    expect(barrierStation.roadStation).toBeCloseTo(27.2, 5)
    expect(Math.abs(barrier.position[2])).toBeCloseTo(Math.abs(hydrant.position[2]), 5)
  })

  test('adds two editable mast-arm signals at a new four-way intersection', () => {
    const horizontal = insertRoadSegment(createEmptyRoadGraph(), [-20, 0, 0], [20, 0, 0])
    const crossed = insertRoadSegment(horizontal.graph, [0, 0, -20], [0, 0, 20], {
      tolerance: 0.1,
    })
    const network = RoadNetworkNode.parse({ ...crossed.graph, parentId: 'level_test' })
    const nodes = buildRoadAutoInfrastructure({
      edgeIds: crossed.createdEdgeIds,
      network,
      settings: ENABLED_ROAD_AUTO_INFRASTRUCTURE_SETTINGS,
    })

    const signals = nodes.filter((node) => node.type === 'environment:traffic-signal')
    expect(signals).toHaveLength(2)
    expect(signals.every((node) => node.mount === 'mast-arm')).toBe(true)
    expect(signals.every((node) => node.headCount === 'two')).toBe(true)
    expect(signals.every((node) => node.roadAttachment === undefined)).toBe(true)
  })

  test('honors the master switch and every per-item switch', () => {
    const { edgeIds, network } = straightRoad()
    expect(buildRoadAutoInfrastructure({
      edgeIds,
      network,
      settings: { ...DEFAULT_ROAD_AUTO_INFRASTRUCTURE_SETTINGS, enabled: false },
    })).toEqual([])

    const settings: RoadAutoInfrastructureSettings = {
      enabled: true,
      items: {
        'environment:traffic-signal': false,
        'environment:drainage-inlet': false,
        'environment:manhole-cover': true,
        'environment:fire-hydrant': false,
        'environment:traffic-bollard': false,
        'environment:road-barrier': false,
      },
    }
    const nodes = buildRoadAutoInfrastructure({ edgeIds, network, settings })
    expect(nodes.map((node) => node.type)).toEqual(['environment:manhole-cover'])
  })

  test('honors per-road visibility overrides', () => {
    const { edgeIds, network: sourceNetwork } = straightRoad()
    const network = RoadNetworkNode.parse({
      ...sourceNetwork,
      roadsideItemVisibility: { 'environment:manhole-cover': false },
    })
    const nodes = buildRoadAutoInfrastructure({
      edgeIds,
      network,
      settings: ENABLED_ROAD_AUTO_INFRASTRUCTURE_SETTINGS,
    })

    expect(nodes.some((node) => node.type === 'environment:fire-hydrant')).toBe(true)
    expect(nodes.filter((node) => node.type === 'environment:manhole-cover')).toHaveLength(1)
    expect(nodes.find((node) => node.type === 'environment:manhole-cover')?.visible).toBe(false)
  })

  test('does not recreate infrastructure that was already generated for an edge', () => {
    const { edgeIds, network } = straightRoad()
    const first = buildRoadAutoInfrastructure({
      edgeIds,
      network,
      settings: ENABLED_ROAD_AUTO_INFRASTRUCTURE_SETTINGS,
    })
    const second = buildRoadAutoInfrastructure({
      edgeIds,
      existingNodes: first,
      network,
      settings: ENABLED_ROAD_AUTO_INFRASTRUCTURE_SETTINGS,
    })

    expect(first.length).toBeGreaterThan(0)
    expect(second).toEqual([])
  })

  test('rebuilds untouched automatic items around a new junction but preserves moved items', () => {
    const horizontal = insertRoadSegment(createEmptyRoadGraph(), [-20, 0, 0], [20, 0, 0])
    const originalNetwork = RoadNetworkNode.parse({ ...horizontal.graph, parentId: 'level_test' })
    const original = buildRoadAutoInfrastructure({
      edgeIds: horizontal.createdEdgeIds,
      network: originalNetwork,
      settings: ENABLED_ROAD_AUTO_INFRASTRUCTURE_SETTINGS,
    })
    const crossed = insertRoadSegment(horizontal.graph, [0, 0, -20], [0, 0, 20], { tolerance: 0.1 })
    const network = RoadNetworkNode.parse({
      ...crossed.graph,
      id: originalNetwork.id,
      parentId: 'level_test',
    })
    const affectedEdgeIds = roadAutoInfrastructureAffectedEdgeIds(network, crossed.createdEdgeIds)
    const moved = { ...original[0]!, position: [99, 3, 99] as [number, number, number] }
    const replace = roadAutoInfrastructureNodeIdsToReplace({
      edgeIds: affectedEdgeIds,
      existingNodes: [moved, ...original.slice(1)],
      network,
    })

    expect(affectedEdgeIds).toHaveLength(4)
    expect(replace).not.toContain(moved.id)
    expect(replace.sort()).toEqual(original.slice(1).map((node) => node.id).sort())
  })
})
