import { expect, test } from 'bun:test'
import { approachTurnLanes, parseTurnLanes, turnArrowPolygons } from './road-turn-arrows'
import {
  buildRoadGraphFromSegments,
  buildSegmentsFromWays,
  ensureSimpleSegments,
  localToGeo,
  parseOsmMapResponse,
  prepareOsmStreetImport,
  completeOsmStreetImport,
  type OsmWay,
} from './osm-import'
import { RoadNetworkNode } from './schema'
import { buildRoadNetworkMarkings } from './road-network-markings'
import { createEmptyRoadGraph, insertRoadSegment } from './road-network-topology'
import { exportRoadNetworkGraph, importRoadNetworkGraph } from './road-network-io'

const center = { lat: 40.758, lon: -73.9855 }
function way(id: number, nodes: [number, number, number][], tags: Record<string, string>): OsmWay {
  return {
    id,
    tags: { highway: 'residential', ...tags },
    points: nodes.map(([nodeId, x, z]) => ({ nodeId, ...localToGeo([x, z], center) })),
  }
}

test('parses ordered and combined indications without filling missing lanes', () => {
  expect(parseTurnLanes('left|through;right|', 3)).toEqual([['left'], ['through', 'right'], []])
  expect(parseTurnLanes('none|slight_left|through;unknown', 3)).toEqual([[], [], []])
  expect(parseTurnLanes('left|right', 3)).toEqual([])
  expect(parseTurnLanes('through;through', 1)).toEqual([['through']])
})

test('keeps indications only at original way endpoints through junction and radius splits', () => {
  const a = way(
    42,
    [
      [1, -80, 0],
      [2, 0, 0],
      [3, 80, 0],
    ],
    { oneway: 'yes', lanes: '3', 'turn:lanes': 'through|through|right' },
  )
  const cross = way(
    43,
    [
      [4, 0, -30],
      [2, 0, 0],
      [5, 0, 30],
    ],
    {},
  )
  const { segments, nodePositions } = buildSegmentsFromWays([a, cross], center, 100)
  const { graph } = buildRoadGraphFromSegments(
    ensureSimpleSegments(segments, nodePositions),
    nodePositions,
  )
  const edges = Object.values(graph.edges).filter((e) => e.osmSource?.wayId === 42)
  expect(edges).toHaveLength(2)
  expect(edges.find((e) => e.endNodeId === 'n2')!.turnLanes?.end).toBeUndefined()
  expect(edges.find((e) => e.endNodeId === 'n3')!.turnLanes?.end).toBe('through|through|right')
  const clipped = buildSegmentsFromWays([a], center, 50)
  expect(clipped.segments.every((s) => s.turnLanes?.end === undefined)).toBe(true)
  expect(edges[0]!.osmSource!.tags).toEqual(a.tags)
  const restored = importRoadNetworkGraph(exportRoadNetworkGraph(RoadNetworkNode.parse(graph)))
  expect(restored.edges).toEqual(RoadNetworkNode.parse(graph).edges)
})

test('reverse one-way and directional two-way tags attach to the correct approach', () => {
  for (const [tags, expected] of [
    [
      { oneway: '-1', 'turn:lanes': 'left|right' },
      { start: 'left|right', end: undefined },
    ],
    [
      { 'turn:lanes:forward': 'right', 'turn:lanes:backward': 'left' },
      { start: 'left', end: 'right' },
    ],
  ] as const) {
    const { segments } = buildSegmentsFromWays(
      [
        way(
          1,
          [
            [1, -30, 0],
            [2, 30, 0],
          ],
          tags,
        ),
      ],
      center,
      100,
    )
    expect(segments[0]!.turnLanes).toEqual(expected)
  }
})

test('editing an imported edge preserves source and does not duplicate endpoint arrows', () => {
  const graph = insertRoadSegment(createEmptyRoadGraph(), [-40, 0, 0], [40, 0, 0]).graph
  const edge = Object.values(graph.edges)[0]!
  edge.osmSource = { wayId: 42, tags: { 'turn:lanes:forward': 'right' } }
  edge.turnLanes = { start: 'left', end: 'right' }
  const split = insertRoadSegment(graph, [0, 0, -30], [0, 0, 0], { tolerance: 0.1 }).graph
  const descendants = Object.values(split.edges).filter((e) => e.osmSource?.wayId === 42)
  expect(descendants).toHaveLength(2)
  expect(descendants.filter((e) => e.turnLanes?.start === 'left')).toHaveLength(1)
  expect(descendants.filter((e) => e.turnLanes?.end === 'right')).toHaveLength(1)
})

test('renderer places left and right arrows in driver lane order on a three-lane approach', () => {
  const through = insertRoadSegment(createEmptyRoadGraph(), [-40, 0, 0], [40, 0, 0])
  const graph = insertRoadSegment(through.graph, [0, 0, -40], [0, 0, 0], { tolerance: 0.1 }).graph
  const node = RoadNetworkNode.parse(graph)
  const edge = Object.values(node.edges).find(
    (e) => node.graphNodes[e.startNodeId]!.position[2] === -40,
  )!
  edge.direction = 'forward'
  edge.turnLanes = { end: 'left|through|right' }
  node.stylePresets[edge.styleId]!.laneCount = 3
  const heads = buildRoadNetworkMarkings(node).filter(
    (m) => m.edgeId === edge.id && m.kind === 'direction-arrow' && m.points.length === 3,
  )
  expect(heads).toHaveLength(3)
  // Travel is +Z: the driver's left is +X, right is -X.
  expect(heads[0]!.points[1]![0]).toBeGreaterThan(heads[0]!.points[0]![0])
  expect(heads[1]!.points[1]![2]).toBeGreaterThan(heads[1]!.points[0]![2])
  expect(heads[2]!.points[1]![0]).toBeLessThan(heads[2]!.points[0]![0])
  expect(heads[0]!.points.every((p) => p[0] > 0)).toBe(true)
  expect(heads[2]!.points.every((p) => p[0] < 0)).toBe(true)
  edge.turnLanes = { end: 'none||unknown' }
  expect(
    buildRoadNetworkMarkings(node).filter(
      (m) => m.edgeId === edge.id && m.kind === 'direction-arrow',
    ),
  ).toHaveLength(0)
  edge.turnLanes = undefined
  expect(approachTurnLanes(edge, edge.endNodeId, 3)).toBeUndefined()
  edge.osmSource = { wayId: 42, tags: {} }
  expect(approachTurnLanes(edge, edge.endNodeId, 3)).toEqual([])
})

test('combined arrows share a shaft and fit within a standard lane', () => {
  const polygons = turnArrowPolygons(['left', 'through', 'right'])
  expect(polygons).toHaveLength(6)
  expect(polygons.flat().every((p) => Math.abs(p[1]) <= 1.25)).toBe(true)
})

test('captured Manhattan import retains West 48th Street lane indications', async () => {
  const raw = await Bun.file(
    `${import.meta.dir}/../docs/research/osm-road-audit/manhattan-response.json`,
  ).json()
  const prepared = await prepareOsmStreetImport(center, 250, {
    loadMapData: async () => parseOsmMapResponse(raw),
  })
  const result = await completeOsmStreetImport(prepared)
  const edges = result.graphs
    .flatMap((g) => Object.values(g.edges))
    .filter((e) => e.osmSource?.wayId === 167922074)
  expect(edges.length).toBeGreaterThan(0)
  expect(edges.some((e) => e.turnLanes?.end === 'through|through|right')).toBe(true)
  expect(edges.every((e) => e.osmSource!.tags['turn:lanes'] === 'through|through|right')).toBe(true)
})
