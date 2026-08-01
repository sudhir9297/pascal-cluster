'use client'

import { type AnyNode, type AnyNodeId, useScene } from '@pascal-app/core'
import { EDITOR_LAYER, triggerSFX } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useMemo } from 'react'
import HeritageCrookLightPreview from './heritage-crook-light-preview'
import { finishEnvironmentPlacement, usePlacement } from './placement'
import { HeritageCrookLightNode } from './schema'
import { useEnvironmentStore } from './store'

export default function HeritageCrookLightTool() {
  const activeLevelId = useViewer((s) => s.selection.levelId)
  const height = useEnvironmentStore((s) => s.heritageCrookHeight)
  const armReach = useEnvironmentStore((s) => s.heritageCrookArmReach)
  const lightOn = useEnvironmentStore((s) => s.heritageCrookLightOn)

  const previewNode = useMemo(
    () =>
      HeritageCrookLightNode.parse({
        height,
        armReach,
        lightOn,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
      }),
    [armReach, height, lightOn],
  )

  const { cursorRef, cursorVisible } = usePlacement(activeLevelId, (position) => {
    if (!activeLevelId) return
    const brush = useEnvironmentStore.getState()
    const crookLight = HeritageCrookLightNode.parse({
      height: brush.heritageCrookHeight,
      armReach: brush.heritageCrookArmReach,
      lightOn: brush.heritageCrookLightOn,
      position,
      rotation: [0, 0, 0],
    })
    useScene
      .getState()
      .createNode(crookLight as unknown as AnyNode, activeLevelId as AnyNodeId)
    useViewer.getState().setSelection({ selectedIds: [crookLight.id as AnyNodeId] })
    triggerSFX('sfx:item-place')
    finishEnvironmentPlacement(brush.placementMode)
  })

  if (!activeLevelId) return null

  return (
    <group layers={EDITOR_LAYER} ref={cursorRef} visible={cursorVisible}>
      <HeritageCrookLightPreview node={previewNode} />
    </group>
  )
}
