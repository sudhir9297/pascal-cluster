'use client'
import { dropInAssembly } from '../bath-deck/assembly'
import { buildBathDeckGeometry } from '../bath-deck/geometry'

import {
  emitter,
  sceneRegistry,
  useScene,
  type AnyNode,
  type AnyNodeId,
  type GridEvent,
  type GroupMoveSnapResult,
} from '@pascal-app/core'
import {
  isGridSnapActive,
  isMagneticSnapActive,
  triggerSFX,
  useEditor,
  usePlacementPreview,
} from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { floorPlacementPose, type FloorPlacementPose } from '../floor-support/placement'
import { floorPointerEvent } from '../floor-support/pointer'
import { createPortal, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import { Vector3, type Material, type Mesh } from 'three'
import { bathWallSnap } from './wall-snap'
import { bathDeckWallSnap } from '../bath-deck/wall-snap'
import { buildBathtubGeometry } from './geometry'
import { BathtubNode, bathtubPresets, bathUsesDeck } from './schema'
import { useBathPlacementShape } from './placement-settings'
function localLevelPosition(levelId: string, event: GridEvent, gridStep: number) {
  const level = sceneRegistry.nodes.get(levelId as never)
  const vector = new Vector3(...(level ? event.position : event.localPosition))
  if (level) {
    level.updateWorldMatrix(true, false)
    level.worldToLocal(vector)
  }
  const step = isGridSnapActive() ? gridStep : 0
  return [
    step > 0 ? Math.round(vector.x / step) * step : vector.x,
    0,
    step > 0 ? Math.round(vector.z / step) * step : vector.z,
  ] as [number, number, number]
}

export default function BathTool() {
  const camera = useThree((state) => state.camera)
  const activeLevelId = useViewer((state) => state.selection.levelId)
  const gridStep = useEditor((state) => state.gridSnapStep)
  const shape = useBathPlacementShape()
  const [pose, setPose] = useState<FloorPlacementPose | null>(null)
  const previewNode = useMemo(
    () =>
      BathtubNode.parse({
        shape,
        ...(shape === 'corner' ? { length: 1.4, width: 1.4 } : {}),
        ...(shape === 'walk-in' ? { length: 1.5, height: 0.99 } : {}),
        drainEnd: shape === 'alcove' ? 'left' : 'center',
        name: bathtubPresets.find((p) => p.shape === shape)?.label,
      }),
    [shape],
  )
  const preview = useMemo(() => {
    const group = buildBathtubGeometry(previewNode)
    if (bathUsesDeck(previewNode)) {
      const deck = dropInAssembly(previewNode, activeLevelId as AnyNodeId).deck
      const deckGroup = buildBathDeckGeometry(deck, {
        children: [{ ...previewNode, parentId: deck.id } as unknown as AnyNode],
      } as never)
      group.add(deckGroup)
    }
    group.traverse((object) => {
      const mesh = object as Mesh
      if (!mesh.isMesh) return
      const material = (mesh.material as Material).clone()
      delete material.userData.__pascalCachedMaterial
      mesh.material = material
      material.transparent = true
      material.opacity = 0.48
      material.depthWrite = false
      mesh.raycast = () => {}
    })
    return group
  }, [previewNode])

  useEffect(() => {
    if (!activeLevelId) return

    const placementPose = (event: GridEvent): FloorPlacementPose => {
      const pointed = floorPointerEvent(camera, event)
      const nodes = useScene.getState().nodes
      const position = localLevelPosition(activeLevelId, pointed.event, gridStep)
      const free = { position, rotation: previewNode.rotation }
      // Match generic editor movement: attachment snapping in grid/lines, free in off.
      const snapEnabled = isGridSnapActive() || isMagneticSnapActive()
      const deck = bathUsesDeck(previewNode)
        ? dropInAssembly({ ...previewNode, position }, activeLevelId as AnyNodeId).deck
        : null
      const snap = deck ? bathDeckWallSnap : bathWallSnap
      const snapped = snapEnabled
        ? snap({
            node: (deck ?? previewNode) as unknown as AnyNode,
            candidatePosition: position,
            candidateRotation: previewNode.rotation,
            nodes: useScene.getState().nodes,
            levelId: activeLevelId as AnyNodeId,
            movingIds: [],
          })
        : null
      return floorPlacementPose(
        (deck ?? previewNode) as unknown as AnyNode,
        snapped ?? free,
        activeLevelId,
        nodes,
        pointed.surface,
      )
    }
    const onMove = (event: GridEvent) => {
      const next = placementPose(event)
      setPose(next)
      usePlacementPreview
        .getState()
        .set(
          { ...previewNode, ...next } as unknown as AnyNode,
          useScene.getState().nodes[activeLevelId as AnyNodeId] ?? null,
        )
    }
    const onClick = (event: GridEvent) => {
      const node = BathtubNode.parse({
        ...previewNode,
        id: undefined,
        ...placementPose(event),
      })
      if (bathUsesDeck(node)) {
        useScene
          .getState()
          .applyNodeChanges(dropInAssembly(node, activeLevelId as AnyNodeId).changes)
      } else useScene.getState().createNode(node as unknown as AnyNode, activeLevelId as never)
      useViewer.getState().setSelection({ selectedIds: [node.id] })
      triggerSFX('sfx:item-place')
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        useEditor.getState().setTool(null)
        setPose(null)
      }
    }

    emitter.on('grid:move', onMove)
    emitter.on('grid:click', onClick)
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      emitter.off('grid:move', onMove)
      emitter.off('grid:click', onClick)
      window.removeEventListener('keydown', onKeyDown, true)
      usePlacementPreview.getState().clear()
    }
  }, [activeLevelId, gridStep, previewNode, camera])

  useEffect(
    () => () => {
      const materials = new Set<Material>()
      preview.traverse((object) => {
        const mesh = object as Mesh
        if (!mesh.isMesh) return
        mesh.geometry.dispose()
        materials.add(mesh.material as Material)
      })
      for (const material of materials)
        if (!material.userData.__pascalCachedMaterial) material.dispose()
    },
    [preview],
  )

  if (!activeLevelId || !pose) return null
  const level = sceneRegistry.nodes.get(activeLevelId)
  return level
    ? createPortal(
        <primitive
          object={preview}
          position={pose.previewPosition}
          rotation={[0, pose.rotation ?? 0, 0]}
        />,
        level,
      )
    : null
}
