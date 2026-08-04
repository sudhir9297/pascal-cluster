import { describe, expect, test } from 'bun:test'
import { moveRoadSplinePoint } from './road-network-spline-handles'
import { createEmptyRoadGraph, insertRoadSegment } from './road-network-topology'
import { RoadNetworkNode } from './schema'

describe('road spline point editing', () => {
  test('moves only the selected authored point and preserves its elevation', () => {
    const result = insertRoadSegment(createEmptyRoadGraph(), [0, 0, 0], [12, 0, 0], {
      alignment: [[4, 1, 3], [8, 2, 4]],
    })
    const node = RoadNetworkNode.parse(result.graph)
    const edge = Object.values(node.edges)[0]!

    const patch = moveRoadSplinePoint(node, edge.id, 0, [5, 99, 7])

    expect(patch?.edges[edge.id]?.alignment).toEqual([
      [5, 1, 7],
      [8, 2, 4],
    ])
    expect(node.edges[edge.id]?.alignment).toEqual([
      [4, 1, 3],
      [8, 2, 4],
    ])
  })

  test('rejects a missing edge or point index', () => {
    const node = RoadNetworkNode.parse(createEmptyRoadGraph())
    expect(moveRoadSplinePoint(node, 'missing', 0, [1, 0, 1])).toBeNull()
  })
})
