'use client'
import {
  getEffectiveNode,
  sceneRegistry,
  type AnyNodeId,
  type SceneApi,
} from '@pascal-app/core'
import { useFrame } from '@react-three/fiber'
import { SHOWER_ARM, ShowerArmNode } from './schema'
import { showerHeadTarget, SHOWER_HEAD_SLOT, SHOWER_HEAD_TARGET_NAME } from './attachment'
import { showerArmPlacement } from './placement'
export default function ShowerArmSystem({ sceneApi }: { sceneApi: SceneApi }) {
  useFrame(() => {
    const nodes = sceneApi.nodes()
    for (const id of sceneRegistry.byType[SHOWER_ARM] ?? []) {
      const raw = nodes[id as AnyNodeId],
        root = sceneRegistry.nodes.get(id)
      if (!raw || !root) continue
      const n = ShowerArmNode.parse(getEffectiveNode(raw)),
        wall = nodes[(n.wallId ?? n.parentId) as AnyNodeId]
      const pose = showerHeadTarget(n)
      const socket = root.getObjectByName(SHOWER_HEAD_TARGET_NAME)
      if (socket) { socket.position.fromArray(pose.position); socket.rotation.set(...pose.rotation) }
      const hasCover = n.children.some(id => {const child = nodes[id as AnyNodeId];return child?.parentId === n.id && String(child.type) === 'bath-space:shower-flange' && child.visible !== false})
      for (const mesh of root.children) if (mesh.userData.slotId === 'flange') mesh.visible = !hasCover
      for (const childId of n.children) {
        const child = nodes[childId as AnyNodeId] as unknown as { parentId?: string; slotId?: string } | undefined
        const object = sceneRegistry.nodes.get(childId)
        if (child?.parentId === n.id && child.slotId === 'wall-cover' && object) {object.position.set(0,0,0);object.rotation.set(0,0,0)}
        if (child?.parentId === n.id && child.slotId === SHOWER_HEAD_SLOT && object) {
          object.position.fromArray(pose.position)
          object.rotation.set(...pose.rotation)
        }
      }
      if (wall?.type !== 'wall') continue
      const target = showerArmPlacement(
        n,
        getEffectiveNode(wall),
        n.position[0],
        n.side,
        0,
        true,
      )
      if (target) {
        root.position.set(...target.position)
        root.rotation.y = target.rotation
      }
    }
  }, 2)
  return null
}
