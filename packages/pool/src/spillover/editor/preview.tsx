'use client'

import { useLiveNodeOverrides, useScene } from '@pascal-app/core'
import { useFrame } from '@react-three/fiber'
import { useSceneAtmosphere } from '@pascal-app/viewer'
import { useEffect, useMemo, useRef } from 'react'
import { Box3, Frustum, Group, Matrix4, Sphere, Vector3 } from 'three'
import { useShallow } from 'zustand/react/shallow'
import { usePoolAnimationActivity } from '../../editor/animation-activity'
import { PoolNode } from '../../core/schema'
import { usePoolNodeHost } from '../../editor/node-host'
import { buildPoolSpilloverGeometry } from '../core/geometry'
import type { PoolSpilloverNode } from '../core/schema'
import { resolvePoolSpilloverSyncUpdate } from '../design/sync'
import { disposePoolSpilloverVisual } from './dispose-visual'

export default function PoolSpilloverPreview({ node }: { node: PoolSpilloverNode }) {
  const animationActive = usePoolAnimationActivity()
  const rootRef = useRef<Group>(null!)
  const atmosphere = useSceneAtmosphere()
  const handlers = usePoolNodeHost(node, rootRef)
  const sourceValue = useScene((state) => state.nodes[node.sourcePoolId as never])
  const targetValue = useScene((state) => state.nodes[node.targetPoolId as never])
  const livePoolOverrides = useLiveNodeOverrides(useShallow((state) => [
    state.get(node.sourcePoolId), state.get(node.targetPoolId),
  ]))
  const editInProgress = useLiveNodeOverrides((state) => Boolean(state.get(node.id)))
  const liveNode = useMemo(() => {
    if (editInProgress) return null
    const source = PoolNode.safeParse(sourceValue ? { ...sourceValue, ...livePoolOverrides[0] } : sourceValue)
    const target = PoolNode.safeParse(targetValue ? { ...targetValue, ...livePoolOverrides[1] } : targetValue)
    if (!source.success || !target.success) return null
    const update = resolvePoolSpilloverSyncUpdate(node, source.data, target.data)
    return update ? { ...node, ...update } : null
  }, [editInProgress, livePoolOverrides, node, sourceValue, targetValue])
  const geometry = useMemo(
    () => {
      if (!liveNode) return new Group()
      const sourceValueWithOverride = liveNode.sourcePoolId === node.sourcePoolId
        ? (sourceValue ? { ...sourceValue, ...livePoolOverrides[0] } : sourceValue)
        : (targetValue ? { ...targetValue, ...livePoolOverrides[1] } : targetValue)
      const source = PoolNode.safeParse(sourceValueWithOverride)
      return buildPoolSpilloverGeometry(
        liveNode,
        source.success ? source.data : undefined,
        atmosphere,
      )
    },
    [liveNode, node.sourcePoolId, sourceValue, targetValue, livePoolOverrides, atmosphere],
  )
  const localBounds = useMemo(() => new Box3().setFromObject(geometry).getBoundingSphere(new Sphere()), [geometry])
  const worldBounds = useRef(new Sphere())
  const frustum = useRef(new Frustum())
  const projection = useRef(new Matrix4())
  const cameraCenter = useRef(new Vector3())
  const accumulator = useRef(0)
  useFrame(({ camera, gl, invalidate }, delta) => {
    if (!animationActive || !liveNode || editInProgress || node.visible === false || !rootRef.current) return
    rootRef.current.updateWorldMatrix(true, false)
    worldBounds.current.copy(localBounds).applyMatrix4(rootRef.current.matrixWorld)
    projection.current.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    frustum.current.setFromProjectionMatrix(projection.current)
    if (!frustum.current.intersectsSphere(worldBounds.current)) return
    cameraCenter.current.copy(worldBounds.current.center).applyMatrix4(camera.matrixWorldInverse)
    const depth = 'isOrthographicCamera' in camera ? 1 : Math.max(0.01, -cameraCenter.current.z)
    const diameterPixels = worldBounds.current.radius * Math.abs(camera.projectionMatrix.elements[5] ?? 1)
      * (gl.domElement.clientHeight || gl.domElement.height) / depth
    accumulator.current += Math.min(0.05, Math.max(0, delta))
    if (accumulator.current >= 1 / (diameterPixels < 180 ? 15 : 30)) {
      for (const effect of geometry.userData.waterEffects ?? []) effect.update(accumulator.current)
      accumulator.current = 0
    }
    invalidate()
  })
  useEffect(() => () => disposePoolSpilloverVisual(geometry), [geometry])
  return (
    <group
      ref={rootRef}
      position={liveNode?.position ?? node.position}
      rotation={liveNode?.rotation ?? node.rotation}
      visible={!editInProgress && Boolean(liveNode)}
      {...handlers}
    >
      <primitive object={geometry} />
    </group>
  )
}
