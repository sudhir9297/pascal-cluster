'use client'

import {
  emitter,
  type AnyNodeId,
  type GridEvent,
  sceneRegistry,
  snapPointToGrid,
  useScene,
  type WallEvent,
} from '@pascal-app/core'
import { getSideFromNormal, isValidWallSideFace, useEditor } from '@pascal-app/editor'
import { useEffect, useRef, useState } from 'react'
import { type Group, Vector3 } from 'three'
import { findCeilingPlacementTarget } from './ceiling-placement'
import type { EnvironmentPlacementMode } from './store'
import {
  resolveWallArmAttachment,
  resolveWallArmPlanAttachment,
  type WallArmAttachment,
  type WallMountBounds,
} from './wall-arm-light-placement'
import { resolvePlacementPosition } from './placement-position'

const worldVec = new Vector3()
export const PLACEMENT_ROTATION_STEP = Math.PI / 4

/** Advance a placement preview by one 45-degree turn. Shift+R reverses it. */
export function advancePlacementRotation(rotationY: number, reverse = false): number {
  return rotationY + (reverse ? -PLACEMENT_ROTATION_STEP : PLACEMENT_ROTATION_STEP)
}

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (
    target.isContentEditable
    || target.tagName === 'INPUT'
    || target.tagName === 'TEXTAREA'
    || target.tagName === 'SELECT'
  )
}

export type PlacementPreviewTransform = {
  position: [number, number, number]
  rotation: [number, number, number]
}

/** Finish a point placement according to the Environment panel's active mode. */
export function finishEnvironmentPlacement(mode: EnvironmentPlacementMode): void {
  if (mode === 'single') useEditor.getState().setMode('select')
}

/** Snap a planar position to the grid when grid snapping is the active mode —
 * reading the same `isGridSnapActive()` toggle + `gridSnapStep` the built-in
 * item/shelf tools use, so plants honour the snap mode like every other item. */
export function snapXZ(x: number, z: number): readonly [number, number] {
  const editor = useEditor.getState() as ReturnType<typeof useEditor.getState> & {
    snappingModeByContext?: { item?: string }
  }
  const gridActive = editor.snappingModeByContext
    ? editor.snappingModeByContext.item === 'grid'
    : editor.magneticSnap
  if (!gridActive) return [x, z]
  return snapPointToGrid([x, z], editor.gridSnapStep)
}

/**
 * Convert a world-space grid hit into the active level's local frame, the way
 * the host stores node positions. Re-derived from the public `sceneRegistry`
 * because the built-in `floor-placement` helpers aren't part of the public
 * `@pascal-app/*` surface yet — a candidate for a future `@pascal-app/plugin-api`.
 */
export function toLevelLocal(
  levelId: string,
  world: [number, number, number],
  preserveY = false,
): [number, number, number] {
  const levelObject = sceneRegistry.nodes.get(levelId)
  if (!levelObject) return resolvePlacementPosition(world, preserveY)
  worldVec.set(world[0], world[1], world[2])
  levelObject.updateWorldMatrix(true, false)
  levelObject.worldToLocal(worldVec)
  return resolvePlacementPosition([worldVec.x, worldVec.y, worldVec.z], preserveY)
}

/**
 * Shared placement wiring for any plant tool: ghosts a preview at the snapped
 * cursor on `grid:move`, and calls `onCommit` with the snapped level-local
 * position on `grid:click`. Returns the cursor group ref + visibility for the
 * tool to attach its preview to. `onCommit` is read through a ref so a tool can
 * close over live brush state without re-subscribing every render.
 */
export function usePlacement(
  activeLevelId: string | null,
  onCommit: (levelLocalPosition: [number, number, number], rotationY: number) => void,
  {
    onPreview,
    preserveY = false,
    resolvePreview,
  }: {
    onPreview?: (transform: PlacementPreviewTransform | null) => void
    preserveY?: boolean
    resolvePreview?: (position: [number, number, number]) => PlacementPreviewTransform | null
  } = {},
) {
  const cursorRef = useRef<Group>(null)
  const [cursorVisible, setCursorVisible] = useState(false)
  const commitRef = useRef(onCommit)
  commitRef.current = onCommit
  const onPreviewRef = useRef(onPreview)
  onPreviewRef.current = onPreview
  const resolvePreviewRef = useRef(resolvePreview)
  resolvePreviewRef.current = resolvePreview
  const rotationRef = useRef(0)
  const previewBaseRotationYRef = useRef(0)

  useEffect(() => {
    if (!activeLevelId) return
    setCursorVisible(false)
    rotationRef.current = 0
    previewBaseRotationYRef.current = 0
    let lastWorld: [number, number, number] | null = null

    const onMove = (event: GridEvent) => {
      setCursorVisible(true)
      const local = preserveY
        ? toLevelLocal(activeLevelId, event.position, true)
        : event.localPosition
      const [snappedX, snappedZ] = snapXZ(local[0], local[2])
      const [sx, sy, sz] = resolvePlacementPosition([snappedX, local[1], snappedZ], preserveY)
      const position: [number, number, number] = [sx, sy, sz]
      const preview = resolvePreviewRef.current?.(position) ?? null
      previewBaseRotationYRef.current = preview?.rotation[1] ?? 0
      if (preview) {
        cursorRef.current?.position.set(...preview.position)
        cursorRef.current?.rotation.set(
          preview.rotation[0],
          preview.rotation[1] + rotationRef.current,
          preview.rotation[2],
        )
      } else {
        cursorRef.current?.position.set(sx, sy, sz)
        cursorRef.current?.rotation.set(0, rotationRef.current, 0)
      }
      onPreviewRef.current?.(preview)
      lastWorld = event.position
    }

    const onClick = (event: GridEvent) => {
      const world = lastWorld ?? event.position
      const local = toLevelLocal(activeLevelId, world, preserveY)
      const [snappedX, snappedZ] = snapXZ(local[0], local[2])
      commitRef.current(
        resolvePlacementPosition([snappedX, local[1], snappedZ], preserveY),
        rotationRef.current,
      )
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.key.toLowerCase() !== 'r' || isTypingTarget(event.target)) return
      event.preventDefault()
      event.stopPropagation()
      rotationRef.current = advancePlacementRotation(rotationRef.current, event.shiftKey)
      if (cursorRef.current) {
        cursorRef.current.rotation.y = previewBaseRotationYRef.current + rotationRef.current
      }
    }

    emitter.on('grid:move', onMove)
    emitter.on('grid:click', onClick)
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      emitter.off('grid:move', onMove)
      emitter.off('grid:click', onClick)
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [activeLevelId, preserveY])

  return { cursorRef, cursorVisible }
}

/**
 * Ceiling-hosted placement for parametric Environment nodes.
 *
 * Pascal's generic `attachTo: 'ceiling'` coordinator is item-specific. This
 * companion applies the same host rule to ceiling-mounted environment lights:
 * the preview is valid only within a ceiling polygon and commits in its frame.
 */
export function useCeilingPlacement(
  activeLevelId: string | null,
  onCommit: (placement: {
    ceilingId: AnyNodeId
    position: [number, number, number]
    rotationY: number
  }) => void,
) {
  const cursorRef = useRef<Group>(null)
  const [cursorVisible, setCursorVisible] = useState(false)
  const [ceilingId, setCeilingId] = useState<AnyNodeId | null>(null)
  const commitRef = useRef(onCommit)
  commitRef.current = onCommit
  const rotationRef = useRef(0)

  useEffect(() => {
    if (!activeLevelId) return
    setCursorVisible(false)
    setCeilingId(null)
    rotationRef.current = 0

    const resolve = (event: GridEvent) => {
      const [localX, , localZ] = event.localPosition
      const [x, z] = snapXZ(localX, localZ)
      const target = findCeilingPlacementTarget(
        activeLevelId,
        useScene.getState().nodes,
        x,
        z,
      )
      return { target, x, z }
    }

    const onMove = (event: GridEvent) => {
      const { target, x, z } = resolve(event)
      setCeilingId(target?.id ?? null)
      setCursorVisible(Boolean(target))
      if (target) {
        cursorRef.current?.position.set(x, target.height, z)
        cursorRef.current?.rotation.set(0, rotationRef.current, 0)
      }
    }

    const onClick = (event: GridEvent) => {
      const { target, x, z } = resolve(event)
      if (!target) return
      commitRef.current({
        ceilingId: target.id,
        position: [x, 0, z],
        rotationY: rotationRef.current,
      })
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.key.toLowerCase() !== 'r' || isTypingTarget(event.target)) return
      event.preventDefault()
      event.stopPropagation()
      rotationRef.current = advancePlacementRotation(rotationRef.current, event.shiftKey)
      if (cursorRef.current) cursorRef.current.rotation.y = rotationRef.current
    }

    emitter.on('grid:move', onMove)
    emitter.on('grid:click', onClick)
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      emitter.off('grid:move', onMove)
      emitter.off('grid:click', onClick)
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [activeLevelId])

  return { ceilingId, cursorRef, cursorVisible }
}

/**
 * Pascal-native placement for architectural wall-mounted lights.
 *
 * Unlike the ordinary environment point brush, this listens to wall surface
 * events, previews in the wall face frame, and commits the node as a wall
 * child with the same wallId / wallT / side contract used by attached items.
 * Grid events provide the equivalent nearest-wall path in the 2D floor plan.
 */
export function useWallPlacement(
  activeLevelId: string | null,
  mountHeight: number,
  onCommit: (attachment: WallArmAttachment) => void,
  {
    modelOriginAtMount = false,
    mountBounds,
    snapAlongWall = true,
  }: {
    modelOriginAtMount?: boolean
    mountBounds?: WallMountBounds
    snapAlongWall?: boolean
  } = {},
) {
  const cursorRef = useRef<Group>(null)
  const [cursorVisible, setCursorVisible] = useState(false)
  const commitRef = useRef(onCommit)
  commitRef.current = onCommit

  useEffect(() => {
    if (!activeLevelId) return
    setCursorVisible(false)
    let wallHoverActive = false

    const showAttachment = (attachment: WallArmAttachment) => {
      const cursor = cursorRef.current
      if (cursor) {
        // The preview node is built at the brush height. Offset its frame by
        // the difference so the rendered plate follows the wall pointer's
        // exact vertical hit without rebuilding the preview every mousemove.
        cursor.position.set(
          attachment.cursorPosition[0],
          attachment.cursorPosition[1]
            + attachment.mountHeight
            - (modelOriginAtMount ? 0 : mountHeight),
          attachment.cursorPosition[2],
        )
        cursor.rotation.set(0, attachment.cursorRotationY, 0)
      }
      setCursorVisible(true)
    }

    const attachmentFromWallEvent = (event: WallEvent): WallArmAttachment | null => {
      if (!isValidWallSideFace(event.normal)) return null
      const [snappedLocalX] = snapAlongWall
        ? snapXZ(event.localPosition[0], 0)
        : [event.localPosition[0], 0] as const
      return resolveWallArmAttachment(
        event.node,
        snappedLocalX,
        event.localPosition[1],
        getSideFromNormal(event.normal),
        mountBounds,
      )
    }

    const onWallMove = (event: WallEvent) => {
      const attachment = attachmentFromWallEvent(event)
      if (!attachment) return
      wallHoverActive = true
      showAttachment(attachment)
      event.stopPropagation()
    }

    const onWallClick = (event: WallEvent) => {
      const attachment = attachmentFromWallEvent(event)
      if (!attachment) return
      wallHoverActive = true
      showAttachment(attachment)
      commitRef.current(attachment)
      event.stopPropagation()
    }

    const onWallLeave = () => {
      wallHoverActive = false
      setCursorVisible(false)
    }

    const attachmentFromGridEvent = (event: GridEvent) =>
      resolveWallArmPlanAttachment(
        useScene.getState().nodes,
        activeLevelId as AnyNodeId,
        [event.localPosition[0], event.localPosition[2]],
        mountHeight,
        mountBounds,
      )

    const onGridMove = (event: GridEvent) => {
      if (wallHoverActive) return
      const attachment = attachmentFromGridEvent(event)
      if (!attachment) {
        setCursorVisible(false)
        return
      }
      showAttachment(attachment)
    }

    const onGridClick = (event: GridEvent) => {
      if (wallHoverActive) return
      const attachment = attachmentFromGridEvent(event)
      if (!attachment) return
      showAttachment(attachment)
      commitRef.current(attachment)
    }

    emitter.on('wall:enter', onWallMove)
    emitter.on('wall:move', onWallMove)
    emitter.on('wall:click', onWallClick)
    emitter.on('wall:leave', onWallLeave)
    emitter.on('grid:move', onGridMove)
    emitter.on('grid:click', onGridClick)
    return () => {
      emitter.off('wall:enter', onWallMove)
      emitter.off('wall:move', onWallMove)
      emitter.off('wall:click', onWallClick)
      emitter.off('wall:leave', onWallLeave)
      emitter.off('grid:move', onGridMove)
      emitter.off('grid:click', onGridClick)
    }
  }, [activeLevelId, modelOriginAtMount, mountBounds, mountHeight, snapAlongWall])

  return { cursorRef, cursorVisible }
}
