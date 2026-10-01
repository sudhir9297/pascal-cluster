'use client'
import { getEffectiveNode, useScene, sceneRegistry, type AnyNodeId, type SceneApi } from '@pascal-app/core'
import { useEffect } from 'react'
import { legacyTapBindingPatch } from './binding'
import { useFrame } from '@react-three/fiber'
import { attachedTapPose } from './attachment'
import { basinTapHoleSpacing } from '../countertop-basin/tap-layout'
import { TAP, TapNode } from './schema'

export default function TapAttachmentSystem({ sceneApi }: { sceneApi: SceneApi }) {
  useEffect(() => {
    const state = useScene.getState()
    if (state.readOnly) return
    const update = Object.values(state.nodes).flatMap(raw => {
      if (String(raw.type) !== TAP) return []
      const data = legacyTapBindingPatch(TapNode.parse(raw), state.nodes)
      return data ? [{ id: raw.id, data: data as unknown as Partial<typeof raw> }] : []
    })
    if (update.length) state.applyNodeChanges({ update })
  }, [])
  useFrame(() => {
    const nodes = sceneApi.nodes()
    for (const id of sceneRegistry.byType[TAP] ?? []) {
      const raw = nodes[id as AnyNodeId], root = sceneRegistry.nodes.get(id)
      if (!raw || !root) continue
      const { basin, bath, wall, local: pose } = attachedTapPose(TapNode.parse(getEffectiveNode(raw)), nodes)
      if (!basin && !bath && !wall) continue
      root.position.fromArray(pose.position); root.rotation.y = pose.rotation
      if (basin) root.traverse(part => { if (part.userData.mountingSign) part.position.x = part.userData.mountingSign * basinTapHoleSpacing(basin) / 2 })
    }
  }, 2)
  return null
}
