'use client'

import {
  emitter,
  type AnyNode,
  type AnyNodeId,
  type GridEvent,
  useScene,
} from '@pascal-app/core'
import { CursorSphere, EDITOR_LAYER, triggerSFX, useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useEffect, useMemo, useRef, useState } from 'react'
import { type Group } from 'three'
import { RoadSegmentSurface } from './road-network-model'
import { sampleRoadEdgePoints } from './road-network-geometry'
import {
  createDefaultRoadStyle,
  createEmptyRoadGraph,
  insertRoadSegment,
  mergeRoadGraphs,
  previewRoadInsertion,
  snapRoadDraftPoint,
  splitRoadGraphComponents,
  type RoadDraftSnapTarget,
  type RoadInsertionOperation,
  type RoadPoint,
} from './road-network-topology'
import { RoadNetworkNode } from './schema'
import { snapXZ } from './placement'
import { nextRoadElevationMode, useEnvironmentStore } from './store'
import { roadGraphHasBlockingIssues } from './road-network-validation'

const ROAD_OPERATION_COLORS: Record<RoadInsertionOperation, string> = {
  'create-cross': '#22c55e',
  'create-tee': '#f59e0b',
  duplicate: '#ef4444',
  'extend-road': '#3b82f6',
  'join-endpoints': '#06b6d4',
  'new-road': '#60a5fa',
  'no-connection': '#ef4444',
  'too-short': '#ef4444',
}

const WALL_STYLE_CURSOR_HEIGHT = 2.5

export function RoadDraftCursor({ color }: { color: string }) {
  return (
    <group name="road-draft-cursor">
      <CursorSphere color={color} height={WALL_STYLE_CURSOR_HEIGHT} showTooltip={false} />
    </group>
  )
}

function roadNetworks(levelId: string): RoadNetworkNode[] {
  return Object.values(useScene.getState().nodes).filter(
    (node) =>
      (node.type as string) === 'environment:road-network' &&
      (node as { parentId?: string }).parentId === levelId,
  ) as unknown as RoadNetworkNode[]
}

function snappedPlanPoint(event: GridEvent): [number, number, number] {
  const [x, z] = snapXZ(event.localPosition[0], event.localPosition[2])
  const elevationMode = useEnvironmentStore.getState().roadElevationMode
  const elevation = elevationMode === 'bridge' ? 4 : 0
  return [x, event.localPosition[1] + elevation, z]
}

function roadMagneticSnapTolerance(networks: RoadNetworkNode[]): number {
  let tolerance = Math.max(0.5, ...networks.map((network) => network.snapTolerance))
  for (const network of networks) {
    for (const edge of Object.values(network.edges)) {
      const styleId = network.applyStyleToAll ? network.activeStyleId : edge.styleId
      const style = network.stylePresets[styleId]
      if (!style) continue
      const carriagewayWidth =
        style.laneCount * style.laneWidth + style.shoulderWidth * 2 + style.medianWidth
      // Capture anywhere over the visible road/sidewalk footprint, then pull
      // the cursor to the actual centerline before topology preview/commit.
      tolerance = Math.max(tolerance, carriagewayWidth / 2 + style.sidewalkWidth + 0.4)
    }
  }
  return tolerance
}

function commitSegment(
  levelId: string,
  start: RoadPoint,
  end: RoadPoint,
  alignment: RoadPoint[],
): RoadNetworkNode | null {
  const existing = roadNetworks(levelId)
  const merged = mergeRoadGraphs(existing)
  const graph = existing.length > 0 ? merged.graph : createEmptyRoadGraph()
  const result = insertRoadSegment(graph, start, end, {
    alignment,
    bendRadius: useEnvironmentStore.getState().roadBendRadius,
    tolerance: existing[0]?.snapTolerance ?? 0.5,
    elevationMode: useEnvironmentStore.getState().roadElevationMode,
    joinMode: useEnvironmentStore.getState().roadJoinMode,
    level: useEnvironmentStore.getState().roadElevationMode === 'ground' ? 0 : 1,
    stackLevel: useEnvironmentStore.getState().roadElevationMode === 'bridge' ? 1 : 0,
  })
  if (result.status !== 'inserted') return existing[0] ?? null
  if (roadGraphHasBlockingIssues(result.graph)) return null
  const components = splitRoadGraphComponents(result.graph)
  const targetIndex = Math.max(
    0,
    components.findIndex((component) =>
      result.createdEdgeIds.some((edgeId) => edgeId in component.edges),
    ),
  )
  const scene = useScene.getState()
  const resolvedNetworks: RoadNetworkNode[] = []
  const template = existing[0]
  for (let index = 0; index < components.length; index++) {
    const component = components[index]!
    const current = existing[index]
    if (current) {
      scene.updateNode(current.id as AnyNodeId, {
        graphNodes: component.graphNodes,
        edges: component.edges,
        junctions: component.junctions,
        stylePresets: component.stylePresets,
      } as Partial<AnyNode>)
      resolvedNetworks.push({
        ...current,
        graphNodes: component.graphNodes,
        edges: component.edges,
        junctions: component.junctions,
        stylePresets: component.stylePresets,
      })
      continue
    }
    const network = RoadNetworkNode.parse({
      parentId: levelId,
      graphNodes: component.graphNodes,
      edges: component.edges,
      junctions: component.junctions,
      stylePresets: component.stylePresets,
      activeStyleId: template?.activeStyleId ?? component.activeStyleId,
      applyStyleToAll: template?.applyStyleToAll ?? true,
      snapTolerance: template?.snapTolerance ?? 0.5,
    })
    scene.createNode(network as unknown as AnyNode, levelId as AnyNodeId)
    resolvedNetworks.push(network)
  }
  for (const obsolete of existing.slice(components.length)) {
    scene.deleteNode(obsolete.id as AnyNodeId)
  }
  return resolvedNetworks[targetIndex] ?? null
}

/** Multi-click centerline drafting for incremental straight legs or one spline. */
export default function RoadNetworkTool() {
  const activeLevelId = useViewer((state) => state.selection.levelId)
  const cursorRef = useRef<Group>(null)
  const startRef = useRef<[number, number, number] | null>(null)
  const splinePointsRef = useRef<Array<[number, number, number]>>([])
  const [start, setStart] = useState<[number, number, number] | null>(null)
  const [splinePoints, setSplinePoints] = useState<Array<[number, number, number]>>([])
  const [cursor, setCursor] = useState<[number, number, number] | null>(null)
  const [snapTarget, setSnapTarget] = useState<RoadDraftSnapTarget | null>(null)
  const style = useMemo(() => createDefaultRoadStyle(), [])
  const alignmentMode = useEnvironmentStore((state) => state.roadAlignmentMode)
  const bendRadius = useEnvironmentStore((state) => state.roadBendRadius)
  const elevationMode = useEnvironmentStore((state) => state.roadElevationMode)
  const joinMode = useEnvironmentStore((state) => state.roadJoinMode)

  useEffect(() => {
    startRef.current = null
    splinePointsRef.current = []
    setStart(null)
    setSplinePoints([])
    setSnapTarget(null)
    ;(useEditor.getState() as ReturnType<typeof useEditor.getState> & {
      setDraftVertexCount?: (count: number) => void
    }).setDraftVertexCount?.(0)
  }, [alignmentMode])

  const previewOperation = useMemo<RoadInsertionOperation | null>(() => {
    if (!activeLevelId || !start || !cursor) return null
    const existing = roadNetworks(activeLevelId)
    const graph = existing.length > 0 ? mergeRoadGraphs(existing).graph : createEmptyRoadGraph()
    const stackLevel = elevationMode === 'bridge' ? 1 : 0
    return previewRoadInsertion(graph, start, cursor, {
      alignment: alignmentMode === 'spline' ? splinePoints : [],
      bendRadius,
      elevationMode,
      joinMode,
      level: elevationMode === 'ground' ? 0 : 1,
      stackLevel,
      tolerance: existing[0]?.snapTolerance ?? 0.5,
    }).operation
  }, [activeLevelId, alignmentMode, bendRadius, cursor, elevationMode, joinMode, splinePoints, start])
  const previewColor = previewOperation ? ROAD_OPERATION_COLORS[previewOperation] : undefined
  const previewPoints = useMemo(() => {
    if (!start || !cursor) return []
    if (alignmentMode !== 'spline' || splinePoints.length === 0) return [start, cursor]
    return sampleRoadEdgePoints(
      {
        graphNodes: {
          previewStart: { id: 'previewStart', position: start, level: 0, elevationMode: 'ground', terminal: false },
          previewEnd: { id: 'previewEnd', position: cursor, level: 0, elevationMode: 'ground', terminal: false },
        },
      },
      {
        id: 'previewEdge',
        startNodeId: 'previewStart',
        endNodeId: 'previewEnd',
        alignment: splinePoints,
        styleId: style.id,
        direction: 'both',
        roadClass: 'local',
        joinMode: 'auto',
        stackLevel: 0,
      },
      16,
    )
  }, [alignmentMode, cursor, splinePoints, start, style.id])

  useEffect(() => {
    if (!activeLevelId) return
    const updateStart = (point: [number, number, number] | null) => {
      startRef.current = point
      setStart(point)
      ;(useEditor.getState() as ReturnType<typeof useEditor.getState> & {
        setDraftVertexCount?: (count: number) => void
      }).setDraftVertexCount?.(point ? 1 : 0)
    }
    const updateSplinePoints = (points: Array<[number, number, number]>) => {
      splinePointsRef.current = points
      setSplinePoints(points)
      ;(useEditor.getState() as ReturnType<typeof useEditor.getState> & {
        setDraftVertexCount?: (count: number) => void
      }).setDraftVertexCount?.((startRef.current ? 1 : 0) + points.length)
    }
    const resolveDraftPoint = (event: GridEvent) => {
      const point = snappedPlanPoint(event)
      const store = useEnvironmentStore.getState()
      const existing = roadNetworks(activeLevelId)
      if (existing.length === 0) return { point, target: null }
      const target = snapRoadDraftPoint(mergeRoadGraphs(existing).graph, point, {
        elevationMode: store.roadElevationMode,
        joinMode: store.roadJoinMode,
        level: store.roadElevationMode === 'ground' ? 0 : 1,
        nodeTolerance: Math.max(0.5, ...existing.map((network) => network.snapTolerance)),
        stackLevel: store.roadElevationMode === 'bridge' ? 1 : 0,
        tolerance: roadMagneticSnapTolerance(existing),
      })
      return { point: target?.point ?? point, target }
    }
    const onMove = (event: GridEvent) => {
      const { point, target } = resolveDraftPoint(event)
      setSnapTarget(target)
      setCursor(point)
      cursorRef.current?.position.set(point[0], point[1], point[2])
    }
    const onClick = (event: GridEvent) => {
      const { point, target } = resolveDraftPoint(event)
      setSnapTarget(target)
      const previous = startRef.current
      if (!previous) {
        updateStart(point)
        triggerSFX('sfx:item-place')
        return
      }
      if (useEnvironmentStore.getState().roadAlignmentMode === 'spline') {
        const last = splinePointsRef.current.at(-1) ?? previous
        if (Math.hypot(point[0] - last[0], point[2] - last[2]) < 0.05) return
        setSnapTarget(null)
        updateSplinePoints([...splinePointsRef.current, point])
        triggerSFX('sfx:item-place')
        return
      }
      const network = commitSegment(activeLevelId, previous, point, [])
      if (!network) return
      useViewer.getState().setSelection({ selectedIds: [network.id as AnyNodeId] })
      triggerSFX('sfx:item-place')
      // Continue from the last committed point so successive clicks form
      // L, V, and free polyline roads without changing tools.
      updateStart(point)
      updateSplinePoints([])
      setSnapTarget(null)
    }
    const clearDraft = () => {
      updateSplinePoints([])
      updateStart(null)
      setSnapTarget(null)
    }
    const finish = () => {
      if (
        useEnvironmentStore.getState().roadAlignmentMode === 'spline' &&
        startRef.current &&
        splinePointsRef.current.length > 0
      ) {
        const end = splinePointsRef.current.at(-1)!
        const alignment = splinePointsRef.current.slice(0, -1)
        const network = commitSegment(activeLevelId, startRef.current, end, alignment)
        if (network) {
          useViewer.getState().setSelection({ selectedIds: [network.id as AnyNodeId] })
          triggerSFX('sfx:item-place')
        }
      }
      clearDraft()
      // Leaving `mode: 'build'` with the Road tool still armed keeps every
      // road mesh intentionally click-through. Return to Select so the road
      // that was just committed can immediately receive selection events.
      useEditor.getState().setTool(null)
      useEditor.getState().setMode('select')
    }
    const onDoubleClick = finish
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') finish()
      if (event.key.toLowerCase() === 'c') {
        const store = useEnvironmentStore.getState()
        store.setRoadAlignmentMode(store.roadAlignmentMode === 'straight' ? 'spline' : 'straight')
        clearDraft()
      }
      if (event.key.toLowerCase() === 'b') {
        const store = useEnvironmentStore.getState()
        store.setRoadElevationMode(nextRoadElevationMode(store.roadElevationMode))
        clearDraft()
      }
      if (event.key.toLowerCase() === 'j') {
        const store = useEnvironmentStore.getState()
        store.setRoadJoinMode(store.roadJoinMode === 'auto' ? 'suppress' : 'auto')
      }
    }

    emitter.on('grid:move', onMove)
    emitter.on('grid:click', onClick)
    emitter.on('grid:double-click', onDoubleClick)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      emitter.off('grid:move', onMove)
      emitter.off('grid:click', onClick)
      emitter.off('grid:double-click', onDoubleClick)
      window.removeEventListener('keydown', onKeyDown)
      ;(useEditor.getState() as ReturnType<typeof useEditor.getState> & {
        setDraftVertexCount?: (count: number) => void
      }).setDraftVertexCount?.(0)
    }
  }, [activeLevelId])

  if (!activeLevelId) return null
  return (
    <group layers={EDITOR_LAYER} ref={cursorRef}>
      {snapTarget ? (
        <group name={`road-draft-snap-${snapTarget.kind}`} position={[0, 0.095, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.36, 0.055, 10, 32]} />
            <meshBasicMaterial
              color={snapTarget.kind === 'node' ? '#06b6d4' : '#22c55e'}
              depthTest={false}
            />
          </mesh>
          <mesh position={[0, 0.015, 0]}>
            <cylinderGeometry args={[0.075, 0.075, 0.035, 20]} />
            <meshBasicMaterial color="#ffffff" depthTest={false} />
          </mesh>
        </group>
      ) : null}
      {previewPoints.length >= 2 && cursor ? (
        <group position={[-cursor[0], -cursor[1], -cursor[2]]}>
          {previewPoints.slice(0, -1).map((point, index) => (
            <RoadSegmentSurface
              color={previewColor}
              end={previewPoints[index + 1]!}
              ghost
              key={`${index}:${point[0]}:${point[2]}`}
              start={point}
              style={style}
            />
          ))}
        </group>
      ) : null}
      <RoadDraftCursor
        color={
          previewColor ?? (elevationMode === 'bridge'
            ? '#f59e0b'
            : joinMode === 'suppress'
              ? '#ef4444'
              : splinePoints.length > 0
                ? '#14b8a6'
                : alignmentMode === 'spline'
                  ? '#22d3ee'
                  : start
                    ? '#3b82f6'
                    : '#818cf8')
        }
      />
      {previewOperation && ['create-tee', 'create-cross', 'no-connection'].includes(previewOperation) ? (
        <mesh name={`road-operation-${previewOperation}`} position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.3, 0.055, 8, 24]} />
          <meshBasicMaterial color={previewColor} depthTest={false} />
        </mesh>
      ) : null}
    </group>
  )
}
