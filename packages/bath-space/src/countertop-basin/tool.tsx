'use client'

import { basinModelRotation } from './orientation'

import { emitter, sceneRegistry, useScene, type AnyNode, type AnyNodeId, type GridEvent } from '@pascal-app/core'
import { isGridSnapActive, triggerSFX, useEditor, usePlacementPreview } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { createPortal, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import { Matrix4, Ray, Raycaster, Vector2, Vector3, type Mesh, type Material, type Color } from 'three'
import { BasinNode, CountertopBasinNode, UndermountBasinNode, DropInBasinNode, SemiRecessedBasinNode, semiRecessedBasinPresets, basinPresets } from './schema'
import { buildCountertopBasinGeometry } from './geometry'
import { basinPlacement } from './placement'
import { basinPlacementCandidate, type BasinPlacementCandidate } from './placement-pose'
import { basinMoveCandidate, basinMoveSurface } from './move-placement'
import { vanityLevelId } from '../freestanding-vanity/wall-placement'
import { useBasinPlacementShape } from './placement-settings'

export default function CountertopBasinTool({ undermount = false, dropIn = false, semiRecessed = false, existing }: { existing?: BasinNode; undermount?: boolean; dropIn?: boolean; semiRecessed?: boolean }) {
  const inset = undermount || dropIn || semiRecessed
  const schema = semiRecessed ? SemiRecessedBasinNode : dropIn ? DropInBasinNode : undermount ? UndermountBasinNode : CountertopBasinNode
  const { camera, gl, scene } = useThree()
  const selectedLevelId = useViewer(state => state.selection.levelId)
  const levelId = existing ? vanityLevelId(existing.parentId, useScene.getState().nodes) ?? selectedLevelId : selectedLevelId
  const gridStep = useEditor(state => state.gridSnapStep)
  const shape = useBasinPlacementShape()
  const [candidate, setCandidate] = useState<BasinPlacementCandidate | null>(null)
  const node = useMemo(() => existing ?? schema.parse({ ...(semiRecessed ? semiRecessedBasinPresets : basinPresets).find(preset => preset.shape === shape), ...(inset && !semiRecessed ? { height: 0.18 } : {}), name: semiRecessed ? 'Semi-recessed Basin' : dropIn ? 'Drop-in Basin' : undermount ? 'Undermount Basin' : 'Countertop Basin' }), [shape, schema, undermount, dropIn, semiRecessed, inset, existing])
  const preview = useMemo(() => {
    const group = buildCountertopBasinGeometry(node)
    group.traverse(object => {
      const mesh = object as Mesh
      if (!mesh.isMesh) return
      const material = (mesh.material as Material).clone()
      mesh.material = material
      material.transparent = true
      material.opacity = 0.48
      material.depthWrite = false
      if (inset) {
        // The supporting countertop is still solid until placement commits its cut.
        material.depthTest = false
        ;(material as Material & { color?: Color }).color?.set('#8b5cf6')
        mesh.renderOrder = 1000
      }
      mesh.castShadow = mesh.receiveShadow = false
      mesh.raycast = () => {}
    })
    return group
  }, [node, inset])

  useEffect(() => {
    if (!levelId) return
    const canvas = gl.domElement
    const originalRoot = existing ? sceneRegistry.nodes.get(existing.id) : undefined
    const originalVisible = originalRoot?.visible
    if (originalRoot) originalRoot.visible = false
    let moved = false, committed = false
    const raycaster = new Raycaster()
    const levelMatrix = () => {
      const level = sceneRegistry.nodes.get(levelId)
      level?.updateWorldMatrix(true, false)
      return level?.matrixWorld ?? new Matrix4()
    }
    const resolve = (ray: Ray, groundPoint?: [number, number, number]): BasinPlacementCandidate | null => {
      const excluded = originalRoot ? [preview, originalRoot] : [preview]
      const hit = existing
        ? basinMoveSurface(ray, scene, levelMatrix(), node, sceneRegistry.nodes, useScene.getState().nodes, excluded, isGridSnapActive() ? gridStep : 0, groundPoint)
        : basinPlacement(ray, scene, levelMatrix(), node.rotation, isGridSnapActive() ? gridStep : 0, excluded, groundPoint)
      if (!hit) return null
      return existing ? basinMoveCandidate(node, hit, levelId, sceneRegistry.nodes, useScene.getState().nodes) : basinPlacementCandidate(node, hit, levelId, sceneRegistry.nodes, useScene.getState().nodes)
    }
    const show = (next: BasinPlacementCandidate | null) => {
      setCandidate(next)
      if (next) usePlacementPreview.getState().set({ ...node, ...next.preview } as unknown as AnyNode, useScene.getState().nodes[levelId] ?? null)
      else usePlacementPreview.getState().clear()
    }
    const place = (candidate: BasinPlacementCandidate | null) => {
      if (!candidate || committed || (existing && !moved)) return
      const next = candidate.placed
      if (existing) {
        committed = true
        useScene.getState().updateNode(existing.id as AnyNodeId, next as Partial<AnyNode>)
        useViewer.getState().setSelection({ selectedIds: [existing.id] })
        useEditor.getState().setMovingNode(null)
        triggerSFX('sfx:item-place')
        return
      }
      const placed = schema.parse({ ...node, ...next, id: undefined })
      const state = useScene.getState()
      const parent = state.nodes[next.parentId as AnyNodeId]
      const initializeChildren = parent && !('children' in parent)
        ? [{ id: parent.id, data: { children: [placed.id] } as Partial<AnyNode> }] : []
      state.applyNodeChanges({ create: [{ node: placed as unknown as AnyNode, parentId: next.parentId as AnyNodeId }], update: initializeChildren })
      useViewer.getState().setSelection({ selectedIds: [placed.id] })
      triggerSFX('sfx:item-place')
    }
    const pointerPose = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      raycaster.setFromCamera(new Vector2((event.clientX - rect.left) / rect.width * 2 - 1,
        -(event.clientY - rect.top) / rect.height * 2 + 1), camera)
      return resolve(raycaster.ray)
    }
    const pointerMove = (event: PointerEvent) => { moved = true; show(pointerPose(event)) }
    const pointerClick = (event: MouseEvent) => {
      const viewer = useViewer.getState()
      if (event.button !== 0 || viewer.cameraDragging || viewer.inputDragging || event.shiftKey || event.metaKey || event.ctrlKey) return
      place(pointerPose(event))
    }
    const pointerLeave = () => show(null)
    const planPose = (event: GridEvent) => {
      const matrix = levelMatrix()
      const point = new Vector3(...event.position).applyMatrix4(matrix.clone().invert())
      const ray = new Ray(new Vector3(point.x, Math.max(10000, point.y + 1000), point.z), new Vector3(0, -1, 0)).applyMatrix4(matrix)
      return resolve(ray, event.position)
    }
    // Canvas events also emit grid events; only the plan view uses this second path.
    const fromCanvas = (event: GridEvent) => event.nativeEvent.target === canvas
    const gridMove = (event: GridEvent) => { if (!fromCanvas(event)) { moved = true; show(planPose(event)) } }
    const gridClick = (event: GridEvent) => { if (!fromCanvas(event)) place(planPose(event)) }
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { if (existing) useEditor.getState().setMovingNode(null); else useEditor.getState().setTool(null) } }
    canvas.addEventListener('pointermove', pointerMove)
    canvas.addEventListener('click', pointerClick)
    if (existing) canvas.addEventListener('pointerup', pointerClick)
    canvas.addEventListener('pointerleave', pointerLeave)
    emitter.on('grid:move', gridMove)
    emitter.on('grid:click', gridClick)
    window.addEventListener('keydown', key, true)
    return () => {
      canvas.removeEventListener('pointermove', pointerMove)
      canvas.removeEventListener('click', pointerClick)
      canvas.removeEventListener('pointerup', pointerClick)
      if (originalRoot) originalRoot.visible = originalVisible ?? true
      canvas.removeEventListener('pointerleave', pointerLeave)
      emitter.off('grid:move', gridMove)
      emitter.off('grid:click', gridClick)
      window.removeEventListener('keydown', key, true)
      usePlacementPreview.getState().clear()
    }
  }, [levelId, gridStep, node, preview, camera, gl, scene, schema, inset, existing])

  useEffect(() => () => {
    const materials = new Set<Material>()
    preview.traverse(object => {
      const mesh = object as Mesh
      if (!mesh.isMesh) return
      mesh.geometry.dispose()
      materials.add(mesh.material as Material)
    })
    for (const material of materials) if (!material.userData.__pascalCachedMaterial) material.dispose()
  }, [preview])

  const level = levelId ? sceneRegistry.nodes.get(levelId) : undefined
  const pose = candidate?.preview
  return level && pose ? createPortal(<primitive object={preview} position={pose.position} rotation={[0, basinModelRotation(pose.rotation), 0]} />, level) : null
}
