import { type AnyNode, type AnyNodeId, useScene } from '@pascal-app/core'
import {
	createMapImportMetadata,
	createOsmFeatureMetadata,
	type OsmImportSceneContext,
	type MapImportOrigin,
	readOsmFeatureSourceId,
} from './osm-import-deduplication'
import type { OsmImportResult } from './osm-import'
import { associateOsmCrossings, associateOsmMappedSurfaces } from './osm-road-corridors'
import {
	createRoadSignNode,
	RoadNetworkNode,
	StreetLightNode,
	TrafficSignalNode,
} from './schema'

const IMPORT_VIEW_PADDING_M = 24
const IMPORT_VIEW_ASPECT_RATIO = 1.8
const MIN_IMPORT_VIEW_WIDTH_M = 60
const IMPORT_FLOOR_CLEARANCE_M = 0.05

type BuildingPlanPose = {
	position: readonly [number, number, number]
	rotationY: number
}

export type ImportedStreetFocus = {
	center: [number, number]
	max: [number, number]
	min: [number, number]
	size: [number, number]
	viewWidth: number
}

/** Return the level-local lift needed to put imported map geometry above its floor. */
export function getOsmImportFloorOffset(activeLevelId: AnyNodeId): number {
	const nodes = useScene.getState().nodes
	const level = nodes[activeLevelId] as
		| { children?: readonly AnyNodeId[]; type?: string }
		| undefined
	if (level?.type !== 'level') return 0.1
	const floor = level.children
		?.map((childId) => nodes[childId] as { elevation?: number; recessed?: boolean; type?: string } | undefined)
		.find((child) => child?.type === 'slab' && child.recessed !== true)
	const walkingSurface =
		typeof floor?.elevation === 'number' && Number.isFinite(floor.elevation)
			? floor.elevation
			: 0.05
	return walkingSurface + IMPORT_FLOOR_CLEARANCE_M
}

function liftGraph(graph: OsmImportResult['graphs'][number], offsetY: number) {
	return {
		...graph,
		graphNodes: Object.fromEntries(
			Object.entries(graph.graphNodes).map(([id, node]) => [
				id,
				{ ...node, position: [node.position[0], node.position[1] + offsetY, node.position[2]] },
			]),
		),
		edges: Object.fromEntries(
			Object.entries(graph.edges).map(([id, edge]) => [
				id,
				{
					...edge,
					alignment: edge.alignment.map(
						(point) => [point[0], point[1] + offsetY, point[2]] as [number, number, number],
					),
				},
			]),
		),
	}
}

function toWorldPlanPoint(
	point: readonly [number, number, number],
	buildingPose: BuildingPlanPose | null,
): [number, number] {
	if (!buildingPose) return [point[0], point[2]]

	const cos = Math.cos(buildingPose.rotationY)
	const sin = Math.sin(buildingPose.rotationY)
	return [
		buildingPose.position[0] + point[0] * cos + point[2] * sin,
		buildingPose.position[2] - point[0] * sin + point[2] * cos,
	]
}

/**
 * Compute a north-up view that contains every imported centerline. The extra
 * vertical allowance accounts for the editor chrome around the 2D canvas.
 */
export function getImportedStreetFocus(
	result: OsmImportResult,
	buildingPose: BuildingPlanPose | null = null,
): ImportedStreetFocus | null {
	let minX = Number.POSITIVE_INFINITY
	let minZ = Number.POSITIVE_INFINITY
	let maxX = Number.NEGATIVE_INFINITY
	let maxZ = Number.NEGATIVE_INFINITY

	const include = (point: readonly [number, number, number]) => {
		const [x, z] = toWorldPlanPoint(point, buildingPose)
		minX = Math.min(minX, x)
		minZ = Math.min(minZ, z)
		maxX = Math.max(maxX, x)
		maxZ = Math.max(maxZ, z)
	}

	for (const graph of result.graphs) {
		for (const node of Object.values(graph.graphNodes)) include(node.position)
		for (const edge of Object.values(graph.edges)) {
			for (const point of edge.alignment) include(point)
		}
	}
	for (const asset of result.assets) include(asset.position)

	if (![minX, minZ, maxX, maxZ].every(Number.isFinite)) return null

	const width = maxX - minX
	const depth = maxZ - minZ
	return {
		center: [(minX + maxX) / 2, (minZ + maxZ) / 2],
		max: [maxX, maxZ],
		min: [minX, minZ],
		size: [width, depth],
		viewWidth: Math.max(
			MIN_IMPORT_VIEW_WIDTH_M,
			width + IMPORT_VIEW_PADDING_M * 2,
			(depth + IMPORT_VIEW_PADDING_M * 2) * IMPORT_VIEW_ASPECT_RATIO,
		),
	}
}

/**
 * Parse every network before touching the scene, then add the complete import
 * in one store write. A malformed later component cannot leave a partial map
 * import behind, and one undo removes the complete imported street system.
 */
export function placeOsmImport(
	result: OsmImportResult,
	activeLevelId: AnyNodeId,
	origin: MapImportOrigin = {
		baseElevation: result.source.baseElevation,
		center: result.source.center,
	},
): AnyNodeId[] {
	const floorOffset = getOsmImportFloorOffset(activeLevelId)
	const surfacesByGraph = associateOsmMappedSurfaces(
		result.graphs,
		result.mappedSurfaces ?? [],
		result.source.center,
		result.source.radiusMeters,
		floorOffset,
	)
	const crossingsByGraph = associateOsmCrossings(
		result.graphs,
		result.crossings ?? [],
		result.source.center,
		result.source.radiusMeters,
		floorOffset,
	)
	const connectivityByGraph = result.graphs.map((graph) => {
		const wayIds = new Set(Object.values(graph.edges).flatMap((edge) => edge.osmSource ? [edge.osmSource.wayId] : []))
		return (result.laneConnectivity ?? []).filter((relation) =>
			relation.members.some((member) => member.type === 'way' && wayIds.has(member.ref)),
		)
	})
	const networks = result.graphs.map((graph, graphIndex) =>
		RoadNetworkNode.parse({
			...liftGraph(graph, floorOffset),
			osmMappedSurfaces: surfacesByGraph[graphIndex],
			osmCrossings: crossingsByGraph[graphIndex],
			osmLaneConnectivity: connectivityByGraph[graphIndex],
			applyStyleToAll: false,
			metadata: createMapImportMetadata(undefined, origin),
			parentId: activeLevelId,
		}),
	)
	const occupiedIds = new Set(Object.keys(useScene.getState().nodes))
	for (const network of networks) occupiedIds.add(network.id)
	const assets = result.assets.map((asset) => {
		const position: [number, number, number] = [
			asset.position[0],
			asset.position[1] + floorOffset,
			asset.position[2],
		]
		const shared = {
			metadata: createOsmFeatureMetadata(undefined, origin, asset),
			parentId: activeLevelId,
			position,
			rotation: [0, asset.rotationY, 0] as [number, number, number],
		}
		if (asset.kind === 'road-sign') {
			const node = createRoadSignNode(
				{ ...shared, signId: asset.signId, text: asset.text },
				occupiedIds,
			)
			occupiedIds.add(node.id)
			return node
		}
		if (asset.kind === 'street-lamp') {
			let node = StreetLightNode.parse({ ...shared, height: asset.height })
			while (occupiedIds.has(node.id)) {
				node = StreetLightNode.parse({ ...node, id: undefined })
			}
			occupiedIds.add(node.id)
			return node
		}
		let node = TrafficSignalNode.parse({
			...shared,
			cabinet: false,
			headCount: 'one',
			mount: 'post',
			signalState: 'red',
			streetNameSign: false,
		})
		while (occupiedIds.has(node.id)) {
			node = TrafficSignalNode.parse({ ...node, id: undefined })
		}
		occupiedIds.add(node.id)
		return node
	})
	const placedNodes = [...networks, ...assets]
	if (placedNodes.length === 0) return []

	useScene.getState().createNodes(
		placedNodes.map((node) => ({
			node: node as unknown as AnyNode,
			parentId: activeLevelId,
		})),
	)

	return placedNodes.map((node) => node.id as AnyNodeId)
}

/** Read the active level once at the import event boundary. */
export function getOsmImportSceneContext(
	activeLevelId: AnyNodeId,
): OsmImportSceneContext {
	const networks: RoadNetworkNode[] = []
	const featureSourceIds = new Set<string>()
	for (const candidate of Object.values(useScene.getState().nodes)) {
		const identity = candidate as unknown as {
			metadata?: unknown
			parentId?: string | null
			type?: string
		}
		if (identity.parentId !== activeLevelId) continue
		const sourceId = readOsmFeatureSourceId(identity.metadata)
		if (sourceId) featureSourceIds.add(sourceId)
		if (identity.type !== 'streetscape:road-network') continue
		const parsed = RoadNetworkNode.safeParse(candidate)
		if (parsed.success) networks.push(parsed.data)
	}
	return { featureSourceIds, networks }
}
