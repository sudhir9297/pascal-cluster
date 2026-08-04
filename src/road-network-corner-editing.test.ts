import { describe, expect, test } from 'bun:test'
import {
  buildRoadCurbCornerHandles,
  roadCurbCornerRadiusAtPlanPoint,
} from './road-network-corner-editing'
import { createEmptyRoadGraph, insertRoadSegment } from './road-network-topology'
import { RoadNetworkNode } from './schema'

function plusJunction(): RoadNetworkNode {
  const horizontal = insertRoadSegment(createEmptyRoadGraph(), [-10, 0, 0], [10, 0, 0])
  const plus = insertRoadSegment(horizontal.graph, [0, 0, -10], [0, 0, 10], {
    tolerance: 0.1,
  })
  return RoadNetworkNode.parse(plus.graph)
}

describe('individual road curb-return editing', () => {
  test('exposes one stable handle for each editable junction corner', () => {
    const node = plusJunction()
    const junctionId = Object.keys(node.junctions)[0]!
    const handles = buildRoadCurbCornerHandles(node, junctionId)

    expect(handles).toHaveLength(4)
    expect(new Set(handles.map((handle) => handle.cornerKey)).size).toBe(4)
    expect(handles.every((handle) => Number.isFinite(handle.point[0]))).toBe(true)
    expect(handles.every((handle) => Number.isFinite(handle.point[1]))).toBe(true)
  })

  test('omits the straight-through outside edge of a T junction', () => {
    const horizontal = insertRoadSegment(createEmptyRoadGraph(), [-10, 0, 0], [10, 0, 0])
    const tee = insertRoadSegment(horizontal.graph, [0, 0, -10], [0, 0, 0], {
      tolerance: 0.1,
    })
    const node = RoadNetworkNode.parse(tee.graph)
    const junctionId = Object.keys(node.junctions)[0]!

    expect(buildRoadCurbCornerHandles(node, junctionId)).toHaveLength(2)
  })

  test('maps a dragged handle back to only its target radius', () => {
    const node = plusJunction()
    const junctionId = Object.keys(node.junctions)[0]!
    const original = buildRoadCurbCornerHandles(node, junctionId)[0]!
    const targetRadius = 12
    const targetNode = RoadNetworkNode.parse({
      ...node,
      junctions: {
        ...node.junctions,
        [junctionId]: {
          ...node.junctions[junctionId]!,
          cornerRadii: {
            ...node.junctions[junctionId]!.cornerRadii,
            [original.cornerKey]: targetRadius,
          },
        },
      },
    })
    const targetPoint = buildRoadCurbCornerHandles(targetNode, junctionId)
      .find((handle) => handle.cornerKey === original.cornerKey)!.point

    expect(roadCurbCornerRadiusAtPlanPoint(
      node,
      junctionId,
      original.cornerKey,
      targetPoint,
    )).toBeCloseTo(targetRadius, 1)
    expect(Object.values(node.junctions[junctionId]!.cornerRadii)).not.toContain(targetRadius)
  })
})
