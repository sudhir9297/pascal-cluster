'use client'
import { createWallHoverHandlers } from '../attachments/wall-hover'

import {
  type AnyNode,
  type AnyNodeId,
  type GridEvent,
  type WallEvent,
  type WallNode,
  emitter,
  holdHiddenWallPointerEvents,
  sceneRegistry,
  useLiveNodeOverrides,
  useScene,
} from '@pascal-app/core'
import { WallPlacementGhost } from '../attachments/wall-placement-ghost'
import {
  createWallPointerTracker,
  getSideFromNormal,
  isGridSnapActive,
  isValidWallSideFace,
  stripTransient,
  triggerSFX,
  useEditor,
  usePlacementPreview,
} from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Vector3, type Material, type Mesh } from 'three'
import { buildTapGeometry } from './geometry'
import { TapNode } from './schema'
import { getTapPreset } from './presets'
import { useTapPlacementPreset } from './placement-settings'
import { vanityLevelId } from '../freestanding-vanity/wall-placement'
import {
  createWallTap,
  wallTapPlacement,
  wallTapPlacementInPlan,
  type WallTapPlacement,
} from './wall-placement'

import { attachedTapPose } from './attachment'
import { resolveWallTapTarget, wallTapAttachmentChanges } from './binding'

const placementFields = [
  'parentId',
  'wallId',
  'position',
  'rotation',
  'side',
  'servesBasinId',
  'servesBathId',
  'slotId',
  'serviceSlotId',
  'linkOffset',
] as const

export default function WallTapTool({ node: source }: { node?: TapNode }) {
  const selectedLevelId = useViewer((state) => state.selection.levelId)
  const presetId = useTapPlacementPreset()
  const schema = TapNode
  const gridStep = useEditor((state) => state.gridSnapStep)
  const node = useMemo(
    () =>
      source
        ? schema.parse({
            ...source,
            ...attachedTapPose(source, useScene.getState().nodes).local,
          })
        : schema.parse({
            presetId,
            name: getTapPreset(presetId).label,
            position: [0, 1.1, 0],
          }),
    [source, presetId],
  )
  const levelId = source
    ? (vanityLevelId(source.parentId, useScene.getState().nodes) ??
      selectedLevelId)
    : selectedLevelId
  const initial =
    source?.wallId && source.parentId === source.wallId
      ? {
          parentId: source.parentId,
          wallId: source.wallId,
          position: source.position,
          rotation: source.rotation,
          side: source.side,
        }
      : null
  const [placement, setPlacement] = useState<WallTapPlacement | null>(initial)
  const latest = useRef<WallTapPlacement | null>(initial)
  const ghost = useMemo(() => {
    const object = buildTapGeometry(node)
    const clones = new Map<Material, Material>()
    object.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      const original = mesh.material as Material
      let material = clones.get(original)
      if (!material) {
        material = original.userData.__pascalCachedMaterial
          ? original.clone()
          : original
        material.transparent = true
        material.opacity = 0.5
        material.depthWrite = false
        clones.set(original, material)
      }
      mesh.material = material
      mesh.raycast = () => {}
    })
    return object
  }, [node])

  useEffect(() => {
    const releaseWalls = holdHiddenWallPointerEvents()
    const original = source ? sceneRegistry.nodes.get(source.id) : undefined
    if (original) original.visible = false
    let lastWallStamp = -1
    let lastCommitStamp = -1
    let finished = false
    const wallPointer = createWallPointerTracker(
      source
        ? {
            wallId: source.wallId,
            side: source.side,
            position: source.position,
          }
        : undefined,
    )
    const unsubscribe = source
      ? useLiveNodeOverrides.subscribe((state) => {
          const patch = state.overrides.get(source.id)
          if (!patch?.wallId || !patch.position) return
          const effective = schema.parse({ ...node, ...patch })
          const next = {
            parentId: effective.parentId!,
            wallId: effective.wallId!,
            position: effective.position,
            rotation: effective.rotation,
            side: effective.side,
          }
          latest.current = next
          setPlacement(next)
        })
      : undefined
    const step = () => (isGridSnapActive() ? gridStep : 0)
    const preview = (next: WallTapPlacement | null) => {
      latest.current = next
      setPlacement(next)
      if (!next) {
        wallPointer.leave()
        usePlacementPreview.getState().clear()
        if (source)
          useLiveNodeOverrides
            .getState()
            .clearFields(source.id, placementFields)
        return
      }
      const bound = resolveWallTapTarget(node, next, useScene.getState().nodes)
      const parent = useScene.getState().nodes[next.wallId as AnyNodeId]
      usePlacementPreview
        .getState()
        .set(bound as unknown as AnyNode, parent ?? null)
      if (source) useLiveNodeOverrides.getState().set(source.id, { ...bound })
    }
    const commit = () => {
      if (finished) return
      const target = latest.current
      const state = useScene.getState()
      if (
        !target ||
        state.readOnly ||
        state.nodes[target.wallId as AnyNodeId]?.type !== 'wall'
      )
        return
      const wall = state.nodes[target.wallId as AnyNodeId]
      if (wall?.type !== 'wall') return
      const bound = resolveWallTapTarget(node, target, state.nodes)
      const placed = createWallTap(
        { ...bound, metadata: stripTransient(node.metadata) },
        target,
        source?.id,
      )
      if (!source && bound.slotId === `wall-point:${node.id}`)
        placed.slotId = `wall-point:${placed.id}`
      state.applyNodeChanges(
        wallTapAttachmentChanges(placed, state.nodes, source?.id),
      )
      useViewer.getState().setSelection({ selectedIds: [placed.id] })
      usePlacementPreview.getState().clear()
      triggerSFX('sfx:item-place')
      if (source) {
        finished = true
        useEditor.getState().setMovingNode(null)
      } else preview(null)
    }
    const targetOnWall = (
      wall: WallNode,
      station: number,
      side: WallTapPlacement['side'],
      cursorY: number | null,
    ) => {
      if (wall.parentId !== levelId) return null
      let y = latest.current?.position[1] ?? node.position[1]
      let x = station
      if (cursorY !== null) {
        ;[x, y] = wallPointer.resolve(wall.id, side, [station, cursorY])
        const grid = step()
        if (grid > 0) y = Math.round(y / grid) * grid
      }
      return wallTapPlacement(
        { ...node, position: [node.position[0], y, node.position[2]] },
        wall,
        x,
        side,
        step(),
      )
    }
    const wallTarget = (event: WallEvent) => {
      lastWallStamp = event.nativeEvent?.timeStamp ?? -1
      if (!isValidWallSideFace(event.normal)) return null
      const local = event.localPosition
      return targetOnWall(
        event.node,
        local[0],
        getSideFromNormal(event.normal),
        event.nativeEvent?.ray ? local[1] : null,
      )
    }
    const gridTarget = (event: GridEvent) => {
      if (event.nativeEvent?.ray) return null
      const frame = levelId ? sceneRegistry.nodes.get(levelId) : undefined
      const point = new Vector3(...event.position)
      if (frame) {
        frame.updateWorldMatrix(true, false)
        frame.worldToLocal(point)
      } else point.set(...event.localPosition)
      const target = wallTapPlacementInPlan(
        node,
        [point.x, point.z],
        useScene.getState().nodes,
        levelId as AnyNodeId | null,
        step(),
      )
      if (!target) return null
      const wall = useScene.getState().nodes[target.wallId as AnyNodeId]
      if (wall?.type !== 'wall') return null
      return targetOnWall(wall, target.position[0], target.side, null)
    }
    const { enterOrMove: onWallMove, leave: onWallLeave } =
      createWallHoverHandlers(wallTarget, preview, () => latest.current)
    const onGridMove = (event: GridEvent) => {
      if (
        event.nativeEvent?.timeStamp !== undefined &&
        event.nativeEvent.timeStamp === lastWallStamp
      )
        return
      preview(gridTarget(event))
    }
    const onWallClick = (event: WallEvent) => {
      if (
        event.nativeEvent?.timeStamp !== undefined &&
        lastCommitStamp === event.nativeEvent.timeStamp
      )
        return
      const target = wallTarget(event)
      if (!target) return
      event.stopPropagation()
      preview(target)
      lastCommitStamp = event.nativeEvent?.timeStamp ?? -1
      commit()
    }
    const onGridClick = (event: GridEvent) => {
      if (
        event.nativeEvent?.timeStamp !== undefined &&
        (lastCommitStamp === event.nativeEvent.timeStamp ||
          event.nativeEvent.timeStamp === lastWallStamp)
      )
        return
      preview(gridTarget(event))
      if (!latest.current) return
      lastCommitStamp = event.nativeEvent?.timeStamp ?? -1
      commit()
    }
    const onRelease = (event: PointerEvent) => {
      if (
        !source ||
        !useEditor.getState().placementDragMode ||
        event.button !== 0
      )
        return
      if (
        event.target instanceof Element &&
        event.target.closest('[data-floorplan-scene]')
      )
        return
      commit()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (source) useEditor.getState().setMovingNode(null)
      else useEditor.getState().setTool(null)
    }
    emitter.on('wall:leave', onWallLeave)
    emitter.on('wall:enter', onWallMove)
    emitter.on('wall:move', onWallMove)
    emitter.on('wall:click', onWallClick)
    emitter.on('grid:move', onGridMove)
    emitter.on('grid:click', onGridClick)
    window.addEventListener('pointerup', onRelease)
    window.addEventListener('keydown', onKey)
    return () => {
      unsubscribe?.()
      releaseWalls()
      emitter.off('wall:leave', onWallLeave)
      emitter.off('wall:enter', onWallMove)
      emitter.off('wall:move', onWallMove)
      emitter.off('wall:click', onWallClick)
      emitter.off('grid:move', onGridMove)
      emitter.off('grid:click', onGridClick)
      window.removeEventListener('pointerup', onRelease)
      window.removeEventListener('keydown', onKey)
      usePlacementPreview.getState().clear()
      if (source)
        useLiveNodeOverrides.getState().clearFields(source.id, placementFields)
      if (original) original.visible = source?.visible !== false
    }
  }, [node, source, levelId, gridStep, schema])

  useEffect(
    () => () => {
      const materials = new Set<Material>()
      ghost.traverse((child) => {
        const mesh = child as Mesh
        if (!mesh.isMesh) return
        mesh.geometry.dispose()
        materials.add(mesh.material as Material)
      })
      for (const material of materials) material.dispose()
    },
    [ghost],
  )

  const parent = placement
    ? sceneRegistry.nodes.get(placement.wallId)
    : undefined
  return parent && placement
    ? <WallPlacementGhost
        object={ghost}
        wall={parent}
        position={placement.position}
        rotation={placement.rotation}
      />
    : null
}
