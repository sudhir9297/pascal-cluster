import { describe, expect, test } from 'bun:test'
import {
  buildSignalJunctionPlacements,
  createRoadAttachmentForPlacement,
  findRoadAttachmentTarget,
  reanchorRoadAttachment,
  resolveFreeRoadPlacement,
  resolveRoadAttachmentTransform,
  synchronizeRoadAttachmentOpening,
} from './road-edge-attachments'
import {
  createEmptyRoadGraph,
  insertRoadSegment,
} from './road-network-topology'
import {
  DrainageInletNode,
  DrivewayNode,
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

  test('snaps either end of a driveway flush to the carriageway edge', () => {
    const road = straightRoad()
    const driveway = DrivewayNode.parse({ length: 5.5 })
    const left = createRoadAttachmentForPlacement({
      assetNodeId: 'driveway_left',
      id: 'driveway_left:road',
      kind: 'environment:driveway',
      node: driveway,
      networks: [road],
      point: [0, 0, 5],
    })
    const right = createRoadAttachmentForPlacement({
      assetNodeId: 'driveway_right',
      id: 'driveway_right:road',
      kind: 'environment:driveway',
      node: driveway,
      networks: [road],
      point: [0, 0, -5],
    })

    expect(left).not.toBeNull()
    expect(right).not.toBeNull()
    expect(left!.attachment.roadOpeningWidth).toBe(driveway.width)
    expect(right!.attachment.roadOpeningWidth).toBe(driveway.width)
    // The default local street has a 7.5 m carriageway. Each road-facing
    // driveway edge should land exactly on its 3.75 m half-width, regardless
    // of where inside the capture zone the user clicked.
    expect(left!.transform.position[2] - driveway.length / 2).toBeCloseTo(3.75, 5)
    expect(right!.transform.position[2] + driveway.length / 2).toBeCloseTo(-3.75, 5)
    expect(left!.transform.position[1]).toBeCloseTo(0, 5)
    expect(right!.transform.position[1]).toBeCloseTo(0, 5)
    expect(left!.transform.rotation[1]).toBeCloseTo(0, 5)
    expect(Math.abs(right!.transform.rotation[1])).toBeCloseTo(Math.PI, 5)
  })

  test('centers curved-left and curved-right road openings on their shifted mouths', () => {
    const road = straightRoad()
    const curvedLeft = createRoadAttachmentForPlacement({
      assetNodeId: 'driveway_curve_left',
      id: 'driveway_curve_left:road',
      kind: 'environment:driveway',
      node: DrivewayNode.parse({ drivewayShape: 'curved-left', curveAmount: 2.5 }),
      networks: [road],
      point: [0, 0, 5],
    })
    const curvedRight = createRoadAttachmentForPlacement({
      assetNodeId: 'driveway_curve_right',
      id: 'driveway_curve_right:road',
      kind: 'environment:driveway',
      node: DrivewayNode.parse({ drivewayShape: 'curved-right', curveAmount: 2.5 }),
      networks: [road],
      point: [0, 0, 5],
    })
    const curvedLeftOnRightSide = createRoadAttachmentForPlacement({
      assetNodeId: 'driveway_curve_left_right_side',
      id: 'driveway_curve_left_right_side:road',
      kind: 'environment:driveway',
      node: DrivewayNode.parse({ drivewayShape: 'curved-left', curveAmount: 2.5 }),
      networks: [road],
      point: [0, 0, -5],
    })

    expect(curvedLeft).not.toBeNull()
    expect(curvedRight).not.toBeNull()
    expect(curvedLeftOnRightSide).not.toBeNull()
    // Curved driveways keep shifting while they cross the gutter, curb, verge,
    // and sidewalk. The opening must cover that complete roadside corridor,
    // not only the 3.2 m mouth at the carriageway edge.
    expect(curvedLeft!.attachment.roadOpeningOffset).toBeCloseTo(1.132808, 5)
    expect(curvedRight!.attachment.roadOpeningOffset).toBeCloseTo(-1.132808, 5)
    expect(curvedLeftOnRightSide!.attachment.roadOpeningOffset).toBeCloseTo(-1.132808, 5)
    expect(curvedLeft!.attachment.roadOpeningWidth).toBeCloseTo(3.434384, 5)
    expect(curvedRight!.attachment.roadOpeningWidth).toBeCloseTo(3.434384, 5)
    const leftProfile = curvedLeft!.attachment.roadOpeningProfile
    const rightProfile = curvedRight!.attachment.roadOpeningProfile
    expect(leftProfile?.length).toBeGreaterThan(8)
    expect(rightProfile?.length).toBeGreaterThan(8)
    expect(leftProfile?.[0]).toEqual({
      outwardOffset: 0,
      startOffset: -0.35,
      endOffset: 2.85,
    })
    expect(leftProfile?.at(-1)?.startOffset).toBeCloseTo(-0.584384, 5)
    expect(leftProfile?.at(-1)?.endOffset).toBeCloseTo(2.711147, 5)
    expect(rightProfile?.at(-1)?.startOffset).toBeCloseTo(-2.711147, 5)
    expect(rightProfile?.at(-1)?.endOffset).toBeCloseTo(0.584384, 5)

    const editedShape = synchronizeRoadAttachmentOpening(
      road,
      { ...curvedRight!.attachment, roadOpeningOffset: 0 },
      DrivewayNode.parse({ drivewayShape: 'curved-left', curveAmount: 4 }),
    )
    expect(editedShape.roadOpeningOffset).toBeCloseTo(1.77163, 5)
    expect(editedShape.roadOpeningWidth).toBeCloseTo(3.65674, 5)
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
    expect(transform?.position[2]).toBeCloseTo(-4.475, 3)
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

  test('stores an edited pose as road-relative offsets and follows a reshaped road', () => {
    const road = straightRoad()
    const edgeId = Object.keys(road.edges)[0]!
    const source = FireHydrantNode.parse({
      position: [2, 1.25, 6],
      rotation: [0, Math.PI / 3, 0],
    })
    const adjusted = reanchorRoadAttachment(road, {
      id: 'hydrant:adjusted',
      edgeId,
      assetNodeId: source.id,
      kind: 'asset',
      station: 10,
      lateralOffset: 0,
      verticalOffset: 0,
      alignment: 'curb',
      side: 'left',
    }, source)

    expect(adjusted?.placementMode).toBe('adjusted')
    expect(adjusted?.alignment).toBe('free')
    const originalPose = resolveRoadAttachmentTransform(road, adjusted!, source)
    expect(originalPose?.position[0]).toBeCloseTo(source.position[0], 3)
    expect(originalPose?.position[1]).toBeCloseTo(source.position[1], 3)
    expect(originalPose?.position[2]).toBeCloseTo(source.position[2], 3)
    expect(originalPose?.rotation[1]).toBeCloseTo(source.rotation[1], 5)

    const movedRoad = RoadNetworkNode.parse({
      ...road,
      graphNodes: Object.fromEntries(Object.entries(road.graphNodes).map(([id, graphNode]) => [
        id,
        { ...graphNode, position: [graphNode.position[0], graphNode.position[1], graphNode.position[2] + 4] },
      ])),
    })
    const movedPose = resolveRoadAttachmentTransform(movedRoad, adjusted!, source)
    expect(movedPose?.position[0]).toBeCloseTo(source.position[0], 3)
    expect(movedPose?.position[2]).toBeCloseTo(source.position[2] + 4, 3)
    expect(movedPose?.rotation[1]).toBeCloseTo(source.rotation[1], 5)
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

  test('proposes two roadside mast-arm support positions beyond a four-way curb return', () => {
    const horizontal = insertRoadSegment(createEmptyRoadGraph(), [-12, 0, 0], [12, 0, 0])
    const plus = insertRoadSegment(horizontal.graph, [0, 0, -12], [0, 0, 12], { tolerance: 0.1 })
    const road = RoadNetworkNode.parse(plus.graph)
    const junctionId = Object.keys(road.junctions)[0]!
    const placements = buildSignalJunctionPlacements(road, junctionId)

    expect(placements).toHaveLength(2)
    expect(new Set(placements.map((placement) => placement.edgeId)).size).toBe(2)
    expect(placements.every((placement) => Number.isFinite(placement.rotationY))).toBe(true)
    expect(placements.every((placement) => {
      const edge = road.edges[placement.edgeId]!
      const distanceFromJunction = edge.endNodeId === junctionId
        ? 12 - placement.station
        : placement.station
      return distanceFromJunction >= 7
    })).toBe(true)
  })
})
