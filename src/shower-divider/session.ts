'use client'
import {
  collectAlignmentAnchors,
  emitter,
  resolveAlignment,
  sceneRegistry,
  useScene,
  type AnyNode,
  type AnyNodeId,
  type GridEvent,
  type WallNode,
} from '@pascal-app/core'
import {
  chainEndJoinsExistingWall,
  clearPlacementSurface,
  isAlignmentGuideActive,
  isAngleSnapActive,
  isEditableKeyboardTarget,
  isMagneticSnapActive,
  markToolCancelConsumed,
  publishPlacementSurface,
  snapWallDraftPointDetailed,
  triggerSFX,
  useAlignmentGuides,
  useEditor,
  useWallSnapIndicator,
  WALL_CONNECT_SNAP_RADIUS,
} from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { Camera, Vector3 } from 'three'
import { floorPointerEvent } from '../floor-support/pointer'
import { floorPlacementPose, type FloorSurface } from '../floor-support/placement'
import {
  dividerChainEnds,
  dividerDraftError,
  dividerDraftSegments,
  type DividerDraftSegment,
} from './drawing'
import { dividerSegment, SHOWER_DIVIDER, ShowerDividerNode, type Point } from './schema'

export type DividerDraft = {
  segments: DividerDraftSegment[]
  cursor: Point | null
  elevation: number
  height: number
  depth: number
  start: Point | null
  rectangle: boolean
  error: string
}
const empty: DividerDraft = {
  segments: [],
  cursor: null,
  elevation: 0,
  height: 2,
  depth: 0.035,
  start: null,
  rectangle: false,
  error: '',
}

type Session = ReturnType<typeof createDividerSession>
const sessions = new Map<string, { session: Session; owners: number }>()

/** One event subscription for both views. Each level owns and releases its own session. */
export function createDividerSession(levelId: string) {
  let snapshot = empty
  const listeners = new Set<() => void>()
  let start: Point | null = null,
    first: Point | null = null,
    cursor: Point | null = null
  let rectangle = false,
    elevation = 0
  let supportSurface: FloorSurface | null = null
  const rayCamera = new Camera()
  let chainIds: string[] = []
  let walls: WallNode[] = []
  let anchors: ReturnType<typeof collectAlignmentAnchors> = []
  const local = new Vector3(),
    surface = new Vector3(),
    up = new Vector3(0, 1, 0)
  const parameters = () => useEditor.getState().toolDefaults[SHOWER_DIVIDER] ?? {}
  const refreshReferences = () => {
    const nodes = useScene.getState().nodes
    walls = Object.values(nodes).filter(
      (n): n is WallNode => n.type === 'wall' && n.parentId === levelId,
    )
    for (const raw of Object.values(nodes)) {
      if (String(raw.type) !== SHOWER_DIVIDER || raw.parentId !== levelId) continue
      const n = raw as unknown as ShowerDividerNode
      const dx = (Math.cos(n.rotation) * n.width) / 2,
        dz = (-Math.sin(n.rotation) * n.width) / 2
      walls.push({
        id: n.id,
        start: [n.position[0] - dx, n.position[2] - dz],
        end: [n.position[0] + dx, n.position[2] + dz],
        thickness: n.frameDepth,
      } as unknown as WallNode)
    }
    anchors = collectAlignmentAnchors(nodes, '', levelId as AnyNodeId)
    for (const wall of walls)
      for (const point of [wall.start, wall.end])
        anchors.push({
          nodeId: wall.id,
          kind: 'corner',
          x: point[0],
          z: point[1],
        })
  }
  const publish = () => {
    const defaults = parameters()
    const segments = dividerDraftSegments(start, cursor, rectangle, elevation)
    snapshot = {
      segments,
      cursor,
      start,
      rectangle,
      elevation,
      height: typeof defaults.height === 'number' ? defaults.height : 2,
      depth: typeof defaults.frameDepth === 'number' ? defaults.frameDepth : 0.035,
      error: dividerDraftError(segments),
    }
    for (const listener of listeners) listener()
  }
  const clearGuides = () => {
    useAlignmentGuides.getState().clear()
    useWallSnapIndicator.getState().clear()
  }
  const clear = () => {
    start = null
    first = null
    chainIds = []
    cursor = null
    clearGuides()
    clearPlacementSurface()
    publish()
  }
  const resolve = (event: GridEvent): Point => {
    const pointed = !start && event.nativeEvent?.ray ? floorPointerEvent(rayCamera, event) : null
    if (pointed) event = pointed.event
    const frame = sceneRegistry.nodes.get(levelId)
    local.set(...(frame ? event.position : event.localPosition))
    if (frame) {
      frame.updateWorldMatrix(true, false)
      frame.worldToLocal(local)
    }
    if (!start) {
      supportSurface = pointed?.surface ?? null
      const node = ShowerDividerNode.parse({
        ...parameters(),
        parentId: levelId,
        position: [local.x, 0, local.z],
      })
      elevation = floorPlacementPose(
        node as unknown as AnyNode,
        { position: node.position, rotation: node.rotation },
        levelId,
        useScene.getState().nodes,
        supportSurface,
      ).previewPosition[1]
    }
    const angleLocked = Boolean(start) && isAngleSnapActive()
    const bypass = Boolean(event.nativeEvent?.altKey)
    const result = snapWallDraftPointDetailed({
      point: [local.x, local.z],
      walls,
      start: angleLocked ? start! : undefined,
      angleSnap: angleLocked,
      magnetic: isMagneticSnapActive(),
      bypassSnap: bypass,
    })
    let point = result.point
    if (!bypass && isAlignmentGuideActive()) {
      const alignment = resolveAlignment({
        moving: [
          {
            nodeId: '__divider-draft__',
            kind: 'corner',
            x: point[0],
            z: point[1],
          },
        ],
        candidates: anchors,
        threshold: 0.08,
      })
      const magnetic = isMagneticSnapActive()
      useAlignmentGuides
        .getState()
        .set(
          magnetic
            ? alignment.guides
            : alignment.guides.filter(
                (guide) =>
                  Math.hypot(point[0] - guide.anchor.x, point[1] - guide.anchor.z) <=
                  WALL_CONNECT_SNAP_RADIUS,
              ),
        )
      if (magnetic && !angleLocked && alignment.snap)
        point = [point[0] + alignment.snap.dx, point[1] + alignment.snap.dz]
    } else useAlignmentGuides.getState().clear()
    useWallSnapIndicator
      .getState()
      .set(result.snap ? { x: point[0], z: point[1], kind: result.snap } : null)
    return point
  }
  const move = (event: GridEvent) => {
    if (useViewer.getState().cameraDragging) return
    const point = resolve(event)
    if (
      cursor &&
      cursor[0] === point[0] &&
      cursor[1] === point[1] &&
      snapshot.elevation === elevation
    )
      return
    cursor = point
    publish()
  }
  const click = (event: GridEvent) => {
    if (
      (event.nativeEvent?.button !== undefined && event.nativeEvent.button !== 0) ||
      useViewer.getState().cameraDragging ||
      useScene.getState().readOnly
    )
      return
    if (start && (event.nativeEvent?.detail ?? 0) >= 2) {
      clear()
      return
    }
    cursor = resolve(event)
    if (!start) {
      start = cursor
      first = cursor
      surface.set(local.x, elevation, local.z)
      sceneRegistry.nodes.get(levelId)?.localToWorld(surface)
      // Freeze the drawing plane at the first click, as the wall tool does.
      publishPlacementSurface(surface, up, 'fixed-plane')
      triggerSFX('sfx:structure-build-start')
      publish()
      return
    }
    const segments = dividerDraftSegments(start, cursor, rectangle, elevation)
    if (dividerDraftError(segments) || segments.some((segment) => segment.width < 0.2)) {
      publish()
      return
    }
    const nodes = segments.map(
      (segment) =>
        dividerSegment(segment.start, segment.end, {
          ...parameters(),
          parentId: levelId as AnyNodeId,
          position: [0, 0, 0],
        })!,
    )
    const supported = nodes.map((node) =>
      ShowerDividerNode.parse({
        ...node,
        ...floorPlacementPose(
          node as unknown as AnyNode,
          { position: node.position, rotation: node.rotation },
          levelId,
          useScene.getState().nodes,
          supportSurface,
        ),
      }),
    )
    useScene.getState().applyNodeChanges({
      create: supported.map((node) => ({
        node: node as unknown as AnyNode,
        parentId: levelId as AnyNodeId,
      })),
    })
    chainIds.push(...nodes.map((node) => node.id))
    const stop = dividerChainEnds({
      rectangle,
      continuation: useEditor.getState().getContinuation('wall'),
      end: cursor,
      first: first!,
      joinedExisting: chainEndJoinsExistingWall(cursor, walls, chainIds),
    })
    triggerSFX('sfx:structure-build')
    clearGuides()
    if (stop) clear()
    else {
      start = cursor
      publish()
    }
  }
  // Let the editor own Escape, right-click cancellation and history shortcuts.
  const cancel = () => {
    if (start) {
      markToolCancelConsumed()
      clear()
    }
  }
  const key = (event: KeyboardEvent) => {
    if (
      isEditableKeyboardTarget(event.target) ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.repeat
    )
      return
    if (event.key.toLowerCase() !== 'r' && event.key !== 'Enter') return
    event.preventDefault()
    event.stopImmediatePropagation()
    if (event.key.toLowerCase() === 'r') rectangle = !rectangle
    clear()
  }
  refreshReferences()
  const scene = useScene.subscribe((state, before) => {
    if (state.nodes !== before.nodes) refreshReferences()
  })
  const defaults = useEditor.subscribe((state, before) => {
    if (state.toolDefaults[SHOWER_DIVIDER] !== before.toolDefaults[SHOWER_DIVIDER]) publish()
  })
  emitter.on('grid:move', move)
  emitter.on('grid:click', click)
  emitter.on('tool:cancel', cancel)
  window.addEventListener('keydown', key, true)
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    dispose: () => {
      emitter.off('grid:move', move)
      emitter.off('grid:click', click)
      emitter.off('tool:cancel', cancel)
      window.removeEventListener('keydown', key, true)
      scene()
      defaults()
      clearGuides()
      clearPlacementSurface()
    },
  }
}

export function acquireDividerSession(levelId: string) {
  let entry = sessions.get(levelId)
  if (!entry) {
    entry = { session: createDividerSession(levelId), owners: 0 }
    sessions.set(levelId, entry)
  }
  entry.owners++
  let released = false
  return {
    session: entry.session,
    release: () => {
      if (released) return
      released = true
      if (--entry.owners === 0) {
        entry.session.dispose()
        sessions.delete(levelId)
      }
    },
  }
}

const idleSubscribe = () => () => {}
export function useDividerDraft(levelId: string | null) {
  // Start listeners in an effect; subscription reads remain side-effect free.
  const session = useSession(levelId)
  return useSyncExternalStore(
    session?.subscribe ?? idleSubscribe,
    session?.getSnapshot ?? (() => empty),
    () => empty,
  )
}
function useSession(levelId: string | null) {
  const [session, setSession] = useState<Session | null>(null)
  useEffect(() => {
    if (!levelId) {
      setSession(null)
      return
    }
    const lease = acquireDividerSession(levelId)
    setSession(lease.session)
    return lease.release
  }, [levelId])
  return session
}
