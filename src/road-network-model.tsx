'use client'

import { useEffect, useMemo, useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { BufferGeometry, DoubleSide, Float32BufferAttribute } from 'three'
import {
  buildJunctionBoundaryGeometry,
  buildJunctionBoundarySidewalkGeometry,
  buildRoadRibbonGeometry,
  sampleRoadEdgePoints,
  type JunctionBoundaryGeometryData,
} from './road-network-geometry'
import { roadCurbCornerKey } from './road-network-corner-editing'
import {
  buildRoadNetworkMarkings,
  type RoadMarkingPolygon,
} from './road-network-markings'
import {
  buildRoadCrossSection,
  buildRoadJunctionBands,
  ROAD_SIDE_COMPONENT_SPECS,
  type RoadJunctionBand,
} from './road-cross-section'
import {
  buildRoadTransitionProfilesIncremental,
  createRoadTransitionProfileCache,
  trimRoadTransitionProfile,
  type RoadTransitionSample,
} from './road-transition-profile'
import type { RoadGraphEdge, RoadNetworkNode, RoadStylePreset } from './schema'
import { DEFAULT_ROAD_STYLE_PRESETS } from './road-style-presets'
import type { RoadElementSelection } from './store'
import { roadValidationIssuePoint, validateRoadGraph } from './road-network-validation'
import { recordRoadGeometryCacheDiagnostics } from './road-network-scale'
import { buildRoadLaneMovementGuides } from './road-lane-movements'
import { buildRoadChannelizationGuides } from './road-channelization'
import { buildDividedJunctionGraphGuides } from './road-divided-junctions'
import { buildRoadSweptPathCheck } from './road-swept-path'
import { buildRoadActiveModeGuides } from './road-active-modes'
import { buildRoadTrafficRouteGuide, buildRoadTrafficVehicleSamples } from './road-traffic-simulation'
import { buildRoadsideDecorationPreviews } from './roadside-decoration-rules'
import {
  buildManualRoadJunctionBand,
  buildManualRoadJunctionBoundary,
} from './road-junction-boundary-editor'
import { RoadNetworkBridgeStructures } from './road-network-bridge-model'
import { RoadNetworkTunnelStructures } from './road-network-tunnel-model'
import { RoadNetworkEarthworks } from './road-network-earthworks-model'
import type { TerrainField } from './terrain-field-compat'

const NO_RAYCAST = () => undefined

function resolveStyle(node: RoadNetworkNode, edge: RoadGraphEdge): RoadStylePreset | undefined {
  const styleId = node.applyStyleToAll ? node.activeStyleId : edge.styleId
  return (
    node.stylePresets[styleId] ??
    (DEFAULT_ROAD_STYLE_PRESETS[styleId as keyof typeof DEFAULT_ROAD_STYLE_PRESETS] as
      | RoadStylePreset
      | undefined) ??
    node.stylePresets[node.activeStyleId]
  )
}

function carriagewayWidth(style: RoadStylePreset): number {
  return style.laneCount * style.laneWidth + style.shoulderWidth * 2 + style.medianWidth
}

function junctionApproachIndicatorPoints(
  node: RoadNetworkNode,
  edge: RoadGraphEdge,
  nodeId: string,
  length = 3,
): Array<[number, number, number]> {
  const sampled = sampleRoadEdgePoints(node, edge, 48)
  const points = edge.startNodeId === nodeId ? sampled : [...sampled].reverse()
  if (points.length < 2) return []
  const result: Array<[number, number, number]> = [[...points[0]!] as [number, number, number]]
  let remaining = length
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1]!
    const point = points[index]!
    const segmentLength = Math.hypot(point[0] - previous[0], point[2] - previous[2])
    if (segmentLength <= remaining) {
      result.push([...point] as [number, number, number])
      remaining -= segmentLength
      continue
    }
    const ratio = remaining / Math.max(segmentLength, 1e-6)
    result.push([
      previous[0] + (point[0] - previous[0]) * ratio,
      previous[1] + (point[1] - previous[1]) * ratio,
      previous[2] + (point[2] - previous[2]) * ratio,
    ])
    break
  }
  return result
}

/**
 * Road ribbons are infinitely thin top surfaces. Let them receive scene
 * shadows, but never add them to the shadow map: a ribbon casting onto its
 * own adjacent triangles creates the thin diagonal streaks seen on curves.
 */
export function roadRibbonShadowPolicy(ghost: boolean) {
  return {
    castShadow: false,
    receiveShadow: !ghost,
  } as const
}

export function RoadSegmentSurface({
  color,
  end,
  ghost = false,
  start,
  style,
}: {
  color?: string
  end: readonly [number, number, number]
  ghost?: boolean
  start: readonly [number, number, number]
  style: RoadStylePreset
}) {
  const crossSection = buildRoadCrossSection(style)
  const points = [start, end]
  return (
    <>
      <RoadRibbonSurface color={color} ghost={ghost} points={points} style={style} />
      {(['left', 'right'] as const).flatMap((side) =>
        crossSection.sides[side].components.map((component) => (
          <RoadRibbonSurface
            color={component.color}
            elevationOffset={component.elevationOffset}
            ghost={ghost}
            key={`${side}:${component.kind}`}
            lateralOffset={component.lateralOffset}
            name={`road-side-${side}-${component.kind}-preview`}
            nonInteractive
            points={points}
            style={style}
            width={component.width}
          />
        )),
      )}
    </>
  )
}

/** Build one continuous top surface so sampled curves have no box-to-box gaps. */
export function RoadRibbonSurface({
  ghost = false,
  color,
  elevationOffset = 0,
  lateralOffset = 0,
  name,
  nonInteractive = false,
  onPointerDown,
  opacity,
  points,
  style,
  width,
}: {
  color?: string
  elevationOffset?: number
  ghost?: boolean
  lateralOffset?: number
  name?: string
  nonInteractive?: boolean
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void
  opacity?: number
  points: ReadonlyArray<readonly [number, number, number]>
  style: RoadStylePreset
  width?: number
}) {
  const geometry = useMemo(() => {
    const result = new BufferGeometry()
    const mesh = buildRoadRibbonGeometry(points, {
      elevationOffset,
      lateralOffset,
      surfaceThickness: style.surfaceThickness,
      width: width ?? carriagewayWidth(style),
    })
    if (mesh.positions.length === 0) return result
    result.setAttribute('position', new Float32BufferAttribute(mesh.positions, 3))
    result.setIndex(mesh.indices)
    result.computeVertexNormals()
    result.computeBoundingBox()
    result.computeBoundingSphere()
    return result
  }, [elevationOffset, lateralOffset, points, style, width])
  useEffect(() => () => geometry.dispose(), [geometry])
  if (points.length < 2) return null
  const shadowPolicy = roadRibbonShadowPolicy(ghost)
  const resolvedOpacity = opacity ?? (ghost ? 0.48 : 1)
  return (
    <mesh
      castShadow={shadowPolicy.castShadow}
      geometry={geometry}
      name={name ?? (ghost ? 'road-segment-preview' : 'road-segment-surface')}
      onPointerDown={onPointerDown}
      raycast={ghost || nonInteractive ? NO_RAYCAST : undefined}
      receiveShadow={shadowPolicy.receiveShadow}
    >
      <meshStandardMaterial
        color={color ?? style.surfaceColor}
        depthWrite={!ghost && resolvedOpacity >= 1}
        metalness={0.02}
        opacity={resolvedOpacity}
        polygonOffset
        polygonOffsetFactor={-1}
        roughness={0.94}
        side={DoubleSide}
        transparent={ghost || resolvedOpacity < 1}
      />
    </mesh>
  )
}

type RoadVariableRibbonSample = Pick<
  RoadTransitionSample,
  'point' | 'surfaceThickness'
> & {
  leftOffset: number
  rightOffset: number
}

/** Render a ribbon whose left and right offsets can change along its centerline. */
function RoadVariableRibbonSurface({
  color,
  elevationOffset = 0,
  ghost = false,
  name,
  nonInteractive = false,
  samples,
}: {
  color: string
  elevationOffset?: number
  ghost?: boolean
  name: string
  nonInteractive?: boolean
  samples: RoadVariableRibbonSample[]
}) {
  const geometry = useMemo(() => {
    const result = new BufferGeometry()
    if (samples.length < 2) return result
    const positions: number[] = []
    for (let index = 0; index < samples.length; index++) {
      const sample = samples[index]!
      const previous = samples[Math.max(0, index - 1)]!
      const next = samples[Math.min(samples.length - 1, index + 1)]!
      const dx = next.point[0] - previous.point[0]
      const dz = next.point[2] - previous.point[2]
      const length = Math.max(Math.hypot(dx, dz), 1e-6)
      const normalX = -dz / length
      const normalZ = dx / length
      const y = sample.point[1] + sample.surfaceThickness + elevationOffset
      positions.push(
        sample.point[0] + normalX * sample.leftOffset,
        y,
        sample.point[2] + normalZ * sample.leftOffset,
        sample.point[0] + normalX * sample.rightOffset,
        y,
        sample.point[2] + normalZ * sample.rightOffset,
      )
    }
    const indices: number[] = []
    for (let index = 0; index < samples.length - 1; index++) {
      const left = index * 2
      const right = left + 1
      const nextLeft = left + 2
      const nextRight = left + 3
      indices.push(left, nextLeft, right, nextLeft, nextRight, right)
    }
    result.setAttribute('position', new Float32BufferAttribute(positions, 3))
    result.setIndex(indices)
    result.computeVertexNormals()
    result.computeBoundingBox()
    result.computeBoundingSphere()
    return result
  }, [elevationOffset, samples])
  useEffect(() => () => geometry.dispose(), [geometry])
  if (samples.length < 2) return null
  const shadowPolicy = roadRibbonShadowPolicy(ghost)
  return (
    <mesh
      castShadow={shadowPolicy.castShadow}
      geometry={geometry}
      name={name}
      raycast={ghost || nonInteractive ? NO_RAYCAST : undefined}
      receiveShadow={shadowPolicy.receiveShadow}
    >
      <meshStandardMaterial
        color={color}
        depthWrite={!ghost}
        metalness={0.02}
        opacity={ghost ? 0.48 : 1}
        polygonOffset
        polygonOffsetFactor={-1}
        roughness={0.94}
        side={DoubleSide}
        transparent={ghost}
      />
    </mesh>
  )
}

function RoadJunctionSurface({
  color,
  center,
  ghost,
  name,
  nonInteractive,
  onPointerDown,
  solution,
  surfaceY,
}: {
  color: string
  center: readonly [number, number, number]
  ghost: boolean
  name: string
  nonInteractive: boolean
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void
  solution: JunctionBoundaryGeometryData
  surfaceY: number
}) {
  const geometry = useMemo(() => {
    const result = new BufferGeometry()
    result.setAttribute('position', new Float32BufferAttribute(solution.positions, 3))
    result.setIndex(solution.indices)
    result.computeVertexNormals()
    result.computeBoundingBox()
    result.computeBoundingSphere()
    return result
  }, [solution])
  useEffect(() => () => geometry.dispose(), [geometry])
  if ((geometry.getAttribute('position')?.count ?? 0) === 0) return null
  return (
    <mesh
      castShadow={false}
      geometry={geometry}
      name={name}
      onPointerDown={onPointerDown}
      position={[center[0], center[1] + surfaceY, center[2]]}
      raycast={ghost || nonInteractive ? NO_RAYCAST : undefined}
      receiveShadow={!ghost}
    >
      <meshStandardMaterial
        color={color}
        depthWrite={!ghost}
        opacity={ghost ? 0.48 : 1}
        polygonOffset
        polygonOffsetFactor={-2}
        roughness={0.94}
        side={DoubleSide}
        transparent={ghost}
      />
    </mesh>
  )
}

function RoadJunctionSideBand({
  band,
  center,
  manualBoundary,
  solution,
  surfaceY,
}: {
  band: RoadJunctionBand
  center: readonly [number, number, number]
  manualBoundary?: ReadonlyArray<readonly [number, number]>
  solution: JunctionBoundaryGeometryData
  surfaceY: number
}) {
  const surface = useMemo(
    () => manualBoundary
      ? buildManualRoadJunctionBand(manualBoundary, band.outerWidth)
      : buildJunctionBoundarySidewalkGeometry(solution, band.outerWidth),
    [band.outerWidth, manualBoundary, solution],
  )
  const geometry = useMemo(() => {
    const result = new BufferGeometry()
    result.setAttribute('position', new Float32BufferAttribute(surface.positions, 3))
    result.setIndex(surface.indices)
    result.computeVertexNormals()
    result.computeBoundingBox()
    result.computeBoundingSphere()
    return result
  }, [surface])
  useEffect(() => () => geometry.dispose(), [geometry])
  if ((geometry.getAttribute('position')?.count ?? 0) === 0) return null
  return (
    <mesh
      geometry={geometry}
      name={`road-junction-${band.kind}`}
      position={[center[0], center[1] + surfaceY, center[2]]}
      raycast={NO_RAYCAST}
      receiveShadow
    >
      <meshStandardMaterial
        color={band.color}
        polygonOffset
        polygonOffsetFactor={-3}
        roughness={0.94}
        side={DoubleSide}
      />
    </mesh>
  )
}

function RoadMarkingSurface({
  color,
  name,
  polygons,
}: {
  color: string
  name: string
  polygons: RoadMarkingPolygon[]
}) {
  const geometry = useMemo(() => {
    const result = new BufferGeometry()
    const positions: number[] = []
    const indices: number[] = []
    for (const polygon of polygons) {
      if (polygon.points.length < 3) continue
      const base = positions.length / 3
      for (const point of polygon.points) positions.push(point[0], point[1], point[2])
      for (let index = 1; index < polygon.points.length - 1; index++) {
        indices.push(base, base + index, base + index + 1)
      }
    }
    result.setAttribute('position', new Float32BufferAttribute(positions, 3))
    result.setIndex(indices)
    result.computeBoundingBox()
    result.computeBoundingSphere()
    return result
  }, [polygons])
  useEffect(() => () => geometry.dispose(), [geometry])
  if ((geometry.getAttribute('position')?.count ?? 0) === 0) return null
  return (
    <mesh geometry={geometry} name={name} raycast={NO_RAYCAST}>
      <meshBasicMaterial
        color={color}
        polygonOffset
        polygonOffsetFactor={-4}
        side={DoubleSide}
      />
    </mesh>
  )
}

/** The procedural road surface. Splines are represented as sampled alignment legs. */
export function RoadNetworkModel({
	clearancePeers = [],
  elementSelection,
  ghost = false,
  nonInteractive = false,
  node,
  onSelectElement,
	terrain = null,
}: {
	clearancePeers?: RoadNetworkNode[]
  elementSelection?: RoadElementSelection | null
  ghost?: boolean
  nonInteractive?: boolean
  node: RoadNetworkNode
  onSelectElement?: (
    selection: Omit<RoadElementSelection, 'networkId'>,
    event: ThreeEvent<PointerEvent>,
  ) => void
	terrain?: TerrainField | null
}) {
  const transitionProfileCache = useRef(createRoadTransitionProfileCache())
  const junctionSurfaces = useMemo(
    () =>
      Object.values(node.graphNodes).flatMap((graphNode) => {
        const incident = Object.values(node.edges).filter(
          (edge) => edge.startNodeId === graphNode.id || edge.endNodeId === graphNode.id,
        )
        // Degree-two nodes are ordinary continuous bends. Their joined ribbon
        // already covers the turn; adding an intersection disk creates a
        // bulbous corner and lets per-junction geometry bleed beyond the kerb.
        if (incident.length < 3) return []
        const styles = incident.flatMap((edge) => {
          const style = resolveStyle(node, edge)
          return style ? [style] : []
        })
        const radius = Math.max(...styles.map((style) => carriagewayWidth(style) / 2), 0)
        const junction = node.junctions?.[graphNode.id]
        const primaryStyle = junction?.primaryEdgeIds.flatMap((edgeId) => {
          const edge = node.edges[edgeId]
          const candidate = edge ? resolveStyle(node, edge) : undefined
          return candidate ? [candidate] : []
        })[0]
        const style = primaryStyle ?? styles[0]
        const approaches = incident.flatMap((edge) => {
          const edgeStyle = resolveStyle(node, edge)
          const points = sampleRoadEdgePoints(node, edge)
          if (!edgeStyle || points.length < 2) return []
          const from = edge.startNodeId === graphNode.id ? points[0]! : points.at(-1)!
          const toward = edge.startNodeId === graphNode.id ? points[1]! : points.at(-2)!
          return [{
            angle: Math.atan2(toward[2] - from[2], toward[0] - from[0]),
            edgeId: edge.id,
            halfWidth: carriagewayWidth(edgeStyle) / 2,
          }]
        })
        const sideBands = buildRoadJunctionBands(styles)
        const treatment = junction?.treatment ?? 'auto'
        const automaticSolution = buildJunctionBoundaryGeometry(
          approaches,
          junction?.cornerRadii ?? {},
        )
        const manualBoundary = junction?.manualBoundaryEnabled && junction.manualBoundaryPoints.length >= 3
          ? junction.manualBoundaryPoints
          : undefined
        const solution = manualBoundary
          ? buildManualRoadJunctionBoundary(automaticSolution, manualBoundary)
          : automaticSolution
        return style && radius > 0
          ? [{ graphNode, junction, manualBoundary, radius, sideBands, solution, style, treatment }]
          : []
      }),
    [node],
  )
  const junctionTrimByApproach = useMemo(
    () =>
      Object.fromEntries(
        junctionSurfaces.flatMap(({ graphNode, solution }) =>
          Object.entries(solution.approachCuts).map(([edgeId, distance]) => [
            `${graphNode.id}:${edgeId}`,
            distance,
          ]),
        ),
      ),
    [junctionSurfaces],
  )
  const edgeSurfaces = useMemo(
    () =>
      buildRoadTransitionProfilesIncremental(node, transitionProfileCache.current).map((profile) => {
        const decorativeProfile = trimRoadTransitionProfile(
          profile,
          junctionTrimByApproach[`${profile.startNodeId}:${profile.edgeIds[0]}`] ?? 0,
          junctionTrimByApproach[
            `${profile.endNodeId}:${profile.edgeIds[profile.edgeIds.length - 1]}`
          ] ?? 0,
        )
        return { decorativeProfile, profile }
      }),
    [junctionTrimByApproach, node],
  )
  useEffect(() => {
    recordRoadGeometryCacheDiagnostics(node.id, transitionProfileCache.current.stats)
  }, [edgeSurfaces, node.id])
  const validationMarkers = useMemo(
    () =>
      validateRoadGraph(node, node.maxRoadGrade, clearancePeers).flatMap((issue, index) => {
        const point = roadValidationIssuePoint(node, issue)
        return point ? [{ index, issue, point }] : []
      }),
    [clearancePeers, node],
  )
  const markingGroups = useMemo(() => {
    const groups = new Map<string, RoadMarkingPolygon[]>()
    for (const marking of buildRoadNetworkMarkings(node)) {
      const key = `${marking.kind}:${marking.color}`
      groups.set(key, [...(groups.get(key) ?? []), marking])
    }
    return [...groups.entries()].map(([key, polygons]) => ({
      color: polygons[0]!.color,
      key,
      kind: polygons[0]!.kind,
      polygons,
    }))
  }, [node])
  const laneMovementGuides = useMemo(
    () => node.showLaneMovements ? buildRoadLaneMovementGuides(node) : [],
    [node],
  )
  const channelizationGuides = useMemo(
    () => buildRoadChannelizationGuides(node),
    [node],
  )
  const dividedJunctionGraph = useMemo(
    () => node.showDividedJunctionGraph
      ? buildDividedJunctionGraphGuides(node)
      : { links: [], nodes: [] },
    [node],
  )
  const sweptPathCheck = useMemo(
    () => node.showSweptPath ? buildRoadSweptPathCheck(node) : null,
    [node],
  )
  const activeModeGuides = useMemo(
    () => node.showActiveModeMovements ? buildRoadActiveModeGuides(node) : [],
    [node],
  )
  const trafficPreview = useMemo(() => {
    if (!node.showTrafficSimulation) return null
    const routes = Object.values(node.trafficRoutes ?? {}).sort((first, second) => first.id.localeCompare(second.id))
    const route = routes.find((candidate) => candidate.id === node.selectedTrafficRouteId) ?? routes[0]
    return route ? {
      points: buildRoadTrafficRouteGuide(node, route),
      route,
      vehicles: buildRoadTrafficVehicleSamples(node, route),
    } : null
  }, [node])
  const roadsideDecorationPreviews = useMemo(
    () => node.showRoadsideDecorations ? buildRoadsideDecorationPreviews(node) : [],
    [node],
  )

  return (
    <group name="road-network-model">
		{laneMovementGuides.map((guide) => (
			<RoadRibbonSurface
				color={guide.enabled ? '#22c55e' : '#ef4444'}
				key={guide.id}
				name={`road-lane-movement-${guide.enabled ? 'permitted' : 'restricted'}:${guide.id}`}
				nonInteractive
				opacity={0.9}
				points={guide.points}
				style={{ ...DEFAULT_ROAD_STYLE_PRESETS['local-street'], surfaceThickness: 0.02 }}
				width={guide.enabled ? 0.18 : 0.12}
			/>
		))}
		{!ghost ? channelizationGuides.map((guide) => (
			<group key={guide.id} name={`road-${guide.kind}:${guide.id}`}>
				<RoadRibbonSurface
					color={guide.style.surfaceColor}
					elevationOffset={0.018}
					lateralOffset={guide.lateralOffset}
					name={`road-${guide.kind}-surface`}
					nonInteractive
					points={guide.points}
					style={guide.style}
					width={guide.width}
				/>
				{[-1, 1].map((side) => (
					<RoadRibbonSurface
						color="#f8fafc"
						elevationOffset={0.04}
						key={side}
						lateralOffset={guide.lateralOffset + side * (guide.width / 2 - 0.045)}
						name={`road-${guide.kind}-edge-line`}
						nonInteractive
						points={guide.points}
						style={guide.style}
						width={0.09}
					/>
				))}
			</group>
		)) : null}
		{!ghost ? dividedJunctionGraph.links.map((guide) => (
			<RoadRibbonSurface
				color="#22d3ee"
				key={guide.id}
				name={`road-divided-internal-link:${guide.id}`}
				nonInteractive
				opacity={0.92}
				points={guide.points}
				style={{ ...DEFAULT_ROAD_STYLE_PRESETS['local-street'], surfaceThickness: 0 }}
				width={0.14}
			/>
		)) : null}
		{!ghost ? dividedJunctionGraph.nodes.map((internal) => (
			<mesh key={internal.id} name={`road-divided-internal-node:${internal.id}`} position={internal.position} raycast={NO_RAYCAST}>
				<sphereGeometry args={[0.22, 14, 10]} />
				<meshBasicMaterial color={internal.direction === 'inbound' ? '#f97316' : '#22d3ee'} depthTest={false} />
			</mesh>
		)) : null}
		{!ghost && sweptPathCheck ? (
			<group name="road-design-vehicle-swept-path">
				<RoadRibbonSurface
					color={sweptPathCheck.passes ? '#22c55e' : '#ef4444'}
					name="road-swept-envelope"
					nonInteractive
					opacity={0.34}
					points={sweptPathCheck.points}
					style={{ ...DEFAULT_ROAD_STYLE_PRESETS['local-street'], surfaceThickness: 0 }}
					width={sweptPathCheck.envelopeWidth}
				/>
				<RoadRibbonSurface
					color="#fbbf24"
					name="road-swept-path-centerline"
					nonInteractive
					points={sweptPathCheck.points}
					style={{ ...DEFAULT_ROAD_STYLE_PRESETS['local-street'], surfaceThickness: 0.01 }}
					width={0.12}
				/>
			</group>
		) : null}
		{!ghost ? activeModeGuides.map((guide) => (
			<RoadRibbonSurface
				color={guide.color}
				key={guide.id}
				name={`road-${guide.mode}-movement:${guide.id}`}
				nonInteractive
				opacity={0.9}
				points={guide.points}
				style={{ ...DEFAULT_ROAD_STYLE_PRESETS['local-street'], surfaceThickness: 0 }}
				width={guide.width}
			/>
		)) : null}
		{!ghost && trafficPreview ? (
			<group name="road-lane-traffic-simulation">
				<RoadRibbonSurface
					color="#a855f7"
					name={`road-traffic-route:${trafficPreview.route.id}`}
					nonInteractive
					opacity={0.84}
					points={trafficPreview.points}
					style={{ ...DEFAULT_ROAD_STYLE_PRESETS['local-street'], surfaceThickness: 0 }}
					width={0.16}
				/>
				{trafficPreview.vehicles.map((vehicle) => (
					<mesh key={vehicle.id} name={`road-traffic-vehicle:${vehicle.id}`} position={vehicle.position} raycast={NO_RAYCAST}>
						<boxGeometry args={[0.7, 0.28, 1.35]} />
						<meshStandardMaterial color="#f97316" emissive="#7c2d12" emissiveIntensity={0.35} />
					</mesh>
				))}
			</group>
		) : null}
		{!ghost ? roadsideDecorationPreviews.map((decoration) => (
			<group key={decoration.id} name={`roadside-${decoration.kind}:${decoration.id}`} position={decoration.position}>
				{decoration.kind === 'lamp' ? (
					<>
						<mesh position={[0, 1, 0]} raycast={NO_RAYCAST}><cylinderGeometry args={[0.06, 0.08, 2, 10]} /><meshStandardMaterial color="#64748b" /></mesh>
						<mesh position={[0, 2.05, 0]} raycast={NO_RAYCAST}><sphereGeometry args={[0.16, 12, 8]} /><meshBasicMaterial color="#fde68a" /></mesh>
					</>
				) : decoration.kind === 'tree' ? (
					<>
						<mesh position={[0, 0.55, 0]} raycast={NO_RAYCAST}><cylinderGeometry args={[0.1, 0.14, 1.1, 9]} /><meshStandardMaterial color="#7c4a2d" /></mesh>
						<mesh position={[0, 1.35, 0]} raycast={NO_RAYCAST}><sphereGeometry args={[0.58, 12, 9]} /><meshStandardMaterial color="#4d7c0f" /></mesh>
					</>
				) : decoration.kind === 'sign' ? (
					<>
						<mesh position={[0, 0.65, 0]} raycast={NO_RAYCAST}><cylinderGeometry args={[0.035, 0.035, 1.3, 8]} /><meshStandardMaterial color="#71717a" /></mesh>
						<mesh position={[0, 1.25, 0]} raycast={NO_RAYCAST}><boxGeometry args={[0.52, 0.4, 0.06]} /><meshStandardMaterial color="#f59e0b" /></mesh>
					</>
				) : (
					<mesh position={[0, 0.35, 0]} raycast={NO_RAYCAST}><boxGeometry args={[0.12, 0.42, 0.9]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
				)}
			</group>
		)) : null}
      {!ghost ? <RoadNetworkBridgeStructures node={node} /> : null}
		{!ghost ? <RoadNetworkTunnelStructures node={node} terrain={terrain} /> : null}
		{!ghost ? <RoadNetworkEarthworks node={node} terrain={terrain} /> : null}
      {edgeSurfaces.map(({ decorativeProfile, profile }) => (
        <group key={profile.key}>
          <RoadVariableRibbonSurface
            color={profile.style.surfaceColor}
            ghost={ghost}
            name={ghost ? 'road-segment-preview' : 'road-segment-surface'}
            nonInteractive={nonInteractive}
            samples={profile.samples.map((sample) => ({
              ...sample,
              leftOffset: sample.carriagewayHalfWidth,
              rightOffset: -sample.carriagewayHalfWidth,
            }))}
          />
          {(['left', 'right'] as const).flatMap((side) =>
            ROAD_SIDE_COMPONENT_SPECS.map((spec) => {
              if (!decorativeProfile.samples.some(
                (sample) => sample.components[side][spec.kind].width > 1e-4,
              )) return null
              return (
                <RoadVariableRibbonSurface
                  color={spec.color}
                  elevationOffset={spec.elevationOffset}
                  ghost={ghost}
                  key={`${side}:${spec.kind}`}
                  name={`road-side-${side}-${spec.kind}`}
                  nonInteractive
                  samples={decorativeProfile.samples.map((sample) => {
                    const bounds = sample.components[side][spec.kind]
                    return {
                      ...sample,
                      leftOffset: side === 'left' ? bounds.outerOffset : -bounds.innerOffset,
                      rightOffset: side === 'left' ? bounds.innerOffset : -bounds.outerOffset,
                    }
                  })}
                />
              )
            }),
          )}
          {!ghost && decorativeProfile.samples.some((sample) => sample.medianWidth > 1e-4) ? (
            <RoadVariableRibbonSurface
              color="#777d70"
              elevationOffset={0.07}
              name="road-median"
              nonInteractive
              samples={decorativeProfile.samples.map((sample) => ({
                ...sample,
                leftOffset: sample.medianWidth * 0.36,
                rightOffset: -sample.medianWidth * 0.36,
              }))}
            />
          ) : null}
        </group>
      ))}
      {!ghost
        ? markingGroups.map((group) => (
            <RoadMarkingSurface
              color={group.color}
              key={group.key}
              name={`road-marking-${group.kind}`}
              polygons={group.polygons}
            />
          ))
        : null}
      {!ghost && !nonInteractive && onSelectElement
        ? Object.values(node.edges).map((edge) => {
            const style = resolveStyle(node, edge)
            if (!style) return null
            const selected =
              elementSelection?.kind === 'edge' && elementSelection.id === edge.id
            return (
              <RoadRibbonSurface
                color="#38bdf8"
                elevationOffset={0.025}
                key={`edge-hit:${edge.id}`}
                name={`road-edge-hit:${edge.id}`}
                onPointerDown={(event) =>
                  onSelectElement({ kind: 'edge', id: edge.id }, event)
                }
                opacity={selected ? 0.3 : 0}
                points={sampleRoadEdgePoints(node, edge)}
                style={style}
                width={carriagewayWidth(style) + 0.16}
              />
            )
          })
        : null}
      {!ghost
        ? validationMarkers.map(({ index, issue, point }) => (
            <group
              key={`validation:${issue.code}:${issue.nodeId ?? issue.edgeId ?? index}`}
              name={`road-validation-${issue.severity}:${issue.code}`}
              position={[point[0], point[1] + 0.55, point[2]]}
            >
              <mesh raycast={NO_RAYCAST} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.25, 0.065, 8, 24]} />
                <meshBasicMaterial
                  color={issue.severity === 'error' ? '#ef4444' : '#f59e0b'}
                  depthTest={false}
                />
              </mesh>
              <mesh position={[0, 0.02, 0]} raycast={NO_RAYCAST}>
                <sphereGeometry args={[0.075, 12, 8]} />
                <meshBasicMaterial color="#ffffff" depthTest={false} />
              </mesh>
            </group>
          ))
        : null}
      {junctionSurfaces.map(({ graphNode, junction, manualBoundary, radius, sideBands, solution, style, treatment }) => (
        <group key={graphNode.id}>
          <RoadJunctionSurface
            center={graphNode.position}
            color={
              elementSelection?.kind === 'junction' && elementSelection.id === graphNode.id
                ? '#38bdf8'
                : style.surfaceColor
            }
            ghost={ghost}
            name="road-junction-surface"
            onPointerDown={
              onSelectElement
                ? (event) => onSelectElement({ kind: 'junction', id: graphNode.id }, event)
                : undefined
            }
            nonInteractive={nonInteractive}
            solution={solution}
            surfaceY={style.surfaceThickness + 0.002}
          />
          {!ghost
            ? [...sideBands].reverse().map((band) => (
                <RoadJunctionSideBand
                  band={band}
                  center={graphNode.position}
                  key={band.kind}
                  manualBoundary={manualBoundary}
                  solution={solution}
                  surfaceY={style.surfaceThickness + band.elevationOffset}
                />
              ))
            : null}
          {!ghost && treatment === 'roundabout' ? (
            <>
              <mesh
                name="road-roundabout-island"
                position={[graphNode.position[0], graphNode.position[1] + style.surfaceThickness + 0.12, graphNode.position[2]]}
                raycast={nonInteractive ? NO_RAYCAST : undefined}
              >
                <cylinderGeometry args={[radius * 0.34, radius * 0.34, 0.22, 48]} />
                <meshStandardMaterial color="#69775a" roughness={0.92} />
              </mesh>
              <mesh
                name="road-roundabout-kerb"
                position={[graphNode.position[0], graphNode.position[1] + style.surfaceThickness + 0.2, graphNode.position[2]]}
                rotation={[Math.PI / 2, 0, 0]}
                raycast={NO_RAYCAST}
              >
                <torusGeometry args={[radius * 0.38, 0.12, 10, 48]} />
                <meshStandardMaterial color="#d7d4ca" roughness={0.9} />
              </mesh>
            </>
          ) : null}
          {!ghost &&
          junction?.manualBoundaryEnabled &&
          (elementSelection?.kind === 'junction' || elementSelection?.kind === 'corner') &&
          elementSelection.id === graphNode.id
            ? junction.manualBoundaryPoints.map((point, index) => (
                <group
                  key={`manual-boundary:${index}`}
                  name={`road-manual-boundary-point:${index + 1}`}
                  position={[
                    graphNode.position[0] + point[0],
                    graphNode.position[1] + style.surfaceThickness + 0.32,
                    graphNode.position[2] + point[1],
                  ]}
                >
                  <mesh raycast={NO_RAYCAST} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.2, 0.055, 8, 20]} />
                    <meshBasicMaterial color="#facc15" depthTest={false} />
                  </mesh>
                  <mesh raycast={NO_RAYCAST}>
                    <sphereGeometry args={[0.07, 10, 8]} />
                    <meshBasicMaterial color="#ffffff" depthTest={false} />
                  </mesh>
                </group>
              ))
            : null}
          {!ghost &&
          elementSelection?.kind === 'junction' &&
          elementSelection.id === graphNode.id
            ? junction?.primaryEdgeIds.map((edgeId) => {
                const edge = node.edges[edgeId]
                const edgeStyle = edge ? resolveStyle(node, edge) : undefined
                if (!edge || !edgeStyle) return null
                return (
                  <RoadRibbonSurface
                    color="#facc15"
                    elevationOffset={0.04}
                    key={`primary:${edgeId}`}
                    name={`road-primary-approach:${edgeId}`}
                    nonInteractive
                    points={junctionApproachIndicatorPoints(node, edge, graphNode.id)}
                    style={edgeStyle}
                    width={0.3}
                  />
                )
              })
            : null}
          {!ghost &&
          !nonInteractive &&
          onSelectElement &&
          (elementSelection?.kind === 'junction' || elementSelection?.kind === 'corner') &&
          elementSelection.id === graphNode.id
            ? solution.corners.map((corner) => {
                if (!corner.center || corner.effectiveRadius <= 0) return null
                const point = corner.innerPoints[
                  Math.floor((corner.innerPoints.length - 1) / 2)
                ]
                if (!point) return null
                const cornerKey = roadCurbCornerKey(corner.fromEdgeId, corner.toEdgeId)
                const selected =
                  elementSelection.kind === 'corner' &&
                  elementSelection.cornerKey === cornerKey
                return (
                  <mesh
                    key={`curb-corner:${cornerKey}`}
                    name={`road-curb-corner-hit:${graphNode.id}:${cornerKey}`}
                    onPointerDown={(event) =>
                      onSelectElement({
                        kind: 'corner',
                        id: graphNode.id,
                        cornerKey,
                      }, event)
                    }
                    position={[
                      graphNode.position[0] + point[0],
                      graphNode.position[1] + style.surfaceThickness + 0.28,
                      graphNode.position[2] + point[1],
                    ]}
                  >
                    <sphereGeometry args={[selected ? 0.32 : 0.24, 18, 12]} />
                    <meshBasicMaterial
                      color={selected ? '#facc15' : '#f59e0b'}
                      depthTest={false}
                    />
                  </mesh>
                )
              })
            : null}
        </group>
      ))}
    </group>
  )
}
