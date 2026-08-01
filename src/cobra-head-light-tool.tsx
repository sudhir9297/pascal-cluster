'use client'

import { type AnyNode, type AnyNodeId, useScene } from '@pascal-app/core'
import { EDITOR_LAYER, triggerSFX } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useMemo } from 'react'
import CobraHeadLightPreview from './cobra-head-light-preview'
import { finishEnvironmentPlacement, usePlacement } from './placement'
import { CobraHeadLightNode } from './schema'
import { useEnvironmentStore } from './store'

export default function CobraHeadLightTool() {
  const activeLevelId = useViewer((s) => s.selection.levelId)
  const height = useEnvironmentStore((s) => s.cobraHeadHeight)
  const armLength = useEnvironmentStore((s) => s.cobraHeadArmLength)
  const lightOn = useEnvironmentStore((s) => s.cobraHeadLightOn)

  const previewNode = useMemo(
    () =>
      CobraHeadLightNode.parse({
        height,
        armLength,
        lightOn,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
      }),
    [armLength, height, lightOn],
  )

  const { cursorRef, cursorVisible } = usePlacement(activeLevelId, (position) => {
    if (!activeLevelId) return
    const brush = useEnvironmentStore.getState()
    const cobraHead = CobraHeadLightNode.parse({
      height: brush.cobraHeadHeight,
      armLength: brush.cobraHeadArmLength,
      lightOn: brush.cobraHeadLightOn,
      position,
      rotation: [0, 0, 0],
    })
    useScene
      .getState()
      .createNode(cobraHead as unknown as AnyNode, activeLevelId as AnyNodeId)
    useViewer.getState().setSelection({ selectedIds: [cobraHead.id as AnyNodeId] })
    triggerSFX('sfx:item-place')
    finishEnvironmentPlacement(brush.placementMode)
  })

  if (!activeLevelId) return null

  return (
    <group layers={EDITOR_LAYER} ref={cursorRef} visible={cursorVisible}>
      <CobraHeadLightPreview node={previewNode} />
    </group>
  )
}
