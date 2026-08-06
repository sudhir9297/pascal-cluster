import { describe, expect, test } from 'bun:test'
import {
  buildSignalJunctionPlacements,
  createRoadAttachmentForPlacement,
  findRoadAttachmentTarget,
  resolveFreeRoadPlacement,
  resolveRoadAttachmentTransform,
} from './road-edge-attachments'
import {
  createEmptyRoadGraph,
  insertRoadSegment,
} from './road-network-topology'
import {
  DrainageInletNode,
  FireHydrantNode,
  ManholeCoverNode,
  RoadNetworkNode,
  TrafficSignalNode,
} from './schema'
import {
  resolveDrainageInletLayout,
  resolveManholeCoverLayout,
} from './street-infrastructure-geometry'

function straightRoad() {
  const result = insertRoadSegment(createEmptyRoadGraph(), [-10, 0, 0], [10, 0, 0])
  return RoadNetworkNode.parse(result.graph)
}

describe('road-edge infrastructure attachments', () => {
  test('captures a drainage placement and resolves it to the selected gutter', () => {
    const road = straightRoad()
    const candidate = findRoadAttachmentTarget(
      [road],
      [0, 0, 3],
      'environment:drainage-inlet',
    )

    expect(candidate?.side).toBe('left')
    expect(candidate?.edgeId).toBeDefined()

    const attached = createRoadAttachmentForPlacement({
      assetNodeId: 'drainage-inlet_1',
      id: 'drainage-inlet_1:road',
      kind: 'environment:drainage-inlet',
      node: DrainageInletNode.parse({ position: [0, 0, 3] }),
      networks: [road],
      point: [0, 0, 3],
    })

    expect(attached).not.toBeNull()
    expect(attached?.attachment.alignment).toBe('gutter')
    expect(attached?.transform.position[2]).toBeCloseTo(3.925, 2)
    // Keep the complete assembly visibly seated above the road, matching the
    // same elevation a user would otherwise have to enter by hand.
    expect(attached?.transform.position[1]).toBeCloseTo(0.15, 3)
    const drainageLayout = resolveDrainageInletLayout(DrainageInletNode.parse({}))
    expect(attached!.transform.position[1] + drainageLayout.barBottomY).toBeGreaterThan(0.15)
    expect(attached?.transform.rotation[1]).toBeCloseTo(0, 5)
  })

  test('keeps attached manholes inside the carriageway with a cover clearance', () => {
    const road = straightRoad()
    const attachment = {
      id: 'manhole:road',
      edgeId: Object.keys(road.edges)[0]!,
      assetNodeId: 'manhole-cover_1',
      kind: 'asset' as const,
      station: 12,
      lateralOffset: -4.9,
      verticalOffset: 0,
      alignment: 'carriageway' as const,
      side: 'right' as const,
    }
    const transform = resolveRoadAttachmentTransform(
      road,
      attachment,
      ManholeCoverNode.parse({ position: [0, 0, 0], rotation: [0.1, 0.2, 0.3] }),
    )

    expect(transform).not.toBeNull()
    expect(transform?.position[0]).toBeCloseTo(2, 2)
    expect(transform?.position[2]).toBeCloseTo(-3.28, 2)
    expect(transform?.position[1]).toBeCloseTo(0.07, 3)
    const manholeLayout = resolveManholeCoverLayout(ManholeCoverNode.parse({}))
    expect(
      transform!.position[1]
        + manholeLayout.coverTopY,
    ).toBeCloseTo(0.146, 3)
    expect(transform!.position[1] + manholeLayout.treadBottomY).toBeGreaterThan(0.146)
    expect(transform?.rotation).toEqual([0.1, 0.2, 0.3])
  })

  test('turns curb-facing hydrants toward the selected curb side', () => {
    const road = straightRoad()
    const edgeId = Object.keys(road.edges)[0]!
    const attachment = {
      id: 'hydrant:road',
      edgeId,
      assetNodeId: 'fire-hydrant_1',
      kind: 'asset' as const,
      station: 8,
      lateralOffset: -4.8,
      verticalOffset: 0,
      alignment: 'curb' as const,
      side: 'right' as const,
    }
    const transform = resolveRoadAttachmentTransform(
      road,
      attachment,
      FireHydrantNode.parse({ position: [0, 0, 0], rotation: [0, 0, 0] }),
    )

    expect(transform?.side).toBe('right')
    expect(transform?.position[2]).toBeCloseTo(-4.46, 2)
    expect(transform?.position[1]).toBeCloseTo(0.206, 3)
    expect(transform?.rotation[1]).toBeCloseTo(Math.PI, 5)
  })

  test('seats a freely placed traffic signal on the rendered carriageway surface', () => {
    const road = straightRoad()
    const attached = createRoadAttachmentForPlacement({
      assetNodeId: 'traffic-signal_1',
      id: 'traffic-signal_1:road',
      kind: 'environment:traffic-signal',
      node: TrafficSignalNode.parse({ position: [0, 0, 0] }),
      networks: [road],
      point: [0, 0, 0],
    })

    expect(attached).not.toBeNull()
    expect(attached?.transform.position[1]).toBeCloseTo(0.146, 3)
  })

  test('uses road snapping only for the initial pose and leaves the placed node free', () => {
    const road = straightRoad()
    const node = ManholeCoverNode.parse({
      position: [0, 0, 3],
      roadAttachment: {
        networkNodeId: road.id,
        attachmentId: 'legacy:road',
        side: 'left',
      },
    })
    const placed = resolveFreeRoadPlacement({
      assetNodeId: node.id,
      id: `${node.id}:road`,
      kind: 'environment:manhole-cover',
      node,
      networks: [road],
      point: node.position,
    })

    expect(placed.position[1]).toBeCloseTo(0.07, 3)
    expect(placed.roadAttachment).toBeUndefined()
    expect(road.attachments).toEqual({})
  })

  test('keeps a free drainage inlet seated at the road and facing its selected curb', () => {
    const road = straightRoad()
    const left = resolveFreeRoadPlacement({
      assetNodeId: 'drainage-inlet_left',
      id: 'drainage-inlet_left:road',
      kind: 'environment:drainage-inlet',
      node: DrainageInletNode.parse({ position: [0, 0, 3] }),
      networks: [road],
      point: [0, 0, 3],
    })
    const right = resolveFreeRoadPlacement({
      assetNodeId: 'drainage-inlet_right',
      id: 'drainage-inlet_right:road',
      kind: 'environment:drainage-inlet',
      node: DrainageInletNode.parse({ position: [0, 0, -3] }),
      networks: [road],
      point: [0, 0, -3],
    })

    expect(left.position[1]).toBeCloseTo(0.15, 3)
    expect(left.rotation[1]).toBeCloseTo(0, 5)
    expect(left.roadAttachment).toBeUndefined()
    expect(right.position[1]).toBeCloseTo(0.15, 3)
    expect(Math.abs(right.rotation[1])).toBeCloseTo(Math.PI, 5)
    expect(right.roadAttachment).toBeUndefined()
  })

  test('proposes one editable signal per approach of a signalized junction', () => {
    const horizontal = insertRoadSegment(createEmptyRoadGraph(), [-12, 0, 0], [12, 0, 0])
    const plus = insertRoadSegment(horizontal.graph, [0, 0, -12], [0, 0, 12], { tolerance: 0.1 })
    const road = RoadNetworkNode.parse(plus.graph)
    const junctionId = Object.keys(road.junctions)[0]!
    const placements = buildSignalJunctionPlacements(road, junctionId)

    expect(placements).toHaveLength(4)
    expect(new Set(placements.map((placement) => placement.edgeId)).size).toBe(4)
    expect(placements.every((placement) => Number.isFinite(placement.rotationY))).toBe(true)
    expect(placements.every((placement) => placement.station > 0)).toBe(true)
  })
})
