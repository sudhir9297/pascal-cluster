'use client'
import { wallFloorPosition } from '../floor-support/wall-position'
import {
  getEffectiveNode,
  useScene,
  sceneRegistry,
  type AnyNodeId,
  type SceneApi,
} from '@pascal-app/core'
import { useFrame } from '@react-three/fiber'
import { FLOOR_STANDING_TOILET, FloorStandingToiletNode } from './schema'
import { toiletPlacement } from './placement'
export default function ToiletSystem({ sceneApi }: { sceneApi: SceneApi }) {
  useFrame(() => {
    const nodes = sceneApi.nodes()
    for (const id of sceneRegistry.byType[FLOOR_STANDING_TOILET] ?? []) {
      const raw = nodes[id as AnyNodeId],
        root = sceneRegistry.nodes.get(id)
      if (!raw || !root) continue
      const n = FloorStandingToiletNode.parse(getEffectiveNode(raw)),
        wall = nodes[(n.wallId ?? n.parentId) as AnyNodeId]
      if (wall?.type !== 'wall') continue
      const target = toiletPlacement(n, getEffectiveNode(wall), n.position[0], n.side, 0, true)
      if (target) {
        root.position.set(
          ...wallFloorPosition(
            n as unknown as import('@pascal-app/core').AnyNode,
            getEffectiveNode(wall),
            target.position,
            target.rotation,
            nodes,
          ),
        )
        root.rotation.y = target.rotation
      }
    }
  }, 2)
  return null
}
