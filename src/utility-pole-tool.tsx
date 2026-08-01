'use client'

import { type AnyNode, type AnyNodeId, useScene } from '@pascal-app/core'
import { EDITOR_LAYER, triggerSFX } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useMemo } from 'react'
import { finishEnvironmentPlacement, usePlacement } from './placement'
import { UtilityPoleNode } from './schema'
import { useEnvironmentStore } from './store'
import UtilityPolePreview from './utility-pole-preview'
import {
  autoConnectUtilityPole,
  resolveUtilityPolePlacementRotation,
} from './utility-wire-auto-connect'

export default function UtilityPoleTool() {
  const activeLevelId = useViewer((s) => s.selection.levelId)
  const height = useEnvironmentStore((s) => s.utilityPoleHeight)
  const crossarmLength = useEnvironmentStore((s) => s.utilityPoleCrossarmLength)
  const transformerMounted = useEnvironmentStore(
    (s) => s.utilityPoleTransformerMounted,
  )
  const assembly = useEnvironmentStore((s) => s.utilityPoleAssembly)

  const previewNode = useMemo(
    () =>
      UtilityPoleNode.parse({
        assembly,
        height,
        crossarmLength,
        transformerMounted,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
      }),
    [assembly, height, crossarmLength, transformerMounted],
  )

  const { cursorRef, cursorVisible } = usePlacement(activeLevelId, (position) => {
    if (!activeLevelId) return
    const brush = useEnvironmentStore.getState()
    const utilityPole = UtilityPoleNode.parse({
      assembly: brush.utilityPoleAssembly,
      height: brush.utilityPoleHeight,
      crossarmLength: brush.utilityPoleCrossarmLength,
      transformerMounted: brush.utilityPoleTransformerMounted,
      parentId: activeLevelId,
      position,
      rotation: [0, 0, 0],
    })
    const rotationY = resolveUtilityPolePlacementRotation(
      utilityPole,
      useScene.getState().nodes,
    )
    const orientedPole = UtilityPoleNode.parse({
      ...utilityPole,
      rotation: [0, rotationY, 0],
    })
    useScene
      .getState()
      .createNode(orientedPole as unknown as AnyNode, activeLevelId as AnyNodeId)
    autoConnectUtilityPole(orientedPole.id, activeLevelId as AnyNodeId)
    useViewer.getState().setSelection({ selectedIds: [orientedPole.id as AnyNodeId] })
    triggerSFX('sfx:item-place')
    finishEnvironmentPlacement(brush.placementMode)
  })

  if (!activeLevelId) return null

  return (
    <group layers={EDITOR_LAYER} ref={cursorRef} visible={cursorVisible}>
      <UtilityPolePreview node={previewNode} />
    </group>
  )
}
