'use client'

import { type AnyNodeId, getEffectiveNode, type SceneApi, sceneRegistry } from '@pascal-app/core'
import { useFrame } from '@react-three/fiber'
import { useEffect } from 'react'
import { poseVanityMovingParts } from './animation'
import { advanceVanityAnimations, clearVanityAnimations } from './interaction'
import { FREESTANDING_VANITY, WALL_MOUNTED_VANITY, CORNER_VANITY, VanityNode, isVanityKind } from './schema'
import { poseVanityWallAttachment } from './wall-attachment'

export default function VanityAnimationSystem({ sceneApi }: { sceneApi: SceneApi }) {
  useEffect(() => () => clearVanityAnimations(), [])
  useFrame(() => {
    advanceVanityAnimations(performance.now())
    const nodes = sceneApi.nodes()
    for (const id of [...sceneRegistry.byType[FREESTANDING_VANITY] ?? [], ...sceneRegistry.byType[WALL_MOUNTED_VANITY] ?? [], ...sceneRegistry.byType[CORNER_VANITY] ?? []]) {
      const raw = nodes[id as AnyNodeId]
      const root = sceneRegistry.nodes.get(id)
      if (!root || !raw || !isVanityKind(String(raw.type))) continue
      const node = VanityNode.parse(getEffectiveNode(raw))
      if (node.type === WALL_MOUNTED_VANITY) poseVanityWallAttachment(node, root)
      poseVanityMovingParts(root, node)
    }
  }, 2)
  return null
}
