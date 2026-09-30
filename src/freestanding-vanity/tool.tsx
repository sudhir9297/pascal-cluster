'use client'

import { emitter, sceneRegistry, useScene, type AnyNode, type AnyNodeId, type GridEvent, type GroupMoveSnapResult } from '@pascal-app/core'
import { isGridSnapActive, isMagneticSnapActive, triggerSFX, useEditor, usePlacementPreview } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useEffect, useMemo, useState } from 'react'
import { Vector3, type Group, type Material, type Mesh } from 'three'
import { buildFreestandingVanityGeometry } from './geometry'
import { freestandingVanityDefinition } from './definition'
import { FreestandingVanityNode, WALL_MOUNTED_VANITY, CORNER_VANITY, CornerVanityNode } from './schema'
import WallVanityTool from './wall-tool'
import { vanityPreset } from './presets'
import { useVanityPlacementPreset } from './placement-settings'
import { freestandingVanityWallSnap } from './freestanding-wall-snap'
import { buildCornerVanityGeometry } from './corner-geometry'
import { cornerVanitySnap } from './corner-snap'

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

export default function VanityTool() {
  const tool = useEditor((state) => state.tool)
  return tool === WALL_MOUNTED_VANITY ? <WallVanityTool /> : <FreestandingVanityTool />
}

function FreestandingVanityTool() {
  const activeLevelId = useViewer((state) => state.selection.levelId)
  const gridStep = useEditor((state) => state.gridSnapStep)
  const presetId = useVanityPlacementPreset()
  const corner = useEditor((state) => state.tool === CORNER_VANITY)
  const schema = corner ? CornerVanityNode : FreestandingVanityNode
  const definition = freestandingVanityDefinition
  const [pose, setPose] = useState<GroupMoveSnapResult | null>(null)
  const previewNode = useMemo(
    () => corner ? CornerVanityNode.parse({ name: 'Corner Vanity' }) : FreestandingVanityNode.parse({ ...definition.defaults(), ...vanityPreset(presetId).settings }),
    [presetId, corner],
  )
  const preview = useMemo(() => {
    const group = previewNode.type === CORNER_VANITY ? buildCornerVanityGeometry(previewNode) : buildFreestandingVanityGeometry(previewNode)
    group.traverse((object) => {
      const mesh = object as Mesh
      if (!mesh.isMesh) return
      const material = mesh.material as Material
      material.transparent = true
      material.opacity = 0.48
      material.depthWrite = false
      mesh.raycast = () => {}
    })
    return group
  }, [previewNode])

  useEffect(() => {
    if (!activeLevelId) return

    const placementPose = (event: GridEvent): GroupMoveSnapResult => {
      const position = localLevelPosition(activeLevelId, event, gridStep)
      const snapped = isMagneticSnapActive() || isGridSnapActive() ? (corner ? cornerVanitySnap : freestandingVanityWallSnap)({
        node: previewNode as unknown as AnyNode,
        candidatePosition: position, candidateRotation: previewNode.rotation,
        nodes: useScene.getState().nodes, levelId: activeLevelId as AnyNodeId, movingIds: [],
      }) : null
      return snapped ?? { position, rotation: previewNode.rotation }
    }
    const onMove = (event: GridEvent) => {
      const next = placementPose(event)
      setPose(next)
      usePlacementPreview.getState().set({ ...previewNode, ...next } as unknown as AnyNode, useScene.getState().nodes[activeLevelId as AnyNodeId] ?? null)
    }
    const onClick = (event: GridEvent) => {
      const node = schema.parse({
        ...previewNode,
        id: undefined,
        ...placementPose(event),
      })
      useScene.getState().createNode(node as unknown as AnyNode, activeLevelId as never)
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
  }, [activeLevelId, gridStep, presetId, previewNode, corner])

  useEffect(
    () => () => {
      const materials = new Set<Material>()
      preview.traverse((object) => {
        const mesh = object as Mesh
        if (!mesh.isMesh) return
        mesh.geometry.dispose()
        materials.add(mesh.material as Material)
      })
      for (const material of materials) material.dispose()
    },
    [preview],
  )

  if (!activeLevelId || !pose) return null
  return <primitive object={preview as Group} position={pose.position} rotation={[0, pose.rotation ?? 0, 0]} />
}
