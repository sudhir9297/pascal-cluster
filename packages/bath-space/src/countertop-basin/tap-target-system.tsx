'use client'

import { getEffectiveNode, sceneRegistry, type AnyNodeId, type SceneApi } from '@pascal-app/core'
import { useFrame } from '@react-three/fiber'
import { UNDERMOUNT_BASIN, UndermountBasinNode } from './schema'
import { BASIN_TAP_TARGET_NAME, syncBasinTapTarget } from './tap-attachment'

export default function UndermountTapTargetSystem({ sceneApi }: { sceneApi: SceneApi }) {
  useFrame(() => {
    const nodes = sceneApi.nodes()
    for (const id of sceneRegistry.byType[UNDERMOUNT_BASIN] ?? []) {
      const raw = nodes[id as AnyNodeId]
      const target = sceneRegistry.nodes.get(id)?.getObjectByName(BASIN_TAP_TARGET_NAME)
      if (!raw || !target) continue
      syncBasinTapTarget(target, UndermountBasinNode.parse(getEffectiveNode(raw)), nodes)
    }
  }, 2)
  return null
}
