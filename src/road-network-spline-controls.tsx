'use client'

import {
  type AnyNode,
  type AnyNodeId,
  useLiveNodeOverrides,
  useScene,
} from '@pascal-app/core'
import { EDITOR_LAYER, triggerSFX } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { type ThreeEvent, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { OrthographicCamera, Plane, Ray, Vector2, Vector3 } from 'three'
import { moveRoadSplinePoint } from './road-network-spline-handles'
import type { RoadNetworkNode } from './schema'
import { useEnvironmentStore, type RoadElementSelection } from './store'

const HANDLE_SCALE = 0.82
const HANDLE_COLOR = '#22c55e'
const HANDLE_HOVER_COLOR = '#4ade80'
const HANDLE_SELECTED_COLOR = '#86efac'
const HANDLE_OUTLINE_COLOR = '#14532d'

function swallowNextClick() {
  const swallow = (event: Event) => {
    event.stopPropagation()
    event.preventDefault()
  }
  window.addEventListener('click', swallow, { capture: true, once: true })
  window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 300)
}

function RoadSplinePointControl({
  edgeId,
  index,
  node,
  point,
  selected,
}: {
  edgeId: string
  index: number
  node: RoadNetworkNode
  point: readonly [number, number, number]
  selected: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const cleanupRef = useRef<(() => void) | null>(null)
  const { camera, gl, raycaster } = useThree()
  const zoom = camera instanceof OrthographicCamera ? 1 / camera.zoom : 1
  const color = selected ? HANDLE_SELECTED_COLOR : hovered ? HANDLE_HOVER_COLOR : HANDLE_COLOR

  useEffect(() => () => cleanupRef.current?.(), [])

  const onPointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (event.button !== 0) return
    event.stopPropagation()
    setHovered(false)
    useEnvironmentStore.getState().setRoadElementSelection({
      networkId: node.id,
      kind: 'control',
      id: edgeId,
      index,
    })

    const nodeId = node.id as AnyNodeId
    const originalPoint = new Vector3(...point)
    const plane = new Plane(new Vector3(0, 1, 0), -point[1])
    const initialIntersection = event.ray.intersectPlane(plane, new Vector3())
    if (!initialIntersection) return
    const pointer = new Vector2()
    const moveRay = new Ray()
    let lastPatch: Pick<RoadNetworkNode, 'edges'> | null = null
    let historyPaused = true

    useViewer.getState().setInputDragging(true)
    useScene.temporal.getState().pause()
    document.body.style.cursor = 'grabbing'
    triggerSFX('sfx:item-pick')

    const resumeHistory = () => {
      if (!historyPaused) return
      historyPaused = false
      useScene.temporal.getState().resume()
    }
    const clearPreview = () => {
      useLiveNodeOverrides.getState().clear(nodeId)
      useScene.getState().markDirty(nodeId)
    }
    const cleanup = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('blur', onCancel)
      document.body.style.cursor = ''
      useViewer.getState().setInputDragging(false)
      cleanupRef.current = null
    }
    const onMove = (moveEvent: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      pointer.set(
        ((moveEvent.clientX - rect.left) / rect.width) * 2 - 1,
        -((moveEvent.clientY - rect.top) / rect.height) * 2 + 1,
      )
      raycaster.setFromCamera(pointer, camera)
      moveRay.copy(raycaster.ray)
      const intersection = moveRay.intersectPlane(plane, new Vector3())
      if (!intersection) return
      const nextPoint = originalPoint.clone().add(intersection.sub(initialIntersection))
      const patch = moveRoadSplinePoint(node, edgeId, index, [
        nextPoint.x,
        point[1],
        nextPoint.z,
      ])
      if (!patch) return
      lastPatch = patch
      useLiveNodeOverrides.getState().set(nodeId, patch)
      useScene.getState().markDirty(nodeId)
    }
    const onUp = () => {
      resumeHistory()
      if (lastPatch) {
        useScene.getState().updateNode(nodeId, lastPatch as Partial<AnyNode>)
        triggerSFX('sfx:item-place')
      }
      clearPreview()
      swallowNextClick()
      cleanup()
    }
    const onCancel = () => {
      resumeHistory()
      clearPreview()
      cleanup()
    }

    cleanupRef.current = onCancel
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    window.addEventListener('blur', onCancel)
  }

  return (
    <group
      layers={EDITOR_LAYER}
      position={[point[0], point[1] + 0.35, point[2]]}
      scale={zoom * HANDLE_SCALE * (hovered || selected ? 1.12 : 1)}
    >
      <mesh renderOrder={1010}>
        <sphereGeometry args={[0.24, 20, 14]} />
        <meshBasicMaterial color={color} depthTest={false} depthWrite={false} />
      </mesh>
      <mesh renderOrder={1011} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.245, 0.035, 8, 28]} />
        <meshBasicMaterial
          color={HANDLE_OUTLINE_COLOR}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <mesh
        name={`road-control-hit:${edgeId}:${index}`}
        onPointerDown={onPointerDown}
        onPointerEnter={() => {
          if (!cleanupRef.current) document.body.style.cursor = 'grab'
          setHovered(true)
        }}
        onPointerLeave={() => {
          if (!cleanupRef.current) document.body.style.cursor = ''
          setHovered(false)
        }}
      >
        <boxGeometry args={[0.7, 0.14, 0.7]} />
        <meshBasicMaterial depthWrite={false} opacity={0} transparent />
      </mesh>
    </group>
  )
}

/** Selection-only 3D handles for reshaping a committed spline road. */
export function RoadNetworkSplineControls({
  elementSelection,
  node,
}: {
  elementSelection: RoadElementSelection | null
  node: RoadNetworkNode
}) {
  return Object.values(node.edges).flatMap((edge) =>
    edge.alignment.map((point, index) => (
      <RoadSplinePointControl
        edgeId={edge.id}
        index={index}
        key={`${edge.id}:${index}`}
        node={node}
        point={point}
        selected={
          elementSelection?.kind === 'control' &&
          elementSelection.id === edge.id &&
          elementSelection.index === index
        }
      />
    )),
  )
}
