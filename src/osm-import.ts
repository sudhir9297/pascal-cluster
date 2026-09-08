import {
	createEmptyRoadGraph,
	reconcileRoadJunctions,
	splitRoadGraphComponents,
	type RoadNetworkGraph,
} from './road-network-topology'
import { sampleRoadEdgePoints } from './road-network-geometry'
import { validateRoadGraph } from './road-network-validation'
import type { RoadGraphEdge, RoadGraphNode, RoadStylePreset } from './schema'
import { buildOsmRoadStyle } from './osm-road-style'
import { fitOsmJunctionCorners } from './osm-junctions'
import type { GeoBoundingBox, GeoPoint } from './osm-elevation'
import { TerrainSampler } from './osm-elevation'
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

/**
 * OSM stores wikipedia links as `language:Article_title`, while Pascal's scene
 * validator treats a `wikipedia` field as a URL. Convert the OSM convention at
 * the ingestion boundary so otherwise valid imports remain persistable.
 */
export function normalizeOsmTags(tags: Record<string, string>): Record<string, string> {
	const normalized = { ...tags }
	const wikipedia = normalized.wikipedia?.trim()
	if (wikipedia && /^https:\/\//i.test(wikipedia)) {
		normalized.wikipedia = wikipedia
	} else if (wikipedia) {
		const article = wikipedia.match(/^([a-z]{2,3}(?:-[a-z0-9]+)*):(.+)$/i)
		if (article) {
			normalized.wikipedia = `https://${article[1]!.toLowerCase()}.wikipedia.org/wiki/${encodeURIComponent(article[2]!).replace(/%2F/gi, '/')}`
		} else {
			delete normalized.wikipedia
		}
	}
	for (const [key, value] of Object.entries(normalized)) {
		if (/^https?:\/\//i.test(value)) continue
		// Values such as `US:NY` and `Category:Roads` are OSM identifiers, not URLs.
		if (/^[a-z][a-z0-9+.-]*:/i.test(value)) normalized[key] = value.replace(':', '%3A')
	}
	return normalized
}

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
	osmVertical: RoadGraphEdge['osmVertical']
}

type PlanPoint = readonly [number, number]

export type OsmSegment = {
	startId: string
	endId: string
	interior: PlanPoint[]
	props: OsmRoadProps
	osmSource?: RoadGraphEdge['osmSource']
	turnLanes?: RoadGraphEdge['turnLanes']
	osmVertical?: RoadGraphEdge['osmVertical']
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
	mappedSurfaces?: OsmMappedSurface[]
	crossings?: OsmCrossingFeature[]
	laneConnectivity?: OsmLaneConnectivityRelation[]
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
		mappedSurfaces: OsmMappedSurface[]
		crossings: OsmCrossingFeature[]
		laneConnectivity: OsmLaneConnectivityRelation[]
		previewGraphs: RoadNetworkGraph[]
		segments: OsmSegment[]
		waysCount: number
		loadTerrain: boolean
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
	return `[out:json][timeout:25];(way["highway"~"${IMPORTED_HIGHWAY_PATTERN}"]["area"!="yes"](${box});way["area:highway"](${box});relation["area:highway"](${box});way["highway"="footway"]["footway"~"^(sidewalk|crossing)$"](${box});way["highway"~"^(footway|path)$"]["sidewalk"](${box});way["highway"="cycleway"](${box});way["highway"="pedestrian"](${box});way["barrier"="kerb"](${box});node["barrier"="kerb"](${box});node["highway"="street_lamp"](${box});node["highway"="traffic_signals"](${box});node["traffic_sign"](${box});node["highway"~"^(stop|give_way|crossing)$"](${box});node["crossing"](${box});relation["type"="connectivity"](${box}););out geom;`
}

function parseRawWays(payload: unknown): OsmWay[] {
	const elements = (payload as { elements?: unknown[] })?.elements
	if (!Array.isArray(elements)) return []
	return elements.flatMap((element) => {
		const way = element as { type?: string; id?: number; tags?: Record<string, string>; nodes?: number[]; geometry?: Array<{ lat: number; lon: number } | null> }
		if (way.type !== 'way' || !way.geometry || !way.nodes || !way.tags || way.geometry.length !== way.nodes.length) return []
		const points = way.geometry.flatMap((geo, index) => geo && Number.isFinite(geo.lat) && Number.isFinite(geo.lon) ? [{ lat: geo.lat, lon: geo.lon, nodeId: way.nodes![index]! }] : [])
		return points.length >= 2 ? [{ id: way.id ?? 0, tags: normalizeOsmTags(way.tags), points }] : []
	})
}

export function parseOverpassResponse(payload: unknown): OsmWay[] {
	return parseRawWays(payload).filter((way) =>
		HIGHWAY_CLASS_MAP[way.tags.highway ?? ''] !== undefined &&
		way.tags.area !== 'yes' &&
		way.tags['area:highway'] === undefined,
	)
}

export type OsmMappedSurface = {
	id: number
	kind: 'road-area' | 'sidewalk' | 'cycleway' | 'pedestrian-area' | 'kerb' | 'crossing'
	partIndex?: number
	sourceType?: 'way' | 'relation'
	tags: Record<string, string>
	points: Array<GeoPoint & { nodeId: number }>
	holes?: Array<Array<GeoPoint & { nodeId: number }>>
}

function mappedSurfaceKind(tags: Record<string, string>, closed: boolean): OsmMappedSurface['kind'] | null {
	if (tags['area:highway'] && closed) return 'road-area'
	if (tags.barrier === 'kerb') return 'kerb'
	if (tags.highway === 'cycleway') return 'cycleway'
	if (tags.highway === 'pedestrian' && (closed || tags.area === 'yes')) return 'pedestrian-area'
	if (tags.highway === 'footway' && tags.footway === 'crossing') return 'crossing'
	if (
		(tags.highway === 'footway' && tags.footway === 'sidewalk') ||
		(/^(footway|path)$/.test(tags.highway ?? '') && tags.sidewalk !== undefined)
	) return 'sidewalk'
	return null
}

type RawRelationMember = {
	geometry?: Array<{ lat: number; lon: number } | null>
	ref?: number
	role?: string
	type?: string
}

function sameGeo(first: GeoPoint, second: GeoPoint): boolean {
	return Math.abs(first.lat - second.lat) <= 1e-8 && Math.abs(first.lon - second.lon) <= 1e-8
}

function relationRings(
	relationId: number,
	members: RawRelationMember[],
	role: 'inner' | 'outer',
): Array<Array<GeoPoint & { nodeId: number }>> {
	const pending = members.flatMap((member, memberIndex) => {
		const memberRole = member.role === 'inner' ? 'inner' : 'outer'
		if (member.type !== 'way' || memberRole !== role || !member.geometry) return []
		const points = member.geometry.flatMap((point, pointIndex) =>
			point && Number.isFinite(point.lat) && Number.isFinite(point.lon)
				? [{ ...point, nodeId: -(relationId * 100000 + memberIndex * 1000 + pointIndex + 1) }]
				: [],
		)
		return points.length >= 2 ? [points] : []
	})
	const rings: Array<Array<GeoPoint & { nodeId: number }>> = []
	while (pending.length > 0) {
		const ring = [...pending.shift()!]
		let joined = true
		while (joined && ring.length >= 2 && !sameGeo(ring[0]!, ring.at(-1)!)) {
			joined = false
			for (let index = 0; index < pending.length; index += 1) {
				const candidate = pending[index]!
				if (sameGeo(ring.at(-1)!, candidate[0]!)) ring.push(...candidate.slice(1))
				else if (sameGeo(ring.at(-1)!, candidate.at(-1)!)) ring.push(...[...candidate].reverse().slice(1))
				else if (sameGeo(ring[0]!, candidate.at(-1)!)) ring.unshift(...candidate.slice(0, -1))
				else if (sameGeo(ring[0]!, candidate[0]!)) ring.unshift(...[...candidate].reverse().slice(0, -1))
				else continue
				pending.splice(index, 1)
				joined = true
				break
			}
		}
		if (ring.length >= 4 && sameGeo(ring[0]!, ring.at(-1)!)) rings.push(ring)
	}
	return rings
}

function geoPointInRing(point: GeoPoint, ring: GeoPoint[]): boolean {
	let inside = false
	for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
		const currentPoint = ring[index]!
		const previousPoint = ring[previous]!
		if (
			(currentPoint.lat > point.lat) !== (previousPoint.lat > point.lat) &&
			point.lon < (previousPoint.lon - currentPoint.lon) * (point.lat - currentPoint.lat) /
				(previousPoint.lat - currentPoint.lat) + currentPoint.lon
		) inside = !inside
	}
	return inside
}

export function parseOsmMappedSurfaces(payload: unknown): OsmMappedSurface[] {
	const ways = parseRawWays(payload).flatMap((way): OsmMappedSurface[] => {
		const { tags } = way
		const closed = way.points.length >= 3 && way.points[0]!.nodeId === way.points.at(-1)!.nodeId
		const kind = mappedSurfaceKind(tags, closed)
		return kind ? [{ id: way.id, kind, sourceType: 'way', tags: { ...tags }, points: way.points }] : []
	})
	const elements = (payload as { elements?: unknown[] })?.elements
	const relations = !Array.isArray(elements) ? [] : elements.flatMap((element): OsmMappedSurface[] => {
		const relation = element as { type?: string; id?: number; tags?: Record<string, string>; members?: RawRelationMember[] }
		if (relation.type !== 'relation' || !relation.id || !relation.tags?.['area:highway'] || !relation.members) return []
		const holes = relationRings(relation.id, relation.members, 'inner')
		return relationRings(relation.id, relation.members, 'outer').map((points, partIndex) => ({
			id: relation.id!,
			kind: 'road-area' as const,
			holes: holes.filter((hole) => hole[0] && geoPointInRing(hole[0], points)),
			partIndex,
			points,
			sourceType: 'relation' as const,
			tags: normalizeOsmTags(relation.tags!),
		}))
	})
	return [...ways, ...relations]
}

export type OsmMapData = {
	pointFeatures: OsmPointFeature[]
	ways: OsmWay[]
	mappedSurfaces?: OsmMappedSurface[]
	crossings?: OsmCrossingFeature[]
	laneConnectivity?: OsmLaneConnectivityRelation[]
}

export type OsmLaneConnectivityRelation = {
	id: number
	members: Array<{ type: 'node' | 'way' | 'relation'; ref: number; role: string }>
	tags: Record<string, string>
}

export function parseOsmLaneConnectivity(payload: unknown): OsmLaneConnectivityRelation[] {
	const elements = (payload as { elements?: unknown[] })?.elements
	if (!Array.isArray(elements)) return []
	return elements.flatMap((element): OsmLaneConnectivityRelation[] => {
		const relation = element as {
			type?: string
			id?: number
			tags?: Record<string, string>
			members?: Array<{ type?: string; ref?: number; role?: string }>
		}
		if (relation.type !== 'relation' || !relation.id || relation.tags?.type !== 'connectivity' || !relation.members) return []
		const members = relation.members.flatMap((member) =>
			(member.type === 'node' || member.type === 'way' || member.type === 'relation') && Number.isFinite(member.ref)
				? [{ type: member.type as 'node' | 'way' | 'relation', ref: member.ref!, role: member.role ?? '' }]
				: [],
		)
		return [{ id: relation.id, members, tags: normalizeOsmTags(relation.tags) }]
	})
}

export type OsmCrossingFeature = {
	id: number
	kind?: 'crossing' | 'kerb'
	point: GeoPoint
	tags: Record<string, string>
}

export function parseOsmCrossingFeatures(payload: unknown): OsmCrossingFeature[] {
	const elements = (payload as { elements?: unknown[] })?.elements
	if (!Array.isArray(elements)) return []
	return elements.flatMap((element) => {
		const node = element as { type?: string; id?: number; lat?: number; lon?: number; tags?: Record<string, string> }
		if (node.type !== 'node' || !Number.isFinite(node.id) || !Number.isFinite(node.lat) || !Number.isFinite(node.lon) || !node.tags) return []
		const crossing = node.tags.highway === 'crossing' || node.tags.crossing !== undefined
		const loweredKerb = node.tags.barrier === 'kerb' && ['lowered', 'flush', 'no'].includes(node.tags.kerb ?? '')
		if (!crossing && !loweredKerb) return []
		return [{ id: node.id!, kind: crossing ? 'crossing' : 'kerb', point: { lat: node.lat!, lon: node.lon! }, tags: normalizeOsmTags(node.tags) }]
	})
}

export function parseOsmMapResponse(payload: unknown): OsmMapData {
	return {
		pointFeatures: parseOsmPointFeatures(payload),
		ways: parseOverpassResponse(payload),
		mappedSurfaces: parseOsmMappedSurfaces(payload),
		crossings: parseOsmCrossingFeatures(payload),
		laneConnectivity: parseOsmLaneConnectivity(payload),
	}
}

export async function fetchOsmMapData(
	bbox: GeoBoundingBox,
	signal?: AbortSignal,
): Promise<OsmMapData> {
	return fetchOsmMapDataResilient(bbox, signal, 0)
}

async function fetchOsmMapDataResilient(
	bbox: GeoBoundingBox,
	signal: AbortSignal | undefined,
	depth: number,
): Promise<OsmMapData> {
	try {
		return await fetchOsmMapDataRequest(bbox, signal)
	} catch (error) {
		if (signal?.aborted || depth >= 2 || !(error instanceof OsmStreetRequestError) || ![502, 503, 504].includes(error.status)) throw error
		const chunks = splitOsmBoundingBox(bbox)
		return mergeOsmMapData(await Promise.all(chunks.map((chunk) => fetchOsmMapDataResilient(chunk, signal, depth + 1))))
	}
}

class OsmStreetRequestError extends Error {
	constructor(readonly status: number) {
		super(`Street data request failed (HTTP ${status}).`)
	}
}

async function fetchOsmMapDataRequest(
	bbox: GeoBoundingBox,
	signal?: AbortSignal,
): Promise<OsmMapData> {
	const request = getStreetRequest(bbox, buildOverpassQuery(bbox))
	const response = await fetch(request.url, { ...request.init, signal })
	if (response.status === 429) {
		throw new Error('The street data service is busy. Try again in a minute.')
	}
	if (!response.ok) {
		throw new OsmStreetRequestError(response.status)
	}
	return parseOsmMapResponse(await response.json())
}

export function splitOsmBoundingBox(bbox: GeoBoundingBox): GeoBoundingBox[] {
	const latitude = (bbox.south + bbox.north) / 2
	const longitude = (bbox.west + bbox.east) / 2
	return [
		{ south: bbox.south, west: bbox.west, north: latitude, east: longitude },
		{ south: bbox.south, west: longitude, north: latitude, east: bbox.east },
		{ south: latitude, west: bbox.west, north: bbox.north, east: longitude },
		{ south: latitude, west: longitude, north: bbox.north, east: bbox.east },
	]
}

export function mergeOsmMapData(parts: OsmMapData[]): OsmMapData {
	const bestWays = new Map<number, OsmWay>()
	for (const way of parts.flatMap((part) => part.ways)) {
		const existing = bestWays.get(way.id)
		if (!existing || way.points.length > existing.points.length) bestWays.set(way.id, way)
	}
	const surfaces = new Map<string, OsmMappedSurface>()
	for (const surface of parts.flatMap((part) => part.mappedSurfaces ?? [])) {
		const key = `${surface.sourceType ?? 'way'}:${surface.id}:${surface.partIndex ?? 0}:${surface.kind}`
		const existing = surfaces.get(key)
		if (!existing || surface.points.length > existing.points.length) surfaces.set(key, surface)
	}
	const points = new Map<string, OsmPointFeature>()
	for (const feature of parts.flatMap((part) => part.pointFeatures)) points.set(feature.sourceId, feature)
	const crossings = new Map<number, OsmCrossingFeature>()
	for (const crossing of parts.flatMap((part) => part.crossings ?? [])) crossings.set(crossing.id, crossing)
	const connectivity = new Map<number, OsmLaneConnectivityRelation>()
	for (const relation of parts.flatMap((part) => part.laneConnectivity ?? [])) connectivity.set(relation.id, relation)
	return {
		ways: [...bestWays.values()],
		mappedSurfaces: [...surfaces.values()],
		pointFeatures: [...points.values()],
		crossings: [...crossings.values()],
		laneConnectivity: [...connectivity.values()],
	}
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
	const ele = Number.parseFloat(tags.ele ?? '')
	return {
		...entry,
		direction,
		style: buildOsmRoadStyle(tags, entry.styleId, direction !== 'both'),
		isBridge: Boolean(tags.bridge) && tags.bridge !== 'no',
		stackLevel: Math.max(0, Number.isFinite(layer) ? layer : 0),
		osmVertical: {
			...(Number.isFinite(layer) ? { layer } : {}),
			...(Number.isFinite(ele) ? { ele } : {}),
			...(tags.bridge && tags.bridge !== 'no' ? { bridge: true } : {}),
			...(tags.tunnel && tags.tunnel !== 'no' ? { tunnel: true } : {}),
		},
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
	const runsWithProps: Array<{ run: RunPoint[]; props: OsmRoadProps; way: OsmWay }> = []
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
			runsWithProps.push({ run, props, way })
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
	for (const { run, props, way } of runsWithProps) {
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
				osmSource: {
					wayId: way.id,
					nodeIds: way.points.map((point) => point.nodeId),
					tags: { ...way.tags },
				},
				turnLanes: {
					start: startId === `n${way.points[0]?.nodeId}` && props.direction !== 'forward'
						? way.tags['turn:lanes:backward'] ?? (props.direction === 'reverse' ? way.tags['turn:lanes'] : undefined)
						: undefined,
					end: endId === `n${way.points.at(-1)?.nodeId}` && props.direction !== 'reverse'
						? way.tags['turn:lanes:forward'] ?? (props.direction === 'forward' ? way.tags['turn:lanes'] : undefined)
						: undefined,
				},
				osmVertical: props.osmVertical,
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
				osmSource: segment.osmSource,
				turnLanes: segment.turnLanes ? { start: segment.turnLanes.start } : undefined,
				osmVertical: segment.osmVertical,
				props: segment.props,
			},
			{
				startId: midId,
				endId,
				interior: segment.interior.slice(splitIndex + 1),
				osmSource: segment.osmSource,
				turnLanes: segment.turnLanes ? { end: segment.turnLanes.end } : undefined,
				osmVertical: segment.osmVertical,
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
			osmSource: segment.osmSource,
			turnLanes: segment.turnLanes,
			osmVertical: segment.osmVertical,
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
		edge.verticalSource = { kind: 'terrain' }
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

/** Apply explicit OSM elevations as a constrained profile relative to the import origin. */
export function applyOsmElevationFacts(
	graph: RoadNetworkGraph,
	baseElevation: number,
): void {
	const incident = new Map<string, RoadGraphEdge[]>()
	for (const edge of Object.values(graph.edges)) {
		for (const nodeId of [edge.startNodeId, edge.endNodeId]) {
			const edges = incident.get(nodeId) ?? []
			edges.push(edge)
			incident.set(nodeId, edges)
		}
	}
	for (const [nodeId, edges] of incident) {
		const elevations = edges.flatMap((edge) => Number.isFinite(edge.osmVertical?.ele) ? [edge.osmVertical!.ele!] : [])
		if (elevations.length !== edges.length || elevations.length === 0) continue
		if (Math.max(...elevations) - Math.min(...elevations) > 0.5) continue
		const node = graph.graphNodes[nodeId]
		if (!node) continue
		const elevation = elevations.reduce((sum, value) => sum + value, 0) / elevations.length - baseElevation
		node.position = [node.position[0], elevation, node.position[2]]
	}
	for (const edge of Object.values(graph.edges)) {
		const mappedElevation = edge.osmVertical?.ele
		if (!Number.isFinite(mappedElevation)) continue
		const start = graph.graphNodes[edge.startNodeId]
		const end = graph.graphNodes[edge.endNodeId]
		if (!start || !end) continue
		const target = mappedElevation! - baseElevation
		const points: PlanPoint[] = [
			[start.position[0], start.position[2]],
			...edge.alignment.map((point): PlanPoint => [point[0], point[2]]),
			[end.position[0], end.position[2]],
		]
		const total = pathLength(points)
		if (total <= 1e-6) continue
		const inset = Math.min(10, total * 0.25)
		edge.profileMode = 'designed'
		edge.verticalSource = { kind: 'mapped' }
		edge.verticalProfile = total > inset * 2 + 0.1
			? [
					{ id: `osm-ele-${edge.id}-start`, station: inset, elevation: target, curveLength: Math.min(10, inset * 2) },
					{ id: `osm-ele-${edge.id}-end`, station: total - inset, elevation: target, curveLength: Math.min(10, inset * 2) },
				]
			: [{ id: `osm-ele-${edge.id}`, station: total / 2, elevation: target, curveLength: Math.min(10, total * 0.5) }]
	}
}

function planSegmentIntersection(
	firstStart: readonly [number, number, number],
	firstEnd: readonly [number, number, number],
	secondStart: readonly [number, number, number],
	secondEnd: readonly [number, number, number],
): { firstMix: number; secondMix: number } | null {
	const ax = firstEnd[0] - firstStart[0]
	const az = firstEnd[2] - firstStart[2]
	const bx = secondEnd[0] - secondStart[0]
	const bz = secondEnd[2] - secondStart[2]
	const denominator = ax * bz - az * bx
	if (Math.abs(denominator) <= 1e-8) return null
	const dx = secondStart[0] - firstStart[0]
	const dz = secondStart[2] - firstStart[2]
	const firstMix = (dx * bz - dz * bx) / denominator
	const secondMix = (dx * az - dz * ax) / denominator
	return firstMix > 1e-4 && firstMix < 1 - 1e-4 && secondMix > 1e-4 && secondMix < 1 - 1e-4
		? { firstMix, secondMix }
		: null
}

/** Build conservative bridge and tunnel profiles where mapped structures cross ordinary roads. */
export function applyOsmStructureClearances(
	graph: RoadNetworkGraph,
	clearanceMeters = 4.5,
): void {
	const edges = Object.values(graph.edges)
	for (const structure of edges) {
		const isBridge = structure.osmVertical?.bridge === true
		const isTunnel = structure.osmVertical?.tunnel === true
		if ((!isBridge && !isTunnel) || structure.verticalSource?.kind === 'mapped') continue
		const structurePoints = sampleRoadEdgePoints(graph, structure, 48)
		if (structurePoints.length < 2) continue
		let travelled = 0
		const controls: Array<{ station: number; elevation: number }> = []
		for (let structureIndex = 0; structureIndex < structurePoints.length - 1; structureIndex += 1) {
			const start = structurePoints[structureIndex]!
			const end = structurePoints[structureIndex + 1]!
			const segmentLength = Math.hypot(end[0] - start[0], end[2] - start[2])
			for (const other of edges) {
				if (other.id === structure.id || other.osmVertical?.bridge || other.osmVertical?.tunnel) continue
				const otherPoints = sampleRoadEdgePoints(graph, other, 48)
				for (let otherIndex = 0; otherIndex < otherPoints.length - 1; otherIndex += 1) {
					const otherStart = otherPoints[otherIndex]!
					const otherEnd = otherPoints[otherIndex + 1]!
					const crossing = planSegmentIntersection(start, end, otherStart, otherEnd)
					if (!crossing) continue
					const structureElevation = start[1] + (end[1] - start[1]) * crossing.firstMix
					const otherElevation = otherStart[1] + (otherEnd[1] - otherStart[1]) * crossing.secondMix
					const required = isBridge ? otherElevation + clearanceMeters : otherElevation - clearanceMeters
					if ((isBridge && structureElevation >= required) || (isTunnel && structureElevation <= required)) continue
					controls.push({ station: travelled + segmentLength * crossing.firstMix, elevation: required })
				}
			}
			travelled += segmentLength
		}
		if (controls.length === 0) continue
		structure.profileMode = 'designed'
		structure.verticalSource = { kind: 'estimated', clearanceMeters }
		structure.verticalProfile = controls
			.sort((first, second) => first.station - second.station)
			.filter((control, index, all) => index === 0 || control.station - all[index - 1]!.station > 0.5)
			.map((control, index) => ({
				id: `osm-clearance-${structure.id}-${index + 1}`,
				station: control.station,
				elevation: control.elevation,
				curveLength: Math.min(30, Math.max(6, clearanceMeters * 4)),
			}))
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
		mappedSurfaces: prepared[PREPARED_IMPORT_DATA].mappedSurfaces,
		crossings: prepared[PREPARED_IMPORT_DATA].crossings,
		laneConnectivity: prepared[PREPARED_IMPORT_DATA].laneConnectivity,
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
	baseElevation?: number,
): AssembledImport {
	const { graph, bridgeEdgeIds } = buildRoadGraphFromSegments(
		segments,
		nodePositions,
	)
	if (elevationAt) applyElevations(graph, bridgeEdgeIds, elevationAt)
	if (baseElevation !== undefined) applyOsmElevationFacts(graph, baseElevation)
	applyOsmStructureClearances(graph)
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
	loadTerrain?: boolean
	loadMapData?: (
		bbox: GeoBoundingBox,
		signal?: AbortSignal,
	) => Promise<OsmMapData>
	loadStreets?: (bbox: GeoBoundingBox, signal?: AbortSignal) => Promise<OsmWay[]>
}

export type OsmTerrainSampler = Pick<TerrainSampler, 'elevationAt' | 'failedTiles' | 'prefetch' | 'successfulTiles'> & {
	hasElevationAt?: (point: GeoPoint) => boolean
}

export type OsmCompleteOptions = OsmOperationOptions & {
	terrainSampler?: OsmTerrainSampler
}

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
					mappedSurfaces: [],
					crossings: [],
					laneConnectivity: [],
					ways: await options.loadStreets(bbox, options.signal),
				}
			: await fetchOsmMapData(bbox, options.signal)
	const { pointFeatures, mappedSurfaces = [], crossings = [], laneConnectivity = [], ways } = mapData
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
			mappedSurfaces,
			crossings,
			laneConnectivity,
			nodePositions,
			pointFeatures,
			previewGraphs: previewAssembly.graphs,
			segments,
			waysCount: ways.length,
			loadTerrain: options.loadTerrain ?? (!options.loadMapData && !options.loadStreets),
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
	const { loadTerrain, nodePositions, pointFeatures, segments } = prepared[PREPARED_IMPORT_DATA]
	options.signal?.throwIfAborted()

	options.onPhase?.('building')
	options.signal?.throwIfAborted()
	let baseElevation: number | null = null
	let failedElevationTiles = 0
	let elevationAt: ((x: number, z: number) => number) | undefined
	if (loadTerrain) {
		const sampler = options.terrainSampler ?? new TerrainSampler()
		await sampler.prefetch(computeBoundingBox(center, radius), options.signal)
		failedElevationTiles = sampler.failedTiles
		if (sampler.successfulTiles > 0 && sampler.hasElevationAt?.(center) !== false) {
			baseElevation = sampler.elevationAt(center)
			elevationAt = (x, z) => {
				const point = localToGeo([x, z], center)
				return sampler.hasElevationAt?.(point) === false
					? 0
					: sampler.elevationAt(point) - baseElevation!
			}
		}
	}
	const { componentCount, graphs } = assembleImportGraphs(
		segments,
		nodePositions,
		elevationAt,
		baseElevation ?? undefined,
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
		baseElevation,
		failedElevationTiles,
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
