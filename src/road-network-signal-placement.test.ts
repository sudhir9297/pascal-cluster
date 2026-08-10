import { afterEach, describe, expect, test } from 'bun:test'
import { roadNetworkDefinition } from './road-network-definition'
import { createEmptyRoadGraph, insertRoadSegment } from './road-network-topology'
import { RoadNetworkNode } from './schema'
import { useStreetscapeStore } from './store'

describe('road signal junction action', () => {
  afterEach(() => useStreetscapeStore.getState().setRoadElementSelection(null))

  test('creates editable signal nodes and matching attachment records once', () => {
    const horizontal = insertRoadSegment(createEmptyRoadGraph(), [-12, 0, 0], [12, 0, 0])
    const plus = insertRoadSegment(horizontal.graph, [0, 0, -12], [0, 0, 12], { tolerance: 0.1 })
    const junctionId = Object.keys(plus.graph.junctions)[0]!
    const road = RoadNetworkNode.parse({
      ...plus.graph,
      parentId: 'level_1',
      junctions: {
        ...plus.graph.junctions,
        [junctionId]: {
          ...plus.graph.junctions[junctionId]!,
          treatment: 'signal',
        },
      },
    })
    useStreetscapeStore.getState().setRoadElementSelection({
      networkId: road.id,
      kind: 'junction',
      id: junctionId,
    })
    const created: any[] = []
    let patch: any = null
    const sceneApi = {
      nodes: () => ({ [road.id]: road }),
      upsert: (node: any) => {
        created.push(node)
        return node.id
      },
      update: (_id: string, next: any) => {
        patch = next
      },
    }
    const actions = (roadNetworkDefinition.quickActions as any)({ node: road })
    const action = actions.find((candidate: any) => candidate.id === 'road:place-signal-assets')

    expect(action).toBeDefined()
    action.run({ node: road, sceneApi })

    expect(created).toHaveLength(2)
    expect(created.every((node) => node.type === 'streetscape:traffic-signal')).toBe(true)
    expect(created.every((node) => node.mount === 'mast-arm')).toBe(true)
    expect(created.every((node) => node.headCount === 'two')).toBe(true)
    expect(created.every((node) => node.roadAttachment?.networkNodeId === road.id)).toBe(true)
    expect(Object.keys(patch.attachments)).toHaveLength(2)
    expect(Object.values(patch.attachments).every((attachment: any) => attachment.junctionId === junctionId)).toBe(true)
  })
})
