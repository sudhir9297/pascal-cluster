'use client'

import { useLiveNodeOverrides, useScene, type AnyNode } from '@pascal-app/core'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Box3, Frustum, Matrix4, Sphere, Vector3, type Group, type Material, type Mesh } from 'three'
import type { WebGPURenderer } from 'three/webgpu'
import { buildSharedJointGeometry } from '../core/geometry'
import type { PoolSharedJointNode } from '../core/schema'
import { PoolNode } from '../../core/schema'
import { usePoolNodeHost } from '../../editor/node-host'
import { findSharedPoolJoint } from '../../design/shared-joint'
import { poolWaterSimulationHz, shouldAdvancePoolWater } from '../../editor/pool-render-state'

export default function PoolSharedJointPreview({ node }: { node: PoolSharedJointNode }) {
  const rootRef = useRef<Group>(null!)
  const handlers = usePoolNodeHost(node, rootRef)
  const poolValues = useScene(useShallow((state) => node.poolIds.map((poolId) => state.nodes[poolId as never])))
  const spillovers = useScene(useShallow((state) => Object.values(state.nodes).filter((candidate) => {
    if (String(candidate.type) !== 'pool:spillover') return false
    const source = (candidate as { sourcePoolId?: string }).sourcePoolId
    const target = (candidate as { targetPoolId?: string }).targetPoolId
    return node.poolIds.includes(source ?? '') && node.poolIds.includes(target ?? '')
  })))
  const livePoolOverrides = useLiveNodeOverrides(useShallow((state) => node.poolIds.map((poolId) => state.get(poolId))))
  const liveNode = useMemo(() => {
    const pools = poolValues.map((value, index) => PoolNode.safeParse(
      value && livePoolOverrides[index] ? { ...value, ...livePoolOverrides[index] } : value,
    ))
    if (!pools[0]?.success || !pools[1]?.success) return node
    const joint = findSharedPoolJoint(pools[0].data, pools[1].data)
    return joint ? { ...node, ...joint } as PoolSharedJointNode : node
  }, [livePoolOverrides, node, poolValues])
  const geometry = useMemo(() => buildSharedJointGeometry(liveNode), [liveNode])
  const waterEffect = geometry.userData.waterEffect
  const localBounds = useMemo(() => new Box3().setFromObject(geometry).getBoundingSphere(new Sphere()), [geometry])
  const worldBounds = useRef(new Sphere())
  const viewProjection = useRef(new Matrix4())
  const viewFrustum = useRef(new Frustum())
  const cameraSpaceCenter = useRef(new Vector3())
  const sourceWaterSettings = useMemo(() => {
    for (const poolId of node.poolIds) {
      const index = node.poolIds.indexOf(poolId)
      const raw = poolValues[index]
      const candidate = raw && livePoolOverrides[index] ? { ...raw, ...livePoolOverrides[index] } : raw
      const parsed = candidate ? PoolNode.safeParse(candidate) : null
      if (parsed?.success) return parsed.data
    }
    return null
  }, [livePoolOverrides, node.poolIds, poolValues])
  const hasExplicitSpillover = spillovers.length > 0
  useEffect(() => {
    if (waterEffect && sourceWaterSettings) waterEffect.setSettings(sourceWaterSettings)
  }, [sourceWaterSettings, waterEffect])
  useFrame(({ camera, gl, invalidate }, delta) => {
    const root = rootRef.current
    if (!root || !root.visible || node.visible === false || !waterEffect) return
    if (!shouldAdvancePoolWater(
      Boolean(gl.xr?.isPresenting),
      Boolean((gl as unknown as { isWebGPURenderer?: boolean }).isWebGPURenderer),
    )) return
    root.updateWorldMatrix(true, false)
    worldBounds.current.copy(localBounds).applyMatrix4(root.matrixWorld)
    viewProjection.current.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    viewFrustum.current.setFromProjectionMatrix(viewProjection.current)
    if (!viewFrustum.current.intersectsSphere(worldBounds.current)) return
    cameraSpaceCenter.current.copy(worldBounds.current.center).applyMatrix4(camera.matrixWorldInverse)
    const projectedRadius = worldBounds.current.radius * Math.abs(camera.projectionMatrix.elements[5] ?? 1)
      / ('isOrthographicCamera' in camera ? 1 : Math.max(0.01, -cameraSpaceCenter.current.z))
    const diameterPixels = projectedRadius * (gl.domElement.clientHeight || gl.domElement.height)
    waterEffect.update(gl as unknown as WebGPURenderer, delta, poolWaterSimulationHz(diameterPixels))
    invalidate()
  })
  useEffect(() => () => {
    waterEffect?.dispose()
    geometry.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      mesh.geometry.dispose()
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const material of materials as Material[]) {
        if (material !== waterEffect?.material) material.dispose()
      }
    })
  }, [geometry, waterEffect])
  return <group position={liveNode.position} rotation={liveNode.rotation} ref={rootRef} visible={node.visible !== false && !hasExplicitSpillover} {...handlers}><primitive object={geometry} /></group>
}
