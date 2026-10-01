'use client'
import { getEffectiveNode, sceneRegistry, type AnyNodeId, type SceneApi } from '@pascal-app/core'
import { useFrame } from '@react-three/fiber'
import { SHOWER_FLANGE, ShowerFlangeNode } from './schema'
import { SHOWER_ARM, ShowerArmNode } from '../shower-arm/schema'
export default function ShowerFlangeSystem({ sceneApi }: { sceneApi: SceneApi }) {
  useFrame(() => {
    const nodes = sceneApi.nodes()
    for (const id of sceneRegistry.byType[SHOWER_FLANGE] ?? []) {
      const raw = nodes[id as AnyNodeId],
        root = sceneRegistry.nodes.get(id)
      if (!raw || !root) continue
      const n = ShowerFlangeNode.parse(getEffectiveNode(raw)),
        parent = nodes[n.parentId as AnyNodeId]
      if (!parent || String(parent.type) !== SHOWER_ARM) continue
      const arm = ShowerArmNode.parse(getEffectiveNode(parent)),
        key = JSON.stringify([arm.tubeSize, arm.style.startsWith('square')])
      if (root.userData.flangeHostKey !== key) {
        root.userData.flangeHostKey = key
        sceneApi.markDirty(id as AnyNodeId)
      }
      root.position.set(0, 0, 0)
      root.rotation.set(0, 0, 0)
    }
  }, 1)
  return null
}
