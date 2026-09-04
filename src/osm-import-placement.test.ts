import { beforeEach, describe, expect, test } from 'bun:test'
import { clearSceneHistory, LevelNode, SlabNode, type AnyNodeId, useScene } from '@pascal-app/core'
import { createEmptyRoadGraph } from './road-network-topology'
import type { OsmImportResult } from './osm-import'
import { RoadNetworkNode } from './schema'
import {
	getImportedStreetFocus,
	getOsmImportFloorOffset,
	getOsmImportSceneContext,
	placeOsmImport,
} from './osm-import-placement'

const LEVEL_ID = 'level_map-import' as AnyNodeId
const SLAB_ID = 'slab_map-import' as AnyNodeId

function importResult(graphCount: number): OsmImportResult {
	return {
		assets: [],
		graphs: Array.from({ length: graphCount }, () => createEmptyRoadGraph()),
		source: {
			baseElevation: 0,
			center: { lat: 0, lon: 0 },
			provider: 'openstreetmap',
			radiusMeters: 250,
		},
		stats: {
			ways: graphCount,
			edges: 0,
			junctions: 0,
			components: graphCount,
			droppedComponents: 0,
			failedElevationTiles: 0,
		},
	}
}

beforeEach(() => {
	const level = LevelNode.parse({ id: LEVEL_ID, children: [SLAB_ID] })
	const slab = SlabNode.parse({
		id: SLAB_ID,
		parentId: LEVEL_ID,
		polygon: [
			[-50, -50],
			[50, -50],
			[50, 50],
			[-50, 50],
		],
		elevation: 0.35,
		thickness: 0.1,
	})
	useScene.setState({
		nodes: { [LEVEL_ID]: level, [SLAB_ID]: slab },
		rootNodeIds: [LEVEL_ID],
		dirtyNodes: new Set(),
		collections: {},
		materials: {},
		readOnly: false,
	})
	clearSceneHistory()
})

describe('placeOsmImport', () => {
	test('raises imported map geometry above the active floor surface', () => {
		expect(getOsmImportFloorOffset(LEVEL_ID)).toBeCloseTo(0.4)
	})

	test('adds every disconnected road component to the active level', () => {
		const ids = placeOsmImport(importResult(2), LEVEL_ID)
		const scene = useScene.getState()

		expect(ids).toHaveLength(2)
		expect(new Set(ids).size).toBe(2)
		expect(
			ids.every(
				(id) => (scene.nodes[id] as unknown as { type?: string })?.type === 'streetscape:road-network',
			),
		).toBe(true)
		expect(
			(scene.nodes[LEVEL_ID] as unknown as { children?: AnyNodeId[] }).children,
		).toEqual([SLAB_ID, ...ids])
		expect(getOsmImportSceneContext(LEVEL_ID).networks).toHaveLength(2)
		expect(ids.every(id => !RoadNetworkNode.parse(scene.nodes[id]).applyStyleToAll)).toBe(true)
		expect(getOsmImportSceneContext(LEVEL_ID).networks[0]?.metadata).toMatchObject({
			streetscapeMapImport: {
				origin: { lat: 0, lon: 0 },
				originElevation: 0,
				provider: 'openstreetmap',
			},
		})
	})

	test('records the complete import as one undo step', () => {
		placeOsmImport(importResult(3), LEVEL_ID)
		expect(useScene.temporal.getState().pastStates).toHaveLength(1)

		useScene.temporal.getState().undo()
		expect(
			(useScene.getState().nodes[LEVEL_ID] as unknown as { children?: AnyNodeId[] }).children,
		).toEqual([SLAB_ID])
		expect(
			Object.values(useScene.getState().nodes).filter(
				(node) =>
					(node as unknown as { type?: string }).type === 'streetscape:road-network',
			),
		).toHaveLength(0)
	})

	test('places mapped lamps, signals, and signs with source metadata in the same undo step', () => {
		const result = importResult(1)
		result.assets = [
			{
				height: 7,
				kind: 'street-lamp',
				position: [10, 1, 20],
				rotationY: 0.2,
				sourceId: 'node/11',
			},
			{
				kind: 'traffic-signal',
				position: [30, 2, 40],
				rotationY: 0.4,
				sourceId: 'node/12',
			},
			{
				kind: 'road-sign',
				position: [50, 3, 60],
				rotationY: 0.6,
				signId: 'speed-limit',
				sourceId: 'node/13',
				text: '40',
			},
		]

		const ids = placeOsmImport(result, LEVEL_ID)
		const placed = ids.map((id) => useScene.getState().nodes[id] as unknown as {
			metadata?: unknown
			position?: number[]
			type?: string
		})

		expect(placed.map((node) => node.type)).toEqual([
			'streetscape:road-network',
			'streetscape:street-light',
			'streetscape:traffic-signal',
			'streetscape:road-sign',
		])
		expect(placed[1]?.position).toEqual([10, 1.4, 20])
		expect(placed[1]?.metadata).toMatchObject({
			streetscapeOsmFeature: { kind: 'street-lamp', sourceId: 'node/11' },
		})
		expect(getOsmImportSceneContext(LEVEL_ID).featureSourceIds).toEqual(
			new Set(['node/11', 'node/12', 'node/13']),
		)
		expect(useScene.temporal.getState().pastStates).toHaveLength(1)
	})
})

describe('getImportedStreetFocus', () => {
	test('fits every imported graph with padding for the 2D editor', () => {
		const result = importResult(2)
		result.graphs[0]!.graphNodes.west = {
			id: 'west',
			position: [-100, 0, -20],
			level: 0,
			elevationMode: 'ground',
			terminal: false,
		}
		result.graphs[1]!.graphNodes.east = {
			id: 'east',
			position: [140, 0, 80],
			level: 0,
			elevationMode: 'ground',
			terminal: false,
		}

		expect(getImportedStreetFocus(result)).toEqual({
			center: [20, 30],
			max: [140, 80],
			min: [-100, -20],
			size: [240, 100],
			viewWidth: 288,
		})
	})

	test('returns world-space bounds for a rotated building', () => {
		const result = importResult(1)
		result.graphs[0]!.graphNodes.start = {
			id: 'start',
			position: [0, 0, 0],
			level: 0,
			elevationMode: 'ground',
			terminal: false,
		}
		result.graphs[0]!.graphNodes.end = {
			id: 'end',
			position: [20, 0, 10],
			level: 0,
			elevationMode: 'ground',
			terminal: false,
		}

		const focus = getImportedStreetFocus(result, {
			position: [100, 4, 200],
			rotationY: Math.PI / 2,
		})

		expect(focus?.center[0]).toBeCloseTo(105)
		expect(focus?.center[1]).toBeCloseTo(190)
		expect(focus?.size[0]).toBeCloseTo(10)
		expect(focus?.size[1]).toBeCloseTo(20)
	})

	test('returns null when the import has no centerline points', () => {
		expect(getImportedStreetFocus(importResult(0))).toBeNull()
	})

	test('includes mapped objects when fitting the imported scene', () => {
		const result = importResult(0)
		result.assets = [
			{
				kind: 'street-lamp',
				position: [75, 0, -25],
				rotationY: 0,
				sourceId: 'node/20',
			},
		]
		expect(getImportedStreetFocus(result)).toMatchObject({
			center: [75, -25],
			max: [75, -25],
			min: [75, -25],
		})
	})
})
