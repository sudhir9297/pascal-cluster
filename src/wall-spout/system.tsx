'use client'
import { getEffectiveNode, sceneRegistry, type AnyNodeId, type SceneApi } from '@pascal-app/core'
import { useFrame } from '@react-three/fiber'
import { WALL_SPOUT, WallSpoutNode } from './schema'
import { wallSpoutSockets } from './targets'
import { showerArmPlacement } from '../shower-arm/placement'
export default function WallSpoutSystem({ sceneApi }: { sceneApi: SceneApi }) {
  useFrame(() => {
    const nodes = sceneApi.nodes()
    for (const id of sceneRegistry.byType[WALL_SPOUT] ?? []) {
      const raw = nodes[id as AnyNodeId],
        root = sceneRegistry.nodes.get(id)
      if (!raw || !root) continue
      const n = WallSpoutNode.parse(getEffectiveNode(raw)),
        wall = nodes[(n.wallId ?? n.parentId) as AnyNodeId]
      if (wall?.type === 'wall') {
        const pose = showerArmPlacement(n, getEffectiveNode(wall), n.position[0], n.side, 0, true)
        if (pose) {
          root.position.fromArray(pose.position)
          root.rotation.y = pose.rotation
        }
      }
      for (const slot of wallSpoutSockets(n)) {
        const target = root.getObjectByName(`${slot.type}_target_${slot.id}`)
        if (target) {
          target.position.fromArray(slot.position)
          target.rotation.set(...slot.rotation)
        }
        for (const childId of n.children) {
          const child = nodes[childId as AnyNodeId] as unknown as
              | { parentId?: string; slotId?: string }
              | undefined,
            object = sceneRegistry.nodes.get(childId)
          if (child?.parentId === n.id && child.slotId === slot.id && object) {
            object.position.fromArray(slot.position)
            object.rotation.set(...slot.rotation)
          }
        }
      }
    }
  }, 2)
  return null
}
