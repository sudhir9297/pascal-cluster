'use client'

import { type AnyNodeId, getEffectiveNode, type SceneApi, sceneRegistry } from '@pascal-app/core'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { InsetBasinCutCache } from '../countertop-basin/inset-cut'
import { SemiRecessedClearanceCache } from './semi-recessed-clearance'
import { DrawerClearanceCache } from './drawer-clearance'
import { poseVanityMovingParts } from './animation'
import { advanceVanityAnimations, clearVanityAnimations } from './interaction'
import { FREESTANDING_VANITY, WALL_MOUNTED_VANITY, CORNER_VANITY, VanityNode, isVanityKind } from './schema'
import { poseVanityWallAttachment } from './wall-attachment'

export default function VanityAnimationSystem({ sceneApi }: { sceneApi: SceneApi }) {
  const cuts = useMemo(() => new InsetBasinCutCache(), [])
  const cabinets = useMemo(() => new SemiRecessedClearanceCache(), [])
  const drawers = useMemo(() => new DrawerClearanceCache(), [])
  useEffect(() => () => { clearVanityAnimations(); cuts.dispose(); drawers.dispose(); cabinets.dispose() }, [cuts, drawers, cabinets])
  useFrame(() => {
    advanceVanityAnimations(performance.now())
    const nodes = sceneApi.nodes()
    cuts.beginFrame()
    drawers.beginFrame()
    cabinets.beginFrame()
    for (const id of [...sceneRegistry.byType[FREESTANDING_VANITY] ?? [], ...sceneRegistry.byType[WALL_MOUNTED_VANITY] ?? [], ...sceneRegistry.byType[CORNER_VANITY] ?? []]) {
      const raw = nodes[id as AnyNodeId]
      const root = sceneRegistry.nodes.get(id)
      if (!root || !raw || !isVanityKind(String(raw.type))) continue
      const node = VanityNode.parse(getEffectiveNode(raw))
      if (node.type === WALL_MOUNTED_VANITY) poseVanityWallAttachment(node, root)
      const children = node.children.map(id => nodes[id as AnyNodeId]).filter((child): child is NonNullable<typeof child> => Boolean(child))
      cuts.sync(root, node, children)
      cabinets.sync(root, node, children)
      drawers.sync(root, node, children)
      poseVanityMovingParts(root, node)
    }
    cuts.endFrame()
    drawers.endFrame()
    cabinets.endFrame()
  }, 2)
  return null
}
