'use client'
import { type AnyNode, type AnyNodeId, emitter, type GridEvent, type NodeEvent,
  sceneRegistry, snapPointToGrid, useScene } from '@pascal-app/core'
import { getFloorStackPreviewPosition, isGridSnapActive, useEditor,
  usePlacementPreview, useRegistryToolContext } from '@pascal-app/editor'
import { useEffect, useMemo, useRef, useState } from 'react'
import { type Group, Vector3 } from 'three'
import { TREE_KIND, TreeNode } from '../domain/schema'
import { TREE_SPECIES_BY_KEY } from '../domain/species'
import TreePreview from '../rendering/preview'

type PlacementEvent = GridEvent | NodeEvent<AnyNode>

export default function TreeTool() {
  const { activeLevelId, selectNode, isCameraDragging } = useRegistryToolContext()
  const defaults = useEditor((state) => state.toolDefaults[TREE_KIND])
  const preview = useMemo(() => TreeNode.parse({ ...defaults,
    name: TREE_SPECIES_BY_KEY[String(defaults?.species ?? 'whiteOak')]?.name ?? 'Tree' }), [defaults])
  const previewRef = useRef(preview)
  const refreshPreview = useRef<() => void>(() => {})
  const cursor = useRef<Group>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => { previewRef.current = preview; refreshPreview.current() }, [preview])
  useEffect(() => {
    if (!activeLevelId) return
    let last: PlacementEvent | null = null
    let committed = false
    const finish = () => { useEditor.getState().setTool(null); useEditor.getState().setMode('select') }
    const resolve = (event: PlacementEvent) => {
      const point = new Vector3(...event.position)
      const level = sceneRegistry.nodes.get(activeLevelId)
      if (level) { level.updateWorldMatrix(true, false); level.worldToLocal(point) }
      else if ('localPosition' in event) point.set(...event.localPosition)
      const [x, z] = isGridSnapActive()
        ? snapPointToGrid([point.x, point.z], useEditor.getState().gridSnapStep)
        : [point.x, point.z]
      return TreeNode.parse({ ...previewRef.current, parentId: activeLevelId, position: [x, 0, z] })
    }
    const move = (event: PlacementEvent) => {
      last = event
      const node = resolve(event)
      cursor.current?.position.set(...getFloorStackPreviewPosition({
        node: node as unknown as AnyNode, position: node.position, levelId: activeLevelId,
      }))
      setVisible(true)
      usePlacementPreview.getState().set(node as unknown as AnyNode)
    }
    refreshPreview.current = () => { if (last) move(last) }
    const click = (event: PlacementEvent) => {
      if (committed || isCameraDragging()) return
      if (event.nativeEvent && 'button' in event.nativeEvent && event.nativeEvent.button !== 0) return
      const { id: _previewId, ...fields } = resolve(event)
      const placed = TreeNode.parse(fields)
      committed = true
      useScene.getState().createNode(placed as unknown as AnyNode, placed.parentId as AnyNodeId)
      selectNode(placed.id as AnyNodeId)
      event.nativeEvent?.stopPropagation()
      finish()
    }
    const key = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (event.target instanceof HTMLElement &&
        (event.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName))) return
      event.preventDefault(); finish()
    }
    emitter.on('grid:move', move); emitter.on('node:move', move)
    emitter.on('grid:click', click); emitter.on('node:click', click)
    window.addEventListener('keydown', key)
    return () => {
      emitter.off('grid:move', move); emitter.off('node:move', move)
      emitter.off('grid:click', click); emitter.off('node:click', click)
      window.removeEventListener('keydown', key)
      usePlacementPreview.getState().clear()
      refreshPreview.current = () => {}
    }
  }, [activeLevelId, selectNode, isCameraDragging])
  return <group ref={cursor} visible={visible}><TreePreview node={preview} /></group>
}
