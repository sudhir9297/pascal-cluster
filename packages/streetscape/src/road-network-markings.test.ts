import { describe, expect, test } from 'bun:test'
import {
  buildRoadNetworkMarkings,
  incomingLaneOffsets,
  splitRoadMarkingDashes,
} from './road-network-markings'
import { createEmptyRoadGraph, insertRoadSegment } from './road-network-topology'
import { RoadNetworkNode } from './schema'

function planLength(points: Array<readonly [number, number, number]>): number {
  return points.slice(1).reduce((length, point, index) =>
    length + Math.hypot(point[0] - points[index]![0], point[2] - points[index]![2]), 0)
}

function teeNetwork(): RoadNetworkNode {
  const through = insertRoadSegment(createEmptyRoadGraph(), [-30, 0, 0], [30, 0, 0])
  const tee = insertRoadSegment(through.graph, [0, 0, -30], [0, 0, 0], { tolerance: 0.1 })
  return RoadNetworkNode.parse(tee.graph)
}

describe('topology-driven road markings', () => {
  test('keeps a physical dash-gap pattern continuous along a sampled path', () => {
    const dashes = splitRoadMarkingDashes([[0, 0, 0], [10, 0, 0], [20, 0, 0]], 3, 3)

    expect(dashes).toHaveLength(4)
    expect(dashes.map(planLength)).toEqual([3, 3, 3, 2])
    expect(dashes[1]?.[0]).toEqual([6, 0, 0])
    expect(dashes[2]?.[0]).toEqual([12, 0, 0])
  })

  test('generates dashed internal lane boundaries on straight and spline roads', () => {
    const straight = insertRoadSegment(createEmptyRoadGraph(), [0, 0, 0], [40, 0, 0]).graph
    straight.stylePresets['local-street'] = {
      ...straight.stylePresets['local-street']!,
      laneCount: 4,
    }
    const straightMarkings = buildRoadNetworkMarkings(RoadNetworkNode.parse(straight))
    expect(straightMarkings.filter((marking) => marking.kind === 'lane-dash').length)
      .toBeGreaterThan(4)

    const curved = insertRoadSegment(createEmptyRoadGraph(), [0, 0, 0], [40, 0, 0], {
      alignment: [[20, 0, 16]],
    }).graph
    curved.stylePresets['local-street'] = {
      ...curved.stylePresets['local-street']!,
      laneCount: 4,
    }
    const curvedDashes = buildRoadNetworkMarkings(RoadNetworkNode.parse(curved))
      .filter((marking) => marking.kind === 'lane-dash')
    expect(curvedDashes.length).toBeGreaterThan(4)
    expect(curvedDashes.flatMap((marking) => marking.points)
      .every((point) => point.every(Number.isFinite))).toBe(true)
    expect(curvedDashes.some((marking) =>
      marking.points.some((point) => point[2] > 1))).toBe(true)
  })

  test('adds arrows to every inbound T approach and controls only the automatic minor road', () => {
    const node = teeNetwork()
    const markings = buildRoadNetworkMarkings(node)
    const junctionId = Object.keys(node.junctions)[0]!
    const branch = Object.values(node.edges).find((edge) =>
      edge.endNodeId === junctionId && node.graphNodes[edge.startNodeId]?.position[2] === -30)!

    expect(new Set(markings.filter((marking) => marking.kind === 'direction-arrow')
      .map((marking) => marking.edgeId)).size).toBe(3)
    expect(markings.filter((marking) => marking.kind === 'stop-line')).toHaveLength(1)
    expect(markings.filter((marking) => marking.kind === 'crosswalk')).toHaveLength(6)
    expect(markings.filter((marking) =>
      marking.edgeId === branch.id &&
      (marking.kind === 'crosswalk' || marking.kind === 'stop-line'))
      .flatMap((marking) => marking.points)
      .every((point) => point[2] < -8)).toBe(true)
    const branchArrowHead = markings.find((marking) =>
      marking.edgeId === branch.id &&
      marking.kind === 'direction-arrow' &&
      marking.points.length === 3)!
    expect(branchArrowHead.points[1]![2]).toBeGreaterThan(branchArrowHead.points[0]![2])
    expect(branchArrowHead.points[1]![2]).toBeGreaterThan(branchArrowHead.points[2]![2])
  })

  test('applies signal stop lines and crosswalks to every inbound approach', () => {
    const node = teeNetwork()
    const junctionId = Object.keys(node.junctions)[0]!
    node.junctions[junctionId] = { ...node.junctions[junctionId]!, treatment: 'signal' }
    const markings = buildRoadNetworkMarkings(node)

    expect(markings.filter((marking) => marking.kind === 'stop-line')).toHaveLength(3)
    expect(markings.filter((marking) => marking.kind === 'crosswalk')).toHaveLength(18)
  })

  test('renders a per-approach yield line without changing the other controls', () => {
    const node = teeNetwork()
    const junctionId = Object.keys(node.junctions)[0]!
    const edgeId = Object.values(node.edges)[0]!.id
    node.junctions[junctionId] = {
      ...node.junctions[junctionId]!,
      approachControls: { [edgeId]: 'yield' },
    }
    const markings = buildRoadNetworkMarkings(node)
    expect(markings.some((marking) => marking.edgeId === edgeId && marking.kind === 'yield-line')).toBe(true)
    expect(markings.some((marking) => marking.edgeId === edgeId && marking.kind === 'stop-line')).toBe(false)
  })

  test('suppresses approach controls and arrows for one-way traffic leaving a junction', () => {
    const node = teeNetwork()
    const junctionId = Object.keys(node.junctions)[0]!
    const branch = Object.values(node.edges).find((edge) =>
      edge.endNodeId === junctionId && node.graphNodes[edge.startNodeId]?.position[2] === -30)!
    node.edges[branch.id] = { ...branch, direction: 'reverse' }
    const markings = buildRoadNetworkMarkings(node)

    expect(markings.some((marking) =>
      marking.edgeId === branch.id && marking.kind === 'direction-arrow')).toBe(false)
    expect(markings.some((marking) =>
      marking.edgeId === branch.id && marking.kind === 'stop-line')).toBe(false)
    expect(markings.some((marking) =>
      marking.edgeId === branch.id && marking.kind === 'crosswalk')).toBe(false)
  })

	test('regional packs mirror incoming lanes and centerline colors', () => {
		const node = teeNetwork()
		const junctionId = Object.keys(node.junctions)[0]!
		const edge = Object.values(node.edges).find(
			(candidate) => candidate.startNodeId === junctionId || candidate.endNodeId === junctionId,
		)!
		const style = node.stylePresets[edge.styleId]!
		expect(incomingLaneOffsets(edge, junctionId, style, 'left')).toEqual(
			incomingLaneOffsets(edge, junctionId, style, 'right').map((offset) => -offset),
		)
		const right = buildRoadNetworkMarkings(node)
		const left = buildRoadNetworkMarkings({ ...node, regionalPack: 'left-driving' })
		expect(new Set(
			right.filter((marking) => marking.kind === 'centerline').map((marking) => marking.color),
		)).toEqual(new Set(['#e8c447']))
		expect(new Set(
			left.filter((marking) => marking.kind === 'centerline').map((marking) => marking.color),
		)).toEqual(new Set(['#f3f1df']))
	})
})

test('one-way streets paint every lane divider without an opposing-traffic centerline', () => {
  for (const direction of ['forward', 'reverse'] as const) {
    const graph = insertRoadSegment(createEmptyRoadGraph(), [0, 0, 0], [40, 0, 0]).graph
    Object.values(graph.edges)[0]!.direction = direction
    const markings = buildRoadNetworkMarkings(RoadNetworkNode.parse(graph))
    expect(markings.filter(marking => marking.kind === 'centerline')).toHaveLength(0)
    expect(markings.filter(marking => marking.kind === 'lane-dash').length).toBeGreaterThan(0)
  }
})
