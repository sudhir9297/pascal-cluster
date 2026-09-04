import {
	createEmptyRoadGraph,
	reconcileRoadJunctions,
	splitRoadGraphComponents,
	type RoadNetworkGraph,
} from './road-network-topology'
import { validateRoadGraph } from './road-network-validation'
import type { RoadGraphEdge, RoadGraphNode, RoadStylePreset } from './schema'
import { buildOsmRoadStyle } from './osm-road-style'
import { fitOsmJunctionCorners } from './osm-junctions'
import type { GeoBoundingBox, GeoPoint } from './osm-elevation'
import { getStreetRequest } from './map-data-source'
import {
	buildOsmPointAssets,
	countOsmPointAssets,
	parseOsmPointFeatures,
	type OsmImportedPointAsset,
	type OsmPointFeature,
} from './osm-point-assets'

export const MIN_IMPORT_RADIUS_M = 50
export const MAX_IMPORT_RADIUS_M = 600
export const DEFAULT_IMPORT_RADIUS_M = 250
export const MAX_IMPORT_SEGMENTS = 3000
export const IMPORT_SIMPLIFY_TOLERANCE_M = 0.5
/** Components shorter than this are edge-of-circle fragments and are dropped. */
const MIN_COMPONENT_LENGTH_M = 10
const METERS_PER_DEGREE = 111320
const MERGE_DISTANCE_M = 0.05

export type OsmWay = {
	id: number
	tags: Record<string, string>
	points: Array<GeoPoint & { nodeId: number }>
}

export type OsmRoadProps = {
	roadClass: RoadGraphEdge['roadClass']
	styleId: string
	direction: RoadGraphEdge['direction']
	isBridge: boolean
	stackLevel: number
	style?: RoadStylePreset
}

type PlanPoint = readonly [number, number]

export type OsmSegment = {
	startId: string
	endId: string
	interior: PlanPoint[]
	props: OsmRoadProps
}

export type OsmImportStats = {
	ways: number
	edges: number
	junctions: number
	components: number
	droppedComponents: number
	failedElevationTiles: number
}

export type OsmImportResult = {
	assets: OsmImportedPointAsset[]
	graphs: RoadNetworkGraph[]
	source: {
		baseElevation: number | null
		center: GeoPoint
		provider: 'openstreetmap'
		radiusMeters: number
	}
	stats: OsmImportStats
}

export type OsmStreetPreviewPath = {
	points: GeoPoint[]
	roadClass: RoadGraphEdge['roadClass']
}

export type OsmStreetPreviewObject = Pick<OsmPointFeature, 'kind' | 'point' | 'sourceId'>

export type OsmStreetPreview = {
	assetCounts: ReturnType<typeof countOsmPointAssets>
	mappedObjects: OsmStreetPreviewObject[]
	paths: OsmStreetPreviewPath[]
	segmentCount: number
	wayCount: number
}

const PREPARED_IMPORT_DATA: unique symbol = Symbol('prepared-osm-import-data')

export type PreparedOsmImport = {
	center: GeoPoint
	preview: OsmStreetPreview
	radiusMeters: number
	readonly [PREPARED_IMPORT_DATA]: {
		componentCount: number
		nodePositions: Map<string, PlanPoint>
		pointFeatures: OsmPointFeature[]
		previewGraphs: RoadNetworkGraph[]
		segments: OsmSegment[]
		waysCount: number
	}
}

// --- geodesy -----------------------------------------------------------------

export function computeBoundingBox(
	center: GeoPoint,
	radiusMeters: number,
): GeoBoundingBox {
	const latDelta = radiusMeters / METERS_PER_DEGREE
	const lonDelta =
		radiusMeters /
		(METERS_PER_DEGREE * Math.max(0.01, Math.cos((center.lat * Math.PI) / 180)))
	return {
		south: center.lat - latDelta,
		west: center.lon - lonDelta,
		north: center.lat + latDelta,
		east: center.lon + lonDelta,
	}
}

/** Local plane in metres, y-up: x grows east, z grows south (north-up plan). */
export function projectToLocal(point: GeoPoint, center: GeoPoint): PlanPoint {
	const scale = Math.cos((center.lat * Math.PI) / 180)
	return [
		(point.lon - center.lon) * scale * METERS_PER_DEGREE,
		-(point.lat - center.lat) * METERS_PER_DEGREE,
	]
}

export function localToGeo(point: PlanPoint, center: GeoPoint): GeoPoint {
	const scale = Math.cos((center.lat * Math.PI) / 180)
	return {
		lat: center.lat - point[1] / METERS_PER_DEGREE,
		lon: center.lon + point[0] / (scale * METERS_PER_DEGREE),
	}
}

// --- Overpass ----------------------------------------------------------------

const IMPORTED_HIGHWAY_PATTERN =
	'^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service)(_link)?$'

export function buildOverpassQuery(bbox: GeoBoundingBox): string {
	const box = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`
	return `[out:json][timeout:25];(way["highway"~"${IMPORTED_HIGHWAY_PATTERN}"](${box});node["highway"="street_lamp"](${box});node["highway"="traffic_signals"](${box});node["traffic_sign"](${box});node["highway"~"^(stop|give_way)$"](${box}););out geom;`
}

export function parseOverpassResponse(payload: unknown): OsmWay[] {
	const elements = (payload as { elements?: unknown[] })?.elements
	if (!Array.isArray(elements)) return []
	const ways: OsmWay[] = []
	for (const element of elements) {
		const way = element as {
			type?: string
			id?: number
			tags?: Record<string, string>
			nodes?: number[]
			geometry?: Array<{ lat: number; lon: number } | null>
		}
		if (way.type !== 'way' || !way.geometry || !way.nodes || !way.tags) continue
		if (way.geometry.length !== way.nodes.length) continue
		const points = way.geometry.flatMap((geo, index) =>
			geo && Number.isFinite(geo.lat) && Number.isFinite(geo.lon)
				? [{ lat: geo.lat, lon: geo.lon, nodeId: way.nodes![index]! }]
				: [],
		)
		if (points.length < 2) continue
		ways.push({ id: way.id ?? 0, tags: way.tags, points })
	}
	return ways
}

export type OsmMapData = {
	pointFeatures: OsmPointFeature[]
	ways: OsmWay[]
}

export function parseOsmMapResponse(payload: unknown): OsmMapData {
	return {
		pointFeatures: parseOsmPointFeatures(payload),
		ways: parseOverpassResponse(payload),
	}
}

export async function fetchOsmMapData(
	bbox: GeoBoundingBox,
	signal?: AbortSignal,
): Promise<OsmMapData> {
	const request = getStreetRequest(bbox, buildOverpassQuery(bbox))
	const response = await fetch(request.url, { ...request.init, signal })
	if (response.status === 429) {
		throw new Error('The street data service is busy. Try again in a minute.')
	}
	if (!response.ok) {
		throw new Error(`Street data request failed (HTTP ${response.status}).`)
	}
	return parseOsmMapResponse(await response.json())
}

export async function fetchOsmStreets(
	bbox: GeoBoundingBox,
	signal?: AbortSignal,
): Promise<OsmWay[]> {
	return (await fetchOsmMapData(bbox, signal)).ways
}

// --- tag mapping ---------------------------------------------------------------

const HIGHWAY_CLASS_MAP: Record<
	string,
	{ roadClass: RoadGraphEdge['roadClass']; styleId: string }
> = {
	motorway: { roadClass: 'highway', styleId: 'highway' },
	motorway_link: { roadClass: 'highway', styleId: 'highway' },
	trunk: { roadClass: 'highway', styleId: 'highway' },
	trunk_link: { roadClass: 'highway', styleId: 'highway' },
	primary: { roadClass: 'arterial', styleId: 'arterial' },
	primary_link: { roadClass: 'arterial', styleId: 'arterial' },
	secondary: { roadClass: 'arterial', styleId: 'arterial' },
	secondary_link: { roadClass: 'arterial', styleId: 'arterial' },
	tertiary: { roadClass: 'collector', styleId: 'collector' },
	tertiary_link: { roadClass: 'collector', styleId: 'collector' },
	unclassified: { roadClass: 'local', styleId: 'local-street' },
	residential: { roadClass: 'local', styleId: 'local-street' },
	living_street: { roadClass: 'local', styleId: 'local-street' },
	service: { roadClass: 'service', styleId: 'alley' },
}

export function mapOsmTags(tags: Record<string, string>): OsmRoadProps | null {
	const entry = HIGHWAY_CLASS_MAP[tags.highway ?? '']
	if (!entry) return null
	const oneway = tags.oneway ?? ''
	const direction: RoadGraphEdge['direction'] =
		oneway === 'yes' || oneway === '1' || oneway === 'true'
			? 'forward'
			: oneway === '-1' || oneway === 'reverse'
				? 'reverse'
				: oneway !== 'no' && oneway !== '0' && oneway !== 'false' &&
					(tags.junction === 'roundabout' || tags.highway === 'motorway')
					? 'forward'
					: 'both'
	const layer = Number.parseInt(tags.layer ?? '0', 10)
	return {
		...entry,
		direction,
		style: buildOsmRoadStyle(tags, entry.styleId, direction !== 'both'),
		isBridge: Boolean(tags.bridge) && tags.bridge !== 'no',
		stackLevel: Math.max(0, Number.isFinite(layer) ? layer : 0),
	}
}

// --- polyline utilities ----------------------------------------------------------

function distance(a: PlanPoint, b: PlanPoint): number {
	return Math.hypot(a[0] - b[0], a[1] - b[1])
}

export function simplifyPolyline(
	points: PlanPoint[],
	tolerance: number = IMPORT_SIMPLIFY_TOLERANCE_M,
): PlanPoint[] {
	if (points.length <= 2) return points
	const keep = new Array<boolean>(points.length).fill(false)
	keep[0] = keep[points.length - 1] = true
	const stack: Array<[number, number]> = [[0, points.length - 1]]
	while (stack.length > 0) {
		const [first, last] = stack.pop()!
		const start = points[first]!
		const end = points[last]!
		const dx = end[0] - start[0]
		const dz = end[1] - start[1]
		const lengthSq = dx * dx + dz * dz
		let maxDistance = 0
		let maxIndex = -1
		for (let index = first + 1; index < last; index++) {
			const point = points[index]!
			let perpendicular: number
			if (lengthSq < 1e-12) {
				perpendicular = distance(point, start)
			} else {
				const t = Math.max(
					0,
					Math.min(
						1,
						((point[0] - start[0]) * dx + (point[1] - start[1]) * dz) / lengthSq,
					),
				)
				perpendicular = Math.hypot(
					point[0] - (start[0] + t * dx),
					point[1] - (start[1] + t * dz),
				)
			}
			if (perpendicular > maxDistance) {
				maxDistance = perpendicular
				maxIndex = index
			}
		}
		if (maxIndex >= 0 && maxDistance > tolerance) {
			keep[maxIndex] = true
			stack.push([first, maxIndex], [maxIndex, last])
		}
	}
	return points.filter((_, index) => keep[index])
}

// --- clipping, splitting, segment building --------------------------------------

type RunPoint = { id: string | null; point: PlanPoint }

/** t values in [0,1] where the segment a→b crosses the circle of the radius. */
function circleCrossings(a: PlanPoint, b: PlanPoint, radius: number): number[] {
	const dx = b[0] - a[0]
	const dz = b[1] - a[1]
	const qa = dx * dx + dz * dz
	if (qa < 1e-12) return []
	const qb = 2 * (a[0] * dx + a[1] * dz)
	const qc = a[0] * a[0] + a[1] * a[1] - radius * radius
	const discriminant = qb * qb - 4 * qa * qc
	if (discriminant <= 0) return []
	const root = Math.sqrt(discriminant)
	return [(-qb - root) / (2 * qa), (-qb + root) / (2 * qa)].filter(
		(t) => t > 1e-9 && t < 1 - 1e-9,
	)
}

function lerpPoint(a: PlanPoint, b: PlanPoint, t: number): PlanPoint {
	return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

function clipRunToRadius(
	points: RunPoint[],
	radius: number,
	nextBoundaryId: () => string,
): RunPoint[][] {
	const inside = (p: PlanPoint) => Math.hypot(p[0], p[1]) <= radius
	const runs: RunPoint[][] = []
	let current: RunPoint[] = []
	const flush = () => {
		if (current.length >= 2) runs.push(current)
		current = []
	}
	for (let index = 0; index < points.length - 1; index++) {
		const a = points[index]!
		const b = points[index + 1]!
		const aIn = inside(a.point)
		const bIn = inside(b.point)
		const crossings = circleCrossings(a.point, b.point, radius)
		if (aIn && current.length === 0) current.push(a)
		if (aIn && bIn) {
			current.push(b)
		} else if (aIn && !bIn) {
			const t = crossings[0] ?? 1
			current.push({ id: nextBoundaryId(), point: lerpPoint(a.point, b.point, t) })
			flush()
		} else if (!aIn && bIn) {
			const t = crossings[crossings.length - 1] ?? 0
			current = [
				{ id: nextBoundaryId(), point: lerpPoint(a.point, b.point, t) },
				b,
			]
		} else if (crossings.length === 2) {
			runs.push([
				{ id: nextBoundaryId(), point: lerpPoint(a.point, b.point, crossings[0]!) },
				{ id: nextBoundaryId(), point: lerpPoint(a.point, b.point, crossings[1]!) },
			])
		}
	}
	flush()
	return runs
}

export function buildSegmentsFromWays(
	ways: OsmWay[],
	center: GeoPoint,
	radiusMeters: number,
): { segments: OsmSegment[]; nodePositions: Map<string, PlanPoint> } {
	let boundaryCounter = 0
	const runsWithProps: Array<{ run: RunPoint[]; props: OsmRoadProps }> = []
	for (const way of ways) {
		const props = mapOsmTags(way.tags)
		if (!props) continue
		const points: RunPoint[] = way.points.map((point) => ({
			id: `n${point.nodeId}`,
			point: projectToLocal(point, center),
		}))
		for (const run of clipRunToRadius(
			points,
			radiusMeters,
			() => `b${++boundaryCounter}`,
		)) {
			runsWithProps.push({ run, props })
		}
	}

	const idCount = new Map<string, number>()
	for (const { run } of runsWithProps) {
		for (const { id } of run) {
			if (id) idCount.set(id, (idCount.get(id) ?? 0) + 1)
		}
	}

	const segments: OsmSegment[] = []
	const nodePositions = new Map<string, PlanPoint>()
	for (const { run, props } of runsWithProps) {
		let sliceStart = 0
		for (let index = 1; index < run.length; index++) {
			const isLast = index === run.length - 1
			const point = run[index]!
			const isJunction = point.id !== null && (idCount.get(point.id) ?? 0) >= 2
			if (!isLast && !isJunction) continue
			const slice = run.slice(sliceStart, index + 1)
			sliceStart = index
			const start = slice[0]!
			const end = slice[slice.length - 1]!
			const startId = start.id ?? `b${++boundaryCounter}`
			const endId = end.id ?? `b${++boundaryCounter}`
			nodePositions.set(startId, start.point)
			nodePositions.set(endId, end.point)
			const simplified = simplifyPolyline(slice.map((entry) => entry.point))
			segments.push({
				startId,
				endId,
				interior: simplified.slice(1, -1),
				props,
			})
		}
	}
	return { segments, nodePositions }
}

function segmentPath(
	segment: OsmSegment,
	nodePositions: Map<string, PlanPoint>,
): PlanPoint[] {
	return [
		nodePositions.get(segment.startId)!,
		...segment.interior,
		nodePositions.get(segment.endId)!,
	]
}

function pathLength(points: PlanPoint[]): number {
	let length = 0
	for (let index = 0; index < points.length - 1; index++) {
		length += distance(points[index]!, points[index + 1]!)
	}
	return length
}

/**
 * The road-graph validator rejects self-loops, duplicate node pairs, and
 * edges shorter than 5 cm — all of which occur in raw OSM data (roundabout
 * closures, dual carriageways, degenerate stubs). Split offenders at an
 * interior point; merge or drop the pointless remainder.
 */
export function ensureSimpleSegments(
	segments: OsmSegment[],
	nodePositions: Map<string, PlanPoint>,
): OsmSegment[] {
	const alias = new Map<string, string>()
	const resolve = (id: string): string => {
		let current = id
		while (alias.has(current)) current = alias.get(current)!
		return current
	}
	const queue: OsmSegment[] = []
	for (const segment of segments) {
		const start = nodePositions.get(segment.startId)!
		const end = nodePositions.get(segment.endId)!
		if (
			segment.interior.length === 0 &&
			distance(start, end) < MERGE_DISTANCE_M
		) {
			const keep = resolve(segment.startId)
			const merge = resolve(segment.endId)
			if (merge !== keep) alias.set(merge, keep)
		} else {
			queue.push(segment)
		}
	}

	let midCounter = 0
	const result: OsmSegment[] = []
	const pairs = new Set<string>()
	while (queue.length > 0) {
		const segment = queue.shift()!
		const startId = resolve(segment.startId)
		const endId = resolve(segment.endId)
		const start = nodePositions.get(startId)!
		const end = nodePositions.get(endId)!
		const pairKey = [startId, endId].sort().join('|')
		const problematic =
			startId === endId ||
			pairs.has(pairKey) ||
			distance(start, end) < MERGE_DISTANCE_M
		if (!problematic) {
			pairs.add(pairKey)
			result.push({ ...segment, startId, endId })
			continue
		}
		if (segment.interior.length === 0) continue
		const splitIndex = Math.floor(segment.interior.length / 2)
		const midId = `m${++midCounter}`
		nodePositions.set(midId, segment.interior[splitIndex]!)
		queue.push(
			{
				startId,
				endId: midId,
				interior: segment.interior.slice(0, splitIndex),
				props: segment.props,
			},
			{
				startId: midId,
				endId,
				interior: segment.interior.slice(splitIndex + 1),
				props: segment.props,
			},
		)
	}
	return result
}

// --- graph assembly ----------------------------------------------------------

export function buildRoadGraphFromSegments(
	segments: OsmSegment[],
	nodePositions: Map<string, PlanPoint>,
): { graph: RoadNetworkGraph; bridgeEdgeIds: Set<string> } {
	const graph = createEmptyRoadGraph()
	const bridgeEdgeIds = new Set<string>()
	const nodeAllBridge = new Map<string, boolean>()
	for (const segment of segments) {
		for (const id of [segment.startId, segment.endId]) {
			nodeAllBridge.set(
				id,
				(nodeAllBridge.get(id) ?? true) && segment.props.isBridge,
			)
		}
	}
	for (const [id, allBridge] of nodeAllBridge) {
		const point = nodePositions.get(id)!
		const node: RoadGraphNode = {
			id,
			position: [point[0], 0, point[1]],
			level: 0,
			elevationMode: allBridge ? 'bridge' : 'ground',
			terminal: false,
		}
		graph.graphNodes[id] = node
	}
	const importedStyles = new Map<string, string>()
	segments.forEach((segment, index) => {
		const id = `e${index + 1}`
		let styleId = segment.props.styleId
		if (segment.props.style) {
			const key = JSON.stringify(segment.props.style)
			styleId = importedStyles.get(key) ?? `osm-${importedStyles.size + 1}`
			importedStyles.set(key, styleId)
			graph.stylePresets[styleId] = { ...segment.props.style, id: styleId }
		}
		const edge: RoadGraphEdge = {
			id,
			startNodeId: segment.startId,
			endNodeId: segment.endId,
			alignment: segment.interior.map((point) => [point[0], 0, point[1]]),
			profileMode: 'legacy',
			verticalProfile: [],
			styleId,
			direction: segment.props.direction,
			roadClass: segment.props.roadClass,
			joinMode: 'auto',
			stackLevel: segment.props.stackLevel,
		}
		graph.edges[id] = edge
		if (segment.props.isBridge) bridgeEdgeIds.add(id)
	})
	return { graph, bridgeEdgeIds }
}

/**
 * Bake sampled ground elevation into node positions and alignment points.
 * Bridge decks interpolate linearly between their endpoints instead of
 * draping over the terrain they span.
 */
export function applyElevations(
	graph: RoadNetworkGraph,
	bridgeEdgeIds: Set<string>,
	elevationAt: (x: number, z: number) => number,
): void {
	for (const node of Object.values(graph.graphNodes)) {
		node.position = [
			node.position[0],
			elevationAt(node.position[0], node.position[2]),
			node.position[2],
		]
	}
	for (const edge of Object.values(graph.edges)) {
		if (edge.alignment.length === 0) continue
		const start = graph.graphNodes[edge.startNodeId]!.position
		const end = graph.graphNodes[edge.endNodeId]!.position
		if (bridgeEdgeIds.has(edge.id)) {
			const path: PlanPoint[] = [
				[start[0], start[2]],
				...edge.alignment.map((p): PlanPoint => [p[0], p[2]]),
				[end[0], end[2]],
			]
			const total = Math.max(pathLength(path), 1e-6)
			let travelled = 0
			edge.alignment = edge.alignment.map((point, index) => {
				travelled += distance(path[index]!, path[index + 1]!)
				const t = travelled / total
				return [point[0], start[1] + (end[1] - start[1]) * t, point[2]]
			})
		} else {
			edge.alignment = edge.alignment.map((point) => [
				point[0],
				elevationAt(point[0], point[2]),
				point[2],
			])
		}
	}
}

type AssembledImport = {
	componentCount: number
	graphs: RoadNetworkGraph[]
}

function countImportJunctions(graphs: RoadNetworkGraph[]): number {
	return graphs.reduce((sum, component) => {
		const incident = new Map<string, number>()
		for (const edge of Object.values(component.edges)) {
			incident.set(edge.startNodeId, (incident.get(edge.startNodeId) ?? 0) + 1)
			incident.set(edge.endNodeId, (incident.get(edge.endNodeId) ?? 0) + 1)
		}
		return sum + [...incident.values()].filter((count) => count >= 3).length
	}, 0)
}

function createImportResult(
	prepared: PreparedOsmImport,
	assembly: AssembledImport,
	assets: OsmImportedPointAsset[],
	baseElevation: number | null,
	failedElevationTiles: number,
): OsmImportResult {
	return {
		assets,
		graphs: assembly.graphs,
		source: {
			baseElevation,
			center: { ...prepared.center },
			provider: 'openstreetmap',
			radiusMeters: prepared.radiusMeters,
		},
		stats: {
			ways: prepared[PREPARED_IMPORT_DATA].waysCount,
			edges: assembly.graphs.reduce(
				(sum, graph) => sum + Object.keys(graph.edges).length,
				0,
			),
			junctions: countImportJunctions(assembly.graphs),
			components: assembly.graphs.length,
			droppedComponents: assembly.componentCount - assembly.graphs.length,
			failedElevationTiles,
		},
	}
}

function assembleImportGraphs(
	segments: OsmSegment[],
	nodePositions: Map<string, PlanPoint>,
	elevationAt?: (x: number, z: number) => number,
): AssembledImport {
	const { graph, bridgeEdgeIds } = buildRoadGraphFromSegments(
		segments,
		nodePositions,
	)
	if (elevationAt) applyElevations(graph, bridgeEdgeIds, elevationAt)
	reconcileRoadJunctions(graph)
	fitOsmJunctionCorners(graph)
	const errors = validateRoadGraph(graph).filter(
		(issue) => issue.severity === 'error',
	)
	if (errors.length > 0) {
		throw new Error(`Imported street data was invalid: ${errors[0]!.message}`)
	}

	const components = splitRoadGraphComponents(graph)
	const graphs = components.filter(
		(component) =>
			Object.values(component.edges).reduce((sum, edge) => {
				const start = component.graphNodes[edge.startNodeId]!.position
				const end = component.graphNodes[edge.endNodeId]!.position
				return sum + pathLength([
					[start[0], start[2]],
					...edge.alignment.map((p): PlanPoint => [p[0], p[2]]),
					[end[0], end[2]],
				])
			}, 0) >= MIN_COMPONENT_LENGTH_M,
	)
	graphs.sort(
		(a, b) => Object.keys(b.edges).length - Object.keys(a.edges).length,
	)
	if (graphs.length === 0) {
		throw new Error('No streets were found in this area. Try a larger radius.')
	}
	return { componentCount: components.length, graphs }
}

// --- orchestrator --------------------------------------------------------------

export type OsmImportPhase = 'streets' | 'building'

type OsmOperationOptions = {
	onPhase?: (phase: OsmImportPhase) => void
	signal?: AbortSignal
}

export type OsmPrepareOptions = OsmOperationOptions & {
	loadMapData?: (
		bbox: GeoBoundingBox,
		signal?: AbortSignal,
	) => Promise<OsmMapData>
	loadStreets?: (bbox: GeoBoundingBox, signal?: AbortSignal) => Promise<OsmWay[]>
}

export type OsmCompleteOptions = OsmOperationOptions

export type OsmImportOptions = OsmPrepareOptions & OsmCompleteOptions

export async function prepareOsmStreetImport(
	center: GeoPoint,
	radiusMeters: number,
	options: OsmPrepareOptions = {},
): Promise<PreparedOsmImport> {
	const radius = Math.max(
		MIN_IMPORT_RADIUS_M,
		Math.min(MAX_IMPORT_RADIUS_M, radiusMeters),
	)
	options.signal?.throwIfAborted()
	options.onPhase?.('streets')
	const bbox = computeBoundingBox(center, radius)
	const mapData = options.loadMapData
		? await options.loadMapData(bbox, options.signal)
		: options.loadStreets
			? {
					pointFeatures: [],
					ways: await options.loadStreets(bbox, options.signal),
				}
			: await fetchOsmMapData(bbox, options.signal)
	const { pointFeatures, ways } = mapData
	options.signal?.throwIfAborted()
	const { segments: rawSegments, nodePositions } = buildSegmentsFromWays(
		ways,
		center,
		radius,
	)
	if (rawSegments.length === 0) {
		throw new Error('No streets were found in this area. Try a different location or a larger radius.')
	}
	if (rawSegments.length > MAX_IMPORT_SEGMENTS) {
		throw new Error(
			`This area has ${rawSegments.length} road segments (limit ${MAX_IMPORT_SEGMENTS}). Reduce the radius and try again.`,
		)
	}
	const segments = ensureSimpleSegments(rawSegments, nodePositions)
	const previewAssembly = assembleImportGraphs(segments, nodePositions)
	const includedEdgeIds = new Set(
		previewAssembly.graphs.flatMap((graph) => Object.keys(graph.edges)),
	)
	const paths = segments.flatMap((segment, index): OsmStreetPreviewPath[] =>
		includedEdgeIds.has(`e${index + 1}`)
			? [
					{
						points: segmentPath(segment, nodePositions).map((point) =>
							localToGeo(point, center),
						),
						roadClass: segment.props.roadClass,
					},
				]
			: [],
	)
	const previewAssets = buildOsmPointAssets(
		pointFeatures,
		(point) => projectToLocal(point, center),
		radius,
	)
	const mappedObjects = pointFeatures.flatMap((feature): OsmStreetPreviewObject[] => {
		const [x, z] = projectToLocal(feature.point, center)
		return Math.hypot(x, z) <= radius
			? [{ kind: feature.kind, point: feature.point, sourceId: feature.sourceId }]
			: []
	})
	return {
		center: { ...center },
		preview: {
			assetCounts: countOsmPointAssets(previewAssets),
			mappedObjects,
			paths,
			segmentCount: paths.length,
			wayCount: ways.length,
		},
		radiusMeters: radius,
		[PREPARED_IMPORT_DATA]: {
			componentCount: previewAssembly.componentCount,
			nodePositions,
			pointFeatures,
			previewGraphs: previewAssembly.graphs,
			segments,
			waysCount: ways.length,
		},
	}
}

/** Build the editor-space graph used for duplicate checks without fetching elevation. */
export function getPreparedOsmStreetImportResult(
	prepared: PreparedOsmImport,
): OsmImportResult {
	const { componentCount, previewGraphs } = prepared[PREPARED_IMPORT_DATA]
	const previewAssets = buildOsmPointAssets(
		prepared[PREPARED_IMPORT_DATA].pointFeatures,
		(point) => projectToLocal(point, prepared.center),
		prepared.radiusMeters,
	)
	return createImportResult(
		prepared,
		{ componentCount, graphs: previewGraphs },
		previewAssets,
		null,
		0,
	)
}

export async function completeOsmStreetImport(
	prepared: PreparedOsmImport,
	options: OsmCompleteOptions = {},
): Promise<OsmImportResult> {
	const { center, radiusMeters: radius } = prepared
	const { nodePositions, pointFeatures, segments } = prepared[PREPARED_IMPORT_DATA]
	options.signal?.throwIfAborted()

	options.onPhase?.('building')
	options.signal?.throwIfAborted()
	const { componentCount, graphs } = assembleImportGraphs(
		segments,
		nodePositions,
	)
	const assets = buildOsmPointAssets(
		pointFeatures,
		(point) => projectToLocal(point, center),
		radius,
	)

	return createImportResult(
		prepared,
		{ componentCount, graphs },
		assets,
		null,
		0,
	)
}

export async function importStreetsFromOsm(
	center: GeoPoint,
	radiusMeters: number,
	options: OsmImportOptions = {},
): Promise<OsmImportResult> {
	const prepared = await prepareOsmStreetImport(center, radiusMeters, options)
	return completeOsmStreetImport(prepared, options)
}
