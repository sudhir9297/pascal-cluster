'use client'
import { wallFloorPosition } from '../floor-support/wall-position'
import { getEffectiveNode, sceneRegistry, type AnyNodeId, type SceneApi } from '@pascal-app/core'
import { useFrame } from '@react-three/fiber'
import {
  HALF_PEDESTAL_BASIN,
  HalfPedestalBasinNode,
  FULL_PEDESTAL_BASIN,
  FullPedestalBasinNode,
  WALL_HUNG_BASIN,
  WallHungBasinNode,
} from '../countertop-basin/schema'
import { wallBasinPlacement } from './placement'

export default function WallHungBasinSystem({
  sceneApi,
  pedestal = false,
  halfPedestal = false,
}: {
  sceneApi: SceneApi
  pedestal?: boolean
  halfPedestal?: boolean
}) {
  useFrame(() => {
    const nodes = sceneApi.nodes()
    for (const id of sceneRegistry.byType[
      halfPedestal ? HALF_PEDESTAL_BASIN : pedestal ? FULL_PEDESTAL_BASIN : WALL_HUNG_BASIN
    ] ?? []) {
      const raw = nodes[id as AnyNodeId],
        root = sceneRegistry.nodes.get(id)
      if (!raw || !root) continue
      const node = (
        halfPedestal ? HalfPedestalBasinNode : pedestal ? FullPedestalBasinNode : WallHungBasinNode
      ).parse(getEffectiveNode(raw))
      const wall = nodes[(node.wallId ?? node.parentId) as AnyNodeId]
      if (wall?.type !== 'wall') continue
      const target = wallBasinPlacement(
        node,
        getEffectiveNode(wall),
        node.position[0],
        node.side,
        0,
        true,
      )
      if (target) {
        root.position.set(
          ...(pedestal
            ? wallFloorPosition(
                node as unknown as import('@pascal-app/core').AnyNode,
                getEffectiveNode(wall),
                target.position,
                target.rotation,
                nodes,
              )
            : target.position),
        )
        root.rotation.y = target.rotation
      }
    }
  }, 2)
  return null
}
