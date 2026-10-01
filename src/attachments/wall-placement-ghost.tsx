'use client'

import { useScene, type AnyNode, type AnyNodeId } from '@pascal-app/core'
import { wallFloorPosition } from '../floor-support/wall-position'
import { createPortal, useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useRef } from 'react'
import type { Group, Object3D } from 'three'
import { wallGhostMatrix } from './wall-ghost-transform'

export function WallPlacementGhost({
  object,
  wall,
  position,
  rotation,
  floorNode,
}: {
  object: Object3D
  wall: Object3D
  position: [number, number, number]
  rotation: number
  floorNode?: AnyNode
}) {
  const scene = useThree((state) => state.scene)
  const ref = useRef<Group>(null!)
  const update = () => {
    if (!ref.current) return
    const nodes = useScene.getState().nodes
    const host = floorNode?.parentId ? nodes[floorNode.parentId as AnyNodeId] : undefined
    const supported =
      floorNode && host?.type === 'wall'
        ? wallFloorPosition(floorNode, host, position, rotation, nodes)
        : position
    wallGhostMatrix(wall, scene, supported, rotation, ref.current.matrix)
    ref.current.matrixWorldNeedsUpdate = true
  }
  useLayoutEffect(update, [wall, scene, position, rotation, floorNode])
  useFrame(update, 3)
  // Keep one render parent across wall switches, matching the editor's cursor group.
  return createPortal(
    <group ref={ref} matrixAutoUpdate={false}>
      <primitive object={object} position={[0, 0, 0]} rotation={[0, 0, 0]} scale={[1, 1, 1]} />
    </group>,
    scene,
  )
}
