'use client'

import { emitter, sceneRegistry, useScene, type AnyNode, type AnyNodeId, type GridEvent } from '@pascal-app/core'
import { triggerSFX, useEditor, usePlacementPreview } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { createPortal, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import { Matrix4, Mesh, Ray, Raycaster, Vector2, Vector3, type Material, type Object3D } from 'three'
import { vanityLevelId } from '../freestanding-vanity/wall-placement'
import { tapHost, fixtureTapLocalToLevel } from './fixture-host'
import { tapOccupancySlot } from '../countertop-basin/tap-attachment'
import { buildTapGeometry } from './geometry'
import { tapPlacementChanges, tapPlacementCandidate, type TapPlacementCandidate } from './placement'
import { useTapPlacementPreset } from './placement-settings'
import { getTapPreset, tapMountingLayout } from './presets'
import WallTapTool from './wall-tool'
import { TapNode } from './schema'
import { guidedTapHostAllowed } from '../guided/placement-context'

export default function TapTool({ node: source }: { node?: TapNode }) {
  const presetId = useTapPlacementPreset()
  return getTapPreset(source?.presetId ?? presetId).mount === 'wall' ? <WallTapTool node={source} /> : <BasinTapTool source={source} />
}

function BasinTapTool({ source }: { source?: TapNode }) {
  const { camera, gl } = useThree()
  const selectedLevelId = useViewer(state => state.selection.levelId)
  const levelId = source ? vanityLevelId(source.parentId, useScene.getState().nodes) : selectedLevelId
  const presetId = useTapPlacementPreset()
  const [candidate, setCandidate] = useState<TapPlacementCandidate | null>(null)
  const node = useMemo(() => source ? TapNode.parse(source) : TapNode.parse({ presetId, name: getTapPreset(presetId).label }), [presetId, source])
  const preview = useMemo(() => {
    const group = buildTapGeometry(node)
    group.traverse(part => {
      if (!(part instanceof Mesh)) return
      for (const material of Array.isArray(part.material) ? part.material : [part.material]) {
        material.transparent = true; material.opacity = .5; material.depthWrite = false
      }
      part.castShadow = part.receiveShadow = false
      part.raycast = () => {}
    })
    return group
  }, [node])
  useEffect(() => {
    setCandidate(null)
    if (!levelId) return
    const original = source ? sceneRegistry.nodes.get(source.id) : undefined
    if (original) original.visible = false
    const canvas = gl.domElement, raycaster = new Raycaster()
    const resolve = (ray: Ray) => {
      const level = sceneRegistry.nodes.get(levelId)
      if (!level) return null
      level.updateWorldMatrix(true, true)
      const candidate = tapPlacementCandidate(ray, level, level.matrixWorld, levelId, sceneRegistry.nodes, useScene.getState().nodes, original ? [preview, original] : [preview])
      if (!source && candidate && !guidedTapHostAllowed(candidate.parentId)) return null
      const host = candidate ? tapHost(useScene.getState().nodes[candidate.parentId as AnyNodeId]) : null
      return host && 'tapMount' in host && tapMountingLayout(node) !== 'single-hole' ? null : candidate
    }
    const hidden = new Map<Object3D, boolean>()
    const restoreOccupants = () => {
      for (const [root, visible] of hidden) root.visible = visible
      hidden.clear()
    }
    const show = (next: TapPlacementCandidate | null) => {
      restoreOccupants()
      if (next) {
        const nodes = useScene.getState().nodes, prepared = tapPlacementChanges(node, next, nodes, source?.id).placed
        next = { ...next, slotId: 'tap', position: prepared.position, rotation: prepared.rotation, levelPose: fixtureTapLocalToLevel(tapHost(nodes[next.parentId as AnyNodeId])!, prepared, nodes) }
        for (const part of preview.children) if (part.userData.mountingSign) part.position.x = part.userData.mountingSign * prepared.holeSpacing / 2
      }
      if (next) for (const id of Object.values(useScene.getState().nodes).filter(raw => String(raw.id) !== source?.id && tapOccupancySlot(raw)?.hostId === next!.parentId).map(raw => raw.id)) {
        const root = sceneRegistry.nodes.get(id)
        if (root) { hidden.set(root, root.visible); root.visible = false }
      }
      setCandidate(next)
      if (next) usePlacementPreview.getState().set({ ...node, parentId: levelId, ...next.levelPose } as unknown as AnyNode, useScene.getState().nodes[levelId] ?? null)
      else usePlacementPreview.getState().clear()
    }
    const pointerPose = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      raycaster.setFromCamera(new Vector2((event.clientX-rect.left)/rect.width*2-1, -(event.clientY-rect.top)/rect.height*2+1), camera)
      return resolve(raycaster.ray)
    }
    const place = (next: TapPlacementCandidate | null) => {
      if (!next) return
      const { placed, changes } = tapPlacementChanges(node, next, useScene.getState().nodes, source?.id)
      show(null)
      useScene.getState().applyNodeChanges(changes)
      useViewer.getState().setSelection({ selectedIds: [placed.id] })
      triggerSFX('sfx:item-place')
      if (source) useEditor.getState().setMovingNode(null)
    }
    const move = (event: PointerEvent) => show(pointerPose(event))
    const click = (event: MouseEvent) => {
      const viewer = useViewer.getState()
      if (event.button !== 0 || viewer.cameraDragging || viewer.inputDragging || event.shiftKey || event.metaKey || event.ctrlKey) return
      place(pointerPose(event))
    }
    const leave = () => show(null)
    const gridPose = (event: GridEvent) => {
      const level = sceneRegistry.nodes.get(levelId)
      const matrix = level?.matrixWorld ?? new Matrix4()
      const point = new Vector3(...event.position).applyMatrix4(matrix.clone().invert())
      return resolve(new Ray(new Vector3(point.x, 10000, point.z), new Vector3(0,-1,0)).applyMatrix4(matrix))
    }
    const gridMove = (event: GridEvent) => { if (event.nativeEvent.target !== canvas) show(gridPose(event)) }
    const gridClick = (event: GridEvent) => { if (event.nativeEvent.target !== canvas) place(gridPose(event)) }
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { if (source) useEditor.getState().setMovingNode(null); else useEditor.getState().setTool(null) } }
    canvas.addEventListener('pointermove', move); canvas.addEventListener('click', click); canvas.addEventListener('pointerleave', leave)
    emitter.on('grid:move', gridMove); emitter.on('grid:click', gridClick)
    window.addEventListener('keydown', key, true)
    return () => {
      restoreOccupants()
      if (original) original.visible = source?.visible !== false
      canvas.removeEventListener('pointermove', move); canvas.removeEventListener('click', click); canvas.removeEventListener('pointerleave', leave)
      emitter.off('grid:move', gridMove); emitter.off('grid:click', gridClick)
      window.removeEventListener('keydown', key, true)
      usePlacementPreview.getState().clear()
    }
  }, [camera, gl, levelId, node, preview, source])
  useEffect(() => () => {
    const materials = new Set<Material>()
    preview.traverse(part => { if (part instanceof Mesh) {
      part.geometry.dispose()
      for (const material of Array.isArray(part.material) ? part.material : [part.material]) materials.add(material)
    } })
    for (const material of materials) material.dispose()
  }, [preview])
  const level = levelId ? sceneRegistry.nodes.get(levelId) : undefined
  return level && candidate ? createPortal(<primitive object={preview} position={candidate.levelPose.position} rotation={[0,candidate.levelPose.rotation,0]} />, level) : null
}
