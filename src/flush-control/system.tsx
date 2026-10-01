'use client'
import {
  getEffectiveNode,
  sceneRegistry,
  type AnyNodeId,
  type SceneApi,
} from '@pascal-app/core'
import { useFrame } from '@react-three/fiber'
import {
  WALL_FLUSH_PLATE,
  CISTERN_FLUSH_CONTROL,
  WallFlushPlateNode,
  CisternFlushControlNode,
} from './schema'
import { cisternControlPose, ToiletNode } from './attachment'
import { flushPlatePlacement } from './placement'
export default function FlushControlSystem({
  sceneApi,
}: {
  sceneApi: SceneApi
}) {
  useFrame(() => {
    const nodes = sceneApi.nodes()
    for (const kind of [WALL_FLUSH_PLATE, CISTERN_FLUSH_CONTROL])
      for (const id of sceneRegistry.byType[kind] ?? []) {
        const raw = nodes[id as AnyNodeId],
          root = sceneRegistry.nodes.get(id)
        if (!raw || !root) continue
        if (kind === WALL_FLUSH_PLATE) {
          const n = WallFlushPlateNode.parse(getEffectiveNode(raw)),
            wall = nodes[(n.wallId ?? n.parentId) as AnyNodeId]
          if (wall?.type !== 'wall') continue
          const p = flushPlatePlacement(
            n,
            getEffectiveNode(wall),
            n.position[0],
            n.side,
            0,
            true,
          )
          if (p) {
            root.position.set(...p.position)
            root.rotation.set(0, p.rotation, 0)
          }
        } else {
          const n = CisternFlushControlNode.parse(getEffectiveNode(raw)),
            parent = nodes[n.parentId as AnyNodeId],
            toilet = ToiletNode.safeParse(
              parent ? getEffectiveNode(parent) : null,
            )
          if (!toilet.success) continue
          root.visible = n.visible && toilet.data.tankType !== 'concealed'
          const p = cisternControlPose(n, toilet.data)
          root.position.set(...p.position)
          root.rotation.set(p.rotationX, p.rotation, 0)
        }
      }
  }, 3)
  return null
}
