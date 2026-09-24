import { describe, expect, test } from 'bun:test'
import { insertRoadSegment, createEmptyRoadGraph } from './road-network-topology'
import {
  exportRoadNetworkGraph,
  importRoadNetworkGraph,
  ROAD_NETWORK_EXCHANGE_FORMAT,
  ROAD_NETWORK_EXCHANGE_VERSION,
} from './road-network-io'
import { RoadNetworkNode } from './schema'

function sampleNetwork() {
  const result = insertRoadSegment(createEmptyRoadGraph(), [0, 0, 0], [12, 0, 0])
  if (result.status !== 'inserted') throw new Error('Expected sample road insertion')
  return RoadNetworkNode.parse({
    parentId: 'level:test',
    ...result.graph,
  })
}

describe('semantic road-network exchange', () => {
  test('round-trips graph semantics without leaking scene identity', () => {
    const network = sampleNetwork()
    network.stylePresets = { 'local-street': network.stylePresets['local-street']! }
    network.activeStyleId = 'arterial'
		network.regionalPack = 'left-driving'
		network.embankmentSlope = 2.75
		network.excavationSlope = 1.1
		network.roadsideDecorationSpacing = 42
    network.roadsideLampsBothSides = true
    network.bridgeDeckThickness = 0.8
    network.bridgeBarrierHeight = 1.2
    network.bridgePierSpacing = 24
    network.bridgePierDiameter = 1.4
    network.bridgeMinimumClearance = 5
    const exported = exportRoadNetworkGraph(network)
    const envelope = JSON.parse(exported)
    const imported = importRoadNetworkGraph(exported)

    expect(envelope.format).toBe(ROAD_NETWORK_EXCHANGE_FORMAT)
    expect(envelope.version).toBe(ROAD_NETWORK_EXCHANGE_VERSION)
    expect(envelope.graph.id).toBeUndefined()
    expect(envelope.graph.parentId).toBeUndefined()
    expect(envelope.graph.stylePresets.arterial).toBeDefined()
    expect(imported.graphNodes).toEqual(network.graphNodes)
    expect(imported.edges).toEqual(network.edges)
    expect(imported.stylePresets['local-street']).toEqual(network.stylePresets['local-street'])
    expect(imported.stylePresets.arterial).toBeDefined()
    expect(imported).toMatchObject({
			regionalPack: 'left-driving',
			embankmentSlope: 2.75,
			excavationSlope: 1.1,
			roadsideDecorationSpacing: 42,
			roadsideLampsBothSides: true,
      bridgeDeckThickness: 0.8,
      bridgeBarrierHeight: 1.2,
      bridgePierSpacing: 24,
      bridgePierDiameter: 1.4,
      bridgeMinimumClearance: 5,
    })
  })

  test('rejects unrelated, malformed, and topologically invalid payloads', () => {
    expect(() => importRoadNetworkGraph('not json')).toThrow('valid road-network JSON')
    expect(() => importRoadNetworkGraph('{}')).toThrow('supported Pascal road-network')

    const envelope = JSON.parse(exportRoadNetworkGraph(sampleNetwork()))
    const edge = Object.values(envelope.graph.edges)[0] as { endNodeId: string }
    edge.endNodeId = 'missing-node'
    expect(() => importRoadNetworkGraph(JSON.stringify(envelope))).toThrow('missing endpoint')
  })
})
