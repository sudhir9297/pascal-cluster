'use client'
import {
  type AnyNode,
  type AnyNodeId,
  emitter,
  type GridEvent,
  type NodeEvent,
  resolveSupportSlabPatch,
  sceneRegistry,
  snapPointToGrid,
  useScene,
} from '@pascal-app/core'
import {
  getFloorStackPreviewPosition,
  isGridSnapActive,
  useEditor,
  usePlacementPreview,
  useRegistryToolContext,
} from '@pascal-app/editor'
import { useEffect, useMemo, useRef, useState } from 'react'
import { type Group, Vector3 } from 'three'
import { PergolaNode, PERGOLA_KIND } from '../domain/schema'
import PergolaPreview from '../rendering/preview'

type PlacementEvent = GridEvent | NodeEvent<AnyNode>
export default function PergolaTool() {
  const { activeLevelId, selectNode, isCameraDragging } =
    useRegistryToolContext()
  const defaults = useEditor((s) => s.toolDefaults[PERGOLA_KIND])
  const preview = useMemo(
    () => PergolaNode.parse({ ...defaults, name: 'Pergola' }),
    [defaults],
  )
  const cursor = useRef<Group>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!activeLevelId) return
    let last: PlacementEvent | null = null
    let yaw = 0
    let committed = false
    const finish = () => {
      useEditor.getState().setTool(null)
      useEditor.getState().setMode('select')
    }
    const resolve = (event: PlacementEvent) => {
      const point = new Vector3(...event.position)
      const level = sceneRegistry.nodes.get(activeLevelId)
      if (level) {
        level.updateWorldMatrix(true, false)
        level.worldToLocal(point)
      } else if ('localPosition' in event) point.set(...event.localPosition)
      const [x, z] = isGridSnapActive()
        ? snapPointToGrid([point.x, point.z], useEditor.getState().gridSnapStep)
        : [point.x, point.z]
      const n = PergolaNode.parse({
        ...preview,
        parentId: activeLevelId,
        position: [x, 0, z],
        rotation: [0, yaw, 0],
      })
      const patch = resolveSupportSlabPatch(
        n as unknown as AnyNode,
        useScene.getState().nodes,
      )
      return PergolaNode.parse({ ...n, ...patch })
    }
    const move = (event: PlacementEvent) => {
      last = event
      const node = resolve(event)
      const position = getFloorStackPreviewPosition({
        node: node as unknown as AnyNode,
        position: node.position,
        levelId: activeLevelId,
      })
      cursor.current?.position.set(...position)
      cursor.current?.rotation.set(0, yaw, 0)
      setVisible(true)
      usePlacementPreview.getState().set(node as unknown as AnyNode)
    }
    const click = (event: PlacementEvent) => {
      if (committed || isCameraDragging()) return
      if (
        event.nativeEvent &&
        'button' in event.nativeEvent &&
        event.nativeEvent.button !== 0
      )
        return
      const node = resolve(last ?? event)
      // One gesture produces one persistent node; the ghost never enters history.
      const { id: _previewId, ...fields } = node
      const placed = PergolaNode.parse(fields)
      committed = true
      useScene
        .getState()
        .createNode(placed as unknown as AnyNode, activeLevelId as AnyNodeId)
      selectNode(placed.id as AnyNodeId)
      event.nativeEvent?.stopPropagation()
      finish()
    }
    const key = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        (event.target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName))
      )
        return
      if (event.key === 'Escape') {
        event.preventDefault()
        finish()
      } else if (['r', 't'].includes(event.key.toLowerCase())) {
        event.preventDefault()
        yaw += ((event.key.toLowerCase() === 'r' ? 1 : -1) * Math.PI) / 4
        if (last) move(last)
      }
    }
    emitter.on('grid:move', move)
    emitter.on('grid:click', click)
    emitter.on('node:click', click)
    window.addEventListener('keydown', key)
    return () => {
      emitter.off('grid:move', move)
      emitter.off('grid:click', click)
      emitter.off('node:click', click)
      window.removeEventListener('keydown', key)
      usePlacementPreview.getState().clear()
    }
  }, [activeLevelId, preview, selectNode, isCameraDragging])
  return (
    <group ref={cursor} visible={visible}>
      <PergolaPreview node={preview} />
    </group>
  )
}
