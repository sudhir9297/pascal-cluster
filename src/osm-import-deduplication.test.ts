import { describe, expect, test } from 'bun:test'
import { validateRoadGraph } from './road-network-validation'
import {
	createMapImportMetadata,
	reviewOsmImport,
	type MapImportOrigin,
} from './osm-import-deduplication'
import type { OsmImportResult } from './osm-import'
import { RoadNetworkNode, type RoadGraphEdge } from './schema'

type Point = readonly [number, number, number]

function lineNetwork(
	start: Point,
	end: Point,
	options: {
		alignment?: Point[]
		metadataOrigin?: MapImportOrigin
		stackLevel?: number
	} = {},
) {
	const edge: RoadGraphEdge = {
		alignment: (options.alignment ?? []).map((point) => [...point]),
		direction: 'both',
		endNodeId: 'end',
		id: 'edge',
		joinMode: 'auto',
		profileMode: 'legacy',
		roadClass: 'local',
		stackLevel: options.stackLevel ?? 0,
		startNodeId: 'start',
		styleId: 'local-street',
		verticalProfile: [],
	}
	return RoadNetworkNode.parse({
		edges: { [edge.id]: edge },
		graphNodes: {
			start: {
				elevationMode: 'ground',
				id: 'start',
				level: 0,
				position: [...start],
				terminal: false,
			},
			end: {
				elevationMode: 'ground',
				id: 'end',
				level: 0,
				position: [...end],
				terminal: false,
			},
		},
		metadata: options.metadataOrigin
			? createMapImportMetadata(undefined, options.metadataOrigin)
			: undefined,
	})
}

function importResult(
	network: ReturnType<typeof lineNetwork>,
	center = { lat: 0, lon: 0 },
): OsmImportResult {
	return {
		assets: [],
		graphs: [network],
		source: {
			baseElevation: 0,
			center,
			provider: 'openstreetmap',
			radiusMeters: 250,
		},
		stats: {
			components: 1,
			droppedComponents: 0,
			edges: 1,
			failedElevationTiles: 0,
			junctions: 0,
			ways: 1,
		},
	}
}

function sceneContext(networks: ReturnType<typeof lineNetwork>[] = []) {
	return { featureSourceIds: new Set<string>(), networks }
}

function resultPoints(result: OsmImportResult): Point[] {
	return result.graphs.flatMap((graph) =>
		Object.values(graph.graphNodes).map((node) => node.position),
	)
}

describe('reviewOsmImport', () => {
	test('skips an exact road already in the level regardless of direction', () => {
		const existing = lineNetwork([100, 0, 0], [0, 0, 0])
		const incoming = importResult(lineNetwork([0, 0, 0], [100, 0, 0]))

		const review = reviewOsmImport(incoming, sceneContext([existing]))

		expect(review).toMatchObject({
			duplicateSegments: 1,
			incomingSegments: 1,
			newSegments: 0,
			trimmedSegments: 0,
		})
		expect(review.result.graphs).toHaveLength(0)
		expect(review.result.stats.edges).toBe(0)
	})

	test('clips a covered prefix instead of stacking the overlapping portion', () => {
		const existing = lineNetwork([0, 0, 0], [50, 0, 0])
		const incoming = importResult(lineNetwork([0, 0, 0], [100, 0, 0]))

		const review = reviewOsmImport(incoming, sceneContext([existing]))
		const points = resultPoints(review.result)

		expect(review).toMatchObject({
			duplicateSegments: 0,
			incomingSegments: 1,
			newSegments: 1,
			trimmedSegments: 1,
		})
		expect(review.result.stats.edges).toBe(1)
		expect(Math.min(...points.map((point) => point[0]))).toBeGreaterThanOrEqual(49)
		expect(Math.max(...points.map((point) => point[0]))).toBeCloseTo(100, 5)
		expect(
			review.result.graphs.flatMap((graph) => validateRoadGraph(graph)).filter(
				(issue) => issue.severity === 'error',
			),
		).toEqual([])
	})

	test('does not confuse a crossing or a nearby parallel road with overlap', () => {
		const incoming = importResult(lineNetwork([-50, 0, 0], [50, 0, 0]))
		const crossing = lineNetwork([0, 0, -50], [0, 0, 50])
		const parallel = lineNetwork([-50, 0, 2], [50, 0, 2])

		for (const existing of [crossing, parallel]) {
			const review = reviewOsmImport(incoming, sceneContext([existing]))
			expect(review.newSegments).toBe(1)
			expect(review.duplicateSegments).toBe(0)
			expect(review.trimmedSegments).toBe(0)
			expect(review.result.stats.edges).toBe(1)
		}
	})

	test('keeps coincident roads on different stack levels', () => {
		const existing = lineNetwork([0, 0, 0], [100, 0, 0], { stackLevel: 1 })
		const incoming = importResult(lineNetwork([0, 0, 0], [100, 0, 0]))

		const review = reviewOsmImport(incoming, sceneContext([existing]))

		expect(review.newSegments).toBe(1)
		expect(review.duplicateSegments).toBe(0)
		expect(review.result.stats.edges).toBe(1)
	})

	test('aligns adjacent imports against their shared geographic origin', () => {
		const origin: MapImportOrigin = {
			baseElevation: 100,
			center: { lat: 0, lon: 0 },
		}
		const existing = lineNetwork([0, 0, 0], [100, 0, 0], {
			metadataOrigin: origin,
		})
		const fiftyMetersEast = { lat: 0, lon: 50 / 111320 }
		const incoming = importResult(
			lineNetwork([-50, 0, 0], [50, 0, 0]),
			fiftyMetersEast,
		)
		incoming.source.baseElevation = 110

		const review = reviewOsmImport(incoming, sceneContext([existing]))

		expect(review.origin).toEqual(origin)
		expect(review.duplicateSegments).toBe(1)
		expect(review.result.graphs).toHaveLength(0)
	})

	test('aligns mapped objects and skips repeated OSM node IDs', () => {
		const origin: MapImportOrigin = {
			baseElevation: 100,
			center: { lat: 0, lon: 0 },
		}
		const existing = lineNetwork([0, 0, 0], [100, 0, 0], {
			metadataOrigin: origin,
		})
		const incoming = importResult(
			lineNetwork([500, 0, 0], [600, 0, 0]),
			{ lat: 0, lon: 50 / 111320 },
		)
		incoming.source.baseElevation = 110
		incoming.assets = [
			{
				kind: 'street-lamp',
				position: [0, 2, 0],
				rotationY: 0,
				sourceId: 'node/known',
			},
			{
				kind: 'traffic-signal',
				position: [10, 3, 0],
				rotationY: 1,
				sourceId: 'node/new',
			},
		]

		const review = reviewOsmImport(incoming, {
			featureSourceIds: new Set(['node/known']),
			networks: [existing],
		})

		expect(review).toMatchObject({
			duplicateAssets: 1,
			incomingAssets: 2,
			newAssets: 1,
		})
		expect(review.result.assets).toMatchObject([
			{
				kind: 'traffic-signal',
				position: [60, 13, 0],
				sourceId: 'node/new',
			},
		])
	})
})


test('overlap trimming discards arrows at newly cut endpoints', () => {
  const incoming = lineNetwork([0, 0, 0], [100, 0, 0])
  incoming.edges.edge!.osmSource = { wayId: 42, tags: {} }
  incoming.edges.edge!.turnLanes = { start: 'left', end: 'right' }
  const existing = lineNetwork([0, 0, 0], [50, 0, 0])
  const review = reviewOsmImport(importResult(incoming), sceneContext([existing]))
  const edge = Object.values(review.result.graphs[0]!.edges)[0]!
  expect(edge.osmSource?.wayId).toBe(42)
  expect(edge.turnLanes).toEqual({ start: undefined, end: 'right' })
})
