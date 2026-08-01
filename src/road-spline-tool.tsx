'use client'

import { type AnyNode, type AnyNodeId, emitter, type GridEvent, useScene } from '@pascal-app/core'
import { EDITOR_LAYER, triggerSFX, useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  findRoadIntersections,
  findNearestRoadConnection,
  ROAD_CONNECTION_SNAP_DISTANCE,
  worldToRoadLocalPoint,
  type RoadConnection,
} from './road-connections'
import { appendOrthogonalRoute, dedupeRoadPoints, previewRoadPoints } from './road-path'
import { RoadSplineNode, type RoadSplinePoint } from './schema'
import RoadSplinePreview from './road-spline-preview'
import { snapXZ } from './placement'
import { useEnvironmentStore } from './store'

export default function RoadSplineTool() {
  const activeLevelId = useViewer((state) => state.selection.levelId)
  const roadWidth = useEnvironmentStore((state) => state.roadWidth)
  const roadPathMode = useEnvironmentStore((state) => state.roadPathMode)
  const roadLaneCount = useEnvironmentStore((state) => state.roadLaneCount)
  const roadCenterLineStyle = useEnvironmentStore((state) => state.roadCenterLineStyle)
  const roadEdgeLines = useEnvironmentStore((state) => state.roadEdgeLines)
  const [draftPoints, setDraftPoints] = useState<RoadSplinePoint[]>([])
  const [cursorPath, setCursorPath] = useState<RoadSplinePoint[] | null>(null)
  const [cursorPosition, setCursorPosition] = useState<[number, number] | null>(null)
  const baseRef = useRef<[number, number] | null>(null)
  const draftRef = useRef<RoadSplinePoint[]>([])
  const draftJunctionsRef = useRef<RoadSplinePoint[]>([])
  const draftConnectionsRef = useRef<Array<{ nodeId: string; worldPoint: RoadSplinePoint }>>([])
  const cursorRef = useRef<[number, number] | null>(null)

  const clearDraft = () => {
    baseRef.current = null
    draftRef.current = []
    draftJunctionsRef.current = []
    draftConnectionsRef.current = []
    setDraftPoints([])
    setCursorPath(null)
    cursorRef.current = null
    setCursorPosition(null)
  }

  useEffect(() => {
    if (!activeLevelId) return
    clearDraft()

    const synchronizeExistingRoadIntersections = () => {
      const scene = useScene.getState()
      const roads = Object.values(scene.nodes).filter(
        (node) => (node.type as string) === 'environment:road-spline' && node.parentId === activeLevelId,
      ).map((node) => RoadSplineNode.parse(node))
      const junctionsByNode = new Map<string, RoadSplinePoint[]>()

      for (const source of roads) {
        const maxDistance = Math.min(3, Math.max(ROAD_CONNECTION_SNAP_DISTANCE, source.width * 0.2))
        for (const intersection of findRoadIntersections(source, roads, maxDistance)) {
          const existingRoad = roads.find((road) => road.id === intersection.nodeId)
          if (!existingRoad) continue
          const junctions = junctionsByNode.get(existingRoad.id) ?? []
          junctions.push(worldToRoadLocalPoint(existingRoad, intersection.worldPoint))
          junctionsByNode.set(existingRoad.id, junctions)
        }
      }

      for (const [nodeId, junctions] of junctionsByNode) {
        const existingRoad = roads.find((road) => road.id === nodeId)
        if (!existingRoad) continue
        const nextJunctions = dedupeRoadPoints([...(existingRoad.junctions ?? []), ...junctions])
        if (nextJunctions.length === (existingRoad.junctions ?? []).length) continue
        scene.updateNode(existingRoad.id as AnyNodeId, { junctions: nextJunctions } as never)
      }
    }

    synchronizeExistingRoadIntersections()

    const resolveRoadConnection = (point: [number, number]): RoadConnection | null => {
      const brush = useEnvironmentStore.getState()
      const roads = Object.values(useScene.getState().nodes).filter(
        (node) =>
          (node.type as string) === 'environment:road-spline' && node.parentId === activeLevelId,
      ) as unknown as RoadSplineNode[]
      return findNearestRoadConnection(
        point,
        roads,
        Math.max(ROAD_CONNECTION_SNAP_DISTANCE, brush.roadWidth * 0.2),
      )
    }

    const updateCursor = (event: GridEvent) => {
      const [x, z] = snapXZ(event.localPosition[0], event.localPosition[2])
      const connection = resolveRoadConnection([x, z])
      const [connectedX, connectedZ] = connection?.point ?? [x, z]
      cursorRef.current = [connectedX, connectedZ]
      setCursorPosition([connectedX, connectedZ])
      const base = baseRef.current
      if (!base) return
      setCursorPath(
        previewRoadPoints(
          draftRef.current,
          [connectedX - base[0], connectedZ - base[1]],
          useEnvironmentStore.getState().roadPathMode,
        ).slice(draftRef.current.length),
      )
    }

    const finishRoad = () => {
      const base = baseRef.current
      const points = draftRef.current
      if (!base || points.length < 2) {
        clearDraft()
        useEditor.getState().setMode('select')
        return
      }

      const brush = useEnvironmentStore.getState()
      const scene = useScene.getState()
      const existingRoads = Object.values(scene.nodes).filter(
        (node) => (node.type as string) === 'environment:road-spline' && node.parentId === activeLevelId,
      ).map((node) => RoadSplineNode.parse(node))
      const draftJunctions = dedupeRoadPoints(draftJunctionsRef.current)
      const draftRoad = RoadSplineNode.parse({
        position: [base[0], 0, base[1]],
        points,
        pathMode: brush.roadPathMode,
        junctions: draftJunctions,
        width: brush.roadWidth,
        laneCount: brush.roadLaneCount,
        centerLineStyle: brush.roadCenterLineStyle,
        edgeLines: brush.roadEdgeLines,
      })
      const connectionDistance = Math.min(3, Math.max(ROAD_CONNECTION_SNAP_DISTANCE, brush.roadWidth * 0.2))
      const intersections = findRoadIntersections(draftRoad, existingRoads, connectionDistance)
      const road = RoadSplineNode.parse({
        ...draftRoad,
        junctions: dedupeRoadPoints([
          ...draftJunctions,
          ...intersections.map((intersection) => worldToRoadLocalPoint(draftRoad, intersection.worldPoint)),
        ]),
      })

      const junctionsByNode = new Map<string, RoadSplinePoint[]>()
      for (const connection of draftConnectionsRef.current) {
        const junctions = junctionsByNode.get(connection.nodeId) ?? []
        const existingNode = existingRoads.find((node) => node.id === connection.nodeId)
        if (existingNode) junctions.push(worldToRoadLocalPoint(existingNode, connection.worldPoint))
        junctionsByNode.set(connection.nodeId, junctions)
      }
      for (const intersection of intersections) {
        const existingRoad = existingRoads.find((node) => node.id === intersection.nodeId)
        if (!existingRoad) continue
        const junctions = junctionsByNode.get(intersection.nodeId) ?? []
        junctions.push(worldToRoadLocalPoint(existingRoad, intersection.worldPoint))
        junctionsByNode.set(intersection.nodeId, junctions)
      }
      for (const [nodeId, junctions] of junctionsByNode) {
        const existingRoad = existingRoads.find((node) => node.id === nodeId)
        if (!existingRoad) continue
        scene.updateNode(existingRoad.id as AnyNodeId, {
          junctions: dedupeRoadPoints([...(existingRoad.junctions ?? []), ...junctions]),
        } as never)
      }
      scene.createNode(road as unknown as AnyNode, activeLevelId as AnyNodeId)
      useViewer.getState().setSelection({ selectedIds: [road.id as AnyNodeId] })
      triggerSFX('sfx:item-place')
      clearDraft()
      useEditor.getState().setMode('select')
    }

    const addPointAt = (x: number, z: number, connection: RoadConnection | null = null) => {
      const base = baseRef.current
      if (!base) {
        baseRef.current = [x, z]
        draftRef.current = [[0, 0]]
        if (connection) {
          draftJunctionsRef.current = [[0, 0]]
          draftConnectionsRef.current = [{ nodeId: connection.nodeId, worldPoint: connection.point }]
        }
        setDraftPoints([[0, 0]])
        setCursorPath(null)
        return
      }

      const point: RoadSplinePoint = [x - base[0], z - base[1]]
      const mode = useEnvironmentStore.getState().roadPathMode
      const nextPoints = mode === 'orthogonal'
        ? [...draftRef.current, ...appendOrthogonalRoute(draftRef.current, point)]
        : [...draftRef.current, point]
      if (nextPoints.length === draftRef.current.length) return
      draftRef.current = nextPoints
      if (connection) {
        draftJunctionsRef.current = [...draftJunctionsRef.current, point]
        draftConnectionsRef.current = [
          ...draftConnectionsRef.current,
          { nodeId: connection.nodeId, worldPoint: connection.point },
        ]
      }
      setDraftPoints(nextPoints)
      setCursorPath(null)
    }

    const onGridClick = (event: GridEvent) => {
      const [x, z] = snapXZ(event.localPosition[0], event.localPosition[2])
      const connection = resolveRoadConnection([x, z])
      const [connectedX, connectedZ] = connection?.point ?? [x, z]
      addPointAt(connectedX, connectedZ, connection)
    }

    const onGridDoubleClick = (event: GridEvent) => {
      const [x, z] = snapXZ(event.localPosition[0], event.localPosition[2])
      const connection = resolveRoadConnection([x, z])
      const [connectedX, connectedZ] = connection?.point ?? [x, z]
      addPointAt(connectedX, connectedZ, connection)
      finishRoad()
    }

    const onCancel = () => {
      clearDraft()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      if (event.key === 'Enter') {
        event.preventDefault()
        finishRoad()
      } else if (event.key === 'Backspace' && draftRef.current.length > 0) {
        event.preventDefault()
        const nextPoints = draftRef.current.slice(0, -1)
        if (nextPoints.length === 0) {
          clearDraft()
        } else {
          draftRef.current = nextPoints
          setDraftPoints(nextPoints)
          const base = baseRef.current
          const cursor = cursorRef.current
          setCursorPath(
            base && cursor
              ? previewRoadPoints(
                  nextPoints,
                  [cursor[0] - base[0], cursor[1] - base[1]],
                  useEnvironmentStore.getState().roadPathMode,
                ).slice(nextPoints.length)
              : null,
          )
        }
      }
    }

    emitter.on('grid:move', updateCursor)
    emitter.on('grid:click', onGridClick)
    emitter.on('grid:double-click', onGridDoubleClick)
    emitter.on('tool:cancel', onCancel)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      emitter.off('grid:move', updateCursor)
      emitter.off('grid:click', onGridClick)
      emitter.off('grid:double-click', onGridDoubleClick)
      emitter.off('tool:cancel', onCancel)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [activeLevelId])

  const displayPoints = useMemo(() => {
    if (draftPoints.length === 0) return []
    if (!cursorPath) return draftPoints
    return [...draftPoints, ...cursorPath]
  }, [cursorPath, draftPoints])

  const previewNode = useMemo(() => {
    const points = displayPoints.length >= 2 ? displayPoints : [[0, 0], [0.01, 0]]
    return RoadSplineNode.parse({
      points,
      pathMode: roadPathMode,
      width: roadWidth,
      laneCount: roadLaneCount,
      centerLineStyle: roadCenterLineStyle,
      edgeLines: roadEdgeLines,
    })
  }, [displayPoints, roadCenterLineStyle, roadEdgeLines, roadLaneCount, roadPathMode, roadWidth])

  const base = baseRef.current
  if (!activeLevelId) return null

  return (
    <group layers={EDITOR_LAYER} position={base ? [base[0], 0, base[1]] : [0, 0, 0]}>
      {draftPoints.length > 0 && <RoadSplinePreview node={previewNode} />}
      {draftPoints.length === 0 && cursorPosition && (
        <mesh position={[cursorPosition[0], 0.04, cursorPosition[1]]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 0.28, 24]} />
          <meshBasicMaterial color="#60a5fa" depthWrite={false} transparent opacity={0.9} />
        </mesh>
      )}
      {draftPoints.length > 0 && displayPoints.map(([x, z], index) => (
        <mesh key={`${x}:${z}:${index}`} position={[x, 0.04, z]}>
          <sphereGeometry args={[index >= draftPoints.length && cursorPath ? 0.14 : 0.11, 12, 8]} />
          <meshBasicMaterial color={index >= draftPoints.length && cursorPath ? '#60a5fa' : '#f59e0b'} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}
