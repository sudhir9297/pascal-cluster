'use client'

import {
  type AnyNode, type AnyNodeId, type GeometryContext, type GridEvent, type WallEvent, type WallNode,
  emitter, holdHiddenWallPointerEvents, sceneRegistry, useLiveNodeOverrides, useScene,
} from '@pascal-app/core'
import { createPortal } from '@react-three/fiber'
import { getSideFromNormal, isGridSnapActive, isValidWallSideFace, stripTransient, triggerSFX, useEditor, usePlacementPreview } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Plane, Vector3, type Material, type Mesh } from 'three'
import { buildFreestandingVanityGeometry } from './geometry'
import { WallMountedVanityNode } from './schema'
import { vanityPreset } from './presets'
import { useVanityPlacementPreset } from './placement-settings'
import { vanityLevelId, wallVanityPlacement, wallVanityPlacementInPlan, type WallVanityPlacement } from './wall-placement'

const placementFields = ['parentId', 'wallId', 'position', 'rotation', 'side'] as const

export default function WallVanityTool({ node: source }: { node?: WallMountedVanityNode }) {
  const selectedLevelId = useViewer((state) => state.selection.levelId)
  const presetId = useVanityPlacementPreset()
  const gridStep = useEditor((state) => state.gridSnapStep)
  const node = useMemo(() => source ? WallMountedVanityNode.parse(source)
    : WallMountedVanityNode.parse({ name: 'Wall-mounted Vanity', ...vanityPreset(presetId).settings }), [source, presetId])
  const levelId = source ? vanityLevelId(source.parentId, useScene.getState().nodes) ?? selectedLevelId : selectedLevelId
  const initial = source?.wallId && source.parentId === source.wallId ? {
    parentId: source.parentId, wallId: source.wallId, position: source.position, rotation: source.rotation, side: source.side,
  } : null
  const [placement, setPlacement] = useState<WallVanityPlacement | null>(initial)
  const latest = useRef<WallVanityPlacement | null>(initial)
  const ghost = useMemo(() => {
    const object = buildFreestandingVanityGeometry(node, { materials: useScene.getState().materials } as GeometryContext)
    const clones = new Map<Material, Material>()
    object.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      const original = mesh.material as Material
      let material = clones.get(original)
      if (!material) {
        material = original.userData.__pascalCachedMaterial ? original.clone() : original
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
    let wallDragAnchor: { wallId: string; x: number; y: number } | null = null
    let preserveGrab = Boolean(source)
    const base = Math.min(node.mountingHeight, node.height - (node.countertopEnabled ? node.countertopThickness : 0) - 0.2)
    const centerY = (base + node.height) / 2
    const unsubscribe = source ? useLiveNodeOverrides.subscribe((state) => {
      const patch = state.overrides.get(source.id)
      if (!patch?.wallId || !patch.position) return
      const effective = WallMountedVanityNode.parse({ ...node, ...patch })
      const next = { parentId: effective.parentId!, wallId: effective.wallId!, position: effective.position, rotation: effective.rotation, side: effective.side }
      latest.current = next
      setPlacement(next)
    }) : undefined
    const step = () => isGridSnapActive() ? gridStep : 0
    const preview = (next: WallVanityPlacement | null) => {
      latest.current = next
      setPlacement(next)
      if (!next) {
        usePlacementPreview.getState().clear()
        if (source) useLiveNodeOverrides.getState().clearFields(source.id, placementFields)
        return
      }
      const parent = useScene.getState().nodes[next.wallId as AnyNodeId]
      usePlacementPreview.getState().set({ ...node, ...next } as unknown as AnyNode, parent ?? null)
      if (source) useLiveNodeOverrides.getState().set(source.id, next)
    }
    const commit = () => {
      if (finished) return
      const target = latest.current
      const state = useScene.getState()
      if (!target || state.readOnly || state.nodes[target.wallId as AnyNodeId]?.type !== 'wall') return
      const placed = WallMountedVanityNode.parse({ ...node, ...target, metadata: stripTransient(node.metadata) })
      if (source && state.nodes[source.id as AnyNodeId]) state.updateNode(source.id as AnyNodeId, { ...target, metadata: placed.metadata } as Partial<AnyNode>)
      else state.createNode(placed as unknown as AnyNode, target.wallId as AnyNodeId)
      useViewer.getState().setSelection({ selectedIds: [placed.id] })
      usePlacementPreview.getState().clear()
      triggerSFX('sfx:item-place')
      if (source) {
        finished = true
        useEditor.getState().setMovingNode(null)
      }
      else preview(null)
    }
    const targetOnWall = (wall: WallNode, station: number, side: WallVanityPlacement['side'], cursorY: number | null) => {
      if (wall.parentId !== levelId) return null
      let y = latest.current?.position[1] ?? node.position[1]
      let x = station
      if (cursorY !== null) {
        if (!wallDragAnchor || wallDragAnchor.wallId !== wall.id) {
          const keepGrab = preserveGrab && source?.wallId === wall.id
          wallDragAnchor = {
            wallId: wall.id,
            x: keepGrab ? node.position[0] - station : 0,
            y: keepGrab ? node.position[1] - cursorY : -centerY,
          }
          if (!keepGrab) preserveGrab = false
        }
        x += wallDragAnchor.x
        y = cursorY + wallDragAnchor.y
        const grid = step()
        if (grid > 0) y = Math.round(y / grid) * grid
        y = Math.max(-base, y)
      }
      return wallVanityPlacement({ ...node, position: [node.position[0], y, node.position[2]] }, wall, x, side, step())
    }
    const wallTarget = (event: WallEvent) => {
      lastWallStamp = event.nativeEvent?.timeStamp ?? -1
      if (!isValidWallSideFace(event.normal)) return null
      // Plan-view wall events have no pointer ray or vertical cursor coordinate.
      return targetOnWall(event.node, event.localPosition[0], getSideFromNormal(event.normal), event.nativeEvent?.ray ? event.localPosition[1] : null)
    }
    const gridTarget = (event: GridEvent) => {
      const frame = levelId ? sceneRegistry.nodes.get(levelId) : undefined
      const point = new Vector3(...event.position)
      if (frame) {
        frame.updateWorldMatrix(true, false)
        frame.worldToLocal(point)
      } else point.set(...event.localPosition)
      const target = wallVanityPlacementInPlan(node, [point.x, point.z], useScene.getState().nodes, levelId as AnyNodeId | null, step())
      if (!target) return null
      const wall = useScene.getState().nodes[target.wallId as AnyNodeId]
      if (wall?.type !== 'wall') return null
      let cursorY: number | null = null
      const wallObject = sceneRegistry.nodes.get(wall.id)
      if (wallObject && event.nativeEvent?.ray) {
        wallObject.updateWorldMatrix(true, false)
        const ray = event.nativeEvent.ray.clone().applyMatrix4(wallObject.matrixWorld.clone().invert())
        const faceZ = (target.side === 'front' ? 1 : -1) * (wall.thickness ?? 0.1) / 2
        const hit = ray.intersectPlane(new Plane(new Vector3(0, 0, 1), -faceZ), new Vector3())
        if (hit) cursorY = hit.y
      }
      return targetOnWall(wall, target.position[0], target.side, cursorY)
    }
    const onWallMove = (event: WallEvent) => { preview(wallTarget(event)); event.stopPropagation() }
    const onGridMove = (event: GridEvent) => {
      if (event.nativeEvent?.timeStamp !== undefined && event.nativeEvent.timeStamp === lastWallStamp) return
      preview(gridTarget(event))
    }
    const onWallClick = (event: WallEvent) => {
      if (event.nativeEvent?.timeStamp !== undefined && lastCommitStamp === event.nativeEvent.timeStamp) return
      preview(wallTarget(event))
      if (!latest.current) return
      lastCommitStamp = event.nativeEvent?.timeStamp ?? -1
      commit()
      event.stopPropagation()
    }
    const onGridClick = (event: GridEvent) => {
      if (event.nativeEvent?.timeStamp !== undefined && (lastCommitStamp === event.nativeEvent.timeStamp || event.nativeEvent.timeStamp === lastWallStamp)) return
      preview(gridTarget(event))
      if (!latest.current) return
      lastCommitStamp = event.nativeEvent?.timeStamp ?? -1
      commit()
    }
    const onRelease = (event: PointerEvent) => {
      if (!source || !useEditor.getState().placementDragMode || event.button !== 0) return
      if (event.target instanceof Element && event.target.closest('[data-floorplan-scene]')) return
      commit()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (source) useEditor.getState().setMovingNode(null)
      else useEditor.getState().setTool(null)
    }
    emitter.on('wall:move', onWallMove)
    emitter.on('wall:click', onWallClick)
    emitter.on('grid:move', onGridMove)
    emitter.on('grid:click', onGridClick)
    window.addEventListener('pointerup', onRelease)
    window.addEventListener('keydown', onKey)
    return () => {
      unsubscribe?.()
      releaseWalls()
      emitter.off('wall:move', onWallMove)
      emitter.off('wall:click', onWallClick)
      emitter.off('grid:move', onGridMove)
      emitter.off('grid:click', onGridClick)
      window.removeEventListener('pointerup', onRelease)
      window.removeEventListener('keydown', onKey)
      usePlacementPreview.getState().clear()
      if (source) useLiveNodeOverrides.getState().clearFields(source.id, placementFields)
      if (original) original.visible = source?.visible !== false
    }
  }, [node, source, levelId, gridStep])

  useEffect(() => () => {
    const materials = new Set<Material>()
    ghost.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      mesh.geometry.dispose()
      materials.add(mesh.material as Material)
    })
    for (const material of materials) material.dispose()
  }, [ghost])

  const parent = placement ? sceneRegistry.nodes.get(placement.wallId) : undefined
  return parent && placement ? createPortal(<primitive object={ghost} position={placement.position} rotation={[0, placement.rotation, 0]} />, parent) : null
}
