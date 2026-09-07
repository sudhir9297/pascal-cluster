'use client'

import { useLayoutEffect, useMemo, useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { BufferGeometry, DoubleSide, Float32BufferAttribute, ShapeUtils, Vector2 } from 'three'
import {
  buildJunctionBoundaryGeometry,
  buildJunctionBoundarySidewalkGeometry,
  buildRoadRibbonGeometry,
  sampleRoadEdgePoints,
  type JunctionBoundaryGeometryData,
} from './road-network-geometry'
import { buildRoadJunctionSeams, mergeCollidingJunctionSurfaces, roadJunctionMouth, triangulateRoadBoundary, trimRoadProfileAtJunctions } from './road-junction-seams'
import { ROAD_SURFACE_MATERIALS, roadSurfaceUvs, type RoadSurfaceMaterialKind } from './road-surface-material'
import { roadSurfaceTexture } from './road-surface-textures'
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
  type RoadTransitionProfile,
} from './road-transition-profile'
import {
  RoadSignNode,
  StreetLightNode,
  type RoadGraphEdge,
  type RoadNetworkNode,
  type RoadStylePreset,
} from './schema'
import { buildRoadVariableRibbonGeometry, buildRoadPavementShell } from './road-pavement-geometry'
import { DEFAULT_ROAD_STYLE_PRESETS } from './road-style-presets'
import type { RoadElementSelection } from './store'
import { roadValidationIssuePoint, validateRoadGraph } from './road-network-validation'
import { buildRoadsideDecorationPreviews } from './roadside-decoration-rules'
import {
  buildManualRoadJunctionBand,
  buildManualRoadJunctionBoundary,
} from './road-junction-boundary-editor'
import { RoadNetworkBridgeStructures } from './road-network-bridge-model'
import { RoadNetworkEarthworks } from './road-network-earthworks-model'
import type { TerrainField } from './terrain-field-compat'
import { StreetLightModel } from './street-light-model'
import { RoadSignModel } from './road-sign-model'
import {
  buildRoadsideComponentSurfacePolygons,
  type RoadsideSurfacePolygon,
} from './roadside-openings'

const NO_RAYCAST = () => undefined
const ROADSIDE_STREET_LIGHT = StreetLightNode.parse({ lightOn: false })
const ROADSIDE_ROAD_SIGN = RoadSignNode.parse({ signId: 'stop' })
let pageIsUnloading = false
type RoadGeometryLifecycle = {
  disposeImmediately: () => void
  pendingDisposal?: ReturnType<typeof setTimeout>
  retained: boolean
}
const roadGeometryLifecycles = new WeakMap<BufferGeometry, RoadGeometryLifecycle>()

if (typeof window !== 'undefined') {
  const markPageAsUnloading = () => {
    pageIsUnloading = true
  }
  window.addEventListener('beforeunload', markPageAsUnloading, { once: true })
  window.addEventListener('pagehide', markPageAsUnloading, { once: true })
}

/**
 * WebGPU may still have the previous frame queued when React detaches a road
 * surface. Retire its buffer shortly afterwards instead of letting R3F dispose
 * it synchronously during unmount. The regular `geometry` mesh prop preserves
 * the renderer's existing buffer-binding path while only changing retirement.
 */
export function createRoadGeometry() {
  const geometry = new BufferGeometry()
  const lifecycle: RoadGeometryLifecycle = {
    disposeImmediately: geometry.dispose.bind(geometry),
    retained: false,
  }
  roadGeometryLifecycles.set(geometry, lifecycle)
  geometry.dispose = () => {
    // The browser releases the whole WebGPU device during navigation. Calling
    // dispose while its final command buffer is still being submitted is both
    // unnecessary and produces a validation-error cascade on refresh.
    if (pageIsUnloading || lifecycle.retained) return
    if (lifecycle.pendingDisposal !== undefined) clearTimeout(lifecycle.pendingDisposal)
    lifecycle.pendingDisposal = setTimeout(() => {
      lifecycle.pendingDisposal = undefined
      if (lifecycle.retained || pageIsUnloading) return
      lifecycle.disposeImmediately()
    }, 500)
  }
  return geometry
}

export function setRoadGeometryRetained(geometry: BufferGeometry, retained: boolean) {
  const lifecycle = roadGeometryLifecycles.get(geometry)
  if (!lifecycle) return
  lifecycle.retained = retained
  if (retained && lifecycle.pendingDisposal !== undefined) {
    clearTimeout(lifecycle.pendingDisposal)
    lifecycle.pendingDisposal = undefined
  }
}

function useRoadGeometryLifecycle(geometry: BufferGeometry) {
  useLayoutEffect(() => {
    setRoadGeometryRetained(geometry, true)
    return () => setRoadGeometryRetained(geometry, false)
  }, [geometry])
}

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

export function maskMappedComponentsForProfile(node: RoadNetworkNode, profile: RoadTransitionProfile): RoadTransitionProfile {
  const masks = new Map<number, Map<string, number>>()
  const samples = profile.samples
  if (samples.length < 2) return profile
  for (const surface of node.osmMappedSurfaces) {
    const component = surface.kind === 'cycleway' ? 'bike-lane' : surface.kind === 'kerb' ? 'curb' : surface.kind === 'sidewalk' ? 'sidewalk' : null
    if (!component || surface.points.length < 2) continue
    for (const point of surface.points) {
      let nearestDistance = Number.POSITIVE_INFINITY
      let nearestIndex = 0
      samples.forEach((sample, index) => {
        const distance = Math.hypot(sample.point[0] - point[0], sample.point[2] - point[2])
        if (distance < nearestDistance) { nearestDistance = distance; nearestIndex = index }
      })
      if (nearestDistance > 6) continue
      const next = samples[Math.min(samples.length - 1, nearestIndex + 1)]!
      const previous = samples[Math.max(0, nearestIndex - 1)]!
      const dx = next.point[0] - previous.point[0]
      const dz = next.point[2] - previous.point[2]
      const lateral = -dz * (point[0] - samples[nearestIndex]!.point[0]) + dx * (point[2] - samples[nearestIndex]!.point[2])
      const side = lateral >= 0 ? 'left' : 'right'
      const key = `${side}:${component}`
      for (const [offset, strength] of [[0, 1], [-1, 0.5], [1, 0.5], [-2, 0.2], [2, 0.2]] as const) {
        const index = nearestIndex + offset
        if (index < 0 || index >= samples.length) continue
        const station = masks.get(index) ?? new Map<string, number>()
        station.set(key, Math.max(station.get(key) ?? 0, strength))
        masks.set(index, station)
      }
    }
  }
  if (masks.size === 0) return profile
  return {
    ...profile,
    samples: profile.samples.map((sample, index) => {
      const masked = masks.get(index)
      if (!masked) return sample
      const components = { ...sample.components }
      for (const [key, strength] of masked) {
        const [side, kind] = key.split(':') as ['left' | 'right', keyof typeof sample.components.left]
        const component = components[side][kind]
        const width = component.width * (1 - strength)
        components[side] = { ...components[side], [kind]: { ...component, width, outerOffset: component.innerOffset + width } }
      }
      return { ...sample, components }
    }),
  }
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
  return (
    <RoadPathSurface
      color={color}
      ghost={ghost}
      points={[start, end]}
      style={style}
    />
  )
}

function RoadPathSurface({
  color,
  ghost = false,
  points,
  style,
}: {
  color?: string
  ghost?: boolean
  points: ReadonlyArray<readonly [number, number, number]>
  style: RoadStylePreset
}) {
  const crossSection = buildRoadCrossSection(style)
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

export function RoadDraftPreviewSurface({
  color,
  points,
  style,
}: {
  color?: string
  points: ReadonlyArray<readonly [number, number, number]>
  style: RoadStylePreset
}) {
  return (
    <RoadPathSurface
      color={color}
      ghost
      points={points}
      style={style}
    />
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
    const result = createRoadGeometry()
    const mesh = buildRoadRibbonGeometry(points, {
      elevationOffset,
      lateralOffset,
      surfaceThickness: style.surfaceThickness,
      width: width ?? carriagewayWidth(style),
    })
    if (mesh.positions.length === 0) return result
    result.setAttribute('position', new Float32BufferAttribute(mesh.positions, 3))
    result.setIndex(mesh.indices)
    result.setAttribute('uv', new Float32BufferAttribute(roadSurfaceUvs(mesh.positions), 2))
    result.computeVertexNormals()
    result.computeBoundingBox()
    result.computeBoundingSphere()
    return result
  }, [elevationOffset, lateralOffset, points, style, width])
  useRoadGeometryLifecycle(geometry)
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
        map={roadSurfaceTexture(style.surfaceMaterial)}
        roughness={style.surfaceMaterial ? ROAD_SURFACE_MATERIALS[style.surfaceMaterial].roughness : 0.94}
        side={DoubleSide}
        transparent={ghost || resolvedOpacity < 1}
      />
    </mesh>
  )
}

/** Pavement has depth below the finished surface, without a duplicate top face. */
type RoadPavementShellProps = (
  | { top: BufferGeometry; data?: never }
  | { top?: never; data: { positions: number[]; indices: number[] } }
) & { thickness: number | number[]; color?: string }

function RoadPavementShell({ top, data, thickness, color = '#303338' }: RoadPavementShellProps) {
  const geometry = useMemo(() => {
    const source = data ?? {
      positions: Array.from(top!.getAttribute('position').array),
      indices: Array.from(top!.getIndex()!.array),
    }
    const shell = buildRoadPavementShell(source, thickness)
    const result = createRoadGeometry()
    result.setAttribute('position', new Float32BufferAttribute(shell.positions, 3))
    result.setIndex(shell.indices)
    result.computeVertexNormals()
    result.computeBoundingBox()
    result.computeBoundingSphere()
    return result
  }, [top, data, thickness])
  useRoadGeometryLifecycle(geometry)
  return (
    <mesh name="road-pavement-body" geometry={geometry} raycast={NO_RAYCAST} receiveShadow>
      <meshStandardMaterial color={color} roughness={0.94} />
    </mesh>
  )
}

type RoadVariableRibbonSample = Pick<RoadTransitionSample, 'point' | 'surfaceThickness'> & {
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
  pavement = false,
  solidDepth,
  surfaceMaterial,
}: {
  pavement?: boolean
  solidDepth?: number
  surfaceMaterial?: RoadSurfaceMaterialKind
  color: string
  elevationOffset?: number
  ghost?: boolean
  name: string
  nonInteractive?: boolean
  samples: RoadVariableRibbonSample[]
}) {
  const geometry = useMemo(() => {
    const result = createRoadGeometry()
    if (samples.length < 2) return result
    const { positions, indices } = buildRoadVariableRibbonGeometry(samples, elevationOffset)
    result.setAttribute('position', new Float32BufferAttribute(positions, 3))
    result.setIndex(indices)
    result.setAttribute('uv', new Float32BufferAttribute(roadSurfaceUvs(positions), 2))
    result.computeVertexNormals()
    result.computeBoundingBox()
    result.computeBoundingSphere()
    return result
  }, [elevationOffset, samples])
  const pavementDepths = useMemo(
    () => samples.flatMap((sample) => [sample.surfaceThickness, sample.surfaceThickness]),
    [samples],
  )
  useRoadGeometryLifecycle(geometry)
  if (samples.length < 2) return null
  const shadowPolicy = roadRibbonShadowPolicy(ghost)
  return (
    <>
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
          map={roadSurfaceTexture(surfaceMaterial)}
          roughness={surfaceMaterial ? ROAD_SURFACE_MATERIALS[surfaceMaterial].roughness : 0.94}
          side={DoubleSide}
          transparent={ghost}
        />
      </mesh>
      {!ghost && (pavement || solidDepth) ? (
        <RoadPavementShell
          top={geometry}
          thickness={solidDepth ?? pavementDepths}
          color={solidDepth ? color : undefined}
        />
      ) : null}
    </>
  )
}

function RoadPolygonSurface({
  color,
  ghost = false,
  name,
  polygon,
  solidDepth,
}: {
  solidDepth?: number
  color: string
  ghost?: boolean
  name: string
  polygon: RoadsideSurfacePolygon
}) {
  const geometry = useMemo(() => {
    const result = createRoadGeometry()
    if (polygon.points.length < 3) return result
    const positions = polygon.points.flatMap((point) => point)
    const triangles = ShapeUtils.triangulateShape(
      polygon.points.map((point) => new Vector2(point[0], point[2])),
      [],
    )
    result.setAttribute('position', new Float32BufferAttribute(positions, 3))
    result.setIndex(triangles.flatMap((triangle) => triangle))
    result.computeVertexNormals()
    result.computeBoundingBox()
    result.computeBoundingSphere()
    return result
  }, [polygon])
  useRoadGeometryLifecycle(geometry)
  if (polygon.points.length < 3) return null
  const shadowPolicy = roadRibbonShadowPolicy(ghost)
  return (
    <>
      <mesh
        castShadow={shadowPolicy.castShadow}
        geometry={geometry}
        name={name}
        raycast={NO_RAYCAST}
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
      {!ghost && solidDepth ? (
        <RoadPavementShell top={geometry} thickness={solidDepth} color={color} />
      ) : null}
    </>
  )
}

type MappedSurface = {
  id: number
  kind: 'road-area' | 'sidewalk' | 'cycleway' | 'pedestrian-area' | 'kerb'
  tags: Record<string, string>
  points: Array<readonly [number, number, number]>
}

function RoadMappedCrossing({ crossing, ghost = false }: { crossing: { id: number; point: readonly [number, number, number]; rotationY?: number; tags: Record<string, string> }; ghost?: boolean }) {
  const lowered = crossing.tags.kerb === 'lowered' || crossing.tags.kerb === 'flush' || crossing.tags.kerb === 'no'
  const geometry = useMemo(() => {
    const result = createRoadGeometry()
    const width = 2.4
    const depth = 1.5
    const sidewalkY = lowered ? 0.105 : 0.075
    const roadY = lowered ? 0.025 : 0.045
    const bottomY = -0.06
    const positions = [
      -width / 2, sidewalkY, -depth / 2, width / 2, sidewalkY, -depth / 2,
      -width / 2, roadY, 0, width / 2, roadY, 0,
      -width / 2, sidewalkY, depth / 2, width / 2, sidewalkY, depth / 2,
      -width / 2, bottomY, -depth / 2, width / 2, bottomY, -depth / 2,
      -width / 2, bottomY, 0, width / 2, bottomY, 0,
      -width / 2, bottomY, depth / 2, width / 2, bottomY, depth / 2,
    ]
    const indices = [0, 2, 1, 1, 2, 3, 2, 4, 3, 3, 4, 5, 0, 1, 7, 0, 7, 6, 1, 3, 9, 1, 9, 7, 3, 5, 11, 3, 11, 9, 5, 4, 10, 5, 10, 11, 4, 0, 6, 4, 6, 10, 6, 7, 9, 6, 9, 10]
    result.setAttribute('position', new Float32BufferAttribute(positions, 3))
    result.setIndex(indices)
    result.computeVertexNormals()
    result.computeBoundingBox()
    result.computeBoundingSphere()
    return result
  }, [lowered])
  useRoadGeometryLifecycle(geometry)
  return (
    <mesh geometry={geometry} position={crossing.point} rotation={[0, crossing.rotationY ?? 0, 0]} name={`road-mapped-crossing:${crossing.id}`} raycast={NO_RAYCAST}>
      <meshStandardMaterial color={lowered ? '#d6d0b5' : '#aaa79f'} depthWrite={!ghost} opacity={ghost ? 0.48 : 1} roughness={0.9} transparent={ghost} />
    </mesh>
  )
}

function RoadMappedSurface({ surface, ghost = false }: { surface: MappedSurface; ghost?: boolean }) {
  const width = Number.parseFloat(surface.tags.width ?? surface.tags.est_width ?? '') || (
    surface.kind === 'cycleway' ? 2.2 : surface.kind === 'kerb' ? 0.18 : 1.8
  )
  const geometry = useMemo(() => {
    const result = createRoadGeometry()
    const points = surface.points
    if (points.length < 2 || surface.kind === 'road-area') return result
    const closed = points.length >= 3 && Math.hypot(points[0]![0] - points.at(-1)![0], points[0]![2] - points.at(-1)![2]) < 1e-5
    if (closed && surface.kind === 'pedestrian-area') {
      const mesh = triangulateRoadBoundary(points.slice(0, -1))
      result.setAttribute('position', new Float32BufferAttribute(mesh.positions, 3))
      result.setIndex(mesh.indices)
      result.computeVertexNormals()
      result.computeBoundingBox()
      result.computeBoundingSphere()
      return result
    }
    const source = closed ? points.slice(0, -1) : points
    const positions: number[] = []
    const indices: number[] = []
    for (let index = 0; index < source.length - 1; index++) {
      const start = source[index]!
      const end = source[index + 1]!
      const dx = end[0] - start[0]
      const dz = end[2] - start[2]
      const length = Math.max(Math.hypot(dx, dz), 1e-6)
      const nx = -dz / length * width / 2
      const nz = dx / length * width / 2
      const base = positions.length / 3
      positions.push(start[0] + nx, start[1] + 0.01, start[2] + nz, start[0] - nx, start[1] + 0.01, start[2] - nz, end[0] + nx, end[1] + 0.01, end[2] + nz, end[0] - nx, end[1] + 0.01, end[2] - nz)
      indices.push(base, base + 2, base + 1, base + 2, base + 3, base + 1)
    }
    result.setAttribute('position', new Float32BufferAttribute(positions, 3))
    result.setIndex(indices)
    result.computeVertexNormals()
    result.computeBoundingBox()
    result.computeBoundingSphere()
    return result
  }, [surface, width])
  useRoadGeometryLifecycle(geometry)
  if ((geometry.getAttribute('position')?.count ?? 0) === 0) return null
  const color = surface.kind === 'cycleway' ? '#4f8b72' : surface.kind === 'pedestrian-area' ? '#b7a98f' : surface.kind === 'kerb' ? '#777b7b' : '#9c9a91'
  return (
    <mesh geometry={geometry} name={`road-mapped-${surface.kind}:${surface.id}`} raycast={NO_RAYCAST} receiveShadow>
      <meshStandardMaterial color={color} depthWrite={!ghost} opacity={ghost ? 0.48 : 1} polygonOffset polygonOffsetFactor={-2} roughness={0.92} side={DoubleSide} transparent={ghost} />
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
  surfaceMaterial,
}: {
  color: string
  center: readonly [number, number, number]
  ghost: boolean
  name: string
  nonInteractive: boolean
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void
  solution: JunctionBoundaryGeometryData
  surfaceY: number
  surfaceMaterial?: RoadSurfaceMaterialKind
}) {
  const geometry = useMemo(() => {
    const result = createRoadGeometry()
    result.setAttribute('position', new Float32BufferAttribute(solution.positions, 3))
    result.setIndex(solution.indices)
    result.setAttribute('uv', new Float32BufferAttribute(roadSurfaceUvs(solution.positions, center), 2))
    result.computeVertexNormals()
    result.computeBoundingBox()
    result.computeBoundingSphere()
    return result
  }, [solution, center])
  useRoadGeometryLifecycle(geometry)
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
        map={roadSurfaceTexture(surfaceMaterial)}
        roughness={surfaceMaterial ? ROAD_SURFACE_MATERIALS[surfaceMaterial].roughness : 0.94}
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
  seamSurface,
}: {
  seamSurface?: { positions: number[]; indices: number[] }
  band: RoadJunctionBand
  center: readonly [number, number, number]
  manualBoundary?: ReadonlyArray<readonly [number, number]>
  solution: JunctionBoundaryGeometryData
  surfaceY: number
}) {
  const surface = useMemo(
    () =>
      seamSurface ??
      (manualBoundary
        ? buildManualRoadJunctionBand(manualBoundary, band.width, band.outerWidth - band.width)
        : buildJunctionBoundarySidewalkGeometry(
            solution,
            band.width,
            band.outerWidth - band.width,
          )),
    [band.outerWidth, band.width, manualBoundary, solution, seamSurface],
  )
  const geometry = useMemo(() => {
    const result = createRoadGeometry()
    result.setAttribute('position', new Float32BufferAttribute(surface.positions, 3))
    result.setIndex(surface.indices)
    result.computeVertexNormals()
    result.computeBoundingBox()
    result.computeBoundingSphere()
    return result
  }, [surface])
  useRoadGeometryLifecycle(geometry)
  if ((geometry.getAttribute('position')?.count ?? 0) === 0) return null
  return (
    <group position={[center[0], center[1] + surfaceY, center[2]]}>
      <mesh
        geometry={geometry}
        name={`road-junction-${band.kind}`}
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
      {band.kind === 'curb' || band.kind === 'sidewalk' ? (
        <RoadPavementShell top={geometry} thickness={surfaceY} color={band.color} />
      ) : null}
    </group>
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
    const result = createRoadGeometry()
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
  useRoadGeometryLifecycle(geometry)
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
	onSelectRoadsideDecoration,
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
	onSelectRoadsideDecoration?: (
		id: string,
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
        const mappedHoles = node.osmMappedSurfaces
          .filter((surface) => surface.kind === 'road-area' && surface.points.length >= 3)
          .map((surface) => surface.points.map((point) => [point[0] - graphNode.position[0], point[2] - graphNode.position[2]] as const))
          .filter((hole) => hole.every(([x, z]) => Math.hypot(x, z) <= solution.maxExtent + 0.5))
        return style && radius > 0
          ? [{ graphNode, junction, manualBoundary, radius, sideBands, solution: { ...solution, holes: mappedHoles }, style, treatment }]
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
        const isManual = (id: string) =>
          junctionSurfaces.some((j) => j.graphNode.id === id && j.manualBoundary)
        const surfaceProfile = trimRoadProfileAtJunctions(
          profile,
          isManual(profile.startNodeId)
            ? 0
            : (junctionTrimByApproach[`${profile.startNodeId}:${profile.edgeIds[0]}`] ?? 0),
          isManual(profile.endNodeId)
            ? 0
            : (junctionTrimByApproach[`${profile.endNodeId}:${profile.edgeIds.at(-1)}`] ?? 0),
        )
        const maskedProfile = maskMappedComponentsForProfile(node, surfaceProfile)
        return {
          decorativeProfile:
            isManual(profile.startNodeId) || isManual(profile.endNodeId)
              ? decorativeProfile
              : maskedProfile,
          profile: maskedProfile,
        }
      }),
    [junctionTrimByApproach, junctionSurfaces, node],
  )
  const renderedJunctionSurfaces = useMemo(
    () => {
      const mergedAsphalt = mergeCollidingJunctionSurfaces(junctionSurfaces.map((junction) => ({
        center: junction.graphNode.position,
        mergeKey: Object.values(node.edges)
          .filter((edge) => edge.startNodeId === junction.graphNode.id || edge.endNodeId === junction.graphNode.id)
          .map((edge) => `${edge.osmVertical?.bridge === true ? 'bridge' : edge.osmVertical?.tunnel === true ? 'tunnel' : 'at-grade'}:${edge.osmVertical?.layer ?? 0}`)
          .sort()
          .join('|'),
        solution: junction.solution,
      })))
      return junctionSurfaces.map((junction, junctionIndex) => {
        if (junction.manualBoundary) return { ...junction, bandSurfaces: undefined }
        const mouths = Object.fromEntries(
          edgeSurfaces.flatMap(({ profile }) => {
            const entries = []
            if (profile.startNodeId === junction.graphNode.id)
              entries.push([profile.edgeIds[0]!, roadJunctionMouth(profile, false)])
            if (profile.endNodeId === junction.graphNode.id)
              entries.push([profile.edgeIds.at(-1)!, roadJunctionMouth(profile, true)])
            return entries
          }),
        )
        const seams = buildRoadJunctionSeams(junction.solution, junction.graphNode.position, mouths)
        return {
          ...junction,
          solution: { ...junction.solution, ...seams.asphalt, ...mergedAsphalt[junctionIndex] },
          bandSurfaces: seams.bands,
        }
      })
    },
    [junctionSurfaces, edgeSurfaces, node.edges],
  )

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
  const roadsideDecorationPreviews = useMemo(
    () => (node.showRoadsideDecorations
      || node.roadsideItemVisibility?.lamp === true
      || node.roadsideItemVisibility?.sign === true)
      ? buildRoadsideDecorationPreviews(node).filter((decoration) =>
          node.showRoadsideDecorations
            ? node.roadsideItemVisibility?.[decoration.kind] !== false
            : node.roadsideItemVisibility?.[decoration.kind] === true,
        )
      : [],
    [node],
  )

  return (
    <group name="road-network-model">
		{!ghost ? roadsideDecorationPreviews.map((decoration) => (
			<group
				key={decoration.id}
				name={`roadside-${decoration.kind}:${decoration.id}`}
					position={decoration.position}
					rotation={[0, decoration.rotationY, 0]}
					onPointerDown={onSelectRoadsideDecoration
					? (event) => {
							event.stopPropagation()
							onSelectRoadsideDecoration(decoration.id, event)
						}
					: undefined}
				>
				{decoration.kind === 'lamp' ? (
					<StreetLightModel node={ROADSIDE_STREET_LIGHT} />
				) : (
					<RoadSignModel node={ROADSIDE_ROAD_SIGN} />
				)}
			</group>
		)) : null}
      {!ghost ? <RoadNetworkBridgeStructures node={node} /> : null}
		{!ghost ? <RoadNetworkEarthworks node={node} terrain={terrain} /> : null}
      {edgeSurfaces.map(({ decorativeProfile, profile }) => {
        return (
        <group key={profile.key}>
          <RoadVariableRibbonSurface
            pavement
            surfaceMaterial={profile.style.surfaceMaterial}
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
              const shapedPolygons = buildRoadsideComponentSurfacePolygons(
                node,
                decorativeProfile,
                side,
                spec.kind,
                spec.elevationOffset,
              )
              return shapedPolygons
                ? shapedPolygons.map((polygon, polygonIndex) => (
                    <RoadPolygonSurface
                      color={spec.color}
                      ghost={ghost}
                      key={`${side}:${spec.kind}:shape:${polygonIndex}`}
                      name={`road-side-${side}-${spec.kind}`}
                      polygon={polygon}
                      solidDepth={spec.kind === 'curb' || spec.kind === 'sidewalk' ? spec.elevationOffset : undefined}
                    />
                  ))
                : [(
                  <RoadVariableRibbonSurface
                    color={spec.color}
                    elevationOffset={spec.elevationOffset}
                    solidDepth={spec.kind === 'curb' || spec.kind === 'sidewalk' ? spec.elevationOffset : undefined}
                    ghost={ghost}
                    key={`${side}:${spec.kind}:full`}
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
                )]
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
        )
      })}
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
      {!ghost ? node.osmMappedSurfaces.map((surface) => (
        <RoadMappedSurface key={`osm-surface:${surface.kind}:${surface.id}`} surface={surface} />
      )) : null}
      {!ghost ? node.osmCrossings.map((crossing) => (
        <RoadMappedCrossing key={`osm-crossing:${crossing.id}`} crossing={crossing} />
      )) : null}
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
      {renderedJunctionSurfaces.map(({ graphNode, junction, manualBoundary, radius, sideBands, solution, style, treatment, bandSurfaces }) => (
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
            surfaceY={0}
            surfaceMaterial={style.surfaceMaterial}
          />
          {!ghost ? (
            <group position={graphNode.position}>
              <RoadPavementShell data={solution} thickness={style.surfaceThickness} />
            </group>
          ) : null}
          {!ghost
            ? [...sideBands].reverse().map((band) => (
                <RoadJunctionSideBand
                  band={band}
                  seamSurface={bandSurfaces?.[band.kind]}
                  center={graphNode.position}
                  key={band.kind}
                  manualBoundary={manualBoundary}
                  solution={solution}
                  surfaceY={band.elevationOffset}
                />
              ))
            : null}
          {!ghost && treatment === 'roundabout' ? (
            <>
              <mesh
                name="road-roundabout-island"
                position={[graphNode.position[0], graphNode.position[1] + 0.12, graphNode.position[2]]}
                raycast={nonInteractive ? NO_RAYCAST : undefined}
              >
                <cylinderGeometry args={[radius * 0.34, radius * 0.34, 0.22, 48]} />
                <meshStandardMaterial color="#69775a" roughness={0.92} />
              </mesh>
              <mesh
                name="road-roundabout-kerb"
                position={[graphNode.position[0], graphNode.position[1] + 0.2, graphNode.position[2]]}
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
                    graphNode.position[1] + 0.32,
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
                      graphNode.position[1] + 0.28,
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
