'use client'

import { useFrame } from '@react-three/fiber'
import { sceneRegistry, useLiveNodeOverrides } from '@pascal-app/core'
import { useSceneAtmosphere } from '@pascal-app/viewer'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Box3, Frustum, Matrix4, Sphere, Vector3, type Group, type Mesh } from 'three'
import { usePoolAnimationActivity } from '../../../editor/animation-activity'
import { useAttachmentPool } from '../../../editor/attachment-pool'
import { usePoolNodeHost } from '../../../editor/node-host'
import type {
  WaterfallBubbleCloudEffect,
  WaterfallLineEffect,
  WaterfallPoolEffect,
  WaterfallWaterEffect,
} from '../../../shader/waterfall-effect'
import { getPoolWaterEffect } from '../../../shader/water-effect-registry'
import { buildWaterfallGeometry, getWaterfallImpactLocalPoint } from '../core/geometry'
import type { PoolWaterfallNode } from '../core/schema'
import { canReuseWaterfallGeometryDuringLiveEdit, getWaterfallLiveWidthScale, resolveMountedWaterfall } from '../design/placement'
import { disposeWaterfallVisual } from './dispose-visual'

type WaterfallEffect =
  | WaterfallWaterEffect
  | WaterfallLineEffect
  | WaterfallPoolEffect
  | WaterfallBubbleCloudEffect

export default function PoolWaterfallPreview({ node }: { node: PoolWaterfallNode }) {
  const animationActive = usePoolAnimationActivity()
  const rootRef = useRef<Group>(null!)
  const atmosphere = useSceneAtmosphere()
  const handlers = usePoolNodeHost(node, rootRef)
  const pool = useAttachmentPool(node.poolId, true)
  const liveOverride = useLiveNodeOverrides((state) => state.overrides.get(node.id))
  const liveNode = useMemo(
    () => liveOverride ? { ...node, ...liveOverride } as PoolWaterfallNode : node,
    [node, liveOverride],
  )
  const committedMounted = useMemo(() => resolveMountedWaterfall(node, pool), [node, pool])
  const mounted = useMemo(() => resolveMountedWaterfall(liveNode, pool), [liveNode, pool])
  const reuseGeometry = canReuseWaterfallGeometryDuringLiveEdit(liveOverride)
  // Handle ticks are frequent. Keep the expensive rock, spillway and
  // receiving-water build keyed to the committed shape and apply live width
  // as a cheap group scale instead.
  const geometryInput = reuseGeometry ? committedMounted : mounted
  const geometry = useMemo(() => buildWaterfallGeometry(geometryInput, atmosphere), [geometryInput, atmosphere])
  const widthScale = reuseGeometry && liveOverride && 'width' in liveOverride
    ? getWaterfallLiveWidthScale(committedMounted.width, mounted.width)
    : 1
  // The temporary group scale is useful for the expensive rock and water
  // meshes, but it would stretch each instanced bubble into a large oval.
  useLayoutEffect(() => {
    const bubbleMeshes: Mesh[] = []
    geometry.traverse((child) => {
      if (child.name.startsWith('waterfall-bubble-cloud-')) bubbleMeshes.push(child as Mesh)
    })
    for (const bubble of bubbleMeshes) bubble.scale.x = 1 / widthScale
    return () => {
      for (const bubble of bubbleMeshes) bubble.scale.x = 1
    }
  }, [geometry, widthScale])
  const simulationAccumulator = useRef(0)
  const impactAccumulator = useRef(0)
  const impactWorld = useRef(new Vector3())
  const viewProjection = useRef(new Matrix4())
  const viewFrustum = useRef(new Frustum())
  const worldBounds = useRef(new Sphere())
  const localBounds = useMemo(() => new Box3().setFromObject(geometry).getBoundingSphere(new Sphere()), [geometry])
  const effects = useMemo(() => {
    const result = [] as WaterfallEffect[]
    geometry.traverse((child) => {
      const effect = (child as Mesh).userData.waterfallEffect
      if (effect) result.push(effect)
    })
    return result
  }, [geometry])
  const bubbleEffects = useMemo(() => effects.filter((effect): effect is WaterfallBubbleCloudEffect =>
    'mesh' in effect && effect.mesh.name.startsWith('waterfall-bubble-cloud-'),
  ), [effects])
  useFrame(({ camera, gl, invalidate }, delta) => {
    if (!animationActive || node.visible === false || !mounted.showFlow || !rootRef.current) {
      for (const effect of bubbleEffects) effect.mesh.visible = false
      return
    }
    rootRef.current.updateWorldMatrix(true, false)
    worldBounds.current.copy(localBounds).applyMatrix4(rootRef.current.matrixWorld)
    worldBounds.current.radius *= Math.max(1, widthScale)
    viewProjection.current.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    viewFrustum.current.setFromProjectionMatrix(viewProjection.current)
    const inView = viewFrustum.current.intersectsSphere(worldBounds.current)
    for (const effect of bubbleEffects) effect.mesh.visible = inView
    if (!inView) return
    const distance = Math.max(0.01, camera.position.distanceTo(worldBounds.current.center))
    const diameterPixels = worldBounds.current.radius * 2 * Math.abs(camera.projectionMatrix.elements[5] ?? 1)
      * (gl.domElement.clientHeight || gl.domElement.height) / distance
    simulationAccumulator.current += Math.min(0.05, Math.max(0, delta))
    if (simulationAccumulator.current >= 1 / (diameterPixels < 180 ? 15 : 30)) {
      const simulationDelta = simulationAccumulator.current
      simulationAccumulator.current = 0
      for (const effect of effects) effect.update(simulationDelta)
    }
    if (mounted.showFlow && pool && mounted.poolId) {
      impactAccumulator.current += Math.max(0, delta)
      if (impactAccumulator.current >= 0.11) {
        impactAccumulator.current = 0
        const water = getPoolWaterEffect(mounted.poolId)
        if (water && rootRef.current) {
          const width = mounted.waterfallType === 'modern' ? mounted.width - 0.08
            : mounted.width * (mounted.waterfallType === 'spillover' ? 0.72 : 0.3)
          const poolRoot = sceneRegistry.nodes.get(mounted.poolId as never)
          if (!poolRoot) return
          for (const across of [-0.55, 0, 0.55]) {
            const [x, z] = getWaterfallImpactLocalPoint(mounted, across)
            impactWorld.current.set(x, mounted.targetWaterOffset, z)
            rootRef.current.localToWorld(impactWorld.current)
            poolRoot.worldToLocal(impactWorld.current)
            water.addDropAt(impactWorld.current.x, impactWorld.current.z,
              Math.max(0.008, width * 0.012), 0.015 * mounted.flowStrength)
          }
        }
      }
    }
    invalidate()
  })
  useEffect(() => () => disposeWaterfallVisual(geometry), [geometry])
  return (
    <group position={mounted.position} rotation={mounted.rotation} ref={rootRef} {...handlers}>
      <group scale={[widthScale, 1, 1]}>
        <primitive object={geometry} />
      </group>
    </group>
  )
}
