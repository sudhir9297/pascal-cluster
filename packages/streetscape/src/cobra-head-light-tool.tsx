'use client'

import { type AnyNode, type AnyNodeId, useScene } from '@pascal-app/core'
import { EDITOR_LAYER, triggerSFX } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useMemo } from 'react'
import CobraHeadLightPreview from './cobra-head-light-preview'
import { usePlacement } from './placement'
import { CobraHeadLightNode } from './schema'
import { useStreetscapeStore } from './store'

export default function CobraHeadLightTool() {
  const activeLevelId = useViewer((s) => s.selection.levelId)
  const height = useStreetscapeStore((s) => s.cobraHeadHeight)
  const armLength = useStreetscapeStore((s) => s.cobraHeadArmLength)
  const lightOn = useStreetscapeStore((s) => s.cobraHeadLightOn)

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

  const { cursorRef, cursorVisible } = usePlacement(activeLevelId, (position, rotationY) => {
    if (!activeLevelId) return
    const brush = useStreetscapeStore.getState()
    const cobraHead = CobraHeadLightNode.parse({
      height: brush.cobraHeadHeight,
      armLength: brush.cobraHeadArmLength,
      lightOn: brush.cobraHeadLightOn,
      position,
      rotation: [0, rotationY, 0],
    })
    useScene
      .getState()
      .createNode(cobraHead as unknown as AnyNode, activeLevelId as AnyNodeId)
    useViewer.getState().setSelection({ selectedIds: [cobraHead.id as AnyNodeId] })
    triggerSFX('sfx:item-place')
  })

  if (!activeLevelId) return null

  return (
    <group layers={EDITOR_LAYER} ref={cursorRef} visible={cursorVisible}>
      <CobraHeadLightPreview node={previewNode} />
    </group>
  )
}
