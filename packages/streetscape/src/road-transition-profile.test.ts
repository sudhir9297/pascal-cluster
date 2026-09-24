import { describe, expect, test } from 'bun:test'
import { createEmptyRoadGraph, insertRoadSegment } from './road-network-topology'
import {
  buildRoadTransitionProfiles,
  buildRoadTransitionProfilesIncremental,
  createRoadTransitionProfileCache,
  trimRoadTransitionProfile,
} from './road-transition-profile'
import { RoadNetworkNode, type RoadGraphEdge } from './schema'
import { buildRoadNetworkFloorplan } from './road-network-floorplan'
import { buildRoadNetworkMarkings } from './road-network-markings'
import type { GeometryContext } from '@pascal-app/core'

function twoStyleRoad(turn = false) {
  const first = insertRoadSegment(createEmptyRoadGraph(), [-40, 0, 0], [0, 0, 0])
  const second = insertRoadSegment(
    first.graph,
    [0, 0, 0],
    turn ? [0, 0, 40] : [40, 0, 0],
  )
  const graph = second.graph
  graph.stylePresets.wide = {
    ...graph.stylePresets['local-street']!,
    id: 'wide',
    name: 'Six lane approach',
    laneCount: 6,
    leftSide: {
      parkingLaneWidth: 2.4,
      bikeLaneWidth: 1.5,
      gutterWidth: 0.35,
      curbWidth: 0.15,
      vergeWidth: 0.8,
      sidewalkWidth: 1.8,
    },
  }
  graph.stylePresets.narrow = {
    ...graph.stylePresets['local-street']!,
    id: 'narrow',
    name: 'Two lane receiving road',
    laneCount: 2,
    laneWidth: 3,
    shoulderWidth: 0.25,
    leftSide: {
      parkingLaneWidth: 0,
      bikeLaneWidth: 0,
      gutterWidth: 0.25,
      curbWidth: 0.12,
      vergeWidth: 0.4,
      sidewalkWidth: 1.2,
    },
  }
  const edges = Object.values(graph.edges)
  const wideEdge = edges.find((edge) => {
    const start = graph.graphNodes[edge.startNodeId]!
    const end = graph.graphNodes[edge.endNodeId]!
    return start.position[0] === -40 || end.position[0] === -40
  }) as RoadGraphEdge
  const narrowEdge = edges.find((edge) => edge.id !== wideEdge.id) as RoadGraphEdge
  graph.edges[wideEdge.id] = { ...wideEdge, styleId: 'wide' }
  graph.edges[narrowEdge.id] = { ...narrowEdge, styleId: 'narrow' }
  return {
    narrowEdge,
    node: RoadNetworkNode.parse({ ...graph, applyStyleToAll: false }),
    wideEdge,
  }
}

describe('road lane transition profiles', () => {
	test('reuses remote cooked profiles after a localized edge edit', () => {
		const first = insertRoadSegment(
			createEmptyRoadGraph(),
			[0, 0, 0],
			[20, 0, 0],
		).graph
		const graph = insertRoadSegment(first, [100, 0, 0], [120, 0, 0]).graph
		const node = RoadNetworkNode.parse(graph)
		const cache = createRoadTransitionProfileCache()
		const initial = buildRoadTransitionProfilesIncremental(node, cache)
		expect(cache.stats).toEqual({
			rebuiltProfiles: 2,
			reusedProfiles: 0,
			totalProfiles: 2,
		})

		const localEdge = Object.values(node.edges).find((edge) => {
			const start = node.graphNodes[edge.startNodeId]!
			return start.position[0] < 50
		})!
		const edited = RoadNetworkNode.parse({
			...node,
			edges: {
				...node.edges,
				[localEdge.id]: { ...localEdge, alignment: [[10, 0, 3]] },
			},
		})
		const updated = buildRoadTransitionProfilesIncremental(edited, cache)
		const remoteInitial = initial.find((profile) => !profile.edgeIds.includes(localEdge.id))!
		const remoteUpdated = updated.find((profile) => !profile.edgeIds.includes(localEdge.id))!
		const localInitial = initial.find((profile) => profile.edgeIds.includes(localEdge.id))!
		const localUpdated = updated.find((profile) => profile.edgeIds.includes(localEdge.id))!

		expect(cache.stats).toEqual({
			rebuiltProfiles: 1,
			reusedProfiles: 1,
			totalProfiles: 2,
		})
		expect(remoteUpdated).toBe(remoteInitial)
		expect(localUpdated).not.toBe(localInitial)
		expect(localUpdated.samples.some((sample) => sample.point[2] > 2.5)).toBe(true)
	})

  test('tapers the wider approach into the narrower receiving section', () => {
    const { narrowEdge, node, wideEdge } = twoStyleRoad()
    const profiles = buildRoadTransitionProfiles(node)
    const wide = profiles.find((profile) => profile.edgeIds.includes(wideEdge.id))!
    const narrow = profiles.find((profile) => profile.edgeIds.includes(narrowEdge.id))!
    const sharedNodeId = wideEdge.startNodeId === narrowEdge.startNodeId ||
      wideEdge.startNodeId === narrowEdge.endNodeId
      ? wideEdge.startNodeId
      : wideEdge.endNodeId
    const seam = wide.startNodeId === sharedNodeId ? wide.samples[0]! : wide.samples.at(-1)!
    const native = wide.startNodeId === sharedNodeId ? wide.samples.at(-1)! : wide.samples[0]!

    expect(wide.startTransition ?? wide.endTransition).toBeDefined()
    expect(narrow.startTransition ?? narrow.endTransition).toBeUndefined()
    expect(wide.samples.length).toBeGreaterThanOrEqual(3)
    expect(native.carriagewayHalfWidth).toBeCloseTo(10.25)
    expect(seam.carriagewayHalfWidth).toBeCloseTo(3.25)
    expect(seam.components.left['parking-lane'].width).toBeCloseTo(0)
    expect(seam.components.left.sidewalk.width).toBeCloseTo(1.2)
  })

  test('does not turn a sharp corner into a lane transition', () => {
    const { node } = twoStyleRoad(true)

    expect(buildRoadTransitionProfiles(node).every(
      (profile) => !profile.startTransition && !profile.endTransition,
    )).toBe(true)
  })

  test('tapers lane widths even when shoulders keep total pavement width equal', () => {
    const { node, wideEdge } = twoStyleRoad()
    node.stylePresets.wide = {
      ...node.stylePresets.wide!,
      laneCount: 4,
      laneWidth: 3.5,
      shoulderWidth: 0,
    }
    node.stylePresets.narrow = {
      ...node.stylePresets.narrow!,
      laneCount: 4,
      laneWidth: 3,
      shoulderWidth: 1,
    }
    const profile = buildRoadTransitionProfiles(node).find(
      (candidate) => candidate.edgeIds.includes(wideEdge.id),
    )!
    const transitionAtStart = Boolean(profile.startTransition)
    const seam = transitionAtStart ? profile.samples[0]! : profile.samples.at(-1)!
    const native = transitionAtStart ? profile.samples.at(-1)! : profile.samples[0]!

    expect(profile.startTransition ?? profile.endTransition).toBeDefined()
    expect(seam.carriagewayHalfWidth).toBeCloseTo(native.carriagewayHalfWidth)
    expect(seam.laneBoundaryOffsets[0]).toBeCloseTo(-3)
    expect(native.laneBoundaryOffsets[0]).toBeCloseTo(-3.5)
  })

  test('retains interpolated widths when a profile is trimmed', () => {
    const { node, wideEdge } = twoStyleRoad()
    const wide = buildRoadTransitionProfiles(node).find(
      (profile) => profile.edgeIds.includes(wideEdge.id),
    )!
    const transitionAtStart = Boolean(wide.startTransition)
    const trimmed = trimRoadTransitionProfile(
      wide,
      transitionAtStart ? 2 : 0,
      transitionAtStart ? 0 : 2,
    )
    const cut = transitionAtStart ? trimmed.samples[0]! : trimmed.samples.at(-1)!

    expect(cut.carriagewayHalfWidth).toBeGreaterThan(3.25)
    expect(cut.carriagewayHalfWidth).toBeLessThan(10.25)
    expect(trimmed.samples[0]?.distance).toBe(0)
  })

  test('uses the taper in floorplan polygons and converging lane markings', () => {
    const { node, wideEdge } = twoStyleRoad()
    const floorplan = buildRoadNetworkFloorplan(node, {
      viewState: {
        selected: false,
        palette: { selectedStroke: '#2563eb' },
      },
    } as unknown as GeometryContext)

    expect(floorplan.kind).toBe('group')
    if (floorplan.kind !== 'group') return
    const taperPolygon = floorplan.children.find((child) =>
      child.kind === 'polygon' &&
      child.fill === node.stylePresets.wide?.surfaceColor &&
      child.points.some(([x]) => Math.abs(x) < 1e-5) &&
      child.points.some(([x]) => x < -1),
    )
    expect(taperPolygon?.kind).toBe('polygon')
    if (!taperPolygon || taperPolygon.kind !== 'polygon') return
    const seamPoints = taperPolygon.points.filter(([x]) => Math.abs(x) < 1e-5)
    const widePoints = taperPolygon.points.filter(([x]) => x < -1)
    expect(Math.abs(seamPoints[0]![1] - seamPoints[1]![1])).toBeCloseTo(6.5)
    expect(Math.abs(widePoints[0]![1] - widePoints[1]![1])).toBeCloseTo(20.5)

    const laneDashPoints = buildRoadNetworkMarkings(node)
      .filter((marking) => marking.edgeId === wideEdge.id && marking.kind === 'lane-dash')
      .flatMap((marking) => marking.points)
    expect(Math.max(...laneDashPoints.filter(([x]) => x < -25).map(([, , z]) => Math.abs(z))))
      .toBeGreaterThan(6)
    expect(Math.max(...laneDashPoints.filter(([x]) => x > -6).map(([, , z]) => Math.abs(z))))
      .toBeLessThan(4.5)
  })
})
