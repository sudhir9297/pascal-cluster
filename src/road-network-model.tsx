'use client'

import { useEffect, useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { BufferGeometry, DoubleSide, Float32BufferAttribute } from 'three'
import {
  buildJunctionBoundaryGeometry,
  buildJunctionBoundarySidewalkGeometry,
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
  buildRoadTransitionProfiles,
  trimRoadTransitionProfile,
  type RoadTransitionSample,
} from './road-transition-profile'
import type { RoadGraphEdge, RoadNetworkNode, RoadStylePreset } from './schema'
import { DEFAULT_ROAD_STYLE_PRESETS } from './road-style-presets'
import type { RoadElementSelection } from './store'
import { roadValidationIssuePoint, validateRoadGraph } from './road-network-validation'

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
    if (points.length < 2) return result
    const halfWidth = (width ?? carriagewayWidth(style)) / 2
    const positions: number[] = []
    for (let index = 0; index < points.length; index++) {
      const point = points[index]!
      const previous = points[Math.max(0, index - 1)]!
      const next = points[Math.min(points.length - 1, index + 1)]!
      const dx = next[0] - previous[0]
      const dz = next[2] - previous[2]
      const length = Math.max(Math.hypot(dx, dz), 1e-6)
      const normalX = -dz / length
      const normalZ = dx / length
      const centerX = point[0] + normalX * lateralOffset
      const centerZ = point[2] + normalZ * lateralOffset
      const y = point[1] + style.surfaceThickness + elevationOffset
      positions.push(centerX + normalX * halfWidth, y, centerZ + normalZ * halfWidth)
      positions.push(centerX - normalX * halfWidth, y, centerZ - normalZ * halfWidth)
    }
    const indices: number[] = []
    for (let index = 0; index < points.length - 1; index++) {
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
  solution,
  surfaceY,
}: {
  band: RoadJunctionBand
  center: readonly [number, number, number]
  solution: JunctionBoundaryGeometryData
  surfaceY: number
}) {
  const surface = useMemo(
    () => buildJunctionBoundarySidewalkGeometry(solution, band.outerWidth),
    [band.outerWidth, solution],
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
  elementSelection,
  ghost = false,
  nonInteractive = false,
  node,
  onSelectElement,
}: {
  elementSelection?: RoadElementSelection | null
  ghost?: boolean
  nonInteractive?: boolean
  node: RoadNetworkNode
  onSelectElement?: (
    selection: Omit<RoadElementSelection, 'networkId'>,
    event: ThreeEvent<PointerEvent>,
  ) => void
}) {
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
        const solution = buildJunctionBoundaryGeometry(
          approaches,
          junction?.cornerRadii ?? {},
        )
        return style && radius > 0
          ? [{ graphNode, junction, radius, sideBands, solution, style, treatment }]
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
      buildRoadTransitionProfiles(node).map((profile) => {
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
  const validationMarkers = useMemo(
    () =>
      validateRoadGraph(node).flatMap((issue, index) => {
        const point = roadValidationIssuePoint(node, issue)
        return point ? [{ index, issue, point }] : []
      }),
    [node],
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

  return (
    <group name="road-network-model">
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
      {junctionSurfaces.map(({ graphNode, junction, radius, sideBands, solution, style, treatment }) => (
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
