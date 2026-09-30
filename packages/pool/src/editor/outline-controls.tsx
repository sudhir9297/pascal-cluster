'use client'

import { acquireSceneHistoryPause, type AnyNode, type AnyNodeId, useLiveNodeOverrides, useScene } from '@pascal-app/core'
import { EDITOR_LAYER } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { type ThreeEvent, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BufferGeometry, Group, OrthographicCamera, Plane, Vector2, Vector3 } from 'three'
import type { PoolNode, PoolPoint } from '../core/schema'
import { editPoolOutline, poolOutlineAnchors, poolOutlineMidpoint, poolOutlineTangents,
  type PoolOutlineAction, type PoolOutlinePatch } from '../design/outline-edit'

import { poolOutlineInsertIndices, visiblePoolOutlineAnchors } from '../design/outline-control-visibility'
import { usePoolOutlineControls } from './outline-control-state'

const colors = { anchor: '#d6a56a', tangent: '#8381ed', insert: '#68c99b', hover: '#a5b4fc' }

export function PoolOutlineControls({ node }: { node: PoolNode }) {
  const group = useRef<Group>(null)
  const { camera, gl, raycaster } = useThree()
  const controlState = usePoolOutlineControls()
  const selectedIndex = controlState.nodeId === node.id ? controlState.focusedIndex : null
  const setSelectedIndex = (index: number | null) => {
    controlState.focus(node.id, index)
    useScene.getState().markDirty(node.id as AnyNodeId)
  }
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null)
  const cancelDrag = useRef<(() => void) | null>(null)
  const anchors = poolOutlineAnchors(node)
  const tangents = node.shape === 'spline' ? poolOutlineTangents(node) : []
  const visibleIndices = visiblePoolOutlineAnchors(anchors, controlState.nodeId === node.id && controlState.showAll, selectedIndex)
  const insertIndices = poolOutlineInsertIndices(anchors.length, selectedIndex)
  const activeTangents = selectedIndex !== null && tangents[selectedIndex] ? [selectedIndex] : []
  const y = node.finishedDeckElevation + node.copingThickness + 0.18
  const scale = camera instanceof OrthographicCamera ? 1 / camera.zoom : 1
  const outline = useMemo(() => new BufferGeometry().setFromPoints(node.polygon.flatMap((point, index) => {
    const next = node.polygon[(index + 1) % node.polygon.length]!
    return [new Vector3(point[0], y, point[1]), new Vector3(next[0], y, next[1])]
  })), [node.polygon, y])
  useEffect(() => () => outline.dispose(), [outline])
  const guides = useMemo(() => new BufferGeometry().setFromPoints(activeTangents.flatMap((index) => {
    const tangent = tangents[index]!
    const anchor = anchors[index]!
    return [new Vector3(anchor[0], y, anchor[1]), new Vector3(tangent.incoming[0], y, tangent.incoming[1]),
      new Vector3(anchor[0], y, anchor[1]), new Vector3(tangent.outgoing[0], y, tangent.outgoing[1])]
  })), [anchors, tangents, selectedIndex, y])
  useEffect(() => () => guides.dispose(), [guides])
  useEffect(() => () => cancelDrag.current?.(), [])
  useEffect(() => {
    const onDelete = (event: KeyboardEvent) => {
      if (selectedIndex === null || event.key !== 'Delete' && event.key !== 'Backspace') return
      if ((event.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]')) return
      const patch = editPoolOutline(node, 'delete', selectedIndex)
      if (!patch) return
      event.preventDefault()
      useScene.getState().updateNode(node.id as AnyNodeId, patch as Partial<AnyNode>)
      setSelectedIndex(null)
    }
    window.addEventListener('keydown', onDelete)
    return () => window.removeEventListener('keydown', onDelete)
  }, [node, selectedIndex])

  const start = (event: ThreeEvent<PointerEvent>, action: Exclude<PoolOutlineAction, 'delete'>, index: number) => {
    if (event.button !== 0 || cancelDrag.current || !group.current) return
    event.stopPropagation()
    setSelectedIndex(index)
    const id = node.id as AnyNodeId
    const controls = group.current
    controls.updateWorldMatrix(true, false)
    const planePoint = controls.localToWorld(new Vector3(0, y, 0))
    const normal = new Vector3(0, 1, 0).transformDirection(controls.matrixWorld)
    const plane = new Plane().setFromNormalAndCoplanarPoint(normal, planePoint)
    const initial = event.ray.intersectPlane(plane, new Vector3())?.clone()
    if (!initial) return
    const anchor = action === 'move' ? anchors[index]! : action === 'insert'
      ? poolOutlineMidpoint(node, index) : tangents[index]![action]
    const origin = controls.worldToLocal(initial)
    const offset: PoolPoint = [anchor[0] - origin.x, anchor[1] - origin.z]
    const pointer = new Vector2()
    let patch: PoolOutlinePatch | null = null
    const releaseHistory = useScene.temporal.getState().isTracking
      ? acquireSceneHistoryPause(useScene) : () => {}
    useViewer.getState().setInputDragging(true)
    document.body.style.cursor = 'grabbing'
    const finish = (commit: boolean) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('blur', cancel)
      window.removeEventListener('keydown', key, true)
      cancelDrag.current = null
      releaseHistory()
      useViewer.getState().setInputDragging(false)
      document.body.style.cursor = ''
      if (commit && patch) {
        useScene.getState().updateNode(id, patch as Partial<AnyNode>)
        if (action === 'insert') setSelectedIndex(index + 1)
      }
      useLiveNodeOverrides.getState().clear(id)
      useScene.getState().markDirty(id)
    }
    const move = (pointerEvent: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      pointer.set((pointerEvent.clientX - rect.left) / rect.width * 2 - 1,
        1 - (pointerEvent.clientY - rect.top) / rect.height * 2)
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.ray.intersectPlane(plane, new Vector3())
      if (!hit) return
      const local = controls.worldToLocal(hit)
      const next = editPoolOutline(node, action, index, [local.x + offset[0], local.z + offset[1]])
      if (!next) return
      patch = next
      useLiveNodeOverrides.getState().set(id, next)
      useScene.getState().markDirty(id)
    }
    const up = (pointerEvent: PointerEvent) => {
      if (pointerEvent.button !== 0) return
      finish(true)
      const swallow = (click: Event) => { click.preventDefault(); click.stopPropagation() }
      window.addEventListener('click', swallow, { capture: true, once: true })
      window.setTimeout(() => window.removeEventListener('click', swallow, true), 300)
    }
    const cancel = () => finish(false)
    const key = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape' || ((keyboardEvent.metaKey || keyboardEvent.ctrlKey) && keyboardEvent.key.toLowerCase() === 'z')) {
        keyboardEvent.preventDefault(); keyboardEvent.stopImmediatePropagation(); cancel()
      }
    }
    cancelDrag.current = cancel
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('blur', cancel)
    window.addEventListener('keydown', key, true)
  }

  const handle = (point: PoolPoint, action: Exclude<PoolOutlineAction, 'delete'>, index: number) =>
    <mesh key={`${action}-${index}`} position={[point[0], y, point[1]]}
      onPointerDown={(event: ThreeEvent<PointerEvent>) => start(event, action, index)}
      onPointerEnter={() => { if (!cancelDrag.current) document.body.style.cursor = 'grab'; setHoveredHandle(`${action}-${index}`) }}
      onPointerLeave={() => { if (!cancelDrag.current) document.body.style.cursor = ''; setHoveredHandle(null) }}
      renderOrder={1011}>
      <sphereGeometry args={[(action === 'move' ? 0.14 : 0.11) * scale, 12, 8]} />
      <meshBasicMaterial color={hoveredHandle === `${action}-${index}` ? colors.hover :
        action === 'insert' ? colors.insert : action === 'move'
          ? selectedIndex === index ? colors.hover : colors.anchor : colors.tangent}
        depthTest={false} depthWrite={false} />
    </mesh>

  return <group ref={group} layers={EDITOR_LAYER}>
    <lineSegments geometry={outline} raycast={() => null} renderOrder={1010}>
      <lineBasicMaterial color={colors.anchor} depthTest={false} depthWrite={false} />
    </lineSegments>
    {activeTangents.length > 0 && <lineSegments geometry={guides} raycast={() => null} renderOrder={1010}>
      <lineBasicMaterial color={colors.tangent} depthTest={false} depthWrite={false} />
    </lineSegments>}
    {visibleIndices.map((index) => handle(anchors[index]!, 'move', index))}
    {insertIndices.map((index) => handle(poolOutlineMidpoint(node, index), 'insert', index))}
    {activeTangents.flatMap((index) => [handle(tangents[index]!.incoming, 'incoming', index),
      handle(tangents[index]!.outgoing, 'outgoing', index)])}
  </group>
}
