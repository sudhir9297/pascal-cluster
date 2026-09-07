import { sampleRoadEdgePoints } from './road-network-geometry'
import {
	reconcileRoadJunctions,
	splitRoadGraphComponents,
	type RoadNetworkGraph,
} from './road-network-topology'
import type { GeoPoint } from './osm-elevation'
import { projectToLocal, type OsmImportResult } from './osm-import'
import type { RoadGraphEdge, RoadGraphNode, RoadNetworkNode } from './schema'

const MATCH_TOLERANCE_M = 0.75
const MATCH_ANGLE_DEGREES = 25
const CLIP_INTERVAL_M = 1.5
const MIN_FRAGMENT_LENGTH_M = 2.5
const INDEX_CELL_SIZE_M = 12

export const MAP_IMPORT_METADATA_KEY = 'streetscapeMapImport'
export const OSM_FEATURE_METADATA_KEY = 'streetscapeOsmFeature'

export type MapImportOrigin = {
	baseElevation: number | null
	center: GeoPoint
}

export type OsmImportReview = {
	duplicateAssets: number
	duplicateSegments: number
	incomingAssets: number
	incomingSegments: number
	newAssets: number
	newSegments: number
	origin: MapImportOrigin
	result: OsmImportResult
	trimmedSegments: number
}

type ExistingRoadNetwork = RoadNetworkGraph &
	Pick<RoadNetworkNode, 'metadata'>

export type OsmImportSceneContext = {
	featureSourceIds: ReadonlySet<string>
	networks: readonly ExistingRoadNetwork[]
}

type Point3 = readonly [number, number, number]

type IndexedSegment = {
	a: Point3
	b: Point3
	stackLevel: number
}

type SegmentIndex = {
	cells: Map<string, IndexedSegment[]>
	segmentCount: number
}

function countEdges(graphs: readonly RoadNetworkGraph[]): number {
	return graphs.reduce((sum, graph) => sum + Object.keys(graph.edges).length, 0)
}

function countJunctions(graphs: readonly RoadNetworkGraph[]): number {
	return graphs.reduce(
		(sum, graph) =>
			sum +
			Object.values(graph.graphNodes).filter((node) => {
				let degree = 0
				for (const edge of Object.values(graph.edges)) {
					if (edge.startNodeId === node.id || edge.endNodeId === node.id) degree += 1
				}
				return degree >= 3
			}).length,
		0,
	)
}

function metadataOrigin(network: ExistingRoadNetwork): MapImportOrigin | null {
	const metadata = network.metadata
	if (!(metadata && typeof metadata === 'object' && !Array.isArray(metadata))) return null
	const candidate = (metadata as Record<string, unknown>)[MAP_IMPORT_METADATA_KEY]
	if (!(candidate && typeof candidate === 'object' && !Array.isArray(candidate))) {
		return null
	}
	const record = candidate as Record<string, unknown>
	const center = record.origin
	if (!(center && typeof center === 'object' && !Array.isArray(center))) return null
	const lat = (center as Record<string, unknown>).lat
	const lon = (center as Record<string, unknown>).lon
	if (!(typeof lat === 'number' && Number.isFinite(lat))) return null
	if (!(typeof lon === 'number' && Number.isFinite(lon))) return null
	const elevation = record.originElevation
	return {
		baseElevation:
			typeof elevation === 'number' && Number.isFinite(elevation) ? elevation : null,
		center: { lat, lon },
	}
}

/** Reuse the first georeferenced map import as the level's geographic origin. */
export function findMapImportOrigin(
	existingNetworks: readonly ExistingRoadNetwork[],
): MapImportOrigin | null {
	for (const network of existingNetworks) {
		const origin = metadataOrigin(network)
		if (origin) return origin
	}
	return null
}

export function createMapImportMetadata(
	previous: RoadNetworkNode['metadata'] | undefined,
	origin: MapImportOrigin,
): RoadNetworkNode['metadata'] {
	const base =
		previous && typeof previous === 'object' && !Array.isArray(previous)
			? previous
			: {}
	return {
		...base,
		[MAP_IMPORT_METADATA_KEY]: {
			origin: { ...origin.center },
			originElevation: origin.baseElevation,
			provider: 'openstreetmap',
		},
	}
}

export function createOsmFeatureMetadata(
	previous: RoadNetworkNode['metadata'] | undefined,
	origin: MapImportOrigin,
	feature: { kind: string; sourceId: string },
): RoadNetworkNode['metadata'] {
	const mapMetadata = createMapImportMetadata(previous, origin) as Record<
		string,
		unknown
	>
	return {
		...mapMetadata,
		[OSM_FEATURE_METADATA_KEY]: {
			kind: feature.kind,
			sourceId: feature.sourceId,
		},
	}
}

export function readOsmFeatureSourceId(metadata: unknown): string | null {
	if (!(metadata && typeof metadata === 'object' && !Array.isArray(metadata))) return null
	const candidate = (metadata as Record<string, unknown>)[OSM_FEATURE_METADATA_KEY]
	if (!(candidate && typeof candidate === 'object' && !Array.isArray(candidate))) {
		return null
	}
	const sourceId = (candidate as Record<string, unknown>).sourceId
	return typeof sourceId === 'string' && sourceId.length > 0 ? sourceId : null
}

function translateGraph(
	graph: RoadNetworkGraph,
	offset: readonly [number, number, number],
): RoadNetworkGraph {
	return {
		...graph,
		graphNodes: Object.fromEntries(
			Object.entries(graph.graphNodes).map(([id, node]) => [
				id,
				{
					...node,
					position: [
						node.position[0] + offset[0],
						node.position[1] + offset[1],
						node.position[2] + offset[2],
					],
				},
			]),
		),
		edges: Object.fromEntries(
			Object.entries(graph.edges).map(([id, edge]) => [
				id,
				{
					...edge,
					alignment: edge.alignment.map(
						(point): [number, number, number] => [
							point[0] + offset[0],
							point[1] + offset[1],
							point[2] + offset[2],
						],
					),
				},
			]),
		),
	}
}

function cell(value: number): number {
	return Math.floor(value / INDEX_CELL_SIZE_M)
}

function cellKey(x: number, z: number): string {
	return `${cell(x)}:${cell(z)}`
}

function buildSegmentIndex(
	networks: readonly RoadNetworkGraph[],
): SegmentIndex {
	const cells = new Map<string, IndexedSegment[]>()
	let segmentCount = 0
	for (const graph of networks) {
		for (const edge of Object.values(graph.edges)) {
			const points = sampleRoadEdgePoints(graph, edge, 32)
			for (let index = 0; index < points.length - 1; index += 1) {
				const a = points[index]!
				const b = points[index + 1]!
				if (Math.hypot(b[0] - a[0], b[2] - a[2]) < 1e-6) continue
				const segment = { a, b, stackLevel: edge.stackLevel }
				segmentCount += 1
				const minX = cell(Math.min(a[0], b[0]) - MATCH_TOLERANCE_M)
				const maxX = cell(Math.max(a[0], b[0]) + MATCH_TOLERANCE_M)
				const minZ = cell(Math.min(a[2], b[2]) - MATCH_TOLERANCE_M)
				const maxZ = cell(Math.max(a[2], b[2]) + MATCH_TOLERANCE_M)
				for (let x = minX; x <= maxX; x += 1) {
					for (let z = minZ; z <= maxZ; z += 1) {
						const key = `${x}:${z}`
						const entries = cells.get(key)
						if (entries) entries.push(segment)
						else cells.set(key, [segment])
					}
				}
			}
		}
	}
	return { cells, segmentCount }
}

function intervalCovered(
	a: Point3,
	b: Point3,
	stackLevel: number,
	index: SegmentIndex,
): boolean {
	const midX = (a[0] + b[0]) / 2
	const midZ = (a[2] + b[2]) / 2
	const dx = b[0] - a[0]
	const dz = b[2] - a[2]
	const length = Math.hypot(dx, dz)
	if (length < 1e-6) return true
	const candidates = index.cells.get(cellKey(midX, midZ)) ?? []
	const minimumDot = Math.cos((MATCH_ANGLE_DEGREES * Math.PI) / 180)
	for (const candidate of candidates) {
		if (candidate.stackLevel !== stackLevel) continue
		const ex = candidate.b[0] - candidate.a[0]
		const ez = candidate.b[2] - candidate.a[2]
		const existingLength = Math.hypot(ex, ez)
		if (existingLength < 1e-6) continue
		const directionDot = Math.abs((dx * ex + dz * ez) / (length * existingLength))
		if (directionDot < minimumDot) continue
		const t = Math.max(
			0,
			Math.min(
				1,
				((midX - candidate.a[0]) * ex + (midZ - candidate.a[2]) * ez) /
					(existingLength * existingLength),
			),
		)
		const nearestX = candidate.a[0] + t * ex
		const nearestZ = candidate.a[2] + t * ez
		if (Math.hypot(midX - nearestX, midZ - nearestZ) <= MATCH_TOLERANCE_M) {
			return true
		}
	}
	return false
}

function densify(points: readonly Point3[]): Point3[] {
	const dense: Point3[] = []
	for (let index = 0; index < points.length - 1; index += 1) {
		const a = points[index]!
		const b = points[index + 1]!
		const length = Math.hypot(b[0] - a[0], b[2] - a[2])
		const intervals = Math.max(1, Math.ceil(length / CLIP_INTERVAL_M))
		if (dense.length === 0) dense.push(a)
		for (let step = 1; step <= intervals; step += 1) {
			const t = step / intervals
			dense.push([
				a[0] + (b[0] - a[0]) * t,
				a[1] + (b[1] - a[1]) * t,
				a[2] + (b[2] - a[2]) * t,
			])
		}
	}
	return dense
}

function pathLength(points: readonly Point3[]): number {
	let length = 0
	for (let index = 0; index < points.length - 1; index += 1) {
		const a = points[index]!
		const b = points[index + 1]!
		length += Math.hypot(b[0] - a[0], b[2] - a[2])
	}
	return length
}

function addNode(
	graph: RoadNetworkGraph,
	id: string,
	position: Point3,
	template: RoadGraphNode,
) {
	graph.graphNodes[id] = {
		...template,
		id,
		position: [position[0], position[1], position[2]],
		terminal: false,
	}
}

function addEdgeRun(
	target: RoadNetworkGraph,
	source: RoadNetworkGraph,
	edge: RoadGraphEdge,
	points: Point3[],
	runIndex: number,
	usesOriginalStart: boolean,
	usesOriginalEnd: boolean,
) {
	if (pathLength(points) < MIN_FRAGMENT_LENGTH_M) return
	const edgeId = `${edge.id}:part:${runIndex + 1}`
	const startId = usesOriginalStart
		? edge.startNodeId
		: `${edgeId}:start`
	const endId = usesOriginalEnd ? edge.endNodeId : `${edgeId}:end`
	const startTemplate = source.graphNodes[edge.startNodeId]!
	const endTemplate = source.graphNodes[edge.endNodeId]!
	addNode(target, startId, points[0]!, startTemplate)
	addNode(target, endId, points.at(-1)!, endTemplate)
	target.edges[edgeId] = {
		...edge,
		alignment: points
			.slice(1, -1)
			.map((point): [number, number, number] => [point[0], point[1], point[2]]),
		endNodeId: endId,
		id: edgeId,
		parentEdgeId: edge.parentEdgeId ?? edge.id,
		...(edge.turnLanes ? { turnLanes: {
			start: usesOriginalStart ? edge.turnLanes.start : undefined,
			end: usesOriginalEnd ? edge.turnLanes.end : undefined,
		} } : {}),
		profileMode: 'legacy',
		startNodeId: startId,
		verticalProfile: [],
	}
}

function filterGraph(
	source: RoadNetworkGraph,
	index: SegmentIndex,
): { duplicateSegments: number; graph: RoadNetworkGraph; trimmedSegments: number } {
	const target: RoadNetworkGraph = {
		activeStyleId: source.activeStyleId,
		attachments: {},
		edges: {},
		graphNodes: {},
		junctions: {},
		stylePresets: { ...source.stylePresets },
	}
	let duplicateSegments = 0
	let trimmedSegments = 0

	for (const edge of Object.values(source.edges)) {
		const points = densify(sampleRoadEdgePoints(source, edge, 32))
		const covered = points.slice(0, -1).map((point, pointIndex) =>
			intervalCovered(point, points[pointIndex + 1]!, edge.stackLevel, index),
		)
		const coveredCount = covered.filter(Boolean).length
		if (coveredCount === covered.length) {
			duplicateSegments += 1
			continue
		}
		if (coveredCount === 0) {
			addNode(target, edge.startNodeId, points[0]!, source.graphNodes[edge.startNodeId]!)
			addNode(target, edge.endNodeId, points.at(-1)!, source.graphNodes[edge.endNodeId]!)
			target.edges[edge.id] = {
				...edge,
				alignment: edge.alignment.map((point) => [...point]),
				verticalProfile: edge.verticalProfile.map((point) => ({ ...point })),
			}
			for (const [attachmentId, attachment] of Object.entries(source.attachments)) {
				if (attachment.edgeId === edge.id) target.attachments[attachmentId] = { ...attachment }
			}
			continue
		}

		trimmedSegments += 1
		let runStart = -1
		let runIndex = 0
		for (let interval = 0; interval <= covered.length; interval += 1) {
			const uncovered = interval < covered.length && !covered[interval]
			if (uncovered && runStart < 0) runStart = interval
			if (!uncovered && runStart >= 0) {
				const runEnd = interval
				addEdgeRun(
					target,
					source,
					edge,
					points.slice(runStart, runEnd + 1),
					runIndex,
					runStart === 0,
					runEnd === covered.length,
				)
				runIndex += 1
				runStart = -1
			}
		}
	}

	reconcileRoadJunctions(target)
	return { duplicateSegments, graph: target, trimmedSegments }
}

/**
 * Align a map import to the level's geographic origin and remove centerline
 * portions already represented by roads on that level.
 */
export function reviewOsmImport(
	result: OsmImportResult,
	context: OsmImportSceneContext,
): OsmImportReview {
	const origin = findMapImportOrigin(context.networks) ?? {
		baseElevation: result.source.baseElevation,
		center: { ...result.source.center },
	}
	const [offsetX, offsetZ] = projectToLocal(result.source.center, origin.center)
	const offsetY =
		result.source.baseElevation === null || origin.baseElevation === null
			? 0
			: result.source.baseElevation - origin.baseElevation
	const translatedGraphs = result.graphs.map((graph) =>
		translateGraph(graph, [offsetX, offsetY, offsetZ]),
	)
	const translatedAssets = result.assets.map((asset) => ({
		...asset,
		position: [
			asset.position[0] + offsetX,
			asset.position[1] + offsetY,
			asset.position[2] + offsetZ,
		] as [number, number, number],
	}))
	const filteredAssets = translatedAssets.filter(
		(asset) => !context.featureSourceIds.has(asset.sourceId),
	)
	const incomingAssets = translatedAssets.length
	const duplicateAssets = incomingAssets - filteredAssets.length
	const incomingSegments = countEdges(translatedGraphs)
	const segmentIndex = buildSegmentIndex(context.networks)
	if (segmentIndex.segmentCount === 0) {
		return {
			duplicateAssets,
			duplicateSegments: 0,
			incomingAssets,
			incomingSegments,
			newAssets: filteredAssets.length,
			newSegments: incomingSegments,
			origin,
			result: { ...result, assets: filteredAssets, graphs: translatedGraphs },
			trimmedSegments: 0,
		}
	}

	let duplicateSegments = 0
	let trimmedSegments = 0
	const filteredGraphs: RoadNetworkGraph[] = []
	for (const graph of translatedGraphs) {
		const filtered = filterGraph(graph, segmentIndex)
		duplicateSegments += filtered.duplicateSegments
		trimmedSegments += filtered.trimmedSegments
		for (const component of splitRoadGraphComponents(filtered.graph)) {
			if (Object.keys(component.edges).length > 0) filteredGraphs.push(component)
		}
	}
	filteredGraphs.sort((a, b) => Object.keys(b.edges).length - Object.keys(a.edges).length)
	const reviewedResult: OsmImportResult = {
		...result,
		assets: filteredAssets,
		graphs: filteredGraphs,
		stats: {
			...result.stats,
			components: filteredGraphs.length,
			edges: countEdges(filteredGraphs),
			junctions: countJunctions(filteredGraphs),
		},
	}
	return {
		duplicateAssets,
		duplicateSegments,
		incomingAssets,
		incomingSegments,
		newAssets: filteredAssets.length,
		newSegments: incomingSegments - duplicateSegments,
		origin,
		result: reviewedResult,
		trimmedSegments,
	}
}
